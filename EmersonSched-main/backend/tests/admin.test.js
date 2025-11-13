const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

describe('Admin Controller', () => {
  let token;

  beforeAll(async () => {
    await db.query('DELETE FROM course_major_map');
    await db.query('DELETE FROM courses');
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

  it('should create a new course and map it to majors', async () => {
    const res = await request(app)
      .post('/api/admin/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Course',
        code: 'TC101',
        credit_hours: '3+0',
        type: 'theory',
        major_ids: [9, 10],
        applies_to_all_programs: false
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('courseId');

    const [courses] = await db.query('SELECT * FROM courses WHERE code = ?', ['TC101']);
    expect(courses.length).toBe(1);
    expect(courses[0].name).toBe('Test Course');

    const [mappings] = await db.query('SELECT * FROM course_major_map WHERE course_id = ?', [res.body.courseId]);
    expect(mappings.length).toBe(2);
  });
});
