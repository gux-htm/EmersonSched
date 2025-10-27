import React, { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiHome, FiUsers, FiBook, FiCalendar, FiSettings, FiLogOut, FiMenu, FiX ,FiSend } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAdmin, isInstructor } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return <>{children}</>;
  }

  const adminLinks = [
    { href: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
    { href: '/admin/programs', icon: FiBook, label: 'Programs' },
    { href: '/admin/courses', icon: FiBook, label: 'Courses' },
    { href: '/admin/instructors', icon: FiUsers, label: 'Instructors' },
    { href: '/admin/rooms', icon: FiHome, label: 'Rooms' },
    { href: '/admin/timetable', icon: FiCalendar, label: 'Timetable' },
    { href: '/admin/exams', icon: FiCalendar, label: 'Exams' },
    { href: '/admin/approvals', icon: FiUsers, label: 'Approvals' },
    {href: '/admin/CourseRequests' , icon:FiSend , label :'Reqeust'},
    { href: '/admin/settings', icon: FiSettings, label: 'Settings' },
    
  ];

  const instructorLinks = [
    { href: '/instructor/dashboard', icon: FiHome, label: 'Dashboard' },
    { href: '/instructor/requests', icon: FiBook, label: 'Course Requests' },
    { href: '/instructor/timetable', icon: FiCalendar, label: 'My Timetable' },
  ];

  const studentLinks = [
    { href: '/student/dashboard', icon: FiHome, label: 'Dashboard' },
    { href: '/student/timetable', icon: FiCalendar, label: 'Timetable' },
    { href: '/student/exams', icon: FiCalendar, label: 'Exams' },
  ];

  const links = isAdmin ? adminLinks : isInstructor ? instructorLinks : studentLinks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="bg-white shadow-md fixed w-full z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-primary transition-colors"
            >
              {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-primary">🎓 EmersonSched</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-purple-600 transition-colors"
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed left-0 w-64 h-full bg-white shadow-lg overflow-y-auto"
            >
              <nav className="p-4 space-y-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = router.pathname === link.href;
                  
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
