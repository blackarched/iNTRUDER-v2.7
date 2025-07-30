#!/usr/bin/env bash
# iNTRUDER v2.7 - Hardened Production Installation Script
set -euo pipefail

# --- Color Definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Installation Constants ---
INSTALL_DIR="/opt/intruder"
SERVICE_USER="intruder"
LOG_DIR="/var/log/intruder"
CAPTURE_DIR="/opt/intruder/captures"
PYTHON_VENV_DIR="$INSTALL_DIR/venv"

echo -e "${GREEN}[*] Starting iNTRUDER Hardened Installation...${NC}"

# ---- 1. Privilege Validation ----
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[CRITICAL] This script requires root privileges for system-level configurations. Please run with sudo.${NC}" 
   exit 1
fi

# ---- 2. Dependency Installation ----
install_dependencies() {
    echo -e "${BLUE}[+] Synchronizing package repositories...${NC}"
    apt-get update -qq
    
    echo -e "${BLUE}[+] Installing core system dependencies...${NC}"
    # Added arp-scan for local network host discovery.
    apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv python3-eventlet aircrack-ng wireless-tools iw \
        hcxdumptool macchanger procps rsync openssl p0f wireshark-cli arp-scan
    
    echo -e "${GREEN}[OK] All system dependencies are installed.${NC}"
}

# ---- 3. User and Directory Setup ----
setup_user_and_dirs() {
    echo -e "${BLUE}[+] Implementing security-hardened user and directory architecture...${NC}"
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/false -d "$INSTALL_DIR" -c "iNTRUDER Service Account" "$SERVICE_USER"
        echo -e "${GREEN}[OK] Security-hardened service user '$SERVICE_USER' created.${NC}"
    else
        echo -e "${YELLOW}[INFO] Service user '$SERVICE_USER' already exists.${NC}"
    fi
    
    mkdir -p "$INSTALL_DIR" "$LOG_DIR" "$CAPTURE_DIR" "$INSTALL_DIR/static" "$INSTALL_DIR/templates"
    echo -e "${GREEN}[OK] Secure directory architecture established.${NC}"
}

# ---- 4. Project File Deployment ----
copy_project_files() {
    echo -e "${BLUE}[+] Deploying project artifacts to secure installation directory...${NC}"
    
    # Use rsync for robust copying, excluding installer and git files.
    rsync -a --exclude='install.sh' --exclude='.git/' --exclude='*.db' --exclude='*.log' ./ "$INSTALL_DIR/"
    
    echo -e "${GREEN}[OK] Project deployment completed.${NC}"
}

# ---- 4.5. SSL Certificate Generation ----
generate_ssl_certs() {
    echo -e "${BLUE}[+] Generating self-signed SSL certificate for HTTPS...${NC}"
    CERT_DIR="$INSTALL_DIR/certs"
    mkdir -p "$CERT_DIR"
    openssl req -x509 -newkey rsa:4096 -nodes \
        -keyout "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/cert.pem" \
        -days 365 -subj "/CN=intruder.local"
    echo -e "${GREEN}[OK] SSL certificate and key stored in $CERT_DIR.${NC}"
}

# ---- 5. Python Virtual Environment Setup ----
setup_virtualenv() {
    echo -e "${BLUE}[+] Configuring isolated Python execution environment...${NC}"
    python3 -m venv "$PYTHON_VENV_DIR"
    
    echo -e "${BLUE}[+] Installing Python dependencies from requirements manifest...${NC}"
    # shellcheck source=/dev/null
    source "$PYTHON_VENV_DIR/bin/activate"
    pip install --upgrade pip
    
    if [[ -f "$INSTALL_DIR/requirements.txt" ]]; then
        pip install -r "$INSTALL_DIR/requirements.txt"
        echo -e "${GREEN}[OK] Python toolkit successfully installed in virtual environment.${NC}"
    else
        echo -e "${YELLOW}[WARNING] requirements.txt not found. The server may fail to start.${NC}"
    fi
    deactivate
}

# ---- 6. Permissions and Ownership ----
set_permissions() {
    echo -e "${BLUE}[+] Implementing security permission model...${NC}"
    
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$CAPTURE_DIR"
    if [ -d "$INSTALL_DIR/certs" ]; then
      chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/certs"
    fi
    
    # Set base permissions: rwx for owner/group, none for others
    find "$INSTALL_DIR" -type d -exec chmod 770 {} \;
    find "$INSTALL_DIR" -type f -exec chmod 660 {} \;
    
    # Make the main server script executable
    if [ -f "$INSTALL_DIR/server.py" ]; then
        chmod +x "$INSTALL_DIR/server.py"
    fi
    
    echo -e "${GREEN}[OK] Security permissions implemented.${NC}"
}

# ---- 7. Systemd Service Setup ----
configure_systemd() {
    echo -e "${BLUE}[+] Deploying hardened systemd service configuration...${NC}"
    
    cat > /etc/systemd/system/intruder.service <<EOF
[Unit]
Description=iNTRUDER Advanced WiFi Pentesting Suite
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
# The ExecStart command uses the Python executable from our secure venv
ExecStart=$PYTHON_VENV_DIR/bin/python3 $INSTALL_DIR/server.py
Restart=on-failure
# NOTE: The server is configured for port 443 (HTTPS). A non-root user cannot bind to this port by default.
# To run the service successfully, you must either run as root (not recommended) or grant the capability:
# sudo setcap 'cap_net_bind_service=+ep' $PYTHON_VENV_DIR/bin/python3
RestartSec=10

# Security Hardening
PrivateTmp=true
ProtectSystem=full
NoNewPrivileges=true
# The service needs network capabilities, which are implicitly handled by running tools as root via sudo
# If not using sudo inside the tool, these would be needed:
# CapabilityBoundingSet=CAP_NET_RAW CAP_NET_ADMIN

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable intruder
    echo -e "${GREEN}[OK] Hardened systemd service 'intruder.service' deployed and enabled.${NC}"
}

# ---- Main Orchestration ----
main() {
    install_dependencies
    setup_user_and_dirs
    copy_project_files
    generate_ssl_certs
    setup_virtualenv
    set_permissions
    configure_systemd
    
    echo ""
    echo -e "${GREEN}[SUCCESS] iNTRUDER Framework Deployed${NC}"
    echo -e "${BLUE}▪ Service User: '$SERVICE_USER' configured with restricted privileges${NC}"
    echo -e "${BLUE}▪ Installation Directory: $INSTALL_DIR${NC}"
    echo ""
    echo -e "${GREEN}[NEXT STEPS]${NC}"
    echo -e "1. ${YELLOW}IMPORTANT:${NC} On first launch, a secure password for the 'admin' user is generated and logged."
    echo -e "2. Start the service: ${YELLOW}sudo systemctl start intruder${NC}"
    echo -e "3. To view the initial password & live logs: ${YELLOW}sudo journalctl -u intruder.service -f${NC}"
    echo -e "4. Access dashboard: ${YELLOW}https://<your-ip-address>:443${NC} (you must accept the self-signed certificate)."
}

main "$@"