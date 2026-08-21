# cyshield 2025 - Android Part |

## Analysis of the AndroidManifest

The first thing you must do when looking for anything about the app is to check the `AndroidManifest.xml` of the APK because it contains everything about the app. This will be our starting point. We will not find many things except `MainActivity` which is the really important one.

```xml
	<activity  
		android:name="com.ctf.gtm.MainActivity"  
		android:exported="true">  
		<intent-filter>  
			<action android:name="android.intent.action.MAIN"/>  
			<category android:name="android.intent.category.LAUNCHER"/>  
		</intent-filter>  
	</activity>
```

Let us look at the code of the `MainActivity` class.

## Analysis of the MainActivity Java Code

At the beginning we notice a variable named `encrypted` of type `String` that is encoded with Base64.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or/01.png" alt=""><figcaption></figcaption></figure>

We also find a method named `sendFlag`

```java
    public native void sendFlag(Context context);  
  
    static {  
        System.loadLibrary("gtm");  
    }
```

This is a native method and it is not written in Java. It is written in a language like C or C++ in a library called `libgtm.so`. This means when the app starts, it loads the `libgtm.so` library which contains a function:

```
Java_com_ctf_gtm_MainActivity_sendFlag
```

This will be responsible for **generating or sending the flag** after a certain check is satisfied.

#### onCreate method

The `onCreate()` runs when you open the screen for the first time.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or/02.png" alt=""><figcaption></figcaption></figure>

There is nothing very important for our CTF in it. Just normal functions so when the user writes their name and presses the button, the app can read the value and show a result.

#### The check that allows sending the Flag

If we go down the code a bit we find the main check that, if satisfied, will send the FLAG in a certain way we do not yet know.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or/03.png" alt=""><figcaption></figcaption></figure>

At the start of the code we find that when the user presses the button:

* A log is recorded to logcat with the name `"CTF"`.
* It reads the text the user wrote from `nameInput` and stores it in a variable called `username`.

```java
String secretKey = getDecryptionKey();  
String decrypted = decrypt("1vhL9yh+Q/6sXJKHJ8mHB2p0K3HZgpBY9drRMAhDmCk=", secretKey);
```

We find that it uses the `getDecryptionKey` method to get the decryption key and saves it in the variable `secretKey`.

And this is the method:

```java
private String getDecryptionKey() {  
	char[] part1 = {'W', 'h', '@', 'T'};  
	String g = "Thi3f";  
	return new String(part1) + "_A_" + g + "!!!!";  
}
```

If we try to get the key to decrypt, the key will be:

```
Wh@T_A_Thi3f!!!!
```

This key has length 16 bytes, suitable for AES-128 encryption.

We also have a `decrypt` method:

```java
    private String decrypt(String base64Cipher, String key) throws Exception {  
        byte[] decoded = Base64.decode(base64Cipher, 0);  
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");  
        SecretKeySpec skeySpec = new   SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "AES");  
        cipher.init(2, skeySpec);  
        byte[] decrypted = cipher.doFinal(decoded);  
        return new String(decrypted, StandardCharsets.UTF_8);  
    }  
}
```

It decrypts a **text encrypted with AES** (using ECB mode and PKCS5 padding) and returns it as readable plain text.

#### The inputs (what the method receives):

1. The **`base64Cipher`** → the encrypted text but encoded in **Base64**. This is what we found at the start of the code.
2. The **`key`** → the secret key which we already obtained.

#### What the method will do:

* It decodes Base64 to get the real encrypted data.
* It sets up the algorithm **AES/ECB/PKCS5Padding**.
* It uses the given key to decrypt.

In the end it returns the **original text (plaintext)** after decrypting the Base64 encoded ciphertext.

So in short we have two important functions: `getDecryptionKey` which is responsible for getting the key, and `decrypt` which we use to decrypt the encrypted text using the key we obtained. From this we can get the `username` which is one of the conditions that the code checks before calling `getFlag` to get the Flag in a certain way we will learn later.

Now we can get the `username` using a simple Python code like this:

```python

from base64 import b64decode
from Crypto.Cipher import AES

  
def decrypt(base64_cipher, key):
decoded = b64decode(base64_cipher)
cipher = AES.new(key.encode('utf-8'), AES.MODE_ECB)
decrypted = cipher.decrypt(decoded)
pad_len = decrypted[-1]
decrypted = decrypted[:-pad_len]
return decrypted.decode('utf-8')

encrypted = "1vhL9yh+Q/6sXJKHJ8mHB2p0K3HZgpBY9drRMAhDmCk="
key = "Wh@T_A_Thi3f!!!!"
username = decrypt(encrypted, key)

print("Username:", username)

```

And the result after decryption will be:

```
Username: Tr3V0R_not_Micheal
```

Let us open the Android app and try to write the username we found.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or/04.png" alt=""><figcaption></figcaption></figure>

We will find that it shows the message `Flag Sent` but!! To know how and where it sends the Flag, we need to analyze the `sendFlag` method.

```java
    public native void sendFlag(Context context);  
  
    static {  
        System.loadLibrary("gtm");  
    }
```

From the code, we need to analyze the `libgtm.so` library. Using:

```
apktool d app.apk -o apk_files
```

We use the `apktool` tool. This tool is used to decompile APK files of Android apps.

