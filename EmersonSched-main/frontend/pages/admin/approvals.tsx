import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { authAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiCheck, FiX } from 'react-icons/fi';

export default function Approvals() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadPendingUsers();
  }, [isAdmin, router]);

  const loadPendingUsers = async () => {
    try {
      const response = await authAPI.getPendingRegistrations();
      setPendingUsers(response.data.users);
    } catch (error) {
      console.error('Failed to load pending users:', error);
      toast.error('Failed to load pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      await authAPI.updateRegistrationStatus({ userId, status });
      toast.success(`User ${status} successfully`);
      loadPendingUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${status} user`);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
            <p className="text-gray-600 mt-1">{pendingUsers.length} pending registration(s)</p>
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No pending approvals</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <span className="badge badge-info capitalize">{user.role}</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium text-gray-900">{user.department}</p>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <button
                      onClick={() => handleApproval(user.id, 'approved')}
                      className="flex-1 btn btn-success flex items-center justify-center space-x-2"
                    >
                      <FiCheck /> <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleApproval(user.id, 'rejected')}
                      className="flex-1 btn btn-danger flex items-center justify-center space-x-2"
                    >
                      <FiX /> <span>Reject</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
