import axios from 'axios';

/**
 * API Service
 * Centralized Axios instance with:
 * - Auto token attachment (request interceptor)
 * - Auto token refresh on 401 (response interceptor)
 * - All API endpoints grouped by feature
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Send cookies (refresh token) with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach auth token ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sv_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Auto-refresh on 401 ───
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying and not a refresh/login request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the access token
        const res = await api.post('/auth/refresh');
        const newToken = res.data.data.token;
        localStorage.setItem('sv_token', newToken);

        // Retry all queued requests
        processQueue(null, newToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — force logout
        processQueue(refreshError, null);
        localStorage.removeItem('sv_token');
        localStorage.removeItem('sv_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ──────────────────────────────────────────────
// Auth API
// ──────────────────────────────────────────────

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// ──────────────────────────────────────────────
// Files API
// ──────────────────────────────────────────────

export const filesAPI = {
  upload: (formData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAll: (params = {}) => api.get('/files', { params }),

  delete: (id) => api.delete(`/files/${id}`),

  rename: (id, newName) => api.put(`/files/${id}/rename`, { newName }),

  download: async (id, fileName) => {
    const response = await api.get(`/files/download/${id}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ──────────────────────────────────────────────
// Folders API
// ──────────────────────────────────────────────

export const foldersAPI = {
  create: (name) => api.post('/folders', { name }),
  getAll: () => api.get('/folders'),
  delete: (id) => api.delete(`/folders/${id}`),
};

// ──────────────────────────────────────────────
// Share API
// ──────────────────────────────────────────────

export const shareAPI = {
  create: (fileId, options = {}) => api.post(`/share/${fileId}`, options),
  getInfo: (token) => api.get(`/share/${token}/info`),
  download: async (token, fileName, password = null) => {
    const params = password ? { password } : {};
    const response = await api.get(`/share/${token}`, {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ──────────────────────────────────────────────
// Activity API
// ──────────────────────────────────────────────

export const activityAPI = {
  getLogs: (params = {}) => api.get('/activity', { params }),
  getAnalytics: () => api.get('/activity/analytics'),
};

export default api;
