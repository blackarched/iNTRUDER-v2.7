const express = require('express');
const {
  addNode,
  getAllNodes,
  getNodeById,
  updateNode,
  deleteNode,
  startRecording,
  stopRecording,
} = require('../controllers/nodesController');
const authMiddleware = require('../middleware/authMiddleware');
const validatorMiddleware = require('../middleware/validatorMiddleware');
const { nodesSchema } = require('../validators/nodesValidator');

const router = express.Router();

router.use(authMiddleware);

router
  .route('/')
  .post(validatorMiddleware(nodesSchema.addNode), addNode)
  .get(getAllNodes);

router
  .route('/:id')
  .get(getNodeById)
  .put(validatorMiddleware(nodesSchema.updateNode), updateNode)
  .delete(deleteNode);

router.post('/:id/start-recording', startRecording);
router.post('/:id/stop-recording', stopRecording);

module.exports = router;
