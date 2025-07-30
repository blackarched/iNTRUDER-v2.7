iNTRUDER v2.7 - Hardened Deployment & User Guide 🚀
iNTRUDER is a wireless network security auditing tool with a comprehensive web-based dashboard. It provides real-time network scanning, client monitoring, and various offensive capabilities for penetration testing and security research.

Key Features ⭐
📡 Real-time WiFi Scanning & Visualization: Discovers and maps wireless networks in your vicinity on an interactive canvas.

🤝 WPA Handshake & PMKID Capture: Acquires the necessary data from WPA/WPA2 networks for offline password cracking.

💥 Deauthentication Attacks: Sends disconnection packets to disrupt communication between a client and an access point.

🔑 Offline Dictionary Cracking: Uses aircrack-ng to attempt to crack captured handshakes against a wordlist.

🕵️‍♂️ Passive Client Monitoring: Employs tools like p0f and tshark to passively identify the operating systems and hostnames of nearby clients.

🏠 Local Network (LAN) Host Discovery: Audits the local wired/wireless network you are connected to, identifying all connected devices.

🛡️ Secure, Hardened Deployment: The installer configures the application to run as a low-privilege systemd service for stability and security.

💻 Interactive Web Dashboard: A modern, responsive user interface provides full control over the tool's capabilities.

🤖 Live Assistant Feedback: The integrated "Aztr0.B0T" assistant provides real-time status updates on all backend operations.

The "Aztr0.B0T" Assistant 🤖
The assistant, named Aztr0.B0T, serves as a visual and textual feedback system for all major operations. It communicates the status of ongoing tasks through mood changes and a dedicated log panel.

Assistant Status & Moods
The assistant's animated avatar changes to reflect the current state of the application. These moods are defined in the dashboard.js file:

Status	GIF Used	Meaning
😴 Standby	idle.gif	The system is ready and awaiting commands.
🤔 Analyzing...	thinking.gif	A task like scanning or cracking is in progress.
✅ Objective Identified	success.gif	A task has completed successfully (e.g., handshake captured).
⚠️ Anomaly Detected	warning.gif	An error has occurred or a warning is being issued.
Assistant Log 📝
The text box directly below the assistant's name provides a running log of important events. The backend server sends messages to this log to give you specific feedback, such as acknowledging a new task, reporting a successful capture, or suggesting a next step.

System Requirements 📋
Requirement	Description
🐧 OS	Linux (Debian, Ubuntu, Kali recommended)
📶 Wireless Card	Must support monitor mode & packet injection
👑 Privileges	Root access is required for installation
🛠️ Dependencies	The installer handles all system dependencies, including aircrack-ng, hcxdumptool, p0f, tshark, and arp-scan
Installation 📜
The install.sh script automates the entire setup process. It must be run with root privileges.

Step 1: Make the script executable

Bash

chmod +x install.sh
💡 Side Note: The chmod +x command means "change mode" and adds the "executable" permission to the file. This tells your system that the script is a program that can be run.

Step 2: Run the installer

Bash

sudo ./install.sh
💡 Side Note: sudo stands for "superuser do" and runs the script with root privileges, which are needed to install software and configure system services. The installer will download all required tools, create a secure environment for the application, and set it up to run automatically.

First-Time Launch & Login ▶️
The application is managed as a systemd service.

Step 1: Start the Service
Bash

sudo systemctl start intruder
Step 2: Get Your Password 🔐
On the very first launch, a secure, random password is generated for the admin user. You must retrieve it from the service logs.

Bash

# View the live logs to find the initial password
sudo journalctl -u intruder.service -f
💡 Side Note: journalctl is a powerful tool for viewing logs. The -u intruder.service flag tells it to only show logs for our application, and -f means "follow," so it will show new logs in real-time. Look for a highlighted box in the logs containing your one-time password. Save this password somewhere secure!

Step 3: Access the Dashboard 🌐
Ensure your phone or computer is on the same Wi-Fi network as the machine running iNTRUDER.

Open your browser and navigate to the IP address of the iNTRUDER machine.

https://<your-ip-address>

⚠️ Security Warning: Your browser will show a warning because the SSL certificate is self-signed. This is expected. You must accept the risk to proceed.

(Optional) Desktop Launcher 🖥️
For systems with a graphical desktop, a desktop_launcher.py script is provided. It will ask for administrative privileges via a graphical popup and launch the iNTRUDER dashboard in its own application window.

Bash

# First, ensure all Python dependencies are installed
pip3 install -r requirements.txt

# Run the launcher
python3 desktop_launcher.py
Troubleshooting 🛠️
Problem: Service Fails to Start
🔧 Technique: Check the detailed service status. This is the first step for any service issue.

Bash

sudo systemctl status intruder.service
Look at the recent log lines it displays for an error message.

🔧 Technique: If the error is unclear, view more log history.

Bash

sudo journalctl -u intruder.service -n 100 --no-pager
This shows the last 100 log lines without cutting them off.

💡 Common Cause: Another program is already using port 443 (e.g., Apache, Nginx). Check with:

Bash

sudo lsof -i :443
Problem: Dashboard is Not Accessible
🔧 Technique: First, confirm the service is actually running with sudo systemctl status intruder.service.

🔧 Technique: Double-check your IP address.

Bash

ip addr show
Look for the inet address under your active network interface (e.g., wlan0 or eth0).

💡 Common Cause: A firewall is blocking the connection. Check your firewall status.

Bash

sudo ufw status
If it's active, you may need to add a rule to allow access:

Bash

sudo ufw allow 443/tcp
Problem: No Wireless Interfaces Found in Dropdown
🔧 Technique: Check if your system detects the wireless card at all.

Bash

iwconfig
If you don't see your wireless adapter listed (e.g., wlan0), the system itself can't see it.

💡 Common Cause: Missing Linux drivers. You may need to search online for how to install drivers for your specific Wi-Fi card model on your version of Linux.

Problem: LAN Scan Finds No Devices
💡 Common Cause: You are trying to scan with an interface that isn't connected to the network or doesn't have an IP address (like an interface in monitor mode).

🔧 Technique: The LAN scan must be run on your active, connected interface. Use ip addr show to see which interface has an inet IP address (e.g., 192.168.1.x). Select that interface from the dropdown when running the LAN Security Audit.

Uninstallation 🗑️
To completely remove the application and all its components:

Bash

# Stop and disable the systemd service
sudo systemctl stop intruder
sudo systemctl disable intruder

# Remove the service file and reload the daemon
sudo rm /etc/systemd/system/intruder.service
sudo systemctl daemon-reload

# Delete the application directory and all logs/captures
sudo rm -rf /opt/intruder /var/log/intruder