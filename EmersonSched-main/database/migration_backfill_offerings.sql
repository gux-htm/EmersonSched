START TRANSACTION;

-- Step 1: Create new offerings for legacy course requests that don't have one.
INSERT INTO course_offerings (course_id, program_id, major_id, section_id, semester, shift, status)
SELECT DISTINCT
    cr.course_id,
    m.program_id,
    cr.major_id,
    s.id AS section_id,
    cr.semester,
    s.shift,
    'active' AS status
FROM
    course_requests cr
JOIN
    sections s ON cr.major_id = s.major_id AND cr.semester = s.semester AND cr.shift = s.shift
JOIN
    majors m ON s.major_id = m.id
WHERE
    cr.offering_id IS NULL;

-- Step 2: Update the offering_id in course_requests by looking up the newly created offerings.
UPDATE
    course_requests cr
JOIN
    sections s ON cr.major_id = s.major_id AND cr.semester = s.semester AND cr.shift = s.shift
JOIN
    course_offerings co ON cr.course_id = co.course_id AND s.id = co.section_id
SET
    cr.offering_id = co.id
WHERE
    cr.offering_id IS NULL;

COMMIT;
