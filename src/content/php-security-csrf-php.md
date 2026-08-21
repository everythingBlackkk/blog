# CSRF (PHP)

The main idea of our exploit is to take advantage of the browser’s behavior, because it automatically sends your session cookie with every request made to the website.

***

> First, we need to understand how the browser and session workflow work.\
> Imagine you log into your bank account normally.

The browser sends a POST with credentials (username/password) over HTTPS. Like That :

```http
POST /login HTTP/1.1
Host: bank.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 45

email=yassin@gmail.com&password=Sosecret12

```

2. The server validates credentials (checks DB).
3. If credentials are valid:
   1. **Create or start a new session**
   2. **Store session data** on the server (files, DB)
   3. **Send a `Set-Cookie`** to the browser to bind the browser to the session. This is the moment the browser “knows” the user is logged in.

**Note :**

> Now, when you try to open your bank account, you don’t need to enter your email and password again because the browser has already saved your session. It automatically sends your session cookies to the website when you try to access your account.

### How Hacker Can Exploit That ?

Attacker Can Do a malicious site like `attacker.xyz` can place JavaScript on its page, for example code like this:

```javascript
async function tryFetchBankAsJson() {
  try {
    const resp = await fetch('https://bank.com/api/account', {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    });

    console.log('response status:', resp.status);

    if (resp.ok) {
      try {
        const data = await resp.json();
        console.log('parsed JSON response:', data);
      } catch (parseErr) {
        console.warn('response body is not valid JSON or blocked by CORS:', parseErr);
      }
    } else {
      console.warn('non-2xx response, body may be inaccessible or contain error info');
    }
  } catch (err) {
    console.error('fetch failed or blocked (likely CORS or network issue):', err);
  }
}

tryFetchBankAsJson();

```

This code is just a demo, nothing more , but let’s understand what it does.\
The code will cause the victim’s browser to send an automatic request as soon as the victim visits `attacker.xyz`. That request will, of course, include the victim’s cookies because the browser has them stored. Therefore the response the attacker receives will be the data from a particular endpoint , which could leak information like the victim’s bank account, balance, email, and many other things.

That is Called : Cross-Site Request From (**attacker.xyz**) to (**bank.com**)

***

But! We Have A Small problem . Actually it's A big Problem :) , The Problem is There is something Called ***SOP*** (same-origin-policy) Will Blocked This Attack

#### What is A "SOP"

The **Same-Origin Policy (SOP)** restricts web pages from making requests to a different *origin* than the one they came from.

**Example: Facebook Scenario**

```
- Malicious page URL: http://evil.com/login
- Legitimate Facebook URL: https://www.facebook.com/login
```

If a user is logged in to Facebook, the malicious page **cannot access Facebook cookies or user data** due to SOP.

Conditions for "Same-Origin" For two pages to be "same-origin":

1. **Same Protocol**

* ```
    http://example.com  ≠  https://example.com
  ```
* **Same Domain**
* ```
    example.com  ≠  sub.example.com
  ```
* **Same Port**

```
  example.com:80  ≠  example.com:8080
```

**Note :**

> But Attack Will Work If There is configures CORS incorrectly If the victim’s bank server configures CORS incorrectly , for example by sending `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true` And Do Not Use ==SameSite=Strict== on Cookie

Like This Code :

```php
<?php
header("Access-Control-Allow-Origin: *");   
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
?>

```

***

We Need To Understand Somthing Callled `Preflight Request`

## What’s a **Preflight Request**

A **Preflight request** is a small “check” the browser does **before** sending the real request.\
It happens when the real request isn’t “simple” , like if you use `PUT`, `DELETE`, custom headers, or `Content-Type: application/json`.

So the browser first sends an `OPTIONS` request to the server, asking:

> “Hey, is it okay if I send this request from this website (origin)?”

If the server replies with headers like:

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: POST, PUT
Access-Control-Allow-Headers: Content-Type

