import axios from 'axios';
export const DEMO_KEY = 'portfolio_demo_token';
export const demoToken = () => typeof window === 'undefined' ? null : sessionStorage.getItem(DEMO_KEY);
const demoApi = axios.create({ baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/demo-api`, timeout: 15000 });
export async function demoRequest(path: string) {
  return demoApi.post(path, {}, { headers: { Authorization: `Bearer ${demoToken()}` } });
}
export async function startDemo() {
  let key = sessionStorage.getItem('portfolio_demo_key');
  if (!key) { key = [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join(''); sessionStorage.setItem('portfolio_demo_key', key); }
  const { data } = await demoApi.post('/session', {}, { headers: { 'Idempotency-Key': key } });
  sessionStorage.setItem(DEMO_KEY, data.token); window.location.assign('/');
}
export async function exitDemo() { await demoRequest('/exit'); sessionStorage.removeItem(DEMO_KEY); sessionStorage.removeItem('portfolio_demo_key'); window.location.assign('/demo'); }
