# EduSync AI 🎓

### AI-Powered Academic Management and Personalized Learning Platform

EduSync AI is a web-based academic management system designed to bring students, teachers, and administrators together on one platform. It combines academic management tools with AI-powered learning assistance to make education more organized, accessible, and personalized.

## 🚀 Key Features

### 👨‍🎓 Student Dashboard
- View attendance records.
- Track assignments and deadlines.
- View examination results.
- Access personalized learning recommendations.
- Interact with the AI Academic Assistant.

### 👩‍🏫 Teacher Dashboard
- Manage courses.
- View enrolled students.
- Mark student attendance.
- Create and manage assignments.
- Review student submissions.
- Monitor class performance.

### 🛡️ Admin Dashboard
- Manage student and teacher accounts.
- Monitor total users and courses.
- View attendance statistics.
- Track assignment completion.
- Analyze academic performance.

### 🤖 AI-Powered Features
- **AI Academic Assistant:** Get explanations of academic topics.
- **PDF Summarization:** Convert academic PDF materials into structured summaries.
- **AI Quiz Generation:** Generate multiple-choice questions on academic topics.
- **Personalized Learning:** Receive recommendations and a 7-day study plan based on academic performance.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| React.js | Frontend |
| Vite | Frontend development |
| Node.js | Backend runtime |
| Express.js | Backend framework |
| MySQL | Database |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Google Gemini API | AI features |
| Multer | PDF upload handling |
| pdf-parse | PDF text extraction |

## 📁 Project Structure

```text
EduSync-AI/
│
├── backend/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── db.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   └── package.json
│
├── database/
│   └── schema.sql
│
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites
- Node.js (v18+)
- MySQL (v8.0+)
- Git
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Nandini22120/EduSync-AI.git
cd EduSync-AI
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=edusync_ai
JWT_SECRET=your_private_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Setup Database

Create a MySQL database named `edusync_ai` and execute the project's database schema:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE edusync_ai;
USE edusync_ai;
SOURCE database/schema.sql;
```

### 4. Start Backend

```bash
cd backend
node server.js
```

The backend server runs at `http://localhost:5000`.

### 5. Setup Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite (e.g. `http://localhost:5173`) in your browser.

## 👥 Default Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@edusync.demo` | `Admin@123456` |
| **Teacher** | `teacher@edusync.demo` | `Teacher@123` |
| **Student** | `student@edusync.demo` | `Student@123` |

## 🔐 Security

- JWT-based authentication.
- Role-based access control (Student, Teacher, Admin).
- Secure password hashing using bcrypt.
- Protected backend API routes with custom auth and role middleware.
- Private API keys stored in environment variables, never exposed in client code.
- In-memory PDF upload validation (type and file size).

## 🎯 Project Objective

The objective of EduSync AI is to create a unified academic ecosystem that simplifies academic management, supports teachers, improves student learning experiences, and uses artificial intelligence to provide personalized academic assistance.

## 👩‍💻 Project Status

Core student, teacher, and admin modules and AI-powered features have been implemented and thoroughly tested.

**Developed as an academic project.**

## 📌 Repository

https://github.com/Nandini22120/EduSync-AI

