# Bypassing Flutter Root Detection with One ARM64 Patch (Android)

<figure><img alt="" src="./images/articles/mobile-security-flutter-root-detection-arm64-patch/01.png" /></figure>

## Reverse-engineering a Flutter application is different from analyzing a traditional Android app.

<p>In a Java or Kotlin application, most logic can be found inside classes.dex and inspected using tools such as JADX. In a Flutter release build, Dart code is compiled into native machine instructions and stored inside:</p><pre><code>libapp.so</code></pre><p>This article explains how a Flutter root-detection check was traced from its Android implementation back to Dart AOT code — and how one conditional ARM64 instruction controlled the final result.</p>

## How Flutter Root Detection Works

<p>The application used the Flutter package root_checker_plus.</p><p><a href="https://pub.dev/packages/root_checker_plus">root_checker_plus | Flutter package</a></p><figure><img alt="" src="./images/articles/mobile-security-flutter-root-detection-arm64-patch/02.png" /></figure><figure><img alt="" src="./images/articles/mobile-security-flutter-root-detection-arm64-patch/03.png" /></figure><p>The Dart side did not perform the root checks directly. Instead, it used a Flutter MethodChannel to ask the Android side:</p><pre><code>final result =
    await channel.invokeMethod&lt;bool&gt;(&quot;isRootChecker&quot;);</code></pre><pre><code>return result ?? false;</code></pre><p>The Android plugin then used root-detection techniques such as:</p><ul><li>checking for the su binary</li><li>looking for Magisk indicators</li><li>examining build tags</li><li>checking suspicious system paths</li><li>calling native root-detection functions</li></ul><p>The result was returned to Dart as either true, false, or null.</p><p>The important lesson is that the application ultimately trusted one returned Boolean value.</p>

## Why libapp.so Matters

<p>Flutter compiles Dart code “<em>ahead of time</em>” (AOT) in release builds.</p><p>That means methods such as isRootChecker() are converted into ARM64 machine code inside libapp.so.</p><p>A normal disassembler can display the instructions, but much of the Dart context is missing:</p><ul><li>class names</li><li>Dart method names</li><li>strings</li><li>object-pool references</li><li>runtime metadata</li></ul><p>To recover this context, we used <strong>Blutter</strong>.</p>

## Finding the Function with Blutter

<p><a href="https://github.com/worawit/blutter">GitHub - worawit/blutter: Flutter Mobile Application Reverse Engineering Tool</a></p><p>Blutter analyzes Flutter’s Dart AOT snapshot and annotates the native instructions.</p><p>To disassemble libapp.so We Can use blutter tool via :</p><pre><code>blutter arm64-v8a/ output</code></pre><figure><img alt="" src="./images/articles/mobile-security-flutter-root-detection-arm64-patch/04.png" /></figure><p>inside output dir :</p><pre><code>output/
├── asm/                # Annotated libapp.so assembly
├── blutter_frida.js    # Frida script template
├── objs.txt            # Nested object-pool dump
└── pp.txt              # Dart objects from the object pool</code></pre><blockquote>inside asm , We Will Find : <strong>root_checker_plus.dart</strong></blockquote><pre><code>// lib: root_checker_plus, url: package:root_checker_plus/root_checker_plus.dart

// class id: 1048948, size: 0x8
class :: {
}

// class id: 179, size: 0x8, field offset: 0x8
abstract class RootCheckerPlus extends Object {

