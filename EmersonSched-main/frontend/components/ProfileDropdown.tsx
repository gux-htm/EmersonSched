import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FiUser, FiEdit, FiLogOut } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 cursor-pointer"
      >
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <img
          src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`}
          alt="User Avatar"
          className="w-10 h-10 rounded-full"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 z-20 border"
          >
            <Link
              href="/profile"
              className={cn(
                'flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted'
              )}
            >
              <FiUser className="mr-3" /> View Profile
            </Link>
            <Link
              href="/update-password"
              className={cn(
                'flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted'
              )}
            >
              <FiEdit className="mr-3" /> Update Password
            </Link>
            <button
              onClick={logout}
              className={cn(
                'flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted'
              )}
            >
              <FiLogOut className="mr-3" /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
