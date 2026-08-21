# How does malware know difference between the Virtual Machine and the real Machine?

<figure><img src="./images/articles/offensive-security-editor/01.png" alt=""><figcaption></figcaption></figure>

Hello everyone! Today, I’ll discuss the techniques used by malware developers to identify if their code is running in a real environment or a virtual machine (VM) so that they can decide whether to proceed with their malicious actions, like encrypting files, stealing information, and other common malware functions. I’ll also include a C++ code simulation to demonstrate how malware might detect these environments. Let’s jump in!

<figure><img src="./images/articles/offensive-security-editor/02.png" alt=""><figcaption></figcaption></figure>

## 1. Registry Keys (Reg Keys) 

In simple terms, registry keys are like a huge database that stores system and application settings on a device. So, if you want to modify anything on your system or in a particular app, you’ll likely find it in the registry.

Registry keys consist of *keys* and *values*, and virtual machines often have specific registry entries that hint at their virtual environment. For example, a malware could check for keys like <mark class="mark-purple">`HKLM\SYSTEM\CurrentControlSet\Services\VBoxGuest`</mark>. If the malware finds this key, it confirms it’s in a VM environment and may change its behavior or even delete itself.

There Is Another Reg key like :

I Have A good Way to hide My self in Virtual Machine By Change My Name :)

```
HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Services\VBoxGuest
```

<figure><img src="./images/articles/offensive-security-editor/03.png" alt=""><figcaption></figcaption></figure>

```
HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Control\Class\{4D36E968-E325-11CE-BFC1-08002BE10318}\000\DriverDesc
```

<br>

<figure><img src="./images/articles/offensive-security-editor/04.png" alt=""><figcaption></figcaption></figure>

```
HKEY_LOCAL_MACHINE\HARDWARE\DEVICEMAP\Scsi\Scsi Port 0\Scsi Bus 0\Target Id 0\Logical Unit Id 0
```

<figure><img src="./images/articles/offensive-security-editor/05.png" alt=""><figcaption></figcaption></figure>

## 2. MAC Address 

Every device has a unique MAC address. However, VMs have particular MAC addresses specific to their platforms, like <mark class="mark-orange">`00:50:56`</mark> for VMware and `08-00-27` for VirtualBox. By detecting these, malware can determine if it's in a VM environment and adjust its actions accordingly.

<figure><img src="./images/articles/offensive-security-editor/06.png" alt=""><figcaption></figcaption></figure>

## 3. Processes 

Malware often inspects running processes in the system to look for VM-specific ones. For example, processes like `VBoxService.exe` or `vmtoolsd.exe` indicate that the system is running on a virtual machine, which is a red flag for malware to alter its behavior.

<br>

<figure><img src="./images/articles/offensive-security-editor/07.png" alt=""><figcaption></figcaption></figure>

## 4. BIOS Information 

The BIOS in real hardware is usually different from that in virtual machines. For example, the BIOS in VMs may contain information like `VirtualBox` or `VMware`, which malware can detect as a sign it’s in a virtual environment.

```
wmic bios get serialnumber
```

<figure><img src="./images/articles/offensive-security-editor/08.png" alt=""><figcaption></figcaption></figure>

## 5. Hardware Checks 

Malware can also inspect connected devices to determine if they’re real or virtual. Many VMs use “virtual devices” or “vDevices” to emulate hardware. When malware detects these devices, it may suspect it’s not in a real environment.

## 6. Descriptor Tables 

Another method malware uses is by checking the Descriptor Tables: **Interrupt Descriptor Table (IDT)**, **Global Descriptor Table (GDT)**, and **Local Descriptor Table (LDT)** in the CPU, which contain critical memory access information.

Here’s a quick overview of these tables:

* **IDT**: Manages interrupts, allowing the CPU to stop current code execution to handle immediate actions.
* **GDT**: Defines memory regions for the entire system, including both OS and user programs.
* **LDT**: Similar to GDT, but it specifically defines memory regions for each individual process.

