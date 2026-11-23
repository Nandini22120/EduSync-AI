import { useEffect, useState } from "react";
import "./TeacherDashboard.css";
import "./AdminDashboard.css";

const fetchAdminAPI = async (url, options = {}) => {
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
    throw new Error(data.message || "Admin request failed");
  }
  return data;
};

function AdminDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, users, attendance, assignments, performance
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState([]);
  const [perfReports, setPerfReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "" });

  // User management modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "student" });

  const [editingUser, setEditingUser] = useState(null);

  const showNotification = (text, type = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: "", type: "" }), 5000);
  };

  // Load Overview
  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminAPI("http://localhost:5000/api/admin/overview");
      setOverview(data.overview);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Load Users
  const loadUsers = async (role = "all") => {
    try {
      const url = role === "all"
        ? "http://localhost:5000/api/admin/users"
        : `http://localhost:5000/api/admin/users?role=${role}`;
      const data = await fetchAdminAPI(url);
      setUsers(data.users || []);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Load Attendance Stats
  const loadAttendanceStats = async () => {
    try {
      const data = await fetchAdminAPI("http://localhost:5000/api/admin/attendance-stats");
      setAttendanceStats(data.courseStats || []);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Load Assignment Stats
  const loadAssignmentStats = async () => {
    try {
      const data = await fetchAdminAPI("http://localhost:5000/api/admin/assignment-stats");
      setAssignmentStats(data.assignmentStats || []);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Load Performance Reports
  const loadPerformanceReports = async () => {
    try {
      const data = await fetchAdminAPI("http://localhost:5000/api/admin/performance-reports");
      setPerfReports(data);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  useEffect(() => {
    loadOverview();
    loadUsers("all");
    loadAttendanceStats();
    loadAssignmentStats();
    loadPerformanceReports();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers(userRoleFilter);
    }
  }, [userRoleFilter, activeTab]);

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await fetchAdminAPI("http://localhost:5000/api/admin/users", {
        method: "POST",
        body: JSON.stringify(newUser)
      });
      showNotification(`Account created for ${newUser.name} (${newUser.role})!`);
      setShowCreateUserModal(false);
      setNewUser({ name: "", email: "", password: "", role: "student" });
      loadUsers(userRoleFilter);
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await fetchAdminAPI(`http://localhost:5000/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role
        })
      });
      showNotification("Account updated successfully!");
      setEditingUser(null);
      loadUsers(userRoleFilter);
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user account "${userName}"?`)) return;
    try {
      await fetchAdminAPI(`http://localhost:5000/api/admin/users/${userId}`, {
        method: "DELETE"
      });
      showNotification(`User "${userName}" deleted.`);
      loadUsers(userRoleFilter);
      loadOverview();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">
          EduSync<span> AI</span>
        </h2>
        <p className="menu-label">ADMIN CONSOLE</p>

        <nav>
          <a
            className={activeTab === "overview" ? "active" : ""}
            href="#overview"
            onClick={(e) => { e.preventDefault(); setActiveTab("overview"); }}
          >
            ▦ Overview
          </a>
          <a
            className={activeTab === "users" ? "active" : ""}
            href="#users"
            onClick={(e) => { e.preventDefault(); setActiveTab("users"); }}
          >
            👥 Manage Users
          </a>
          <a
            className={activeTab === "attendance" ? "active" : ""}
            href="#attendance"
            onClick={(e) => { e.preventDefault(); setActiveTab("attendance"); }}
          >
            ◷ Attendance Stats
          </a>
          <a
            className={activeTab === "assignments" ? "active" : ""}
            href="#assignments"
            onClick={(e) => { e.preventDefault(); setActiveTab("assignments"); }}
          >
            📝 Assignment Stats
          </a>
          <a
            className={activeTab === "performance" ? "active" : ""}
            href="#performance"
            onClick={(e) => { e.preventDefault(); setActiveTab("performance"); }}
          >
            ▥ Academic Reports
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

      {/* Main Area */}
      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">INSTITUTION ADMINISTRATION</p>
            <h1>
              {activeTab === "overview" && "System Administration Overview"}
              {activeTab === "users" && "User Account Management"}
              {activeTab === "attendance" && "Institution Attendance Analytics"}
              {activeTab === "assignments" && "Assignment Completion Analytics"}
              {activeTab === "performance" && "Institutional Performance Reports"}
            </h1>
          </div>

          <div className="profile">
            <div className="avatar" style={{ background: "#ffebee", color: "#c62828" }}>
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{currentUser.name}</strong>
              <p>System Administrator</p>
            </div>
          </div>
        </header>

        {feedbackMsg.text && (
          <div className={`msg-banner ${feedbackMsg.type}`}>
            {feedbackMsg.text}
          </div>
        )}

        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <div className="admin-container">
            <section className="welcome" style={{ background: "linear-gradient(110deg, #1f274a, #343d6a)" }}>
              <div>
                <p>CENTRAL ADMINISTRATION</p>
                <h2>Welcome, Administrator {currentUser.name}! 🛡️</h2>
                <span>Comprehensive monitoring across students, faculty, courses, and academic deliverables.</span>
              </div>
              <div className="welcome-icon">✦</div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <span>Total Students</span>
                <h2>{String(overview?.totalStudents || 0).padStart(2, "0")}</h2>
                <small>Registered student accounts</small>
              </div>
              <div className="stat-card">
                <span>Total Teachers</span>
                <h2>{String(overview?.totalTeachers || 0).padStart(2, "0")}</h2>
                <small>Active faculty members</small>
              </div>
              <div className="stat-card">
                <span>Total Courses</span>
                <h2>{String(overview?.totalCourses || 0).padStart(2, "0")}</h2>
                <small>Active academic courses</small>
              </div>
              <div className="stat-card">
                <span>Overall Attendance</span>
                <h2>{overview?.overallAttendance || 0}%</h2>
                <small>Institution average</small>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <h3>Academic Deliverables</h3>
                </div>
                <div className="assignment">
                  <div>
                    <strong>Assignments Created</strong>
                    <p>Total assignments published by teachers</p>
                  </div>
                  <span className="due">{overview?.totalAssignments || 0}</span>
                </div>
                <div className="assignment">
                  <div>
                    <strong>Total Submissions</strong>
                    <p>Deliverables submitted by students</p>
                  </div>
                  <span className="due">{overview?.totalSubmissions || 0}</span>
                </div>
                <div className="assignment">
                  <div>
                    <strong>Overall Exam Performance</strong>
                    <p>Average marks across all examinations</p>
                  </div>
                  <span className="due" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
                    {overview?.overallAverageScore || 0}%
                  </span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <h3>Admin Actions</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                  <button className="admin-btn" onClick={() => { setActiveTab("users"); setShowCreateUserModal(true); }}>
                    + Add New Student / Teacher
                  </button>
                  <button className="admin-btn secondary" onClick={() => setActiveTab("attendance")}>
                    View Detailed Attendance →
                  </button>
                  <button className="admin-btn secondary" onClick={() => setActiveTab("assignments")}>
                    View Assignment Analytics →
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. MANAGE USERS */}
        {activeTab === "users" && (
          <div className="panel">
            <div className="admin-section-header">
              <h2>User Accounts</h2>
              <button className="admin-btn" onClick={() => setShowCreateUserModal(true)}>
                + Create New Account
              </button>
            </div>

            <div className="filter-pills">
              {["all", "student", "teacher", "admin"].map((role) => (
                <button
                  key={role}
                  className={`filter-pill ${userRoleFilter === role ? "active" : ""}`}
                  onClick={() => setUserRoleFilter(role)}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}s
                </button>
              ))}
            </div>

            <table className="teacher-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status-badge ${u.role === "admin" ? "absent" : u.role === "teacher" ? "late" : "present"}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="admin-btn secondary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => setEditingUser(u)}
                        >
                          Edit
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            className="admin-btn danger"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. ATTENDANCE STATISTICS */}
        {activeTab === "attendance" && (
          <div className="panel">
            <div className="admin-section-header">
              <h2>Course-wise Attendance Statistics</h2>
            </div>
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Instructor</th>
                  <th>Records</th>
                  <th>Present / Absent</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {attendanceStats.map((item) => (
                  <tr key={item.course_id}>
                    <td><strong>{item.course_code}</strong></td>
                    <td>{item.course_name}</td>
                    <td>{item.teacher_name || "Unassigned"}</td>
                    <td>{item.total_records}</td>
                    <td>
                      <span style={{ color: "#28a745", fontWeight: "bold" }}>{item.present_records || 0}</span> /{" "}
                      <span style={{ color: "#dc3545", fontWeight: "bold" }}>{item.absent_records || 0}</span>
                    </td>
                    <td>
                      <strong>{item.attendance_percentage}%</strong>
                      <div className="progress-bar-container">
                        <div
                          className={`progress-bar-fill ${item.attendance_percentage < 60 ? "danger" : item.attendance_percentage < 75 ? "warning" : ""}`}
                          style={{ width: `${Math.min(item.attendance_percentage, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {attendanceStats.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#85899b" }}>
                      No attendance data recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. ASSIGNMENT COMPLETION */}
        {activeTab === "assignments" && (
          <div className="panel">
            <div className="admin-section-header">
              <h2>Assignment Completion Statistics</h2>
            </div>
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Course</th>
                  <th>Instructor</th>
                  <th>Due Date</th>
                  <th>Submissions / Enrolled</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {assignmentStats.map((a) => (
                  <tr key={a.assignment_id}>
                    <td><strong>{a.title}</strong></td>
                    <td>{a.course_name} ({a.course_code})</td>
                    <td>{a.teacher_name || "N/A"}</td>
                    <td>{new Date(a.due_date).toLocaleDateString()}</td>
                    <td>
                      <strong>{a.total_submissions}</strong> / {a.total_enrolled}
                    </td>
                    <td>
                      <strong>{a.completion_percentage}%</strong>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(a.completion_percentage, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {assignmentStats.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#85899b" }}>
                      No assignments found in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. ACADEMIC PERFORMANCE REPORTS */}
        {activeTab === "performance" && (
          <div className="admin-container">
            <div className="panel">
              <div className="admin-section-header">
                <h2>Institutional Academic Performance by Course</h2>
              </div>
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Instructor</th>
                    <th>Exams Count</th>
                    <th>Average Score</th>
                    <th>Min - Max Score</th>
                  </tr>
                </thead>
                <tbody>
                  {perfReports?.coursePerformance?.map((cp) => (
                    <tr key={cp.course_id}>
                      <td><strong>{cp.course_name} ({cp.course_code})</strong></td>
                      <td>{cp.teacher_name || "Unassigned"}</td>
                      <td>{cp.total_exam_records}</td>
                      <td>
                        <strong style={{ color: "#5145c9", fontSize: "15px" }}>
                          {cp.average_score ? `${cp.average_score}%` : "N/A"}
                        </strong>
                      </td>
                      <td>
                        {cp.lowest_score !== null ? `${Math.round(cp.lowest_score)}% - ${Math.round(cp.highest_score)}%` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grade Band Distribution */}
            <div className="panel">
              <div className="admin-section-header">
                <h2>Institution-wide Grade Distribution</h2>
              </div>
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Grade Band</th>
                    <th>Student Exams Count</th>
                  </tr>
                </thead>
                <tbody>
                  {perfReports?.gradeDistribution?.map((g) => (
                    <tr key={g.grade_band}>
                      <td><strong>{g.grade_band}</strong></td>
                      <td><span className="due">{g.count} assessments</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE USER MODAL */}
      {showCreateUserModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create User Account</h3>
              <button className="modal-close" onClick={() => setShowCreateUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. jdoe@institution.edu"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Initial Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label>Account Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher / Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="admin-btn secondary" onClick={() => setShowCreateUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Edit User Account (#{editingUser.id})</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Account Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher / Faculty</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="admin-btn secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

