const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ GET all teachers in department except the requesting one
router.get('/teachers', (req, res) => {
  const department = req.headers.department;

  const query = 'SELECT teacherName AS name, teacherID AS id FROM teachers WHERE department = ?';

  db.query(query, [department], (err, results) => {
    if (err) {
      console.error('Error fetching teachers:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// ✅ POST a leave request
router.post('/submit', (req, res) => {
  const {
    teacherId,
    leaveDate,
    period,
    reason,
    suggestedSubstituteId,
  } = req.body;

  const department = req.headers.department;

  if (!teacherId || !leaveDate || !period || !reason || !department) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const dayIndex = new Date(leaveDate).getDay(); // 0 = Sunday
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = weekdays[dayIndex];

  const query = `
    INSERT INTO leaverequests 
    (teacherId, leaveDate, day, period, reason, suggestedSubstituteId, department, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
  `;

  db.query(query, [
  teacherId,
  leaveDate,
  day,
  JSON.stringify(period),
  reason,
  suggestedSubstituteId || null, // explicitly pass null if undefined
  department
], (err, result) => {
    if (err) {
      console.error('Error submitting leave request:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ message: 'Leave request submitted', leaveId: result.insertId });
  });
});
router.get('/my-requests', (req, res) => {
  const teacherId = req.headers.teacherid;
  const department = req.headers.department;

  const query = `SELECT * FROM leaverequests WHERE teacherId = ? AND department = ? ORDER BY createdAt DESC`;

  db.query(query, [teacherId, department], (err, results) => {
    if (err) {
      console.error('Error fetching leave requests:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});


module.exports = router;
