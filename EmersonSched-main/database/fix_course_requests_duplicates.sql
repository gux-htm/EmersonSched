-- Migration script to fix duplicate course requests
-- This script:
-- 1. Removes duplicate course requests, keeping only the most recent one per unique combination
-- 2. Adds a unique constraint to prevent future duplicates

-- Step 1: Delete duplicate course requests, keeping only the most recent one
-- This will delete all but the latest request for each unique combination of:
-- (course_id, section_id, major_id, semester, shift)
DELETE cr1 FROM course_requests cr1
INNER JOIN course_requests cr2
WHERE 
    cr1.course_id = cr2.course_id 
    AND cr1.section_id = cr2.section_id
    AND cr1.major_id = cr2.major_id
    AND cr1.semester = cr2.semester
    AND cr1.shift = cr2.shift
    AND cr1.id < cr2.id;

-- Step 2: Add unique constraint to prevent future duplicates
-- Note: If the constraint already exists, this will fail - you can ignore that error
ALTER TABLE course_requests
ADD UNIQUE INDEX unique_course_request (course_id, section_id, major_id, semester, shift);

-- Verify: Check how many unique requests we have now
SELECT 
    course_id, section_id, major_id, semester, shift, COUNT(*) as count
FROM course_requests
GROUP BY course_id, section_id, major_id, semester, shift
HAVING count > 1;

-- If the above query returns any rows, there are still duplicates that need manual cleanup


