const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

describe('Integration Tests', () => {
  let token;

  beforeAll(async () => {
    await db.query('DELETE FROM course_requests');
    await db.query('DELETE FROM course_offerings');
    await db.query('DELETE FROM section_course_history');
    await db.query('DELETE FROM users');

    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password',
        role: 'admin'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password'
      });
    token = res.body.token;
  });

  it('should assign courses to a section and then generate requests', async () => {
    const assignRes = await request(app)
      .post('/api/admin/sections/1/assign-courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_ids: [1, 2],
        semester: 3,
        intake: '2025',
        shift: 'morning',
        academic_year: '2025-2026'
      });

    expect(assignRes.statusCode).toEqual(201);
    expect(assignRes.body.offeringIds.length).toBe(2);

    const generateRes = await request(app)
      .post('/api/offerings/generate-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        section_id: 1
      });

    expect(generateRes.statusCode).toEqual(200);
    expect(generateRes.body.created).toBe(2);
  });
});
