import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
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
  (response) => response,
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

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
  
  getProfile: () =>
    api.get('/auth/profile'),
  
  checkFirstAdminStatus: () =>
    api.get('/auth/first-admin-status'),
};

// Admin API
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),
  
  getUsers: (params?: any) =>
    api.get('/admin/users', { params }),
  
  approveUser: (userId: string, approved: boolean) =>
    api.patch(`/admin/users/${userId}/approve`, { approved }),
  
  // Programs
  createProgram: (data: any) =>
    api.post('/admin/programs', data),
  
  getPrograms: () =>
    api.get('/admin/programs'),
  
  // Majors
  createMajor: (data: any) =>
    api.post('/admin/majors', data),
  
  getMajors: () =>
    api.get('/admin/majors'),
  
  // Courses
  createCourse: (data: any) =>
    api.post('/admin/courses', data),
  
  getCourses: () =>
    api.get('/admin/courses'),
  
  // Sections
  createSection: (data: any) =>
    api.post('/admin/sections', data),
  
  getSections: () =>
    api.get('/admin/sections'),
  
  // Rooms
  createRoom: (data: any) =>
    api.post('/admin/rooms', data),
  
  getRooms: () =>
    api.get('/admin/rooms'),
  
  // Course Requests
  getCourseRequests: (params?: any) =>
    api.get('/admin/course-requests', { params }),
};

// Timetable API
export const timetableAPI = {
  setTimings: (data: any) =>
    api.post('/timetable/timings', data),
  
  getTimings: () =>
    api.get('/timetable/timings'),
  
  getTimeSlots: (params?: any) =>
    api.get('/timetable/time-slots', { params }),
  
  generateRequests: () =>
    api.post('/timetable/generate-requests'),
  
  getBlocks: (params?: any) =>
    api.get('/timetable/blocks', { params }),
  
  generateTimetable: () =>
    api.post('/timetable/generate'),
};

// Instructor API
export const instructorAPI = {
  getCourseRequests: (params?: any) =>
    api.get('/instructor/course-requests', { params }),
  
  acceptCourseRequest: (requestId: string, preferences: any) =>
    api.post(`/instructor/course-requests/${requestId}/accept`, { preferences }),
  
  undoCourseRequest: (requestId: string) =>
    api.post(`/instructor/course-requests/${requestId}/undo`),
  
  getTimetable: (params?: any) =>
    api.get('/instructor/timetable', { params }),
  
  rescheduleClass: (blockId: string, data: any) =>
    api.post(`/instructor/reschedule/${blockId}`, data),
  
  getNotifications: (params?: any) =>
    api.get('/instructor/notifications', { params }),
  
  markNotificationRead: (notificationId: string) =>
    api.patch(`/instructor/notifications/${notificationId}/read`),
};

// Student API
export const studentAPI = {
  getTimetable: () =>
    api.get('/student/timetable'),
  
  getExams: () =>
    api.get('/student/exams'),
  
  getNotifications: (params?: any) =>
    api.get('/student/notifications', { params }),
  
  markNotificationRead: (notificationId: string) =>
    api.patch(`/student/notifications/${notificationId}/read`),
  
  getProfile: () =>
    api.get('/student/profile'),
  
  updateProfile: (data: any) =>
    api.patch('/student/profile', data),
};

// Exams API
export const examsAPI = {
  createSession: (data: any) =>
    api.post('/exams/sessions', data),
  
  getSessions: () =>
    api.get('/exams/sessions'),
  
  generateSchedule: (sessionId: string) =>
    api.post('/exams/generate', { session_id: sessionId }),
  
  getExams: (params?: any) =>
    api.get('/exams', { params }),
  
  resetSchedule: (resetType: string, sessionId: string) =>
    api.post('/exams/reset', { reset_type: resetType, session_id: sessionId }),
};

// Notifications API
export const notificationsAPI = {
  sendNotification: (data: any) =>
    api.post('/notifications/send', data),
  
  sendBulkNotification: (data: any) =>
    api.post('/notifications/send-bulk', data),
  
  getNotifications: (params?: any) =>
    api.get('/notifications', { params }),
  
  markAsRead: (notificationId: string) =>
    api.patch(`/notifications/${notificationId}/read`),
  
  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),
  
  getStats: () =>
    api.get('/notifications/stats'),
};

export default api;