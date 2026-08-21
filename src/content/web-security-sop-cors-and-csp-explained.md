# SOP, CORS, and CSP Explained

## Understanding Web Security Policies: SOP, CORS, and CSP

This article delves into crucial web security policies—**Same-Origin Policy (SOP)**, **Cross-Origin Resource Sharing (CORS)**, and **Content Security Policy (CSP)**—explaining their functions, importance, and common misconfigurations that can lead to vulnerabilities.

***

### 1. Same-Origin Policy (SOP)

The **Same-Origin Policy (SOP)** restricts web pages from making requests to a different *origin* than the one they came from.

#### Example: Facebook Scenario

```
- Malicious page URL: http://evil.com/login
- Legitimate Facebook URL: https://www.facebook.com/login
```

***

If a user is logged in to Facebook, the malicious page **cannot access Facebook cookies or user data** due to SOP.

#### Conditions for "Same-Origin"

For two pages to be "same-origin":

1. **Same Protocol**

   ```
   http://example.com  ≠  https://example.com
   ```
2. **Same Domain**

   ```
   example.com  ≠  sub.example.com
   ```
3. **Same Port**

   ```
   example.com:80  ≠  example.com:8080
   ```

#### Example: IE SOP Flaw

* Two sites share IP `192.168.0.1`:

  ```
  site1.com -> 192.168.0.1
  site2.com -> 192.168.0.1
  ```
* In old IE versions, `site1.com` could access `site2.com` data, bypassing SOP.

***

### 2. Cross-Origin Resource Sharing (CORS)

**CORS** allows servers to specify which origins can access their resources.

#### Example: Restaurant API

```http
GET /menu HTTP/1.1
Host: restaurant.com
Origin: http://fooddelivery.com
```

**Server Response:**

```http
Access-Control-Allow-Origin: http://fooddelivery.com
```

Only `fooddelivery.com` can access the API.

#### CORS Misconfigurations

**1. Wildcard with Sensitive Data**

```http
Access-Control-Allow-Origin: *
```

* Risky if the endpoint serves private user data.
* Example: Bank API returning account balance.

**2. Credentials with Wildcard**

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Scenario:**

* Logged-in user visits `http://evil.com`
* Attacker can make authenticated requests to a vulnerable site and steal data.

**3. Reflecting the Origin Header**

```http
# Server reads Origin header and reflects it
Access-Control-Allow-Origin: http://evil.com
```

**Attack Example:**

* Attacker controls `evil.com`
* Sends request with Origin header set to `http://evil.com`
* Server responds allowing full access.

***

### 3. Content Security Policy (CSP)

**CSP** prevents malicious content from executing.

#### Example: Facebook CSP

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://fbcdn.net;
  img-src 'self' https://fbcdn.net;
```

* Only scripts/images from `self` and `fbcdn.net` are allowed.
* Any external script is blocked by the browser.

#### Example: XSS Mitigation

```html
<!-- Malicious script blocked -->
<script src="http://evil.com/malware.js"></script>
```

Even if the user visits a page containing this script, **it won't execute** due to CSP.

***

### Conclusion

| Policy | Purpose                              | Example of Protection                       | Misconfiguration Risk                               |
| ------ | ------------------------------------ | ------------------------------------------- | --------------------------------------------------- |
| SOP    | Restrict cross-origin access         | Malicious page cannot read Facebook cookies | Older IE SOP flaw bypass                            |
| CORS   | Allow controlled cross-origin access | Restaurant API sharing menu                 | Wildcard with credentials                           |
| CSP    | Prevent code injection/XSS           | Blocking external scripts                   | Misconfigured directives allowing malicious scripts |

**Key Takeaways:**

* SOP provides a default safety net.
* CORS enables flexible cross-origin access.
* CSP protects against content injection.

Understanding and properly configuring these policies is essential for building secure web applications.
