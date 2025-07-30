import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import socketio
import threading
import queue
import time
from PIL import Image, ImageTk
import requests
from io import BytesIO

# --- Main Application Class ---
class IntruderClientGUI:
    def __init__(self, master):
        self.master = master
        self.master.title("iNTRUDER v2.6 - Windows C2 Client")
        self.master.geometry("1200x800")
        self.master.configure(bg="#0a0a0a")

        # --- State Management ---
        self.is_connected = False
        self.ws_client = None
        self.ws_thread = None
        self.gui_queue = queue.Queue()

        # --- Style Configuration ---
        self.style = ttk.Style()
        self.style.theme_use('clam')
        # Configure styles for a dark, cyberpunk theme
        self.style.configure("TFrame", background="#16213e")
        self.style.configure("TLabel", background="#16213e", foreground="#00ffff", font=('Segoe UI', 10))
        self.style.configure("TButton", background="#0a0a0a", foreground="#00ffff", bordercolor="#00ffff", font=('Segoe UI', 10, 'bold'))
        self.style.map("TButton", background=[('active', '#00ffff')], foreground=[('active', '#0a0a0a')])
        self.style.configure("Treeview", background="#0a0a0a", foreground="#e0e0e0", fieldbackground="#0a0a0a", rowheight=25)
        self.style.configure("Treeview.Heading", background="#1a1a2e", foreground="#00ffff", font=('Segoe UI', 10, 'bold'))
        self.style.map("Treeview.Heading", background=[('active', '#16213e')])

        # --- UI Layout ---
        self.create_widgets()
        self.process_queue()

    def create_widgets(self):
        # --- Top Connection Frame ---
        top_frame = ttk.Frame(self.master, padding="10")
        top_frame.pack(side=tk.TOP, fill=tk.X)

        ttk.Label(top_frame, text="Server IP:").pack(side=tk.LEFT, padx=5)
        self.server_ip_entry = ttk.Entry(top_frame, width=20)
        self.server_ip_entry.insert(0, "127.0.0.1:5000")
        self.server_ip_entry.pack(side=tk.LEFT, padx=5)

        self.connect_button = ttk.Button(top_frame, text="Connect", command=self.toggle_connection)
        self.connect_button.pack(side=tk.LEFT, padx=5)

        # --- Main Content Paned Window ---
        main_pane = tk.PanedWindow(self.master, orient=tk.HORIZONTAL, bg="#1a1a2e", sashwidth=5, sashrelief=tk.RAISED)
        main_pane.pack(fill=tk.BOTH, expand=True)

        # --- Left Pane (Controls & Assistant) ---
        left_pane = ttk.Frame(main_pane, width=300, padding=10)
        main_pane.add(left_pane, minsize=300)

        # Control Frame
        control_frame = ttk.LabelFrame(left_pane, text="Operational Controls", padding=10)
        control_frame.pack(side=tk.TOP, fill=tk.X, pady=5)
        
        ttk.Label(control_frame, text="Interface:").pack(fill=tk.X)
        self.interface_var = tk.StringVar()
        self.interface_menu = ttk.Combobox(control_frame, textvariable=self.interface_var, state="readonly")
        self.interface_menu.pack(fill=tk.X, pady=5)

        self.monitor_button = ttk.Button(control_frame, text="Enable Monitor Mode", command=self.toggle_monitor_mode, state=tk.DISABLED)
        self.monitor_button.pack(fill=tk.X, pady=5)

        self.scan_button = ttk.Button(control_frame, text="Scan for Networks", command=self.start_scan, state=tk.DISABLED)
        self.scan_button.pack(fill=tk.X, pady=5)

        # Assistant Frame
        assistant_frame = ttk.LabelFrame(left_pane, text="Spectre-7 Assistant", padding=10)
        assistant_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=10)

        # Avatar and Status
        avatar_status_frame = ttk.Frame(assistant_frame)
        avatar_status_frame.pack(fill=tk.X, pady=5)
        
        self.avatar_label = ttk.Label(avatar_status_frame)
        self.avatar_label.pack(side=tk.LEFT, padx=10)
        self.load_image_from_url("https://i.imgur.com/80g22dn.gif", self.avatar_label) # Placeholder idle GIF

        status_text_frame = ttk.Frame(avatar_status_frame)
        status_text_frame.pack(side=tk.LEFT)
        ttk.Label(status_text_frame, text="Spectre-7", font=('Segoe UI', 12, 'bold')).pack(anchor='w')
        self.status_label = ttk.Label(status_text_frame, text="Status: Disconnected")
        self.status_label.pack(anchor='w')

        # Assistant Log
        self.assistant_log = scrolledtext.ScrolledText(assistant_frame, height=10, bg="#0a0a0a", fg="#00ff41", font=('Courier New', 9), relief=tk.FLAT, borderwidth=1)
        self.assistant_log.pack(fill=tk.BOTH, expand=True, pady=5)

        # --- Right Pane (Data Display) ---
        right_pane = ttk.Frame(main_pane, padding=10)
        main_pane.add(right_pane, minsize=600)

        # Network Table
        network_frame = ttk.LabelFrame(right_pane, text="Network Detection Grid", padding=10)
        network_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        cols = ('prio', 'essid', 'bssid', 'ch', 'pwr', 'enc')
        self.network_tree = ttk.Treeview(network_frame, columns=cols, show='headings')
        for col in cols: self.network_tree.heading(col, text=col.upper())
        self.network_tree.column('prio', width=40, anchor='center'); self.network_tree.column('pwr', width=40, anchor='center'); self.network_tree.column('ch', width=40, anchor='center')
        self.network_tree.pack(fill=tk.BOTH, expand=True)

        # System Log
        log_frame = ttk.LabelFrame(right_pane, text="System Output", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        self.system_log = scrolledtext.ScrolledText(log_frame, height=10, bg="#0a0a0a", fg="#e0e0e0", font=('Courier New', 9), relief=tk.FLAT, borderwidth=1)
        self.system_log.pack(fill=tk.BOTH, expand=True)

    def toggle_connection(self):
        if self.is_connected:
            self.disconnect_from_server()
        else:
            self.connect_to_server()

    def connect_to_server(self):
        server_url = f"http://{self.server_ip_entry.get()}"
        self.ws_client = SocketIOClient(server_url, self.gui_queue)
        self.ws_thread = threading.Thread(target=self.ws_client.run, daemon=True)
        self.ws_thread.start()
        # Check for connection status after a short delay
        self.master.after(2000, self.check_connection_status)

    def disconnect_from_server(self):
        if self.ws_client:
            self.ws_client.stop()
        self.is_connected = False
        self.connect_button.config(text="Connect")
        self.status_label.config(text="Status: Disconnected")
        self.monitor_button.config(state=tk.DISABLED)
        self.scan_button.config(state=tk.DISABLED)

    def check_connection_status(self):
        if self.ws_client and self.ws_client.is_connected():
            self.is_connected = True
            self.connect_button.config(text="Disconnect")
            self.ws_client.sio.emit('system:get_interfaces')
        else:
            messagebox.showerror("Connection Failed", "Could not connect to the iNTRUDER server.")
            self.disconnect_from_server()

    def toggle_monitor_mode(self):
        interface = self.interface_var.get()
        if interface and self.ws_client:
            self.ws_client.sio.emit('monitor:toggle', {'interface': interface})

    def start_scan(self):
        if self.ws_client:
            self.ws_client.sio.emit('network:scan', {'duration': 60})

    def process_queue(self):
        try:
            message = self.gui_queue.get_nowait()
            event_type = message.get('type')
            data = message.get('data')

            if event_type == 'initial_state':
                self.update_state(data)
            elif event_type == 'state_update':
                self.handle_state_update(data['key'], data['value'])
            elif event_type == 'interfaces_list':
                self.update_interfaces(data)
            elif event_type == 'terminal_output':
                self.add_log(self.system_log, data['message'], data.get('type', 'info'))
            elif event_type == 'assistant_directive':
                self.handle_assistant(data)
        except queue.Empty:
            pass
        finally:
            self.master.after(100, self.process_queue)

    def update_state(self, new_state):
        if 'networks' in new_state: self.update_networks(new_state['networks'])
        if 'monitorModeActive' in new_state: self.handle_monitor_update(new_state['monitorModeActive'])
        # Add other state updates as needed

    def handle_state_update(self, key, value):
        if key == 'networks': self.update_networks(value)
        if key == 'monitorModeActive': self.handle_monitor_update(value)

    def update_interfaces(self, interfaces):
        interface_names = [i['name'] for i in interfaces]
        self.interface_menu['values'] = interface_names
        if interface_names:
            self.interface_var.set(interface_names[0])
            self.monitor_button.config(state=tk.NORMAL)

    def handle_monitor_update(self, is_active):
        if is_active:
            self.monitor_button.config(text="Disable Monitor Mode")
            self.scan_button.config(state=tk.NORMAL)
        else:
            self.monitor_button.config(text="Enable Monitor Mode")
            self.scan_button.config(state=tk.DISABLED)
            
    def update_networks(self, networks):
        self.network_tree.delete(*self.network_tree.get_children())
        for bssid, net in networks.items():
            prio = '🔴' if (net.get('power', -100) > -65 and net.get('clients', 0) > 0 and net.get('wps', False)) else '·'
            self.network_tree.insert('', 'end', values=(
                prio, net.get('essid', '<hidden>'), bssid, net.get('channel', '?'), net.get('power', '?'), net.get('privacy', '?')
            ))

    def handle_assistant(self, directive):
        event = directive.get('event')
        data = directive.get('data', {})
        if event in ['suggest', 'log']:
            self.add_log(self.assistant_log, data.get('message', ''), data.get('type', 'info'))
        if event in ['suggest', 'mood_change']:
            # In a real app, you would have different GIF URLs here
            mood_gifs = {
                'idle': "https://i.imgur.com/80g22dn.gif",
                'thinking': "https://i.imgur.com/80g22dn.gif",
                'success': "https://i.imgur.com/80g22dn.gif",
                'warning': "https://i.imgur.com/80g22dn.gif"
            }
            url = mood_gifs.get(data.get('mood', 'idle'))
            self.load_image_from_url(url, self.avatar_label)
            self.status_label.config(text=f"Status: {data.get('mood', 'idle').capitalize()}")

    def add_log(self, text_widget, message, msg_type):
        text_widget.config(state=tk.NORMAL)
        text_widget.insert(tk.END, f"{message}\n")
        text_widget.config(state=tk.DISABLED)
        text_widget.see(tk.END)

    def load_image_from_url(self, url, label):
        try:
            response = requests.get(url)
            img_data = response.content
            img = Image.open(BytesIO(img_data))
            img.thumbnail((50, 50))
            photo = ImageTk.PhotoImage(img)
            label.config(image=photo)
            label.image = photo
        except Exception as e:
            print(f"Failed to load image: {e}")


# --- WebSocket Client Class (runs in a separate thread) ---
class SocketIOClient:
    def __init__(self, server_url, gui_queue):
        self.server_url = server_url
        self.gui_queue = gui_queue
        self.sio = socketio.Client()
        self.setup_handlers()

    def setup_handlers(self):
        @self.sio.event
        def connect():
            print("Connection established")
            self.gui_queue.put({'type': 'connection_status', 'data': {'status': 'connected'}})

        @self.sio.event
        def disconnect():
            print("Disconnected from server")
            self.gui_queue.put({'type': 'connection_status', 'data': {'status': 'disconnected'}})

        @self.sio.on('*')
        def catch_all(event, data):
            # A generic handler to forward all events to the GUI queue
            self.gui_queue.put({'type': event, 'data': data})

    def run(self):
        try:
            self.sio.connect(self.server_url)
            self.sio.wait()
        except socketio.exceptions.ConnectionError as e:
            print(f"Failed to connect to server: {e}")
            self.gui_queue.put({'type': 'connection_status', 'data': {'status': 'failed'}})

    def stop(self):
        self.sio.disconnect()

    def is_connected(self):
        return self.sio.connected


# --- Main Execution ---
if __name__ == "__main__":
    # Inform user about dependencies if they are missing
    try:
        from PIL import ImageTk, Image
    except ImportError:
        messagebox.showerror("Dependency Missing", "Pillow library not found. Please install it by running: pip install Pillow")
        sys.exit(1)

    root = tk.Tk()
    app = IntruderClientGUI(root)
    root.mainloop()