When both a host and a guest OS are running simultaneously, VMs need to relocate the guest’s IDT, GDT, and LDT to avoid conflicts with the host. Malware can detect if it’s running in a VM by identifying if these tables have been relocated. This detection is done using specific assembly instructions like `SIDT`, `SGDT`, and `SLDT`, which retrieve the values of IDT, GDT, and LDT, respectively. If malware notices inconsistencies here, it may confirm that it’s not in a real environment.

## 7. uptime 

You can check the system’s uptime before the malware is downloaded onto the device. If the system has been running for a long time before the victim receives the malware, it makes more sense. It would be suspicious if the device has only been running for five minutes when the malware gets installed.

```csharp
#include <iostream>
#include <windows.h>

int main() {
    // Use GetTickCount to get the system uptime in milliseconds
    DWORD uptime = GetTickCount();

    // Convert uptime to minutes
    DWORD uptimeMinutes = uptime / (1000 * 60);

    if (uptimeMinutes > 60) { // More than 1 hour
        std::cout << "The system has been running for more than an hour - Real environment.\n";
    } else if (uptimeMinutes > 30) { // Between 30 minutes and 1 hour
        std::cout << "The system has been running for more than half an hour - Likely a real environment.\n";
    } else { // Less than half an hour
        std::cout << "The system has been running for less than half an hour - Likely a non-real environment.\n";
    }

    return 0;
}
```

This code checks that if the device has been running for less than half an hour, then this is in a Virtual Machine environment, and if it is longer, then it may be Real environment.

you can check That By PowerShell&#x20;

```
(get-date) - (gcim Win32_OperatingSystem).LastBootUpTime

```

<figure><img src="./images/articles/offensive-security-editor/09.png" alt=""><figcaption></figcaption></figure>

### And you can also in CMD :

```
systeminfo | find "System Boot Time"
```

## 8. System Information 

Malware can gather general system information using commands like `systeminfo` to find details about the device, such as processor type (CPU), memory (RAM), and operating system (OS) type. If it detects that the resources are lower than usual or that the system doesn’t seem like a real device, this might be an indicator that it’s running in a virtual environment, as VMs often have limited resources.

<figure><img src="./images/articles/offensive-security-editor/10.png" alt=""><figcaption></figcaption></figure>

## 9. Some Information Checks 

Lastly, malware might check system details such as the system’s uptime or storage capacity. For instance, if the system uptime is unusually low or the storage size is atypical (like 60GB storage with 1GB RAM), these can be clues for malware that it’s not in a physical machine.

