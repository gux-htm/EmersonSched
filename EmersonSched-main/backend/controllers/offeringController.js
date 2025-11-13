const db = require('../config/db');

const generateRequestsFromOfferings = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { program_id, major_id, semester, shift, section_id } = req.body;

        let query = `
            SELECT id FROM course_offerings co
            WHERE NOT EXISTS (
                SELECT 1 FROM course_requests cr
                WHERE cr.offering_id = co.id
                AND cr.status IN ('pending', 'accepted')
            )
        `;
        const params = [];

        if (program_id) {
            query += ' AND co.program_id = ?';
            params.push(program_id);
        }
        if (major_id) {
            query += ' AND co.major_id = ?';
            params.push(major_id);
        }
        if (semester) {
            query += ' AND co.semester = ?';
            params.push(semester);
        }
        if (shift) {
            query += ' AND co.shift = ?';
            params.push(shift);
        }
        if (section_id) {
            query += ' AND co.section_id = ?';
            params.push(section_id);
        }

        const [offeringsToRequest] = await connection.query(query, params);

        if (offeringsToRequest.length === 0) {
            return res.json({ message: 'No new course requests to generate.', created: 0, skipped: 0 });
        }

        const requestValues = offeringsToRequest.map(offering => [offering.id]);

        await connection.beginTransaction();
        await connection.query(
            'INSERT INTO course_requests (offering_id) VALUES ?',
            [requestValues]
        );
        await connection.commit();

        res.json({
            message: 'Course requests generated successfully.',
            created: offeringsToRequest.length,
            skipped: 0 // Implement skipped logic if needed
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Generate requests from offerings error:', error);
        res.status(500).json({ error: 'Failed to generate course requests' });
    } finally {
        if (connection) connection.release();
    }
};

const editOffering = async (req, res) => {
    try {
        const { id } = req.params;
        const { force, ...fieldsToUpdate } = req.body;

        const [reservations] = await db.query(
            "SELECT COUNT(*) as count FROM course_requests WHERE offering_id = ? AND status = 'accepted'",
            [id]
        );

        if (reservations[0].count > 0 && force !== 'true') {
            return res.status(400).json({
                error: 'Cannot edit offering with accepted reservations. Use force=true to override.',
            });
        }

        await db.query('UPDATE course_offerings SET ? WHERE id = ?', [fieldsToUpdate, id]);

        res.json({ message: 'Offering updated successfully' });
    } catch (error) {
        console.error('Edit offering error:', error);
        res.status(500).json({ error: 'Failed to update offering' });
    }
};

const deleteOffering = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;

        const [reservations] = await db.query(
            "SELECT COUNT(*) as count FROM course_requests WHERE offering_id = ? AND status = 'accepted'",
            [id]
        );

        if (reservations[0].count > 0 && force !== 'true') {
            return res.status(400).json({
                error: 'Cannot delete offering with accepted reservations. Use force=true to override.',
            });
        }

        await db.query('DELETE FROM course_offerings WHERE id = ?', [id]);

        res.json({ message: 'Offering deleted successfully' });
    } catch (error) {
        console.error('Delete offering error:', error);
        res.status(500).json({ error: 'Failed to delete offering' });
    }
};
module.exports = {
    generateRequestsFromOfferings,
    editOffering,
    deleteOffering,
};
