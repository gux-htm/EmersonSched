import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { FiUsers, FiBook, FiHome, FiCalendar, FiUserCheck, FiActivity } from 'react-icons/fi';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }

    loadStats();
  }, [isAdmin, router]);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
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

  const statCards = [
    { icon: FiUsers, label: 'Instructors', value: stats?.instructors || 0, color: 'bg-blue-500' },
    { icon: FiUserCheck, label: 'Students', value: stats?.students || 0, color: 'bg-green-500' },
    { icon: FiBook, label: 'Courses', value: stats?.courses || 0, color: 'bg-purple-500' },
    { icon: FiHome, label: 'Rooms', value: stats?.rooms || 0, color: 'bg-yellow-500' },
    { icon: FiCalendar, label: 'Scheduled Classes', value: stats?.scheduledClasses || 0, color: 'bg-indigo-500' },
    { icon: FiActivity, label: 'Pending Approvals', value: stats?.pendingApprovals || 0, color: 'bg-red-500' },
  ];

  const quickActions = [
    { href: '/admin/instructors', label: 'Add Instructor', icon: FiUsers, color: 'bg-blue-500' },
    { href: '/admin/courses', label: 'Add Course', icon: FiBook, color: 'bg-purple-500' },
    { href: '/admin/rooms', label: 'Add Room', icon: FiHome, color: 'bg-yellow-500' },
    { href: '/admin/timetable', label: 'Generate Timetable', icon: FiCalendar, color: 'bg-green-500' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card flex items-center space-x-4"
              >
                <div className={`${stat.color} p-4 rounded-lg text-white`}>
                  <Icon size={32} />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Link
                    href={action.href}
                    className="card flex flex-col items-center justify-center space-y-3 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <div className={`${action.color} p-4 rounded-lg text-white`}>
                      <Icon size={28} />
                    </div>
                    <p className="font-semibold text-gray-900">{action.label}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">System initialized</p>
                <p className="text-sm text-gray-600">Ready to manage timetables</p>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
