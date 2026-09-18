# Mal Music: Reversing a Lumma Stealer-Inspired Challenge

## Introduction

**MulMusic** is a reverse engineering challenge that closely simulates a Lumma Stealer-style infection chain. The goal is to work through its layers of obfuscation, identify the command-and-control (C2) server, and submit its IP address in the format `flag{c2_ip}`.

Lumma Stealer, also known as LummaC2, is an infostealer offered as malware as a service. It targets sensitive information from browsers and other applications, including saved credentials, session cookies, and cryptocurrency wallets. For background on the real malware, see Microsoft's [Lumma Stealer: Breaking down the delivery techniques and capabilities of a prolific infostealer](https://www.microsoft.com/en-us/security/blog/2025/05/21/lumma-stealer-breaking-down-the-delivery-techniques-and-capabilities-of-a-prolific-infostealer/).

This write-up follows the challenge through five stages, starting with a file that looks like an MP3 and ending with a .NET executable containing the C2 endpoint.

## Stage 1: JavaScript Hidden Inside an MP3

At first glance, the file looks like a normal MP3. Let's open it in HxD and scroll further down to inspect more of its bytes.

![MulMusic analysis screenshot 1](./images/manual/mulmusic/01.png)

Interestingly, we find a `<script>` tag inside the MP3.

![MulMusic analysis screenshot 2](./images/manual/mulmusic/02.png)

Let's copy the code into a text editor so that it is easier to inspect.

![MulMusic analysis screenshot 3](./images/manual/mulmusic/03.png)

There is a lot of dummy JavaScript-like code, such as:

```html
<script>u w m f y y o e >= { s h f string g</script>
<script>static != l class <= - + u o f w d int d o - * o } z</script>
```

These fragments do not do anything meaningful. They are junk inserted to obscure the real code and make analysis harder.

Rather than reading every fragment, we can search for JavaScript functions associated with execution or decoding, such as `eval`, `atob`, `setTimeout`, and `decodeURI`.

![MulMusic analysis screenshot 4](./images/manual/mulmusic/04.png)

Searching for `eval` reveals the real JavaScript code:

```javascript
<script>
eval(WL5TRO.replace(/(..)./g, function(match, p1) {
  return String.fromCharCode(parseInt(p1, 16));
}));
</script>
```

### Understanding the Decoder

The code reads the value of `WL5TRO` and applies the regular expression `/(..)./g`. Each match captures two characters and discards the third. For example, `48x65x` supplies the hexadecimal pairs `48` and `65`.

Next, `parseInt(p1, 16)` converts each hexadecimal pair into a number. For example, `parseInt("48", 16)` returns `72`. Then `String.fromCharCode(72)` converts that number into the character `H`.

Finally, `eval` executes the decoded content. To move to the next stage, we need to find the value of `WL5TRO` and decode it.

Let's search for the variable in HxD.

![MulMusic analysis screenshot 5](./images/manual/mulmusic/05.png)

We find the encoded hexadecimal string. Its beginning looks like this:

```javascript
var WL5TRO = '76s61w72c20i61m3dl5by35v33d33r2cu20t35.............
```

Let's copy the value into `WL5TRO.txt` and decode it with a Python script using the same logic as the JavaScript decoder.

## Stage 2: From JavaScript to Encrypted PowerShell

After decoding, we recover the following JavaScript:

![MulMusic analysis screenshot 6](./images/manual/mulmusic/06.png)

```javascript
var a = [533, 532, 540, 522, 535, ...];

for(; i < a.length;)
    c += String.fromCharCode(a[i++] - 421);

new ActiveXObject('WScript.Shell').Run(c);
```

The loop walks through array `a`, subtracts `421` from each value, converts the result into a character, and appends it to variable `c`. For example:

```text
533 - 421 = 112 = 'p'
532 - 421 = 111 = 'o'
```

### What ActiveXObject Does

`ActiveXObject(...)` creates and uses a COM object from JavaScript on Windows. Here, the script requests an object with the ProgID `WScript.Shell`. Windows looks up that ProgID in the registry, and the script uses `.Run(c)` to run the decoded command.

`WScript.Shell` gives the script access to Windows shell features. You can find its ProgID under:

```text
HKEY_CLASSES_ROOT\WScript.Shell
```

![MulMusic analysis screenshot 7](./images/manual/mulmusic/07.png)

Now that we understand the encoding, let's decode array `a` and inspect the next stage.

![MulMusic analysis screenshot 8](./images/manual/mulmusic/08.png)

The result is a large, obfuscated PowerShell command. It includes these arguments:

- `-w h`: Hide the PowerShell window.
- `-ep Unrestricted`: Relax the PowerShell execution policy.
- `-nop`: Do not load the PowerShell profile.

These options help the command run less visibly. The script also contains this function:

```powershell
function djoI($bMcq){
    -split($bMcq -replace '..', '0x$& ')
}
```

The variable and function names are also obfuscated. The encoded payload is stored in `jEoLV`, while `djoI` formats pairs of hexadecimal characters as byte values, for example:

```text
96 -> 0x96
```

