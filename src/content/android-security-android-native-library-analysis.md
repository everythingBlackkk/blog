# Android Native Library Analysis

<figure><img src="./images/articles/android-security-android-native-library-analysis/01.png" alt=""><figcaption></figcaption></figure>

#### What Are Native Libraries and Why Do We Use Them?

Native libraries are usually built using **C or C++** code. These languages are called “native” because their code runs at a level closer to the hardware compared to higher-level languages such as Python or Java.

The main reason developers resort to native code in Android is **performance**.\
If a part of the application needs to run extremely fast, developers may write that part in C or C++ to achieve higher execution speed.

***

#### The Role of JNI and NDK

To connect native code with standard Java or Kotlin code, two important components are used: **JNI (Java Native Interface)** and **NDK (Native Development Kit)**.

1. **JNI:** An interface that allows writing Java methods using C or C++.
2. **NDK:** A toolkit specifically designed for developing native code.

Together, these two components allow the developer to connect Java/Kotlin code with native libraries.\
That means an APK written in Java or Kotlin can call native functions when higher performance or certain system-level functionality is required.\
The app then receives the results from these native functions via JNI/NDK.

<figure><img src="./images/articles/android-security-android-native-library-analysis/02.png" alt=""><figcaption></figcaption></figure>

***

#### How Native Libraries Are Loaded in Android

Different operating systems use different executable formats:\
Windows uses `.exe`, Linux uses ELF, and Android (which is based on Linux) uses **Shared Objects (`.so`)**.

The `.so` format supports **dynamic linking**, which means the library is loaded and invoked during runtime.

Typically, these files are named with the prefix `lib` and the `.so` suffix, for example: `libName.so`.

They are loaded into the app through Java calls such as:

```java
System.loadLibrary
System.load
```

When you decompile an APK, you’ll find the imported libraries inside a specific folder named **`lib`**.

***

#### Architecture Dependency

Native code depends heavily on the **processor architecture**.\
Code compiled for one architecture (e.g., ARM) will differ from code compiled for another (e.g., x86).\
This concept was explained in another article.

Let’s look at the **Lab example** to understand this better.

***

#### Example Class

```java
public class Hardcode2Activity extends AppCompatActivity {  
    private DivaJni djni;  
  
    @Override   
    protected void onCreate(Bundle savedInstanceState) {  
        super.onCreate(savedInstanceState);  
        setContentView(R.layout.activity_hardcode2);  
        this.djni = new DivaJni();  
    }  
  
    public void access(View view) {  
        EditText hckey = (EditText) findViewById(R.id.hc2Key);  
        if (this.djni.access(hckey.getText().toString()) != 0) {  
            Toast.makeText(this, "Access granted! See you on the other side :)", 0).show();  
        } else {  
            Toast.makeText(this, "Access denied! See you in hell :D", 0).show();  
        }  
    }  
}
```

* Here we have a variable `djni` of type `DivaJni`.
* The class `DivaJni` is a **Java class linked with native (C/C++) code** via **JNI** — we’ll see that next.

**Step 1 – onCreate():**\
It creates an object of `DivaJni` and stores it in `djni`.\
At this point, the application is ready to interact with C/C++ native code through the `DivaJni` class.

**Step 2 – access() method:**

* It retrieves the text entered by the user in the `EditText` (named `hc2Key`).
* Then it sends that text to the native method `djni.access(...)`.

And this is where the **JNI (Java Native Interface)** part comes into play.

***

#### The `DivaJni` Class

`DivaJni` is a Java class that interacts with **native code** written in **C or C++**.\
Here’s the class code:

```java
package jakhar.aseem.diva;  
  
public class DivaJni {  
    private static final String soName = "divajni";  
  
    public native int access(String str);  
    public native int initiateLaunchSequence(String str);  
  
    static {  
        System.loadLibrary(soName);  
    }  
}
```

This Java class defines the **JNI interface**, meaning it allows Java to communicate with **native code** found in the `.so` library.

***

**1. Defining the Native Library Name:**

```java
private static final String soName = "divajni";
```

This is the name of the native library (`divajni.so`) that Java will be linked to.

**2. Native Method `access`:**

```java
public native int access(String str);
```

A native method definition named `access` that takes a string and returns an integer.\
The implementation exists in the native library, not in this class.

**3. Native Method `initiateLaunchSequence`:**

