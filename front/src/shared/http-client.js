
import axios from 'axios';
import { useAuthStore } from '../app/store/authStore.js';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

http.interceptors.request.use(config => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || 'Server error';
    console.error('[API error]', message);
    return Promise.reject(error);
  },
);

export default http;
