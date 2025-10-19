-- EmersonSched Database Schema
-- University Timetable Management System

CREATE DATABASE IF NOT EXISTS university_timetable;
USE university_timetable;

-- Users Table
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','instructor','student') DEFAULT 'student',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  department VARCHAR(100),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Programs Table
CREATE TABLE programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  system_type ENUM('semester','annual') DEFAULT 'semester',
  total_semesters INT DEFAULT 8,
  shift ENUM('morning','evening','weekend'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Majors Table
CREATE TABLE majors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Courses Table
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  credit_hours VARCHAR(10) NOT NULL,
  semester INT NOT NULL,
  type ENUM('theory','lab','both') DEFAULT 'theory',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Sections Table
CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  major_id INT NOT NULL,
  name VARCHAR(10) NOT NULL,
  semester INT NOT NULL,
  student_strength INT DEFAULT 0,
  shift ENUM('morning','evening','weekend'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- Rooms Table
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL,
  type ENUM('lecture','lab','seminar') DEFAULT 'lecture',
  capacity INT NOT NULL,
  building VARCHAR(50),
  resources JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- University Timings Table
CREATE TABLE university_timings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  break_duration INT DEFAULT 15,
  slot_length INT DEFAULT 60,
  working_days JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time Slots Table
CREATE TABLE time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift ENUM('morning','evening','weekend') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_label VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Requests Table
CREATE TABLE course_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  instructor_id CHAR(36),
  status ENUM('pending','accepted','rejected') DEFAULT 'pending',
  preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Blocks Table (Timetable Entries)
CREATE TABLE blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(36) NOT NULL,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  room_id INT NOT NULL,
  day ENUM('monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  time_slot_id INT NOT NULL,
  shift ENUM('morning','evening','weekend') NOT NULL,
  type ENUM('theory','lab') DEFAULT 'theory',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
  UNIQUE KEY unique_block (teacher_id, day, time_slot_id),
  UNIQUE KEY unique_room (room_id, day, time_slot_id, shift),
  UNIQUE KEY unique_section (section_id, day, time_slot_id)
);

-- Exams Table
CREATE TABLE exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  room_id INT NOT NULL,
  invigilator_id CHAR(36),
  exam_type ENUM('midterm','final','supplementary') NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  mode ENUM('match','shuffle') DEFAULT 'match',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Audit Log Table
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications Table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('timetable','reschedule','exam','approval') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Student Enrollments Table
CREATE TABLE student_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  section_id INT NOT NULL,
  semester INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, section_id)
);

-- Indexes for performance
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_user_status ON users(status);
CREATE INDEX idx_blocks_teacher ON blocks(teacher_id);
CREATE INDEX idx_blocks_section ON blocks(section_id);
CREATE INDEX idx_blocks_day_time ON blocks(day, time_slot_id);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
