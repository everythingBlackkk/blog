# cyshield 2025 - Android Part ||

## At the start when you open the App you will see a message saying the Master Key is wrong

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or-or/01.png" alt=""><figcaption></figcaption></figure>

So let us open the APK and try to analyze it and understand.

## APK Code Analysis

#### AndroidManifest.xml Analysis

At the start there is nothing interesting except the `MainActivity` class.

```xml
<activity  
		android:name="com.ctf.vaultraider.MainActivity"  
		android:exported="true">  
		<intent-filter>  
			<action android:name="android.intent.action.MAIN"/>  
			<category android:name="android.intent.category.LAUNCHER"/>  
		</intent-filter>  
</activity>  

```

Let us read the class code and understand its purpose and what it does.

#### Main Class Analysis

From the code analysis we find it needs 3 parts: part A, part B, part C. Each part is obtained by a different process, and we need to know how to get each part.

At the start of the code we find two variables:

```java
    private static final String KEY_ALIAS = "com.ctf.vaultraider.key";  
    private static final String TAG = "VAULT_DEBUG";
```

It is not yet clear what they are used for.

Then we find the `getPartB` method:

```java
    private native String getPartB(String str);  
  
    static {  
        System.loadLibrary("vaultraider");  
    }
```

This loads a library named `vaultraider`. This is a native library usually written in C/C++ and is used when some things are easier or better to write in those languages than in Java. So the app will call this library when it runs.

Below in the code we find some very important lines that explain a lot: it gets the device IMEI which is a unique number for a device with a SIM.

```java
String imei = getIMEI();
String partA = HashUtils.sha256(imei);
```

It uses `getIMEI()`. If we look at that method we find:

```java
private String getIMEI() {  
TelephonyManager telephonyManager = (TelephonyManager) getSystemService("phone");  
if (checkSelfPermission("android.permission.READ_PHONE_STATE") == 0) {  
	return telephonyManager.getImei();  
}  
return "000000000000000";  
}
```

`getIMEI` tries to get the device IMEI if it has permission to do so. It depends on the real phone IMEI value, and if it cannot get it it uses the default value `000000000000000` when the app has no permission.

Then it stores the IMEI in a variable and gets its SHA-256 hash and stores it as `partA` — this is an important point.

```java
String androidId = Settings.Secure.getString(getContentResolver(),"android_id"); String partB = getPartB(androidId);  
Log.d(TAG, "android id: " + androidId);
```

Next it gets the Android ID and passes it to `getPartB`, which is implemented in the native library as shown above.

It then logs this with `android id:` and the `TAG` value `VAULT_DEBUG`. This makes it easy to find the Android ID if we run a command to search the logcat:

```shell
adb logcat | grep --line-buffered "android id:"
```

We will find this result:

```bash
11-09 15:24:04.838  2131  2131 D VAULT_DEBUG: android id: 3f11737cfbaee31b
```

There is also an important part:

```java
String disguisedBase64 = getString(R.string.app_name);  
String partC = XorUtils.decode(Base64.decode(disguisedBase64, 0), "ctfkey");
```

In the first line it takes the **Base64 encoded value stored in the resource with id `app_name`** from `res/values/strings.xml` and stores it in `disguisedBase64`.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or-or/02.png" alt=""><figcaption></figcaption></figure>

In the second line it decodes that value and then XORs it with the key `"ctfkey"`, and stores the result in `partC`.

So `partC` can be obtained by this code:

```python
import base64

disguised = "MEclOVYt"
decoded = base64.b64decode(disguised)    # -> b'0G%9V-'
key = b"ctfkey"
partC = bytes([decoded[i] ^ key[i % len(key)] for i in range(len(decoded))]).decode()
print("partC =", partC)   # prints: partC = S3CR3T

```

And `partC` will be `S3CR3T`.

Then we find this part:

```java
String concatenatedParts = partA + partC + partB;  
String masterKey = HashUtils.sha256(concatenatedParts);  
getCorrectMasterKeyFromKeystore();  
Intent intent = getIntent();  
String receivedMasterKey = intent.getStringExtra("masterKey");  
if (receivedMasterKey != null && receivedMasterKey.equals(masterKey)) {  
	dF(masterKey);  
} else {  
	Toast.makeText(this, "Incorrect master key!", 1).show();  
}
```

