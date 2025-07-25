const http = require('http');
const app = require('../src/app');

describe('Health Check', () => {
  let server;

  beforeAll((done) => {
    server = http.createServer(app);
    server.listen(done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should return 200 OK for the health check endpoint', (done) => {
    const port = server.address().port;
    http.get(`http://localhost:${port}/api/health`, (res) => {
      expect(res.statusCode).toBe(200);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        expect(JSON.parse(data)).toHaveProperty('status', 'API Operational');
        done();
      });
    });
  });
});
