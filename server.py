#!/usr/bin/env python3
"""
iNTRUDER v2.7 - Final Production Server with Authentication and Secure Tooling
"""
import os
import sys
import json
import time
import random
import threading
import logging
import signal
import psutil
import secrets
import hashlib
import shlex
import shutil
import subprocess
import re
from flask import Flask, render_template, redirect, url_for, request
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
import pentest_tools
import database
import eventlet
from concurrent.futures import ThreadPoolExecutor

# --- Pre-initialization ---
eventlet.monkey_patch() #
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s') #

# --- App Initialization ---
app = Flask(__name__, static_folder='static', template_folder='templates') #
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32)) #
socketio = SocketIO(app, async_mode='eventlet') #
login_manager = LoginManager() #
login_manager.init_app(app) #
login_manager.login_view = 'login' #

# --- Global State and Helpers ---
executor = ThreadPoolExecutor(max_workers=10) #
running = True #
database.init_db() #
state = database.load_state_from_db() #
state.setdefault('monitor_mode_active', False) #
state.setdefault('selected_interface', None) #
state.setdefault('monitor_interface', None) #
state.setdefault('system_stats', {}) #
state.setdefault('clients', {}) #

state.setdefault('metrics', {
    'networks_found': len(state.get('networks', {})),
    'handshakes_captured': len(state.get('handshakes', [])),
    'deauth_attacks': 0,
    'cracking_sessions': 0,
    'clients_found': len(state.get('clients', {}))
}) #
state.setdefault('mission_context', {'active_task': 'standby', 'priority_target': None, 'last_suggestion': ''}) #

oui_lookup = pentest_tools.OUILookup() #
suggestion_phrases = {
    'recommend_scan': ["Spectrum clear. Recommend discovery scan."],
    'recommend_capture': ["Priority target {target} detected. Recommend handshake capture."],
    'recommend_pmkid': ["Target {target} supports PMKID. Suggesting direct capture."],
    'recommend_crack': ["Data for {target} acquired. Recommend offline analysis."],
} #

# --- User Management ---
class User(UserMixin):
    def __init__(self, id): self.id = id #

@login_manager.user_loader
def load_user(user_id): return User(user_id) #

# --- HTTP Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username') #
        password = request.form.get('password') #
        
        stored_hash = database.get_user_hash(username) #
        if not stored_hash:
            return "Invalid credentials", 401 #
        
        submitted_hash = hashlib.sha256(password.encode()).hexdigest() #

        if secrets.compare_digest(stored_hash, submitted_hash):
            login_user(User(username)) #
            return redirect(url_for('index')) #
        
        return "Invalid credentials", 401 #
    return render_template('login.html') #

@app.route('/logout')
@login_required
def logout():
    logout_user() #
    return redirect(url_for('login')) #

@app.route('/')
@login_required
def index(): return render_template('index.html') #

# --- SocketIO Event Handlers ---
def emit_assistant_directive(event, data): socketio.emit('assistant:directive', {'event': event, 'data': data}) #
def update_state(key, value): state[key] = value; socketio.emit('state_update', {'key': key, 'value': value}) #
def _emit_terminal(message, msg_type='info'): socketio.emit('terminal:output', {'message': message, 'type': msg_type}) #

@socketio.on('connect')
def handle_connect():
    if not current_user.is_authenticated: return False #
    initial_state = state.copy() #
    initial_state['clients_list'] = list(state['clients'].values()) #
    emit('initial_state', initial_state) #
    emit_assistant_directive('log', {'message': f'Spectre-7 online. Operator {current_user.id} authenticated.', 'type': 'info'}) #

@socketio.on('system:get_interfaces')
@login_required
def get_interfaces(): emit('system:interfaces_list', pentest_tools.get_wireless_interfaces()) #

@socketio.on('monitor:toggle')
@login_required
def handle_monitor_toggle(data): executor.submit(_toggle_monitor_mode, data.get('interface')) #

