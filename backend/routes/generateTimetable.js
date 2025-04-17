const express = require('express');
const router = express.Router();
const { query } = require('../dbPromise');

router.get('/generateTimetable', async (req, res) => {
  const department = req.headers.department;
  if (!department) return res.status(400).json({ error: "Department required" });

  try {
    const semesters = await query(
      'SELECT DISTINCT semester FROM subjects WHERE department = ?', [department]
    );

    const timetableData = [];

    for (const row of semesters) {
      const semester = row.semester;

      const subjects = await query(
        'SELECT * FROM subjects WHERE department = ? AND semester = ?', [department, semester]
      );
      const teachers = await query(
        'SELECT * FROM teachers WHERE department = ?', [department]
      );
      const rooms = await query('SELECT * FROM classrooms');

      // 5 days (Mon–Fri), 11 periods (P1, P2, Break1, P3, P4, Lunch, P5, P6, Break2, P7, P8)
      const timetable = Array.from({ length: 5 }, () => Array(11).fill(null));

      const usablePeriods = [0, 1, 3, 4, 6, 7, 9, 10]; // excludes breaks at 2, 5, 8

      // Prepare subject tracking
      const theorySubjects = subjects
        .filter(s => s.subjectType === 'Theory')
        .map(s => ({ ...s, remaining: s.periodsPerWeek }));

      const labSubjects = subjects
        .filter(s => s.subjectType === 'Lab')
        .map(s => ({ ...s, remaining: s.periodsPerWeek }));

      // Helper to find available teacher
      const findTeacher = (subjectName) =>
        teachers.find(t =>
          t.preferences.toLowerCase().includes(subjectName.toLowerCase())
        );

      // Assign subjects to timetable
      for (let day = 0; day < 5; day++) {
        let p = 0;

        while (p < usablePeriods.length) {
          const period = usablePeriods[p];

          // Try to assign Lab (2 continuous)
          if (labSubjects.length > 0 && p + 1 < usablePeriods.length) {
            const nextPeriod = usablePeriods[p + 1];

            if (nextPeriod === period + 1) {
              const lab = labSubjects.find(l => l.remaining >= 2);
              if (lab) {
                const teacher = findTeacher(lab.subjectName);
                const room = rooms.find(r => r.roomType === 'Lab') || { roomNo: 'TBD' };

                timetable[day][period] = {
                  subject: lab.subjectName + ' (Lab)',
                  teacher: teacher?.teacherName || 'TBD',
                  room: room.roomNo
                };
                timetable[day][nextPeriod] = {
                  subject: lab.subjectName + ' (Lab)',
                  teacher: teacher?.teacherName || 'TBD',
                  room: room.roomNo
                };

                lab.remaining -= 2;
                if (lab.remaining <= 0) {
                  labSubjects.splice(labSubjects.indexOf(lab), 1);
                }

                p += 2;
                continue;
              }
            }
          }

          // Try to assign Theory
          const theory = theorySubjects.find(t => t.remaining > 0);
          if (theory) {
            const teacher = findTeacher(theory.subjectName);
            const room = rooms.find(r => r.roomType === 'Theory') || { roomNo: 'TBD' };

            timetable[day][period] = {
              subject: theory.subjectName,
              teacher: teacher?.teacherName || 'TBD',
              room: room.roomNo
            };

            theory.remaining -= 1;
            if (theory.remaining <= 0) {
              theorySubjects.splice(theorySubjects.indexOf(theory), 1);
            }
          }

          p++;
        }
      }

      timetableData.push({
        semester,
        department,
        timetable
      });
    }

    res.json(timetableData);
  } catch (err) {
    console.error("Error generating timetable:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
