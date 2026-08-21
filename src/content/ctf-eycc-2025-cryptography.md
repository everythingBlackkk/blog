# EYCC 2025 - Cryptography

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/01.png" alt=""><figcaption></figcaption></figure>

## Challenge ( 1 ) Veiled Secret&#x20;

At the beginning, there were three challenges in cryptography. The first challenge was called **Veiled Secret**, and it was an easy challenge worth **100 points**.

Let's start the challenge.

Initially, I was given the text:

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/02.png" alt=""><figcaption></figcaption></figure>

```
MKywL3gznaqhM2ghqzuxnzMvqTulsD==TOR13
```

At first, I noticed the word **TOR**, which is reversed, indicating that the encryption method used is likely **ROT13**. Let's try that.

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/03.png" alt=""><figcaption></figcaption></figure>

The result became:

```
ZXljY3tmanduZ2tudmhkamZidGhyfQ==GBE13
```

This suggests that it is probably **Base64**, because the length of the characters is around 32, which can be divided by 4 to give an integer multiple, and there are other indicators like the mix of letters, numbers, and the `=` padding typical of Base64.

Now, let's try to decode the Base64:

```bash
echo "ZXljY3tmanduZ2tudmhkamZidGhyfQ==" | base64 -d
```

The result became:

```
eycc{fjwngknvhdjfbthr}
```

## We successfully solved the first challenge!

***

## Challenge ( 2 ) Golden Spiral&#x20;

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/04.png" alt=""><figcaption></figcaption></figure>

At the beginning, the challenge provided us with an executable file

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/05.png" alt=""><figcaption></figcaption></figure>

When we ran it, we found that it outputs an encrypted string following the same format as our flag:

```
fzef{7i0fGcobhxzwr4j}
```

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/06.png" alt=""><figcaption></figcaption></figure>

Our expected flag format starts with:

```
eycc{
```

Let’s analyze what happens at the beginning of the flag.

Here are the English letters in order:

```
A - B - C - D - E - F - G - H - I - J - K - L - M - N - O - P - Q - R - S - T - U - V - W - X - Y - Z
```

* The first letter of the encrypted value is **f**, while the expected value is **e**. This means it was shifted by **1**.
* The second letter of the encrypted value is **z**, while the expected value is **y**. Again, it was shifted by **1**.
* The third letter of the encrypted value is **e**, while the expected value is **c**. This indicates a shift of **2**.
* The fourth letter of the encrypted value is **f**, while the expected value is **c**. This indicates a shift of **3**.

In conclusion, the sequence of shifts used in this mathematical encryption process is:

```
1, 1, 2, 3
```

Now, let’s look at the encryption algorithm behind this process. During our research on the website [OEIS](https://oeis.org), which analyzes such sequences, we found that the algorithm is based on **Fibonacci numbers**.

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/07.png" alt=""><figcaption></figcaption></figure>

Now, let’s try to decrypt it, since we know that the encryption type is **Fibonacci numbers**.

And now, we have obtained the second flag:

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/08.png" alt=""><figcaption></figcaption></figure>

```
eycc{7v0xDraculalh4e}
```

***

## Challenge ( 3 ) Silent Keys

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/09.png" alt=""><figcaption></figcaption></figure>

تمام ✅ خليني أعيد صياغة المقال لكن بخطوات أوضح وتنظيم أفضل بحيث المعادلات والأكواد تبقى في **code blocks** بدل الكتابة العادية:

***

## Solving an RSA CTF Challenge with a Mathematical Clue

We are given the following RSA parameters in the challenge:

```
n = 148304669693572711157725718049458731328582148078019
e = 65537
c = 35618364216358867907731764651946346081071748936005
```

The clue is:

```
n is the product of two primes; one of them is the integer part of pi multiplied by 10^5
```

***

### Step 1: Interpreting the Clue

We know RSA modulus `n` is the product of two primes `p` and `q`.

The clue says one prime is:

```
p = floor(pi × 10^5)
p = 314159
```

***

### Step 2: Factoring `n`

Now that we know `p`, we can compute `q`:

```python
q = n // p
```

Result:

```
q = 472 068824 046335 489856 173842 065510 557802 202541
```

So the factors are:

```
p = 314159
q = 472 068824 046335 489856 173842 065510 557802 202541
```

<figure><img src="./images/articles/ctf-eycc-2025-cryptography/10.png" alt=""><figcaption></figcaption></figure>

### Step 3: Why `p` and `q` matter

In RSA, `p` and `q` are the secret prime factors of `n`.\
Once we have them, we can compute **Euler’s totient** φ(n):

```
φ(n) = (p - 1) * (q - 1)
```

***

### Step 4: Computing the Private Key

The private exponent `d` is the modular inverse of `e` modulo φ(n):

```
d = inverse(e, φ(n))
```

This `d` together with `n` forms the RSA **private key**.

***

### Step 5: Decrypting the Ciphertext

The plaintext message `m` is obtained by:

```
m = c^d mod n
```

This gives us the flag.

***

### Step 6: Python Script to Solve

Here’s a minimal Python script that automates the process:

```python
from Crypto.Util.number import inverse, long_to_bytes

n = 148304669693572711157725718049458731328582148078019
e = 65537
c = 35618364216358867907731764651946346081071748936005

p = 314159
q = n // p

print("Q is : " , q)

phi = (p - 1) * (q - 1)
d = inverse(e, phi)

m = pow(c, d, n)
print(long_to_bytes(m))
```

The Result is :&#x20;

```
Q is :  472068824046335489856173842065510557802202541
b'eycc{fkgruwngmdhgien}'
```

### Why This Works

The security of RSA relies on the difficulty of factoring large numbers.\
Normally, factoring `n` is computationally infeasible.\
However, the clue revealed one of the primes directly (`p = 314159`).\
With that knowledge, we easily computed `q`, derived the private key, and decrypted the ciphertext.

***

### Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

Remember My name : everythingBlackkk

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
