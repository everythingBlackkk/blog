# Session Hijacking & Fixation Part 1 (PHP)

## Session Hijacking & Fixation Part 1

**We Need To Know Some Basic Information First**

Did you Ask Yourself Before when you Add Product like 'keyboard' In your cart After That You open Your Account Again from onother Device And the **keyboard** Still in Your cart , Do You Know How The web app Know You ?

Another Example , Why you need to login one time on Your Facebook Account After That You Close Your Device and you open it again , And you do not need To Login Again Do You Know How Facebook Know you ?

Todayyyyyy , We Will Know How. Let's GO.....

## What is A cookie & Session Work Flow

First , What is A cookie & Session **Cookie**: data stored by the browser **Session**: a server-side state store tied to a session id. It holds data like `user_id`, roles, last activity, etc. The session itself is usually not stored in the browser . the browser stores only the session id (commonly in a cookie).

## Okay , What is s Full flow ?

when the user logs in for the first time :

1. The browser sends a POST with credentials (username/password) over HTTPS. Like That :

```http
POST /login HTTP/1.1
Host: evil.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 45

username=yassin&password=secret

```

2. The server validates credentials (checks DB).
3. If credentials are valid:
   1. **Create or start a new session**: in PHP `session_start()` then `$_SESSION['user_id'] = $id;`
   2. **Store session data** on the server (files, DB)
   3. **Send a `Set-Cookie`** to the browser to bind the browser to the session. This is the moment the browser “knows” the user is logged in.

```http
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: PHPSESSID=abc123xyz; Path=/; HttpOnly; Secure; SameSite=Lax
```

* `PHPSESSID=abc123xyz` is the session id.
* `HttpOnly` prevents JavaScript from reading the cookie ( XSS risk ).
* `Secure` ensures the cookie is only sent over HTTPS.
* `SameSite` reduces CSRF risk .

#### After the browser receives it

* The browser stores the cookie according to its attributes (`domain`, `path`, `expires`/`Max-Age`).

**From now on, for every request to the same domain/path, the browser will send:**

```
Cookie: PHPSESSID=abc123xyz
```

## Flow when the user is already logged

1. Browser sends:

```http
GET /dashboard HTTP/1.1
Host: evil.com
Cookie: PHPSESSID=abc123xyz
```

* Server receives:
  * Reads the cookie, looks up `PHPSESSID=abc123xyz` in the session store.
  * Loads session data (e.g., `user_id = 20`).
  * Verifies the session is valid (not expired, last\_activity within allowed time).
* Server responds with the user page.
* If session rotation is required (expiry policy or after a privilege change), the server may call `session_regenerate_id(true)` and send a new `Set-Cookie`.

***

## Let's Explane Some PHP Function First

We Can Use

```php
echo session_save_path() 
```

To Display The Path is Store the session of Users. output Example `/var/lib/php/sessions`

Also We Can Print The **session id** After Start Session By Use

```php

session_start();
echo "[+] The session is : " . session_id();

```

The output is

```
[+] The session is : hfpjhi09ennilb56b59aitbaho
```

Okayyy That is good ,After Start Session , Let's See What is inside `/var/lib/php/sessions` Dir

```shell
$ sudo ls /var/lib/php/sessions

sess_hfpjhi09ennilb56b59aitbaho

```

as You Can See , The session it's A Same Also You Can open `sess_hfpjhi09ennilb56b59aitbaho` But it will be **Empty** , Do You Know Way ? because Until Now , We Do not save any Data with this session

But!! Let's See The Defrints When we Store Data inside the session , For Example We Will Store username

```php

session_start();
$_SESSION['username'] = 'Yassin';

```

Let's Try To Read `sess_hfpjhi09ennilb56b59aitbaho` File

```

$ sudo cat /var/lib/php/sessions/sess_hfpjhi09ennilb56b59aitbaho
 
username|s:6:"Yassin";


```

