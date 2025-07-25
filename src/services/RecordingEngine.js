const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const db = require('./db');

class RecordingEngine {
  constructor() {
    this.recordingSessions = new Map();
  }

  async startRecording(nodeId) {
    if (this.recordingSessions.has(nodeId)) {
      logger.warn(`Recording session for node ${nodeId} is already active.`);
      return;
    }

    try {
      const { rows } = await db.query('SELECT * FROM security_nodes WHERE node_id = $1', [nodeId]);
      if (rows.length === 0) {
        throw new Error(`Node with ID ${nodeId} not found.`);
      }
      const node = rows[0];
      const rtspUrl = `rtsp://${node.ip_address}:${node.port}${node.stream_path || '/video'}`;
      const outputDir = path.join(__dirname, '..', '..', 'recordings', String(nodeId));
      fs.mkdirSync(outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const outputPath = path.join(outputDir, `${timestamp}.mp4`);

      const ffmpegArgs = [
        '-i', rtspUrl,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-an',
        outputPath,
      ];

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.stderr.on('data', (data) => {
        logger.debug(`[FFMPEG REC ${nodeId}]: ${data}`);
      });

      const session = {
        nodeId,
        process: ffmpegProcess,
        outputPath,
        startTime: new Date(),
      };

      this.recordingSessions.set(nodeId, session);

      ffmpegProcess.on('close', (code) => {
        logger.info(`Recording process for node ${nodeId} finished with code ${code}.`);
        this.recordingSessions.delete(nodeId);
        // Here you would update the database record for the session
      });

      logger.info(`Started recording for node ${nodeId}. Output: ${outputPath}`);
      return session;
    } catch (error) {
      logger.error(`Failed to start recording for node ${nodeId}: ${error.message}`);
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
  }
}

module.exports = new RecordingEngine();
