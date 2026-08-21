# EYCC 2025 - Web

At the beginning of the challenge, there was a normal login page with `guest:guest`, and everything seemed normal.

<figure><img src="./images/articles/ctf-eycc-2025-web/01.png" alt=""><figcaption></figcaption></figure>

After logging in, we notice that there is an auth\_token, which is a JWT Token. Let us first understand what JWT is.

## What is JWT?

**JWT = JSON Web Token**\
A standard for creating a compact, URL-safe token that is **signed**. It’s commonly used for **authentication** and **authorization**.

***

## Structure

A JWT has **three parts** separated by dots:

```
xxxxx.yyyyy.zzzzz
```

1. **Header**\
   Contains metadata about the token type and signing algorithm.\
   Example:

   ```json
   {
     "alg": "RS256",
     "typ": "JWT"
   }
   ```
2. **Payload (claims)**\
   Contains the data you want to transmit (claims).\
   Example:

   ```json
   {
     "sub": "1234567890",
     "name": "Yassin",
     "admin": true,
     "exp": 1735667200
   }
   ```

   * `sub` = subject / user id
   * `exp` = expiration time
   * You can add any other claims you need.
3. **Signature**\
   Created using a signing algorithm like `HMACSHA256` or `RS256` to ensure the token hasn’t been tampered with.

***

## Full JWT example

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Illhc3NpbiIsImFkbWluIjp0cnVlfQ.
TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

* Part 1 = Header (Base64).
* Part 2 = Payload (Base64).
* Part 3 = Signature.

***

## What is it used for?

1. **Authentication**
   * User logs in once (username + password).
   * Server issues a JWT and returns it to the client.
   * Client stores it (e.g., Local Storage or Cookie).
2. **Authorization**
   * For API requests the client sends the JWT in the `Authorization` header:

     ```
     Authorization: Bearer <JWT>
     ```
   * Server verifies the signature and checks permissions.
3. **Secure data exchange**
   * Because the token is signed, the receiver can trust the token wasn’t modified.

***

In our case, when we found the Auth Token

