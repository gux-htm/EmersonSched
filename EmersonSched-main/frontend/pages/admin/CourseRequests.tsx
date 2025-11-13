import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiSend, FiEdit } from 'react-icons/fi';
import ChangeInstructorModal from '@/components/ChangeInstructorModal';

export default function AdminCourseRequests() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'accepted' | 'pending'>('accepted');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'accepted' | 'pending' | 'reassigned' | 'rescheduled'>('accepted');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [user, router, filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await timetableAPI.getCourseRequests({ status: filter });
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Failed to load course requests:', error);
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Layout><div className="spinner"></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Manage Course Requests</h1>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setFilter('accepted')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              filter === 'accepted' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              filter === 'pending' ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('reassigned')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              filter === 'reassigned'
                ? 'bg-blue-400 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Reassigned
          </button>
          <button
            onClick={() => setFilter('rescheduled')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              filter === 'rescheduled'
                ? 'bg-purple-400 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rescheduled
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No {filter} course requests found</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">{req.course_name}</h3>
                  <p className="text-sm text-gray-500">{req.course_code} (Offering ID: {req.offering_id})</p>
                  
                  <div className="space-y-1 text-sm">
                    <div><strong>Program:</strong> {req.program_name}</div>
                    <div><strong>Major:</strong> {req.major_name}</div>
                    <div><strong>Section:</strong> {req.section_name}</div>
                    <div><strong>Semester:</strong> {req.semester}</div>
                    <div><strong>Intake:</strong> {req.intake}</div>
                    <div><strong>Shift:</strong> {req.shift}</div>
                    <div><strong>Academic Year:</strong> {req.academic_year}</div>
                  </div>

                  {req.instructor_name ? (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-green-600 font-medium">✓ Accepted by: {req.instructor_name}</p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-red-600">No instructor assigned yet</p>
                    </div>
                  )}

                  {filter === 'accepted' && (
                    <div className="pt-2 border-t">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setIsModalOpen(true);
                        }}
                        className="btn btn-sm btn-outline-primary w-full flex items-center justify-center gap-2"
                      >
                        <FiEdit />
                        Change Instructor
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      {selectedRequest && (
        <ChangeInstructorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseRequest={selectedRequest}
          onSuccess={() => {
            setIsModalOpen(false);
            loadRequests();
          }}
        />
      )}
    </Layout>
  );
}