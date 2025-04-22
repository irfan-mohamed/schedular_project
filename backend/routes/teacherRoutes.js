const express = require('express');
const router = express.Router();
const db = require('../db');
const attachDepartment = require('../middlewares/attachDepartment');

router.use(attachDepartment);

// POST - Add teacher
router.post('/teachers', (req, res) => {
  const { teacherName, teacherID, preferences, email, designation } = req.body;
  const department = req.department;

  if (!teacherName || !teacherID || !email || !designation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const preferencesString = JSON.stringify(preferences || []);

  const sql = 'INSERT INTO teachers (teacherName, teacherID, preferences, email, department, designation) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, 
    [teacherName, teacherID, preferencesString, email, department, designation], 
    (err, result) => {
      if (err) {
        console.error("Error adding teacher:", err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Duplicate teacher ID or email' });
        }
        return res.status(500).json({ error: err.message });
      }
      return res.status(201).json({ message: 'Teacher added successfully' });
    }
  );
});

// GET - Fetch all teachers
router.get('/fetchteachers', (req, res) => {
  const department = req.department;
  const sql = 'SELECT * FROM teachers WHERE department = ? ORDER BY teacherName';
  db.query(sql, [department], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const parsedResults = results.map(teacher => ({
      ...teacher,
      preferences: JSON.parse(teacher.preferences || '[]'),
      // S.No is handled in frontend as index + 1
    }));

    res.status(200).json({ data: parsedResults });
  });
});

// PUT - Update teacher
router.put('/updateTeacher/:id', (req, res) => {
  const teacherId = req.params.id;
  const { teacherName, teacherID, preferences, email, designation } = req.body;
  const department = req.department;

  if (!teacherName || !teacherID || !email || !designation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const preferencesString = JSON.stringify(preferences || []);

  const sql = `
    UPDATE teachers 
    SET teacherName = ?, teacherID = ?, preferences = ?, email = ?, designation = ?
    WHERE id = ? AND department = ?
  `;

  db.query(sql, 
    [teacherName, teacherID, preferencesString, email, designation, teacherId, department], 
    (err, result) => {
      if (err) {
        console.error("Error updating teacher:", err);
        return res.status(500).json({ error: 'Failed to update teacher' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Teacher not found or unauthorized update' });
      }
      res.status(200).json({ message: 'Teacher updated successfully' });
    }
  );
});

// DELETE - Delete teacher by ID (restricted to department)
router.delete('/deleteTeacher/:id', (req, res) => {
  const { id } = req.params;
  const department = req.department;

  const sql = 'DELETE FROM teachers WHERE id = ? AND department = ?';
  db.query(sql, [id, department], (err, result) => {
    if (err) {
      console.error("Error deleting teacher:", err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Teacher not found or unauthorized delete' });
    }
    res.status(200).json({ message: 'Teacher deleted successfully' });
  });
});

module.exports = router;