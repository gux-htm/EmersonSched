// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  isSuperAdmin?: boolean;
  metadata: any;
  isApproved?: boolean;
  createdAt?: string;
}

// Program types
export interface Program {
  id: number;
  name: string;
  systemType: 'semester' | 'annual';
  totalSemesters: number;
  shift: 'morning' | 'evening' | 'weekend';
  isActive: boolean;
  createdAt: string;
}

// Major types
export interface Major {
  id: number;
  programId: number;
  name: string;
  programName?: string;
  isActive: boolean;
  createdAt: string;
}

// Course types
export interface Course {
  id: number;
  majorId: number;
  name: string;
  code: string;
  creditHours: string;
  semester: number;
  shift: 'morning' | 'evening' | 'weekend';
  majorName?: string;
  programName?: string;
  isActive: boolean;
  createdAt: string;
}

// Section types
export interface Section {
  id: number;
  majorId: number;
  name: string;
  studentStrength: number;
  shift: 'morning' | 'evening' | 'weekend';
  majorName?: string;
  programName?: string;
  isActive: boolean;
  createdAt: string;
}

// Room types
export interface Room {
  id: number;
  name: string;
  type: 'lecture' | 'lab' | 'seminar';
  capacity: number;
  resources: any;
  isActive: boolean;
  createdAt: string;
}

// Time slot types
export interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  slotNumber: number;
  shift: 'morning' | 'evening' | 'weekend';
  isActive: boolean;
  createdAt: string;
}

// University timings types
export interface UniversityTimings {
  id: number;
  openingTime: string;
  closingTime: string;
  breakDuration: number;
  slotLength: number;
  workingDays: string[];
  isActive: boolean;
  createdAt: string;
}

// Course request types
export interface CourseRequest {
  id: number;
  instructorId: string;
  courseId: number;
  sectionId: number;
  status: 'pending' | 'accepted' | 'rejected';
  preferences: any;
  acceptedAt?: string;
  instructorName?: string;
  courseName?: string;
  courseCode?: string;
  sectionName?: string;
  majorName?: string;
  programName?: string;
  createdAt: string;
}

// Block types
export interface Block {
  id: number;
  teacherId: string;
  courseId: number;
  sectionId: number;
  roomId: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  timeSlotId: number;
  shift: 'morning' | 'evening' | 'weekend';
  isRescheduled: boolean;
  originalBlockId?: number;
  teacherName?: string;
  courseName?: string;
  courseCode?: string;
  sectionName?: string;
  roomName?: string;
  roomType?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

// Exam types
export interface ExamSession {
  id: number;
  name: string;
  examType: 'midterm' | 'final' | 'supplementary';
  duration: number;
  startDate: string;
  endDate: string;
  workingHours: any;
  mode: 'match' | 'shuffle';
  isActive: boolean;
  createdAt: string;
}

export interface Exam {
  id: number;
  examSessionId: number;
  courseId: number;
  roomId: number;
  invigilatorId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  isRescheduled: boolean;
  courseName?: string;
  courseCode?: string;
  roomName?: string;
  roomType?: string;
  invigilatorName?: string;
  sessionName?: string;
  examType?: string;
  createdAt: string;
}

// Notification types
export interface Notification {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: 'timetable' | 'reschedule' | 'exam' | 'general';
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

// Dashboard stats types
export interface DashboardStats {
  instructors: number;
  students: number;
  courses: number;
  rooms: number;
  pendingRequests: number;
  scheduledBlocks: number;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'instructor' | 'student';
  department: string;
  id: string;
  designation?: string;
  program?: string;
  semester?: number;
  section?: string;
  specialization?: string;
  availability?: any;
}

export interface ProgramForm {
  name: string;
  systemType: 'semester' | 'annual';
  totalSemesters: number;
  shift: 'morning' | 'evening' | 'weekend';
}

export interface MajorForm {
  programId: number;
  name: string;
}

export interface CourseForm {
  majorId: number;
  name: string;
  code: string;
  creditHours: string;
  semester: number;
  shift: 'morning' | 'evening' | 'weekend';
}

export interface SectionForm {
  majorId: number;
  name: string;
  studentStrength: number;
  shift: 'morning' | 'evening' | 'weekend';
}

export interface RoomForm {
  name: string;
  type: 'lecture' | 'lab' | 'seminar';
  capacity: number;
  resources?: any;
}

export interface TimingsForm {
  openingTime: string;
  closingTime: string;
  breakDuration: number;
  slotLength: 60 | 90;
  workingDays: string[];
}

export interface ExamSessionForm {
  name: string;
  examType: 'midterm' | 'final' | 'supplementary';
  duration: number;
  startDate: string;
  endDate: string;
  workingHours: any;
  mode: 'match' | 'shuffle';
}

// Table column types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Toast types
export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Pagination types
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showSizeChanger?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

// Filter types
export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterProps {
  options: FilterOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
}