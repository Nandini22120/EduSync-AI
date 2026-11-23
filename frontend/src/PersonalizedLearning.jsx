import { useEffect, useState } from "react";
import "./StudyComponents.css";

const fetchWithToken = async (url) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Please log in to continue.");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load personalized recommendations");
  }
  return data;
};

function PersonalizedLearning() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRecommendations = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetchWithToken("http://localhost:5000/api/study/personalized-learning");
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  return (
    <div className="study-container">
      <div className="study-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>🌱 Personalized Learning & Revision Guide</h2>
            <p className="subtitle" style={{ marginBottom: "0" }}>
              Tailored academic growth plan synthesized from your actual quiz scores, exam results, and attendance records.
            </p>
          </div>
          <button
            className="teacher-btn secondary"
            onClick={loadRecommendations}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "🔄 Refresh Analysis"}
          </button>
        </div>

        {error && <div className="msg-banner error" style={{ marginTop: "20px" }}>{error}</div>}

        {/* Real Analytics Highlights */}
        {data?.analytics && (
          <div style={{ marginTop: "25px" }}>
            <h4 style={{ color: "#55586d", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
              Your Academic Profile Snapshot
            </h4>

            <div className="analytics-metric-grid">
              <div className="analytics-metric-card">
                <span>Class Attendance</span>
                <h3>{data.analytics.overallAttendanceRate}</h3>
              </div>

              <div className="analytics-metric-card">
                <span>Exams Evaluated</span>
                <h3>{data.analytics.examResults?.length || 0} Assessments</h3>
              </div>

              <div className="analytics-metric-card">
                <span>Practice Quizzes Completed</span>
                <h3>{data.analytics.recentQuizzes?.length || 0} Quizzes</h3>
              </div>
            </div>

            {data.analytics.examResults?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#55586d", marginBottom: "8px" }}>
                  Course Examination Records:
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {data.analytics.examResults.map((r, idx) => (
                    <span key={idx} className="status-badge present" style={{ fontSize: "12px" }}>
                      {r.course} ({r.exam}): {r.score}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div className="upload-icon">✨</div>
            <p style={{ color: "#5145c9", fontWeight: "600", fontSize: "16px" }}>
              Gemini AI is analyzing your performance metrics...
            </p>
            <p style={{ color: "#85899b", fontSize: "13px" }}>
              Crafting personalized, positive learning recommendations and a 7-day study plan.
            </p>
          </div>
        )}

        {/* AI Recommendations Output */}
        {!loading && data?.recommendations && (
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ color: "#171b35", fontSize: "18px", marginBottom: "12px" }}>
              AI Growth & Revision Plan
            </h3>
            <div className="summary-output" style={{ background: "#fcfcff", border: "1px solid #dfdcf7" }}>
              {data.recommendations}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PersonalizedLearning;

