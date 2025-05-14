import request from 'supertest';
import { app } from '../index.ts'; // Adjust the import based on your app's structure
import { sendNotification } from '../utils/notificationUtils.js';

jest.mock('../utils/notificationUtils.js'); // Mock the notification function

describe('Server API Tests', () => {
  it('should return 400 for missing task', async () => {
    const response = await request(app).post('/submit-task').send({ username: 'user', password: 'pass' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Task is required and must be a string');
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request(app).post('/submit-task').send({ task: 'Test task', username: 'user', password: 'wrongpass' });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should notify on email vendor configuration validation failure', async () => {
    // Simulate a failure in the email vendor configuration
    const response = await request(app).post('/submit-task').send({ task: 'Test task', username: 'user', password: 'pass' });
    expect(sendNotification).toHaveBeenCalledWith(expect.stringContaining('Email vendor configuration validation failed'));
  });

  it('should notify on distribution configuration validation failure', async () => {
    // Simulate a failure in the distribution configuration
    const response = await request(app).post('/submit-task').send({ task: 'Test task', username: 'user', password: 'pass' });
    expect(sendNotification).toHaveBeenCalledWith(expect.stringContaining('Distribution configuration validation failed'));
  });

  it('should notify on IMAP connection test failure', async () => {
    // Simulate a failure in the IMAP connection test
    const response = await request(app).post('/submit-task').send({ task: 'Test task', username: 'user', password: 'pass' });
    expect(sendNotification).toHaveBeenCalledWith(expect.stringContaining('IMAP connection test failed.'));
  });
});
