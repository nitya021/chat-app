import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

const handleLogin = async () => {
  try {
    console.log("USERNAME:", username);
    console.log("PASSWORD:", password);
    console.log("LOGIN START");
    

    const res = await API.post("/auth/login", {
      username,
      password,
    });

    console.log("LOGIN RESPONSE:", res.data);

    localStorage.setItem("token", res.data.token);

    console.log("TOKEN SAVED");

    navigate("/chat");

    console.log("NAVIGATED");
  } catch (error) {
    console.error("LOGIN ERROR:", error);
  }
};

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <h2>Login</h2>

      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ padding: "8px", width: "250px" }}
      />

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: "8px", width: "250px" }}
      />

      <button
        onClick={handleLogin}
        style={{
          padding: "8px 20px",
          cursor: "pointer",
          backgroundColor: "black",
          color: "white",
          border: "none",
        }}
      >
        Login
      </button>

      <Link to="/register" style={{ color: "blue", marginTop: "10px" }}>
        Don't have an account? Register here
      </Link>
    </div>
  );
}