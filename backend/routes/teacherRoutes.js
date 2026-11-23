const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// All teacher routes require authentication and teacher (or admin) role
router.use(authMiddleware, roleMiddleware("teacher", "admin"));

// 1. Overview and statistics
router.get("/overview", async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Total courses taught by this teacher
        const [courseRows] = await db.query(
            "SELECT COUNT(*) AS totalCourses FROM courses WHERE teacher_id = ?",
            [teacherId]
        );

        // Total unique students enrolled across teacher's courses
        const [studentRows] = await db.query(`
            SELECT COUNT(DISTINCT e.student_id) AS totalStudents
            FROM enrollments e
            INNER JOIN courses c ON e.course_id = c.id
            WHERE c.teacher_id = ?
        `, [teacherId]);

        // Total assignments created
        const [assignmentRows] = await db.query(
            "SELECT COUNT(*) AS totalAssignments FROM assignments WHERE teacher_id = ?",
            [teacherId]
        );

        // Total submissions received
        const [submissionRows] = await db.query(`
            SELECT COUNT(s.id) AS totalSubmissions
            FROM submissions s
            INNER JOIN assignments a ON s.assignment_id = a.id
            WHERE a.teacher_id = ?
        `, [teacherId]);

        // Overall attendance rate in teacher's courses
        const [attendanceRows] = await db.query(`
            SELECT 
                COUNT(*) AS totalRecords,
                SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) AS presentRecords
            FROM attendance att
            INNER JOIN courses c ON att.course_id = c.id
            WHERE c.teacher_id = ?
        `, [teacherId]);

        const totalAtt = Number(attendanceRows[0].totalRecords || 0);
        const presentAtt = Number(attendanceRows[0].presentRecords || 0);
        const avgAttendance = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

        res.json({
            success: true,
            overview: {
                totalCourses: Number(courseRows[0].totalCourses || 0),
                totalStudents: Number(studentRows[0].totalStudents || 0),
                totalAssignments: Number(assignmentRows[0].totalAssignments || 0),
                totalSubmissions: Number(submissionRows[0].totalSubmissions || 0),
                avgAttendance
            }
        });
    } catch (error) {
        console.error("Teacher overview error:", error.message);
        res.status(500).json({ success: false, message: "Could not load teacher overview" });
    }
});

// 2. Manage courses: List courses
router.get("/courses", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const [courses] = await db.query(`
            SELECT 
                c.id,
                c.course_name,
                c.course_code,
                c.created_at,
                COUNT(e.id) AS enrolled_students
            FROM courses c
            LEFT JOIN enrollments e ON c.id = e.course_id
            WHERE c.teacher_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [teacherId]);

        res.json({ success: true, courses });
    } catch (error) {
        console.error("Fetch courses error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch courses" });
    }
});

// Create course
router.post("/courses", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { course_name, course_code } = req.body;

        if (!course_name || !course_code) {
            return res.status(400).json({ success: false, message: "Course name and code are required" });
        }

        const [result] = await db.query(
            "INSERT INTO courses (course_name, course_code, teacher_id) VALUES (?, ?, ?)",
            [course_name.trim(), course_code.trim().toUpperCase(), teacherId]
        );

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            courseId: result.insertId
        });
    } catch (error) {
        console.error("Create course error:", error.message);
        res.status(500).json({ success: false, message: "Could not create course" });
    }
});

// 3. View enrolled students for a course
router.get("/courses/:courseId/students", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { courseId } = req.params;

        // Verify course belongs to this teacher (or admin)
        const [course] = await db.query(
            "SELECT id, course_name FROM courses WHERE id = ? AND teacher_id = ?",
            [courseId, teacherId]
        );

        if (course.length === 0) {
            return res.status(403).json({ success: false, message: "Course not found or unauthorized" });
        }

        const [students] = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                e.enrolled_at
            FROM enrollments e
            INNER JOIN users u ON e.student_id = u.id
            WHERE e.course_id = ?
            ORDER BY u.name ASC
        `, [courseId]);

        res.json({ success: true, course: course[0], students });
    } catch (error) {
        console.error("Fetch enrolled students error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch enrolled students" });
    }
});

