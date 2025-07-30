# INTRUDER-v2.7: A WiFi Penetration Testing Suite

**DISCLAIMER: This tool is for educational and authorized security testing purposes only. Unauthorized use against networks is illegal and unethical. The developers assume no liability for misuse.**

## Project Description

INTRUDER-v2.7 is a powerful and flexible WiFi penetration testing suite designed for security professionals and researchers. It provides a comprehensive set of tools to assess the security of wireless networks, from reconnaissance and packet sniffing to deauthentication attacks and password cracking.

## Features

*   **Network Scanning:** Discover nearby wireless networks and their configurations using the `sniffer` module.
*   **Packet Sniffing:** The `sniffer` module can be used to capture and analyze raw 802.11 frames.
*   **Deauthentication Attacks:** The `deauth` module can be used to disrupt network connectivity by sending deauthentication frames.
*   **WPA/WPA2 Handshake Capture:** The `sniffer` module can be used to capture WPA/WPA2 handshakes for offline password cracking.
*   **Password Cracking:** The `cracker` module uses `aircrack-ng` to crack captured WPA/WPA2 handshakes.
*   **Modular Architecture:** Easily extend the tool with new modules and attacks.

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/intruder-v2.7.git
cd intruder-v2.7

# Install dependencies
pip install -r requirements.txt

# Make sure you have aircrack-ng installed
# On Debian/Ubuntu:
sudo apt-get install aircrack-ng
```

## Usage Examples

### Scan for Networks

To scan for networks, you need to provide the name of your wireless interface.

```bash
python src/intruder.py scan --interface wlan0
```

### Capture a WPA Handshake

To capture a WPA handshake, you need to provide the BSSID, channel, and output file for the capture.

```bash
python src/intruder.py capture --bssid <BSSID> --channel <channel> --output handshake.pcap --interface wlan0
```

### Crack a Captured Handshake

To crack a captured handshake, you need to provide the path to the handshake file, a wordlist, and the BSSID of the target network.

```bash
python src/intruder.py crack --handshake handshake.pcap --wordlist /path/to/wordlist.txt --bssid <BSSID>
```

## Development

For information on how to contribute to the project, please see our `AGENTS.md` file. For API documentation, please see `docs/api.md`.

## Contributing

We welcome contributions from the community! Please see our `AGENTS.md` file for guidelines on how to contribute to the project.
