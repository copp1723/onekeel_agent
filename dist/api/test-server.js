import request from 'supertest';
import { app } from './server';
describe('Test Server', () => {
    it('should respond to /health', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        // removed unused `req` param
    });
    it('should respond to /test-parser', async () => {
        const response = await request(app).post('/test-parser').send({ /* sample payload */});
        expect(response.status).toBe(200);
    });
});
//# sourceMappingURL=test-server.js.map