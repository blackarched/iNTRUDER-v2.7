import subprocess
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def crack_handshake(handshake_file, wordlist_file, bssid):
    """
    Attempts to crack a WPA/WPA2 handshake using aircrack-ng.
    """
    if not os.path.exists(handshake_file):
        logging.error(f"Handshake file not found at {handshake_file}")
        return
    if not os.path.exists(wordlist_file):
        logging.error(f"Wordlist file not found at {wordlist_file}")
        return

    logging.info(f"Attempting to crack {handshake_file} with {wordlist_file} for BSSID {bssid}...")

    command = [
        "aircrack-ng",
        "-w", wordlist_file,
        "-b", bssid,
        handshake_file
    ]

    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()

        if "KEY FOUND!" in stdout:
            logging.info("Key found!")
            # Extract and print the key
            for line in stdout.splitlines():
                if "KEY FOUND!" in line:
                    print(line)
                    break
        elif "No matching network found" in stderr:
            logging.info("No matching network found for the specified BSSID.")
        else:
            logging.info("Password not found in the wordlist.")

    except FileNotFoundError:
        logging.error("aircrack-ng not found. Please make sure it is installed and in your PATH.")
    except Exception as e:
        logging.error(f"An error occurred: {e}")

if __name__ == '__main__':
    # Replace with your file paths and BSSID
    handshake_file = "handshake.pcap"
    wordlist_file = "wordlist.txt"
    bssid = "00:11:22:33:44:55"

    # Create a dummy wordlist for testing
    with open(wordlist_file, "w") as f:
        f.write("password123\n")
        f.write("qwertyuiop\n")

    # This will likely fail unless you have a valid handshake file and aircrack-ng installed.
    # The purpose of this is to demonstrate the integration.
    crack_handshake(handshake_file, wordlist_file, bssid)
