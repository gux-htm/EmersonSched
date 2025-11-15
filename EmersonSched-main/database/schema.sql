-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 27, 2025 at 12:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `university_timetable`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blocks`
--

CREATE TABLE `blocks` (
  `id` int(11) NOT NULL,
  `teacher_id` char(36) NOT NULL,
  `course_id` int(11) NOT NULL,
  `section_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `day` enum('monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `shift` enum('morning','evening','weekend') NOT NULL,
  `type` enum('theory','lab') DEFAULT 'theory',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `credit_hours` varchar(10) DEFAULT NULL,
  `type` enum('theory','lab','both') DEFAULT 'theory',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `code`, `name`, `credit_hours`, `type`, `created_at`) VALUES
(1, 'CYSE-2131', 'Cybersecurity', '2+1', 'both', '2025-10-26 18:50:09'),
(2, 'COSC-2110	', 'Software Engineering	', '3', 'theory', '2025-10-26 19:05:37'),
(4, 'COSC-2106', 'Data Structures', '3+1', 'both', '2025-10-26 19:09:52'),
(6, 'COSC-2111	', 'Computer Organization & Assembly Language', '2+1', 'both', '2025-10-26 19:19:50'),
(7, 'COSC-2116', 'Professional Practice', '2+0', 'theory', '2025-10-26 19:22:02'),
(8, 'SOCI-2101', 'Civics and Community Engagement', '2+0', 'theory', '2025-10-26 19:25:36');

-- --------------------------------------------------------

--
-- Table structure for table `course_offerings`
--
-- This table is created in the migration_add_offerings.sql file.
--
-- --------------------------------------------------------

--
-- Table structure for table `course_requests`
--

CREATE TABLE `course_requests` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `section_id` int(11) NOT NULL,
  `instructor_id` char(36) DEFAULT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferences`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `accepted_at` timestamp NULL DEFAULT NULL,
  `major_id` int(11) DEFAULT NULL,
  `semester` varchar(50) DEFAULT NULL,
  `shift` varchar(50) DEFAULT 'morning',
  `time_slot` varchar(100) DEFAULT NULL,
  `requested_by` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `course_requests`
--

INSERT INTO `course_requests` (`id`, `course_id`, `section_id`, `instructor_id`, `status`, `preferences`, `created_at`, `accepted_at`, `major_id`, `semester`, `shift`, `time_slot`, `requested_by`) VALUES
(1, 1, 1, NULL, 'pending', NULL, '2025-10-26 20:22:42', NULL, 9, '3', 'morning', NULL, 'bb65c4c7-c8b9-4752-b6a5-8778851da1a2'),
(2, 2, 1, NULL, 'pending', NULL, '2025-10-26 20:22:42', NULL, 9, '3', 'morning', NULL, 'bb65c4c7-c8b9-4752-b6a5-8778851da1a2');

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

CREATE TABLE `exams` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `section_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `invigilator_id` char(36) DEFAULT NULL,
  `exam_type` enum('midterm','final','supplementary') NOT NULL,
  `exam_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `mode` enum('match','shuffle') DEFAULT 'match',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `majors`
--

CREATE TABLE `majors` (
  `id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `majors`
--