```

then the browser says Coolll!! and sends the real request. This is part of CORS , and it helps protect users so that random websites can’t just send powerful requests to other domains.

**Conclusion**

~~How browsers protect users ?~~

* **Same-Origin Policy (SOP)**
  * It means a website can’t read or touch data from another site unless the server explicitly allows it.
  * So hacker.com can’t read responses from bank.com by default.
* **CORS + Preflight**
  * When hacker.com tries to call bank.com, the browser checks with the bank first.
  * If the bank doesn’t allow hacker.com in its CORS headers , the browser blocks it.

***

## What is CSRF Token ?

Now We Need To Make A Somthing Called `CSRF Token`

CSRF (Cross-Site Request Forgery) is an attack that tricks a user’s browser into performing an unwanted action on a website where the user is already authenticated. Proper protection relies on a single-use token (a nonce): the server issues a fresh token, embeds it in the form, and rejects any request that lacks a valid, unused token.

For example, a user might visit a malicious site `attacker.xyz` that contains a hidden form which auto-submits to `bank.com/transfer`. Because the user’s browser is still logged in to `bank.com`, the forged request will be sent with the user’s credentials and could cause an unwanted fund transfer. If `bank.com` has implemented CSRF correctly, it generates a one-time token and inserts it into the transfer form; the server then accepts the request only if the submitted token matches the expected unused token, blocking the forgery.

***

But there are many mistakes that programmers make when designing CSRF protection. We'll talk about some of them now, and afterwards we'll show the correct approach.

**1 ) The first mistake is a fixed token**

*Hardcoded token*\
Like this, for example:

```php
<?php

define('CSRF_TOKEN', 'let-me-in-12345');
?>
<form method="POST" action="transfer.php">
  <input type="hidden" name="csrf_token" value="<?php echo CSRF_TOKEN; ?>">
  <input type="text" name="amount" placeholder="amount">
  <button type="submit">Transfer</button>
</form>

```

This would allow the hacker to use their own CSRF token when transferring money from the victim’s account to theirs, since the token is fixed and provides no real protection.

**2 ) The second mistake is not validating the token properly**

```php
<?php
$fake_token = bin2hex(random_bytes(32));
?>
<form method="POST" action="transfer_no_check.php">
  <input type="hidden" name="csrf_token" value="<?php echo $fake_token; ?>">
  <input type="text" name="amount" placeholder="amount">
  <button type="submit">Transfer</button>
</form>

```

```php
<?php
// The Server Ignore The Token 
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $amount = $_POST['amount'];
    echo "Transferring $amount ..."; 
}

```

#### 3) Secure code

* Generate a random token tied to the session.
* Insert it into the form.
* Verify it on the POST.

```php
<!-- secure_form.php -->
<?php
session_start();

if (!isset($_SESSION['csrf_token'])) {
    // Genrate A CSRF Token
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$token = $_SESSION['csrf_token'];
?>
<form method="POST" action="secure_transfer.php">
  <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($token); ?>">
  <input type="text" name="amount" placeholder="amount">
  <button type="submit">Transfer</button>
</form>

```

```php
<!-- secure_transfer.php -->
<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$token = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['csrf_token'] ?? '';

// Check If The CSRF Token Is Valid & Is Not Empty 
if (empty($token) || !hash_equals($sessionToken, $token)) {
    http_response_code(403);
    die('CSRF validation failed');
}

$amount = $_POST['amount'];
echo "Transferring $amount ...";

```

## What developers should do to stay safe ?

**Some Good Tips You Can Do it , To Safe Your Web Site From Us :)**

1. **Use CSRF tokens**
   * Generate a random token for each session/form
   * Add it in forms or headers.
   * Check it on POST requests.
2. **Configure CORS carefully**
   * Never use `Access-Control-Allow-Origin: *` with credentials.
   * Whitelist trusted origins only.
3. **Set cookies properly**
   * Use `HttpOnly`, `Secure`, and `SameSite=Lax` (or `Strict`) for session cookies.
4. **Check Origin / Referer headers**
   * For sensitive actions (like “transfer money”), check that the request really comes from your domain.