<figure><img src="./images/articles/ctf-eycc-2025-web/02.png" alt=""><figcaption></figcaption></figure>

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VyIjoiZ3Vlc3QifQ.
BWBj8__aPPDwugrPBtpm-YQjUt1GtRFbw45L2DxrBM6Y6q5oIDhepAl0lxLi6Kup05rExJzHqeUVNQh-77pLqK9VbCJcTchCktSgZZwIWS_u9nf8Q__Bi1goj7Os3rVJH5hdjKz4MnYQiurvxOZtUxhDRrUMNMnygT7Y_9PlPiT9dVpDAiBvhi3sUCcNyjUjf9IzPKYtFzl9SMOcv2Nr0qgweaKYr27-slmCVGoyBpwGmqkPi-XjUfaVOHhUOioWQZmNHbhin_pM6qYlUMwMzy5pRvE3NZCRELV6GUohg6QO8m6wMKuZwSPpfk4IWkUfkqLFSQTEKkmrKir2Ue41UQ
```

\
And We used the website <https://www.jwt.io/> to be able to analyze it and understand what exactly it consists of and what its contents are.

<figure><img src="./images/articles/ctf-eycc-2025-web/03.png" alt=""><figcaption></figcaption></figure>

We found that the content of the header was

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

And the content of the payload was

```json
{
  "user": "guest"
}
```

## We Can Crack It ?&#x20;

At the start , if anyone thinks we can crack it or try to break the encryption with a wordlist, that won’t work. If you noticed above, the algorithm is RS256. It uses a key pair (public/private key), and you can’t break it with passwords, because the signature is created with the private key and the public key only verifies the signature.

Now we have two options. The first option is to try to exploit the **`none`** attack in the JWT — let's try to do it.

## None Attack JWT ?&#x20;

<figure><img src="./images/articles/ctf-eycc-2025-web/04.png" alt=""><figcaption></figcaption></figure>

&#x20;A JWT contains the header field `alg` to specify the verification algorithm. The JWT specification allows the `"none"` option (unsigned) , if the server accepts it, an attacker can change the header to `none` and remove the signature, then modify the token's payload (for example `username: "guest"` → `username: "admin"`) to escalate privileges or impersonate a user.

You Can Read About It From Here :&#x20;

* <https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/>
* <https://www.vaadata.com/blog/jwt-json-web-token-vulnerabilities-common-attacks-and-security-best-practices/>
* <https://portswigger.net/kb/issues/00200901_jwt-none-algorithm-supported>

### Step-by-step How the attack works&#x20;

1. Decode the original token’s header and payload (they are base64), and you’ll find it’s signed with `RS256`.
2. Modify the header to become: `{"alg":"none","typ":"JWT"}`.
3. Modify the payload (for example change `"user":"guest"` → `"user":"admin"`).
4. Base64url-encode the header and the payload, join them with a dot, and leave out (or empty) the third part (signature):\
   `base64url(header) + "." + base64url(payload) + "."`
5. Send the modified token to the server. If the server is weak in verification (accepts `alg=none`) it will treat the token as trusted.

Practical example of the resulting header+payload after modification:

```
header (base64url): eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
payload (base64url): eyJ1c2VyIjoiYWRtaW4ifQ
Token : eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4ifQ.
```

### The Attack Is Work ? mm....Noo

<figure><img src="./images/articles/ctf-eycc-2025-web/05.png" alt=""><figcaption></figcaption></figure>

## Another Idea&#x20;

As we know, the encryption algorithm used for the challenge's JWT token is HS256.

If we want to change the permission in the payload from `guest` to `Admin`, we'll need to obtain the private key.

So there's no option other than searching the website to see if we can find it.

***

After poking around the page source and the JavaScript files for a bit, there was nothing. We tried some common dirs like `/flag` or `/data` and still nothing.

So I thought we could use dirsearch to guess directories and see if we find anything — and we did: a directory called `/vault`.

It had “Your Secure Vault” written in it, so I think we’re getting close to something. Let’s keep going and see what we find.

<figure><img src="./images/articles/ctf-eycc-2025-web/06.png" alt=""><figcaption></figcaption></figure>

It was hard to guess for a long time because there was a limit on the number of requests, so continuing was difficult , until a hint was posted in the last minutes of the challenge stating there’s a directory named `/internal/metadata`. When we opened it, we finally found the private key; at that point we could modify the payload and set `admin` easily.

<figure><img src="./images/articles/ctf-eycc-2025-web/07.png" alt=""><figcaption></figcaption></figure>

After Open The Dir , We got base64 Private Key  :&#x20;

```
Encoded private key: 

