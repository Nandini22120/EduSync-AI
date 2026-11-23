
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const chatRoutes = require("./routes/chatRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studyRoutes = require("./routes/studyRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/study", studyRoutes);

// Health-check API
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "EduSync AI backend is running"
    });
});

// Welcome route
app.get("/", (req, res) => {
    res.send("Welcome to EduSync AI!");
});

// MySQL connection test
app.get("/api/db-test", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            success: true,
            message: "MySQL connected successfully!",
            database: rows[0].database_name
        });
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Fetch assignments for logged-in student
app.get("/api/assignments", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                a.id,
                c.course_name AS subject,
                a.description AS task,
                DATE_FORMAT(a.due_date, '%b %d') AS dueDate
            FROM assignments a
            INNER JOIN enrollments e
                ON a.course_id = e.course_id
            INNER JOIN courses c
                ON a.course_id = c.id
            WHERE e.student_id = ?
            ORDER BY a.due_date ASC
        `, [req.user.id]);

        res.json({
            success: true,
            assignments: rows
        });
    } catch (error) {
        console.error("Assignment error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not fetch assignments"
        });
    }
});

// Student submit assignment
app.post("/api/assignments/:id/submit", authMiddleware, async (req, res) => {
    try {
        const studentId = req.user.id;
        const assignmentId = req.params.id;
        const { submission_text } = req.body;

        if (!submission_text || !submission_text.trim()) {
            return res.status(400).json({
                success: false,
                message: "Submission text cannot be empty"
            });
        }

        // Check if student already submitted
        const [existing] = await db.query(
            "SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?",
            [assignmentId, studentId]
        );

        if (existing.length > 0) {
            await db.query(
                "UPDATE submissions SET submission_text = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?",
                [submission_text.trim(), existing[0].id]
            );
            return res.json({ success: true, message: "Assignment updated successfully" });
        }

        await db.query(
            "INSERT INTO submissions (assignment_id, student_id, submission_text) VALUES (?, ?, ?)",
            [assignmentId, studentId, submission_text.trim()]
        );

        res.status(201).json({ success: true, message: "Assignment submitted successfully" });
    } catch (error) {
        console.error("Submission error:", error.message);
        res.status(500).json({ success: false, message: "Could not submit assignment" });
    }
});

// Fetch attendance percentage
app.get("/api/attendance", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                COUNT(*) AS totalClasses,
                SUM(CASE
                    WHEN status = 'present' THEN 1
                    ELSE 0
                END) AS presentClasses
            FROM attendance
            WHERE student_id = ?
        `, [req.user.id]);

        const totalClasses = Number(rows[0].totalClasses);
        const presentClasses = Number(rows[0].presentClasses || 0);

        const attendancePercentage = totalClasses > 0
            ? Math.round((presentClasses / totalClasses) * 100)
            : 0;

        res.json({
            success: true,
            totalClasses,
            presentClasses,
            attendancePercentage
        });
    } catch (error) {
        console.error("Attendance error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not fetch attendance"
        });
    }
});

// Fetch pending assignments
app.get("/api/pending-assignments", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) AS pendingCount
            FROM enrollments e
            INNER JOIN assignments a
                ON a.course_id = e.course_id
            LEFT JOIN submissions s
                ON s.assignment_id = a.id
                AND s.student_id = e.student_id
            WHERE e.student_id = ?
            AND s.id IS NULL
        `, [req.user.id]);

        res.json({
            success: true,
            pendingCount: Number(rows[0].pendingCount)
        });
    } catch (error) {
        console.error("Pending assignments error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not fetch pending assignments"
        });
    }
});

// Fetch enrolled courses count
app.get("/api/courses/count", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) AS courseCount
            FROM enrollments
            WHERE student_id = ?
        `, [req.user.id]);

        res.json({
            success: true,
            courseCount: Number(rows[0].courseCount)
        });
    } catch (error) {
        console.error("Courses error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not fetch courses"
        });
    }
});

// Fetch average result score
app.get("/api/results/average", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                SUM(marks_obtained) AS totalObtained,
                SUM(total_marks) AS totalMarks
            FROM results
            WHERE student_id = ?
        `, [req.user.id]);

        const totalObtained = Number(rows[0].totalObtained || 0);
        const totalMarks = Number(rows[0].totalMarks || 0);

        const averageScore = totalMarks > 0
            ? Math.round((totalObtained / totalMarks) * 100)
            : 0;

        res.json({
            success: true,
            averageScore
        });
    } catch (error) {
        console.error("Average score error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not fetch average score"
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `EduSync AI backend running at http://localhost:${PORT}`
        );
    });
}

module.exports = app;