1. It concatenates the 3 parts into `concatenatedParts`.
2. It calculates the SHA-256 hash of `concatenatedParts` and stores it in `masterKey`.
3. `getCorrectMasterKeyFromKeystore();` — it calls a function that is supposed to get the correct key from the keystore.
4. `String receivedMasterKey = intent.getStringExtra("masterKey");` — it gets the extra string sent with the Intent named `"masterKey"` and stores it in `receivedMasterKey`.
5. `if (receivedMasterKey != null && receivedMasterKey.equals(masterKey))` — this check does two things:
   * First: it ensures there is a value (not null).
   * Second: it ensures the received value equals `masterKey` (the value computed in the app).

If they are equal it calls `dF(masterKey)` and passes the `masterKey`. If they are not equal it shows `Incorrect master key!` like we saw at the start.

If we analyze `dF`:

```java
  
private void dF(String mk) {  
String flag = "cyctf{" + gf(mk) + "}";  
Toast.makeText(this, "Congratulations! You found the flag: " + flag, 1).show();  
Log.d(TAG, "Flag: " + flag);  
}
```

`dF` takes `mk` (the masterKey) and runs the function `gf` on it:

```java
String flag = "cyctf{" + gf(mk) + "}";
```

We now need to analyze `gf` to understand what it does with the masterKey.

```java
private String gf(String k) {  
String str = "fghfagds76_" + System.nanoTime();  
byte[] z = {52, 101, -5, 68, -98, 126, 74, -47, 99, 106, 101, 17, -96, -62, 57, 0, -66, 45, kotlin.io.encoding.Base64.padSymbol, -44, -84, 46, 106, 10, -43, -108, -95, -30, 59, -73, -50, -118, -100};  
StringBuilder prefix = new StringBuilder();  
for (byte b : z) {  
	prefix.append(String.format("%02x", Byte.valueOf(b)));  
}  
char[] j = k.toCharArray();  
char[] s = new char[8];  
for (int i = 0; i < 8; i++) {  
	s[i] = j[7 - i];  
}  
StringBuilder sb = new StringBuilder();  
for (char c : s) {  
	sb.append(c);  
}  
bl();  
return prefix.toString() + "_" + sb.toString() + "_solved";  
}
```

Let us explain this function in detail because it is important.

At the start we see `String str = "fghfagds76_" + System.nanoTime();` which is meaningless noise, just to confuse people.

```java
StringBuilder prefix = new StringBuilder();
for (byte b : z) {
    prefix.append(String.format("%02x", Byte.valueOf(b)));
}
```

* This takes every byte from `z` and converts it to hexadecimal (like `4e`, `ff`, ...).
* So it converts them to a long hex string.
* It stores that hex string in `prefix`.

The result is a very long hex string representing the bytes above.

```java
char[] j = k.toCharArray();
char[] s = new char[8];
for (int i = 0; i < 8; i++) {
    s[i] = j[7 - i];
}
```

* This takes the first 8 characters from the text `k` (the MasterKey).
* It reverses their order and stores them in `s`.

```java
StringBuilder sb = new StringBuilder();
for (char c : s) {
    sb.append(c);
}
bl();

return prefix.toString() + "_" + sb.toString() + "_solved";
```

* It turns the `s` array into a string (it joins the reversed characters).
* It calls the function `bl`.
* The final result is built from 3 parts:
  1. The hex string `prefix`
  2. `_`
  3. The `sb` string (the reversed first 8 chars of `k`)
  4. and then `_solved` at the end.

```java
private void bl() {  
	String[] part10 = {"X1", "Z9", "dead", "beef", "nothing"};  
	int[] temp = new int[5];  
	for (int i = 0; i < temp.length; i++) {  
		temp[i] = part10[i].hashCode() % 7;  
	}  
}
```

* This gets the hash code of each string in `part10` using Java's built-in `hashCode()`.
* `hashCode()` converts the text into an int that depends on the characters.
* Then it takes the remainder modulo 7 (`% 7`) to get a number between 0 and 6.
* It stores the results in the `temp` array.
* This function is just noise and does not affect the final flag result.

### partB analysis

#### Where are we now?

We reached a good understanding of the flag structure: it is made of 3 parts — `partA` which is the IMEI hash, `partC` we obtained (value `S3CR3T`), and `partB` which depends on the Android ID and is processed by the native library `vaultraider`.

