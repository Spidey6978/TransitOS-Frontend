import axios from "axios";

const api = axios.create({
  baseURL: "https://touchily-steamerless-alyssa.ngrok-free.dev", // Your Ngrok tunnel!
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;