INSERT INTO `majors` (`id`, `program_id`, `name`, `code`, `created_at`) VALUES
(9, 1, 'Artificial Intelligence', 'Ai-morn', '2025-10-26 18:16:17'),
(10, 3, 'Artificial Intelligence', 'Ai-eve', '2025-10-26 18:17:49'),
(11, 1, 'Cybersecurity', 'Cyb-morn', '2025-10-26 18:19:01'),
(12, 3, 'Cybersecurity', 'Cyb-eve', '2025-10-26 18:21:27'),
(13, 1, 'Data Science', 'DS-morn', '2025-10-26 18:30:04'),
(14, 3, 'Data Science', 'DS-morn', '2025-10-26 18:30:04'),
(15, 1, 'Software Engineering', 'SE-morn', '2025-10-26 18:43:49'),
(16, 3, 'Software Engineering', 'SE-eve', '2025-10-26 18:43:49'),
(17, 1, 'Computer Science', 'CS-morn', '2025-10-26 18:43:49'),
(18, 3, 'Computer Science', 'CS-eve', '2025-10-26 18:43:49'),
(19, 1, 'Information Technology', 'IT-morn', '2025-10-26 18:43:49'),
(20, 3, 'Information Technology', 'IT-eve', '2025-10-26 18:43:49'),
(21, 1, 'Information Systems', 'IS-morn', '2025-10-26 18:43:49'),
(22, 3, 'Information Systems', 'IS-eve', '2025-10-26 18:43:49');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` char(36) NOT NULL,
  `type` enum('timetable','reschedule','exam','approval') NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `system_type` enum('semester','annual') DEFAULT 'semester',
  `total_semesters` int(11) DEFAULT 8,
  `shift` enum('morning','evening','weekend') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id`, `name`, `code`, `system_type`, `total_semesters`, `shift`, `created_at`) VALUES
(1, 'BS-Morn', 'UGRAD-M', 'semester', 8, 'morning', '2025-10-21 14:01:10'),
(3, 'BS-Eve', 'UGRAD-E', 'semester', 8, 'evening', '2025-10-26 18:09:05');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `name` varchar(20) NOT NULL,
  `type` enum('lecture','lab','seminar') DEFAULT 'lecture',
  `capacity` int(11) NOT NULL,
  `building` varchar(50) DEFAULT NULL,
  `resources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resources`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `name`, `type`, `capacity`, `building`, `resources`, `created_at`) VALUES