// Enroll a student into course
router.post("/courses/:courseId/enroll", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { courseId } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Student email is required" });
        }

        // Check course
        const [course] = await db.query(
            "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
            [courseId, teacherId]
        );
        if (course.length === 0) {
            return res.status(403).json({ success: false, message: "Course not found or unauthorized" });
        }

        // Find student
        const [student] = await db.query(
            "SELECT id, name FROM users WHERE email = ? AND role = 'student'",
            [email.trim().toLowerCase()]
        );
        if (student.length === 0) {
            return res.status(404).json({ success: false, message: "No registered student found with this email" });
        }

        const studentId = student[0].id;

        // Check if already enrolled
        const [existing] = await db.query(
            "SELECT id FROM enrollments WHERE course_id = ? AND student_id = ?",
            [courseId, studentId]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "Student is already enrolled in this course" });
        }

        await db.query(
            "INSERT INTO enrollments (course_id, student_id) VALUES (?, ?)",
            [courseId, studentId]
        );

        res.json({
            success: true,
            message: `Successfully enrolled ${student[0].name}`
        });
    } catch (error) {
        console.error("Enroll student error:", error.message);
        res.status(500).json({ success: false, message: "Could not enroll student" });
    }
});

// 4. Attendance: Get attendance for a course and date
router.get("/attendance", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { course_id, date } = req.query;

        if (!course_id) {
            return res.status(400).json({ success: false, message: "Course ID is required" });
        }

        // Verify course
        const [course] = await db.query(
            "SELECT id, course_name FROM courses WHERE id = ? AND teacher_id = ?",
            [course_id, teacherId]
        );
        if (course.length === 0) {
            return res.status(403).json({ success: false, message: "Course not found or unauthorized" });
        }

        const targetDate = date || new Date().toISOString().slice(0, 10);

        // Fetch all enrolled students along with their attendance status for that date if marked
        const [records] = await db.query(`
            SELECT 
                u.id AS student_id,
                u.name,
                u.email,
                att.id AS attendance_id,
                COALESCE(att.status, 'unmarked') AS status
            FROM enrollments e
            INNER JOIN users u ON e.student_id = u.id
            LEFT JOIN attendance att 
                ON att.student_id = u.id 
                AND att.course_id = e.course_id 
                AND DATE(att.attendance_date) = ?
            WHERE e.course_id = ?
            ORDER BY u.name ASC
        `, [targetDate, course_id]);

        res.json({
            success: true,
            date: targetDate,
            course: course[0],
            records
        });
    } catch (error) {
        console.error("Get attendance error:", error.message);
        res.status(500).json({ success: false, message: "Could not load attendance records" });
    }
});

// Mark attendance
router.post("/attendance", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { course_id, attendance_date, records } = req.body;

        if (!course_id || !attendance_date || !Array.isArray(records)) {
            return res.status(400).json({
                success: false,
                message: "course_id, attendance_date, and records array are required"
            });
        }

        // Verify course
        const [course] = await db.query(
            "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
            [course_id, teacherId]
        );
        if (course.length === 0) {
            return res.status(403).json({ success: false, message: "Course not found or unauthorized" });
        }

        for (const item of records) {
            const { student_id, status } = item;
            if (!student_id || !["present", "absent", "late"].includes(status)) continue;

            const [existing] = await db.query(
                "SELECT id FROM attendance WHERE student_id = ? AND course_id = ? AND DATE(attendance_date) = ?",
                [student_id, course_id, attendance_date]
            );

            if (existing.length > 0) {
                await db.query(
                    "UPDATE attendance SET status = ? WHERE id = ?",
                    [status, existing[0].id]
                );
            } else {
                await db.query(
                    "INSERT INTO attendance (student_id, course_id, attendance_date, status) VALUES (?, ?, ?, ?)",
                    [student_id, course_id, attendance_date, status]
                );
            }
        }

        res.json({ success: true, message: "Attendance marked successfully" });
    } catch (error) {
        console.error("Mark attendance error:", error.message);
        res.status(500).json({ success: false, message: "Could not mark attendance" });
    }
});

// 5. Create and manage assignments
router.get("/assignments", async (req, res) => {
    try {
        const teacherId = req.user.id;

        const [assignments] = await db.query(`
            SELECT 
                a.id,
                a.title,
                a.description,
                a.due_date,
                a.created_at,
                c.id AS course_id,
                c.course_name,
                c.course_code,
                COUNT(s.id) AS submission_count
            FROM assignments a
            INNER JOIN courses c ON a.course_id = c.id
            LEFT JOIN submissions s ON a.id = s.assignment_id
            WHERE a.teacher_id = ?
            GROUP BY a.id
            ORDER BY a.created_at DESC
        `, [teacherId]);

        res.json({ success: true, assignments });
    } catch (error) {
        console.error("Fetch assignments error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch assignments" });
    }
});