Ci0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLQpNSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUNQVllxVDJHUEwyUlRsCklwc2xtOEFpU0FsZVNnTlNHeXZaNzZ6OWVHcGR1eVhjUTV2UjhNcWU4Ylp1UTcvRjJlaWJVOVBVNHZpbmpHVXEKczNVeklXQVhFeHVkOExXUENZakd2UUM5WU9haGg1VDBLWFBxaVNaSmhIVXlxTldkSlBoM3BQajFvb1dNODZTQQphZDlyeE94d1lralFaNS9kcnhNZHh0UjdMY1pDZ3oyS1ROWmRXRGxPeC9TelhpL0dlaTRBQ0Z0M3VRWStxSnJZCjFiUStTd0JDUmpJTDlqT2xmZC93SjNXSmRjRXEvdDlyOUJmdHoyd3ludS9WWFN2TzZvdWpuUW5NYlBkZ3FsY1gKbFlWRnFjL2E1ZVA1VTlCL1hsYkk5U0IzQWc3YWJFZDZDbjhiM1N1YkFhVGpYN0lYYUNIdDduTUE3Rm41ZThZSQp0OUVHS3VuakFnTUJBQUVDZ2dFQUFwSW10NnNvY3hZVU5WM3ZDWGduTkpZMU1NOUVDdnQ0eUdKdnFHWTZCaTllCnFQby9kNzhKYTF0cmljUEdVMDZxeU9weWdMMkhkejNoN0tlbVlRSG12dE0xYWhwUXIxMmM2ZSttN1Q2cE5GbUIKdHZWdFlsWU9iVUFtZC8rbVFUalNDaGRYN2RQNThFTElmeE1uRWtCSWUyV1A1OGtNQ1laajRlTlltVk1EWE5zRgo1Ti9tbmpmSkJ4amZtQVRWM3RmU0NQaWJEQ0tDbFpPNlRoaFgrSEFpUzVrWDlPMS8wZm5NTWdiQ2hobE9BRWF5CjIrNFdpRkRlRGVkQ2YyVnNYNkw4MjdDT25SVkhnMUE2REtHNm5KRXZ1ZjU4dXhSRzdxeG9DdWtVbHUvOXlON08KcC8yVXRkYXJZc0lzWThONmhMWCtlYXRKSERSR01ncnMvVzFjc1lPVWNRS0JnUURJOFkwOE9tZEpEL1Btc0xXagpyWVpHZUZhSVdPMXN1QVhEdjdYRHoyR0NuUnNUdW5OclpFaDhXR2NCVWVaVXQ0eENhN25LL2RqRmlzeTdvRGlOCjZVdUtRejRuVkUwM0tOeUNUUWx1UHRpeXd2VFJ1aktmY1JnbXVJT3FsL3VGc1RxOU56WDJTelRRMEpZK2JUSEoKb2dmUlFHdDBxUFR6d3QxSlo2b1ExQnA3c3dLQmdRQzJtekJOL3lNeEsxdk1lMjdBTjRKYjNxcStLVHg0ZzJrTApueUxCakozQzlSNG1DNEVZUzA5RWZSVmdpZXNXVFM4U2R3bSthK2JqNXN6SDcrZ0Q2ZVhrendWcmgrKzFvcTZBCk52RGVjc1ZLSW5VYkRWMkRtdUxWU2p5bUd3R1dYZUJOYjRoRWp3WHplRTIvKzVrYVpjMWgyTXNFalhUY3ViSXcKVkZHUUY5OEJFUUtCZ1FDSXQ4Q3VqOVlpWWRaQ3lVeHNsdTNiR0psWG41bTY5T0lITTNMS1RWazg4d092UXBheApKTVFreGtrZkhzZ21MOVFnaFFjZVUrU2ZVemJGR2RnZ3hmQjluQTYzMTZYSnQrV0FTa1gyV3BBNTRHZU9JcSs2Cng4bjAzbW5ITWkwUjQybmh2NlRaZElYMDVWYTBGcnRmUXYwcXBEZjRZZFIzM2NlTjRCaFg1dGcxL1FLQmdGRXMKYVd1eXFDVTZYZ05uTjFOUkdhelhMZFY4cFRuNVNKLzI3TTlYUCtZamFuU0ZGcTBEQlVpdnhlbjFSVURUck1JcgprblJJcVFuVVZtSG1ucC9td09CV3V0VVRSNWJacTNLcGVhZVpJMlNTTHJhSTJYSWdUd2Q3aWJ4Wk12cHgzcnp0CmdJamhmMGE4eXVzMTM5aGhPc3h0UDhwVlM0YTNNYVBVUjdHak91blJBb0dBTUVoZDM0aE1mY1FIenBNOERVUGYKc0VwNmx3QmJGdDdpQm9ZV3BUc3NNUjlpUTd1RjA1ZlN6T1VsQTNadnhzUEljdTQ3TzREUnJYc2VxaEJOOGNvVAovR2VUTFhMZUpRNWlhL0MyZjMraDBHWkNPSWJrNTBna2huV2VrSzkwNFFndWhUc1k1WFpQZkZ2bEJsckgxRElnCmlycm5VNWVJa3JZT29TckVtSlQrTEVnPQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==.
```

After Decode It We Got Prv Key :&#x20;

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCPVYqT2GPL2RTl
Ipslm8AiSAleSgNSGyvZ76z9eGpduyXcQ5vR8Mqe8bZuQ7/F2eibU9PU4vinjGUq
s3UzIWAXExud8LWPCYjGvQC9YOahh5T0KXPqiSZJhHUyqNWdJPh3pPj1ooWM86SA
ad9rxOxwYkjQZ5/drxMdxtR7LcZCgz2KTNZdWDlOx/SzXi/Gei4ACFt3uQY+qJrY
1bQ+SwBCRjIL9jOlfd/wJ3WJdcEq/t9r9Bftz2wynu/VXSvO6oujnQnMbPdgqlcX
lYVFqc/a5eP5U9B/XlbI9SB3Ag7abEd6Cn8b3SubAaTjX7IXaCHt7nMA7Fn5e8YI
t9EGKunjAgMBAAECggEAApImt6socxYUNV3vCXgnNJY1MM9ECvt4yGJvqGY6Bi9e
qPo/d78Ja1tricPGU06qyOpygL2Hdz3h7KemYQHmvtM1ahpQr12c6e+m7T6pNFmB
tvVtYlYObUAmd/+mQTjSChdX7dP58ELIfxMnEkBIe2WP58kMCYZj4eNYmVMDXNsF
5N/mnjfJBxjfmATV3tfSCPibDCKClZO6ThhX+HAiS5kX9O1/0fnMMgbChhlOAEay
2+4WiFDeDedCf2VsX6L827COnRVHg1A6DKG6nJEvuf58uxRG7qxoCukUlu/9yN7O
p/2UtdarYsIsY8N6hLX+eatJHDRGMgrs/W1csYOUcQKBgQDI8Y08OmdJD/PmsLWj
rYZGeFaIWO1suAXDv7XDz2GCnRsTunNrZEh8WGcBUeZUt4xCa7nK/djFisy7oDiN
6UuKQz4nVE03KNyCTQluPtiywvTRujKfcRgmuIOql/uFsTq9NzX2SzTQ0JY+bTHJ
ogfRQGt0qPTzwt1JZ6oQ1Bp7swKBgQC2mzBN/yMxK1vMe27AN4Jb3qq+KTx4g2kL
nyLBjJ3C9R4mC4EYS09EfRVgiesWTS8Sdwm+a+bj5szH7+gD6eXkzwVrh++1oq6A
NvDecsVKInUbDV2DmuLVSjymGwGWXeBNb4hEjwXzeE2/+5kaZc1h2MsEjXTcubIw
VFGQF98BEQKBgQCIt8Cuj9YiYdZCyUxslu3bGJlXn5m69OIHM3LKTVk88wOvQpax
JMQkxkkfHsgmL9QghQceU+SfUzbFGdggxfB9nA6316XJt+WASkX2WpA54GeOIq+6
x8n03mnHMi0R42nhv6TZdIX05Va0FrtfQv0qpDf4YdR33ceN4BhX5tg1/QKBgFEs
aWuyqCU6XgNnN1NRGazXLdV8pTn5SJ/27M9XP+YjanSFFq0DBUivxen1RUDTrMIr
knRIqQnUVmHmnp/mwOBWutUTR5bZq3KpeaeZI2SSLraI2XIgTwd7ibxZMvpx3rzt
gIjhf0a8yus139hhOsxtP8pVS4a3MaPUR7GjOunRAoGAMEhd34hMfcQHzpM8DUPf
sEp6lwBbFt7iBoYWpTssMR9iQ7uF05fSzOUlA3ZvxsPIcu47O4DRrXseqhBN8coT
/GeTLXLeJQ5ia/C2f3+h0GZCOIbk50gkhnWekK904QguhTsY5XZPfFvlBlrH1DIg
irrnU5eIkrYOoSrEmJT+LEg=
-----END PRIVATE KEY-----
```

### Now we can use it to get a new token with elevated privileges <mark class="mark-$success">Admin</mark>.

<figure><img src="./images/articles/ctf-eycc-2025-web/08.png" alt=""><figcaption></figcaption></figure>

#### after changing it and using the new token, the flag appeared.

<figure><img src="./images/articles/ctf-eycc-2025-web/09.png" alt=""><figcaption></figcaption></figure>

<pre><code><strong>eycc{dkfjdckehdkclsn}
</strong></code></pre>

***

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

### Remember My name : <mark class="mark-green">everythingBlackkk</mark>

Made by <3&#x20;

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
