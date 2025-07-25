const Joi = require('joi');

exports.nodesSchema = {
  addNode: Joi.object({
    body: Joi.object({
      designation: Joi.string().required(),
      ip_address: Joi.string().ip().required(),
      port: Joi.number().port().required(),
      stream_path: Joi.string().uri({ relativeOnly: true }).optional().allow(''),
      node_type: Joi.string().optional().allow(''),
    }),
  }),
  updateNode: Joi.object({
    params: Joi.object({
      id: Joi.number().integer().required(),
    }),
    body: Joi.object({
      designation: Joi.string().optional(),
      ip_address: Joi.string().ip().optional(),
      port: Joi.number().port().optional(),
      stream_path: Joi.string().uri({ relativeOnly: true }).optional().allow(''),
      node_type: Joi.string().optional().allow(''),
      status: Joi.string().valid('online', 'offline', 'maintenance').optional(),
    }),
  }),
};