@socketio.on('network:scan')
@login_required
def handle_network_scan(data):
    emit_assistant_directive('log', {'message': 'Acknowledged. Wide-band spectrum analysis initiated.', 'type': 'info'}) #
    executor.submit(_run_network_scan, data.get('duration', 60)) #

@socketio.on('capture:handshake')
@login_required
def handle_handshake_capture(data):
    emit_assistant_directive('log', {'message': f"Acknowledged. Capturing handshake on {data.get('bssid')}.", 'type': 'info'}) #
    executor.submit(_run_handshake_capture, data) #

@socketio.on('capture:pmkid')
@login_required
def handle_pmkid_capture(data):
    emit_assistant_directive('log', {'message': f"Acknowledged. Initiating PMKID attack on {data.get('bssid')}.", 'type': 'info'}) #
    executor.submit(_run_pmkid_capture, data) #

@socketio.on('attack:deauth')
@login_required
def handle_deauth_attack(data):
    emit_assistant_directive('log', {'message': f"Executing deauth attack on {data.get('bssid')}.", 'type': 'info'}) #
    executor.submit(_run_deauth_attack, data) #

@socketio.on('attack:crack')
@login_required
def handle_crack_attack(data):
    emit_assistant_directive('log', {'message': f"Initiating offline analysis of {os.path.basename(data.get('file'))}.", 'type': 'info'}) #
    executor.submit(_run_crack_attack, data) #

@socketio.on('lan:discover_hosts')
@login_required
def handle_lan_discovery(data):
    interface = data.get('interface') #
    if not interface:
        _emit_terminal("No interface specified for LAN scan.", "error") #
        return #

    if state.get('monitor_mode_active') and state.get('selected_interface') == interface:
        _emit_terminal(f"Interface '{interface}' is in monitor mode. Cannot perform LAN scan.", "error") #
        _emit_terminal("Please select your active, non-monitoring LAN interface.", "warning") #
        return #
    
    emit_assistant_directive('log', {'message': f"Auditing local network segment on {interface}...", 'type': 'info'}) #
    executor.submit(_run_lan_discovery, interface) #

# --- Backend Logic Functions ---
def _analyze_mission_state():
    context = state['mission_context'] #
    if context['active_task'] not in ['standby', 'idle']: return #
    best_target, highest_power = None, -100 #
    for net in state['networks'].values():
        is_priority = (net['power'] > -65 and net.get('clients_count', 0) > 0 and net.get('wps', False)) #
        has_password = any(h.get('password') for h in state.get('handshakes', []) if h['bssid'] == net['bssid']) #
        if is_priority and not has_password and net['power'] > highest_power:
            highest_power, best_target = net['power'], net #
    context['priority_target'] = best_target #
    suggestion_key, target_name = 'recommend_scan', None #
    if best_target:
        target_name = best_target['essid'] or best_target['bssid'] #
        has_capture = any(h['bssid'] == best_target['bssid'] for h in state.get('handshakes', [])) #
        suggestion_key = 'recommend_crack' if has_capture else 'recommend_capture' #
        if not has_capture and 'WPA2' in best_target.get('privacy', ''):
            suggestion_key = 'recommend_pmkid' #
    final_message = random.choice(suggestion_phrases[suggestion_key]).format(target=target_name) #
    if final_message != context.get('last_suggestion'):
        emit_assistant_directive('suggest', {'message': final_message, 'mood': 'success' if best_target else 'thinking'}) #
        context['last_suggestion'] = final_message #

def _toggle_monitor_mode(interface):
    if not interface: emit_assistant_directive('log', {'message': "No interface selected.", 'type': 'error'}); return #
    state['selected_interface'] = interface #
    if state['monitor_mode_active']:
        result = pentest_tools.disable_monitor_mode(state['monitor_interface']) #
        if result['success']:
            update_state('monitor_mode_active', False) #
            _cleanup_passive_monitors() #
        else: emit_assistant_directive('log', {'message': f"Failed to disable monitor mode: {result.get('error','')}", 'type': 'error'}) #
    else:
        result = pentest_tools.enable_monitor_mode(interface) #
        if result['success']:
            update_state('monitor_mode_active', True) #
            update_state('monitor_interface', result['interface']) #
            _start_passive_monitors(result['interface']) #
        else: emit_assistant_directive('log', {'message': f"Failed to enable monitor mode: {result.get('error','')}", 'type': 'error'}) #

