const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateProgram, validateMajor, validate } = require('../utils/validation');

const router = express.Router();

// Get all programs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM programs ORDER BY name ASC'
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch programs'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new program
router.post('/', authenticateToken, requireAdmin, validate(validateProgram), async (req, res) => {
  try {
    const { name, system_type, total_semesters, shift } = req.body;
    
    const result = await executeQuery(
      'INSERT INTO programs (name, system_type, total_semesters, shift) VALUES (?, ?, ?, ?)',
      [name, system_type, total_semesters, shift]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create program'
      });
    }
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_PROGRAM', 'programs', result.data.insertId, JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: { id: result.data.insertId, ...req.body }
    });
    
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update program
router.put('/:id', authenticateToken, requireAdmin, validate(validateProgram), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, system_type, total_semesters, shift } = req.body;
    
    // Check if program exists
    const existingResult = await executeQuery(
      'SELECT * FROM programs WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    const result = await executeQuery(
      'UPDATE programs SET name = ?, system_type = ?, total_semesters = ?, shift = ? WHERE id = ?',
      [name, system_type, total_semesters, shift, id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update program'
      });
    }
    
    // Log update
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_PROGRAM', 'programs', id, JSON.stringify(existingResult.data[0]), JSON.stringify(req.body)]
    );
    
    res.json({
      success: true,
      message: 'Program updated successfully'
    });
    
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete program
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if program exists
    const existingResult = await executeQuery(
      'SELECT * FROM programs WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    const result = await executeQuery(
      'DELETE FROM programs WHERE id = ?',
      [id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete program'
      });
    }
    
    // Log deletion
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_PROGRAM', 'programs', id, JSON.stringify(existingResult.data[0])]
    );
    
    res.json({
      success: true,
      message: 'Program deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get majors for a program
router.get('/:programId/majors', authenticateToken, async (req, res) => {
  try {
    const { programId } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM majors WHERE program_id = ? ORDER BY name ASC',
      [programId]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch majors'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create major for a program
router.post('/:programId/majors', authenticateToken, requireAdmin, validate(validateMajor), async (req, res) => {
  try {
    const { programId } = req.params;
    const { name } = req.body;
    
    // Check if program exists
    const programResult = await executeQuery(
      'SELECT id FROM programs WHERE id = ?',
      [programId]
    );
    
    if (!programResult.success || programResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO majors (program_id, name) VALUES (?, ?)',
      [programId, name]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create major'
      });
    }
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_MAJOR', 'majors', result.data.insertId, JSON.stringify({ program_id: programId, name })]
    );
    
    res.status(201).json({
      success: true,
      message: 'Major created successfully',
      data: { id: result.data.insertId, program_id: programId, name }
    });
    
  } catch (error) {
    console.error('Create major error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update major
router.put('/majors/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Check if major exists
    const existingResult = await executeQuery(
      'SELECT * FROM majors WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Major not found'
      });
    }
    
    const result = await executeQuery(
      'UPDATE majors SET name = ? WHERE id = ?',
      [name, id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update major'
      });
    }
    
    // Log update
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_MAJOR', 'majors', id, JSON.stringify(existingResult.data[0]), JSON.stringify({ name })]
    );
    
    res.json({
      success: true,
      message: 'Major updated successfully'
    });
    
  } catch (error) {
    console.error('Update major error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete major
router.delete('/majors/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if major exists
    const existingResult = await executeQuery(
      'SELECT * FROM majors WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Major not found'
      });
    }
    
    const result = await executeQuery(
      'DELETE FROM majors WHERE id = ?',
      [id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete major'
      });
    }
    
    // Log deletion
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_MAJOR', 'majors', id, JSON.stringify(existingResult.data[0])]
    );
    
    res.json({
      success: true,
      message: 'Major deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete major error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;