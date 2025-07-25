const db = require('../services/db');
const logger = require('../services/logger');
const RecordingEngine = require('../services/RecordingEngine');

/**
 * @description Add a new security node to the system.
 * @route POST /api/nodes
 * @access Private
 */
exports.addNode = async (req, res, next) => {
  try {
    const { designation, ip_address, port, stream_path, node_type } = req.body;
    const result = await db.query(
      'INSERT INTO security_nodes (designation, ip_address, port, stream_path, node_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [designation, ip_address, port, stream_path, node_type]
    );
    logger.info(`New security node added: ${result.rows[0].designation}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.startRecording = async (req, res, next) => {
  try {
    const { id } = req.params;
    await RecordingEngine.startRecording(id);
    res.status(200).json({ message: `Recording started for node ${id}` });
  } catch (error) {
    next(error);
  }
};

exports.stopRecording = async (req, res, next) => {
  try {
    const { id } = req.params;
    RecordingEngine.stopRecording(id);
    res.status(200).json({ message: `Recording stopped for node ${id}` });
  } catch (error) {
    next(error);
  }
};

/**
 * @description Get all security nodes.
 * @route GET /api/nodes
 * @access Private
 */
exports.getAllNodes = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM security_nodes ORDER BY designation');
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * @description Get a single security node by ID.
 * @route GET /api/nodes/:id
 * @access Private
 */
exports.getNodeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM security_nodes WHERE node_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Node not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * @description Update a security node.
 * @route PUT /api/nodes/:id
 * @access Private
 */
exports.updateNode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { designation, ip_address, port, stream_path, node_type, status } = req.body;
    const result = await db.query(
      'UPDATE security_nodes SET designation = $1, ip_address = $2, port = $3, stream_path = $4, node_type = $5, status = $6, updated_at = NOW() WHERE node_id = $7 RETURNING *',
      [designation, ip_address, port, stream_path, node_type, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Node not found' });
    }
    logger.info(`Node ${id} updated: ${result.rows[0].designation}`);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * @description Delete a security node.
 * @route DELETE /api/nodes/:id
 * @access Private
 */
exports.deleteNode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM security_nodes WHERE node_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Node not found' });
    }
    logger.info(`Node ${id} deleted: ${result.rows[0].designation}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