(1, '101', 'lecture', 50, 'main block', '{\"projector\":true,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 15:02:55'),
(2, '102', 'lecture', 50, 'main block', '{\"projector\":false,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 15:03:20'),
(3, '103', 'lecture', 50, 'main block', '{\"projector\":true,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 15:03:48'),
(4, '104', 'lecture', 50, 'main block', '{\"projector\":false,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 19:33:11'),
(5, '105', 'lecture', 50, 'main block', '{\"projector\":false,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 19:33:30'),
(7, '106', 'lecture', 50, 'main block', '{\"projector\":false,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 19:33:59'),
(8, '107', 'lecture', 50, 'main block', '{\"projector\":false,\"whiteboard\":true,\"computers\":false,\"ac\":false}', '2025-10-26 19:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `room_assignments`
--

CREATE TABLE `room_assignments` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `section_id` int(11) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `semester` varchar(50) NOT NULL,
  `status` enum('reserved','available','blocked') DEFAULT 'reserved',
  `assigned_by` char(36) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` int(11) NOT NULL,
  `major_id` int(11) NOT NULL,
  `name` varchar(10) NOT NULL,
  `semester` int(11) NOT NULL,
  `student_strength` int(11) DEFAULT 0,
  `shift` enum('morning','evening','weekend') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `sections`
--

INSERT INTO `sections` (`id`, `major_id`, `name`, `semester`, `student_strength`, `shift`, `created_at`) VALUES
(1, 9, 'A', 3, 50, 'morning', '2025-10-26 19:36:55'),
(3, 10, 'A', 3, 48, 'evening', '2025-10-26 19:45:35'),
(4, 11, 'A', 3, 46, 'morning', '2025-10-26 19:45:35'),
(5, 12, 'A', 3, 50, 'evening', '2025-10-26 19:45:35'),
(6, 13, 'A', 3, 44, 'morning', '2025-10-26 19:45:35'),
(7, 14, 'A', 3, 47, 'evening', '2025-10-26 19:45:35'),
(8, 15, 'A', 3, 49, 'morning', '2025-10-26 19:45:35'),
(9, 16, 'A', 3, 45, 'evening', '2025-10-26 19:45:35'),
(10, 17, 'A', 3, 42, 'morning', '2025-10-26 19:45:35'),
(11, 18, 'A', 3, 50, 'evening', '2025-10-26 19:45:35'),
(12, 19, 'A', 3, 43, 'morning', '2025-10-26 19:45:35'),
(13, 20, 'A', 3, 47, 'evening', '2025-10-26 19:45:35'),
(14, 21, 'A', 3, 50, 'morning', '2025-10-26 19:45:35'),
(15, 22, 'A', 3, 41, 'evening', '2025-10-26 19:45:35'),
(16, 9, 'B', 3, 50, 'morning', '2025-10-26 19:45:36'),
(18, 11, 'B', 3, 44, 'morning', '2025-10-26 19:45:36'),
(20, 13, 'B', 3, 46, 'morning', '2025-10-26 19:45:36'),
(22, 15, 'B', 3, 43, 'morning', '2025-10-26 19:45:36'),
(24, 17, 'B', 3, 42, 'morning', '2025-10-26 19:45:36'),
(26, 19, 'B', 3, 48, 'morning', '2025-10-26 19:45:36'),
(27, 20, 'B', 3, 44, 'morning', '2025-10-26 19:45:36'),
(28, 21, 'B', 3, 50, 'morning', '2025-10-26 19:45:36'),
(29, 22, 'B', 3, 41, 'morning', '2025-10-26 19:45:36'),
(30, 21, 'B', 3, 40, 'morning', '0000-00-00 00:00:00'),
(31, 21, 'B', 3, 40, 'morning', '0000-00-00 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `slot_reservations`
--

CREATE TABLE `slot_reservations` (
  `id` int(11) NOT NULL,
  `course_request_id` int(11) NOT NULL,
  `instructor_id` char(36) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `room_assignment_id` int(11) NOT NULL,
  `status` enum('reserved','cancelled') DEFAULT 'reserved',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_enrollments`
--

CREATE TABLE `student_enrollments` (
  `id` int(11) NOT NULL,
  `student_id` char(36) NOT NULL,
  `section_id` int(11) NOT NULL,
  `semester` int(11) NOT NULL,
  `enrolled_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `time_slots`
-- ENHANCED: Added day_of_week and slot_length_minutes for dynamic generation
--

CREATE TABLE `time_slots` (
  `id` int(11) NOT NULL,
  `shift` enum('morning','evening','weekend') NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') DEFAULT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_label` varchar(50) DEFAULT NULL,
  `slot_length_minutes` int(11) DEFAULT 60,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `time_slots`
--

INSERT INTO `time_slots` (`id`, `shift`, `start_time`, `end_time`, `slot_label`, `slot_length_minutes`, `created_at`) VALUES
(1, 'morning', '08:00:00', '09:00:00', '08:00 - 09:00', 60, '2025-10-26 14:57:49'),
(2, 'morning', '09:00:00', '10:00:00', '09:00 - 10:00', 60, '2025-10-26 14:57:49'),
(3, 'morning', '10:00:00', '11:00:00', '10:00 - 11:00', 60, '2025-10-26 14:57:49'),
(4, 'morning', '11:00:00', '12:00:00', '11:00 - 12:00', 60, '2025-10-26 14:57:49'),
(5, 'morning', '12:00:00', '13:00:00', '12:00 - 13:00', 60, '2025-10-26 14:57:49'),
(6, 'morning', '13:00:00', '14:00:00', '13:00 - 14:00', 60, '2025-10-26 14:57:49'),
(7, 'morning', '14:00:00', '15:00:00', '14:00 - 15:00', 60, '2025-10-26 14:57:49'),
(8, 'morning', '15:00:00', '16:00:00', '15:00 - 16:00', 60, '2025-10-26 14:57:49'),
(9, 'morning', '16:00:00', '17:00:00', '16:00 - 17:00', 60, '2025-10-26 14:57:49'),
(10, 'evening', '14:00:00', '15:00:00', '14:00 - 15:00', 60, '2025-10-26 14:57:49'),
(11, 'evening', '15:00:00', '16:00:00', '15:00 - 16:00', 60, '2025-10-26 14:57:49'),
(12, 'evening', '16:00:00', '17:00:00', '16:00 - 17:00', 60, '2025-10-26 14:57:49'),
(13, 'weekend', '09:00:00', '10:00:00', '09:00 - 10:00', 60, '2025-10-26 14:57:49'),
(14, 'weekend', '10:00:00', '11:00:00', '10:00 - 11:00', 60, '2025-10-26 14:57:49'),
(15, 'weekend', '11:00:00', '12:00:00', '11:00 - 12:00', 60, '2025-10-26 14:57:49'),
(16, 'weekend', '12:00:00', '13:00:00', '12:00 - 13:00', 60, '2025-10-26 14:57:49'),
(17, 'weekend', '13:00:00', '14:00:00', '13:00 - 14:00', 60, '2025-10-26 14:57:49'),
(18, 'weekend', '14:00:00', '15:00:00', '14:00 - 15:00', 60, '2025-10-26 14:57:49'),
(19, 'weekend', '15:00:00', '16:00:00', '15:00 - 16:00', 60, '2025-10-26 14:57:49'),
(20, 'weekend', '16:00:00', '17:00:00', '16:00 - 17:00', 60, '2025-10-26 14:57:49');

-- --------------------------------------------------------

--
-- Table structure for table `time_slot_generation_settings`
--

CREATE TABLE `time_slot_generation_settings` (
  `id` int(11) NOT NULL,
  `shift` enum('morning','evening','weekend') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `distribution_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`distribution_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `university_timings`
--

CREATE TABLE `university_timings` (
  `id` int(11) NOT NULL,
  `opening_time` time NOT NULL,
  `closing_time` time NOT NULL,
  `break_duration` int(11) DEFAULT 15,
  `slot_length` int(11) DEFAULT 60,
  `working_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`working_days`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `university_timings`
--

INSERT INTO `university_timings` (`id`, `opening_time`, `closing_time`, `break_duration`, `slot_length`, `working_days`, `is_active`, `created_at`) VALUES
(1, '08:00:00', '17:00:00', 60, 60, '[\"monday\",\"tuesday\",\"wednesday\",\"thursday\",\"friday\",\"saturday\"]', 1, '2025-10-26 14:57:49');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','instructor','student') DEFAULT 'student',
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `department` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `resetOTP` varchar(255) DEFAULT NULL,
  `resetOTPExpiry` datetime DEFAULT NULL,
  `otpAttempts` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf16le COLLATE=utf16le_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`, `department`, `metadata`, `created_at`, `updated_at`) VALUES
('a26300ce-df62-427f-a963-f68dd5def038', 'hamza', 'example@gmail.com', '$2a$10$7R/slRJdtqzox6jO6UcRwOT.CE.Znk27hUg3liubq6yN2hrARP/uy', 'instructor', 'rejected', 'computer science', '{}', '2025-10-19 18:40:08', '2025-10-21 14:03:34'),
('bb65c4c7-c8b9-4752-b6a5-8778851da1a2', 'Gulraiz Khan', '32safdar@gmail.com', '$2a$10$czkSueoyFB4uXPaCwX6FG.p2JBeRjTUjNsrWRJVFMjq9eldgvdNda', 'admin', 'approved', 'computer science', '{}', '2025-10-19 18:19:13', '2025-10-19 18:19:13'),
('f8955ed8-fe6f-4b87-bcaf-e990bd45e8fd', 'gul khan', 'softsol.otp@gmaom.com', '$2a$10$7YvCewoYUGEjmixysIEsv.zePVEYbvzQnq7qeu9i5WQY14OIPvYv.', 'instructor', 'approved', 'Computer Science', '{}', '2025-10-21 15:35:01', '2025-10-21 15:35:12');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `blocks`
--
ALTER TABLE `blocks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_block` (`teacher_id`,`day`,`time_slot_id`),
  ADD UNIQUE KEY `unique_room` (`room_id`,`day`,`time_slot_id`,`shift`),
  ADD UNIQUE KEY `unique_section` (`section_id`,`day`,`time_slot_id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `time_slot_id` (`time_slot_id`),
  ADD KEY `idx_blocks_teacher` (`teacher_id`),
  ADD KEY `idx_blocks_section` (`section_id`),
  ADD KEY `idx_blocks_day_time` (`day`,`time_slot_id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `course_requests`
--
ALTER TABLE `course_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `section_id` (`section_id`),
  ADD KEY `instructor_id` (`instructor_id`),
  ADD KEY `major_id` (`major_id`),
  ADD KEY `requested_by` (`requested_by`);

--
-- Indexes for table `exams`
--
ALTER TABLE `exams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `section_id` (`section_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `invigilator_id` (`invigilator_id`),
  ADD KEY `idx_exams_date` (`exam_date`);

--
-- Indexes for table `majors`
--
ALTER TABLE `majors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `program_id` (`program_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`is_read`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `room_assignments`
--
ALTER TABLE `room_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_assignment` (`room_id`,`time_slot_id`),
  ADD KEY `idx_section_slot` (`section_id`,`time_slot_id`),
  ADD UNIQUE KEY `unique_room_time_slot` (`room_id`,`time_slot_id`,`semester`);

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `major_id` (`major_id`);

--
-- Indexes for table `slot_reservations`
--
ALTER TABLE `slot_reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reservation_course_request` (`course_request_id`),
  ADD KEY `idx_reservation_instructor` (`instructor_id`),
  ADD KEY `idx_reservation_time_slot` (`time_slot_id`),
  ADD KEY `idx_reservation_room` (`room_assignment_id`),
  ADD UNIQUE KEY `unique_reservation` (`course_request_id`,`time_slot_id`);

--
-- Indexes for table `student_enrollments`
--
ALTER TABLE `student_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_enrollment` (`student_id`,`section_id`),
  ADD KEY `section_id` (`section_id`);

--
-- Indexes for table `time_slots`
--
ALTER TABLE `time_slots`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `time_slot_generation_settings`
--
ALTER TABLE `time_slot_generation_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_shift` (`shift`);

--
-- Indexes for table `university_timings`
--
ALTER TABLE `university_timings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_user_role` (`role`),
  ADD KEY `idx_user_status` (`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blocks`
--
ALTER TABLE `blocks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `course_requests`
--
ALTER TABLE `course_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `exams`
--
ALTER TABLE `exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `majors`
--
ALTER TABLE `majors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `room_assignments`
--
ALTER TABLE `room_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sections`
--
ALTER TABLE `sections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `slot_reservations`
--
ALTER TABLE `slot_reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_enrollments`
--
ALTER TABLE `student_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `time_slots`
--
ALTER TABLE `time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `time_slot_generation_settings`
--
ALTER TABLE `time_slot_generation_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `university_timings`
--
ALTER TABLE `university_timings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `blocks`
--
ALTER TABLE `blocks`
  ADD CONSTRAINT `blocks_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `blocks_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `blocks_ibfk_3` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `blocks_ibfk_4` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `blocks_ibfk_5` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `course_requests`
--
ALTER TABLE `course_requests`
  ADD CONSTRAINT `course_requests_ibfk_2` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_requests_ibfk_3` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `course_requests_ibfk_4` FOREIGN KEY (`major_id`) REFERENCES `majors` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `course_requests_ibfk_5` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_course_requests_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_course_requests_sections` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `exams`
--
ALTER TABLE `exams`
  ADD CONSTRAINT `exams_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exams_ibfk_2` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exams_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exams_ibfk_4` FOREIGN KEY (`invigilator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `majors`
--
ALTER TABLE `majors`
  ADD CONSTRAINT `majors_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `room_assignments`
--
ALTER TABLE `room_assignments`
  ADD CONSTRAINT `fk_room_assignments_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_room_assignments_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_room_assignments_time_slot` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_room_assignments_user` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sections`
--
ALTER TABLE `sections`
  ADD CONSTRAINT `sections_ibfk_1` FOREIGN KEY (`major_id`) REFERENCES `majors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `slot_reservations`
--
ALTER TABLE `slot_reservations`
  ADD CONSTRAINT `fk_slot_reservations_course_request` FOREIGN KEY (`course_request_id`) REFERENCES `course_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_slot_reservations_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_slot_reservations_room_assignment` FOREIGN KEY (`room_assignment_id`) REFERENCES `room_assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_slot_reservations_time_slot` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_enrollments`
--
ALTER TABLE `student_enrollments`
  ADD CONSTRAINT `student_enrollments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_enrollments_ibfk_2` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
