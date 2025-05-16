const express = require('express');
const router = express.Router();
const db = require('../db');

// Add classroom
router.post('/classrooms', (req, res) => {
  const { roomNo, roomType } = req.body;

  if (!roomNo || !roomType) {
    return res.status(400).json({ error: 'Room No and Room Type are required' });
  }

  const sql = 'INSERT INTO classrooms (roomNo, roomType) VALUES (?, ?)';
  db.query(sql, [roomNo, roomType], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Duplicate room number' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Classroom added successfully' });
  });
});


// Get all classrooms
router.get('/fetchClassroom', (req, res) => {
  const sql = 'SELECT * FROM classrooms';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ data: results });
  });
});

// Delete classroom
router.delete('/deleteClassroom/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM classrooms WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: 'Classroom deleted successfully' });
  });
});

module.exports = router;