// Create assignment
router.post("/assignments", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { course_id, title, description, due_date } = req.body;

        if (!course_id || !title || !description || !due_date) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Verify course
        const [course] = await db.query(
            "SELECT id FROM courses WHERE id = ? AND teacher_id = ?",
            [course_id, teacherId]
        );
        if (course.length === 0) {
            return res.status(403).json({ success: false, message: "Course not found or unauthorized" });
        }

        const [result] = await db.query(
            "INSERT INTO assignments (course_id, teacher_id, title, description, due_date) VALUES (?, ?, ?, ?, ?)",
            [course_id, teacherId, title.trim(), description.trim(), due_date]
        );

        res.status(201).json({
            success: true,
            message: "Assignment created successfully",
            assignmentId: result.insertId
        });
    } catch (error) {
        console.error("Create assignment error:", error.message);
        res.status(500).json({ success: false, message: "Could not create assignment" });
    }
});

// Delete assignment
router.delete("/assignments/:id", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { id } = req.params;

        // Ensure belongs to teacher
        const [assignment] = await db.query(
            "SELECT id FROM assignments WHERE id = ? AND teacher_id = ?",
            [id, teacherId]
        );
        if (assignment.length === 0) {
            return res.status(404).json({ success: false, message: "Assignment not found or unauthorized" });
        }

        await db.query("DELETE FROM submissions WHERE assignment_id = ?", [id]);
        await db.query("DELETE FROM assignments WHERE id = ?", [id]);

        res.json({ success: true, message: "Assignment deleted successfully" });
    } catch (error) {
        console.error("Delete assignment error:", error.message);
        res.status(500).json({ success: false, message: "Could not delete assignment" });
    }
});

// 6. View student submissions for an assignment
router.get("/assignments/:assignmentId/submissions", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { assignmentId } = req.params;

        // Verify assignment
        const [assignment] = await db.query(`
            SELECT a.id, a.title, c.course_name 
            FROM assignments a
            INNER JOIN courses c ON a.course_id = c.id
            WHERE a.id = ? AND a.teacher_id = ?
        `, [assignmentId, teacherId]);

        if (assignment.length === 0) {
            return res.status(404).json({ success: false, message: "Assignment not found or unauthorized" });
        }

        const [submissions] = await db.query(`
            SELECT 
                s.id,
                s.student_id,
                u.name AS student_name,
                u.email AS student_email,
                s.submission_text,
                s.submitted_at
            FROM submissions s
            INNER JOIN users u ON s.student_id = u.id
            WHERE s.assignment_id = ?
            ORDER BY s.submitted_at DESC
        `, [assignmentId]);

        res.json({
            success: true,
            assignment: assignment[0],
            submissions
        });
    } catch (error) {
        console.error("Fetch submissions error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch submissions" });
    }
});

// 7. View class performance reports
router.get("/reports", async (req, res) => {
    try {
        const teacherId = req.user.id;

        const [courseReports] = await db.query(`
            SELECT 
                c.id AS course_id,
                c.course_name,
                c.course_code,
                COUNT(DISTINCT e.student_id) AS enrolled_students,
                COUNT(r.id) AS total_exam_records,
                ROUND(AVG(CASE WHEN r.total_marks > 0 THEN (r.marks_obtained / r.total_marks) * 100 ELSE 0 END), 1) AS average_score,
                MAX(CASE WHEN r.total_marks > 0 THEN (r.marks_obtained / r.total_marks) * 100 ELSE 0 END) AS highest_score,
                MIN(CASE WHEN r.total_marks > 0 THEN (r.marks_obtained / r.total_marks) * 100 ELSE 0 END) AS lowest_score
            FROM courses c
            LEFT JOIN enrollments e ON c.id = e.course_id
            LEFT JOIN results r ON c.id = r.course_id
            WHERE c.teacher_id = ?
            GROUP BY c.id
        `, [teacherId]);

        // Detailed recent student results
        const [recentResults] = await db.query(`
            SELECT 
                r.id,
                u.name AS student_name,
                c.course_name,
                r.exam_name,
                r.marks_obtained,
                r.total_marks,
                r.exam_date
            FROM results r
            INNER JOIN courses c ON r.course_id = c.id
            INNER JOIN users u ON r.student_id = u.id
            WHERE c.teacher_id = ?
            ORDER BY r.exam_date DESC
            LIMIT 20
        `, [teacherId]);

        res.json({
            success: true,
            courseReports,
            recentResults
        });
    } catch (error) {
        console.error("Teacher reports error:", error.message);
        res.status(500).json({ success: false, message: "Could not load performance reports" });
    }
});

module.exports = router;
