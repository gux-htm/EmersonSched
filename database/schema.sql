-- EmersonSched Database Schema
-- University Timetable Management System

CREATE DATABASE IF NOT EXISTS university_timetable;
USE university_timetable;

-- Users table with role-based access control
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'instructor', 'student') DEFAULT 'student',
  metadata JSON,
  is_approved BOOLEAN DEFAULT FALSE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- University timings configuration
CREATE TABLE university_timings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  break_duration INT DEFAULT 30,
  slot_length INT DEFAULT 60,
  working_days JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time slots generated from university timings
CREATE TABLE time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_number INT NOT NULL,
  shift ENUM('morning', 'evening', 'weekend') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Programs table
CREATE TABLE programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  system_type ENUM('semester', 'annual') DEFAULT 'semester',
  total_semesters INT NOT NULL,
  shift ENUM('morning', 'evening', 'weekend') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Majors table
CREATE TABLE majors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Courses table
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  credit_hours VARCHAR(10) NOT NULL,
  semester INT NOT NULL,
  shift ENUM('morning', 'evening', 'weekend') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Sections table
CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(10) NOT NULL,
  student_strength INT NOT NULL,
  shift ENUM('morning', 'evening', 'weekend') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL,
  type ENUM('lecture', 'lab', 'seminar') NOT NULL,
  capacity INT NOT NULL,
  resources JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course requests for instructors
CREATE TABLE course_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instructor_id CHAR(36) NOT NULL,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  preferences JSON,
  accepted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- Blocks table for timetable generation
CREATE TABLE blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(36) NOT NULL,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  room_id INT NOT NULL,
  day ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday') NOT NULL,
  time_slot_id INT NOT NULL,
  shift ENUM('morning', 'evening', 'weekend') NOT NULL,
  is_rescheduled BOOLEAN DEFAULT FALSE,
  original_block_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (original_block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

-- Exam sessions
CREATE TABLE exam_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  exam_type ENUM('midterm', 'final', 'supplementary') NOT NULL,
  duration INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  working_hours JSON NOT NULL,
  mode ENUM('match', 'shuffle') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams table
CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_session_id INT NOT NULL,
  course_id INT NOT NULL,
  room_id INT NOT NULL,
  invigilator_id CHAR(36) NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_rescheduled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('timetable', 'reschedule', 'exam', 'general') NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs for reset operations
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System settings
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (key_name, value, description) VALUES
('first_admin_registered', 'false', 'Whether the first admin has been registered'),
('registration_open', 'false', 'Whether user registration is open'),
('current_semester', '1', 'Current semester number'),
('academic_year', '2024', 'Current academic year');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_blocks_teacher ON blocks(teacher_id);
CREATE INDEX idx_blocks_course ON blocks(course_id);
CREATE INDEX idx_blocks_section ON blocks(section_id);
CREATE INDEX idx_blocks_room ON blocks(room_id);
CREATE INDEX idx_blocks_day_time ON blocks(day, time_slot_id);
CREATE INDEX idx_course_requests_instructor ON course_requests(instructor_id);
CREATE INDEX idx_course_requests_status ON course_requests(status);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);