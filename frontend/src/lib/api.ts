// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// 请求拦截：附带 token
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('access_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default api;