def _run_network_scan(duration):
    if not state['monitor_mode_active']: emit_assistant_directive('log', {'message': "Enable Monitor Mode first.", 'type': 'error'}); return #
    state['mission_context']['active_task'] = 'scanning'; update_state('scanning', True) #
    emit_assistant_directive('mood_change', {'mood': 'thinking'}) #
    try:
        scanner = pentest_tools.WifiScanner(state.get('monitor_interface')) #
        if scanner.start_scan(duration):
            socketio.sleep(duration + 2) #
            scanner.stop_scan() #
            live_networks, live_clients = scanner.parse_scan_results(oui_lookup) #
            for net in live_networks:
                state['networks'][net['bssid']] = net #
                database.save_network(net) #
            for client in live_clients:
                state['clients'][client['mac']] = client #
                database.save_client(client) #
            wps_bssids = pentest_tools.run_wps_scan(state.get('monitor_interface'), 20) #
            for bssid, net_data in state['networks'].items():
                net_data['wps'] = bssid in wps_bssids #
                database.save_network(net_data) #
            update_state('networks', state['networks']) #
            socketio.emit('state_update', {'key': 'clients', 'value': list(state['clients'].values())}) #
            state['metrics']['networks_found'] = len(state['networks']) #
            state['metrics']['clients_found'] = len(state['clients']) #
            socketio.emit('metrics:update', state['metrics']) #
            _emit_terminal("Full spectrum analysis complete. Networks and clients updated.", "success") #
        else:
            _emit_terminal("Network scan failed to start or produce output.", "error") #
    except Exception as e:
        _emit_terminal(f"Scan cycle error: {e}", "error") #
        logging.error(f"Scan cycle error: {e}", exc_info=True) #
    finally:
        state['mission_context']['active_task'] = 'standby'; update_state('scanning', False) #
        emit_assistant_directive('mood_change', {'mood': 'idle'}) #

def _run_handshake_capture(data):
    state['mission_context']['active_task'] = 'capturing' #
    emit_assistant_directive('mood_change', {'mood': 'thinking'}) #
    try:
        for status in pentest_tools.capture_handshake(state['monitor_interface'], data.get('bssid'), data.get('channel'), data.get('essid')):
            if status.get('type') == 'handshake_captured':
                capture_data = status['data']; capture_data['type'] = 'handshake'; capture_data['essid'] = data.get('essid') #
                database.save_capture(capture_data); state.get('handshakes', []).append(capture_data) #
                update_state('handshakes', state['handshakes']); state['metrics']['handshakes_captured'] += 1; socketio.emit('metrics:update', state['metrics']) #
                emit_assistant_directive('log', {'message': 'Handshake intercepted.', 'type': 'suggestion'}) #
            else: _emit_terminal(status['message'], status.get('msg_type', 'info')) #
    finally:
        state['mission_context']['active_task'] = 'standby' #
        emit_assistant_directive('mood_change', {'mood': 'idle'}) #

def _run_pmkid_capture(data):
    state['mission_context']['active_task'] = 'capturing_pmkid' #
    emit_assistant_directive('mood_change', {'mood': 'thinking'}) #
    try:
        for status in pentest_tools.capture_pmkid(state['monitor_interface'], data.get('bssid'), data.get('essid'), data.get('channel')):
            if status.get('type') == 'pmkid_captured':
                capture_data = status['data'] #
                database.save_capture(capture_data) #
                state.get('handshakes', []).append(capture_data) #
                update_state('handshakes', state['handshakes']) #
                state['metrics']['handshakes_captured'] += 1 #
                socketio.emit('metrics:update', state['metrics']) #
                emit_assistant_directive('log', {'message': 'PMKID acquired.', 'type': 'suggestion'}) #
            else:
                _emit_terminal(status['message'], status.get('msg_type', 'info')) #
    finally:
        state['mission_context']['active_task'] = 'standby' #
        emit_assistant_directive('mood_change', {'mood': 'idle'}) #

