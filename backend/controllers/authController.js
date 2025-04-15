// controllers/authController.js
const db = require('../db');

const loginHandler = (req, res) => {
    const { signInType } = req.body;

    if (signInType === 'admin') {
        const { email, password } = req.body;

        const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';
        db.query(query, [email, password], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            if (results.length > 0) {
                const admin = results[0];
                return res.status(200).json({
                    user: {
                        username: admin.username,
                        department: admin.department, // ✅ important for filtering
                        role: 'admin'
                    }
                });
            } else {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
        });

    } else if (signInType === 'teacher') {
        const { teacherID } = req.body;

        const query = 'SELECT * FROM teachers WHERE teacherID = ?';
        db.query(query, [teacherID], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            if (results.length > 0) {
                const teacher = results[0];
                return res.status(200).json({
                    user: {
                        teacherName: teacher.teacherName,
                        department: teacher.department, // if available
                        role: 'teacher'
                    }
                });
            } else {
                return res.status(401).json({ message: 'Invalid teacher ID' });
            }
        });

    } else {
        return res.status(400).json({ message: 'Invalid sign-in type' });
    }
};


module.exports = { loginHandler };
