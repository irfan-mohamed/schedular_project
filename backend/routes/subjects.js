const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust if your db connection file path is different
const attachDepartment = require('../middlewares/attachDepartment');

router.use(attachDepartment);

router.post('/addsubjects', (req, res) => {
  const { subjectType, subjectName, semester, lecturesPerWeek, labsPerWeek } = req.body;
  const department = req.department;
  const periodsPerWeek = subjectType === "Lab" ? labsPerWeek : lecturesPerWeek;

  const sql = `
    INSERT INTO subjects (subjectType, subjectName, semester, department, periodsPerWeek)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [subjectType, subjectName, semester, department, periodsPerWeek], (err, result) => {
    if (err) {
      console.error('Error inserting subject:', err);
      return res.status(500).json({ error: 'Failed to insert subject' });
    }
    res.status(201).json({ message: 'Subject added successfully', insertedId: result.insertId });
  });
});

router.get('/fetchsubjects', (req, res) => {
  console.log('GET /fetchsubjects called');
  const department = req.department;

  const sql = 'SELECT * FROM subjects WHERE department = ? ORDER BY id DESC';

  db.query(sql, [department], (err, results) => {
    if (err) {
      console.error('Error fetching subjects:', err);
      return res.status(500).json({ error: 'Failed to fetch subjects' });
    }
    res.status(200).json({data : results});
  });
});

// ✅ UPDATE SUBJECT
router.put('/updatesubject/:id', (req, res) => {
  const { id } = req.params;
  const { subjectType, subjectName, semester, lecturesPerWeek, labsPerWeek } = req.body;
  const department = req.department;
  const periodsPerWeek = subjectType === "Lab" ? labsPerWeek : lecturesPerWeek;

  const sql = `
    UPDATE subjects
    SET subjectType = ?, subjectName = ?, semester = ?, department = ?, periodsPerWeek = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [subjectType, subjectName, semester, department, periodsPerWeek, id],
    (err, result) => {
      if (err) {
        console.error('Error updating subject:', err);
        return res.status(500).json({ error: 'Failed to update subject' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      res.status(200).json({ message: 'Subject updated successfully' });
    }
  );
});



router.delete('/deletesubject/:id', (req, res) => {
  const subjectId = req.params.id;
  console.log('Deleting subject with ID:', subjectId);

  const sql = 'DELETE FROM subjects WHERE id = ?'; // ✅ No colon!
  db.query(sql, [subjectId], (err, result) => {
    if (err) {
      console.error('Error deleting subject:', err);
      return res.status(500).json({ error: 'Failed to delete subject' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.status(200).json({ message: 'Subject deleted successfully' });
  });
});



module.exports = router;
