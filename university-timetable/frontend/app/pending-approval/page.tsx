'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { Clock, Mail, LogOut, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingApprovalPage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.status === 'approved') {
      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : 
                          user.role === 'instructor' ? '/instructor/dashboard' : 
                          '/student/dashboard';
      router.push(redirectPath);
    }
  }, [user, router]);

  const handleRefresh = async () => {
    try {
      await refreshUser();
      toast.success('Status refreshed');
    } catch (error) {
      toast.error('Failed to refresh status');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-yellow-600">
              Account Pending Approval
            </CardTitle>
            <CardDescription className="text-base">
              Your account is waiting for administrator approval
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Status:</strong> {user.status === 'pending' ? 'Pending Approval' : 'Rejected'}
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  <strong>Role:</strong> {user.role === 'admin' ? 'Administrator' : 
                                        user.role === 'instructor' ? 'Instructor' : 'Student'}
                </p>
                <p className="text-sm text-yellow-700">
                  <strong>Email:</strong> {user.email}
                </p>
              </div>

              {user.status === 'pending' ? (
                <div className="space-y-4">
                  <p className="text-sm text-secondary-600">
                    Your registration has been submitted successfully. An administrator will review your account and approve it soon.
                  </p>
                  
                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                    
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      Your account registration has been rejected. Please contact the administrator for more information.
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleLogout}
                    variant="error"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-secondary-500 space-y-2">
              <p>
                If you have any questions, please contact the system administrator.
              </p>
              <p>
                You can also try refreshing the page to check for status updates.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}