def _run_deauth_attack(data):
    state['mission_context']['active_task'] = 'attacking' #
    state['metrics']['deauth_attacks'] += 1 #
    socketio.emit('metrics:update', state['metrics']) #
    try:
        for line in pentest_tools.deauth_attack(state['monitor_interface'], data.get('bssid'), data.get('client'), data.get('count')):
            _emit_terminal(line, "info") #
    finally:
        state['mission_context']['active_task'] = 'standby' #

def _run_crack_attack(data):
    state['mission_context']['active_task'] = 'cracking' #
    state['metrics']['cracking_sessions'] += 1 #
    socketio.emit('metrics:update', state['metrics']) #
    emit_assistant_directive('mood_change', {'mood': 'thinking'}) #
    try:
        for status in pentest_tools.crack_handshake(data.get('file'), data.get('wordlist')):
            if status.get('type') == 'password_found':
                password, file_path = status['password'], data.get('file') #
                database.update_capture_with_password(file_path, password) #
                for h in state.get('handshakes', []):
                    if h['file'] == file_path:
                        h['password'] = password #
                        emit_assistant_directive('log', {'message': f"PASSWORD FOUND for {h['essid']}: {password}", 'type': 'suggestion'}) #
                        break #
                update_state('handshakes', state['handshakes']) #
                emit_assistant_directive('mood_change', {'mood': 'success'}) #
            else:
                _emit_terminal(status['message'], status.get('msg_type', 'info')) #
    finally:
        state['mission_context']['active_task'] = 'standby' #
        emit_assistant_directive('mood_change', {'mood': 'idle'}) #

def _run_lan_discovery(interface):
    state['mission_context']['active_task'] = 'lan_scanning' #
    emit_assistant_directive('mood_change', {'mood': 'thinking'}) #
    
    result = pentest_tools.discover_lan_hosts(interface) #
    
    if result['success']:
        hosts = result.get('hosts', []) #
        socketio.emit('lan:hosts_discovered', {'hosts': hosts}) #
        _emit_terminal(f"LAN scan complete. Found {len(hosts)} devices on {interface}.", "success") #
    else:
        error_msg = result.get('error', 'An unknown error occurred during LAN scan.') #
        _emit_terminal(f"LAN Scan Failed: {error_msg}", "error") #
        emit_assistant_directive('log', {'message': 'LAN audit failed.', 'type': 'error'}) #

    state['mission_context']['active_task'] = 'standby' #
    emit_assistant_directive('mood_change', {'mood': 'idle'}) #

# --- Passive Monitoring Integration ---
_p0f_process = None #
_tshark_dns_process = None #
_tshark_name_res_process = None #

def _start_passive_monitors(interface):
    global _p0f_process, _tshark_dns_process, _tshark_name_res_process #
    s_iface = shlex.quote(interface) #
    if shutil.which('p0f'):
        p0f_command = f"p0f -i {s_iface} -o - -q" #
        logging.info(f"Starting p0f: {p0f_command}") #
        _p0f_process = subprocess.Popen(shlex.split(p0f_command), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, universal_newlines=True, preexec_fn=os.setsid) #
        socketio.start_background_task(_read_p0f_output) #
    else:
        logging.warning("p0f not found. Passive OS fingerprinting will be disabled.") #
        _emit_terminal("Warning: p0f not found. Install 'p0f' for passive OS fingerprinting.", "warning") #
    if shutil.which('tshark'):
        dns_command = f"tshark -i {s_iface} -f 'udp port 53' -l -T fields -e ip.src -e dns.qry.name -e dns.a" #
        logging.info(f"Starting tshark for DNS monitoring: {dns_command}") #
        _tshark_dns_process = subprocess.Popen(shlex.split(dns_command), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, universal_newlines=True, preexec_fn=os.setsid) #
        socketio.start_background_task(_read_tshark_dns_output) #
        name_res_command = f"tshark -i {s_iface} -f 'udp port 5353 or udp port 5355 or udp port 137' -l -T fields -e ip.src -e nbns.name_trn_id -e mdns.qry.name -e llmnr.qry.name -e nbns.name" #
        logging.info(f"Starting tshark for name resolution monitoring: {name_res_command}") #
        _tshark_name_res_process = subprocess.Popen(shlex.split(name_res_command), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, universal_newlines=True, preexec_fn=os.setsid) #
        socketio.start_background_task(_read_tshark_name_res_output) #
    else:
        logging.warning("tshark not found. Passive DNS and Name Resolution monitoring will be disabled.") #
        _emit_terminal("Warning: tshark not found. Install 'tshark' for detailed passive monitoring.", "warning") #

