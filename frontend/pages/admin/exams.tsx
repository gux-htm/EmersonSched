import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { examAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiCalendar } from 'react-icons/fi';

export default function Exams() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  
  const [generateForm, setGenerateForm] = useState({
    exam_type: 'midterm',
    start_date: '',
    end_date: '',
    working_hours_start: '09:00',
    working_hours_end: '12:00',
    mode: 'match',
    semester: 1,
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadExams();
  }, [isAdmin, router]);

  const loadExams = async () => {
    try {
      const response = await examAPI.getExams();
      setExams(response.data.exams);
    } catch (error) {
      console.error('Failed to load exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await examAPI.generateExamSchedule(generateForm);
      toast.success(response.data.message);
      setShowGenerateForm(false);
      loadExams();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate exam schedule');
    }
  };

  const handleReset = async (type: string) => {
    if (!confirm(`Are you sure you want to reset ${type}?`)) return;

    try {
      await examAPI.resetExams({ type });
      toast.success('Exam schedule reset successfully');
      loadExams();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset exams');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  // Group exams by date
  const groupedExams = exams.reduce((acc, exam) => {
    const date = exam.exam_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(exam);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exam Scheduling</h1>
            <p className="text-gray-600 mt-1">{exams.length} exam(s) scheduled</p>
          </div>
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FiPlus /> <span>Generate Schedule</span>
          </button>
        </div>

        {/* Generate Exam Schedule Form */}
        {showGenerateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Exam Schedule</h2>
            <form onSubmit={handleGenerateSchedule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label">Exam Type</label>
                  <select
                    value={generateForm.exam_type}
                    onChange={(e) => setGenerateForm({ ...generateForm, exam_type: e.target.value })}
                    className="input"
                  >
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="supplementary">Supplementary</option>
                  </select>
                </div>

                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={generateForm.start_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={generateForm.end_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Start Time</label>
                  <input
                    type="time"
                    value={generateForm.working_hours_start}
                    onChange={(e) => setGenerateForm({ ...generateForm, working_hours_start: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    value={generateForm.working_hours_end}
                    onChange={(e) => setGenerateForm({ ...generateForm, working_hours_end: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Invigilator Mode</label>
                  <select
                    value={generateForm.mode}
                    onChange={(e) => setGenerateForm({ ...generateForm, mode: e.target.value })}
                    className="input"
                  >
                    <option value="match">Match Mode (Instructor = Invigilator)</option>
                    <option value="shuffle">Shuffle Mode (Random Assignment)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Semester</label>
                  <input
                    type="number"
                    value={generateForm.semester}
                    onChange={(e) => setGenerateForm({ ...generateForm, semester: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                    max="8"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">Generate Schedule</button>
                <button
                  type="button"
                  onClick={() => setShowGenerateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Reset Options */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Options</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleReset('invigilators')} className="btn btn-secondary">
              Reassign Invigilators
            </button>
            <button onClick={() => handleReset('full')} className="btn btn-danger">
              Delete All Exams
            </button>
          </div>
        </div>

        {/* Exam Schedule Display */}
        {exams.length === 0 ? (
          <div className="card text-center py-12">
            <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-4">No exams scheduled yet</p>
            <button onClick={() => setShowGenerateForm(true)} className="btn btn-primary">
              Generate Exam Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedExams).sort().map((date) => (
              <div key={date} className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Course</th>
                        <th>Section</th>
                        <th>Room</th>
                        <th>Invigilator</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedExams[date].map((exam) => (
                        <tr key={exam.id}>
                          <td className="font-medium">
                            {exam.start_time.substring(0, 5)} - {exam.end_time.substring(0, 5)}
                          </td>
                          <td>{exam.course_code} - {exam.course_name}</td>
                          <td>{exam.section_name}</td>
                          <td>{exam.room_name}</td>
                          <td>{exam.invigilator_name}</td>
                          <td>
                            <span className="badge badge-warning capitalize">{exam.exam_type}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
