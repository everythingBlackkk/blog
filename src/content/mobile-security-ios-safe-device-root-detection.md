# iOS Bypass Root Detection in safe_device 1.3.10

<p>In this article, we will explore how the following package works and how i bypass 10 layer of this package:</p><p><a href="https://pub.dev/packages/safe_device">safe_device | Flutter package</a></p><figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/01.png" /></figure><p>The app uses a Flutter plugin called <strong>safe_device</strong> to check if the iPhone is <strong>jailbroken</strong>. Our goal is to make that check always return &quot;no, this device is NOT jailbroken.&quot;</p><p>Our explanation will be based on <strong>safe_device version 1.3.10</strong>, the latest version at the time of writing.</p><p>Enjoy!</p>

## Let’s Go

<p>Let’s understand the IOS Flutter App Struc.</p><pre><code>ls -la /Users/mac/Desktop/apps/App-file/ios/Payload/Runner.app/</code></pre><p>What you will see :</p><pre><code>Runner                  ← the main app binary
Frameworks/             ← folder containing shared libraries
Info.plist              ← app configuration
Assets.car              ← images/icons</code></pre><p>On iOS, every app is a folder (called a “bundle”) ending in .app. The Frameworks/ subfolder contains <strong>shared libraries</strong> (.framework folders) that the app uses , like plugins.</p>

## Identify the Detection Framework

<pre><code>ls -la Runner.app/Frameworks/</code></pre><p>What you will see :</p><pre><code>App.framework/                    ← Flutter/Dart compiled code
Flutter.framework/                ← the Flutter engine itself
safe_device.framework/            ← THE JAILBREAK DETECTION</code></pre><p>We immediately spotted safe_device.framework — this is the Flutter plugin that does jailbreak detection. Everything we need to bypass is inside this one folder.</p>

## Check the File Types

<pre><code>file safe_device.framework/safe_device</code></pre><p><strong>What we saw:</strong></p><pre><code>Mach-O 64-bit dynamically linked shared library arm64</code></pre><p>This tells us the binary is an iOS shared library compiled for arm64. Frida can hook into it at runtime.</p>

## Find the Class Names (nm)

<p>nm = &quot;name list&quot; , lists all named symbols (functions, classes) in a binary.</p><p>-g = only show global (exported) symbols.</p><p>-U = don&#39;t show undefined ones.</p><p><strong>Command:</strong></p><pre><code>nm -gU safe_device.framework/safe_device</code></pre><figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/02.png" /></figure><p>important thing from result is :</p><pre><code>_OBJC_CLASS_$_SafeDevicePlugin
_OBJC_CLASS_$_SafeDeviceJailbreakDetection &lt;---- JailbreakDetection Logic
_OBJC_CLASS_$_SafeDeviceConfig</code></pre><p>Note : <strong><em>_OBJC_CLASS_ means it’s Class Called “</em></strong>SafeDeviceJailbreakDetection<strong><em>”</em></strong></p><p>Let’s Extacrt the methods inside the <strong><em>“</em></strong>SafeDeviceJailbreakDetection<strong><em>” Class</em></strong></p><pre><code>otool -ov safe_device | sed -n &#39;/SafeDeviceJailbreakDetection/,/^[a-zA-Z0-9]/p&#39;</code></pre><figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/03.png" /></figure><blockquote><em>otool = a macOS tool that prints the internal structure of Mach-O binaries. </em><em>-ov = print Objective-C class definitions (classes, methods, their names).</em></blockquote><p><strong>What we found — the detection methods:</strong></p><pre><code>SafeDeviceJailbreakDetection:
    isJailbroken                    ← the MAIN check (combines everything)
    hasJailbreakPaths               ← checks if jailbreak files exist
    canOpenJailbreakSchemes         ← checks if cydia:// etc. can open
    canViolateSandbox               ← tries writing outside the sandbox
    hasJailbreakEnvironmentVariables ← checks for DYLD_INSERT_LIBRARIES etc.
    hasJailbreakProcesses           ← checks for running jailbreak daemons
    hasSuspiciousSymlinks           ← checks for jailbreak-created symlinks
    jailbreakPaths                  ← the list of paths it checks
    jailbreakSchemes                ← the URL schemes it checks</code></pre><p>and if we run :</p><pre><code>strings safe_device | grep -i &quot;cydia\|jailbreak\|root\|apt\|bash\|substrate&quot;</code></pre><p>it’s return <strong>the jailbreak indicators :</strong></p><ol><li><strong>File paths it checks:</strong></li></ol><pre><code>/Applications/Cydia.app           
