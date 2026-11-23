
import { useEffect, useState } from 'react';
import Auth from './Auth';
import Chatbot from './Chatbot';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';
import PdfSummarizer from './PdfSummarizer';
import QuizGenerator from './QuizGenerator';
import PersonalizedLearning from './PersonalizedLearning';
import './TeacherDashboard.css';
import './StudyComponents.css';
import './App.css';

// Common function for authenticated API requests
const fetchWithAuth = async (url) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication token missing. Please log in again.");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "API request failed");
  }

  return data;
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [serverStatus, setServerStatus] = useState("Connecting...");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");

  const [attendance, setAttendance] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [averageScore, setAverageScore] = useState(0);

  // Active view: "dashboard" | "summarizer" | "quiz" | "learning" | "assistant"
  const [activeView, setActiveView] = useState("dashboard");

  // Assignment submission modal
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submittingLoading, setSubmittingLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Check backend connection
  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend request failed");
        }
        return response.json();
      })
      .then((data) => {
        setServerStatus(data.message);
      })
      .catch(() => {
        setServerStatus("Backend connection failed");
      });
  }, []);

  // Fetch assignments
  useEffect(() => {
    if (!currentUser) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    const fetchAssignments = async () => {
      setLoading(true);
      setAssignmentError("");

      try {
        const data = await fetchWithAuth(
          "http://localhost:5000/api/assignments"
        );

        setAssignments(data.assignments || []);
      } catch (error) {
        console.error("Error fetching assignments:", error);
        setAssignmentError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [currentUser]);

  // Fetch attendance
  useEffect(() => {
    if (!currentUser) {
      setAttendance(0);
      return;
    }

    const fetchAttendance = async () => {
      try {
        const data = await fetchWithAuth(
          "http://localhost:5000/api/attendance"
        );

        setAttendance(data.attendancePercentage ?? 0);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
    };

    fetchAttendance();
  }, [currentUser]);

  // Fetch pending assignments
  useEffect(() => {
    if (!currentUser) {
      setPendingCount(0);
      return;
    }

    const fetchPendingAssignments = async () => {
      try {
        const data = await fetchWithAuth(
          "http://localhost:5000/api/pending-assignments"
        );

        setPendingCount(data.pendingCount ?? 0);
      } catch (error) {
        console.error("Error fetching pending assignments:", error);
      }
    };

    fetchPendingAssignments();
  }, [currentUser]);

  // Fetch course count
  useEffect(() => {
    if (!currentUser) {
      setCourseCount(0);
      return;
    }

    const fetchCourses = async () => {
      try {
        const data = await fetchWithAuth(
          "http://localhost:5000/api/courses/count"
        );

        setCourseCount(data.courseCount ?? 0);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
  }, [currentUser]);

  // Fetch average score
  useEffect(() => {
    if (!currentUser) {
      setAverageScore(0);
      return;
    }

    const fetchAverageScore = async () => {
      try {
        const data = await fetchWithAuth(
          "http://localhost:5000/api/results/average"
        );

        setAverageScore(data.averageScore ?? 0);
      } catch (error) {
        console.error("Error fetching average score:", error);
      }
    };

    fetchAverageScore();
  }, [currentUser]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setCurrentUser(null);
    setAssignments([]);
    setAttendance(0);
    setPendingCount(0);
    setCourseCount(0);
    setAverageScore(0);
    setAssignmentError("");
    setActiveView("dashboard");
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!submittingAssignment || !submissionText.trim()) return;

    setSubmittingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/assignments/${submittingAssignment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ submission_text: submissionText.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not submit assignment");
      }

      setSubmitSuccess("Assignment submitted successfully!");
      setSubmissionText("");
      setTimeout(() => {
        setSubmitSuccess("");
        setSubmittingAssignment(null);
      }, 2000);

      // Refresh pending count
      const pData = await fetchWithAuth("http://localhost:5000/api/pending-assignments");
      setPendingCount(pData.pendingCount ?? 0);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingLoading(false);
    }
  };

  // Show login page if user is not logged in
  if (!currentUser) {
    return <Auth onAuthSuccess={setCurrentUser} />;
  }

  // Teacher view
  if (currentUser.role === "teacher") {
    return <TeacherDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  // Admin view
  if (currentUser.role === "admin") {
    return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">

        <h2 className="logo">
          EduSync<span> AI</span>
        </h2>

        <p className="menu-label">MAIN MENU</p>

        <nav>
          <a
            className={activeView === "dashboard" ? "active" : ""}
            href="#dashboard"
            onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); }}
          >
            ▦ Dashboard
          </a>

          <a
            className={activeView === "summarizer" ? "active" : ""}
            href="#summarizer"
            onClick={(e) => { e.preventDefault(); setActiveView("summarizer"); }}
          >
            📄 PDF Summarizer
          </a>

          <a
            className={activeView === "quiz" ? "active" : ""}
            href="#quiz"
            onClick={(e) => { e.preventDefault(); setActiveView("quiz"); }}
          >
            ❓ AI Practice Quiz
          </a>

          <a
            className={activeView === "learning" ? "active" : ""}
            href="#learning"
            onClick={(e) => { e.preventDefault(); setActiveView("learning"); }}
          >
            🌱 Personalized Learning
          </a>

          <a
            className={activeView === "assignments" ? "active" : ""}
            href="#assignments"
            onClick={(e) => { e.preventDefault(); setActiveView("assignments"); }}
          >
            📝 Assignments
          </a>

          <a
            className={activeView === "assistant" ? "active" : ""}
            href="#assistant"
            onClick={(e) => { e.preventDefault(); setActiveView("assistant"); }}
          >
            ✦ AI Assistant
          </a>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout} style={{
            background: "transparent",
            color: "#c4c8dc",
            border: "none",
            textAlign: "left",
            padding: "13px",
            fontSize: "14px",
            cursor: "pointer"
          }}>
            Logout
          </button>
          <a href="#settings">⚙ Settings</a>
          <a href="#help">? Help & Support</a>
        </div>

      </aside>

      {/* Main Dashboard */}
      <main className="main">

        {/* Top Header */}
        <header className="topbar">
          <div>
            <p className="eyebrow">STUDENT PORTAL</p>
            <h1>
              {activeView === "dashboard" && "Student Dashboard"}
              {activeView === "summarizer" && "PDF Study Material Summarizer"}
              {activeView === "quiz" && "AI Knowledge Check & Practice Quiz"}
              {activeView === "learning" && "Personalized Learning & Revision"}
              {activeView === "assignments" && "Course Assignments & Submissions"}
              {activeView === "assistant" && "AI Academic Assistant"}
            </h1>
            <p>Server status: {serverStatus}</p>
          </div>

          <div className="profile">
            <div className="avatar">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <p>{currentUser.role}</p>
            </div>
          </div>
        </header>

        {/* 1. DASHBOARD VIEW */}
        {activeView === "dashboard" && (
          <>
            {/* Welcome Section */}
            <section className="welcome">
              <div>
                <p>ACADEMIC OVERVIEW</p>
                <h2>Welcome back, {currentUser.name}! 👋</h2>
                <span>Here's what's happening with your academics today.</span>
              </div>
              <div className="welcome-icon">✦</div>
            </section>

            {/* Statistics Cards */}
            <section className="stats">
              <div className="stat-card">
                <span>Attendance</span>
                <h2>{attendance}%</h2>
                <small>Overall attendance</small>
              </div>

              <div className="stat-card">
                <span>Assignments</span>
                <h2>{String(pendingCount).padStart(2, "0")}</h2>
                <small>Pending submissions</small>
              </div>

              <div className="stat-card">
                <span>Average Score</span>
                <h2>{averageScore}%</h2>
                <small>Academic performance</small>
              </div>

              <div className="stat-card">
                <span>Courses</span>
                <h2>{String(courseCount).padStart(2, "0")}</h2>
                <small>Currently enrolled</small>
              </div>
            </section>

            {/* Content Grid */}
            <section className="content-grid">
              {/* Upcoming assignments preview */}
              <div className="panel" id="assignments">
                <div className="panel-heading">
                  <h3>Upcoming Assignments</h3>
                  <a href="#assignments" onClick={(e) => { e.preventDefault(); setActiveView("assignments"); }}>
                    View all
                  </a>
                </div>

                {loading ? (
                  <p>Loading assignments...</p>
                ) : assignmentError ? (
                  <p>{assignmentError}</p>
                ) : assignments.length > 0 ? (
                  assignments.slice(0, 3).map((assignment) => (
                    <div className="assignment" key={assignment.id}>
                      <div>
                        <strong>{assignment.subject}</strong>
                        <p>{assignment.task}</p>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span className="due">{assignment.dueDate || "No due date"}</span>
                        <button
                          className="teacher-btn secondary"
                          style={{ padding: "6px 10px", fontSize: "12px" }}
                          onClick={() => setSubmittingAssignment(assignment)}
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No assignments available.</p>
                )}
              </div>

              {/* AI Assistant Promo */}
              <div className="panel ai-panel" id="assistant">
                <div className="ai-symbol">✦</div>
                <h3>AI Academic Tools</h3>
                <p>
                  Summarize study PDFs, generate practice quizzes, or chat with your AI assistant.
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => setActiveView("summarizer")}>
                    Summarize PDF →
                  </button>
                  <button onClick={() => setActiveView("quiz")}>
                    Take Quiz →
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* 2. PDF SUMMARIZER VIEW */}
        {activeView === "summarizer" && <PdfSummarizer />}

        {/* 3. AI QUIZ GENERATOR VIEW */}
        {activeView === "quiz" && <QuizGenerator />}

        {/* 4. PERSONALIZED LEARNING VIEW */}
        {activeView === "learning" && <PersonalizedLearning />}

        {/* 5. ASSIGNMENTS VIEW */}
        {activeView === "assignments" && (
          <div className="panel">
            <div className="panel-heading">
              <h3>All Course Assignments</h3>
              <span>{pendingCount} Pending</span>
            </div>

            {loading ? (
              <p>Loading assignments...</p>
            ) : assignments.length > 0 ? (
              assignments.map((assignment) => (
                <div className="assignment" key={assignment.id}>
                  <div>
                    <strong style={{ fontSize: "15px" }}>{assignment.subject}</strong>
                    <p style={{ marginTop: "4px" }}>{assignment.task}</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span className="due">Due: {assignment.dueDate || "No due date"}</span>
                    <button
                      className="teacher-btn"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={() => setSubmittingAssignment(assignment)}
                    >
                      Submit Work
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No assignments posted yet.</p>
            )}
          </div>
        )}

        {/* 6. CHATBOT VIEW */}
        {activeView === "assistant" && (
          <section className="chatbot-section">
            <Chatbot />
          </section>
        )}

        {/* Footer */}
        <footer>
          © 2026 EduSync AI. Your unified academic ecosystem.
        </footer>

      </main>

      {/* STUDENT SUBMISSION MODAL */}
      {submittingAssignment && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Submit Solution: {submittingAssignment.subject}</h3>
              <button className="modal-close" onClick={() => setSubmittingAssignment(null)}>✕</button>
            </div>
            {submitSuccess ? (
              <div className="msg-banner success">{submitSuccess}</div>
            ) : (
              <form onSubmit={handleAssignmentSubmit}>
                <p style={{ fontSize: "13px", color: "#656980", marginBottom: "14px" }}>
                  Task: {submittingAssignment.task}
                </p>
                <div className="form-group">
                  <label>Your Solution / Answers / Code</label>
                  <textarea
                    rows="6"
                    placeholder="Enter or paste your assignment solution here..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    className="teacher-btn secondary"
                    onClick={() => setSubmittingAssignment(null)}
                    disabled={submittingLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="teacher-btn"
                    disabled={submittingLoading || !submissionText.trim()}
                  >
                    {submittingLoading ? "Submitting..." : "Submit Assignment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
