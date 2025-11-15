import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { FiUsers, FiBook, FiHome, FiCalendar, FiUserCheck, FiActivity } from 'react-icons/fi';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-12 w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { icon: FiUsers, label: 'Instructors', value: stats?.instructors || 0, color: 'text-blue-500' },
    { icon: FiUserCheck, label: 'Students', value: stats?.students || 0, color: 'text-green-500' },
    { icon: FiBook, label: 'Courses', value: stats?.courses || 0, color: 'text-purple-500' },
    { icon: FiHome, label: 'Rooms', value: stats?.rooms || 0, color: 'text-yellow-500' },
    { icon: FiCalendar, label: 'Scheduled Classes', value: stats?.scheduledClasses || 0, color: 'text-indigo-500' },
    { icon: FiActivity, label: 'Pending Approvals', value: stats?.pendingApprovals || 0, color: 'text-red-500' },
  ];

  const quickActions = [
    { href: '/admin/instructors', label: 'Add Instructor', icon: FiUsers },
    { href: '/admin/courses', label: 'Add Course', icon: FiBook },
    { href: '/admin/rooms', label: 'Add Room', icon: FiHome },
    { href: '/admin/timetable', label: 'Generate Timetable', icon: FiCalendar },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
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
                  <Link href={action.href}>
                    <Card className="hover:bg-muted transition-colors">
                      <CardContent className="flex flex-col items-center justify-center space-y-3 pt-6">
                        <Icon className="h-8 w-8 text-primary" />
                        <p className="font-semibold">{action.label}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">System initialized</p>
                  <p className="text-sm text-muted-foreground">Ready to manage timetables</p>
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
