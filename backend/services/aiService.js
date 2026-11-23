
require("dotenv").config();

async function getAIResponse(question, systemInstruction = null) {
    try {
        const { GoogleGenAI } = await import("@google/genai");

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("Gemini API key is missing from .env");
        }

        const ai = new GoogleGenAI({
            apiKey: apiKey
        });

        const instruction = systemInstruction || 
            "You are EduSync AI, a helpful academic assistant. Explain academic concepts in simple language suitable for university students. Provide clear explanations, examples, and step-by-step guidance when useful.";

        const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash"];
        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: question,
                    config: {
                        systemInstruction: instruction
                    }
                });

                if (response && response.text) {
                    return response.text;
                }
            } catch (err) {
                lastError = err;
                console.warn(`Gemini model ${model} failed, trying fallback:`, err.message?.slice(0, 120));
            }
        }

        throw lastError || new Error("Failed to get response from Gemini AI models");

    } catch (error) {
        console.error("Gemini AI service error:", error.message);
        throw error;
    }
}

// PDF Summarization function
async function generateSummary(text) {
    const instruction = 
        "You are EduSync AI, an expert academic tutor. Summarize the provided study material clearly and comprehensively for university students. Organize your summary into the following clear sections with Markdown formatting:\n" +
        "### 📌 Overview & Core Theme\n" +
        "### 🔑 Key Concepts & Definitions\n" +
        "### 📖 Detailed Explanations & Mechanisms\n" +
        "### 💡 Practical Examples & Applications\n" +
        "### 🎯 Quick Revision Takeaways";

    const prompt = `Please summarize this study material:\n\n${text.slice(0, 30000)}`;
    return await getAIResponse(prompt, instruction);
}

// AI Quiz Generation function
async function generateQuiz(topic, numberOfQuestions = 5) {
    const instruction = 
        "You are EduSync AI, an expert academic assessment creator. Create high quality multiple-choice questions for university students. " +
        "Return ONLY a valid JSON array of objects. Do not include markdown codeblocks, backticks, or other text outside the JSON. " +
        "Each object must have the following format:\n" +
        "{\n" +
        '  "question": "Question text here",\n' +
        '  "options": ["Option A", "Option B", "Option C", "Option D"],\n' +
        '  "correctAnswer": 0,\n' +
        '  "explanation": "Explanation of why this answer is correct"\n' +
        "}\n" +
        "where correctAnswer is the 0-based integer index of the correct option in the options array.";

    const prompt = `Generate a ${numberOfQuestions}-question multiple choice quiz on the topic or study material: "${topic}". Make sure the questions test conceptual understanding and application.`;

    const rawResponse = await getAIResponse(prompt, instruction);
    
    // Clean response of potential markdown fences
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
        const quizData = JSON.parse(cleaned);
        if (Array.isArray(quizData) && quizData.length > 0) {
            return quizData;
        }
        throw new Error("Parsed quiz is not an array");
    } catch (parseErr) {
        console.error("Quiz JSON parse error, raw was:", rawResponse.slice(0, 200));
        throw new Error("Unable to parse generated quiz questions. Please try again.");
    }
}

// Personalized Learning Recommendation function
async function generatePersonalizedRecommendations(studentData) {
    const instruction = 
        "You are EduSync AI, an encouraging and insightful academic learning coach. " +
        "Analyze the student's actual performance data (quiz scores, exam results, assignments, and attendance). " +
        "Provide constructive, growth-mindset personalized learning recommendations. " +
        "CRITICAL: Never label students negatively (e.g. do not say 'weak student' or 'failure'). Use supportive phrasing like 'Focus Area for Growth' or 'Recommended Practice'. " +
        "Return clear Markdown with:\n" +
        "### 🌟 Strengths & Current Mastery\n" +
        "### 🎯 Key Focus Areas for Practice\n" +
        "### 📚 Recommended Revision Activities\n" +
        "### 🗓️ Step-by-Step 7-Day Study Action Plan";

    const prompt = `Student Performance Record:\n${JSON.stringify(studentData, null, 2)}\n\nPlease provide personalized learning recommendations based strictly on these actual results.`;
    return await getAIResponse(prompt, instruction);
}

module.exports = {
    getAIResponse,
    generateSummary,
    generateQuiz,
    generatePersonalizedRecommendations
};
