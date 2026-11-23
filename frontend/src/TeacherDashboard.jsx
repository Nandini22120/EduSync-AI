import { useEffect, useState } from "react";
import Chatbot from "./Chatbot";
import "./TeacherDashboard.css";

const fetchTeacherAPI = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No authentication token. Please log in.");

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

function TeacherDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, courses, attendance, assignments, reports, assistant
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "" });

  // Modals & Sub-states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ course_name: "", course_code: "" });

  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrollEmail, setEnrollEmail] = useState("");

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    course_id: "",
    title: "",
    description: "",
    due_date: ""
  });

  const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);

  // Attendance state
  const [attendanceCourseId, setAttendanceCourseId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const showNotification = (text, type = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: "", type: "" }), 5000);
  };

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await fetchTeacherAPI("http://localhost:5000/api/teacher/overview");
      setOverview(data.overview);
    } catch (err) {
      console.error(err);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Load Courses
  const loadCourses = async () => {
    try {
      const data = await fetchTeacherAPI("http://localhost:5000/api/teacher/courses");
      setCourses(data.courses || []);
      if (data.courses?.length > 0 && !attendanceCourseId) {
        setAttendanceCourseId(data.courses[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Assignments
  const loadAssignments = async () => {
    try {
      const data = await fetchTeacherAPI("http://localhost:5000/api/teacher/assignments");
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Reports
  const loadReports = async () => {
    try {
      const data = await fetchTeacherAPI("http://localhost:5000/api/teacher/reports");
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Attendance
  const loadAttendance = async (courseId, date) => {
    if (!courseId) return;
    try {
      setLoading(true);
      const data = await fetchTeacherAPI(
        `http://localhost:5000/api/teacher/attendance?course_id=${courseId}&date=${date}`
      );
      setAttendanceRecords(data.records || []);
    } catch (err) {
      console.error(err);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadCourses();
    loadAssignments();
    loadReports();
  }, []);

  useEffect(() => {
    if (activeTab === "attendance" && attendanceCourseId) {
      loadAttendance(attendanceCourseId, attendanceDate);
    }
  }, [activeTab, attendanceCourseId, attendanceDate]);

  // Create Course
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await fetchTeacherAPI("http://localhost:5000/api/teacher/courses", {
        method: "POST",
        body: JSON.stringify(newCourse)
      });
      showNotification("Course created successfully!");
      setShowCourseModal(false);
      setNewCourse({ course_name: "", course_code: "" });
      loadCourses();
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // View Enrolled Students
  const handleViewStudents = async (course) => {
    setSelectedCourseForStudents(course);
    try {
      const data = await fetchTeacherAPI(
        `http://localhost:5000/api/teacher/courses/${course.id}/students`
      );
      setEnrolledStudents(data.students || []);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Enroll Student
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedCourseForStudents || !enrollEmail.trim()) return;
    try {
      await fetchTeacherAPI(
        `http://localhost:5000/api/teacher/courses/${selectedCourseForStudents.id}/enroll`,
        {
          method: "POST",
          body: JSON.stringify({ email: enrollEmail.trim() })
        }
      );
      showNotification("Student enrolled successfully!");
      setEnrollEmail("");
      handleViewStudents(selectedCourseForStudents);
      loadCourses();
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Create Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await fetchTeacherAPI("http://localhost:5000/api/teacher/assignments", {
        method: "POST",
        body: JSON.stringify(newAssignment)
      });
      showNotification("Assignment created successfully!");
      setShowAssignmentModal(false);
      setNewAssignment({ course_id: "", title: "", description: "", due_date: "" });
      loadAssignments();
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await fetchTeacherAPI(`http://localhost:5000/api/teacher/assignments/${assignmentId}`, {
        method: "DELETE"
      });
      showNotification("Assignment deleted successfully!");
      loadAssignments();
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // View Submissions
  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignmentSubmissions(assignment);
    try {
      const data = await fetchTeacherAPI(
        `http://localhost:5000/api/teacher/assignments/${assignment.id}/submissions`
      );
      setSubmissionsList(data.submissions || []);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Toggle Attendance Status in Local State
  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) =>
        rec.student_id === studentId ? { ...rec, status } : rec
      )
    );
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (!attendanceCourseId || attendanceRecords.length === 0) return;
    setSavingAttendance(true);
    try {
      await fetchTeacherAPI("http://localhost:5000/api/teacher/attendance", {
        method: "POST",
        body: JSON.stringify({
          course_id: attendanceCourseId,
          attendance_date: attendanceDate,
          records: attendanceRecords.map((r) => ({
            student_id: r.student_id,
            status: r.status === "unmarked" ? "absent" : r.status
          }))
        })
      });
      showNotification("Attendance saved successfully!");
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">
          EduSync<span> AI</span>
        </h2>
        <p className="menu-label">TEACHER PORTAL</p>

        <nav>
          <a
            className={activeTab === "overview" ? "active" : ""}
            href="#overview"
            onClick={(e) => { e.preventDefault(); setActiveTab("overview"); }}
          >
            ▦ Overview
          </a>
          <a
            className={activeTab === "courses" ? "active" : ""}
            href="#courses"
            onClick={(e) => { e.preventDefault(); setActiveTab("courses"); }}
          >
            ▤ Courses & Students
          </a>
          <a
            className={activeTab === "attendance" ? "active" : ""}
            href="#attendance"
            onClick={(e) => { e.preventDefault(); setActiveTab("attendance"); }}
          >
            ◷ Mark Attendance
          </a>
          <a
            className={activeTab === "assignments" ? "active" : ""}
            href="#assignments"
            onClick={(e) => { e.preventDefault(); setActiveTab("assignments"); }}
          >
            📝 Assignments
          </a>
          <a
            className={activeTab === "reports" ? "active" : ""}
            href="#reports"
            onClick={(e) => { e.preventDefault(); setActiveTab("reports"); }}
          >
            ▥ Class Reports
          </a>
          <a
            className={activeTab === "assistant" ? "active" : ""}
            href="#assistant"
            onClick={(e) => { e.preventDefault(); setActiveTab("assistant"); }}
          >
            ✦ AI Assistant
          </a>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={onLogout} style={{
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <p className="eyebrow">TEACHER PORTAL</p>
            <h1>
              {activeTab === "overview" && "Teacher Dashboard"}
              {activeTab === "courses" && "Manage Courses & Students"}
              {activeTab === "attendance" && "Daily Attendance Register"}
              {activeTab === "assignments" && "Assignments & Submissions"}
              {activeTab === "reports" && "Class Performance Reports"}
              {activeTab === "assistant" && "AI Academic Assistant"}
            </h1>
          </div>

          <div className="profile">
            <div className="avatar">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <p>Faculty / Teacher</p>
            </div>
          </div>
        </header>

        {feedbackMsg.text && (
          <div className={`msg-banner ${feedbackMsg.type}`}>
            {feedbackMsg.text}
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="teacher-container">
            {/* Welcome banner */}
            <section className="welcome">
              <div>
                <p>ACADEMIC MANAGEMENT</p>
                <h2>Welcome, Professor {currentUser.name}! 🎓</h2>
                <span>Monitor course progress, track attendance, and manage student submissions.</span>
              </div>
              <div className="welcome-icon">✦</div>
            </section>

            {/* Statistics cards */}
            <section className="stats">
              <div className="stat-card">
                <span>Courses</span>
                <h2>{String(overview?.totalCourses || 0).padStart(2, "0")}</h2>
                <small>Assigned courses</small>
              </div>
              <div className="stat-card">
                <span>Enrolled Students</span>
                <h2>{String(overview?.totalStudents || 0).padStart(2, "0")}</h2>
                <small>Across all your courses</small>
              </div>
              <div className="stat-card">
                <span>Assignments</span>
                <h2>{String(overview?.totalAssignments || 0).padStart(2, "0")}</h2>
                <small>Active assignments</small>
              </div>
              <div className="stat-card">
                <span>Submissions</span>
                <h2>{String(overview?.totalSubmissions || 0).padStart(2, "0")}</h2>
                <small>Student submissions</small>
              </div>
            </section>

            {/* Quick Links / Summary */}
            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <h3>Active Courses</h3>
                  <a href="#courses" onClick={(e) => { e.preventDefault(); setActiveTab("courses"); }}>Manage</a>
                </div>
                {courses.length > 0 ? (
                  courses.slice(0, 4).map((c) => (
                    <div className="assignment" key={c.id}>
                      <div>
                        <strong>{c.course_name}</strong>
                        <p>Code: {c.course_code}</p>
                      </div>
                      <span className="due">{c.enrolled_students || 0} Students</span>
                    </div>
                  ))
                ) : (
                  <p>No courses created yet.</p>
                )}
              </div>

              <div className="panel ai-panel">
                <div className="ai-symbol">✦</div>
                <h3>AI Teaching Assistant</h3>
                <p>Generate quiz questions, summarize lecture readings, or clarify difficult syllabus concepts using Gemini AI.</p>
                <button onClick={() => setActiveTab("assistant")}>Open AI Assistant →</button>
              </div>
            </section>
          </div>
        )}

        {/* 2. COURSES TAB */}
        {activeTab === "courses" && (
          <div className="panel">
            <div className="teacher-section-header">
              <h2>My Courses</h2>
              <button className="teacher-btn" onClick={() => setShowCourseModal(true)}>
                + Create New Course
              </button>
            </div>

            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Enrolled Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.course_code}</strong></td>
                    <td>{c.course_name}</td>
                    <td>{c.enrolled_students || 0}</td>
                    <td>
                      <button
                        className="teacher-btn secondary"
                        onClick={() => handleViewStudents(c)}
                      >
                        View & Enroll Students
                      </button>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#85899b" }}>
                      No courses found. Click "+ Create New Course" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="panel">
            <div className="teacher-section-header">
              <h2>Mark Attendance</h2>
              {attendanceRecords.length > 0 && (
                <button
                  className="teacher-btn"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                >
                  {savingAttendance ? "Saving..." : "✓ Save Attendance"}
                </button>
              )}
            </div>

            <div className="attendance-controls">
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Select Course:
                </label>
                <select
                  value={attendanceCourseId}
                  onChange={(e) => setAttendanceCourseId(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d9d9e5" }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name} ({c.course_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Select Date:
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d9d9e5" }}
                />
              </div>
            </div>

            {loading ? (
              <p>Loading student roster...</p>
            ) : attendanceRecords.length > 0 ? (
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Current Status</th>
                    <th>Mark Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((r) => (
                    <tr key={r.student_id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.email}</td>
                      <td>
                        <span className={`status-badge ${r.status}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="attendance-status-btn-group">
                          <button
                            type="button"
                            className={`attendance-status-btn present ${r.status === "present" ? "selected" : ""}`}
                            onClick={() => handleStatusChange(r.student_id, "present")}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`attendance-status-btn absent ${r.status === "absent" ? "selected" : ""}`}
                            onClick={() => handleStatusChange(r.student_id, "absent")}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            className={`attendance-status-btn late ${r.status === "late" ? "selected" : ""}`}
                            onClick={() => handleStatusChange(r.student_id, "late")}
                          >
                            Late
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#85899b" }}>
                No students enrolled in this course yet. Please enroll students first in the "Courses & Students" tab.
              </p>
            )}
          </div>
        )}

        {/* 4. ASSIGNMENTS TAB */}
        {activeTab === "assignments" && (
          <div className="panel">
            <div className="teacher-section-header">
              <h2>Course Assignments</h2>
              <button className="teacher-btn" onClick={() => setShowAssignmentModal(true)}>
                + Create Assignment
              </button>
            </div>

            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Due Date</th>
                  <th>Submissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title}</strong>
                      <p style={{ color: "#85899b", fontSize: "12px", marginTop: "3px" }}>{a.description}</p>
                    </td>
                    <td>{a.course_name} ({a.course_code})</td>
                    <td>{new Date(a.due_date).toLocaleDateString()}</td>
                    <td>
                      <span className="due">{a.submission_count} submitted</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="teacher-btn secondary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => handleViewSubmissions(a)}
                        >
                          View Submissions
                        </button>
                        <button
                          className="teacher-btn danger"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => handleDeleteAssignment(a.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "#85899b" }}>
                      No assignments found. Click "+ Create Assignment" to post one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="teacher-container">
            <div className="panel">
              <div className="teacher-section-header">
                <h2>Course Performance Summary</h2>
              </div>
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Enrolled</th>
                    <th>Exams Count</th>
                    <th>Average Score</th>
                    <th>Score Range</th>
                  </tr>
                </thead>
                <tbody>
                  {reports?.courseReports?.map((cr) => (
                    <tr key={cr.course_id}>
                      <td><strong>{cr.course_name} ({cr.course_code})</strong></td>
                      <td>{cr.enrolled_students}</td>
                      <td>{cr.total_exam_records}</td>
                      <td>
                        <strong style={{ color: "#5145c9", fontSize: "15px" }}>
                          {cr.average_score ? `${cr.average_score}%` : "N/A"}
                        </strong>
                      </td>
                      <td>
                        {cr.lowest_score !== null ? `${Math.round(cr.lowest_score)}% - ${Math.round(cr.highest_score)}%` : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {(!reports?.courseReports || reports.courseReports.length === 0) && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "#85899b" }}>
                        No examination results recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Detailed exam marks */}
            <div className="panel">
              <div className="teacher-section-header">
                <h2>Recent Examination Marks</h2>
              </div>
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Exam</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports?.recentResults?.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.student_name}</strong></td>
                      <td>{r.course_name}</td>
                      <td>{r.exam_name}</td>
                      <td>
                        <strong style={{ color: "#28a745" }}>
                          {Number(r.marks_obtained)} / {Number(r.total_marks)}
                        </strong>{" "}
                        ({Math.round((r.marks_obtained / r.total_marks) * 100)}%)
                      </td>
                      <td>{new Date(r.exam_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {(!reports?.recentResults || reports.recentResults.length === 0) && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "#85899b" }}>
                        No recent results recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. AI ASSISTANT TAB */}
        {activeTab === "assistant" && (
          <section className="chatbot-section">
            <Chatbot />
          </section>
        )}
      </main>

      {/* MODAL: CREATE COURSE */}
      {showCourseModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create New Course</h3>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCourse}>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems"
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS201"
                  value={newCourse.course_code}
                  onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="teacher-btn secondary" onClick={() => setShowCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="teacher-btn">
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW & ENROLL STUDENTS */}
      {selectedCourseForStudents && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h3>Students in {selectedCourseForStudents.course_name}</h3>
              <button className="modal-close" onClick={() => setSelectedCourseForStudents(null)}>✕</button>
            </div>

            {/* Quick enroll form */}
            <form onSubmit={handleEnrollStudent} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input
                type="email"
                placeholder="Enter student email to enroll..."
                value={enrollEmail}
                onChange={(e) => setEnrollEmail(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #d9d9e5" }}
                required
              />
              <button type="submit" className="teacher-btn">
                Enroll Student
              </button>
            </form>

            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Enrolled On</th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email}</td>
                    <td>{new Date(s.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {enrolledStudents.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "#85899b" }}>
                      No students enrolled yet. Enter an email above to enroll.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ASSIGNMENT */}
      {showAssignmentModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Assignment</h3>
              <button className="modal-close" onClick={() => setShowAssignmentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label>Select Course</label>
                <select
                  value={newAssignment.course_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, course_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name} ({c.course_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="e.g. Memory Management Report"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description / Instructions</label>
                <textarea
                  rows="3"
                  placeholder="Explain the assignment expectations..."
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="teacher-btn secondary" onClick={() => setShowAssignmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="teacher-btn">
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW SUBMISSIONS */}
      {selectedAssignmentSubmissions && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3>Submissions for "{selectedAssignmentSubmissions.title}"</h3>
              <button className="modal-close" onClick={() => setSelectedAssignmentSubmissions(null)}>✕</button>
            </div>
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submitted At</th>
                  <th>Submission Content</th>
                </tr>
              </thead>
              <tbody>
                {submissionsList.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.student_name}</strong>
                      <p style={{ color: "#85899b", fontSize: "12px" }}>{sub.student_email}</p>
                    </td>
                    <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                    <td>
                      <div style={{
                        background: "#f8f8fc",
                        padding: "10px",
                        borderRadius: "6px",
                        whiteSpace: "pre-wrap",
                        fontSize: "13px"
                      }}>
                        {sub.submission_text}
                      </div>
                    </td>
                  </tr>
                ))}
                {submissionsList.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", color: "#85899b" }}>
                      No submissions received yet for this assignment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;

