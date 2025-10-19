import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
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
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Generic API methods
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }

  // Authentication methods
  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: any) {
    return this.post('/auth/register', userData);
  }

  async setupAdmin(adminData: any) {
    return this.post('/auth/setup-admin', adminData);
  }

  async getProfile() {
    return this.get('/auth/profile');
  }

  async updateProfile(data: any) {
    return this.put('/auth/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.put('/auth/change-password', { currentPassword, newPassword });
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async getSystemStatus() {
    return this.get('/auth/system-status');
  }

  async getPendingRequests() {
    return this.get('/auth/pending-requests');
  }

  async approveRequest(requestId: number, action: 'approve' | 'reject', notes?: string) {
    return this.put(`/auth/approve-request/${requestId}`, { action, notes });
  }

  // Admin methods
  async getDashboard() {
    return this.get('/admin/dashboard');
  }

  async getPrograms(params?: any) {
    return this.get('/admin/programs', params);
  }

  async createProgram(data: any) {
    return this.post('/admin/programs', data);
  }

  async updateProgram(id: number, data: any) {
    return this.put(`/admin/programs/${id}`, data);
  }

  async deleteProgram(id: number) {
    return this.delete(`/admin/programs/${id}`);
  }

  async getMajors(programId?: number) {
    const url = programId ? `/admin/programs/${programId}/majors` : '/admin/majors';
    return this.get(url);
  }

  async createMajor(data: any) {
    return this.post('/admin/majors', data);
  }

  async getCourses(params?: any) {
    return this.get('/admin/courses', params);
  }

  async createCourse(data: any) {
    return this.post('/admin/courses', data);
  }

  async getSections(params?: any) {
    return this.get('/admin/sections', params);
  }

  async createSection(data: any) {
    return this.post('/admin/sections', data);
  }

  async getRooms(params?: any) {
    return this.get('/admin/rooms', params);
  }

  async createRoom(data: any) {
    return this.post('/admin/rooms', data);
  }

  async updateRoom(id: number, data: any) {
    return this.put(`/admin/rooms/${id}`, data);
  }

  async getTimeSlots(shift?: string) {
    return this.get('/admin/time-slots', { shift });
  }

  async generateTimeSlots(data: any) {
    return this.post('/admin/generate-time-slots', data);
  }

  // Instructor methods
  async getInstructorDashboard() {
    return this.get('/instructor/dashboard');
  }

  async getCourseRequests(status?: string) {
    return this.get('/instructor/course-requests', { status });
  }

  async acceptCourse(requestId: number, preferences: any) {
    return this.post(`/instructor/accept-course/${requestId}`, { preferences });
  }

  async undoCourse(requestId: number) {
    return this.post(`/instructor/undo-course/${requestId}`);
  }

  async getInstructorTimetable() {
    return this.get('/instructor/timetable');
  }

  async rescheduleClass(blockId: number, data: any) {
    return this.post(`/instructor/reschedule/${blockId}`, data);
  }

  async getInstructorPreferences() {
    return this.get('/instructor/preferences');
  }

  async updateInstructorPreferences(data: any) {
    return this.put('/instructor/preferences', data);
  }

  // Student methods
  async getStudentDashboard() {
    return this.get('/student/dashboard');
  }

  async enrollStudent(data: any) {
    return this.post('/student/enroll', data);
  }

  async getStudentTimetable() {
    return this.get('/student/timetable');
  }

  async getStudentExams(upcoming?: boolean) {
    return this.get('/student/exams', { upcoming });
  }

  async getNotifications(unreadOnly?: boolean) {
    return this.get('/student/notifications', { unread_only: unreadOnly });
  }

  async markNotificationRead(id: number) {
    return this.put(`/student/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.put('/student/notifications/mark-all-read');
  }

  async getAvailableSections(params?: any) {
    return this.get('/student/available-sections', params);
  }

  async getStudentPrograms() {
    return this.get('/student/programs');
  }

  // Timetable methods
  async generateCourseRequests() {
    return this.post('/timetable/generate-requests');
  }

  async getTimetableCourseRequests(params?: any) {
    return this.get('/timetable/course-requests', params);
  }

  async assignInstructorToRequest(requestId: number, instructorId: string) {
    return this.put(`/timetable/course-requests/${requestId}/assign`, { instructor_id: instructorId });
  }

  async generateTimetable() {
    return this.post('/timetable/generate');
  }

  async viewTimetable(params?: any) {
    return this.get('/timetable/view', params);
  }

  async getTimetableConflicts() {
    return this.get('/timetable/conflicts');
  }

  async resetTimetable(resetType: 'time_slots' | 'assignments' | 'full') {
    return this.post('/timetable/reset', { reset_type: resetType });
  }

  // Exam methods
  async createExamSession(data: any) {
    return this.post('/exam/sessions', data);
  }

  async getExams(params?: any) {
    return this.get('/exam', params);
  }

  async updateExam(id: number, data: any) {
    return this.put(`/exam/${id}`, data);
  }

  async deleteExam(id: number) {
    return this.delete(`/exam/${id}`);
  }

  async getExamConflicts() {
    return this.get('/exam/conflicts');
  }

  async resetExams(resetType: 'all' | 'type', examType?: string) {
    return this.post('/exam/reset', { reset_type: resetType, exam_type: examType });
  }
}

export const api = new ApiClient();
export default api;