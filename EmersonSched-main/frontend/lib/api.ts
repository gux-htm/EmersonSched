import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  checkFirstAdmin: () => api.get('/auth/check-first-admin'),
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  getPendingRegistrations: () => api.get('/auth/pending-registrations'),
  updateRegistrationStatus: (data: any) => api.post('/auth/update-registration-status', data),
};

// Admin APIs
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  
  // Programs
  createProgram: (data: any) => api.post('/admin/programs', data),
  getPrograms: () => api.get('/admin/programs'),
  
  // Majors
  createMajor: (data: any) => api.post('/admin/majors', data),
  getMajors: (programId?: string) => api.get('/admin/majors', { params: { program_id: programId } }),
  
  // Courses
  createCourse: (data: any) => api.post('/admin/courses', data),
  getCourses: (params?: any) => api.get('/admin/courses', { params }),
  updateCourse: (id: number, data: any) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/admin/courses/${id}`),
  
  // Sections
  createSection: (data: any) => api.post('/admin/sections', data),
  getSections: (params?: any) => api.get('/admin/sections', { params }),
  updateSection: (id: number, data: any) => api.put(`/admin/sections/${id}`, data),
  deleteSection: (id: number) => api.delete(`/admin/sections/${id}`),
  
  // Rooms
  createRoom: (data: any) => api.post('/admin/rooms', data),
  getRooms: (type?: string) => api.get('/admin/rooms', { params: { type } }),
  updateRoom: (id: number, data: any) => api.put(`/admin/rooms/${id}`, data),
  deleteRoom: (id: number) => api.delete(`/admin/rooms/${id}`),
  
  // Instructors
  getInstructors: () => api.get('/admin/instructors'),
};

// Room Assignment APIs
export const roomAPI = {
  autoAssign: (data: any) => api.post('/rooms/auto-assign', data),
  getAssignments: (params?: any) => api.get('/rooms/assignments', { params }),
  editAssignment: (id: number, data: any) => api.put(`/rooms/assignments/${id}`, data),
  deleteAssignment: (id: number) => api.delete(`/rooms/assignments/${id}`),
};

// Timing APIs
export const timingAPI = {
  setUniversityTimings: (data: any) => api.post('/timing/university-timings', data),
  getUniversityTimings: () => api.get('/timing/university-timings'),
  getTimeSlots: (shift?: string, day_of_week?: string) => api.get('/timing/time-slots', { params: { shift, day_of_week } }),
  resetTimeSlots: () => api.post('/timing/reset-time-slots'),
  generateSlots: (data: any) => api.post('/timing/generate-slots', data),
  setSlotSettings: (data: any) => api.post('/timing/slot-settings', data),
  getSlotSettings: () => api.get('/timing/slot-settings'),
};

// Timetable APIs
export const timetableAPI = {
  generateCourseRequests: (data: any) => api.post('/timetable/generate-requests', data),
  getCourseRequests: (params?: any) => api.get('/timetable/requests', { params }),
  acceptCourseRequest: (data: any) => api.post('/timetable/accept-request', data),
  undoCourseAcceptance: (data: any) => api.post('/timetable/undo-acceptance', data),
  generateTimetable: () => api.post('/timetable/generate'),
  getTimetable: (params?: any) => api.get('/timetable', { params }),
  rescheduleClass: (data: any) => api.post('/timetable/reschedule', data),
  resetTimetable: (data: any) => api.post('/timetable/reset', data),
};

// Exam APIs
export const examAPI = {
  createExam: (data: any) => api.post('/exam/create', data),
  generateExamSchedule: (data: any) => api.post('/exam/generate-schedule', data),
  getExams: (params?: any) => api.get('/exam', { params }),
  resetExams: (data: any) => api.post('/exam/reset', data),
};


// Course Requests
export const requestAPI = {
  create: (data: any) => api.post('/course-requests', data),
  getAll: () => api.get('/course-requests'),
  getForInstructor: () => api.get('/course-requests/instructor'),
  accept: (data: any) => api.post('/course-requests/accept', data),
  undoAccept: (data: any) => api.post('/course-requests/undo-accept', data),
};
