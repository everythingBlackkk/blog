# Why Proxy Settings Don’t Work in Flutter Apps

<figure><img alt="" src="./images/articles/mobile-security-flutter-proxy-settings/01.png" /></figure>

## Why Don’t Proxy Settings Work Normally with Flutter Apps, Unlike Apps Built with Java or Kotlin?

<p>Normally, when you are testing a mobile application — whether Android or iOS — you configure the device’s Wi-Fi proxy to use Burp Suite’s IP address, install and trust Burp’s certificate, and then check whether you need to perform an SSL pinning bypass.</p><p>However, if you follow the exact same steps with a Flutter application, you may not see any requests in Burp Suite at all, even though the application continues to work normally.</p>

## So, What Makes Flutter Different?

<p>Flutter comes with its own networking stack, dart:io, which is built on top of BoringSSL.</p><p>BoringSSL is similar to OpenSSL, but it is a fork maintained and modified by Google.</p><p>What happens is that Flutter applications may ignore the proxy settings configured on the mobile device. As a result, you cannot see the application’s traffic in Burp Suite, capture the API requests, and begin your testing workflow normally.</p><p>Currently, there are several possible solutions.</p>

## Solution 1: reFlutter

<p>The first solution is to use a tool called <strong>reFlutter</strong>.</p><p>It patches native libraries and components such as ssl_x509.cc inside BoringSSL. This can bypass certificate verification and allow the application’s traffic to be intercepted.</p>

## Solution 2: Frida

<p>The second solution is to use a Frida script such as this one:</p><p>https[:]//lnkd[.]in/e5xahQ3d</p><p>The script works at runtime while the application is running.</p><p>On Android, it searches for libflutter.so, locates a specific verification function, and modifies its behavior so that the verification result always returns success.</p><p>On iOS, it performs a similar process by locating ssl_verify_peer_cert and modifying it so that it also returns success.</p>

## But There Is a Problem!

<p>What happens if the application you are testing implements anti-hooking or anti-patching protections?</p><p>In that case, another approach may be more suitable: using a tool such as <strong>dnsChef</strong>.</p>

## What Is dnsChef?

<p>dnsChef is a fake DNS proxy. It attempts to convince the application that the IP address of the server it is trying to communicate with is actually the IP address of your Burp Suite machine.</p><p>However, there is another problem.</p><p>dnsChef is an old tool, and it uses an outdated version of the dnslib library.</p><p>The issue with that older version is that it does not properly handle <strong>DNS Type 65</strong>, also known as the <strong>HTTPS DNS record</strong>.</p><p>dnsChef can process standard A and AAAA DNS records without any problems. However, DNS Type 65 responses contain additional information, which the older library cannot parse or handle correctly.</p><p>To solve this, I made a small modification to the tool so that it can now properly process DNS Type 65 records.</p><p>In the end, I was able to intercept and view the application’s traffic normally.</p><p>And finally, all I want to say is:</p><p><strong>What was wrong with Kotlin and Java? Why did we need all this headache?</strong></p><p>The tool link is available here =&gt;</p><p><a href="https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fgithub.com%2FeverythingBlackkk%2Fdnschef&amp;urlhash=jbFN&amp;mt=KZQR5vVwN_gpk4PorK9GS_XGPcI2mIzNXqzsdYrBhaJEEc4MCVL26yRmpynl5fmuiUEmP1rRc0P5Ao8uuoIlBGQ_gppM25M1X5D5rAZFjCu73K4-xC4H6FDkGC0ViFspVbK-RZhvf1hABExiP-3gOaNbIxm4S8M-rSo&amp;isSdui=true&amp;lipi=urn%3Ali%3Apage%3Ad_flagship3_detail_base%3B0MmBuj4tRp2%2Ff1Ao5aTnDg%3D%3D">https://github.com/everythingBlackkk/dnschef</a></p>
