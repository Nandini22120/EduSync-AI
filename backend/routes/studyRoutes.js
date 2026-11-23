const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const {
    generateSummary,
    generateQuiz,
    generatePersonalizedRecommendations
} = require("../services/aiService");

// Protect all study routes with authentication
router.use(authMiddleware);

// Configure multer memory storage (files are never written to disk or exposed publicly)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    },
    fileFilter: (req, file, cb) => {
        const isPdfMime = file.mimetype === "application/pdf";
        const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");
        if (isPdfMime || isPdfExt) {
            cb(null, true);
        } else {
            cb(new Error("Only valid PDF files (.pdf) are allowed"));
        }
    }
});

// 1. PDF Summarization
router.post("/summarize-pdf", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a PDF file to upload."
            });
        }

        const buffer = req.file.buffer;
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();

        const extractedText = (result.text || "").trim();

        if (extractedText.length < 30) {
            return res.status(400).json({
                success: false,
                message: "Could not extract sufficient text from this PDF. Please ensure the document is not an empty or scanned image PDF."
            });
        }

        const summary = await generateSummary(extractedText);

        res.json({
            success: true,
            summary,
            fileName: req.file.originalname,
            extractedCharacters: extractedText.length
        });

    } catch (error) {
        console.error("PDF summarization error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to process and summarize the PDF document."
        });
    }
});

// 2. Generate AI Quiz
router.post("/generate-quiz", async (req, res) => {
    try {
        const { topic, count } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter a topic or subject for the quiz."
            });
        }

        const numQuestions = Math.min(Math.max(Number(count) || 5, 3), 10);
        const questions = await generateQuiz(topic.trim(), numQuestions);

        res.json({
            success: true,
            topic: topic.trim(),
            totalQuestions: questions.length,
            // Strip out correctAnswer from client view during test taking to prevent cheating!
            questions: questions.map((q, idx) => ({
                id: idx,
                question: q.question,
                options: q.options
            })),
            // Send encrypted or server-kept answer key token or keep answers in payload for verification
            quizToken: Buffer.from(JSON.stringify(questions)).toString("base64")
        });

    } catch (error) {
        console.error("Generate quiz error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Could not generate quiz. Please try again."
        });
    }
});

// 3. Submit Quiz Answers and Calculate Score
router.post("/submit-quiz", async (req, res) => {
    try {
        const studentId = req.user.id;
        const { topic, quizToken, answers } = req.body;

        if (!quizToken || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz submission data"
            });
        }

        // Decode original quiz questions from quizToken
        const originalQuestions = JSON.parse(
            Buffer.from(quizToken, "base64").toString("utf8")
        );

        let score = 0;
        const results = originalQuestions.map((q, index) => {
            const studentSelected = answers[index];
            const isCorrect = studentSelected === q.correctAnswer;
            if (isCorrect) score += 1;

            return {
                question: q.question,
                options: q.options,
                selectedOption: studentSelected !== undefined ? studentSelected : null,
                correctOption: q.correctAnswer,
                isCorrect,
                explanation: q.explanation
            };
        });

        const totalQuestions = originalQuestions.length;
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

        // Save attempt to database
        await db.query(`
            INSERT INTO quiz_attempts (student_id, topic, score, total_questions, percentage, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            studentId,
            topic || "General Knowledge",
            score,
            totalQuestions,
            percentage,
            JSON.stringify(results)
        ]);

        res.json({
            success: true,
            score,
            totalQuestions,
            percentage,
            results
        });

    } catch (error) {
        console.error("Submit quiz error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to evaluate quiz submission."
        });
    }
});

// 4. View Student Quiz History
router.get("/quiz-history", async (req, res) => {
    try {
        const studentId = req.user.id;
        const [history] = await db.query(`
            SELECT id, topic, score, total_questions, percentage, created_at
            FROM quiz_attempts
            WHERE student_id = ?
            ORDER BY created_at DESC
            LIMIT 15
        `, [studentId]);

        res.json({ success: true, history });
    } catch (error) {
        console.error("Quiz history error:", error.message);
        res.status(500).json({ success: false, message: "Could not fetch quiz history" });
    }
});

// 5. Personalized Learning Recommendations
router.get("/personalized-learning", async (req, res) => {
    try {
        const studentId = req.user.id;

        // 1. Fetch student info
        const [userRows] = await db.query("SELECT name, email FROM users WHERE id = ?", [studentId]);
        const studentName = userRows[0]?.name || "Student";

        // 2. Fetch quiz performance
        const [quizzes] = await db.query(`
            SELECT topic, score, total_questions, percentage, created_at
            FROM quiz_attempts
            WHERE student_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [studentId]);

        // 3. Fetch academic results
        const [results] = await db.query(`
            SELECT c.course_name, r.exam_name, r.marks_obtained, r.total_marks
            FROM results r
            INNER JOIN courses c ON r.course_id = c.id
            WHERE r.student_id = ?
        `, [studentId]);

        // 4. Fetch attendance
        const [attendance] = await db.query(`
            SELECT 
                COUNT(*) AS total_classes,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_classes
            FROM attendance
            WHERE student_id = ?
        `, [studentId]);

        const totalAtt = Number(attendance[0].total_classes || 0);
        const presentAtt = Number(attendance[0].present_classes || 0);
        const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

        // Compile performance data packet
        const performanceRecord = {
            studentName,
            overallAttendanceRate: `${attendanceRate}% (${presentAtt}/${totalAtt} classes attended)`,
            examResults: results.map((r) => ({
                course: r.course_name,
                exam: r.exam_name,
                score: `${r.marks_obtained} / ${r.total_marks} (${Math.round((r.marks_obtained / r.total_marks) * 100)}%)`
            })),
            recentQuizzes: quizzes.map((q) => ({
                topic: q.topic,
                score: `${q.score}/${q.total_questions} (${q.percentage}%)`
            }))
        };

        // Call Gemini for personalized guidance
        const recommendations = await generatePersonalizedRecommendations(performanceRecord);

        res.json({
            success: true,
            analytics: performanceRecord,
            recommendations
        });

    } catch (error) {
        console.error("Personalized learning error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not generate personalized learning recommendations."
        });
    }
});

module.exports = router;

