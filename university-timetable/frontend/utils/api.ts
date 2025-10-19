import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API functions
export const apiGet = async <T = any>(url: string): Promise<ApiResponse<T>> => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'An error occurred');
  }
};

export const apiPost = async <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'An error occurred');
  }
};

export const apiPut = async <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'An error occurred');
  }
};

export const apiDelete = async <T = any>(url: string): Promise<ApiResponse<T>> => {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'An error occurred');
  }
};

// Auth API functions
export const authApi = {
  login: (email: string, password: string) =>
    apiPost('/auth/login', { email, password }),
  
  register: (data: any) =>
    apiPost('/auth/register', data),
  
  getProfile: () =>
    apiGet('/auth/profile'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost('/auth/change-password', { currentPassword, newPassword }),
  
  logout: () =>
    apiPost('/auth/logout'),
};

// Users API functions
export const usersApi = {
  getAll: (filters?: any) =>
    apiGet(`/users?${new URLSearchParams(filters).toString()}`),
  
  getPending: () =>
    apiGet('/users/pending'),
  
  getById: (id: string) =>
    apiGet(`/users/${id}`),
  
  approve: (id: string) =>
    apiPost(`/users/${id}/approve`),
  
  reject: (id: string, reason?: string) =>
    apiPost(`/users/${id}/reject`, { reason }),
  
  update: (id: string, data: any) =>
    apiPut(`/users/${id}`, data),
  
  delete: (id: string) =>
    apiDelete(`/users/${id}`),
  
  getStats: () =>
    apiGet('/users/stats/overview'),
};

// Programs API functions
export const programsApi = {
  getAll: () =>
    apiGet('/programs'),
  
  create: (data: any) =>
    apiPost('/programs', data),
  
  update: (id: number, data: any) =>
    apiPut(`/programs/${id}`, data),
  
  delete: (id: number) =>
    apiDelete(`/programs/${id}`),
  
  getMajors: (programId: number) =>
    apiGet(`/programs/${programId}/majors`),
  
  createMajor: (programId: number, data: any) =>
    apiPost(`/programs/${programId}/majors`, data),
  
  updateMajor: (id: number, data: any) =>
    apiPut(`/programs/majors/${id}`, data),
  
  deleteMajor: (id: number) =>
    apiDelete(`/programs/majors/${id}`),
};

// Courses API functions
export const coursesApi = {
  getAll: (filters?: any) =>
    apiGet(`/courses?${new URLSearchParams(filters).toString()}`),
  
  create: (data: any) =>
    apiPost('/courses', data),
  
  update: (id: number, data: any) =>
    apiPut(`/courses/${id}`, data),
  
  delete: (id: number) =>
    apiDelete(`/courses/${id}`),
  
  getSections: (majorId: number, filters?: any) =>
    apiGet(`/courses/sections/${majorId}?${new URLSearchParams(filters).toString()}`),
  
  createSection: (data: any) =>
    apiPost('/courses/sections', data),
  
  updateSection: (id: number, data: any) =>
    apiPut(`/courses/sections/${id}`, data),
  
  deleteSection: (id: number) =>
    apiDelete(`/courses/sections/${id}`),
};

// Rooms API functions
export const roomsApi = {
  getAll: (filters?: any) =>
    apiGet(`/rooms?${new URLSearchParams(filters).toString()}`),
  
  create: (data: any) =>
    apiPost('/rooms', data),
  
  update: (id: number, data: any) =>
    apiPut(`/rooms/${id}`, data),
  
  delete: (id: number) =>
    apiDelete(`/rooms/${id}`),
  
  getAvailability: (id: number, day: string, timeSlotId: number, shift: string) =>
    apiGet(`/rooms/${id}/availability?day=${day}&time_slot_id=${timeSlotId}&shift=${shift}`),
  
  getStats: () =>
    apiGet('/rooms/stats/overview'),
};

// Timetable API functions
export const timetableApi = {
  getTimings: () =>
    apiGet('/timetable/timings'),
  
  setTimings: (data: any) =>
    apiPost('/timetable/timings', data),
  
  getSlots: (filters?: any) =>
    apiGet(`/timetable/slots?${new URLSearchParams(filters).toString()}`),
  
  generateRequests: () =>
    apiPost('/timetable/generate-requests'),
  
  getRequests: (filters?: any) =>
    apiGet(`/timetable/requests?${new URLSearchParams(filters).toString()}`),
  
  acceptRequest: (id: number, preferences: any) =>
    apiPost(`/timetable/requests/${id}/accept`, { preferences }),
  
  generate: () =>
    apiPost('/timetable/generate'),
  
  getTimetable: (filters?: any) =>
    apiGet(`/timetable?${new URLSearchParams(filters).toString()}`),
  
  reschedule: (data: any) =>
    apiPost('/timetable/reschedule', data),
  
  reset: (operationType: string, description?: string) =>
    apiPost('/timetable/reset', { operation_type: operationType, description }),
};

// Exams API functions
export const examsApi = {
  getAll: (filters?: any) =>
    apiGet(`/exams?${new URLSearchParams(filters).toString()}`),
  
  createSession: (data: any) =>
    apiPost('/exams/session', data),
  
  getById: (id: number) =>
    apiGet(`/exams/${id}`),
  
  update: (id: number, data: any) =>
    apiPut(`/exams/${id}`, data),
  
  delete: (id: number) =>
    apiDelete(`/exams/${id}`),
  
  reset: (operationType: string, description?: string) =>
    apiPost('/exams/reset', { operation_type: operationType, description }),
  
  getStats: () =>
    apiGet('/exams/stats/overview'),
};

// Notifications API functions
export const notificationsApi = {
  getAll: (filters?: any) =>
    apiGet(`/notifications?${new URLSearchParams(filters).toString()}`),
  
  markAsRead: (id: number) =>
    apiPut(`/notifications/${id}/read`),
  
  markAllAsRead: () =>
    apiPut('/notifications/read-all'),
  
  delete: (id: number) =>
    apiDelete(`/notifications/${id}`),
  
  getStats: () =>
    apiGet('/notifications/stats'),
  
  create: (data: any) =>
    apiPost('/notifications', data),
  
  createBulk: (data: any) =>
    apiPost('/notifications/bulk', data),
};

export default api;