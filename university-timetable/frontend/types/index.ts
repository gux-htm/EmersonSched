// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  status: 'pending' | 'approved' | 'rejected';
  metadata?: UserMetadata;
  created_at: string;
}

export interface UserMetadata {
  department?: string;
  designation?: string;
  program?: string;
  semester?: number;
  section?: string;
  specialization?: string;
  availability?: string;
}

// Program types
export interface Program {
  id: number;
  name: string;
  system_type: 'semester' | 'annual';
  total_semesters: number;
  shift: 'morning' | 'evening' | 'weekend';
  created_at: string;
}

export interface Major {
  id: number;
  program_id: number;
  name: string;
  created_at: string;
}

// Course types
export interface Course {
  id: number;
  major_id: number;
  name: string;
  code: string;
  credit_hours: string;
  semester: number;
  shift: 'morning' | 'evening';
  created_at: string;
  major_name?: string;
  program_name?: string;
}

export interface Section {
  id: number;
  major_id: number;
  name: string;
  student_strength: number;
  shift: 'morning' | 'evening';
  created_at: string;
  major_name?: string;
  program_name?: string;
}

// Room types
export interface Room {
  id: number;
  name: string;
  type: 'lecture' | 'lab' | 'seminar';
  capacity: number;
  resources?: Record<string, any>;
  created_at: string;
}

// Timetable types
export interface UniversityTimings {
  id: number;
  opening_time: string;
  closing_time: string;
  break_duration: number;
  slot_length: number;
  working_days: string[];
  created_at: string;
}

export interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  shift: 'morning' | 'evening';
  slot_number: number;
  created_at: string;
}

export interface Block {
  id: number;
  teacher_id: string;
  course_id: number;
  section_id: number;
  room_id: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  time_slot_id: number;
  shift: 'morning' | 'evening';
  status: 'active' | 'rescheduled' | 'cancelled';
  created_at: string;
  course_name?: string;
  course_code?: string;
  credit_hours?: string;
  section_name?: string;
  student_strength?: number;
  room_name?: string;
  room_type?: string;
  room_capacity?: number;
  teacher_name?: string;
  start_time?: string;
  end_time?: string;
  slot_number?: number;
}

export interface CourseRequest {
  id: number;
  instructor_id: string;
  course_id: number;
  section_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  preferences?: CoursePreferences;
  created_at: string;
  updated_at: string;
  course_name?: string;
  course_code?: string;
  credit_hours?: string;
  semester?: number;
  section_name?: string;
  student_strength?: number;
  major_name?: string;
  program_name?: string;
}

export interface CoursePreferences {
  days: string[];
  time_slots: number[];
}

// Exam types
export interface Exam {
  id: number;
  course_id: number;
  room_id: number;
  invigilator_id: string;
  exam_type: 'midterm' | 'final' | 'supplementary';
  exam_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  mode: 'match' | 'shuffle';
  created_at: string;
  course_name?: string;
  course_code?: string;
  credit_hours?: string;
  section_name?: string;
  student_strength?: number;
  room_name?: string;
  room_type?: string;
  room_capacity?: number;
  invigilator_name?: string;
  invigilator_email?: string;
}

// Notification types
export interface Notification {
  id: number;
  user_id: string;
  type: 'timetable_update' | 'reschedule' | 'exam_schedule' | 'registration_approved' | 'registration_rejected';
  title: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
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
  department?: string;
  designation?: string;
  program?: string;
  semester?: number;
  section?: string;
  specialization?: string;
  availability?: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RescheduleForm {
  block_id: number;
  new_room_id: number;
  new_time_slot_id: number;
  reason?: string;
}

// Dashboard types
export interface DashboardStats {
  total: number;
  byRole: {
    admin: number;
    instructor: number;
    student: number;
  };
  byStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface RoomStats {
  total: number;
  byType: Array<{
    type: string;
    count: number;
    avg_capacity: number;
    min_capacity: number;
    max_capacity: number;
  }>;
}

export interface ExamStats {
  total: number;
  byType: Array<{
    exam_type: string;
    count: number;
    upcoming: number;
    completed: number;
  }>;
}

// Timetable generation types
export interface TimetableGenerationResult {
  totalBlocks: number;
  conflicts: number;
}

export interface ExamSessionForm {
  exam_type: 'midterm' | 'final' | 'supplementary';
  duration: number;
  date_range: {
    start_date: string;
    end_date: string;
  };
  working_hours: {
    start_time: string;
    end_time: string;
  };
  mode: 'match' | 'shuffle';
  courses?: number[];
  rooms?: number[];
}

// Filter types
export interface UserFilters {
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CourseFilters {
  major_id?: number;
  semester?: number;
  shift?: string;
}

export interface RoomFilters {
  type?: string;
  capacity_min?: number;
  capacity_max?: number;
}

export interface TimetableFilters {
  day?: string;
  shift?: string;
  teacher_id?: string;
  section_id?: number;
}

export interface ExamFilters {
  exam_type?: string;
  date_from?: string;
  date_to?: string;
}

// Component props types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}