We can now analyze that library with Ghidra and it will show this code:

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or-or/03.png" alt=""><figcaption></figcaption></figure>

```c

undefined8
Java_com_ctf_vaultraider_MainActivity_getPartB
(_JNIEnv *param_1,undefined8 param_2,_jstring *param_3)

{
long lVar1;
char *pcVar2;
ulong uVar3;
undefined8 local_50;
basic_string<> abStack_48 [24];
basic_string abStack_30 [24];
long local_18;

lVar1 = tpidr_el0;
local_18 = *(long *)(lVar1 + 0x28);
if (param_3 == (_jstring *)0x0) {
local_50 = _JNIEnv::NewStringUTF(param_1,"Error: Android ID is null.");
}
else {
pcVar2 = (char *)_JNIEnv::GetStringUTFChars(param_1,param_3,(uchar *)0x0);
if (pcVar2 == (char *)0x0) {
local_50 = _JNIEnv::NewStringUTF(param_1,"Error: Android ID conversion failed.");
}
else {
FUN_00167384(abStack_30,pcVar2);
		/* try { // try from 00167cc0 to 00167cd7 has its CatchHandler @ 00167d18 */
_JNIEnv::ReleaseStringUTFChars(param_1,param_3,pcVar2);
sha256(param_1,abStack_30);
uVar3 = FUN_00167e6c(abStack_48);
if ((uVar3 & 1) == 0) {
pcVar2 = (char *)FUN_00167618(abStack_48);
local_50 = _JNIEnv::NewStringUTF(param_1,pcVar2);
}
else {
		/* try { // try from 00167cf0 to 00167d5b has its CatchHandler @ 00167d28 */
local_50 = _JNIEnv::NewStringUTF(param_1,"Error: Hash calculation failed.");
}
std::__ndk1::basic_string<>::~basic_string(abStack_48);
std::__ndk1::basic_string<>::~basic_string((basic_string<> *)abStack_30);
}
}
lVar1 = tpidr_el0;
lVar1 = *(long *)(lVar1 + 0x28) - local_18;
if (lVar1 == 0) {
return local_50;
}
		/* WARNING: Subroutine does not return */
__stack_chk_fail(lVar1);
}


```

This means if we pass the Android ID to this code it will do the following:

* The code takes the **Android ID** as input.
* If Android ID is `null` → it returns `"Error: Android ID is null."`
* It converts the Android ID to a C string, does internal processing, and computes **SHA-256** of it.
* If the calculation succeeds → it returns the resulting string (the hash).
* If it fails → it returns `"Error: Hash calculation failed."`

## Extracting the Flag

Now we have Part A which is the IMEI hash. We will assume the app used the default IMEI `000000000000000`. The hash of that value is:

```
14bdcd6fd64180af5e7791df91b6af8e9a3e7bc844997eb8c29252706df97ca5
```

Part B is the Android ID hash which we can get from a command or by monitoring logcat as shown above:

```
$ adb shell settings get secure android_id

3f11737cfbaee31b
```

Its hash value is:

```
7a39ebe593beec482808a20d26350752f3f60a6f122a00aaa69b341dd5dbddab
```

Part C we obtained and it is `S3CR3T`.

As seen in the Java code, the master key is the hash of the concatenation of the three parts:

```
concatenated = partA + partC + partB
```

So:

```
14bdcd6fd64180af5e7791df91b6af8e9a3e7bc844997eb8c29252706df97ca5S3CR3T7a39ebe593beec482808a20d26350752f3f60a6f122a00aaa69b341dd5dbddab
```

The SHA-256 of that entire string is:

```
9ab635ee6cd56f6be6987db063a9a74716c2277385c32102fa93644334a23832
```

This is the `masterKey` the app expects. We can now send it and see:

```
adb shell am start -n com.ctf.vaultraider/.MainActivity --es masterKey "ce923792e16115d0bc2c838b17f01beb109f2f39d48657d11fb6a1c8123f162e"

```

And in the end we obtained the Flag in the format described earlier while analyzing the Java code.

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or-or/04.png" alt=""><figcaption></figcaption></figure>

<figure><img src="./images/articles/ctf-cyshield-2025-android-part-or-or/05.png" alt=""><figcaption></figcaption></figure>

```
cyctf{3465fb449e7e4ad1636a6511a0c23900be2d3dd4ac2e6a0ad594a1e23bb7ce8a9c_ee536ba9_solved}
```