  static _ isRootChecker(/* No info */) async {
    // ** addr: 0x1cb810, size: 0x70
    // 0x1cb810: EnterFrame
    //     0x1cb810: stp             fp, lr, [SP, #-0x10]!
    //     0x1cb814: mov             fp, SP
    // 0x1cb818: AllocStack(0x28)
    //     0x1cb818: sub             SP, SP, #0x28
    // 0x1cb81c: SetupParameters()
    //     0x1cb81c: stur            NULL, [fp, #-8]
    // 0x1cb820: CheckStackOverflow
    //     0x1cb820: ldr             x16, [THR, #0x48]  ; THR::stack_limit
    //     0x1cb824: cmp             SP, x16
    //     0x1cb828: b.ls            #0x1cb878
    // 0x1cb82c: InitAsync() -&gt; Future&lt;bool?&gt;
    //     0x1cb82c: add             x0, PP, #9, lsl #12  ; [pp+0x96e0] TypeArguments: &lt;bool?&gt;
    //     0x1cb830: ldr             x0, [x0, #0x6e0]
    //     0x1cb834: bl              #0x148120  ; InitAsyncStub
    // 0x1cb838: r16 = &lt;bool&gt;
    //     0x1cb838: ldr             x16, [PP, #0x4310]  ; [pp+0x4310] TypeArguments: &lt;bool&gt;
    // 0x1cb83c: r30 = Instance_MethodChannel
    //     0x1cb83c: add             lr, PP, #9, lsl #12  ; [pp+0x96e8] Obj!MethodChannel@39ab11
    //     0x1cb840: ldr             lr, [lr, #0x6e8]
    // 0x1cb844: stp             lr, x16, [SP, #8]
    // 0x1cb848: r16 = &quot;isRootChecker&quot;
    //     0x1cb848: add             x16, PP, #9, lsl #12  ; [pp+0x96f0] &quot;isRootChecker&quot;
    //     0x1cb84c: ldr             x16, [x16, #0x6f0]
    // 0x1cb850: str             x16, [SP]
    // 0x1cb854: r4 = const [0x1, 0x2, 0x2, 0x2, null]
    //     0x1cb854: ldr             x4, [PP, #0x40]  ; [pp+0x40] List(5) [0x1, 0x2, 0x2, 0x2, Null]
    // 0x1cb858: r0 = invokeMethod()
    //     0x1cb858: bl              #0x1cb880  ; [package:flutter/src/services/platform_channel.dart] MethodChannel::invokeMethod
    // 0x1cb85c: mov             x1, x0
    // 0x1cb860: stur            x1, [fp, #-0x10]
    // 0x1cb864: r0 = Await()
    //     0x1cb864: bl              #0x147edc  ; AwaitStub
    // 0x1cb868: cmp             w0, NULL
    // 0x1cb86c: b.ne            #0x1cb874
    // 0x1cb870: r0 = false
    //     0x1cb870: add             x0, NULL, #0x30  ; false
    // 0x1cb874: r0 = ReturnAsync()
    //     0x1cb874: b               #0x16570c  ; ReturnAsyncStub
    // 0x1cb878: r0 = StackOverflowSharedWithoutFPURegs()
    //     0x1cb878: bl              #0x29c76c  ; StackOverflowSharedWithoutFPURegsStub
    // 0x1cb87c: b               #0x1cb82c
  }
}

</code></pre><p>Blutter identified the Dart function that receives the root-check result:</p><pre><code>static _ isRootChecker() async {
  // addr: 0x1cb810, size: 0x70
}</code></pre><p>The address 0x1cb810 is an <strong>offset</strong> inside libapp.so, not a fixed runtime address.</p><p>Because Android uses <strong>ASLR</strong> Address Space Layout Randomization — the library may load at a different base address each time the application starts.</p><figure><img alt="" src="./images/articles/mobile-security-flutter-root-detection-arm64-patch/05.png" /></figure><p>so attackers cannot predict where code and data are loaded</p><p>The real runtime address is calculated as:</p><pre><code>Runtime address = libapp.so base + Blutter offset</code></pre><p>Blutter showed the important instructions after Dart waits for the Android response:</p><pre><code>0x1cb864: bl   AwaitStub
0x1cb868: cmp  w0, NULL
0x1cb86c: b.ne #0x1cb874
0x1cb870: add  x0, NULL, #0x30
0x1cb874: b    ReturnAsyncStub</code></pre>

## Reading the ARM64 Code

<p>Only a few ARM64 concepts are needed here:</p><ul><li>x0 is a 64-bit CPU register commonly used for return values.</li><li>w0 is the lower 32-bit part of the same register.</li><li>cmp compares two values and updates the CPU condition flags. It does not change the value in w0. It only updates internal CPU flags.</li><li>b.ne means <strong>branch if not equal</strong>.</li><li>bl calls another function while saving the return address.</li></ul>

## Understanding the Result

<p>After Dart calls the Android root checker, it waits for the response:</p><pre><code>bl AwaitStub</code></pre><p>When Android finishes, the result , true, false, or null—is stored in the w0 register.</p><p>Now The variable w0 now contains the result:</p><ul><li>1 → means <strong>true</strong></li><li>0 → means <strong>false</strong> or <strong>null</strong></li></ul><p>Next, Dart checks whether that result is null:</p><pre><code>cmp w0, NULL               // Compare result with null (0)
0x1cb86c: b.ne #0x1cb874   // If NOT equal → jump to 0x1cb874</code></pre><p>The previous instruction (cmp w0, NULL) <strong>compares</strong> two things:</p><ul><li>w0 = the result that came back from AwaitStub</li><li>NULL = 0 (means nothing / null)</li></ul><p>Now What Happen ?</p><ul><li>If the result is NOT 0 “Not NULL” it’s will <strong>Jump</strong> (skip) to address 0x1cb874</li><li>If the result <strong>IS 0</strong> (null), do nothing , just continue to the next line.</li></ul>

## Flow:

<pre><code>After AwaitStub:

cmp w0, NULL
    ↓
