import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      if (!username || !password) {
        setMessage("Username and password are required");
        return;
      }

      const res = await API.post("/auth/register", {
        username,
        password,
      });

      console.log("REGISTER RESPONSE:", res.data);

      if (res.data.success) {
        setMessage("Account created! Redirecting to login...");
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage(res.data.message || "Registration failed");
      }
    } catch (error: any) {
      console.error("REGISTER ERROR:", error);
      setMessage(
        error?.response?.data?.message || "Registration failed"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg">

        <h1 className="text-4xl font-bold text-center text-blue-600">
          E2EE
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Create Your Secure Account
        </p>

        {message && (
          <p className="text-center mt-4 text-sm text-red-500 font-semibold">
            {message}
          </p>
        )}

        <div className="mt-8">
          <label className="block text-gray-700 mb-2">
            Username
          </label>

          <input
            type="text"
            placeholder="Choose username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4">
          <label className="block text-gray-700 mb-2">
            Password
          </label>

          <input
            type="password"
            placeholder="Choose password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleRegister}
          className="block w-full bg-blue-600 text-white p-3 rounded-lg mt-6 text-center hover:bg-blue-700 cursor-pointer"
        >
          Create Account
        </button>

        <Link
          to="/"
          className="block text-center text-blue-600 font-semibold mt-4"
        >
          Back to Login
        </Link>

      </div>
    </div>
  );
}

export default Register;