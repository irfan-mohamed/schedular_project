import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faIdBadge } from "@fortawesome/free-solid-svg-icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../styling/SignInPage.css";
import { useNavigate } from 'react-router-dom';

function SignInPage() {
    const [signInType, setSignInType] = useState("admin");
    const [teacherName,] = useState(""); // To store the teacher's name
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        let formData = {};
        if (signInType === "admin") {
            const email = e.target.elements.email.value;
            const password = e.target.elements.password.value;
            formData = { email, password, signInType: "admin" };
        } else if (signInType === "teacher") {
            const teacherID = e.target.elements.teacherID.value;
            formData = { teacherID, signInType: "teacher" };
        }
    
        try {
            const response = await fetch('http://localhost:5001/api/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            const data = await response.json();
            console.log("API Response:", data); // Debugging log
    
            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }
    
            // Ensure user object exists before accessing properties
            if (data.user) {
                if (signInType === "teacher") {
                    localStorage.setItem('username', data.user.teacherName || "Unknown Teacher");
                    localStorage.setItem('teacherID', data.user.teacherID);
                    navigate(`/lecturer-timetable/${data.user.teacherName}`);
                } else {
                    localStorage.setItem('username', data.user.username || "Unknown Admin");
                    localStorage.setItem('department', data.user.department);

                }
    
                toast.success("You have successfully signed in!", {
                    position: "top-right",
                    autoClose: 400,
                    onClose: () => navigate("/"),
                });
            } else {
                throw new Error("User data not found in response");
            }
        } catch (error) {
            console.error("Login Error:", error);
            toast.error(error.message, {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };
    

    return (
        <div className="form-container">
            <h2 className="form-title">Sign In</h2>
            <div className="buttons-container">
                <button className={`button ${signInType === "admin" ? "active" : ""}`} onClick={() => setSignInType("admin")}>
                    <FontAwesomeIcon icon={faEnvelope} className="icon" />
                    <span style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "10px" }}>Admin</span>
                </button>
                <button className={`button ${signInType === "teacher" ? "active" : ""}`} onClick={() => setSignInType("teacher")}>
                    <FontAwesomeIcon icon={faIdBadge} className="icon" />
                    <span style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "10px" }}>Teacher</span>
                </button>
            </div>
            <form onSubmit={handleSubmit}>
                {signInType === "admin" && (
                    <div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faEnvelope} className="icon me-2" />
                            <span style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "10px" }}>Email</span>
                            <input style={{ margin: "10px" }} className="input-field" type="email" name="email" placeholder="Email" />
                        </div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faLock} className="icon me-2" />
                            <span style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "10px" }}>Password</span>
                            <input style={{ margin: "10px" }} className="input-field" type="password" name="password" placeholder="Password" />
                        </div>
                    </div>
                )}
                {signInType === "teacher" && (
                    <div>
                        <div className="input-group">
                            <FontAwesomeIcon icon={faIdBadge} className="icon me-2" />
                            <span style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "10px" }}>Teacher ID</span>
                            <input
                                className="input-field"
                                type="text"
                                name="teacherID"
                                placeholder="Teacher ID"
                                style={{ fontWeight: "bold", borderColor: "#77757c", margin: "10px" }}
                            />
                        </div>
                    </div>
                )}
                <button className="submit-button" style={{ margin: "10px", boxShadow: "0 8px 16px rgba(0,0,0,0.2)" }} type="submit">Sign In</button>
            </form>
            {teacherName && <p>Welcome, {teacherName}!</p>}
            <ToastContainer />
        </div>
    );
}

export default SignInPage;
