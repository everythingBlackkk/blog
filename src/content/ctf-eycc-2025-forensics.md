# EYCC 2025 - Forensics

Hello everyone,\
This challenge is considered medium-level, not too difficult, but it contains some combined ideas which made it quite interesting.\
Let’s talk about the beginning.

In this challenge, we have a **ZIP file**.

```
- file CUNTISSIMO.zip 
CUNTISSIMO.zip: Zip archive data, at least v5.1 to extract, compression method=AES Encrypted

```

<figure><img src="./images/articles/ctf-eycc-2025-forensics/01.png" alt=""><figcaption></figcaption></figure>

But it was protected with a password. At first, I used **rockyou** to try and crack the protection.

I used this code to do it, and indeed the password turned out to be **12345678** — much easier than I expected.\
That was actually quite funny.

```python
import pyzipper, sys

found_it = False
zf = pyzipper.AESZipFile(sys.argv[1])
for w in open(sys.argv[2], "rb"):
    pw = w.strip()
    try:
        zf.extractall(pwd=pw)
        print("\n\n[+] Password:", pw.decode(errors="ignore"))
        print("\n\n")
        found_it = True
        sys.exit(0)
    except:
        continue

if not found_it:
    print("[-] Not found")
    
    
```

<figure><img src="./images/articles/ctf-eycc-2025-forensics/02.png" alt=""><figcaption></figcaption></figure>

Now we have a file, but it doesn’t open. At first, we tried using some tools, like **binwalk**, to extract files from it or something similar, but all attempts failed.

However, we noticed something very important: when we looked at the **hex** using

```
hexdump -C TARGET
```

<figure><img src="./images/articles/ctf-eycc-2025-forensics/03.png" alt=""><figcaption></figcaption></figure>

we found data indicating the presence of a **JPEG**, but the first 3 bytes in the hex were essentially corrupted.

So, we searched for the correct **magic number** in a GitHub repo, and the expected result was:

<https://gist.github.com/leommoore/f9e57ba2aa4bf197ebc5>

```
ff d8 ff e0
```

<figure><img src="./images/articles/ctf-eycc-2025-forensics/04.png" alt=""><figcaption></figcaption></figure>

***

Now I opened the site [**https://hexed.it/**](https://hexed.it/) so I could edit the first 3 bytes and change them to the correct value. After doing that, I clicked **export**, and here came the surprise!

<figure><img src="./images/articles/ctf-eycc-2025-forensics/05.png" alt=""><figcaption></figcaption></figure>

An image appeared that contained some encryption, and I thought it was the **flag**.\
At first, I assumed it was **Base64**, but it wasn’t.

<figure><img src="./images/articles/ctf-eycc-2025-forensics/06.jpg" alt=""><figcaption></figcaption></figure>

```
MYZWQMDYIRZGCY3VHBWGC5Y=
```

So I tried **Base32**, and indeed it revealed the flag!!!

<figure><img src="./images/articles/ctf-eycc-2025-forensics/07.png" alt=""><figcaption></figcaption></figure>

```
eycc{f3h0xDracu8law}
```

***

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

Remember My name : everythingBlackkkMade&#x20;

by ❤

Github : <https://github.com/everythingBlackkk>​

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)​

X : <https://x.com/0xblackkk>​

Youtube : <https://www.youtube.com/@everythingBlackkk>​​
