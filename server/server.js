// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subjects');
const teacherRoutes = require('./routes/teacherRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const generateTimetableRoute = require('./routes/generateTimetable');
const getSavedTimetable = require('./routes/generateTimetable');
const leaveRoutes = require('./routes/leaveRoutes');
const viewLeaveRoutes = require("./routes/viewleaveRoutes.js");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(bodyParser.json());

app.use('/api', authRoutes);
app.use('/api', subjectRoutes);
app.use('/api', teacherRoutes);
app.use('/api', classroomRoutes);
app.use('/api', generateTimetableRoute);
app.use('/api', getSavedTimetable);
app.use(assignmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use("/api/leave", viewLeaveRoutes);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