/Applications/Sileo.app          
/Applications/Zebra.app       
/bin/bash                         
/usr/sbin/sshd                   
/usr/sbin/frida-server          
/Library/MobileSubstrate/...  
/private/var/lib/apt              
/var/lib/cydia                  
/etc/apt                       </code></pre><p>2. <strong>URL schemes it checks:</strong></p><pre><code>cydia://               
sileo://                     
zebra://                      
filza://        
activator://                        </code></pre><p><strong>Why this matters:</strong> This tells us EXACTLY what the detection looks for. On a jailbroken device, these files/apps exist and the URL schemes work. Our Frida script will make the checks lie and say “none of these exist.</p>

## Enumerate Methods at Runtime (frida)

<pre><code>frida -U -f com.deviceintegrity.rootCheckerApp.Q967XZWQSK</code></pre><p>Then in the Frida console:</p><pre><code>ObjC.classes.SafeDeviceJailbreakDetection.$ownMethods</code></pre><blockquote><em>$ownMethods is a Frida feature that lists every method on an Objective-C class, with </em><em>+ (class method) or </em><em>- (instance method) prefix.</em></blockquote><ul><li>( + ) Means “Class Method” =&gt; it’s need object from Class First</li><li>( - ) Meand “<strong>Instance Method</strong>.” =&gt; Call it from Class Direct not need To Create object From Class</li></ul><p><strong>What we found:</strong></p><pre><code>+ canAccessPath:
+ canOpenJailbreakSchemes
+ canViolateSandbox
+ hasJailbreakEnvironmentVariables
+ hasJailbreakPaths
+ hasJailbreakProcesses
+ hasSuspiciousSymlinks
+ isJailbroken</code></pre><figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/04.png" /></figure><p><strong>Why this was important :</strong></p><ul><li>In Objective-C, + methods are called on the <strong>class itself</strong> (like static in Java)</li><li>- methods are called on an <strong>instance</strong> (an object)</li><li>In Frida, you hook them differently: &quot;+ isJailbroken&quot; vs &quot;- isJailbroken&quot;</li><li>Our first script used &quot;- isJailbroken&quot; → <strong>method not found!</strong></li><li>Fixing to &quot;+ isJailbroken&quot; → <strong>hooked successfully!</strong></li></ul>

## Write the Frida Bypass Script

<p>The strategy: make every detection method return 0 (which means NO / false in Objective-C).</p><pre><code>// Helper: hook a method and force it to return NO (0)
function hookMethod(className, selector) {
    var method = ObjC.classes[className][selector];
    method.implementation = ObjC.implement(method, function (self, sel) {
        return 0;  // NO = not jailbroken
    });
    console.log(&quot;[+] &quot; + className + &quot; &quot; + selector + &quot; -&gt; NO&quot;);
}

// Layer 1: SafeDeviceJailbreakDetection (CLASS methods → use &quot;+&quot;)
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ isJailbroken&quot;);
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ hasJailbreakPaths&quot;);
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ canOpenJailbreakSchemes&quot;);
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ canViolateSandbox&quot;);
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ hasJailbreakEnvironmentVariables&quot;);
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ hasJailbreakProcesses&quot;);
hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, &quot;+ hasSuspiciousSymlinks&quot;);

