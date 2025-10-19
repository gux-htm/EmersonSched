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
  role ENUM('admin','instructor','student') DEFAULT 'student',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Programs table (BS, MS, MPhil, PhD, ADP)
CREATE TABLE programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  system_type ENUM('semester','annual') DEFAULT 'semester',
  total_semesters INT NOT NULL,
  shift ENUM('morning','evening','weekend') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Majors table
CREATE TABLE majors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Courses table
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  credit_hours VARCHAR(10) NOT NULL,
  semester INT NOT NULL,
  shift ENUM('morning','evening') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Sections table
CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(10) NOT NULL,
  student_strength INT NOT NULL,
  shift ENUM('morning','evening') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  type ENUM('lecture','lab','seminar') NOT NULL,
  capacity INT NOT NULL,
  resources JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- University timings configuration
CREATE TABLE university_timings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  break_duration INT NOT NULL, -- in minutes
  slot_length INT NOT NULL, -- in minutes (60 or 90)
  working_days JSON NOT NULL, -- ['monday','tuesday',...]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time slots table (auto-generated based on university timings)
CREATE TABLE time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day ENUM('monday','tuesday','wednesday','thursday','friday') NOT NULL,
  shift ENUM('morning','evening') NOT NULL,
  slot_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocks table (core timetable structure)
CREATE TABLE blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(36) NOT NULL,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  room_id INT NOT NULL,
  day ENUM('monday','tuesday','wednesday','thursday','friday') NOT NULL,
  time_slot_id INT NOT NULL,
  shift ENUM('morning','evening') NOT NULL,
  status ENUM('active','rescheduled','cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE
);

-- Course requests table
CREATE TABLE course_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instructor_id CHAR(36) NOT NULL,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  status ENUM('pending','accepted','rejected') DEFAULT 'pending',
  preferences JSON, -- selected time slots and days
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- Exams table
CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  room_id INT NOT NULL,
  invigilator_id CHAR(36) NOT NULL,
  exam_type ENUM('midterm','final','supplementary') NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INT NOT NULL, -- in minutes
  mode ENUM('match','shuffle') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('timetable_update','reschedule','exam_schedule','registration_approved','registration_rejected') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log table for tracking changes
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  old_values JSON,
  new_values JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reset operations table
CREATE TABLE reset_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  operation_type ENUM('time_slots','teachers_rooms','full_reset') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_blocks_teacher ON blocks(teacher_id);
CREATE INDEX idx_blocks_course ON blocks(course_id);
CREATE INDEX idx_blocks_room ON blocks(room_id);
CREATE INDEX idx_blocks_day_time ON blocks(day, time_slot_id);
CREATE INDEX idx_course_requests_instructor ON course_requests(instructor_id);
CREATE INDEX idx_course_requests_status ON course_requests(status);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);