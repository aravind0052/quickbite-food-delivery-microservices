import axios from 'axios';

// The Frontend communicates ONLY with the centralized API Gateway on port 4000
const GATEWAY_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: GATEWAY_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Bearer Token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quickbite_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling and rate limit detection
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        // Token expired or invalid
        console.warn('[QuickBite API Gateway] 401 Unauthorized received. Clearing stale credentials.');
        const reqUrl = error.config?.url || '';
        if (
          !reqUrl.includes('/api/auth/login') &&
          !reqUrl.includes('/api/auth/register') &&
          !reqUrl.includes('/auth/login') &&
          !reqUrl.includes('/auth/register')
        ) {
          localStorage.removeItem('quickbite_token');
          localStorage.removeItem('quickbite_user');
          window.dispatchEvent(new Event('quickbite_auth_expired'));
        }
      } else if (status === 429) {
        console.error('[QuickBite API Gateway] 429 Too Many Requests (Rate limit reached).');
      }
    } else if (error.request) {
      console.error('[QuickBite API Gateway] Network Error: API Gateway at http://localhost:4000 is unreachable.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
