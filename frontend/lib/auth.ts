import { authAPI } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  isSuperAdmin?: boolean;
  metadata: any;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Auth context type
export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

// Auth storage keys
const TOKEN_KEY = 'emerson_sched_token';
const USER_KEY = 'emerson_sched_user';

// Get stored auth data
export const getStoredAuth = (): { token: string | null; user: User | null } => {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  const user = userStr ? JSON.parse(userStr) : null;

  return { token, user };
};

// Store auth data
export const storeAuth = (token: string, user: User): void => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Clear auth data
export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Check if user has required role
export const hasRole = (user: User | null, requiredRoles: string[]): boolean => {
  if (!user) return false;
  return requiredRoles.includes(user.role);
};

// Check if user is admin
export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, ['admin']);
};

// Check if user is instructor
export const isInstructor = (user: User | null): boolean => {
  return hasRole(user, ['instructor']);
};

// Check if user is student
export const isStudent = (user: User | null): boolean => {
  return hasRole(user, ['student']);
};

// Check if user is super admin
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.isSuperAdmin || false;
};

// Format user display name
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'Guest';
  return user.name || user.email;
};

// Get user initials
export const getUserInitials = (user: User | null): string => {
  if (!user) return 'G';
  return user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format role display name
export const formatRole = (role: string): string => {
  const roleMap: { [key: string]: string } = {
    admin: 'Administrator',
    instructor: 'Instructor',
    student: 'Student'
  };
  
  return roleMap[role] || role;
};

// Get role color
export const getRoleColor = (role: string): string => {
  const colorMap: { [key: string]: string } = {
    admin: 'bg-purple-100 text-purple-800',
    instructor: 'bg-blue-100 text-blue-800',
    student: 'bg-green-100 text-green-800'
  };
  
  return colorMap[role] || 'bg-gray-100 text-gray-800';
};