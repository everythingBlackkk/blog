# Nice Cryptography

## Exploiting Common Prime Factors in RSA Public Keys

### Introduction

In this challenge, we were provided with two RSA public keys. The task was to retrieve the encrypted flag. The vulnerability comes from a well-known RSA misconfiguration: **two different RSA public keys sharing a common prime factor**.

When this happens, the security of both keys is broken because their moduli can be factored efficiently using the greatest common divisor (GCD). Once the prime factors are known, we can recover the private key and decrypt the ciphertext.

***

### Step 1: Extracting the Modulus from the Public Keys

We started by extracting the modulus nn from each public key using OpenSSL:

```bash
openssl rsa -pubin -text -noout -in pub1.pem
```

<figure><img src="./images/articles/ctf-nice-cryptography/01.png" alt=""><figcaption></figcaption></figure>

```bash
openssl rsa -pubin -text -noout -in pub2.pem
```

<figure><img src="./images/articles/ctf-nice-cryptography/02.png" alt=""><figcaption></figcaption></figure>

This outputs the modulus (N) in **hexadecimal** format. Since we need to perform arithmetic operations, we converted the modulus values into **decimal form** using Python.

***

### Step 2: Converting Hexadecimal to Decimal and Checking for a Common Factor

We used a small Python script to parse the hex-encoded modulus, convert it into decimal, and compute the GCD:

```python
import math

user_input = """6b:43:af:24:3b:29:94:e6:0b:a4:5a:32:90:a9:73: ..."""
user_input_2 = """7b:c9:4e:9a:2c:cb:1c:c6:f9:cd:ab:1a:c1:df:84: ..."""

hex_str = user_input.replace(":", "").replace(" ", "").replace("\n", "")
hex_str_2 = user_input_2.replace(":", "").replace(" ", "").replace("\n", "")

decimal_value = int(hex_str, 16)
decimal_value_2 = int(hex_str_2, 16)

print("Decimal Value 1:", decimal_value)
print("Decimal Value 2:", decimal_value_2)

g = math.gcd(decimal_value, decimal_value_2)
print("GCD is:", g)
```

Running this script revealed a non-trivial GCD, which is one of the shared primes (pp) used in both keys.

```
python3 replace.py 

===== Public Key One (1) =====

Decimal Value is: 13540874928004774449940888250990176482860370416140959713225210486222278751944251539089722852825887946084727327163612306211744103029733358556617521691293343396988094743567576433238492833615123714146003330718439368755328544166599696191313672854106631764467415480275376051909478804823120788162244432502332050763651777402008376804265421069124797204931206287621226645053820484621525051512496941241234102067950760063383305153448270177214712731584051818028548835042649783380570087291751992150557297265415888008958932302521647608336418464452934120821613909117761837949656116244515792506657374465637641646862054369814273217119

===== Public Key One (2) =====

Decimal Value is: 15626579712037280460803866128649267096197745339028764429674752188021439865929057749085703595023402299100693391650149807895511557818025328494289534560535601290723522317157075450924595401282581769248629728310087414815450422964523606384318890746866480716035177503267839579240444604245180131363277554127436160240961249165585332241233864505033597553677933514407795494668317000228885144694195918744116403318174968775416083744601217882390030145996952405546165918510511636759047371177677680734011394058834143637583900015387951660374441998328358240766450633444068539395581123401797953308532586966002030101613582925413999754461

===== GCD between the two keys =====

GCD is: 108518708672007242000330580755716067203432576702907211221273038003696998357205562584690683886762241476684785892204651339607406633937378975082602416383479405558459885034879568396135631205302508383709616634552485455830902507969656903651311063235077228545830269692993073292706882580457638658582613363335002513217

```

***

### Step 3: Factoring the Moduli

With p known, factoring both modulus values becomes trivial:

<figure><img src="./images/articles/ctf-nice-cryptography/03.png" alt=""><figcaption></figcaption></figure>

***

### Step 4: Recovering the Private Key

<figure><img src="./images/articles/ctf-nice-cryptography/04.png" alt=""><figcaption></figcaption></figure>

***

### Step 5: Decrypting the Flag

Finally, we built a private RSA key object and used it to decrypt the ciphertext.

The script used to automate these steps was:

