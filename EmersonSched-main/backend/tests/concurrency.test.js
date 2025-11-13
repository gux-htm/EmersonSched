const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

describe('Concurrency Tests', () => {
  let adminToken;
  let instructor1Token;
  let instructor2Token;
  let requestId;

  beforeAll(async () => {
    await db.query('DELETE FROM slot_reservations');
    await db.query('DELETE FROM room_assignments');
    await db.query('DELETE FROM course_requests');
    await db.query('DELETE FROM users');

    await request(app).post('/api/auth/register').send({ name: 'Admin', email: 'admin@test.com', password: 'password', role: 'admin' });
    await request(app).post('/api/auth/register').send({ name: 'Inst1', email: 'inst1@test.com', password: 'password', role: 'instructor' });
    await request(app).post('/api/auth/register').send({ name: 'Inst2', email: 'inst2@test.com', password: 'password', role: 'instructor' });

    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password' });
    adminToken = adminLogin.body.token;
    const [pending] = await db.query("SELECT id FROM users WHERE status = 'pending'");
    for(const user of pending) {
        await request(app).post('/api/auth/update-registration-status').set('Authorization', `Bearer ${adminToken}`).send({ userId: user.id, status: 'approved' });
    }

    const inst1Login = await request(app).post('/api/auth/login').send({ email: 'inst1@test.com', password: 'password' });
    instructor1Token = inst1Login.body.token;
    const inst2Login = await request(app).post('/api/auth/login').send({ email: 'inst2@test.com', password: 'password' });
    instructor2Token = inst2Login.body.token;

    const [offering] = await db.query("INSERT INTO course_offerings (course_id, section_id, semester) VALUES (1, 1, 3) RETURNING id");
    const [req] = await db.query("INSERT INTO course_requests (offering_id) VALUES (?) RETURNING id", [offering.insertId]);
    requestId = req.insertId;
  });

  it('should handle concurrent requests to accept the same course request', async () => {
    const payload = {
      request_id: requestId,
      selections: [{ time_slot_id: 1 }]
    };

    const promise1 = request(app).post('/api/timetable/accept-request').set('Authorization', `Bearer ${instructor1Token}`).send(payload);
    const promise2 = request(app).post('/api/timetable/accept-request').set('Authorization', `Bearer ${instructor2Token}`).send(payload);

    const [res1, res2] = await Promise.all([promise1, promise2]);

    const successResponse = res1.statusCode === 200 ? res1 : res2;
    const conflictResponse = res1.statusCode === 409 ? res1 : res2;

    expect(successResponse.statusCode).toBe(200);
    expect(conflictResponse.statusCode).toBe(409);

    const [requests] = await db.query('SELECT * FROM course_requests WHERE id = ?', [requestId]);
    expect(requests[0].status).toBe('accepted');
  });
});
