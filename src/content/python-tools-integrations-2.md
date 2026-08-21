# Malware Static Analysis

## MalwarePE

A Python-based tool for analyzing Windows Portable Executable (PE) files. MalwarePE provides detailed analysis of PE files including section information, imported/exported functions, suspicious strings detection, and file hashing.

### Features

* **PE File Structure Analysis**
  * Section sizes and names
  * Imported libraries and functions
  * Exported functions
* **String Analysis**
  * Extracts readable strings from the binary
  * Identifies suspicious strings including:
    * URLs
    * IP addresses
* **File Integrity**
  * SHA-256 hash calculation
  * MD5 hash calculation

```python
import pefile
import hashlib
import re
import os
import sys

def calculate_file_hashes(file_path):
    sha256_hash = hashlib.sha256()
    md5_hash = hashlib.md5()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
            md5_hash.update(byte_block)
    return sha256_hash.hexdigest(), md5_hash.hexdigest()

def extract_strings(file_path):
    extracted_strings = []
    with open(file_path, "rb") as f:
        content = f.read()
        extracted_strings = re.findall(b'[\x20-\x7E]{4,}', content)
    return extracted_strings

def extract_suspicious_strings(file_path): 
    suspicious_strings = []
    with open(file_path, "rb") as f:
        content = f.read()
        urls = re.findall(b'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', content)
        ips = re.findall(b'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', content)
        suspicious_strings.extend(urls)
        suspicious_strings.extend(ips)
    return suspicious_strings

def analyze_pe_file(file_path, output_file):
    try:
        pe = pefile.PE(file_path)
        output_file.write("[+] PE file analysis started...\n")
        print("[+] PE file analysis started...\n")

        output_file.write("\n[+] Section Sizes:\n")
        print("\n[+] Section Sizes:")
        for section in pe.sections:
            section_name = section.Name.decode('utf-8').strip('\x00')
            section_size = section.SizeOfRawData
            output_file.write(f"  Section: {section_name}, Size: {section_size} bytes\n")
            print(f"  Section: {section_name}, Size: {section_size} bytes")

        if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
            output_file.write("\n[+] Imported Libraries and Functions:\n")
            print("\n[+] Imported Libraries and Functions:")
            for entry in pe.DIRECTORY_ENTRY_IMPORT:
                library = entry.dll.decode('utf-8')
                output_file.write(f"\nLibrary: {library}\n")
                print(f"\nLibrary: {library}")
                for func in entry.imports:
                    if func.name:
                        output_file.write(f"  Function: {func.name.decode('utf-8')}\n")
                        print(f"  Function: {func.name.decode('utf-8')}")
                    else:
                        output_file.write(f"  Function: Ordinal {func.ordinal}\n")
                        print(f"  Function: Ordinal {func.ordinal}")

        if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT'):
            output_file.write("\n[+] Exported Functions:\n")
            print("\n[+] Exported Functions:")
            for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
                if exp.name:
                    output_file.write(f"  Function: {exp.name.decode('utf-8')}\n")
                    print(f"  Function: {exp.name.decode('utf-8')}")
                else:
                    output_file.write(f"  Function: Ordinal {exp.ordinal}\n")
                    print(f"  Function: Ordinal {exp.ordinal}")

        pe.close()

    except pefile.PEFormatError as e:
        output_file.write(f"[-] Error: {e}\n")
        print(f"[-] Error: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python analyze_pe.py <file_path>")
        return

    file_path = sys.argv[1].strip()

    if not os.path.isfile(file_path):
        print("[-] File not found. Please check the path.")
        return

    output_filename = os.path.splitext(os.path.basename(file_path))[0] + "_analysis.txt"
    strings_filename = os.path.splitext(os.path.basename(file_path))[0] + "_strings.txt"
    with open(output_filename, "w") as output_file, open(strings_filename, "w") as strings_file:
        sha256_hash, md5_hash = calculate_file_hashes(file_path)
        output_file.write(f"[+] File SHA-256 Hash: {sha256_hash}\n")
        output_file.write(f"[+] File MD5 Hash: {md5_hash}\n")
        print(f"[+] File SHA-256 Hash: {sha256_hash}")
        print(f"[+] File MD5 Hash: {md5_hash}")

        extracted_strings = extract_strings(file_path)
        for string in extracted_strings:
            strings_file.write(f"{string.decode('utf-8', errors='ignore')}\n")

        suspicious_strings = extract_suspicious_strings(file_path)
        if suspicious_strings:
            output_file.write("\n[+] Suspicious Strings Found:\n")
            print("\n[+] Suspicious Strings Found:")
            for string in suspicious_strings:
                output_file.write(f"  {string.decode('utf-8', errors='ignore')}\n")
                print(f"  {string.decode('utf-8', errors='ignore')}")

        analyze_pe_file(file_path, output_file)

    print(f"[+] Analysis completed. Results saved to {output_filename} and strings saved to {strings_filename}")

if __name__ == "__main__":
    main()
```

````python
## Example Output

```
[+] File SHA-256 Hash: a1b2c3d4...
[+] File MD5 Hash: e5f6g7h8...

[+] Section Sizes:
  Section: .text, Size: 1024 bytes
  Section: .data, Size: 512 bytes

[+] Imported Libraries and Functions:
Library: kernel32.dll
  Function: CreateFileA
  Function: ReadFile
```
````