Is w0 == 0 (null)?
    ├── Yes  → Continue to next line → set x0 = false
    └── No   → b.ne jumps here → 0x1cb874 (skip setting false</code></pre><p>Then comes the important instruction:</p><pre><code>add x0, NULL, #0x30 // ← This runs only when result is null
0x1cb874: b ReturnAsyncStub</code></pre><ul><li>Null here means 0.</li><li>So it does: x0 = 0 + 0x30</li><li>Result: x0 = 0x30</li></ul><p><strong>| Important:</strong> In Dart, <strong>0x30 means false</strong>.</p><p><em>“You got null? Okay, change it to false instead.”</em></p><p>0x1cb874: b ReturnAsyncStub Means :</p><ul><li>This is a <strong>jump</strong> (go to) the return function.</li><li>It finishes the async function and sends the value in x0 back to the caller.</li></ul>

## When Result is NOT Null:

<pre><code>AwaitStub returns →   true or false (w0 ≠ 0)

cmp w0, NULL
b.ne #0x1cb874        → Condition met → JUMP to 0x1cb874

( skips the add line )

b ReturnAsyncStub     → Return the original value (true or false)</code></pre>

## What Happens When You Replace b.ne with NOP?

<pre><code>bl   AwaitStub
cmp  w0, NULL
nop                      // ← Replaced (does nothing)
add  x0, NULL, #0x30     // ← This line ALWAYS runs now (Return False)
b    ReturnAsyncStub</code></pre><p>Why It Works ?</p><ul><li>NOP = <strong>No Operation</strong> → The CPU does nothing and moves to the next instruction.</li><li>Because the b.ne (the jump) is gone, the code <strong>always continues</strong> to the add instruction.</li><li>The add x0, NULL, #0x30 <strong>always executes</strong>, forcing x0 = 0x30 (which means <strong>false</strong> in Dart).</li><li>So no matter what AwaitStub returns (true, false, or null), the function <strong>always returns false</strong>.</li></ul>

## Runtime Patch with Frida

<p>The branch is located at:</p><pre><code>libapp.so base + 0x1cb86c</code></pre><p>The Frida patch is:</p><pre><code>// STEP 1: We need to find the file &quot;libapp.so&quot; in the app&#39;s memory.
function findAndPatchLibApp() {

    // Try to find libapp.so in memory
    var libapp = Process.findModuleByName(&quot;libapp.so&quot;);

    // If it is NOT found yet...
    if (libapp === null) {
        // Wait 50 milliseconds, then try again
        setTimeout(findAndPatchLibApp, 50);
        return;  // stop here and wait
    }

    // If we get here, libapp.so was found!
    console.log(&quot;[+] Found libapp.so at address: &quot; + libapp.base);


    // STEP 2: Calculate the exact address of the instruction we want to change.
    //
    // &quot;libapp.base&quot;   = where the file starts in memory
    // &quot;0x1cb86c&quot;      = the offset (b.ne) of our target instruction
    //
    // base + offset = the real address of our instruction

    var instructionAddress = libapp.base.add(0x1cb86c);

    console.log(&quot;[+] Target instruction is at: &quot; + instructionAddress);

    // STEP 3: Replace the instruction with a NOP.
    // 0xD503201F = NOP = &quot;do nothing&quot; in ARM64

    Memory.patchCode(instructionAddress, 4, function (code) {
        code.writeU32(0xD503201F);  // write the NOP instruction
    });

    console.log(&quot;[+] Done! Instruction replaced with NOP.&quot;);
    console.log(&quot;[+] isRootChecker() will now ALWAYS return false = NOT rooted.&quot;);
}

// Start &lt;3
findAndPatchLibApp();</code></pre><figure><img alt="" src="./images/articles/mobile-security-flutter-root-detection-arm64-patch/06.png" /></figure><p>The script performs three main actions:</p><ol><li>Finds the runtime base address of libapp.so.</li><li>Adds the Blutter offset 0x1cb86c.</li><li>Replaces the four-byte branch instruction with an ARM64 NOP.</li></ol><p>Memory.patchCode is used instead of a normal memory write because code pages are usually executable but not writable.</p>

## Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help.

<p>Remember My name : everythingBlackkk</p><p>Made by ❤</p><p>Github : <a href="https://github.com/everythingBlackkk">https://github.com/everythingBlackkk</a></p><p>Linkedin : <a href="http://www.linkedin.com/in/everythingblackkk">www.linkedin.com/in/everythingblackkk</a></p><p>X : <a href="https://x.com/0xblackkk">https://x.com/0xblackkk</a></p><p>Youtube : <a href="https://www.youtube.com/@everythingBlackkk">https://www.youtube.com/@everythingBlackkk</a></p>
