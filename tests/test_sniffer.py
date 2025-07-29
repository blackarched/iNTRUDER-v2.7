import unittest
from unittest.mock import patch, MagicMock
from src.sniffer import get_networks
from scapy.all import *

class TestSniffer(unittest.TestCase):

    @patch('src.sniffer.sniff')
    def test_get_networks(self, mock_sniff):
        # Create a mock packet
        mock_packet = MagicMock()
        mock_packet.haslayer.return_value = True

        # Create mock layers
        dot11_layer = MagicMock()
        dot11_layer.addr2 = "00:11:22:33:44:55"

        dot11elt_layer = MagicMock()
        dot11elt_layer.info.decode.return_value = "Test_SSID"

        dot11elt_layer_channel = MagicMock()
        dot11elt_layer_channel.info = b'\x03' # Channel 3

        # Configure the packet mock to return the mock layers
        def getitem_side_effect(key):
            if key == Dot11:
                return dot11_layer
            elif key == Dot11Elt:
                return dot11elt_layer
            elif isinstance(key, slice) and key.start == Dot11Elt and key.stop == 3:
                return dot11elt_layer_channel
            raise KeyError(key)

        mock_packet.__getitem__.side_effect = getitem_side_effect

        # Configure the sniff function to call the packet handler with the mock packet
        def sniff_side_effect(iface, prn, timeout):
            prn(mock_packet)

        mock_sniff.side_effect = sniff_side_effect

        networks = get_networks("test_iface")

        self.assertIn("00:11:22:33:44:55", networks)
        self.assertEqual(networks["00:11:22:33:44:55"]["ssid"], "Test_SSID")
        self.assertEqual(networks["00:11:22:33:44:55"]["channel"], 3)


if __name__ == '__main__':
    unittest.main()
