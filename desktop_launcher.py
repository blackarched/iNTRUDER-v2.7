import os
import sys
import threading
import subprocess
import time
import webview
from server import run_production_server  # Import the new runner function

def main():
    """
    Main function to handle privilege checks, start the server,
    and launch the PyWebView window.
    """
    # 1) Handle Root Privilege Requirements
    # The core functions in pentest_tools require root. This will use pkexec
    # to pop up a graphical password prompt for the user.
    if os.geteuid() != 0:
        print("Root privileges are required. Relaunching with pkexec...")
        try:
            # Relaunch the script with elevated privileges
            subprocess.check_call(['pkexec', sys.executable] + sys.argv)
            sys.exit()  # Exit the non-privileged parent process
        except subprocess.CalledProcessError:
            print("Failed to acquire root privileges. Exiting.")
            sys.exit(1)
        except FileNotFoundError:
            print("pkexec not found. Please run this script with 'sudo'.")
            sys.exit(1)

    print("Root privileges acquired.")

    # 2) Start the web server in a background thread
    # This thread will be terminated when the main app closes (daemon=True)
    server_thread = threading.Thread(target=run_production_server, daemon=True)
    server_thread.start()
    print("Server thread started in the background.")

    # 3) Give the server a moment to spin up
    time.sleep(2)

    # 4) Launch a PyWebView window pointed at the local HTTPS server
    print("Launching desktop window...")
    # This environment variable is often needed on Linux to allow self-signed certs
    os.environ['WEBKIT_IGNORE_SSL_ERRORS'] = '1'
    
    webview.create_window(
        "iNTRUDER Desktop",
        "https://127.0.0.1:443/", # Point to the correct HTTPS URL
        width=1400,
        height=900,
        resizable=True
    )
    webview.start()
    print("Desktop window closed. Exiting.")

if __name__ == '__main__':
    main()