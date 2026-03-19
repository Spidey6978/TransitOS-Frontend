import axios from "axios";

const api = axios.create({
  // Replace this with your actual static Ngrok URL
  baseURL: "https://touchily-steamerless-alyssa.ngrok-free.dev", 
  headers: {
    "Content-Type": "application/json",
    // This header bypasses the ngrok "browser warning" page so the API works
    "ngrok-skip-browser-warning": "69420",
  },
});

export default api;