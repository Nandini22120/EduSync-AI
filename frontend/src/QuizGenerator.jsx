import { useEffect, useState } from "react";
import "./StudyComponents.css";

const fetchWithToken = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Please log in to continue.");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

function QuizGenerator() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeQuiz, setActiveQuiz] = useState(null); // { topic, totalQuestions, questions, quizToken }
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null); // { score, totalQuestions, percentage, results }
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState([]);

  const sampleTopics = [
    "Binary Search Trees",
    "SQL Joins & Normalization",
    "Operating System Processes",
    "Time Complexity & Big O",
    "Computer Networks TCP/IP"
  ];

  const loadHistory = async () => {
    try {
      const data = await fetchWithToken("http://localhost:5000/api/study/quiz-history");
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerateQuiz = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError("Please enter a study topic.");
      return;
    }

    setLoading(true);
    setError("");
    setQuizResult(null);
    setUserAnswers({});

    try {
      const data = await fetchWithToken("http://localhost:5000/api/study/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ topic: topic.trim(), count })
      });

      setActiveQuiz(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex, optionIndex) => {
    if (quizResult) return; // locked after submission
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < activeQuiz.totalQuestions) {
      if (!window.confirm(`You have answered ${answeredCount} of ${activeQuiz.totalQuestions} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const answersArray = activeQuiz.questions.map((_, idx) =>
        userAnswers[idx] !== undefined ? userAnswers[idx] : null
      );

      const data = await fetchWithToken("http://localhost:5000/api/study/submit-quiz", {
        method: "POST",
        body: JSON.stringify({
          topic: activeQuiz.topic,
          quizToken: activeQuiz.quizToken,
          answers: answersArray
        })
      });

      setQuizResult(data);
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetQuiz = () => {
    setActiveQuiz(null);
    setUserAnswers({});
    setQuizResult(null);
    setError("");
  };

  return (
    <div className="study-container">
      {/* 1. QUIZ GENERATOR CARD */}
      <div className="study-card">
        <h2>❓ AI Practice Quiz Generator</h2>
        <p className="subtitle">
          Test your conceptual understanding. Gemini AI generates custom multiple-choice questions with full explanations.
        </p>

        {error && <div className="msg-banner error">{error}</div>}

        {!activeQuiz && (
          <div>
            <form onSubmit={handleGenerateQuiz}>
              <div className="form-group">
                <label>Enter Topic or Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Graph Algorithms, Operating System Deadlocks, REST APIs..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="topic-pills">
                <span style={{ fontSize: "12px", color: "#85899b", alignSelf: "center" }}>Suggested:</span>
                {sampleTopics.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className="topic-pill"
                    onClick={() => setTopic(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "15px", alignItems: "center", marginTop: "15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#55586d" }}>Questions:</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d9d9e5" }}
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <button type="submit" className="teacher-btn" disabled={loading || !topic.trim()}>
                  {loading ? "Generating Quiz with Gemini..." : "⚡ Generate Quiz"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. ACTIVE QUIZ QUESTIONS */}
        {activeQuiz && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <strong style={{ fontSize: "18px" }}>Topic: {activeQuiz.topic}</strong>
                <p style={{ fontSize: "13px", color: "#85899b" }}>{activeQuiz.totalQuestions} Questions</p>
              </div>
              <button className="teacher-btn secondary" onClick={handleResetQuiz}>
                Start New Quiz
              </button>
            </div>

            {/* Score Banner when completed */}
            {quizResult && (
              <div className="score-banner">
                <h3>{quizResult.percentage}% Score</h3>
                <p>
                  You answered {quizResult.score} of {quizResult.totalQuestions} questions correctly!
                </p>
              </div>
            )}

            {/* Questions list */}
            {activeQuiz.questions.map((q, qIndex) => {
              const reviewResult = quizResult?.results?.[qIndex];

              return (
                <div key={qIndex} className="quiz-question-box">
                  <p className="quiz-question-title">
                    Question {qIndex + 1}: {q.question}
                  </p>

                  <div className="quiz-options">
                    {q.options.map((optionText, optIndex) => {
                      const isSelected = userAnswers[qIndex] === optIndex;
                      let optionClass = isSelected ? "selected" : "";

                      if (reviewResult) {
                        if (optIndex === reviewResult.correctOption) {
                          optionClass = "correct";
                        } else if (isSelected && !reviewResult.isCorrect) {
                          optionClass = "incorrect";
                        }
                      }

                      return (
                        <div
                          key={optIndex}
                          className={`quiz-option-label ${optionClass}`}
                          onClick={() => handleOptionSelect(qIndex, optIndex)}
                        >
                          <span style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: isSelected ? "#5145c9" : "#eeeef5",
                            color: isSelected ? "white" : "#55586d",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}>
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span>{optionText}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {reviewResult && (
                    <div className="explanation-box">
                      <strong>💡 Explanation:</strong> {reviewResult.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {!quizResult && (
              <button
                className="teacher-btn"
                style={{ padding: "12px 24px", fontSize: "15px" }}
                onClick={handleSubmitQuiz}
                disabled={submitting}
              >
                {submitting ? "Grading..." : "✓ Submit Answers"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. QUIZ HISTORY */}
      <div className="study-card">
        <h2>📊 Past Practice Quiz Attempts</h2>
        <p className="subtitle">Track your recent scores and topic mastery.</p>

        <table className="teacher-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Date Taken</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td><strong>{h.topic}</strong></td>
                <td>{h.score} / {h.total_questions}</td>
                <td>
                  <span className={`status-badge ${h.percentage >= 70 ? "present" : h.percentage >= 50 ? "late" : "absent"}`}>
                    {h.percentage}%
                  </span>
                </td>
                <td>{new Date(h.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#85899b" }}>
                  No past quizzes found. Generate your first quiz above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QuizGenerator;

