const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateCourse, validateSection, validate } = require('../utils/validation');

const router = express.Router();

// Get all courses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { major_id, semester, shift } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (major_id) {
      whereClause += ' AND c.major_id = ?';
      params.push(major_id);
    }
    
    if (semester) {
      whereClause += ' AND c.semester = ?';
      params.push(semester);
    }
    
    if (shift) {
      whereClause += ' AND c.shift = ?';
      params.push(shift);
    }
    
    const result = await executeQuery(`
      SELECT c.*, m.name as major_name, p.name as program_name 
      FROM courses c
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY c.code ASC
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch courses'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new course
router.post('/', authenticateToken, requireAdmin, validate(validateCourse), async (req, res) => {
  try {
    const { major_id, name, code, credit_hours, semester, shift } = req.body;
    
    // Check if major exists
    const majorResult = await executeQuery(
      'SELECT id FROM majors WHERE id = ?',
      [major_id]
    );
    
    if (!majorResult.success || majorResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Major not found'
      });
    }
    
    // Check if course code already exists
    const existingCourse = await executeQuery(
      'SELECT id FROM courses WHERE code = ?',
      [code]
    );
    
    if (existingCourse.success && existingCourse.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO courses (major_id, name, code, credit_hours, semester, shift) VALUES (?, ?, ?, ?, ?, ?)',
      [major_id, name, code, credit_hours, semester, shift]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create course'
      });
    }
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_COURSE', 'courses', result.data.insertId, JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { id: result.data.insertId, ...req.body }
    });
    
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update course
router.put('/:id', authenticateToken, requireAdmin, validate(validateCourse), async (req, res) => {
  try {
    const { id } = req.params;
    const { major_id, name, code, credit_hours, semester, shift } = req.body;
    
    // Check if course exists
    const existingResult = await executeQuery(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if new code conflicts with existing courses
    if (code !== existingResult.data[0].code) {
      const codeCheck = await executeQuery(
        'SELECT id FROM courses WHERE code = ? AND id != ?',
        [code, id]
      );
      
      if (codeCheck.success && codeCheck.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Course with this code already exists'
        });
      }
    }
    
    const result = await executeQuery(
      'UPDATE courses SET major_id = ?, name = ?, code = ?, credit_hours = ?, semester = ?, shift = ? WHERE id = ?',
      [major_id, name, code, credit_hours, semester, shift, id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update course'
      });
    }
    
    // Log update
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_COURSE', 'courses', id, JSON.stringify(existingResult.data[0]), JSON.stringify(req.body)]
    );
    
    res.json({
      success: true,
      message: 'Course updated successfully'
    });
    
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete course
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if course exists
    const existingResult = await executeQuery(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if course is being used in blocks
    const blockCheck = await executeQuery(
      'SELECT id FROM blocks WHERE course_id = ?',
      [id]
    );
    
    if (blockCheck.success && blockCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course that is assigned to timetable blocks'
      });
    }
    
    const result = await executeQuery(
      'DELETE FROM courses WHERE id = ?',
      [id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete course'
      });
    }
    
    // Log deletion
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_COURSE', 'courses', id, JSON.stringify(existingResult.data[0])]
    );
    
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get sections for a major
router.get('/sections/:majorId', authenticateToken, async (req, res) => {
  try {
    const { majorId } = req.params;
    const { shift } = req.query;
    
    let whereClause = 'WHERE s.major_id = ?';
    const params = [majorId];
    
    if (shift) {
      whereClause += ' AND s.shift = ?';
      params.push(shift);
    }
    
    const result = await executeQuery(`
      SELECT s.*, m.name as major_name, p.name as program_name 
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY s.name ASC
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sections'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create section
router.post('/sections', authenticateToken, requireAdmin, validate(validateSection), async (req, res) => {
  try {
    const { major_id, name, student_strength, shift } = req.body;
    
    // Check if major exists
    const majorResult = await executeQuery(
      'SELECT id FROM majors WHERE id = ?',
      [major_id]
    );
    
    if (!majorResult.success || majorResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Major not found'
      });
    }
    
    // Check if section name already exists for this major
    const existingSection = await executeQuery(
      'SELECT id FROM sections WHERE major_id = ? AND name = ?',
      [major_id, name]
    );
    
    if (existingSection.success && existingSection.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Section with this name already exists for this major'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO sections (major_id, name, student_strength, shift) VALUES (?, ?, ?, ?)',
      [major_id, name, student_strength, shift]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create section'
      });
    }
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_SECTION', 'sections', result.data.insertId, JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: { id: result.data.insertId, ...req.body }
    });
    
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update section
router.put('/sections/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, student_strength, shift } = req.body;
    
    // Check if section exists
    const existingResult = await executeQuery(
      'SELECT * FROM sections WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    // Check if new name conflicts with existing sections in same major
    if (name !== existingResult.data[0].name) {
      const nameCheck = await executeQuery(
        'SELECT id FROM sections WHERE major_id = ? AND name = ? AND id != ?',
        [existingResult.data[0].major_id, name, id]
      );
      
      if (nameCheck.success && nameCheck.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Section with this name already exists for this major'
        });
      }
    }
    
    const result = await executeQuery(
      'UPDATE sections SET name = ?, student_strength = ?, shift = ? WHERE id = ?',
      [name, student_strength, shift, id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update section'
      });
    }
    
    // Log update
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_SECTION', 'sections', id, JSON.stringify(existingResult.data[0]), JSON.stringify(req.body)]
    );
    
    res.json({
      success: true,
      message: 'Section updated successfully'
    });
    
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete section
router.delete('/sections/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if section exists
    const existingResult = await executeQuery(
      'SELECT * FROM sections WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    // Check if section is being used in blocks
    const blockCheck = await executeQuery(
      'SELECT id FROM blocks WHERE section_id = ?',
      [id]
    );
    
    if (blockCheck.success && blockCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete section that is assigned to timetable blocks'
      });
    }
    
    const result = await executeQuery(
      'DELETE FROM sections WHERE id = ?',
      [id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete section'
      });
    }
    
    // Log deletion
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_SECTION', 'sections', id, JSON.stringify(existingResult.data[0])]
    );
    
    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;