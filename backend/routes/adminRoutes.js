const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// All routes require authentication and admin role
router.use(authMiddleware, roleMiddleware("admin"));

// 1. Overview statistics
router.get("/overview", async (req, res) => {
    try {
        const [studentCount] = await db.query(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'student'"
        );
        const [teacherCount] = await db.query(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'"
        );
        const [courseCount] = await db.query(
            "SELECT COUNT(*) AS count FROM courses"
        );
        const [assignmentCount] = await db.query(
            "SELECT COUNT(*) AS count FROM assignments"
        );
        const [submissionCount] = await db.query(
            "SELECT COUNT(*) AS count FROM submissions"
        );

        // Overall attendance rate
        const [attRows] = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present
            FROM attendance
        `);
        const totalAtt = Number(attRows[0].total || 0);
        const presentAtt = Number(attRows[0].present || 0);
        const overallAttendance = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

        // Overall performance average
        const [perfRows] = await db.query(`
            SELECT 
                SUM(marks_obtained) AS totalObtained,
                SUM(total_marks) AS totalPossible
            FROM results
        `);
        const totalObtained = Number(perfRows[0].totalObtained || 0);
        const totalPossible = Number(perfRows[0].totalPossible || 0);
        const overallAverageScore = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;

        res.json({
            success: true,
            overview: {
                totalStudents: Number(studentCount[0].count || 0),
                totalTeachers: Number(teacherCount[0].count || 0),
                totalCourses: Number(courseCount[0].count || 0),
                totalAssignments: Number(assignmentCount[0].count || 0),
                totalSubmissions: Number(submissionCount[0].count || 0),
                overallAttendance,
                overallAverageScore
            }
        });
    } catch (error) {
        console.error("Admin overview error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch admin overview" });
    }
});

// 2. Manage student and teacher accounts
router.get("/users", async (req, res) => {
    try {
        const { role } = req.query;
        let query = "SELECT id, name, email, role, created_at FROM users";
        let params = [];

        if (role && ["student", "teacher", "admin"].includes(role)) {
            query += " WHERE role = ?";
            params.push(role);
        }

        query += " ORDER BY created_at DESC";

        const [users] = await db.query(query, params);
        res.json({ success: true, users });
    } catch (error) {
        console.error("Fetch users error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch users" });
    }
});

// Create new user (student/teacher/admin)
router.post("/users", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!["student", "teacher", "admin"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role specified" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "Email is already in use" });
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [name.trim(), normalizedEmail, hash, role]
        );

        res.status(201).json({
            success: true,
            message: "User created successfully",
            userId: result.insertId
        });
    } catch (error) {
        console.error("Admin create user error:", error.message);
        res.status(500).json({ success: false, message: "Could not create user" });
    }
});

// Update user
router.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ success: false, message: "Name, email, and role are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if email taken by another user
        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            [normalizedEmail, id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "Email already taken by another account" });
        }

        await db.query(
            "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?",
            [name.trim(), normalizedEmail, role, id]
        );

        res.json({ success: true, message: "User account updated successfully" });
    } catch (error) {
        console.error("Admin update user error:", error.message);
        res.status(500).json({ success: false, message: "Could not update user" });
    }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (Number(id) === req.user.id) {
            return res.status(400).json({ success: false, message: "You cannot delete your own admin account" });
        }

        // Clean up user-related records
        await db.query("DELETE FROM enrollments WHERE student_id = ?", [id]);
        await db.query("DELETE FROM submissions WHERE student_id = ?", [id]);
        await db.query("DELETE FROM attendance WHERE student_id = ?", [id]);
        await db.query("DELETE FROM results WHERE student_id = ?", [id]);
        await db.query("DELETE FROM users WHERE id = ?", [id]);

        res.json({ success: true, message: "User account deleted successfully" });
    } catch (error) {
        console.error("Admin delete user error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete user" });
    }
});

// 3. Attendance statistics
router.get("/attendance-stats", async (req, res) => {
    try {
        const [courseStats] = await db.query(`
            SELECT 
                c.id AS course_id,
                c.course_name,
                c.course_code,
                u.name AS teacher_name,
                COUNT(att.id) AS total_records,
                SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) AS present_records,
                SUM(CASE WHEN att.status = 'absent' THEN 1 ELSE 0 END) AS absent_records,
                SUM(CASE WHEN att.status = 'late' THEN 1 ELSE 0 END) AS late_records,
                ROUND(
                    CASE 
                        WHEN COUNT(att.id) > 0 THEN (SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) / COUNT(att.id)) * 100 
                        ELSE 0 
                    END, 1
                ) AS attendance_percentage
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            LEFT JOIN attendance att ON c.id = att.course_id
            GROUP BY c.id
        `);

        res.json({ success: true, courseStats });
    } catch (error) {
        console.error("Admin attendance stats error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch attendance statistics" });
    }
});

// 4. Assignment completion statistics
router.get("/assignment-stats", async (req, res) => {
    try {
        const [assignmentStats] = await db.query(`
            SELECT 
                a.id AS assignment_id,
                a.title,
                a.due_date,
                c.course_name,
                c.course_code,
                u.name AS teacher_name,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id) AS total_enrolled,
                (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS total_submissions,
                ROUND(
                    CASE 
                        WHEN (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id) > 0 
                        THEN ((SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) / (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id)) * 100
                        ELSE 0 
                    END, 1
                ) AS completion_percentage
            FROM assignments a
            INNER JOIN courses c ON a.course_id = c.id
            LEFT JOIN users u ON a.teacher_id = u.id
            ORDER BY a.due_date DESC
        `);

        res.json({ success: true, assignmentStats });
    } catch (error) {
        console.error("Admin assignment stats error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch assignment statistics" });
    }
});

// 5. Academic performance reports
router.get("/performance-reports", async (req, res) => {
    try {
        const [coursePerformance] = await db.query(`
            SELECT 
                c.id AS course_id,
                c.course_name,
                c.course_code,
                u.name AS teacher_name,
                COUNT(r.id) AS total_exam_records,
                ROUND(AVG(CASE WHEN r.total_marks > 0 THEN (r.marks_obtained / r.total_marks) * 100 ELSE 0 END), 1) AS average_score,
                MAX(CASE WHEN r.total_marks > 0 THEN (r.marks_obtained / r.total_marks) * 100 ELSE 0 END) AS highest_score,
                MIN(CASE WHEN r.total_marks > 0 THEN (r.marks_obtained / r.total_marks) * 100 ELSE 0 END) AS lowest_score
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            LEFT JOIN results r ON c.id = r.course_id
            GROUP BY c.id
        `);

        const [gradeDistribution] = await db.query(`
            SELECT 
                CASE 
                    WHEN (marks_obtained / total_marks) >= 0.85 THEN 'A (85-100%)'
                    WHEN (marks_obtained / total_marks) >= 0.70 THEN 'B (70-84%)'
                    WHEN (marks_obtained / total_marks) >= 0.50 THEN 'C (50-69%)'
                    ELSE 'D / Needs Practice (<50%)'
                END AS grade_band,
                COUNT(*) AS count
            FROM results
            WHERE total_marks > 0
            GROUP BY grade_band
        `);

        res.json({
            success: true,
            coursePerformance,
            gradeDistribution
        });
    } catch (error) {
        console.error("Admin performance reports error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch performance reports" });
    }
});

module.exports = router;
