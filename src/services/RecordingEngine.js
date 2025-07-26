const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const promClient = require('prom-client');
const logger = require('./logger');
const db = require('./db');

const recordingSessions = new promClient.Gauge({
  name: 'recording_sessions',
  help: 'Number of active recording sessions',
});

class RecordingEngine {
  constructor() {
    this.recordingSessions = new Map();
  }

  generateOutputPath(nodeId) {
    const outputDir = path.join(__dirname, '..', '..', 'recordings', String(nodeId));
    fs.mkdirSync(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    return path.join(outputDir, `${timestamp}.mp4`);
  }

  createFfmpegProcess(rtspUrl, outputPath) {
    const ffmpegArgs = [
      '-i', rtspUrl,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-an',
      outputPath,
    ];
    return spawn('ffmpeg', ffmpegArgs);
  }

  handleFfmpegEvents(ffmpegProcess, nodeId, outputPath) {
    ffmpegProcess.stderr.on('data', (data) => {
      logger.debug(`[FFMPEG REC ${nodeId}]: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
      logger.info(`Recording process for node ${nodeId} finished with code ${code}.`);
      this.recordingSessions.delete(nodeId);
      recordingSessions.dec();
      // Here you would update the database record for the session
    });
  }

  async startRecording(nodeId) {
    if (this.recordingSessions.has(nodeId)) {
      logger.warn(`Recording session for node ${nodeId} is already active.`);
      return;
    }
    recordingSessions.inc();

    try {
      const { rows } = await db.query('SELECT * FROM security_nodes WHERE node_id = $1', [nodeId]);
      if (rows.length === 0) {
        throw new Error(`Node with ID ${nodeId} not found.`);
      }
      const node = rows[0];
      const rtspUrl = `rtsp://${node.ip_address}:${node.port}${node.stream_path || '/video'}`;
      const outputPath = this.generateOutputPath(nodeId);
      const ffmpegProcess = this.createFfmpegProcess(rtspUrl, outputPath);

      const session = {
        nodeId,
        process: ffmpegProcess,
        outputPath,
        startTime: new Date(),
      };

      this.recordingSessions.set(nodeId, session);
      this.handleFfmpegEvents(ffmpegProcess, nodeId, outputPath);

      logger.info(`Started recording for node ${nodeId}. Output: ${outputPath}`);
      return session;
    } catch (error) {
      logger.error(`Failed to start recording for node ${nodeId}: ${error.message}`);
      recordingSessions.dec();
    }
  }

  stopRecording(nodeId) {
    const session = this.recordingSessions.get(nodeId);
    if (!session) {
      logger.warn(`No active recording session found for node ${nodeId}.`);
      return;
    }

    session.process.kill('SIGINT');
    logger.info(`Stopped recording for node ${nodeId}.`);
    recordingSessions.dec();
  }
}

module.exports = new RecordingEngine();