```python
# solve_shared_prime.py
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP, PKCS1_v1_5
from Crypto.Util.number import inverse
from Crypto.Util.number import long_to_bytes
import sys

# Let's Hack This Shit !!!
n1 = 13540874928004774449940888250990176482860370416140959713225210486222278751944251539089722852825887946084727327163612306211744103029733358556617521691293343396988094743567576433238492833615123714146003330718439368755328544166599696191313672854106631764467415480275376051909478804823120788162244432502332050763651777402008376804265421069124797204931206287621226645053820484621525051512496941241234102067950760063383305153448270177214712731584051818028548835042649783380570087291751992150557297265415888008958932302521647608336418464452934120821613909117761837949656116244515792506657374465637641646862054369814273217119

n2 = 15626579712037280460803866128649267096197745339028764429674752188021439865929057749085703595023402299100693391650149807895511557818025328494289534560535601290723522317157075450924595401282581769248629728310087414815450422964523606384318890746866480716035177503267839579240444604245180131363277554127436160240961249165585332241233864505033597553677933514407795494668317000228885144694195918744116403318174968775416083744601217882390030145996952405546165918510511636759047371177677680734011394058834143637583900015387951660374441998328358240766450633444068539395581123401797953308532586966002030101613582925413999754461

p =  108518708672007242000330580755716067203432576702907211221273038003696998357205562584690683886762241476684785892204651339607406633937378975082602416383479405558459885034879568396135631205302508383709616634552485455830902507969656903651311063235077228545830269692993073292706882580457638658582613363335002513217

e = 65537

q1 = n1 // p
q2 = n2 // p

print("p:", p)
print("q1:", q1)
print("q2:", q2)

phi1 = (p - 1) * (q1 - 1)
assert n1 == p * q1
assert n2 == p * q2

d1 = inverse(e, phi1)
print("Computed d (hex, truncated):", hex(d1)[:80] + "...")

priv1 = RSA.construct((n1, e, d1, p, q1))

ct_path = "flag.enc"
try:
    with open(ct_path, "rb") as f:
        ct = f.read()
except FileNotFoundError:
    print("flag_Not_Found!!!")
    sys.exit(1)

# PKCS1_OAEP
try:
    cipher_oaep = PKCS1_OAEP.new(priv1)
    pt = cipher_oaep.decrypt(ct)
    print("[+] Decrypted with OAEP:")
    print(pt)
    try:
        print("Decoded (utf-8):", pt.decode())
    except:
        pass
    sys.exit(0)
except Exception as ex:
    print("[-] OAEP failed:", repr(ex))

print("[!]Erorrrrr Here!!")


```

This script successfully recovered the plaintext, which contained the flag.

<figure><img src="./images/articles/ctf-nice-cryptography/05.png" alt=""><figcaption></figcaption></figure>

***

```
flag{MyName:everythingBlackkk}
```

***

## Why Shared Primes Happen in Practice

RSA relies heavily on generating **two large random primes** pp and qq. The security assumption is that factoring the modulus n=p×qn = p \times q is computationally infeasible when both primes are unique and strong. However, in practice, **shared primes** have been observed in real-world systems due to several reasons:

#### 1. Weak or Reused Random Number Generators (RNGs)

If the random number generator used to pick pp and qq is not cryptographically secure, it may output predictable or repeated values. For example:

* Some embedded devices or IoT devices use weak entropy sources (e.g., system time at boot) to generate keys.
* If two devices boot at similar times with the same weak RNG, they may generate identical primes.

This was observed in research studies where millions of RSA keys on the internet were scanned, and many were found sharing prime factors.

#### 2. Faulty Key Generation Implementations

Poorly implemented cryptographic libraries or custom RSA key generators may:

* Accidentally reuse one prime across different key generations.
* Fail to check if p=qp = q (leading to a trivial factorization).
* Not properly reseed the RNG, leading to repeated sequences.

#### 3. Historical Incidents

Several notable incidents demonstrated this vulnerability in practice:

* **2012 “Mining Your Ps and Qs” Paper** (Lenstra et al.): Researchers scanned millions of public keys and found that **\~0.4% of RSA keys shared primes** due to bad randomness.
* **Debian OpenSSL Bug (2006–2008):** A flaw in Debian’s OpenSSL package severely reduced entropy, leading to a huge number of predictable keys.

***

### Conclusion

The challenge demonstrated a critical RSA vulnerability: **shared prime factors between public keys**. By computing the GCD of two moduli, we were able to recover the prime, factor the moduli, reconstruct the private key, and decrypt the ciphertext.

This is why cryptographic libraries must ensure proper randomness in key generation. Reusing or accidentally sharing prime numbers completely breaks RSA security.

***

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

Remember My name : everythingBlackkkMade&#x20;

by ❤

Github : <https://github.com/everythingBlackkk>​

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)​

X : <https://x.com/0xblackkk>​

Youtube : <https://www.youtube.com/@everythingBlackkk>
