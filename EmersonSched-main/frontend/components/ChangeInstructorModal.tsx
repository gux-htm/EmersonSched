import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface ChangeInstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseRequest: any;
  onSuccess: () => void;
}

export default function ChangeInstructorModal({ isOpen, onClose, courseRequest, onSuccess }: ChangeInstructorModalProps) {
  const [instructors, setInstructors] = useState<any[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInstructors();
    }
  }, [isOpen]);

  const fetchInstructors = async () => {
    try {
      const res = await api.get('/admin/instructors');
      setInstructors(res.data.instructors || []);
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
      toast.error('Failed to fetch instructors');
    }
  };

  const handleSelectInstructor = (instructorId: string) => {
    setSelectedInstructors(prev =>
      prev.includes(instructorId)
        ? prev.filter(id => id !== instructorId)
        : [...prev, instructorId]
    );
  };

  const handleSubmit = async () => {
    if (selectedInstructors.length === 0) {
      toast.warn('Please select at least one instructor.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/course-requests/reassign', {
        course_request_id: courseRequest.id,
        selected_instructors: selectedInstructors,
        admin_id: courseRequest.requested_by,
      });
      toast.success('Course reassigned successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to reassign course:', error);
      toast.error('Failed to reassign course');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Change Instructor</h2>
        <p className="mb-4">
          Reassigning <strong>{courseRequest.course_name}</strong>
        </p>

        <input
          type="text"
          placeholder="Search instructors..."
          className="w-full p-2 border rounded mb-4"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <div className="max-h-60 overflow-y-auto mb-4">
          {filteredInstructors.map(instructor => (
            <div
              key={instructor.id}
              className={`p-2 border-b flex items-center justify-between cursor-pointer ${selectedInstructors.includes(instructor.id) ? 'bg-blue-100' : ''}`}
              onClick={() => handleSelectInstructor(instructor.id)}
            >
              <span>{instructor.name}</span>
              <input
                type="checkbox"
                checked={selectedInstructors.includes(instructor.id)}
                readOnly
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
