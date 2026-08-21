# How RSA Work ?  (P1)

***

## RSA Explained in Simple Terms

In the **RSA** algorithm, we use an operation called **Modular Exponentiation**, which simply means:

* Take a number (the base), raise it to a power (the exponent), then take the remainder after dividing by another number (the modulus).
* Example:

```ini
2^10 mod 17
```

```
2^10 = 1024
1024 ÷ 17 = 60 remainder 4
2^10 mod 17 = 4
```

In Python, it looks like this:

```
pow(2, 10, 17)  # returns 4
```

***

### 2 - RSA Encryption

RSA encryption means we use **modular exponentiation** on a message `m` using the exponent `e` and modulus `N`.\
The modulus `N` is usually the product of two prime numbers:

```
N = p * q
```

Together, `N` and `e` form the **Public Key**:

```
(N, e)
```

The most common value for `e` is:

```
0x10001 = 65537
```

***

#### Example:

Encrypt the message:

```
m = 12
```

using:

```
e = 65537
p = 17
q = 23
```

1. Compute `N`:

```
N = p * q = 17 * 23 = 391
```

2. Public key:

```
(N, e) = (391, 65537)
```

3. Encryption:

```
c = m^e mod N
c = 12^65537 mod 391
```

***

### The Core Idea of RSA

RSA’s security comes from the difficulty of **factoring N into its prime factors**.\
If we can factor `N` (find `p` and `q`), we can calculate **Euler’s Totient function** φ(N), and from that we can decrypt messages.

Example given:

```
N = p * q
p = 857504083339712752489993810777
q = 1029224947942998075080348647219
```

We want to compute φ(N).

***

#### Euler’s Totient Formula:

If `N = p * q` and both are primes:

```
φ(N) = (p - 1)(q - 1)
```

***

### The Private Key (d)

The private key `d` is what allows decryption.\
It is computed as the **modular inverse** of `e` with respect to φ(N):

```
d ≡ e^(-1) mod φ(N)
```

Given:

```
p = 857504083339712752489993810777
q = 1029224947942998075080348647219
e = 65537
```

The task:

```
d ≡ e^(-1) mod φ(N)
```

***

## Happy End.

Remember it's Just Part 1&#x20;

<figure><img src="./images/articles/crypto-note-how-rsa-work-p1/01.png" alt=""><figcaption></figcaption></figure>

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

Remember My name : everythingBlackkkMade&#x20;

Github : <https://github.com/everythingBlackkk>​

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)​

X : <https://x.com/0xblackkk>​

Youtube : <https://www.youtube.com/@everythingBlackkk>