Let's scroll further down to understand how the payload is processed.

![MulMusic analysis screenshot 9](./images/manual/mulmusic/09.png)

### 1. Create the AES Cipher

```powershell
$aes=[Security.Cryptography.Aes]::Create()
$aes.Mode='CBC'
$aes.Padding='None'
```

The script creates an AES cipher in **CBC mode**. Padding is disabled because the script removes it manually later.

### 2. Create the Decryptor

![MulMusic analysis screenshot 10](./images/manual/mulmusic/10.png)

```powershell
$decryptor=$aes.CreateDecryptor(
    @(djoI('7075554B5A64747A43524D6571765948')),
    [byte[]]::new(16)
)
```

`djoI(...)` converts the hexadecimal string into the AES key. Interpreted as ASCII, the key is `puUKZdtzCRMeqvYH`. The expression `[byte[]]::new(16)` creates a 16-byte IV filled with zeros.

### 3. Decrypt the Payload

```powershell
$decrypted=$decryptor.TransformFinalBlock($jEoLV,0,$jEoLV.Length)
```

This decrypts the encrypted data stored in `$jEoLV`.

### 4. Remove the Padding

![MulMusic analysis screenshot 11](./images/manual/mulmusic/11.png)

```powershell
$pad=$decrypted[$decrypted.Length-1]
$unpadded=$decrypted[0..($decrypted.Length-$pad-1)]
```

The script reads the last byte as the padding length and removes that many bytes.

### 5. Load the Decrypted Data into Memory

![MulMusic analysis screenshot 12](./images/manual/mulmusic/12.png)

```powershell
$ms=[System.IO.MemoryStream]::new([byte[]]$unpadded)
```

This places the decrypted payload into an in-memory stream, allowing the next steps to process it without writing it to disk.

### 6. Decompress the GZIP Data

![MulMusic analysis screenshot 13](./images/manual/mulmusic/13.png)

```powershell
$gzip=New-Object IO.Compression.GzipStream(...)
$sr=New-Object IO.StreamReader($gzip)
$script=$sr.ReadToEnd()
```

The script decompresses the decrypted data and reads the resulting PowerShell script as text.

### 7. Execute the Recovered Script

```powershell
& $script.Substring(0,3) $script.Substring(3)
```

This takes the first three characters as a command and passes the remaining text as its argument.

![MulMusic analysis screenshot 14](./images/manual/mulmusic/14.png)

For example, if the recovered text begins with:

```text
iex<PowerShell code>
```

It effectively behaves like:

```powershell
iex "<PowerShell code>"
```

The overall flow is:

**Encrypted bytes → AES-CBC decryption → Padding removal → GZIP decompression → PowerShell recovery → In-memory execution**

## Stage 3: Unpacking the XOR Layer

This is the PowerShell script that the previous stage loads into memory.

![MulMusic analysis screenshot 15](./images/manual/mulmusic/15.png)

