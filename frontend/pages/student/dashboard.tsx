import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FiCalendar, FiBook, FiClock } from 'react-icons/fi';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user, isStudent } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isStudent && user?.role !== 'admin') {
      router.push('/login');
    }
  }, [isStudent, user, router]);

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
          <div className="text-center py-8 text-gray-500">
            No new notifications
          </div>
        </div>
      </div>
    </Layout>
  );
}
