import unittest
from unittest.mock import patch
from src.deauth import deauth_attack
from scapy.all import *

class TestDeauth(unittest.TestCase):

    @patch('src.deauth.sendp')
    def test_deauth_attack(self, mock_sendp):
        deauth_attack("00:11:22:33:44:55", "FF:FF:FF:FF:FF:FF", "test_iface", count=50)

        # Check that sendp was called
        mock_sendp.assert_called()

        # Get the packet from the call arguments
        args, kwargs = mock_sendp.call_args
        packet = args[0]

        # Verify the packet structure and content
        self.assertTrue(packet.haslayer(Dot11Deauth))
        self.assertEqual(packet.addr1, "FF:FF:FF:FF:FF:FF")
        self.assertEqual(packet.addr2, "00:11:22:33:44:55")
        self.assertEqual(kwargs['iface'], "test_iface")
        self.assertEqual(kwargs['count'], 50)

if __name__ == '__main__':
    unittest.main()
