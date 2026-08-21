# Malware Behavior Analysis

## Malware\_Crusher

## Process Monitoring Tool

This tool provides a comprehensive monitoring solution for any process running on a Windows machine. It allows you to track various system parameters including process details, network connections, and registry changes in real-time. It also computes the SHA256 hash of the executable file for security purposes.

### Features

* **Process Validation**: Check if a process exists or can be launched.
* **Process Details**: Extract and display detailed information about a running process, including its CPU usage, memory usage, open files, and more.
* **SHA256 Hash Calculation**: Calculate the SHA256 hash of the executable file to ensure its integrity.
* **Network Connections Monitoring**: Monitor network connections for a given process.
* **Registry Changes Monitoring**: Track changes in system registries in real-time.
* **The Result will be in txt File.**

```python
import sys
import psutil
import winreg
import subprocess
import logging
import hashlib
import time
import os
from datetime import datetime
from prettytable import PrettyTable
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

def setup_logging(target_process):
    log_file = f"{target_process}_monitoring.txt"
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
    logger.addHandler(file_handler)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
    logger.addHandler(console_handler)
    
    return logger, log_file

def log_and_print(logger, log_file, message, table=None):
    logger.info(message)
    if table:
        print(f"\n{str(table)}\n")
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{str(table)}\n")

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, logger):
        self.logger = logger

    def on_modified(self, event):
        self.logger.info(f"File modified: {event.src_path}")

    def on_created(self, event):
        self.logger.info(f"File created: {event.src_path}")

    def on_deleted(self, event):
        self.logger.info(f"File deleted: {event.src_path}")

def monitor_registry_changes(logger, log_file):
    registry_paths = {
        "HKEY_LOCAL_MACHINE": (winreg.HKEY_LOCAL_MACHINE, [
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
            "SYSTEM\\CurrentControlSet\\Services",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
        ]),
        "HKEY_CURRENT_USER": (winreg.HKEY_CURRENT_USER, [
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
        ])
    }
    
    changes_detected = []
    
    for hive_name, (hive, paths) in registry_paths.items():
        for path in paths:
            try:
                key = winreg.OpenKey(hive, path, 0, winreg.KEY_READ)
                try:
                    i = 0
                    while True:
                        name, value, type_ = winreg.EnumValue(key, i)
                        changes_detected.append({
                            'Hive': hive_name,
                            'Path': path,
                            'Name': name,
                            'Type': type_
                        })
                        i += 1
                except WindowsError:
                    pass
                winreg.CloseKey(key)
            except WindowsError as e:
                logger.warning(f"Could not access {hive_name}\\{path}: {str(e)}")

    if changes_detected:
        table = PrettyTable()
        table.field_names = ["Hive", "Path", "Name", "Type"]
        table.align = "l"
        for change in changes_detected:
            table.add_row([change['Hive'], change['Path'], change['Name'], change['Type']])
        log_and_print(logger, log_file, "Registry Changes Detected:", table)

def get_process_details(pid):
    process = psutil.Process(pid)
    return {
        "Process Name": process.name(),
        "Process ID": pid,
        "Executable Path": process.exe(),
        "Username": process.username(),
        "Started At": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "CPU Usage (%)": process.cpu_percent(interval=1.0),
        "Memory Usage (MB)": round(process.memory_info().rss / (1024 * 1024), 2),
        "Threads": process.num_threads(),
        "Open Files": len(process.open_files()),
        "Status": process.status()
    }

def monitor_network_connections(pid, logger, log_file):
    process = psutil.Process(pid)
    connections = process.connections()
    
    if connections:
        table = PrettyTable()
        table.field_names = ["Local Address", "Local Port", "Remote Address", "Remote Port", "Status"]
        table.align = "l"
        
        for conn in connections:
            local_addr = f"{conn.laddr.ip}" if conn.laddr else "N/A"
            local_port = conn.laddr.port if conn.laddr else "N/A"
            remote_addr = f"{conn.raddr.ip}" if conn.raddr else "N/A"
            remote_port = conn.raddr.port if conn.raddr else "N/A"
            
            table.add_row([local_addr, local_port, remote_addr, remote_port, conn.status])
        
        log_and_print(logger, log_file, "Network Connections:", table)

def calculate_file_hash(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def validate_process_exists(target_process):
    proc = subprocess.Popen(['where', target_process], 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE)
    proc.communicate()
    return proc.returncode == 0

def wait_for_process(target_process):
    for _ in range(20):
        for proc in psutil.process_iter(['name']):
            if proc.info['name'] == target_process:
                return proc.pid
        time.sleep(0.1)
    return None

def monitor_process(target_process):
    logger, log_file = setup_logging(target_process)
    
    if not validate_process_exists(target_process):
        logger.error(f"Cannot find process: {target_process}")
        return False

    process = subprocess.Popen(target_process)
    pid = wait_for_process(target_process)
    
    if not pid:
        logger.error("Failed to detect process after launching")
        return False

    process_details = get_process_details(pid)
    details_table = PrettyTable()
    details_table.field_names = ["Detail", "Value"]
    details_table.align = "l"
    for key, value in process_details.items():
        details_table.add_row([key, value])
    log_and_print(logger, log_file, "Process Details:", details_table)

    file_hash = calculate_file_hash(process_details["Executable Path"])
    log_and_print(logger, log_file, f"File SHA256 Hash: {file_hash}")

    event_handler = FileChangeHandler(logger)
    observer = Observer()
    
    drives = [partition.mountpoint for partition in psutil.disk_partitions()]
    for drive in drives:
        observer.schedule(event_handler, drive, recursive=True)
    
    observer.start()
    log_and_print(logger, log_file, f"Started file system monitoring on drives: {', '.join(drives)}")

    try:
        while psutil.pid_exists(pid):
            monitor_network_connections(pid, logger, log_file)
            monitor_registry_changes(logger, log_file)
            time.sleep(5)
    except KeyboardInterrupt:
        log_and_print(logger, log_file, "Monitoring stopped by user")
    finally:
        observer.stop()
        observer.join()
        log_and_print(logger, log_file, "Monitoring ended")

def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <program_name>")
        sys.exit(1)
    
    monitor_process(sys.argv[1])

if __name__ == "__main__":
    main()
```