// Layer 2: SafeDevicePlugin (INSTANCE methods → use &quot;-&quot;)
hookMethod(&quot;SafeDevicePlugin&quot;, &quot;- isJailBroken&quot;);
hookMethod(&quot;SafeDevicePlugin&quot;, &quot;- isJailBrokenCustom&quot;);
hookMethod(&quot;SafeDevicePlugin&quot;, &quot;- hasObviousJailbreakSigns&quot;);</code></pre>

## First attempt — FAILED

<figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/05.jpg" /></figure><p>Do you know Why ???????? think</p><pre><code>[-] SafeDeviceJailbreakDetection isJailbroken not found
[-] SafeDeviceJailbreakDetection hasJailbreakPaths not found
...all not found...
Process terminated  ← app crashed!</code></pre><p>you are right :) there is a <strong>Two problems:</strong></p><ol><li>Used &quot;- isJailbroken&quot; (instance) instead of &quot;+ isJailbroken&quot; (class method)</li></ol>

## Second attempt — SUCCESS

<p><strong>All 10 hooks attached. No crash. App survived.</strong></p><figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/06.png" /></figure><p>Yahhhhh!!!!!!</p><figure><img alt="" src="./images/articles/mobile-security-ios-safe-device-root-detection/07.jpg" /></figure><p>The Final Script :</p><pre><code>function hookMethod(className, selector) {
    try {
        var method = ObjC.classes[className][selector];
        if (!method) {
            console.log(&quot;[-] &quot; + className + &quot; &quot; + selector + &quot; NOT FOUND&quot;);
            return;
        }
        method.implementation = ObjC.implement(method, function (self, sel) {
            return 0; // NO = not jailbroken
        });
        console.log(&quot;[+] &quot; + className + &quot; &quot; + selector + &quot; -&gt; NO&quot;);
    } catch (e) {
        console.log(&quot;[-] &quot; + className + &quot; &quot; + selector + &quot; ERROR: &quot; + e);
    }
}

function waitForClass(name, cb) {
    if (ObjC.classes[name]) return cb();
    var iv = setInterval(function () {
        if (ObjC.classes[name]) { clearInterval(iv); cb(); }
    }, 50);
}

// Layer 1: SafeDeviceJailbreakDetection — CLASS methods (+)
waitForClass(&quot;SafeDeviceJailbreakDetection&quot;, function () {
    var m = [
        &quot;+ isJailbroken&quot;,
        &quot;+ hasJailbreakPaths&quot;,
        &quot;+ canOpenJailbreakSchemes&quot;,
        &quot;+ canViolateSandbox&quot;,
        &quot;+ hasJailbreakEnvironmentVariables&quot;,
        &quot;+ hasJailbreakProcesses&quot;,
        &quot;+ hasSuspiciousSymlinks&quot;,
    ];
    m.forEach(function (sel) { hookMethod(&quot;SafeDeviceJailbreakDetection&quot;, sel); });
});

// Layer 2: SafeDevicePlugin — INSTANCE methods (-)
waitForClass(&quot;SafeDevicePlugin&quot;, function () {
    hookMethod(&quot;SafeDevicePlugin&quot;, &quot;- isJailBroken&quot;);
    hookMethod(&quot;SafeDevicePlugin&quot;, &quot;- isJailBrokenCustom&quot;);
    hookMethod(&quot;SafeDevicePlugin&quot;, &quot;- hasObviousJailbreakSigns&quot;);
});

console.log(&quot;\n[*] Done. Trigger the jailbreak check.\n&quot;);</code></pre>

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help.

<p>Remember My name : everythingBlackkk</p><p>Made by ❤</p><p>Github : <a href="https://github.com/everythingBlackkk">https://github.com/everythingBlackkk</a></p><p>Linkedin : <a href="http://www.linkedin.com/in/everythingblackkk">www.linkedin.com/in/everythingblackkk</a></p><p>X : <a href="https://x.com/0xblackkk">https://x.com/0xblackkk</a></p><p>Youtube : <a href="https://www.youtube.com/@everythingBlackkk">https://www.youtube.com/@everythingBlackkk</a></p>
