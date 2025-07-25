const { spawn } = require('child_process');
const EventEmitter = require('events');
const logger = require('./logger');

class StreamManager extends EventEmitter {
    constructor(nexusCenter) {
        super();
        this.nexusCenter = nexusCenter; // Main server instance for callbacks
        this.activeStreams = new Map();
    }

    async establishStreamConnection(nodeConfig) {
        const { nodeId, ip, streamPath } = nodeConfig;
        const rtspUrl = `rtsp://${ip}${streamPath || '/video'}`;
        logger.info(`Attempting to establish stream for node ${nodeId} at ${rtspUrl}`);

        if (this.activeStreams.has(nodeId)) {
            logger.warn(`Stream for node ${nodeId} is already active. Terminating old stream.`);
            this.handleStreamDisconnection(nodeId);
        }

        const ffmpegArgs = [
            '-i', rtspUrl,
            '-c:v', 'copy', // Pass through video without re-encoding initially
            '-an', // No audio
            '-f', 'mpegts',
            'pipe:1'
        ];

        const streamProcess = spawn('ffmpeg', ffmpegArgs);
        
        const processor = {
            process: streamProcess,
            nodeId: nodeId,
        };

        streamProcess.stdout.on('data', (chunk) => {
            // In a real system, this chunk would be broadcast via the WebSocket server
            // this.nexusCenter.broadcastStreamData(nodeId, chunk);
        });

        streamProcess.stderr.on('data', (data) => {
            logger.debug(`[FFMPEG Node ${nodeId}]: ${data.toString()}`);
        });

        streamProcess.on('close', (code) => {
            logger.info(`Stream process for node ${nodeId} terminated with code ${code}`);
            this.handleStreamDisconnection(nodeId);
        });
        
        this.activeStreams.set(nodeId, processor);
        logger.info(`Stream established for node ${nodeId}`);
    }
    
    handleStreamDisconnection(nodeId) {
        const processor = this.activeStreams.get(nodeId);
        if (processor) {
            if (!processor.process.killed) {
                processor.process.kill('SIGTERM');
            }
            this.activeStreams.delete(nodeId);
            logger.info(`Cleaned up stream resources for node ${nodeId}`);
        }
    }
}

module.exports = StreamManager;