It is a large script containing many lines of junk code and obfuscation. For more background, see [Junk Code Insertion — MITRE ATT&CK T1027.016](https://attack.mitre.org/techniques/T1027/016/).

Let's keep scrolling until we find something interesting.

![MulMusic analysis screenshot 16](./images/manual/mulmusic/16.png)

We find a byte array named `kcMrSOkblJXfYSlRotOdB`. Let's search for that name to see where it is used.

![MulMusic analysis screenshot 17](./images/manual/mulmusic/17.png)

There is also a variable named `eKXCNQlUlOmSwCy` that contains an obfuscated string construction. After deobfuscation, it resolves to:

```powershell
$yJnBuUCkdg.Length
```

The script needs the length of `yJnBuUCkdg`.

Another useful clue is the Russian comment `# Ключ` on the line defining `ZohLcP`:

```powershell
$ZohLcP = ($zNfeqTmNMVjC -as [Type])::$RzBEsmYJFJvleMLWMRDc.$OYAFXSgXr("$vLnPQPwjqzlmXBcocZcj"); # Ключ
```

![MulMusic analysis screenshot 18](./images/manual/mulmusic/18.png)

The comment translates to **“Key”**.

![MulMusic analysis screenshot 19](./images/manual/mulmusic/19.png)

We also find the variable `yJnBuUCkdg`:

![MulMusic analysis screenshot 20](./images/manual/mulmusic/20.png)

```powershell
$yJnBuUCkdg = ($zNfeqTmNMVjC -as [Type])::$RzBEsmYJFJvleMLWMRDc.$OYAFXSgXr(($zNfeqTmNMVjC -as [Type])::$RzBEsmYJFJvleMLWMRDc.$ftvmUrMVeGqhcbfY(($yFtahBVHR -as [Type])::$HpHDXHEbXHRsmLz(($zNfeqTmNMVjC -as [Type])::$RzBEsmYJFJvleMLWMRDc.$ftvmUrMVeGqhcbfY($kcMrSOkblJXfYSlRotOdB))));
```

This is important because it uses the byte array `kcMrSOkblJXfYSlRotOdB` that we found earlier. It converts that array into a string, Base64-decodes the string, and stores the resulting bytes in `yJnBuUCkdg`.

The last line brings these pieces together:

![MulMusic analysis screenshot 21](./images/manual/mulmusic/21.png)

It XORs the decoded payload in `yJnBuUCkdg` with the key in `ZohLcP`:

```powershell
$yJnBuUCkdg[$i] -bxor $ZohLcP[$j]
```

Let's apply that operation and extract the result.

## Stage 4: AMSI Bypass and an In-Memory .NET Assembly

After XOR decoding, the result is another `.ps1` file.

![MulMusic analysis screenshot 22](./images/manual/mulmusic/22.png)

![MulMusic analysis screenshot 23](./images/manual/mulmusic/23.png)

The script loads `WriteProcessMemory` from `kernel32.dll` to write to process memory. It also calls APIs such as `VirtualProtect` to change memory permissions and `GetCurrentProcess` to obtain a handle to the current process.

### The AMSI Bypass Attempt

The script also attempts to bypass AMSI.

![MulMusic analysis screenshot 24](./images/manual/mulmusic/24.png)

It locates the `AmsiScanBuffer` name inside the mapped `clr.dll` and overwrites that name with zeros. The intent is to interfere with the runtime's lookup of the AMSI scanning function before the next payload is loaded.

[Read more: AMSI Bypass Techniques](https://radiantsec.io/docs/redteam/bypass-amsi/).

### Extracting the Next Payload

Further down, variable `a` contains a Base64 blob that appears to be the next stage.

![MulMusic analysis screenshot 25](./images/manual/mulmusic/25.png)

At the end of the file, we find the code that handles it:

![MulMusic analysis screenshot 26](./images/manual/mulmusic/26.png)

First, it Base64-decodes `a`:

```powershell
$bytes = [System.Convert]::FromBase64String($a)
```

The decoded bytes begin with `MZ`, suggesting a Windows executable or DLL.

Next, it loads those bytes as a .NET assembly into the current PowerShell process:

```powershell
[Reflection.Assembly]$assembly=
    [System.AppDomain]::CurrentDomain.Load($bytes)
```

It then finds the assembly's entry point and invokes it:

```powershell
$entryPoint.Invoke($null, $args)
```

This runs the entry point without first writing the executable to disk. Let's extract the executable from the Base64 blob for analysis.

The AMSI bypass attempt comes first because the payload may be scanned during loading or execution. The script tries to interfere with scanning before executing the assembly in memory.

## Stage 5: Finding the C2 Server

After extracting the executable, we can inspect it in [Detect It Easy (DIE)](https://www.detectiteasy.com/download-for-windows) to learn more about it.

![MulMusic analysis screenshot 27](./images/manual/mulmusic/27.png)

As expected, it is a .NET executable. Let's open it in **dnSpy**, a free, open-source .NET debugger and assembly editor.

### A Note on .NET Decompilation

.NET binaries are generally easier to decompile than native C or C++ binaries because they retain intermediate language (IL) and metadata.

![MulMusic analysis screenshot 28](./images/manual/mulmusic/28.png)

The CLR runtime JIT-compiles that IL into native code when the program runs. Tools such as dnSpy and ILSpy read the IL and metadata and reconstruct readable C#. Names and structure often remain available unless the assembly has been obfuscated.

### Inspecting the Stealer Class

Back to the analysis: opening the executable in dnSpy reveals a class named `Stealer`. It contains several functions that explain the malware's activity.

![MulMusic analysis screenshot 29](./images/manual/mulmusic/29.png)

The sample behaves as an information stealer: it targets browser cookies and saved passwords and sends the collected information to the attacker's C2 server.

![MulMusic analysis screenshot 30](./images/manual/mulmusic/30.png)

The required flag format is `flag{c2_ip}`, so our goal is to recover the C2 IP address.

![MulMusic analysis screenshot 31](./images/manual/mulmusic/31.png)

We find a function named `SendDataToC2`. It takes the input `data`, converts it into UTF-8 bytes, and Base64-encodes it.

It also calls `Hwapiazdxb()`, which returns a hardcoded 32-byte AES key decoded from Base64. The randomly generated AES key is unused.

```csharp
public static byte[] Hwapiazdxb()
{
    byte[] array;
    using (Aes aes = Aes.Create())
    {
        aes.GenerateKey();
        array = Convert.FromBase64String("iVQmR3uTrEOKSm3NBzv6OAXoM6/5jwNoXrN9Mc4/3BE=");
    }
    return array;
}
```

`SendDataToC2()` uses this key and its first 16 bytes as the IV to decrypt the embedded C2 URL. It then sends the Base64-encoded collected data to that endpoint.

Recovered C2:

```text
hxxps://133[.]107[.]28[.]163/uploadData
```

### Final Flag

```text
flag{133.107.28.163}
```

## Reference

[Microsoft Security Blog — Lumma Stealer: Breaking down the delivery techniques and capabilities of a prolific infostealer](https://www.microsoft.com/en-us/security/blog/2025/05/21/lumma-stealer-breaking-down-the-delivery-techniques-and-capabilities-of-a-prolific-infostealer/) (May 21, 2025).
