const express = require("express");
const router = express.Router();
const db = require("../db"); // assume db is MySQL connection
const util = require("util");
const query = util.promisify(db.query).bind(db);

// Utility: Get teacher name from ID
const getTeacherNameById = async (teacherId) => {
  const rows = await query("SELECT teacherName FROM teachers WHERE teacherID = ?", [teacherId]);
  return rows[0]?.teacherName || "Unknown";
};

// ✅ View all leave requests (unchanged)
router.get("/view", async (req, res) => {
  const department = req.headers.department;
  try {
    const rows = await query(
      "SELECT * FROM leaverequests WHERE department = ? ORDER BY createdAt DESC",
      [department]
    );

    const enrichedRows = await Promise.all(
      rows.map(async (leave) => {
        const teacherName = await getTeacherNameById(leave.teacherId);
        const substituteName = leave.suggestedSubstituteId
          ? await getTeacherNameById(leave.suggestedSubstituteId)
          : null;

        return {
          ...leave,
          teacherName,
          teacherID: leave.teacherId,
          fromDate: leave.leaveDate,
          toDate: leave.leaveDate,
          substitute: substituteName,
        };
      })
    );

    res.json(enrichedRows);
  } catch (err) {
    console.error("Error fetching leave applications:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update leave status + timetable update
router.put("/update-status", async (req, res) => {
  const { id, status, approvedBy, suggestedSubstituteId, leaveDate, periods, teacherId } = req.body;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update leave request
    await conn.query(
      "UPDATE leaverequests SET status = ?, approvedBy = ?, suggestedSubstituteId = ? WHERE id = ?",
      [status, approvedBy, suggestedSubstituteId || null, id]
    );

    // 2. If approved, update timetable
    if (status === "Approved" && suggestedSubstituteId && periods?.length) {
      const [rows] = await conn.query(
        "SELECT timetable FROM semester_timetables WHERE date = ?",
        [leaveDate]
      );

      let timetable = rows.length ? JSON.parse(rows[0].timetable) : {};

      for (const period of periods) {
        for (const semKey in timetable) {
          if (timetable[semKey][period]?.teacherID === teacherId) {
            timetable[semKey][period].teacherID = suggestedSubstituteId;
          }
        }
      }

      if (rows.length) {
        await conn.query(
          "UPDATE semester_timetables SET timetable = ? WHERE date = ?",
          [JSON.stringify(timetable), leaveDate]
        );
      } else {
        await conn.query(
          "INSERT INTO semester_timetables (date, timetable) VALUES (?, ?)",
          [leaveDate, JSON.stringify(timetable)]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Leave request and timetable updated." });
  } catch (err) {
    await conn.rollback();
    console.error("Error approving leave:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

router.post("/free-teachers", async (req, res) => {
  const { date, periods, department } = req.body;

  if (!date || !periods || !Array.isArray(periods) || !department) {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }

  try {
    const teachers = await query(
      "SELECT teacherID, teacherName FROM teachers WHERE department = ?",
      [department]
    );

    const freeTeachers = [];

    for (const teacher of teachers) {
      const [rows] = await db.query(
        "SELECT timetable FROM teacher_timetables WHERE teacherID = ? AND date = ?",
        [teacher.teacherID, date]
      );

      let busyPeriods = [];

      if (rows.length) {
        const timetable = JSON.parse(rows[0].timetable);
        busyPeriods = Object.keys(timetable).filter(period => timetable[period]);
      }

      const freePeriods = periods.filter(p => !busyPeriods.includes(p.toString()));

      if (freePeriods.length === periods.length) {
        // Count total assigned periods (for workload sorting)
        const [countRows] = await db.query(
          "SELECT COUNT(*) as total FROM teacher_timetables WHERE teacherID = ?",
          [teacher.teacherID]
        );
        const totalPeriods = countRows[0]?.total || 0;

        freeTeachers.push({
          ...teacher,
          freePeriods,
          totalPeriods,
        });
      }
    }

    res.json(freeTeachers);
  } catch (err) {
    console.error("Error checking free teachers:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Check availability for one teacher
router.post("/check-availability", async (req, res) => {
  const { substituteId, date, periods } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT timetable FROM teacher_timetables WHERE teacherID = ? AND date = ?",
      [substituteId, date]
    );

    if (!rows.length) return res.json({ available: true });

    const timetable = JSON.parse(rows[0].timetable);
    const isAvailable = periods.every((p) => !timetable[p]);

    res.json({ available: isAvailable });
  } catch (err) {
    console.error("Error checking availability:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get list of free teachers sorted by availability
router.post("/free-teachers", async (req, res) => {
  const { department, date, periods } = req.body;

  try {
    const teachers = await query("SELECT teacherID, teacherName FROM teachers WHERE department = ?", [department]);

    const availabilityResults = await Promise.all(
      teachers.map(async (teacher) => {
        const [rows] = await db.query(
          "SELECT timetable FROM teacher_timetables WHERE teacherID = ? AND date = ?",
          [teacher.teacherID, date]
        );

        const timetable = rows?.[0]?.timetable ? JSON.parse(rows[0].timetable) : {};
        const freePeriods = periods.filter((p) => !timetable[p]);
        const totalAssigned = Object.values(timetable).filter((v) => v).length;

        return {
          teacherID: teacher.teacherID,
          teacherName: teacher.teacherName,
          freePeriods: freePeriods.length,
          totalAssigned,
          fullyFree: freePeriods.length === periods.length,
        };
      })
    );

    // Sort: fully available > partially available > busy, then by total load
    const sorted = availabilityResults
      .filter((t) => t.freePeriods > 0)
      .sort((a, b) => {
        if (b.fullyFree !== a.fullyFree) return b.fullyFree - a.fullyFree;
        return a.totalAssigned - b.totalAssigned;
      });

    res.json(sorted);
  } catch (err) {
    console.error("Error fetching free teachers:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
