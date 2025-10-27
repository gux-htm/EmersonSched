import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { FiBook, FiCalendar, FiClock } from 'react-icons/fi';
import Link from 'next/link';

export default function InstructorDashboard() {
  const { user, isInstructor } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>({
    pendingRequests: 0,
    acceptedCourses: 0,
    totalClasses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInstructor && user?.role !== 'admin') {
      router.push('/login');
      return;
    }

    loadStats();
  }, [isInstructor, user, router]);

  const loadStats = async () => {
    try {
      const [pendingRes, acceptedRes, timetableRes] = await Promise.all([
        timetableAPI.getCourseRequests({ status: 'pending' }),
        timetableAPI.getCourseRequests({ status: 'accepted', instructor_id: user?.id }),
        timetableAPI.getTimetable({ teacher_id: user?.id }),
      ]);

      setStats({
        pendingRequests: pendingRes.data.requests.length,
        acceptedCourses: acceptedRes.data.requests.length,
        totalClasses: timetableRes.data.timetable.length,
      });
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
    { icon: FiBook, label: 'Pending Requests', value: stats.pendingRequests, color: 'bg-yellow-500' },
    { icon: FiCalendar, label: 'Accepted Courses', value: stats.acceptedCourses, color: 'bg-green-500' },
    { icon: FiClock, label: 'Total Classes', value: stats.totalClasses, color: 'bg-blue-500' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Instructor Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/instructor/requests">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="card hover:shadow-xl transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-purple-500 p-4 rounded-lg text-white">
                  <FiBook size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Course Requests</h3>
                  <p className="text-gray-600">View and accept course assignments</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/instructor/timetable">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="card hover:shadow-xl transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-500 p-4 rounded-lg text-white">
                  <FiCalendar size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">My Timetable</h3>
                  <p className="text-gray-600">View your class schedule</p>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="card bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <h3 className="text-xl font-bold mb-2">Welcome to EmersonSched!</h3>
          <p className="text-purple-100">
            Manage your course assignments, set your availability preferences, and view your teaching schedule all in one place.
          </p>
        </div>
      </div>
    </Layout>
  );
}
