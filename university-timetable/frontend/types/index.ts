// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  department?: string;
  designation?: string;
  metadata?: any;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Program Types
export interface Program {
  id: number;
  name: string;
  code: string;
  system_type: 'semester' | 'annual';
  total_semesters: number;
  shift: 'morning' | 'evening' | 'weekend';
  created_at: string;
  major_count?: number;
}

// Major Types
export interface Major {
  id: number;
  program_id: number;
  name: string;
  code: string;
  program_name?: string;
  program_code?: string;
  course_count?: number;
}

// Course Types
export interface Course {
  id: number;
  major_id: number;
  name: string;
  code: string;
  credit_hours: string;
  semester: number;
  is_lab: boolean;
  major_name?: string;
  major_code?: string;
  program_name?: string;
  program_code?: string;
}

// Section Types
export interface Section {
  id: number;
  major_id: number;
  name: string;
  student_strength: number;
  semester: number;
  shift: 'morning' | 'evening' | 'weekend';
  major_name?: string;
  major_code?: string;
  program_name?: string;
  program_code?: string;
  enrolled_students?: number;
}

// Room Types
export interface Room {
  id: number;
  name: string;
  type: 'lecture' | 'lab' | 'seminar';
  capacity: number;
  resources?: any;
  is_available: boolean;
  allocated_slots?: number;
}

// Time Slot Types
export interface TimeSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  shift: 'morning' | 'evening' | 'weekend';
  duration_minutes: number;
  is_break: boolean;
}

// Block Types (Timetable)
export interface Block {
  id: number;
  teacher_id: string;
  course_id: number;
  section_id: number;
  room_id: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  time_slot_id: number;
  shift: 'morning' | 'evening' | 'weekend';
  block_type: 'theory' | 'lab' | 'seminar';
  is_active: boolean;
  // Joined fields
  course_name?: string;
  course_code?: string;
  section_name?: string;
  room_name?: string;
  instructor_name?: string;
  slot_name?: string;
  start_time?: string;
  end_time?: string;
  major_name?: string;
}

// Course Request Types
export interface CourseRequest {
  id: number;
  course_id: number;
  instructor_id?: string;
  section_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  preferences?: any;
  accepted_at?: string;
  can_undo: boolean;
  undo_expires_at?: string;
  created_at: string;
  // Joined fields
  course_name: string;
  course_code: string;
  credit_hours: string;
  semester: number;
  section_name: string;
  student_strength: number;
  shift: string;
  major_name: string;
  major_code: string;
  program_name: string;
  program_code: string;
  instructor_name?: string;
  instructor_email?: string;
}

// Exam Types
export interface Exam {
  id: number;
  course_id: number;
  section_id: number;
  room_id: number;
  invigilator_id: string;
  exam_type: 'midterm' | 'final' | 'supplementary' | 'quiz';
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  mode: 'match' | 'shuffle';
  // Joined fields
  course_name: string;
  course_code: string;
  section_name: string;
  room_name: string;
  invigilator_name: string;
  major_name?: string;
  program_name?: string;
}

// Notification Types
export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'timetable' | 'reschedule' | 'exam' | 'general';
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

// Student Enrollment Types
export interface StudentEnrollment {
  id: number;
  student_id: string;
  section_id: number;
  program_id: number;
  semester: number;
  roll_number: string;
  enrollment_date: string;
  // Joined fields
  section_name?: string;
  program_name?: string;
  major_name?: string;
}

// Registration Request Types
export interface RegistrationRequest {
  id: number;
  request_id: number;
  request_status: 'pending' | 'approved' | 'rejected';
  request_date: string;
  // User fields
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  department?: string;
  designation?: string;
  metadata?: any;
}

// Dashboard Stats Types
export interface DashboardStats {
  users: {
    total: number;
    breakdown: Array<{ role: string; count: number }>;
  };
  programs: number;
  courses: number;
  rooms: number;
  sections: number;
  pendingRequests: number;
  activeBlocks: number;
  upcomingExams: number;
}

export interface InstructorDashboardStats {
  courses: {
    total: number;
    accepted: number;
    pending: number;
  };
  classes: {
    total: number;
    upcoming: number;
    today: number;
  };
  todaySchedule: Block[];
}

export interface StudentDashboardStats {
  enrollment: StudentEnrollment & {
    section_name: string;
    major_name: string;
    program_name: string;
  };
  courses: number;
  classes: {
    total: number;
    today: number;
  };
  upcomingExams: number;
  unreadNotifications: number;
  todaySchedule: Block[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'instructor' | 'student';
  department?: string;
  designation?: string;
  metadata?: any;
}

export interface ProgramForm {
  name: string;
  code: string;
  system_type: 'semester' | 'annual';
  total_semesters: number;
  shift: 'morning' | 'evening' | 'weekend';
}

export interface CourseForm {
  major_id: number;
  name: string;
  code: string;
  credit_hours: string;
  semester: number;
  is_lab?: boolean;
}

export interface RoomForm {
  name: string;
  type: 'lecture' | 'lab' | 'seminar';
  capacity: number;
  resources?: any;
}

export interface SectionForm {
  major_id: number;
  name: string;
  student_strength: number;
  semester: number;
  shift: 'morning' | 'evening' | 'weekend';
}

// Timetable Types
export interface TimetableView {
  [shift: string]: {
    [day: string]: Block[];
  };
}

export interface ConflictReport {
  teachers: Array<{
    instructor_name: string;
    day: string;
    slot_name: string;
    start_time: string;
    end_time: string;
    conflicting_classes: string;
    conflict_count: number;
  }>;
  rooms: Array<{
    room_name: string;
    day: string;
    slot_name: string;
    start_time: string;
    end_time: string;
    conflicting_classes: string;
    conflict_count: number;
  }>;
  sections: Array<{
    section_name: string;
    day: string;
    slot_name: string;
    start_time: string;
    end_time: string;
    conflicting_classes: string;
    conflict_count: number;
  }>;
  summary: {
    totalConflicts: number;
    teacherConflicts: number;
    roomConflicts: number;
    sectionConflicts: number;
  };
}