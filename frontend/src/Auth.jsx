
import { useState } from "react";
import "./Auth.css";

function Auth({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "student"
    });

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        const endpoint = isLogin
            ? "login"
            : "register";

        try {
            const response = await fetch(
                `http://localhost:5000/api/auth/${endpoint}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(
                        isLogin
                            ? {
                                email: formData.email,
                                password: formData.password
                            }
                            : formData
                    )
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Something went wrong");
            }

            if (isLogin) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                onAuthSuccess(data.user);
            } else {
                setMessage("Registration successful! Please log in.");

                setIsLogin(true);

                setFormData({
                    name: "",
                    email: formData.email,
                    password: "",
                    role: "student"
                });
            }

        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">

            <div className="auth-card">

                <h1 className="auth-logo">
                    EduSync <span>AI</span>
                </h1>

                <h2>
                    {isLogin ? "Welcome Back!" : "Create Your Account"}
                </h2>

                <p className="auth-subtitle">
                    {isLogin
                        ? "Login to continue your academic journey."
                        : "Join EduSync AI and manage your academics."}
                </p>

                <form onSubmit={handleSubmit}>

                    {!isLogin && (
                        <>
                            <label>Full Name</label>

                            <input
                                type="text"
                                name="name"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />

                            <label>Register As</label>

                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                            </select>
                        </>
                    )}

                    <label>Email Address</label>

                    <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <label>Password</label>

                    <input
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                    />

                    {message && (
                        <p className="auth-message">
                            {message}
                        </p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading
                            ? "Please wait..."
                            : isLogin
                                ? "Login"
                                : "Create Account"}
                    </button>

                </form>

                <p className="auth-switch">
                    {isLogin
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <span
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setMessage("");
                        }}
                    >
                        {isLogin ? " Register" : " Login"}
                    </span>
                </p>

            </div>

        </div>
    );
}

export default Auth;
