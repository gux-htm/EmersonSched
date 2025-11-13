-- 1) canonical map: courses -> majors (many-to-many)
CREATE TABLE IF NOT EXISTS course_major_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  major_id INT NOT NULL,
  applies_to_all_programs TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_major (course_id, major_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
);

-- 2) course_offerings: the allocation of a library course to program/major/section/intake/semester
CREATE TABLE IF NOT EXISTS course_offerings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  program_id INT NULL,
  major_id INT NULL,
  section_id INT NULL,
  semester INT NULL,
  intake VARCHAR(50) NULL,
  shift ENUM('morning','evening','weekend') DEFAULT NULL,
  academic_year VARCHAR(20) NULL,
  status ENUM('planned','active','completed','cancelled') DEFAULT 'planned',
  created_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE SET NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);

-- 3) section_course_history (records per offering per section for audit/degree progress)
CREATE TABLE IF NOT EXISTS section_course_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  offering_id INT NOT NULL,
  status ENUM('pending','completed','dropped') DEFAULT 'pending',
  grade VARCHAR(20) NULL,
  credit_hours_awarded INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE,
  UNIQUE KEY uq_section_offering (section_id, offering_id)
);

-- 4) add offering_id to current scheduling tables (nullable to allow gradual migration)
ALTER TABLE course_requests ADD COLUMN offering_id INT NULL;
ALTER TABLE room_assignments ADD COLUMN offering_id INT NULL;
ALTER TABLE slot_reservations ADD COLUMN offering_id INT NULL;

-- Add FK constraints (optional during migration; if structure exists)
ALTER TABLE course_requests ADD CONSTRAINT fk_cr_offering FOREIGN KEY (offering_id) REFERENCES course_offerings(id) ON DELETE SET NULL;
ALTER TABLE room_assignments ADD CONSTRAINT fk_ra_offering FOREIGN KEY (offering_id) REFERENCES course_offerings(id) ON DELETE SET NULL;
ALTER TABLE slot_reservations ADD CONSTRAINT fk_sr_offering FOREIGN KEY (offering_id) REFERENCES course_offerings(id) ON DELETE SET NULL;