We will find this library at:

```
apk_files/lib/arm64-v8a/libgtm.so
```

To analyze it, we need to use a tool like Ghidra which lets us analyze this library and see how the Flag is sent.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or/05.png" alt=""><figcaption></figcaption></figure>

We will indeed find a function named:

```
Java_com_ctf_gtm_MainActivity_sendFlag
```

### Analysis of the important parts of the code

There is a fixed part of the flag shown clearly as plain text:

```c
FUN_00166bac(auStack_180,"cyctf{");
FUN_00166bac(auStack_180,"aX9tG4Lk");
builtin_strncpy(local_40,"aX9tG4LkZp72MvBQeC",0x12);
```

And it also adds **random characters** from the array `local_74`.

```c
for (local_2f4 = 0; local_2f4 < 8; local_2f4++) {
   iVar2 = rand();
   FUN_00166bf4(auStack_180, local_74[iVar2 % 0x24 + 4]);
}
FUN_00166bf4(auStack_180,0x7d); // '}'
```

* Here it adds 8 **random** letters from a set stored in `local_74`.
* Then it closes the flag with `}`.

#### Sending the flag via Intent

```c
p_Var4 = _JNIEnv::FindClass(param_1,"android/content/Intent");
uVar5 = _JNIEnv::GetMethodID(param_1,p_Var4,"<init>","(Ljava/lang/String;)V");
uVar6 = _JNIEnv::NewStringUTF(param_1,"com.ctf.FLAG_ACTION");
p_Var7 = _JNIEnv::NewObject(param_1,p_Var4,uVar5,uVar6);

uVar5 = _JNIEnv::GetMethodID(param_1,p_Var4,"putExtra",
                              "(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;");
uVar6 = _JNIEnv::NewStringUTF(param_1,"flag");
pcVar8 = FUN_00166e34(abStack_2c0);
uVar9 = _JNIEnv::NewStringUTF(param_1,pcVar8);
_JNIEnv::CallObjectMethod(param_1,p_Var7,uVar5,uVar6,uVar9);

uVar5 = _JNIEnv::GetMethodID(param_1,p_Var4,"sendBroadcast","(Landroid/content/Intent;)V");
_JNIEnv::CallVoidMethod(param_1,param_3,uVar5,p_Var7);
```

* It creates a new **Intent** with the action `"com.ctf.FLAG_ACTION"`.
* It adds an **Extra** named `"flag"` and puts the generated flag inside it.
* It calls **Broadcast**, and
* any app or tool like Frida can capture it.

#### In short

1. The **flag is partially fixed**: `"cyctf{aX9tG4LkZp72MvBQeC...}"`.
2. The remaining 8 random characters are generated using `rand()` and `srand(time(NULL))`.

The `sendFlag` function in native code aims to:\
3\. Generate the **flag** as a string.\
4\. Send it via an **Android Broadcast Intent** with the action `"com.ctf.FLAG_ACTION"`.

So the CTF here depends on knowing the flag that the code generates, and we can "grab" or "read" it using Android debugging or tools like **Frida**.

Now we will use a Frida script (in JavaScript) whose job is to **intercept** (`hook`) the calls to `sendBroadcast(Intent)` on Android to print the content of the Intent and show any data named `"flag"` or any other extras.

```js
Java.perform(function() {
try {
var CW = Java.use('android.content.ContextWrapper');

CW.sendBroadcast.overload('android.content.Intent').implementation = function(intent) {

try {

var act = intent.getAction();

console.log("[*] sendBroadcast called. action=" + act);

  

var extras = intent.getExtras();

if (extras !== null) {

var keyset = extras.keySet().toArray();

for (var i = 0; i < keyset.length; i++) {

var k = keyset[i].toString();

console.log(" extra: " + k + " = " + extras.get(k));

}

} else {

console.log(" no extras");

}

} catch(e) {

console.log("[-] error reading intent: " + e);

}

return this.sendBroadcast(intent);

};

console.log("[*] Hooked ContextWrapper.sendBroadcast");

} catch (err) {

console.log("[-] Hook failed: " + err);

}

});
```

In this JavaScript code:

* We **hook `ContextWrapper.sendBroadcast`**: every time the app calls `sendBroadcast(intent)`, our code runs first.
* It gets the Intent `Action` and prints it.
* It searches for any `Extras` inside the Intent and prints everything inside.
* If there are no Extras, it prints `no extras`.
* After printing the information, it lets the original `sendBroadcast` run so the app sends the Intent as normal.

This code will run and we can get the Flag because the JNI code creates an `Intent` with the action `com.ctf.FLAG_ACTION`.

```c
_JNIEnv::NewStringUTF(param_1,"com.ctf.FLAG_ACTION");
_JNIEnv::NewObject(... , "<init>","(Ljava/lang/String;)V", /* action string */);

```

In short: the script above lists all extra data sent with the broadcast so we can see all extras easily.

Now we can run Frida with our script:

```shell
 frida -H 127.0.0.1:27042 -p 2829 -l grab_flag.js
```

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or/06.png" alt=""><figcaption></figcaption></figure>

And we indeed obtained the Flag:

```
cyctf{aX9tG4LkZp72MvBQeCW8M3T3R3}
```
