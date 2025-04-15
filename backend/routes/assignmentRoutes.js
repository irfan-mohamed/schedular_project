const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust if needed

// POST: Assign a subject to a teacher
router.post('/api/theoryassignments', async (req, res) => {
  const { subjectId, teacherId } = req.body;
  try {
    const insertQuery = 'INSERT INTO theory_assignments (subjectId, teacherId) VALUES (?, ?)';
    await db.query(insertQuery, [subjectId, teacherId]);
    res.status(201).json({ message: 'Assignment created successfully' });
  } catch (error) {
    console.error('Error assigning theory subject:', error);
    res.status(500).json({ error: 'Assignment failed' });
  }
});

// GET: Fetch all assignments with subject and teacher info
router.get('/fetchassignments', (req, res) => {
    const query = `
      SELECT 
        ta.id AS assignmentId,
        s.subjectName,
        s.semester,
        s.department,
        t.teacherName
      FROM theory_assignments ta
      JOIN subjects s ON ta.subjectId = s.id
      JOIN teachers t ON ta.teacherId = t.id
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching assignments:', err);
        return res.status(500).json({ message: 'Error fetching assignments' });
      }
      res.status(200).json(results);
    });
  });
  

// DELETE: Remove an assignment
router.delete('/api/deleteAssignments/:id', async (req, res) => {
  const assignmentId = req.params.id;
  try {
    const deleteQuery = 'DELETE FROM theory_assignments WHERE id = ?';
    await db.query(deleteQuery, [assignmentId]);
    res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

module.exports = router;
