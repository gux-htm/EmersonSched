import React, { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiHome, FiUsers, FiBook, FiCalendar, FiSettings, FiMenu, FiX, FiSend } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ProfileDropdown from './ProfileDropdown';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, isInstructor } = useAuth();
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
    { href: '/admin/CourseRequests', icon: FiSend, label: 'Request' },
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
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="bg-card shadow-md fixed w-full z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-foreground hover:text-primary transition-colors"
            >
              {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-primary">🎓 EmersonSched</h1>
          </div>
          <ProfileDropdown />
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
              className="fixed left-0 w-64 h-full bg-card shadow-lg overflow-y-auto"
            >
              <nav className="p-4 space-y-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = router.pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      )}
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
          className={cn(
            'flex-1 transition-all duration-300',
            sidebarOpen ? 'ml-64' : 'ml-0'
          )}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