```csharp
#include <windows.h>
#include <iostream>
#include <string>
#include <filesystem>

bool isVirtualMachine() {
    HKEY hKey;
    const char* regPath = "HARDWARE\\DEVICEMAP\\Scsi\\Scsi Port 0\\Scsi Bus 0\\Target Id 0\\Logical Unit Id 0";
    const char* valueName = "Identifier";
    char value[255];
    DWORD valueSize = sizeof(value);

    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, regPath, 0, KEY_READ, &hKey) == ERROR_SUCCESS) {

        if (RegQueryValueExA(hKey, valueName, NULL, NULL, (LPBYTE)value, &valueSize) == ERROR_SUCCESS) {
            RegCloseKey(hKey);
            
            std::string identifierValue(value);

            return (identifierValue.find("VBOX") != std::string::npos ||
                    identifierValue.find("vmware") != std::string::npos ||
                    identifierValue.find("virtual") != std::string::npos);
        }
        RegCloseKey(hKey);
    }
    return false;
}

bool isHardDriveSmall() {
    ULARGE_INTEGER freeBytesAvailable, totalNumberOfBytes, totalNumberOfFreeBytes;
    if (GetDiskFreeSpaceExA("C:\\", &freeBytesAvailable, &totalNumberOfBytes, &totalNumberOfFreeBytes)) {

        double sizeGB = static_cast<double>(totalNumberOfBytes.QuadPart) / (1024 * 1024 * 1024);
        return sizeGB < 70;
    }
    return false;
}

bool isRamSmall() {
    MEMORYSTATUSEX memoryStatus;
    memoryStatus.dwLength = sizeof(memoryStatus);
    if (GlobalMemoryStatusEx(&memoryStatus)) {

        double ramGB = static_cast<double>(memoryStatus.ullTotalPhys) / (1024 * 1024 * 1024);
        return ramGB < 2;
    }
    return false;
}

bool isDesktopEmpty() {
    std::string desktopPath = std::string(getenv("USERPROFILE")) + "\\Desktop";
    int fileCount = std::distance(std::filesystem::directory_iterator(desktopPath), std::filesystem::directory_iterator{});
    return fileCount == 0;
}

int main() {
    std::string message;
    
    if (isVirtualMachine()) {
        message += "We are in a virtual machine.\n";
    } else {
        message += "We are on a real machine.\n";
    }

    if (isHardDriveSmall()) {
        message += "- Hard drive is less than 70 GB.\n";
    }
    if (isRamSmall()) {
        message += "- RAM is less than 2 GB.\n";
    }
    if (isDesktopEmpty()) {
        message += "- Desktop is empty.\n";
    }

    MessageBoxA(NULL, message.c_str(), "Environment Check", MB_OK | MB_ICONINFORMATION);
    return 0;
}

```

This code is written in C++ and performs checks to detect if it’s running in a virtual machine or a physical machine. Here’s a detailed explanation of each function and how it works:

1. ## **isVirtualMachine()**:

* This function checks the Windows registry to see if there are any entries that indicate a virtual machine environment, such as VirtualBox, VMware, or any identifier containing “virtual.”
* It opens a registry key located at <mark class="mark-orange">`HARDWARE\DEVICEMAP\Scsi\Scsi Port 0\Scsi Bus 0\Target Id 0\Logical Unit Id 0`</mark> and looks for a value named `"Identifier"`.
* If it finds a value with “VBOX,” “vmware,” or “virtual” in it, the function returns `true`, meaning the program is likely running in a virtual machine.
* Otherwise, it returns `false`, indicating it’s likely running on a real machine.

1. ## **isHardDriveSmall()**:

* This function checks if the size of the main hard drive (C:) is less than 70 GB.
* It uses `GetDiskFreeSpaceExA` to get the total disk space and calculates the size in gigabytes.
* If the hard drive is less than 70 GB, the function returns `true`, which can be an indicator of a virtual environment (where small hard drives are common).
* Otherwise, it returns `false`.

1. ## **isRamSmall()**:

* This function checks if the system has less than 2 GB of RAM.
* It uses `GlobalMemoryStatusEx` to get the total physical memory and converts it to gigabytes.
* If the RAM is less than 2 GB, it returns `true`, again possibly indicating a virtual machine (which often has limited RAM).
* Otherwise, it returns `false`.

1. ## **isDesktopEmpty()**:

* This function checks if the user’s Desktop folder is empty.
* It constructs the path to the Desktop folder using the environment variable `USERPROFILE`, then counts the number of items in that folder.
* If there are no files or folders on the Desktop, it returns `true`, which could suggest a virtual machine or fresh installation.
* Otherwise, it returns `false`.

1. ## **main()**:

* The `main` function combines the results of the above checks and builds a message based on the environment.
* It checks each condition:
* If it’s a virtual machine, it appends “We are in a virtual machine.” Otherwise, it appends “We are on a real machine.”
* If the hard drive is small, it adds a line saying the hard drive is less than 70 GB.
* If RAM is small, it notes that RAM is less than 2 GB.
* If the Desktop is empty, it notes that the Desktop is empty.
* Finally, it displays the message in a message box with an information icon.

## Wwwwweeeeeeee Are Done :)

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

<figure><img src="./images/articles/offensive-security-editor/11.png" alt=""><figcaption></figcaption></figure>
