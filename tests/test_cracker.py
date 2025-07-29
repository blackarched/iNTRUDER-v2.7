import unittest
from unittest.mock import patch, mock_open, MagicMock
from src.cracker import crack_handshake
from scapy.all import *

class TestCracker(unittest.TestCase):

    @patch('src.cracker.rdpcap')
    @patch('builtins.open', new_callable=mock_open, read_data='password123\n')
    def test_crack_handshake(self, mock_file, mock_rdpcap):
        # Create mock EAPOL packets
        mock_eapol_packet = MagicMock()
        mock_eapol_packet.haslayer.return_value = True

        # Configure rdpcap to return the mock packets
        mock_rdpcap.return_value = [mock_eapol_packet, mock_eapol_packet]

        crack_handshake("test.pcap", "test_wordlist.txt")

        # Verify that rdpcap was called with the correct file
        mock_rdpcap.assert_called_with("test.pcap")

        # Verify that the wordlist was opened
        mock_file.assert_called_with("test_wordlist.txt", 'r', encoding='utf-8', errors='ignore')

if __name__ == '__main__':
    unittest.main()
