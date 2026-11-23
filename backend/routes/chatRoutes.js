
const express = require("express");
const router = express.Router();

const { getAIResponse } = require("../services/aiService");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter a question."
            });
        }

        const answer = await getAIResponse(message);

        res.json({
            success: true,
            answer
        });

    } catch (error) {
        console.error("Chatbot error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to generate an AI response. Please try again."
        });
    }
});

module.exports = router;
