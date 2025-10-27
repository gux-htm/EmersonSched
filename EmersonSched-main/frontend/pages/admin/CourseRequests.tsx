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

        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No course requests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req, i) => (
              <motion.div
                key={req.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-gray-900">
                    {req.course_name || 'Unnamed Course'}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>Course ID: {req.course_id}</span>
                    <span>Section: {req.section_id}</span>
                    <span className="capitalize">Status: {req.status}</span>
                  </div>

                  {req.assigned_instructor ? (
                    <p className="text-sm text-green-600 mt-1">
                      Accepted by: {req.assigned_instructor}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-1">
                      No instructor assigned yet
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
