import sqlite3
import json
import logging
import time

DB_FILE = 'intruder_state.db'

def init_db():
    """Initializes the database and creates tables if they don't exist."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Networks table to store discovered APs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS networks (
                bssid TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )
        ''')
        
        # Handshakes table for both WPA handshakes and PMKIDs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS captures (
                bssid TEXT NOT NULL,
                capture_type TEXT NOT NULL, -- 'handshake' or 'pmkid'
                file_path TEXT PRIMARY KEY,
                password TEXT,
                essid TEXT
            )
        ''')

        # Clients table to store discovered stations (clients)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clients (
                mac TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                last_seen REAL NOT NULL -- Timestamp for freshness
            )
        ''')
        
        # Users table for secure credential storage
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        logging.info("Database initialized successfully.")
    except sqlite3.Error as e:
        logging.error(f"Database error during initialization: {e}")

def get_user_hash(username):
    """Retrieves the password hash for a given username."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None
    except sqlite3.Error as e:
        logging.error(f"Failed to retrieve user {username}: {e}")
        return None

def create_user(username, password_hash):
    """Creates a new user with a hashed password."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.Error as e:
        logging.error(f"Failed to create user {username}: {e}")
        return False

def save_network(network_data):
    """Saves or updates a network's data in the database."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO networks (bssid, data) VALUES (?, ?)",
            (network_data['bssid'], json.dumps(network_data))
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Failed to save network {network_data.get('bssid')}: {e}")

def save_client(client_data):
    """Saves or updates a client's data in the database."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO clients (mac, data, last_seen) VALUES (?, ?, ?)",
            (client_data['mac'], json.dumps(client_data), time.time())
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Failed to save client {client_data.get('mac')}: {e}")

def update_client_os_info(mac, os_info):
    """Updates a client's OS information."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM clients WHERE mac = ?", (mac,))
        result = cursor.fetchone()
        if result:
            client_data = json.loads(result[0])
            client_data['os_info'] = client_data.get('os_info', {})
            client_data['os_info'].update(os_info) # Merge new OS info
            cursor.execute(
                "UPDATE clients SET data = ?, last_seen = ? WHERE mac = ?",
                (json.dumps(client_data), time.time(), mac)
            )
            conn.commit()
            logging.debug(f"Updated OS info for client {mac}")
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Failed to update OS info for client {mac}: {e}")

def update_client_hostname(mac, hostname):
    """Updates a client's hostname."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM clients WHERE mac = ?", (mac,))
        result = cursor.fetchone()
        if result:
            client_data = json.loads(result[0])
            client_data['hostname'] = hostname
            cursor.execute(
                "UPDATE clients SET data = ?, last_seen = ? WHERE mac = ?",
                (json.dumps(client_data), time.time(), mac)
            )
            conn.commit()
            logging.debug(f"Updated hostname for client {mac}")
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Failed to update hostname for client {mac}: {e}")

def save_capture(capture_data):
    """Saves a new handshake or PMKID capture."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO captures (bssid, capture_type, file_path, password, essid) VALUES (?, ?, ?, ?, ?)",
            (
                capture_data['bssid'],
                capture_data['type'],
                capture_data['file'],
                capture_data.get('password'),
                capture_data.get('essid')
            )
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logging.error(f"Failed to save capture for {capture_data.get('bssid')}: {e}")

def update_capture_with_password(file_path, password):
    """Updates a capture record with a found password."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE captures SET password = ? WHERE file_path = ?",
            (password, file_path)
        )
        conn.commit()
        conn.close()
        logging.info(f"Updated password for {file_path}")
    except sqlite3.Error as e:
        logging.error(f"Failed to update password for {file_path}: {e}")

def load_state_from_db():
    """Loads the entire application state from the database on startup."""
    state = {'networks': {}, 'handshakes': [], 'clients': {}}
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        # Load networks
        cursor.execute("SELECT bssid, data FROM networks")
        for bssid, data in cursor.fetchall():
            state['networks'][bssid] = json.loads(data)

        # Load captures
        cursor.execute("SELECT bssid, capture_type, file_path, password, essid FROM captures")
        for bssid, capture_type, file_path, password, essid in cursor.fetchall():
            state['handshakes'].append({
                'bssid': bssid,
                'type': capture_type,
                'file': file_path,
                'password': password,
                'essid': essid
            })
        
        # Load clients
        cursor.execute("SELECT mac, data FROM clients")
        for mac, data in cursor.fetchall():
            client_data = json.loads(data)
            state['clients'][mac] = client_data
        
        conn.close()
        logging.info("Loaded previous state from database.")
    except sqlite3.Error as e:
        logging.error(f"Could not load state from database: {e}. Starting fresh.")
    
    return state