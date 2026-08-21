# MobileHackingLab – No Escape: Bypassing iOS Jailbreak Detection

**No Escape** is an iOS reverse-engineering challenge from Mobile Hacking Lab. The application checks whether the device is jailbroken and blocks access when any jailbreak check succeeds.

In this writeup, we will understand the detection logic and bypass it in two ways:

1. Manually changing the return value with **LLDB**.
2. Hooking the function and changing its return value with **Frida**.

This is an intentionally vulnerable training application. The techniques below were used only inside the challenge environment.

## Finding the Jailbreak Check in IDA

After loading the application binary in IDA, we search for the string `jailbroken`. This leads us to a Swift function named `isJailbroken()`.

![Searching for the jailbroken function in IDA](./images/manual/no-escape/02.png)

IDA's decompiler shows the real function logic:

```cpp
Swift::Bool __swiftcall isJailbroken()()
{
    char v1; // [xsp+4h] [xbp-Ch]
    char v2; // [xsp+8h] [xbp-8h]
    char v3; // [xsp+Ch] [xbp-4h]

    if ( (checkForJailbreakFiles()() & 1) != 0 )
        v3 = 1;
    else
        v3 = checkForWritableSystemDirectories()();

    if ( (v3 & 1) != 0 )
        v2 = 1;
    else
        v2 = canOpenCydia()();

    if ( (v2 & 1) != 0 )
        v1 = 1;
    else
        v1 = checkSandboxViolation()();

    return (v1 & 1) != 0;
}
```

![The real isJailbroken decompiler logic in IDA](./images/manual/no-escape/13.png)

The function performs four common jailbreak checks:

- `checkForJailbreakFiles()` looks for files or directories normally found on jailbroken devices.
- `checkForWritableSystemDirectories()` checks whether protected system locations can be modified.
- `canOpenCydia()` tests whether the Cydia application or its URL scheme is available.
- `checkSandboxViolation()` checks whether the application can escape normal iOS sandbox restrictions.

The checks use **short-circuit logic**. As soon as one check returns `true`, the final result becomes `true`. Only when every check fails does `isJailbroken()` return `false`.

IDA's graph view makes this control flow easier to see. Different branches eventually join at the final return block.

![Control-flow graph of isJailbroken in IDA](./images/manual/no-escape/03.png)

## Understanding the ARM64 Return Value

At the end of the function, IDA shows these ARM64 instructions:

```asm
LDR W8, [SP, #var_10]
AND W0, W8, #1
LDP X29, X30, [SP, #var_s0]
ADD SP, SP, #0x20
RET
```

The important instructions are:

- `LDR W8, [...]` loads the saved Boolean value from the stack into register `W8`.
- `AND W0, W8, #1` keeps only the lowest bit and stores it in `W0`.
- `RET` returns execution to the caller.

On ARM64, small integer and Boolean return values are placed in `W0`, which is the lower 32-bit part of the `X0` register. Therefore:

```text
X0 = 1  -> true  -> the device is considered jailbroken
X0 = 0  -> false -> the device passes the check
```

The `RET` instruction does not contain the return value itself. It simply returns to the caller, which then reads the value already stored in `X0`. This means we can bypass the check by changing `X0` to zero immediately before `RET` runs.

![The RET instruction at the end of isJailbroken](./images/manual/no-escape/04.png)

## ASLR and the Runtime Address

IDA shows the final `RET` instruction at the preferred virtual address:

```text
0x10000A114
```

We cannot assume that this is the address used while the application is running. iOS uses **Address Space Layout Randomization**, or **ASLR**, which moves the application to a different memory location each time it starts. ASLR makes fixed memory addresses harder to predict.

We first connect LLDB to the challenge process. In this setup, `debugserver` is exposed through a forwarded local port:

```bash
gdb-remote 127.0.0.1:12345
```

Then we list the loaded images:

```bash
image list -f -o
```

The command parts mean:

- `image list` lists the executable and libraries loaded in the process.
- `-f` shows the full filesystem path for every image.
- `-o` shows the ASLR slide applied to each image.

![LLDB image list showing the No Escape ASLR slide](./images/manual/no-escape/05.png)

For the No Escape executable, LLDB reports an ASLR slide of `0x04BF0000`. We add this slide to IDA's preferred address:

```text
  0x10000A114  IDA preferred address
+   0x04BF0000  ASLR slide
--------------
  0x104BFA114  runtime address
```

Another way to describe the same calculation is:

```text
runtime image base + relative offset
0x104BF0000 + 0xA114 = 0x104BFA114
```

This calculation is necessary because LLDB works with the **live process address**, while IDA normally shows addresses based on the binary's preferred image base.