```java
public native int initiateLaunchSequence(String str);
```

Another native method with the same structure as above.

**4. Loading the Native Library:**

```java
static {
    System.loadLibrary(soName);
}
```

This loads the native library (`divajni.so`) so that the native methods can be executed.

💡 **In short:**\
This class acts as a **bridge between Java and native code**.\
All methods declared with `native` are implemented and executed in the native library, not in Java.

***

#### Analyzing the `.so` File

Since native code is compiled (unlike Java bytecode, which is readable), we need specialized tools to analyze it.\
These tools work with formats like DEX and native binaries.\
Some of the most popular tools are **Ghidra** and **IDA**.

***

**General Analysis Steps**

1. **Decompilation:**\
   First, decompile the APK using `apktool`:

   ```bash
   apktool d diva.apk

   ```

<figure><img src="./images/articles/android-security-android-native-library-analysis/03.png" alt=""><figcaption></figcaption></figure>

2. Locate the **shared object file** (`.so`) inside the `lib` folder.

```
.
├── arm64-v8a
│   └── libdivajni.so
├── armeabi
│   └── libdivajni.so
├── armeabi-v7a
│   └── libdivajni.so
├── mips
│   └── libdivajni.so
├── mips64
│   └── libdivajni.so
├── x86
│   └── libdivajni.so
└── x86_64
    └── libdivajni.so

8 directories, 7 files

```

2. **Load it in a Disassembler**, such as Ghidra.
3. When opened, you’ll see low-level **Assembly code**,\
   but Ghidra also provides a **decompiler view** that shows C-like pseudocode,\
   which makes understanding the logic much easier than raw Assembly.

When viewing native methods in the disassembler, they often appear with a prefix like `Java_...`, indicating they are **JNI functions**.

***

#### Functions Found in the `.so` File

<figure><img src="./images/articles/android-security-android-native-library-analysis/04.png" alt=""><figcaption></figcaption></figure>

We can see three functions, the first being `JNI_OnLoad`.\
This function is executed **when the JNI library is loaded**.\
When the system loads a JNI library, it looks for this function:

`JNI_OnLoad`

If found, it’s called **immediately upon loading**.\
Its main purpose is to perform **initialization** and **link JNI with the JVM**.

Next, we find two more functions:

* `Java_jakhar_aseem_diva_DivaJni_access`
* `Java_jakhar_aseem_diva_DivaJni_initiateLaunchSequence`

From their names, the most relevant one for us is **`Java_jakhar_aseem_diva_DivaJni_access`**,\
since the `access()` method from the Java class calls it to compare the user’s input with a hidden secret value.

***

#### Analyzing `Java_jakhar_aseem_diva_DivaJni_access`

Here’s the decompiled function:

```c
bool Java_jakhar_aseem_diva_DivaJni_access(long *param_1, undefined8 param_2, undefined8 param_3)
{
  char *pcVar1;
  long lVar2;
  char *pcVar3;
  undefined1 uVar4;
  byte bVar5;
  
  bVar5 = 0;
  uVar4 = 1;
  pcVar1 = (char *)(**(code **)(*param_1 + 0x548))(param_1, param_3, 0);
  lVar2 = 0xb;
  pcVar3 = "olsdfgad;lh";
  do {
    if (lVar2 == 0) {
      return (bool)uVar4;
    }
    lVar2 = lVar2 + -1;
    uVar4 = *pcVar3 == *pcVar1;
    pcVar3 = pcVar3 + (ulong)bVar5 * -2 + 1;
    pcVar1 = pcVar1 + (ulong)bVar5 * -2 + 1;
  } while ((bool)uVar4);
  return (bool)uVar4;
}
```

We can see that the function compares the **user input** with a **hardcoded secret string**:

```c
pcVar3 = "olsdfgad;lh";
```

It performs a **character-by-character comparison** between the input (`pcVar1`)\
and the secret string `"olsdfgad;lh"`.\
If all characters match → it returns `true`.\
If any character is incorrect → it returns `false`.

When you enter this secret string into the app, it grants access — confirming the solution to the lab.

**Result:**\
The secret key found in the `.so` file is **"olsdfgad;lh"**, and using it correctly unlocks the challenge.

<figure><img src="./images/articles/android-security-android-native-library-analysis/05.png" alt=""><figcaption></figcaption></figure>

***

### Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

#### Remember My name : everythingBlackkk 

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
