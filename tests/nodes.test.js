const request = require('supertest');
const app = require('../src/app');
const db = require('../src/services/db');
const jwt = require('jsonwebtoken');
const config = require('../config');

describe('Nodes API', () => {
  let token;

  beforeAll(async () => {
    // Clean up the nodes table before running the tests
    await db.query('DELETE FROM security_nodes');
    // Create a test user and generate a token
    const user = { userId: 1, role: 'admin' };
    token = jwt.sign(user, config.jwtSecret);
  });

  afterAll(async () => {
    // Clean up the database after all tests have run
    await db.query('DELETE FROM security_nodes');
    await db.end();
  });

  describe('POST /api/nodes', () => {
    it('should create a new node', async () => {
      const res = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          designation: 'Test Node',
          ip_address: '192.168.1.100',
          port: 8080,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('node_id');
      expect(res.body.designation).toBe('Test Node');
    });

    it('should return a 400 error for invalid input', async () => {
      const res = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          designation: 'Test Node 2',
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/nodes', () => {
    it('should return an array of nodes', async () => {
      const res = await request(app)
        .get('/api/nodes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/nodes/:id', () => {
    let nodeId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          designation: 'Node to be fetched',
          ip_address: '192.168.1.101',
          port: 8081,
        });
      nodeId = res.body.node_id;
    });

    it('should return a single node', async () => {
      const res = await request(app)
        .get(`/api/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('node_id', nodeId);
    });

    it('should return a 404 error for a non-existent node', async () => {
      const res = await request(app)
        .get('/api/nodes/9999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/nodes/:id', () => {
    let nodeId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          designation: 'Node to be updated',
          ip_address: '192.168.1.102',
          port: 8082,
        });
      nodeId = res.body.node_id;
    });

    it('should update a node', async () => {
      const res = await request(app)
        .put(`/api/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          designation: 'Updated Node',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body.designation).toBe('Updated Node');
    });
  });

  describe('DELETE /api/nodes/:id', () => {
    let nodeId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          designation: 'Node to be deleted',
          ip_address: '192.168.1.103',
          port: 8083,
        });
      nodeId = res.body.node_id;
    });

    it('should delete a node', async () => {
      const res = await request(app)
        .delete(`/api/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(204);
    });
  });
});
