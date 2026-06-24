import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "https://chat-app-hioy.onrender.com",
});

export default API;