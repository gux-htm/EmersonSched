import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { 
  GraduationCap, 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [systemStatus, setSystemStatus] = useState<{ initialized: boolean; requiresSetup: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check system status
    const checkSystemStatus = async () => {
      try {
        const response = await api.getSystemStatus();
        if (response.success) {
          setSystemStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to check system status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSystemStatus();
  }, []);

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'instructor':
          router.push('/instructor/dashboard');
          break;
        case 'student':
          router.push('/student/dashboard');
          break;
        default:
          router.push('/login');
      }
    }
  }, [isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-100">
        <div className="spinner"></div>
      </div>
    );
  }

  // If system requires setup, redirect to setup page
  if (systemStatus?.requiresSetup) {
    router.push('/setup');
    return null;
  }

  return (
    <>
      <Head>
        <title>EmersonSched - University Timetable Management System</title>
        <meta name="description" content="Intelligent university timetable management system with automated scheduling, conflict detection, and role-based access control." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">EmersonSched</span>
              </div>
              <div className="flex space-x-4">
                <Link href="/login" className="btn btn-outline">
                  Login
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                  Intelligent University
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
                    {' '}Timetable Management
                  </span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  Automate scheduling, eliminate conflicts, and streamline academic operations with our 
                  advanced Block Theory algorithm and role-based management system.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/register" className="btn btn-primary btn-lg group">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Login to Dashboard
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Powerful Features for Modern Universities
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Everything you need to manage university timetables efficiently and effectively.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="card hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="card-body">
                    <div className="flex items-center mb-4">
                      <div className="p-3 bg-primary-100 rounded-lg">
                        <feature.icon className="h-6 w-6 text-primary-600" />
                      </div>
                      <h3 className="ml-4 text-xl font-semibold text-gray-900">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How EmersonSched Works
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Simple workflow from setup to automated timetable generation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                      {index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-primary-200 -translate-y-0.5"></div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Why Choose EmersonSched?
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Built specifically for universities with complex scheduling needs and multiple stakeholders.
                </p>
                
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="flex items-center"
                    >
                      <CheckCircle className="h-5 w-5 text-success-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl p-8 text-white">
                  <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                  <p className="mb-6 opacity-90">
                    Join universities worldwide using EmersonSched to streamline their academic operations.
                  </p>
                  <Link href="/register" className="btn bg-white text-primary-600 hover:bg-gray-100">
                    Start Free Trial
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">EmersonSched</span>
              </div>
              <p className="text-gray-400 mb-4">
                Intelligent University Timetable Management System
              </p>
              <p className="text-sm text-gray-500">
                © 2024 EmersonSched. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const features = [
  {
    title: 'Automated Scheduling',
    description: 'Advanced Block Theory algorithm automatically generates conflict-free timetables based on instructor preferences and resource availability.',
    icon: Calendar,
  },
  {
    title: 'Role-Based Access',
    description: 'Secure authentication with distinct dashboards for administrators, instructors, and students with appropriate permissions.',
    icon: Shield,
  },
  {
    title: 'Conflict Detection',
    description: 'Real-time validation prevents scheduling conflicts for teachers, rooms, and sections with detailed conflict reporting.',
    icon: Clock,
  },
  {
    title: 'Instructor Workflow',
    description: 'Streamlined course acceptance process with preference selection and 10-second undo functionality.',
    icon: Users,
  },
  {
    title: 'Exam Management',
    description: 'Comprehensive exam scheduling with Match Mode and Shuffle Mode for fair invigilator distribution.',
    icon: BookOpen,
  },
  {
    title: 'Notification System',
    description: 'Automated email notifications for schedule changes, exam updates, and important announcements.',
    icon: CheckCircle,
  },
];

const steps = [
  {
    title: 'System Setup',
    description: 'Configure university settings, programs, majors, courses, and rooms.',
  },
  {
    title: 'Course Requests',
    description: 'Generate course requests and assign instructors to courses.',
  },
  {
    title: 'Instructor Acceptance',
    description: 'Instructors accept courses and set their availability preferences.',
  },
  {
    title: 'Timetable Generation',
    description: 'Automated generation of conflict-free timetables using Block Theory.',
  },
];

const benefits = [
  'Eliminate scheduling conflicts automatically',
  'Reduce administrative workload by 80%',
  'Improve resource utilization efficiency',
  'Real-time notifications and updates',
  'Comprehensive audit trails and reporting',
  'Mobile-responsive design for all devices',
  'Scalable for universities of any size',
  'Export timetables in multiple formats',
];