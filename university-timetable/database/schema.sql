-- EmersonSched Database Schema
-- University Timetable Management System

DROP DATABASE IF EXISTS university_timetable;
CREATE DATABASE university_timetable;
USE university_timetable;

-- Users table for all roles (Admin, Instructor, Student)
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','instructor','student') DEFAULT 'student',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  department VARCHAR(100),
  designation VARCHAR(100),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Registration requests table
CREATE TABLE registration_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  approved_by CHAR(36),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Programs table (BS, MS, MPhil, PhD, ADP)
CREATE TABLE programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  system_type ENUM('semester','annual') DEFAULT 'semester',
  total_semesters INT DEFAULT 8,
  shift ENUM('morning','evening','weekend') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Majors table
CREATE TABLE majors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Courses table
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  credit_hours VARCHAR(10) NOT NULL, -- e.g., "3+1", "2+0"
  semester INT NOT NULL,
  is_lab BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Sections table
CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(10) NOT NULL,
  student_strength INT DEFAULT 0,
  semester INT NOT NULL,
  shift ENUM('morning','evening','weekend') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL,
  type ENUM('lecture','lab','seminar') NOT NULL,
  capacity INT NOT NULL,
  resources JSON,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time slots table for university timings
CREATE TABLE time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot_name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift ENUM('morning','evening','weekend') NOT NULL,
  duration_minutes INT NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- University settings table
CREATE TABLE university_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSON NOT NULL,
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Course requests table (for instructor acceptance workflow)
CREATE TABLE course_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  instructor_id CHAR(36),
  section_id INT NOT NULL,
  status ENUM('pending','accepted','rejected') DEFAULT 'pending',
  preferences JSON, -- Store day and time preferences
  accepted_at TIMESTAMP NULL,
  can_undo BOOLEAN DEFAULT FALSE,
  undo_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- Blocks table (Core timetable data using Block Theory)
CREATE TABLE blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(36) NOT NULL,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  room_id INT NOT NULL,
  day ENUM('monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  time_slot_id INT NOT NULL,
  shift ENUM('morning','evening','weekend') NOT NULL,
  block_type ENUM('theory','lab','seminar') DEFAULT 'theory',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
  UNIQUE KEY unique_teacher_slot (teacher_id, day, time_slot_id, shift),
  UNIQUE KEY unique_room_slot (room_id, day, time_slot_id, shift),
  UNIQUE KEY unique_section_slot (section_id, day, time_slot_id, shift)
);

-- Exams table
CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  room_id INT NOT NULL,
  invigilator_id CHAR(36) NOT NULL,
  exam_type ENUM('midterm','final','supplementary','quiz') NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  mode ENUM('match','shuffle') DEFAULT 'match',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student enrollments table
CREATE TABLE student_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  section_id INT NOT NULL,
  program_id INT NOT NULL,
  semester INT NOT NULL,
  roll_number VARCHAR(50) UNIQUE NOT NULL,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('timetable','reschedule','exam','general') NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id VARCHAR(50),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Instructor preferences table
CREATE TABLE instructor_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instructor_id CHAR(36) NOT NULL,
  preferred_days JSON, -- Array of days
  preferred_time_slots JSON, -- Array of time slot IDs
  max_daily_hours INT DEFAULT 8,
  specialization TEXT,
  availability_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Timetable versions table (for tracking changes)
CREATE TABLE timetable_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_number INT NOT NULL,
  semester VARCHAR(20) NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  created_by CHAR(36) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default super admin (first user)
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (id, name, email, password_hash, role, status, department, designation) VALUES 
(UUID(), 'System Administrator', 'admin@emersonsched.edu', '$2b$10$rQZ8kHWKQYQJ9X5vN2nKxeK5vN2nKxeK5vN2nKxeK5vN2nKxeK5vN2', 'admin', 'approved', 'IT Department', 'System Administrator');

-- Insert default university settings
INSERT INTO university_settings (setting_key, setting_value) VALUES 
('university_name', '"Emerson University"'),
('academic_year', '"2024-2025"'),
('current_semester', '"Fall 2024"'),
('working_days', '["monday", "tuesday", "wednesday", "thursday", "friday"]'),
('morning_shift_start', '"08:00"'),
('morning_shift_end', '"14:00"'),
('evening_shift_start', '"14:30"'),
('evening_shift_end', '"20:30"'),
('break_duration', '30'),
('slot_duration', '90'),
('system_initialized', 'false');

-- Insert default time slots for morning shift
INSERT INTO time_slots (slot_name, start_time, end_time, shift, duration_minutes) VALUES 
('Morning Slot 1', '08:00:00', '09:30:00', 'morning', 90),
('Morning Slot 2', '09:30:00', '11:00:00', 'morning', 90),
('Morning Break', '11:00:00', '11:30:00', 'morning', 30),
('Morning Slot 3', '11:30:00', '13:00:00', 'morning', 90),
('Morning Slot 4', '13:00:00', '14:30:00', 'morning', 90);

-- Insert default time slots for evening shift
INSERT INTO time_slots (slot_name, start_time, end_time, shift, duration_minutes) VALUES 
('Evening Slot 1', '14:30:00', '16:00:00', 'evening', 90),
('Evening Slot 2', '16:00:00', '17:30:00', 'evening', 90),
('Evening Break', '17:30:00', '18:00:00', 'evening', 30),
('Evening Slot 3', '18:00:00', '19:30:00', 'evening', 90),
('Evening Slot 4', '19:30:00', '21:00:00', 'evening', 90);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_blocks_teacher ON blocks(teacher_id);
CREATE INDEX idx_blocks_course ON blocks(course_id);
CREATE INDEX idx_blocks_section ON blocks(section_id);
CREATE INDEX idx_blocks_room ON blocks(room_id);
CREATE INDEX idx_blocks_day_time ON blocks(day, time_slot_id);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_course_requests_instructor ON course_requests(instructor_id);
CREATE INDEX idx_course_requests_status ON course_requests(status);