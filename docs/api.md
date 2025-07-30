# API Documentation

This document provides a detailed overview of the API for each module in the INTRUDER-v2.7 suite.

## `sniffer` Module

### `get_networks(interface)`

This function sniffs for nearby WiFi networks and returns a list of dictionaries, where each dictionary represents a network and contains the BSSID, SSID, and channel.

*   **`interface` (str):** The name of the wireless interface to use for sniffing.
*   **Returns:** A dictionary of networks, or `None` if an error occurs.

## `deauth` Module

### `deauth_attack(target_bssid, client_mac, interface, count=100)`

This function performs a deauthentication attack against a client on a specific BSSID.

*   **`target_bssid` (str):** The BSSID of the target network.
*   **`client_mac` (str):** The MAC address of the client to deauthenticate. Use "FF:FF:FF:FF:FF:FF" to deauthenticate all clients.
*   **`interface` (str):** The name of the wireless interface to use for the attack.
*   **`count` (int, optional):** The number of deauthentication packets to send. Defaults to 100.

## `cracker` Module

### `crack_handshake(handshake_file, wordlist_file, bssid)`

This function attempts to crack a WPA/WPA2 handshake using aircrack-ng.

*   **`handshake_file` (str):** The path to the capture file containing the WPA/WPA2 handshake.
*   **`wordlist_file` (str):** The path to the wordlist file to use for the attack.
*   **`bssid` (str):** The BSSID of the target network.
