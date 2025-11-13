import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FiCalendar, FiBook, FiBell } from 'react-icons/fi';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'react-toastify';

export default function StudentDashboard() {
  const { user, isStudent } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStudent && user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadNotifications();
  }, [isStudent, user, router]);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    {
      href: '/student/timetable',
      icon: FiCalendar,
      title: 'My Timetable',
      description: 'View your class schedule',
      color: 'bg-blue-500',
    },
    {
      href: '/student/exams',
      icon: FiBook,
      title: 'Exam Schedule',
      description: 'View upcoming exams',
      color: 'bg-purple-500',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickLinks.map((link, index) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`${link.color} p-4 rounded-lg text-white`}>
                      <Icon size={32} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{link.title}</h3>
                      <p className="text-gray-600">{link.description}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h3 className="text-xl font-bold mb-2">🎓 Welcome to EmersonSched!</h3>
          <p className="text-blue-100">
            Access your class schedule, exam timetable, and receive notifications about any changes to your schedule.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Notifications</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="spinner"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No new notifications
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-50 rounded-lg flex items-start space-x-4"
                >
                  <div className="bg-blue-100 p-2 rounded-full">
                    <FiBell className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                    <p className="text-gray-600 text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
