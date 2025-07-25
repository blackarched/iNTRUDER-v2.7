class CyberSecurityHUD {
    constructor() {
        this.ws = null;
        this.systemStartTime = Date.now();
        this.nodes = new Map();
        this.initializeSystem();
    }

    initializeSystem() {
        this.logSystemEvent('NEXUS Security Grid initializing...', 'info');
        this.updateSystemClock();
        setInterval(() => this.updateSystemClock(), 1000);
        this.connectWebSocket();
        this.renderCameraMatrix(); // Initial render
    }

    connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${wsProtocol}//${window.location.hostname}:${window.location.port}`);

        this.ws.onopen = () => {
            this.logSystemEvent('Quantum link established with command core.', 'success');
            document.getElementById('system-state').textContent = 'LINKED';
            document.getElementById('system-state').style.color = 'var(--neon-green)';
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleBackendMessage(message);
        };

        this.ws.onclose = () => {
            this.logSystemEvent('Quantum link severed. Reconnecting...', 'error');
            document.getElementById('system-state').textContent = 'OFFLINE';
            document.getElementById('system-state').style.color = 'var(--laser-red)';
            setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.ws.onerror = (error) => {
            this.logSystemEvent('Quantum interference detected.', 'error');
        };
    }

    sendSystemCommand(command, payload = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'system_command', command, payload }));
        } else {
            this.logSystemEvent(`Command [${command}] failed: No link to core.`, 'error');
        }
    }

    handleBackendMessage(message) {
        switch (message.type) {
            case 'stream_frame':
                this.updateCameraFeed(message.nodeId, message.data);
                break;
            case 'motion_alert':
                this.logSystemEvent(`MOTION ALERT on ${message.designation} (Threat: ${message.threatLevel})`, 'warning');
                break;
            case 'system_state_update':
                this.updateNodeList(message.nodes);
                break;
        }
    }

    updateNodeList(nodesData) {
        this.nodes.clear();
        nodesData.forEach(node => this.nodes.set(node.id, node));
        document.getElementById('active-nodes').textContent = this.nodes.size;
        this.renderDeviceGrid();
        this.renderCameraMatrix();
    }

    updateCameraFeed(nodeId, base64Data) {
        const imgElement = document.getElementById(`cam-img-${nodeId}`);
        if (imgElement) {
            imgElement.src = `data:image/jpeg;base64,${base64Data}`;
        }
    }

    renderDeviceGrid() {
        this.logSystemEvent('Rendering device grid...', 'debug');
        const deviceGrid = document.getElementById('device-grid');
        deviceGrid.innerHTML = '';
        this.nodes.forEach(node => {
            deviceGrid.appendChild(this.createNodeElement(node));
        });
    }

    createNodeElement(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'device-node';
        nodeElement.innerHTML = `
            <div class="device-status online"></div>
            <div class="device-name">${node.designation}</div>
            <div class="device-ip">${node.ip_address}</div>
        `;
        return nodeElement;
    }

    renderCameraMatrix() {
        this.logSystemEvent('Rendering camera matrix...', 'debug');
        const cameraMatrix = document.getElementById('camera-matrix');
        cameraMatrix.innerHTML = ''; // Clear previous viewports

        // Create placeholders for up to 6 cameras, or for each node
        const viewCount = this.nodes.size > 0 ? this.nodes.size : 6;

        for(let i = 0; i < viewCount; i++) {
            const nodeId = [...this.nodes.keys()][i];
            const node = this.nodes.get(nodeId);
            cameraMatrix.appendChild(this.createViewportElement(node, i));
        }
    }

    createViewportElement(node, index) {
        const viewport = document.createElement('div');
        viewport.className = 'camera-viewport';

        if(node) {
             viewport.innerHTML = `
                <div class="cam-header">
                    <span class="cam-id">${node.designation}</span>
                    <div class="cam-status"><div class="status-indicator"></div><span>ONLINE</span></div>
                </div>
                <div class="cam-display">
                    <img id="cam-img-${node.id}" alt="Live feed for ${node.designation}">
                </div>`;
        } else {
             viewport.innerHTML = `
                <div class="cam-header"><span class="cam-id">NODE_0${index+1}</span></div>
                <div class="cam-display"><div class="cam-placeholder">NO SIGNAL</div></div>`;
        }
        return viewport;
    }

    updateSystemClock() {
        const elapsed = Date.now() - this.systemStartTime;
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('system-uptime').textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    logSystemEvent(message, type = 'info') {
        const logTerminal = document.getElementById('log-terminal');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-message">${message}</span>`;
        logTerminal.prepend(logEntry);
    }
}

// --- Global Functions ---
const cyberHUD = new CyberSecurityHUD();

function showDeviceModal() {
  const modal = document.getElementById('device-modal');
  modal.innerHTML = `
    <div class="modal-content">
      <div class="panel-header">Deploy New Node</div>
      <form>
        <input type="text" class="input-terminal" placeholder="Designation">
        <input type="text" class="input-terminal" placeholder="IP Address">
        <input type="text" class="input-terminal" placeholder="Port">
        <input type="text" class="input-terminal" placeholder="Stream Path">
        <input type="text" class="input-terminal" placeholder="Node Type">
        <button type="submit" class="cyber-button">Deploy</button>
        <button type="button" class="cyber-button" id="close-modal-button">Cancel</button>
      </form>
    </div>
  `;
  modal.style.display = 'flex';

  document.getElementById('close-modal-button').addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

document.getElementById('deploy-node-button').addEventListener('click', showDeviceModal);

document.getElementById('record-control').addEventListener('click', (event) => {
  const button = event.target;
  const isActive = button.classList.toggle('active');
  if (isActive) {
    button.textContent = 'Stop Recording';
    cyberHUD.sendSystemCommand('start_recording', { nodeId: 'all' }); // Example: record all
  } else {
    button.textContent = 'Start Recording';
    cyberHUD.sendSystemCommand('stop_recording', { nodeId: 'all' });
  }
});

document.getElementById('motion-control').addEventListener('click', (event) => {
    const button = event.target;
    const isActive = button.classList.toggle('active');
    cyberHUD.sendSystemCommand('toggle_motion_detection', { enabled: isActive, nodeId: 'all' });
});
