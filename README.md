# INTRUDER-v2.7: A WiFi Penetration Testing Suite

**DISCLAIMER: This tool is for educational and authorized security testing purposes only. Unauthorized use against networks is illegal and unethical. The developers assume no liability for misuse.**

## Project Description

INTRUDER-v2.7 is a powerful and flexible WiFi penetration testing suite designed for security professionals and researchers. It provides a comprehensive set of tools to assess the security of wireless networks, from reconnaissance and packet sniffing to deauthentication attacks and password cracking.

## Features

*   **Network Scanning:** Discover nearby wireless networks and their configurations.
*   **Packet Sniffing:** Capture and analyze raw 802.11 frames.
*   **Deauthentication Attacks:** Disrupt network connectivity by sending deauthentication frames.
*   **WPA/WPA2 Handshake Capture:** Capture WPA/WPA2 handshakes for offline password cracking.
*   **Password Cracking:** A built-in password cracker that supports various wordlists and cracking techniques.
*   **Modular Architecture:** Easily extend the tool with new modules and attacks.

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/intruder-v2.7.git
cd intruder-v2.7

# Install dependencies
pip install -r requirements.txt

# Run the tool
python intruder.py --help
```

## Usage Examples

### Scan for Networks

```bash
python intruder.py scan
```

### Capture a WPA Handshake

```bash
python intruder.py capture --bssid <BSSID> --channel <channel> --output handshake.pcap
```

### Crack a Captured Handshake

```bash
python intruder.py crack --handshake handshake.pcap --wordlist /path/to/wordlist.txt
```

## Contributing

We welcome contributions from the community! Please see our `AGENTS.md` file for guidelines on how to contribute to the project.
