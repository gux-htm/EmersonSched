import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';

export default function AdminTimetable() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }

    loadTimetable();
  }, [isAdmin, router]);

  const loadTimetable = async () => {
    try {
      const response = await timetableAPI.getTimetable();
      setTimetable(response.data.timetable);
    } catch (error) {
      console.error('Failed to load timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTimetable = async () => {
    setGenerating(true);
    try {
      const response = await timetableAPI.generateTimetable();
      toast.success(response.data.message);
      loadTimetable();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async (type: string) => {
    if (!confirm(`Are you sure you want to reset ${type}?`)) return;

    try {
      await timetableAPI.resetTimetable({ type });
      toast.success('Reset successful');
      loadTimetable();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Reset failed');
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

  // Group timetable by day
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const groupedTimetable = days.reduce((acc, day) => {
    acc[day] = timetable.filter((block) => block.day === day);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Timetable Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={handleGenerateTimetable}
              disabled={generating}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiRefreshCw className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Generating...' : 'Generate Timetable'}</span>
            </button>
            <button className="btn btn-secondary flex items-center space-x-2">
              <FiDownload /> <span>Export</span>
            </button>
          </div>
        </div>

        {/* Reset Options */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Options</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleReset('slots')} className="btn btn-secondary">
              Reset Time Slots
            </button>
            <button onClick={() => handleReset('assignments')} className="btn btn-secondary">
              Reset Assignments
            </button>
            <button onClick={() => handleReset('full')} className="btn btn-danger">
              Full Reset
            </button>
          </div>
        </div>

        {/* Timetable Display */}
        {timetable.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No timetable generated yet</p>
            <button onClick={handleGenerateTimetable} className="btn btn-primary">
              Generate Timetable
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day} className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4 capitalize">{day}</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Section</th>
                        <th>Room</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedTimetable[day]?.length > 0 ? (
                        groupedTimetable[day].map((block) => (
                          <tr key={block.id}>
                            <td className="font-medium">{block.slot_label}</td>
                            <td>{block.course_code} - {block.course_name}</td>
                            <td>{block.teacher_name}</td>
                            <td>{block.section_name}</td>
                            <td>{block.room_name}</td>
                            <td>
                              <span className={`badge ${block.type === 'lab' ? 'badge-info' : 'badge-success'}`}>
                                {block.type}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-gray-500">
                            No classes scheduled
                          </td>
                        </tr>
                      )}
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
