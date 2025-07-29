from scapy.all import *

def get_networks(interface):
    """
    Sniffs for nearby WiFi networks and returns a list of dictionaries,
    where each dictionary represents a network and contains the BSSID, SSID,
    and channel.
    """
    networks = {}
    def packet_handler(packet):
        if packet.haslayer(Dot11Beacon) or packet.haslayer(Dot11ProbeResp):
            bssid = packet[Dot11].addr2
            ssid = packet[Dot11Elt].info.decode()
            try:
                channel = int(ord(packet[Dot11Elt:3].info))
            except:
                channel = 0  # Could not determine channel

            if bssid not in networks:
                networks[bssid] = {"ssid": ssid, "channel": channel}
                print(f"Found new network: {ssid} ({bssid}) on channel {channel}")

    sniff(iface=interface, prn=packet_handler, timeout=10)
    return networks

if __name__ == '__main__':
    # Replace 'wlan0' with your wireless interface
    networks = get_networks('wlan0')
    print("\n--- Scan Complete ---")
    for bssid, network in networks.items():
        print(f"SSID: {network['ssid']}, BSSID: {bssid}, Channel: {network['channel']}")
