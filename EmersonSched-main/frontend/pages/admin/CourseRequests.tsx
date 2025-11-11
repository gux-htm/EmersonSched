import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import api from '@/lib/api'; // ✅ fixed import — it’s default, not named
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiSend } from 'react-icons/fi';

export default function AdminCourseRequests() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'accepted' | 'pending'>('accepted');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [user, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // ✅ correct backend route
      const res = await api.get('/course-requests');
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Failed to load course requests:', error);
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequests = async () => {
    if (sending) return;
    setSending(true);
    try {
      // ✅ correct backend route
      await api.post('/course-requests');
      toast.success('Course requests sent to all instructors');
      loadRequests();
    } catch (error: any) {
      console.error('Error sending requests:', error);
      toast.error(error.response?.data?.error || 'Failed to send course requests');
    } finally {
      setSending(false);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Manage Course Requests</h1>

          <button
            onClick={handleSendRequests}
            disabled={sending}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FiSend />
            <span>{sending ? 'Sending...' : 'Send Course Requests'}</span>
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setFilter('accepted')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              filter === 'accepted'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              filter === 'pending'
                ? 'bg-yellow-400 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
        </div>

        {/* Filtered Requests */}
        {(() => {
          // Remove duplicates and filter by status
          const uniqueRequests = requests.filter(
            (req, index, self) => index === self.findIndex(r => r.id === req.id)
          );
          const filteredRequests = uniqueRequests.filter(
            req => req.status?.toLowerCase() === filter
          );

          if (filteredRequests.length === 0) {
            return (
              <div className="card text-center py-12">
                <p className="text-gray-600 text-lg">
                  No {filter} course requests found
                </p>
              </div>
            );
          }

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredRequests.map((req, i) => (
              <motion.div
                key={`request-${req.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">
                    {req.course_name || 'Unnamed Course'}
                  </h3>
                  <p className="text-sm text-gray-500">{req.course_code}</p>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-2">
                      <span><strong>Major:</strong> {req.major_name || 'N/A'}</span>
                      <span><strong>Semester:</strong> {req.semester || 'N/A'}</span>
                      <span className="capitalize"><strong>Shift:</strong> {req.shift || 'morning'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span><strong>Section:</strong> {req.section_name || req.section_id}</span>
                      <span><strong>Credit Hours:</strong> {req.credit_hours || 'N/A'}</span>
                    </div>
                    <div>
                      <span className={`badge ${req.status === 'accepted' ? 'badge-success' : req.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                        {req.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {req.assigned_instructor ? (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Accepted by: {req.assigned_instructor}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-red-600">
                        No instructor assigned yet
                      </p>
                    </div>
                  )}

                  {/* Show selected time slots if accepted */}
                  {req.status === 'accepted' && req.selected_time_slots && req.selected_time_slots.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Selected Time Slots:</p>
                      <div className="space-y-1">
                        {req.selected_time_slots.map((slot: any, idx: number) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="flex justify-between">
                              <span className="font-medium capitalize">{slot.day_of_week || 'Any'}</span>
                              <span className="text-gray-600">{slot.slot_label || `${slot.start_time} - ${slot.end_time}`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
              ))}
            </motion.div>
          );
        })()}
      </div>
    </Layout>
  );
}