def _cleanup_passive_monitors():
    global _p0f_process, _tshark_dns_process, _tshark_name_res_process #
    for proc in [_p0f_process, _tshark_dns_process, _tshark_name_res_process]:
        if proc and proc.poll() is None:
            try:
                logging.info(f"Terminating passive monitor process with PID: {proc.pid}") #
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM) #
                proc.wait(timeout=5) #
            except (ProcessLookupError, subprocess.TimeoutExpired):
                logging.warning(f"Process {proc.pid} did not terminate, sending SIGKILL.") #
                if proc.poll() is None: os.killpg(os.getpgid(proc.pid), signal.SIGKILL) #
            except Exception as e:
                logging.error(f"Error terminating process {proc.pid}: {e}") #
    _p0f_process, _tshark_dns_process, _tshark_name_res_process = None, None, None #

def _read_p0f_output():
    if not _p0f_process or not _p0f_process.stdout: return #
    for line in iter(_p0f_process.stdout.readline, ''):
        if not running: break #
        line = line.strip() #
        if not line: continue #
        parts = {k.strip(): v.strip() for k,v in (p.split('=', 1) for p in line.split('|') if '=' in p)} #
        src_ip = parts.get('src') #
        os_str = parts.get('os') #
        if src_ip and os_str:
            mac_address = _get_mac_from_ip(src_ip) #
            if mac_address and mac_address in state['clients']:
                os_info = {'os_raw': os_str, 'last_seen': time.time()} #
                database.update_client_os_info(mac_address, os_info) #
                state['clients'][mac_address].setdefault('os_info', {}).update(os_info) #
                socketio.emit('state_update', {'key': 'clients', 'value': list(state['clients'].values())}) #
                _emit_terminal(f"P0f detected OS for {mac_address}: {os_str}", "info") #
        socketio.sleep(0.1) #

def _get_mac_from_ip(ip_address):
    try:
        result = subprocess.run(f"arp -n {shlex.quote(ip_address)}", capture_output=True, text=True, shell=True) #
        if result.returncode == 0:
            match = re.search(r'([0-9a-fA-F:]{17})\s+ether', result.stdout) #
            if match: return match.group(1).upper() #
    except Exception as e:
        logging.debug(f"Could not get MAC for IP {ip_address} from ARP: {e}") #
    return None #

def _read_tshark_dns_output():
    if not _tshark_dns_process or not _tshark_dns_process.stdout: return #
    for line in iter(_tshark_dns_process.stdout.readline, ''):
        if not running: break #
        line = line.strip() #
        if not line: continue #
        parts = line.split('\t') #
        if len(parts) >= 2:
            src_ip, query_name = parts[0], parts[1] #
            mac_address = _get_mac_from_ip(src_ip) #
            _emit_terminal(f"DNS Query from {mac_address or src_ip}: {query_name}", "info") #
        socketio.sleep(0.1) #

