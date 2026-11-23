
import { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

function Chatbot() {
    const [messages, setMessages] = useState([
        {
            sender: "ai",
            text: "Hello! Welcome to EduSync AI. Ask me anything about your studies, assignments, or coursework."
        }
    ]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!message.trim() || loading) return;

        const userMessage = message.trim();
        setMessage("");
        setError("");

        setMessages((prev) => [
            ...prev,
            { sender: "user", text: userMessage }
        ]);

        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("You must be logged in to use the AI assistant.");
            }

            const response = await fetch("http://localhost:5000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to receive an AI response.");
            }

            setMessages((prev) => [
                ...prev,
                { sender: "ai", text: data.answer }
            ]);
        } catch (err) {
            console.error("Chat error:", err);
            setError(err.message);
            setMessages((prev) => [
                ...prev,
                {
                    sender: "ai",
                    text: `⚠️ ${err.message || "Something went wrong. Please check your connection or try again."}`
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            <div className="chatbot-header">
                <div>
                    <h2>EduSync AI Assistant</h2>
                    <p>Powered by Google Gemini • Real-time Academic Tutor</p>
                </div>
                <span className="demo-status live-status">Live</span>
            </div>

            <div className="chatbot-messages">
                {messages.map((item, index) => (
                    <div
                        key={index}
                        className={`chat-message ${item.sender}`}
                    >
                        <strong>{item.sender === "ai" ? "✦ EduSync AI" : "You"}</strong>
                        <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
                    </div>
                ))}

                {loading && (
                    <div className="chat-message ai loading-bubble">
                        <strong>✦ EduSync AI</strong>
                        <p className="typing-indicator">
                            <span>.</span><span>.</span><span>.</span> Thinking
                        </p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {error && <div className="chat-error-bar">{error}</div>}

            <form className="chatbot-input" onSubmit={handleSend}>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask any question about your syllabus, homework, or concepts..."
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !message.trim()}>
                    {loading ? "Sending..." : "Send"}
                </button>
            </form>
        </div>
    );
}

export default Chatbot;
