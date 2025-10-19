'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { usersApi, programsApi, coursesApi, roomsApi, timetableApi, examsApi } from '@/utils/api';
import { motion } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Building, 
  Calendar, 
  Clock, 
  GraduationCap,
  UserPlus,
  Plus,
  Settings,
  BarChart3,
  Bell,
  LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  users: {
    total: number;
    byRole: { admin: number; instructor: number; student: number };
    byStatus: { pending: number; approved: number; rejected: number };
  };
  programs: number;
  courses: number;
  rooms: number;
  pendingRequests: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin' || user.status !== 'approved') {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [user, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [usersStats, programs, courses, rooms, pendingRequests] = await Promise.all([
        usersApi.getStats(),
        programsApi.getAll(),
        coursesApi.getAll(),
        roomsApi.getAll(),
        usersApi.getPending()
      ]);

      setStats({
        users: usersStats.data,
        programs: programs.data.length,
        courses: courses.data.length,
        rooms: rooms.data.length,
        pendingRequests: pendingRequests.data.length,
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error-500">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-8 w-8 text-primary-600" />
                <h1 className="text-xl font-bold text-secondary-900">EmersonSched</h1>
              </div>
              <div className="hidden md:block text-sm text-secondary-500">
                Admin Dashboard
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-secondary-600">
            Manage your university timetable system from this dashboard.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Users</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.users.total}</p>
                  </div>
                  <div className="p-3 bg-primary-100 rounded-full">
                    <Users className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <div className="mt-4 flex space-x-4 text-xs text-secondary-500">
                  <span>Admins: {stats.users.byRole.admin}</span>
                  <span>Instructors: {stats.users.byRole.instructor}</span>
                  <span>Students: {stats.users.byRole.student}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/admin/users')}
                    className="w-full"
                  >
                    Review Requests
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Programs</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.programs}</p>
                  </div>
                  <div className="p-3 bg-success-100 rounded-full">
                    <BookOpen className="h-6 w-6 text-success-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/admin/programs')}
                    className="w-full"
                  >
                    Manage Programs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Rooms</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.rooms}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/admin/rooms')}
                    className="w-full"
                  >
                    Manage Rooms
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={() => router.push('/admin/users')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Manage Users</span>
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/courses')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <BookOpen className="h-6 w-6" />
                  <span>Manage Courses</span>
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/timetable')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Calendar className="h-6 w-6" />
                  <span>Generate Timetable</span>
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/exams')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Clock className="h-6 w-6" />
                  <span>Schedule Exams</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {stats.courses}
                  </div>
                  <div className="text-sm text-secondary-600">Total Courses</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-success-600 mb-2">
                    {stats.users.byStatus.approved}
                  </div>
                  <div className="text-sm text-secondary-600">Approved Users</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {stats.users.byStatus.pending}
                  </div>
                  <div className="text-sm text-secondary-600">Pending Approvals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}