As you can see , The Usename we put , it Actully store in session file It's Easy Alright ?

## Session Fixation

Let's See in PHP Source Code Security

#### 1 ) vulnerable PHP Code 'Session Fixation'

```php

if (isset($_GET['sid'])) {
    session_id($_GET['sid']);
}
session_start();
$_SESSION['user_id'] = $userId;

```

The vulnerability here is that the application allows an attacker to **set or control the session ID** through the `sid` GET parameter.

### How the Attack Works:

1. **Attacker creates a malicious link**: <https://example.com/index.php?sid=attcker\\_value>
2. **Victim clicks the link** - the application uses the attacker-provided session ID
3. **Victim logs in** , their user ID gets associated with the known session ID
4. **Attacker can hijack the session** by using the same known session ID

### More Secure Code Version :

```php
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1); // Only if using HTTPS
ini_set('session.use_strict_mode', 1);

session_start();

if (empty($_SESSION['user_id'])) {
    session_regenerate_id(true);
}

$_SESSION['user_id'] = $userId;
```

#### 1. Security Settings

* **`session.cookie_httponly = 1`**\
  → Makes the session cookie **unreadable by JavaScript**.\
  Protects against **XSS attacks** .
* **`session.cookie_secure = 1`**\
  → Sends the cookie **only over HTTPS connections**.\
  Prevents attackers from sniffing the session over HTTP.
* **`session.use_strict_mode = 1`**\
  → PHP will **reject uninitialized or fake session IDs**.\
  Protects against **session fixation attacks**.

```php
if (empty($_SESSION['user_id'])) {
    session_regenerate_id(true);
}

$_SESSION['user_id'] = $userId;
```

1. When the user logs in for the first time,\
   → generate a **new session ID** and delete the old one.
2. Saves the logged-in user’s ID inside the session.

## Session Hijacking

**This happens when a hacker gets hold of the user’s Session ID.**\
If that happens, the hacker can send requests as if they were the real user.\
In other words , as long as the hacker has the ID, the server can’t tell them apart from the legitimate user.

#### 1. Use a strong Session ID

In `php.ini`:

```ini
session.hash_function = sha512
```

The value `sha512` means that PHP will use the **SHA-512** algorithm to generate the session ID.\
This is a very strong algorithm from the **SHA-2** family and produces a 512-bit hash.

```ini
session.hash_bits_per_character = 5
```

This setting defines how PHP represents the bits from the hash as characters in the session ID string.

Each character in the session ID represents a certain number of bits.

When you set it to `5`, it means each character represents **5 bits**,\
which uses a limited range of symbols — typically `[0-9, a-v]`.

***

The default session name is **PHPSESSID**, and everyone knows that.\
Before you call `session_start()`, set a custom name:

```php
session_name("anyThingBlaBlaBla");
```

#### 7. Store the User Agent in the session

When the session starts:

```php
$_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'];
```

On every following request, check that it’s still the same.\
An attacker can spoof this, but it still adds another layer of protection.

#### 8. Store the user’s IP address

Also when the session starts:

```php
$_SESSION['remote_ip'] = $_SERVER['REMOTE_ADDR'];
```

And verify it on every request.\
This can cause issues for users whose IP changes often (for example, some corporate networks or mobile users),\
but if it works for your environment, it adds extra security.

This Code From ***FreeCodeCampPost*** , That Explane What i need To Say

```php
<?php
session_start();

// Does IP Address match?
if ($_SERVER['REMOTE_ADDR'] != $_SESSION['ipaddress'])
{
session_unset();
session_destroy();
}

// Does user agent match?
if ($_SERVER['HTTP_USER_AGENT'] != $_SESSION['useragent'])
{
  session_unset();
  session_destroy();
}

// Is the last access over an hour ago?
if (time() > ($_SESSION['lastaccess'] + 3600))
{
  session_unset();
  session_destroy();
}
else
{
  $_SESSION['lastaccess'] = time();
}
```