We verify the calculated address before setting a breakpoint:

```bash
disassemble --start-address 0x104BFA114 --count 3
```

- `--start-address` tells LLDB where disassembly should begin.
- `--count 3` asks it to display three instructions.

The result shows that `0x104BFA114` is the `RET` instruction at the end of `isJailbroken()`.

![Disassembling the calculated runtime address](./images/manual/no-escape/06.png)

## Method 1: Changing X0 with LLDB

We set a breakpoint directly on the runtime address:

```bash
breakpoint set --address 0x104BFA114
```

The `--address` argument creates an instruction breakpoint at that exact memory address. We then resume the application:

```bash
continue
```

When `isJailbroken()` reaches its final `RET`, LLDB stops before the instruction executes.

![LLDB stopping at the isJailbroken return instruction](./images/manual/no-escape/07.png)

Now we inspect the general-purpose registers:

```bash
register read
```

`reg read` is the shorter LLDB form of the same command. The output shows that `X0` is currently `1`, meaning the function is about to return `true`.

![X0 containing the original true return value](./images/manual/no-escape/08.png)

Before allowing `RET` to execute, we replace the value:

```bash
register write x0 0
register read x0
continue
```

The first command writes zero into `X0`. The second confirms the new value, and `continue` lets the function return. The caller now receives `false`, so the jailbreak check is bypassed.

![Successful jailbreak-detection bypass using LLDB](./images/manual/no-escape/09.png)

This LLDB method is useful for understanding the function and proving that its return value controls the challenge. However, we must repeat the register change whenever the function is called again.

## Method 2: Hooking the Function with Frida

Frida gives us a more automatic solution. Instead of stopping at a breakpoint each time, we attach a hook to `isJailbroken()` and replace every return value with zero.

### Finding the Swift Symbol

We can trace exported functions whose names contain `Jailbroken`:

```bash
frida-trace -U -f com.mobilehackinglab.No-Escape.Q967XZWQSK -i "*Jailbroken*"
```

The arguments are:

- `-U` connects to the USB device.
- `-f` spawns the application using its bundle identifier.
- `-i` includes functions matching the supplied wildcard pattern.

Frida finds this symbol:

```text
$s9No_Escape12isJailbrokenSbyF
```

![frida-trace discovering the isJailbroken Swift symbol](./images/manual/no-escape/10.png)

IDA also displays the same exported symbol in the function information.

![The mangled Swift symbol visible in IDA](./images/manual/no-escape/11.png)

### What Is Swift Name Mangling?

Swift supports modules, types, overloaded functions, argument labels, and return types. A short name such as `isJailbroken` is not enough to uniquely describe all of that information. The compiler therefore converts it into a longer encoded symbol. This process is called **name mangling**.

For this symbol:

```text
$s9No_Escape12isJailbrokenSbyF
```

- `$s` identifies a modern Swift symbol.
- `9No_Escape` contains the module name and its length.
- `12isJailbroken` contains the function name and its length.
- `Sb` represents `Swift.Bool`.
- The remaining characters describe parts of the function signature.

Some Mach-O tools display an additional leading underscore, such as `_$s...`. Frida normally resolves the exported name without that extra underscore.

### The Frida Hook

We use this script:

```javascript
var funcPtr = Module.findExportByName(
    null,
    "$s9No_Escape12isJailbrokenSbyF"
);

if (funcPtr) {
    Interceptor.attach(funcPtr, {
        onEnter: function (args) {
            console.log("[+] isJailbroken() called");
        },
        onLeave: function (retval) {
            console.log("[*] Original return value: " + retval);
            retval.replace(ptr(0));
            console.log("[*] Return value patched to false");
        }
    });

    console.log("[+] Done!");
} else {
    console.log("[!] Function not found");
}
```

`Module.findExportByName()` resolves the symbol and gives us its runtime address, so we do not need to calculate the ASLR slide manually. `Interceptor.attach()` places a runtime hook on that address.

The `onEnter` callback runs when the function begins. The `onLeave` callback runs after the original function finishes but before its caller receives the result. At this point, `retval.replace(ptr(0))` changes the value in the return register to zero.

We launch the application and load the script with:

```bash
frida -U -f com.mobilehackinglab.No-Escape.Q967XZWQSK -l bypass.js
```

- `-U` selects the USB-connected device.
- `-f` spawns the target application.
- `-l bypass.js` loads our JavaScript hook.

Every call to `isJailbroken()` now returns `false`, and the challenge displays the success screen.

![Successful automatic bypass using the Frida hook](./images/manual/no-escape/12.png)
