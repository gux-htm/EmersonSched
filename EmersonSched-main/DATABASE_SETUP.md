# Database Setup Instructions

## ✅ Complete Schema File Ready

The file `database/schema.sql` has been updated with all the new scheduling features integrated.

## What Was Fixed

### New Tables Added to Schema
1. **`room_assignments`** - Tracks room-to-section assignments for time slots
2. **`slot_reservations`** - Records instructor reservations with audit trail  
3. **`time_slot_generation_settings`** - Stores admin configuration for dynamic slot generation

### Enhanced Tables
- **`time_slots`** - Added `day_of_week` and `slot_length_minutes` columns for dynamic generation

### All Existing Data Preserved
- All courses, users, sections, rooms, majors, programs data is intact
- All indexes and foreign key constraints properly set up
- Auto-increment values preserved

## How to Use in phpMyAdmin

### Option 1: Fresh Database (Recommended)
If you're starting fresh:

1. Open phpMyAdmin
2. Select your database or create new one: `university_timetable`
3. Go to SQL tab
4. Copy the entire contents of `database/schema.sql`
5. Paste and execute

### Option 2: If You Already Have Data

If you need to add tables to existing database without losing data:

1. Open phpMyAdmin
2. Select your `university_timetable` database
3. Go to SQL tab
4. Run this migration SQL:

```sql
-- Create room_assignments table
CREATE TABLE IF NOT EXISTS `room_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `room_id` int(11) NOT NULL,
  `section_id` int(11) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `semester` varchar(50) NOT NULL,
  `status` enum('reserved','available','blocked') DEFAULT 'reserved',
  `assigned_by` char(36) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_room_assignment` (`room_id`,`time_slot_id`),
  KEY `idx_section_slot` (`section_id`,`time_slot_id`),
  UNIQUE KEY `unique_room_time_slot` (`room_id`,`time_slot_id`,`semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign keys
ALTER TABLE `room_assignments`
  ADD CONSTRAINT `fk_room_assignments_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_room_assignments_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_room_assignments_time_slot` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE;

-- Create slot_reservations table
CREATE TABLE IF NOT EXISTS `slot_reservations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `course_request_id` int(11) NOT NULL,
  `instructor_id` char(36) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `room_assignment_id` int(11) NOT NULL,
  `status` enum('reserved','cancelled') DEFAULT 'reserved',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_reservation_course_request` (`course_request_id`),
  KEY `idx_reservation_instructor` (`instructor_id`),
  KEY `idx_reservation_time_slot` (`time_slot_id`),
  KEY `idx_reservation_room` (`room_assignment_id`),
  UNIQUE KEY `unique_reservation` (`course_request_id`,`time_slot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign keys for slot_reservations
ALTER TABLE `slot_reservations`
  ADD CONSTRAINT `fk_slot_reservations_course_request` FOREIGN KEY (`course_request_id`) REFERENCES `course_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_slot_reservations_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_slot_reservations_time_slot` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_slot_reservations_room_assignment` FOREIGN KEY (`room_assignment_id`) REFERENCES `room_assignments` (`id`) ON DELETE CASCADE;

-- Create time_slot_generation_settings table
CREATE TABLE IF NOT EXISTS `time_slot_generation_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shift` enum('morning','evening','weekend') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `distribution_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`distribution_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_shift` (`shift`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add columns to time_slots if they don't exist
ALTER TABLE `time_slots` 
  ADD COLUMN IF NOT EXISTS `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') DEFAULT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `slot_length_minutes` int(11) DEFAULT 60 AFTER `slot_label`;

-- Update existing time slots to have slot_length_minutes
UPDATE `time_slots` 
SET `slot_length_minutes` = TIMESTAMPDIFF(MINUTE, start_time, end_time)
WHERE `slot_length_minutes` IS NULL;
```

## Verify Tables Were Created

After running the SQL, check that these tables exist:
- `room_assignments`
- `slot_reservations`
- `time_slot_generation_settings`

And that `time_slots` has the new columns:
- `day_of_week`
- `slot_length_minutes`

## Next Steps

1. Run the schema.sql in phpMyAdmin (or the migration SQL if keeping existing data)
2. Restart your backend server: `npm start` in `backend/` folder
3. Test the new API endpoints
4. Update frontend to use new features

## Testing Queries

After setup, you can test with these queries:

```sql
-- Check new tables exist
SHOW TABLES LIKE 'room_assignments';
SHOW TABLES LIKE 'slot_reservations';
SHOW TABLES LIKE 'time_slot_generation_settings';

-- Check time_slots has new columns
DESCRIBE time_slots;
```

All data from courses, users, sections, rooms, etc. is preserved and intact!

