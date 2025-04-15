const express = require('express');
const router = express.Router();
const db = require('../db');
const attachDepartment = require('../middlewares/attachDepartment');

router.use(attachDepartment);
// POST - Add teacher
router.post('/teachers', (req, res) => {
  const { teacherName, teacherID, preferences, email } = req.body;
  const department = req.department; // ← This is crucial!

  if (!teacherName || !teacherID || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = 'INSERT INTO teachers (teacherName, teacherID, preferences, email, department) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [teacherName, teacherID, preferences, email, department], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'duplicate key error' });
      }
      return res.status(500).json({ error: err.message });
    }
    return res.status(201).json({ message: 'Teacher added successfully' });
  });
});



// GET - Fetch all teachers
router.get('/fetchteachers', (req, res) => {
  const department = req.department;
  const sql = 'SELECT * FROM teachers WHERE department = ?';
  db.query(sql, [department], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ data: results });
  });
});
router.put('/updateTeacher/:id', (req, res) => {
  const teacherId = req.params.id;
  const { teacherName, teacherID, preferences, email } = req.body;
  const department = req.header('department');

  const sql = `
    UPDATE teachers 
    SET teacherName = ?, teacherID = ?, preferences = ?, email = ? 
    WHERE id = ? AND department = ?
  `;

  db.query(sql, [teacherName, teacherID, preferences, email, teacherId, department], (err, result) => {
    if (err) {
      console.error("Error updating teacher:", err);
      return res.status(500).json({ error: 'Failed to update teacher' });
    }
    res.status(200).json({ message: 'Teacher updated successfully' });
  });
});

// DELETE - Delete teacher by ID
router.delete('/deleteTeacher/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM teachers WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: 'Teacher deleted successfully' });
  });
});

module.exports = router;
