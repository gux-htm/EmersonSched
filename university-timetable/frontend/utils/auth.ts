import { User } from '@/types';

// Token management
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

// User management
export const setUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const removeUser = (): void => {
  localStorage.removeItem('user');
};

// Auth state management
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.role === 'admin';
};

export const isInstructor = (): boolean => {
  const user = getUser();
  return user?.role === 'instructor';
};

export const isStudent = (): boolean => {
  const user = getUser();
  return user?.role === 'student';
};

export const isApproved = (): boolean => {
  const user = getUser();
  return user?.status === 'approved';
};

// Logout
export const logout = (): void => {
  removeToken();
  removeUser();
  window.location.href = '/login';
};

// Role-based access control
export const hasRole = (roles: string[]): boolean => {
  const user = getUser();
  return user ? roles.includes(user.role) : false;
};

export const canAccess = (requiredRole: string): boolean => {
  const user = getUser();
  if (!user || user.status !== 'approved') return false;
  
  switch (requiredRole) {
    case 'admin':
      return user.role === 'admin';
    case 'instructor':
      return user.role === 'admin' || user.role === 'instructor';
    case 'student':
      return true; // All approved users can access student features
    default:
      return false;
  }
};

// Route protection
export const getRedirectPath = (user: User | null): string => {
  if (!user) return '/login';
  
  if (user.status !== 'approved') {
    return '/pending-approval';
  }
  
  switch (user.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'instructor':
      return '/instructor/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/login';
  }
};

// Form validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
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
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format helpers
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (time: string): string => {
  return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Status helpers
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'approved':
    case 'active':
    case 'accepted':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
    case 'cancelled':
      return 'error';
    default:
      return 'secondary';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'pending':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    case 'active':
      return 'Active';
    case 'accepted':
      return 'Accepted';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

// Role helpers
export const getRoleText = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'instructor':
      return 'Instructor';
    case 'student':
      return 'Student';
    default:
      return role;
  }
};

export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'error';
    case 'instructor':
      return 'primary';
    case 'student':
      return 'success';
    default:
      return 'secondary';
  }
};