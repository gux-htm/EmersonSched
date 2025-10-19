'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminAPI, timetableAPI, instructorAPI, studentAPI } from '@/lib/api';
import Layout from '@/components/Layout/Layout';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserCheck,
  GraduationCap,
  Building,
  Settings
} from 'lucide-react';

interface DashboardStats {
  instructors: number;
  students: number;
  courses: number;
  rooms: number;
  pendingRequests: number;
  scheduledBlocks: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (user?.role === 'admin') {
          const response = await adminAPI.getDashboard();
          if (response.data.success) {
            setStats(response.data.data);
          }
        } else if (user?.role === 'instructor') {
          // For instructors, we can show their specific stats
          const [requestsResponse, timetableResponse] = await Promise.all([
            instructorAPI.getCourseRequests({ status: 'pending' }),
            instructorAPI.getTimetable()
          ]);
          
          setStats({
            instructors: 0,
            students: 0,
            courses: requestsResponse.data.data?.length || 0,
            rooms: 0,
            pendingRequests: requestsResponse.data.data?.filter((r: any) => r.status === 'pending').length || 0,
            scheduledBlocks: timetableResponse.data.data?.length || 0
          });
        } else if (user?.role === 'student') {
          // For students, show their timetable and exam stats
          const [timetableResponse, examsResponse] = await Promise.all([
            studentAPI.getTimetable(),
            studentAPI.getExams()
          ]);
          
          setStats({
            instructors: 0,
            students: 0,
            courses: timetableResponse.data.data?.length || 0,
            rooms: 0,
            pendingRequests: 0,
            scheduledBlocks: timetableResponse.data.data?.length || 0
          });
        }
      } catch (err: any) {
        console.error('Dashboard error:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const getRoleBasedContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'admin':
        return (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 transform hover:-translate-y-1">
                  <Users className="w-6 h-6 mb-2" />
                  <p className="font-medium">Add Teacher</p>
                </button>
                <button className="p-4 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-lg hover:from-success-600 hover:to-success-700 transition-all duration-200 transform hover:-translate-y-1">
                  <Building className="w-6 h-6 mb-2" />
                  <p className="font-medium">Add Room</p>
                </button>
                <button className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:-translate-y-1">
                  <Calendar className="w-6 h-6 mb-2" />
                  <p className="font-medium">Generate Schedule</p>
                </button>
                <button className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:-translate-y-1">
                  <Settings className="w-6 h-6 mb-2" />
                  <p className="font-medium">Settings</p>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Timetable generated successfully</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <UserCheck className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">New instructor approved</p>
                    <p className="text-xs text-gray-500">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-warning-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Room conflict detected</p>
                    <p className="text-xs text-gray-500">6 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'instructor':
        return (
          <div className="space-y-8">
            {/* Course Requests */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Requests</h3>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending course requests</p>
                <p className="text-sm text-gray-500">Course requests will appear here when generated by admin</p>
              </div>
            </div>

            {/* My Schedule */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Schedule</h3>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No classes scheduled</p>
                <p className="text-sm text-gray-500">Your schedule will appear here once timetable is generated</p>
              </div>
            </div>
          </div>
        );

      case 'student':
        return (
          <div className="space-y-8">
            {/* My Timetable */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Timetable</h3>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No timetable available</p>
                <p className="text-sm text-gray-500">Your timetable will appear here once generated</p>
              </div>
            </div>

            {/* Upcoming Exams */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams</h3>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No exams scheduled</p>
                <p className="text-sm text-gray-500">Exam schedule will appear here when available</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your {user?.role === 'admin' ? 'university' : 'academic'} schedule today.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Instructors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.instructors}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-success-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.students}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.courses}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Building className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rooms</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rooms}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role-specific Content */}
        {getRoleBasedContent()}
      </div>
    </Layout>
  );
};

export default DashboardPage;