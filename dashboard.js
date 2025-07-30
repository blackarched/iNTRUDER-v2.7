/**
 * iNTRUDER v2.7 - Hardened Production Dashboard Controller
 * Powers the advanced cyber-security HUD with real-time data and interactive visualizations.
 */
document.addEventListener('DOMContentLoaded', () => {
    const socket = io({ transports: ['websocket'] });

    // --- Global State Store ---
    const state = {
        interfaces: [],
        selectedInterface: null,
        monitorModeActive: false,
        networks: {}, // Stores discovered APs by BSSID for efficient updates
        clients: [], // Will store the list of client objects
        handshakes: [], // Stores captured handshakes/PMKIDs
        metrics: {
            networks_found: 0,
            clients_found: 0,
            handshakes_captured: 0,
            deauth_attacks: 0,
            cracking_sessions: 0
        },
        scanning: false // Indicates if a network scan is active
    };

    // --- UI Element References ---
    const ui = {
        cpuUsage: document.getElementById('cpuUsage'),
        memUsage: document.getElementById('memUsage'),
        assistantAvatar: document.getElementById('assistantAvatar'),
        assistantStatus: document.getElementById('assistantStatus'),
        assistantLog: document.getElementById('assistantLog'),
        interfaceSelect: document.getElementById('interfaceSelect'),
        monitorModeBtn: document.getElementById('monitorModeBtn'),
        scanBtn: document.getElementById('scanBtn'),
        networksCount: document.getElementById('networksCount'),
        clientsCount: document.getElementById('clientsCount'),
        handshakesCount: document.getElementById('handshakesCount'),
        deauthCount: document.getElementById('deauthCount'),
        crackCount: document.getElementById('crackCount'),
        networksTableBody: document.getElementById('networksTableBody'),
        clientsTableBody: document.getElementById('clientsTableBody'),
        handshakesTableBody: document.getElementById('handshakesTableBody'),
        terminalOutput: document.getElementById('terminalOutput'),
        scanIndicator: document.getElementById('scanIndicator'),
        
        // Modals and Forms
        deauthModal: document.getElementById('deauthModal'),
        crackModal: document.getElementById('crackModal'),
        closeModalBtns: document.querySelectorAll('.close-modal'),
        deauthForm: document.getElementById('deauthForm'),
        crackForm: document.getElementById('crackForm'),
        deauthBssid: document.getElementById('deauthBssid'),
        crackFile: document.getElementById('crackFile'),

        // LAN Audit UI
        lanScanBtn: document.getElementById('lanScanBtn'),
        lanHostsTableBody: document.getElementById('lanHostsTableBody'),

        // Network Visualization Specific
        networkCanvas: document.getElementById('networkCanvas'),
        networkTooltip: document.getElementById('networkTooltip'),
    };

    // --- Spectre Assistant Logic ---
    const SpectreAssistant = {
        moods: {
            idle: { gif: '/static/idle.gif', status: 'Standby', logColor: 'info' },
            thinking: { gif: '/static/thinking.gif', status: 'Analyzing...', logColor: 'info' },
            success: { gif: '/static/success.gif', status: 'Objective Identified', logColor: 'suggestion' },
            warning: { gif: '/static/warning.gif', status: 'Anomaly Detected', logColor: 'warning' },
            error: { gif: '/static/warning.gif', status: 'Critical Error', logColor: 'error' }
        },
        setMood: function(moodName = 'idle') {
            const mood = this.moods[moodName] || this.moods.idle;
            if (ui.assistantAvatar.src !== mood.gif) {
                ui.assistantAvatar.src = mood.gif;
            }
            ui.assistantStatus.textContent = `Status: ${mood.status}`;
        },
        speak: function(message, type = 'info') {
            const line = document.createElement('div');
            const logType = this.moods[type]?.logColor || type; 
            line.className = `assistant-line ${logType}`;
            line.textContent = `» ${message}`;
            ui.assistantLog.appendChild(line);
            ui.assistantLog.scrollTop = ui.assistantLog.scrollHeight;
        },
    };

    // --- Network Visualization Engine ---
    class NetworkVisualization {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.nodes = {};
            this.connections = [];
            this.centerNode = { x: 0, y: 0, radius: 10, color: '#00ffff' };
            this.resize();
            this.initCenterNode();
            this.animate();
            this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.canvas.addEventListener('mouseout', this.hideTooltip.bind(this));
        }
        resize() {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.initCenterNode();
        }
        initCenterNode() {
            this.centerNode.x = this.canvas.width / 2;
            this.centerNode.y = this.canvas.height / 2;
        }
        addConnection(nodeA, nodeB) {
            const exists = this.connections.some(c => (c.a === nodeA && c.b === nodeB) || (c.a === nodeB && c.b === nodeA));
            if (!exists && nodeA && nodeB) {
                this.connections.push({ a: nodeA, b: nodeB, strength: Math.random() * 0.5 + 0.1, phase: Math.random() * Math.PI * 2 });
            }
        }
        addOrUpdateNetwork(network) {
            if (this.nodes[network.bssid]) {
                this.nodes[network.bssid].network = network;
                const power = network.power;
                if (power > -50) this.nodes[network.bssid].color = 'rgba(0, 255, 65, 0.8)';
                else if (power > -65) this.nodes[network.bssid].color = 'rgba(255, 255, 0, 0.8)';
                else this.nodes[network.bssid].color = 'rgba(255, 170, 0, 0.8)';
                return;
            }
            const angle = Math.random() * Math.PI * 2;
            const distance = (this.canvas.width / 5) + Math.random() * (this.canvas.width / 4);
            const x = this.centerNode.x + Math.cos(angle) * distance;
            const y = this.centerNode.y + Math.sin(angle) * distance;
            const node = { id: network.bssid, x, y, radius: 4 + Math.random() * 3, network, vx: 0, vy: 0, color: 'rgba(255, 170, 0, 0.8)' };
            const power = network.power;
            if (power > -50) node.color = 'rgba(0, 255, 65, 0.8)';
            else if (power > -65) node.color = 'rgba(255, 255, 0, 0.8)';
            else node.color = 'rgba(255, 170, 0, 0.8)';
            this.nodes[network.bssid] = node;
            this.addConnection(this.centerNode, node);
            const allNodes = Object.values(this.nodes);
            if (allNodes.length > 1) {
                for (let i = 0; i < Math.min(2, allNodes.length - 1); i++) {
                    const otherNode = allNodes[Math.floor(Math.random() * (allNodes.length - 1))];
                    if (otherNode.id !== node.id && otherNode.id !== this.centerNode.id) {
                         this.addConnection(node, otherNode);
                    }
                }
            }
        }
        clearAll() { this.nodes = {}; this.connections = []; this.initCenterNode(); }
        drawNode(node) {
            const pulse = Math.sin(Date.now() * 0.005 + node.x) * 0.5 + 0.5;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius * (1 + pulse * 0.2), 0, Math.PI * 2);
            this.ctx.fillStyle = node.color;
            this.ctx.shadowColor = node.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = ui.networkTooltip.style.color || '#e0e0e0';
            this.ctx.font = '12px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(node.network.essid || '<hidden>', node.x, node.y + node.radius + 15);
            this.ctx.textAlign = 'left';
        }
        drawConnection(conn) {
            const brightness = Math.sin(Date.now() * 0.002 + conn.phase) * 0.4 + 0.6;
            this.ctx.beginPath();
            this.ctx.moveTo(conn.a.x, conn.a.y);
            this.ctx.lineTo(conn.b.x, conn.b.y);
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${brightness * conn.strength * 0.4})`;
            this.ctx.lineWidth = conn.strength;
            this.ctx.stroke();
        }
        animate() {
            if (!this.ctx) return;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            Object.values(this.nodes).forEach(node => {
                node.x += node.vx; node.y += node.vy;
                node.vx *= 0.94; node.vy *= 0.94;
                if (Math.random() < 0.01) { node.vx += (Math.random() - 0.5) * 0.1; node.vy += (Math.random() - 0.5) * 0.1; }
                if (node.x < 0 || node.x > this.canvas.width) { node.vx *= -1; node.x = Math.max(0, Math.min(node.x, this.canvas.width)); }
                if (node.y < 0 || node.y > this.canvas.height) { node.vy *= -1; node.y = Math.max(0, Math.min(node.y, this.canvas.height)); }
            });
            this.connections.forEach(conn => this.drawConnection(conn));
            Object.values(this.nodes).forEach(node => this.drawNode(node));
            const centerPulse = Math.sin(Date.now() * 0.002) * 0.5 + 0.5;
            this.ctx.beginPath();
            this.ctx.arc(this.centerNode.x, this.centerNode.y, this.centerNode.radius * (1 + centerPulse * 0.3), 0, Math.PI * 2);
            this.ctx.fillStyle = this.centerNode.color;
            this.ctx.shadowColor = this.centerNode.color;
            this.ctx.shadowBlur = 20;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            requestAnimationFrame(() => this.animate());
        }
        handleMouseMove(event) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            let hoveredNode = null;
            for (const bssid in this.nodes) {
                const node = this.nodes[bssid];
                const distance = Math.sqrt((mouseX - node.x)**2 + (mouseY - node.y)**2);
                if (distance < node.radius * 2) { hoveredNode = node; break; }
            }
            if (hoveredNode) { this.showTooltip(hoveredNode, event.clientX, event.clientY); } 
            else { this.hideTooltip(); }
        }
        showTooltip(node, mouseX, mouseY) {
            const net = node.network;
            ui.networkTooltip.innerHTML = `<strong>ESSID:</strong> ${net.essid || '&lt;hidden&gt;'}<br><strong>BSSID:</strong> ${net.bssid}<br><strong>Channel:</strong> ${net.channel}<br><strong>Power:</strong> ${net.power} dBm<br><strong>Clients:</strong> ${net.clients_count || 0}<br><strong>Encryption:</strong> ${net.privacy}<br><strong>Manufacturer:</strong> ${net.manufacturer || 'N/A'}<br><strong>WPS:</strong> ${net.wps ? 'Enabled' : 'Disabled'}`;
            ui.networkTooltip.style.left = `${mouseX + 15}px`;
            ui.networkTooltip.style.top = `${mouseY + 15}px`;
            ui.networkTooltip.style.display = 'block';
        }
        hideTooltip() { ui.networkTooltip.style.display = 'none'; }
    }
    const networkViz = new NetworkVisualization('networkCanvas');

    // --- Helper & UI Functions ---
    const addTerminalLine = (message, type = 'info') => {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        const time = new Date().toLocaleTimeString();
        let icon = '»';
        if (type === 'success') icon = '[✓]';
        if (type === 'error') icon = '[✗]';
        if (type === 'warning') icon = '[!]';
        line.innerHTML = `<span class="time">${time}</span> <span class="icon">${icon}</span> ${message}`;
        ui.terminalOutput.appendChild(line);
        ui.terminalOutput.scrollTop = ui.terminalOutput.scrollHeight;
    };

    const updateMonitorButton = () => {
        if (state.monitorModeActive) {
            ui.monitorModeBtn.textContent = 'Disable Monitor Mode';
            ui.monitorModeBtn.classList.add('active');
            ui.scanBtn.disabled = false;
        } else {
            ui.monitorModeBtn.textContent = 'Enable Monitor Mode';
            ui.monitorModeBtn.classList.remove('active');
            ui.scanBtn.disabled = true;
        }
    };

    const getPriorityFlag = (network) => {
        const hasClients = network.clients_count > 0;
        const isStrongSignal = network.power > -65;
        const isVulnerable = network.wps || (network.privacy.includes('WPA2') && !network.privacy.includes('WPA3'));
        if (isStrongSignal && hasClients && isVulnerable) return '🔴';
        if (isStrongSignal && (hasClients || isVulnerable)) return '🟡';
        return '·';
    };

    const renderNetworksTable = () => {
        ui.networksTableBody.innerHTML = '';
        const sortedNetworks = Object.values(state.networks).sort((a, b) => b.power - a.power);
        sortedNetworks.forEach(net => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${getPriorityFlag(net)}</td>
                <td>${net.essid || '&lt;hidden&gt;'}</td>
                <td>${net.bssid}</td>
                <td>${net.channel}</td>
                <td>${net.power}</td>
                <td>${net.clients_count || 0}</td>
                <td>${net.privacy}</td>
                <td class="actions-cell">
                    <button class="btn-action capture-hs" data-bssid="${net.bssid}" data-channel="${net.channel}" data-essid="${net.essid || net.bssid}" title="Capture Handshake"><i class="fas fa-key"></i></button>
                    <button class="btn-action capture-pmkid" data-bssid="${net.bssid}" data-channel="${net.channel}" data-essid="${net.essid || net.bssid}" title="Capture PMKID"><i class="fas fa-bolt"></i></button>
                    <button class="btn-action deauth" data-bssid="${net.bssid}" title="Deauth Attack"><i class="fas fa-broadcast-tower"></i></button>
                </td>`;
            ui.networksTableBody.appendChild(row);
        });
    };

    const renderClientsTable = () => {
        if (!ui.clientsTableBody) return;
        ui.clientsTableBody.innerHTML = '';
        if (!state.clients || state.clients.length === 0) return;

        const sortedClients = state.clients.sort((a, b) => b.power - a.power);
        sortedClients.forEach(client => {
            const row = document.createElement('tr');
            const osInfo = client.os_info ? (client.os_info.os_raw || 'N/A') : 'N/A';
            const probedEssids = client.probed_essids ? client.probed_essids.join(', ') : 'None';
            
            row.innerHTML = `
                <td>${client.mac}</td>
                <td>${client.manufacturer || 'Unknown'}</td>
                <td>${client.connected_to_bssid || 'Not Associated'}</td>
                <td>${osInfo}</td>
                <td>${client.hostname || 'N/A'}</td>
                <td>${probedEssids}</td>
                <td>${client.power}</td>
                <td>${client.last_seen}</td>
            `;
            ui.clientsTableBody.appendChild(row);
        });
    };

    const renderHandshakesTable = () => {
        ui.handshakesTableBody.innerHTML = '';
        state.handshakes.forEach(h => {
            const row = document.createElement('tr');
            const fileName = h.file ? h.file.split('/').pop() : 'N/A';
            row.innerHTML = `
                <td>${h.essid || '&lt;unknown&gt;'}</td>
                <td>${h.bssid}</td>
                <td>${(h.type || 'N/A').toUpperCase()}</td>
                <td>${fileName}</td>
                <td>${h.password ? `<span style="color:var(--secondary);">${h.password}</span>` : 'Not Cracked'}</td>
                <td class="actions-cell">
                    ${!h.password && h.type === 'handshake' ? `<button class="btn-action crack" data-file="${h.file}" title="Crack Handshake"><i class="fas fa-unlock"></i></button>` : ''}
                    ${!h.password && h.type === 'pmkid' ? `<button class="btn-action" title="Use Hashcat (mode 22000)" disabled><i class="fas fa-cat"></i></button>` : ''}
                </td>`;
            ui.handshakesTableBody.appendChild(row);
        });
    };

    const renderLanHostsTable = (hosts) => {
        if (!ui.lanHostsTableBody) return;
        ui.lanHostsTableBody.innerHTML = '';
        if (!hosts || hosts.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" style="text-align:center;">No devices found. Run a scan.</td>`;
            ui.lanHostsTableBody.appendChild(row);
            return;
        }

        hosts.forEach(host => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${host.ip}</td>
                <td>${host.mac}</td>
                <td>${host.manufacturer}</td>
            `;
            ui.lanHostsTableBody.appendChild(row);
        });
    };
    
    // --- Event Listeners ---
    ui.monitorModeBtn.addEventListener('click', () => {
        socket.emit('monitor:toggle', { interface: ui.interfaceSelect.value });
        SpectreAssistant.setMood('thinking');
        SpectreAssistant.speak(`Attempting to toggle monitor mode on ${ui.interfaceSelect.value}...`, 'info');
    });

    ui.scanBtn.addEventListener('click', () => {
        socket.emit('network:scan', { duration: 60 });
        SpectreAssistant.setMood('thinking');
        SpectreAssistant.speak('Initiating full spectrum network scan. Standby for data streams.', 'info');
    });

    document.body.addEventListener('click', e => {
        const hsBtn = e.target.closest('button.capture-hs');
        const pmkidBtn = e.target.closest('button.capture-pmkid');
        const deauthBtn = e.target.closest('button.deauth');
        const crackBtn = e.target.closest('button.crack');

        if (hsBtn) {
            socket.emit('capture:handshake', hsBtn.dataset);
            SpectreAssistant.setMood('thinking');
            SpectreAssistant.speak(`Executing handshake capture for ${hsBtn.dataset.essid || hsBtn.dataset.bssid}.`, 'info');
        } else if (pmkidBtn) {
            socket.emit('capture:pmkid', pmkidBtn.dataset);
            SpectreAssistant.setMood('thinking');
            SpectreAssistant.speak(`Attempting PMKID capture against ${pmkidBtn.dataset.essid || pmkidBtn.dataset.bssid}.`, 'info');
        } else if (deauthBtn) {
            ui.deauthBssid.value = deauthBtn.dataset.bssid;
            ui.deauthModal.style.display = 'block';
        } else if (crackBtn) {
            ui.crackFile.value = crackBtn.dataset.file;
            ui.crackModal.style.display = 'block';
        }
    });

    ui.lanScanBtn.addEventListener('click', () => {
        const selectedInterface = ui.interfaceSelect.value;
        if (!selectedInterface) {
            addTerminalLine('Please select an interface to scan the LAN.', 'warning');
            return;
        }
        addTerminalLine(`Starting LAN host discovery on ${selectedInterface}...`, 'info');
        SpectreAssistant.setMood('thinking');
        socket.emit('lan:discover_hosts', { interface: selectedInterface });
    });

    ui.closeModalBtns.forEach(btn => {
        btn.onclick = () => btn.closest('.modal').style.display = 'none';
    });

    ui.deauthForm.addEventListener('submit', e => {
        e.preventDefault();
        socket.emit('attack:deauth', Object.fromEntries(new FormData(e.target)));
        ui.deauthModal.style.display = 'none';
        SpectreAssistant.setMood('thinking');
        SpectreAssistant.speak(`Initiating deauthentication attack against ${ui.deauthBssid.value}.`, 'warning');
    });

    ui.crackForm.addEventListener('submit', e => {
        e.preventDefault();
        socket.emit('attack:crack', Object.fromEntries(new FormData(e.target)));
        ui.crackModal.style.display = 'none';
        SpectreAssistant.setMood('thinking');
        SpectreAssistant.speak(`Commencing password cracking on ${ui.crackFile.value.split('/').pop()}. This may take time.`, 'info');
    });

    // --- Socket.IO Handlers ---
    socket.on('connect', () => { 
        addTerminalLine('Connection established to Neural Core.', 'success'); 
        socket.emit('system:get_interfaces');
        SpectreAssistant.setMood('idle');
        SpectreAssistant.speak('Spectre-7 online. Awaiting directives.', 'info');
    });
    
    socket.on('initial_state', (initialState) => {
        Object.assign(state, initialState);
        state.clients = initialState.clients_list || [];
        
        ui.interfaceSelect.innerHTML = state.interfaces.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
        if(state.selectedInterface) ui.interfaceSelect.value = state.selectedInterface;
        
        updateMonitorButton();
        renderNetworksTable();
        renderClientsTable();
        renderHandshakesTable();
        
        if (state.metrics) {
            Object.keys(state.metrics).forEach(k => {
                const uiId = k.replace(/_found|_captured|_sessions/g, 'sCount').replace('deauth_attacks', 'deauthCount');
                if(ui[uiId]) ui[uiId].textContent = state.metrics[k]; 
            });
        }
        
        networkViz.clearAll();
        Object.values(state.networks).forEach(net => networkViz.addOrUpdateNetwork(net));

        SpectreAssistant.setMood(initialState.mission_context?.active_task === 'scanning' ? 'thinking' : 'idle');
        SpectreAssistant.speak(initialState.mission_context?.last_suggestion || 'System ready for operation.', 'info');
    });

    socket.on('state_update', ({ key, value }) => {
        state[key] = value;
        if (key === 'monitor_mode_active') {
            updateMonitorButton();
            if (value) SpectreAssistant.speak('Monitor mode enabled on designated interface.', 'success');
            else SpectreAssistant.speak('Monitor mode disabled.', 'warning');
        }
        if (key === 'networks') {
            state.networks = value; 
            renderNetworksTable();
            Object.values(value).forEach(net => networkViz.addOrUpdateNetwork(net));
            SpectreAssistant.speak(`Discovered ${Object.keys(state.networks).length} active networks.`, 'info');
        }
        if (key === 'clients') {
            state.clients = value;
            renderClientsTable();
            SpectreAssistant.speak(`Tracking ${state.clients.length} clients.`, 'info');
        }
        if (key === 'handshakes') {
            state.handshakes = value;
            renderHandshakesTable();
            SpectreAssistant.speak(`Total captured artifacts: ${state.handshakes.length}.`, 'info');
        }
        if (key === 'scanning') {
            ui.scanIndicator.style.display = value ? 'block' : 'none';
            SpectreAssistant.setMood(value ? 'thinking' : 'idle');
            SpectreAssistant.speak(value ? 'Scanning active...' : 'Scan cycle complete.', value ? 'info' : 'success');
        }
    });

    socket.on('system:interfaces_list', (interfaces) => {
        state.interfaces = interfaces;
        ui.interfaceSelect.innerHTML = interfaces.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
        SpectreAssistant.speak(`Detected ${interfaces.length} wireless interfaces.`, 'info');
    });

    socket.on('terminal:output', ({ message, type }) => addTerminalLine(message, type));

    socket.on('metrics:update', (metrics) => {
        Object.assign(state.metrics, metrics);
        Object.keys(metrics).forEach(k => {
            const uiElementId = k.replace(/_found|_captured|_sessions/g, 'sCount').replace('deauth_attacks', 'deauthCount');
            if(ui[uiElementId]) ui[uiElementId].textContent = metrics[k];
        });
    });

    socket.on('system:stats', (stats) => {
        ui.cpuUsage.textContent = `${stats.cpu_usage.toFixed(1)}%`;
        ui.memUsage.textContent = `${stats.memory_usage.toFixed(1)}%`;
    });

    socket.on('lan:hosts_discovered', (data) => {
        if (data && data.hosts) {
            renderLanHostsTable(data.hosts);
            SpectreAssistant.speak(`LAN audit complete. Found ${data.hosts.length} devices.`, 'success');
        } else {
            addTerminalLine('Received empty host list from LAN scan.', 'warning');
        }
        SpectreAssistant.setMood('idle');
    });

    socket.on('assistant:directive', ({ event, data }) => {
        if (event === 'suggest' || event === 'log') {
            SpectreAssistant.speak(data.message, data.type);
        }
        if (event === 'mood_change') {
            SpectreAssistant.setMood(data.mood);
        }
    });

    // --- Matrix Rain Effect ---
    const matrixCanvas = document.getElementById('matrixCanvas');
    if (matrixCanvas) {
        const matrixCtx = matrixCanvas.getContext('2d');
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        const matrixCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
        const matrixArray = matrixCharacters.split("");
        const fontSize = 14;
        const columns = matrixCanvas.width / fontSize;
        const drops = [];
        for (let x = 0; x < columns; x++) { drops[x] = 1; }
        function drawMatrix() {
            matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
            matrixCtx.fillStyle = '#0F0';
            matrixCtx.font = fontSize + 'px arial';
            for (let i = 0; i < drops.length; i++) {
                const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
                matrixCtx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        setInterval(drawMatrix, 33);
    }
    
    addTerminalLine('Initializing iNTRUDER v2.7 interface...', 'info');
});