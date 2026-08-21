# Use DNS Record in Red Team

One of the well-known methods for detecting threats is monitoring DNS traffic to identify suspicious connections. If a hacker is communicating with a Command and Control (C\&C) server via HTTP(S), it is relatively easy to detect, especially if the target has systems like SIEM (Security Information and Event Management) for analyzing network traffic and maintaining a large blacklist of known malicious domains.

However, we can use DNS as a means of communication with a C\&C server, bypassing traditional detection methods. This is where DNS records, particularly TXT records, come into play.

## What is a DNS TXT Record? 

A TXT (Text) record is one of the record types in DNS that stores textual data. It is often used for verification or security purposes, such as:

* Domain ownership verification for services like Google and Microsoft.
* SPF (Sender Policy Framework) and DKIM (DomainKeys Identified Mail) to prevent email spoofing.
* Any arbitrary text data that an administrator wants to associate with a domain.

## How Can We Exploit TXT Records? 

To demonstrate how we can leverage TXT records for malicious purposes, I have created two Python scripts:

1. **One script simulates the hacker.**
2. **One script simulates the victim.**

In short, the hacker’s script will act as a DNS server (since I don’t have a real domain, I will create a local DNS server named `redteam.local`).

* This script will take a shellcode (or any data you want to send), split it into chunks, and encode each chunk in Base64.
* The reason for splitting the shellcode is the size limitation of TXT records in DNS.

## Why Do We Need to Split the Shellcode? 

The maximum allowed size for a single TXT record response in DNS is **255 bytes**. While some DNS servers support multiple TXT records per request, allowing for larger payloads, each individual TXT record must still adhere to the 255-byte limit.

**The challenge:**\
If you want to send shellcode or any large data via DNS, you cannot fit it all in a single TXT record. You need to split it into multiple chunks and send them sequentially.

**How do we achieve this?**\
We send the shellcode in parts, using sequential subdomain names such as:

```
chunk1.redteam.local  
chunk2.redteam.local  
chunk3.redteam.local  
...
```

<figure><img src="./images/articles/offensive-security-use-dns-record-in-red-team/01.png" alt=""><figcaption></figcaption></figure>

until the entire shellcode is transmitted through the TXT records. The structure of these records can be visualized in the attached images.

<figure><img src="./images/articles/offensive-security-use-dns-record-in-red-team/02.png" alt=""><figcaption></figcaption></figure>

## What Happens on the Victim's Side? 

The victim’s script will:

* Query the attacker's domain (`redteam.local`).
* Retrieve all TXT records.
* Decode and reassemble the shellcode from the Base64 chunks.
* Execute the shellcode directly in memory (or handle it in any other way, depending on the attacker’s creativity).

<figure><img src="./images/articles/offensive-security-use-dns-record-in-red-team/03.png" alt=""><figcaption></figcaption></figure>

## Is This Technique Limited to Executing Shellcode? 

Absolutely not! You can use it to:

* **Exfiltrate data from the victim’s device to your server** using DNS queries.
* **Send commands to the victim’s machine** without triggering traditional detection mechanisms.
* **Bypass network restrictions** since DNS traffic is often allowed through firewalls without deep inspection.

The possibilities depend entirely on your creativity and how you choose to utilize this technique.

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

Remember My name : everythingBlackkk

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/iyassinmo>