def _read_tshark_name_res_output():
    if not _tshark_name_res_process or not _tshark_name_res_process.stdout: return #
    for line in iter(_tshark_name_res_process.stdout.readline, ''):
        if not running: break #
        line = line.strip() #
        if not line: continue #
        parts = line.split('\t') #
        if len(parts) >= 2:
            src_ip = parts[0] #
            hostname_parts = [p for p in parts[1:] if p and p.strip() and not re.match(r'^[0-9A-Fa-f]{4}$', p.strip())] #
            hostname = hostname_parts[0].split('.')[0].upper() if hostname_parts else None #
            if hostname:
                mac_address = _get_mac_from_ip(src_ip) #
                if mac_address and mac_address in state['clients'] and state['clients'][mac_address].get('hostname') != hostname:
                    database.update_client_hostname(mac_address, hostname) #
                    state['clients'][mac_address]['hostname'] = hostname #
                    socketio.emit('state_update', {'key': 'clients', 'value': list(state['clients'].values())}) #
                    _emit_terminal(f"Discovered Hostname for {mac_address}: {hostname}", "success") #
        socketio.sleep(0.1) #

# --- Background Tasks ---
def start_background_tasks():
    def system_monitor():
        while running:
            try:
                stats = {'cpu_usage': psutil.cpu_percent(), 'memory_usage': psutil.virtual_memory().percent} #
                socketio.emit('system:stats', stats) #
            except Exception: pass #
            socketio.sleep(5) #
    socketio.start_background_task(system_monitor) #
    def mission_analyzer_loop():
        while running:
            socketio.sleep(10) #
            try: _analyze_mission_state() #
            except Exception as e: logging.error(f"Mission analyzer error: {e}") #
    socketio.start_background_task(mission_analyzer_loop) #
    if state.get('monitor_mode_active') and state.get('monitor_interface'):
        logging.info("Monitor mode active from previous session, starting passive monitors.") #
        _start_passive_monitors(state['monitor_interface']) #

# --- Main Execution Block ---
def run_production_server():
    """
    Main server execution logic, wrapped in a function to be callable
    by the desktop launcher.
    """
    def signal_handler(sig, frame):
        global running #
        running = False #
        _cleanup_passive_monitors() #
        pentest_tools.cleanup_processes() #
        sys.exit(0) #

    signal.signal(signal.SIGINT, signal_handler) #
    signal.signal(signal.SIGTERM, signal_handler) #

    if os.geteuid() != 0:
        sys.exit("This script must be run as root to control wireless interfaces and bind to port 443.") #

    if not database.get_user_hash('admin'):
        new_password = secrets.token_urlsafe(16) #
        password_hash = hashlib.sha256(new_password.encode()).hexdigest() #
        database.create_user('admin', password_hash) #
        print("="*60) #
        print("          INTRUDER FIRST-TIME SETUP          ") #
        print("="*60) #
        print(f"No admin user found. A new one has been created.") #
        print(f"USERNAME: admin") #
        print(f"PASSWORD: {new_password}") #
        print("\nTHIS PASSWORD WILL NOT BE SHOWN AGAIN.") #
        print("Please store it in a secure location.") #
        print("You can view logs via: 'journalctl -u intruder.service -f'") #
        print("="*60) #
        logging.info(f"FIRST RUN: Created admin user with password: {new_password}") #

    start_background_tasks() #

    # Use relative paths assuming execution from /opt/intruder
    CERT_DIR = "certs" #
    CERT_FILE = os.path.join(CERT_DIR, "cert.pem") #
    KEY_FILE = os.path.join(CERT_DIR, "key.pem") #

    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        logging.info(f"Starting iNTRUDER server on https://0.0.0.0:443") #
        socketio.run(app, host='0.0.0.0', port=443, certfile=CERT_FILE, keyfile=KEY_FILE) #
    else:
        logging.warning("SSL certificates not found in ./certs.") #
        logging.warning("Falling back to HTTP on port 5000. This is NOT recommended for production.") #
        logging.warning("Run install.sh to generate certificates.") #
        socketio.run(app, host='0.0.0.0', port=5000) #

if __name__ == '__main__':
    run_production_server() #