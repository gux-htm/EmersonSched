'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { validateEmail, validatePassword } from '@/utils/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, User, Mail, Lock, Building, BookOpen, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'admin' | 'instructor' | 'student',
    department: '',
    designation: '',
    program: '',
    semester: '',
    section: '',
    specialization: '',
    availability: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && user.status === 'approved') {
      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : 
                          user.role === 'instructor' ? '/instructor/dashboard' : 
                          '/student/dashboard';
      router.push(redirectPath);
    }
  }, [user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'admin') {
      if (!formData.department) {
        newErrors.department = 'Department is required for admin';
      }
      if (!formData.designation) {
        newErrors.designation = 'Designation is required for admin';
      }
    } else if (formData.role === 'instructor') {
      if (!formData.department) {
        newErrors.department = 'Department is required for instructor';
      }
      if (!formData.specialization) {
        newErrors.specialization = 'Specialization is required for instructor';
      }
    } else if (formData.role === 'student') {
      if (!formData.program) {
        newErrors.program = 'Program is required for student';
      }
      if (!formData.semester) {
        newErrors.semester = 'Semester is required for student';
      }
      if (!formData.section) {
        newErrors.section = 'Section is required for student';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'admin' && {
          department: formData.department,
          designation: formData.designation,
        }),
        ...(formData.role === 'instructor' && {
          department: formData.department,
          specialization: formData.specialization,
          availability: formData.availability,
        }),
        ...(formData.role === 'student' && {
          program: formData.program,
          semester: parseInt(formData.semester),
          section: formData.section,
        }),
      };

      await register(registrationData);
      toast.success('Registration successful! Please wait for admin approval.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary-100">
                <GraduationCap className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">
              Join EmersonSched
            </CardTitle>
            <CardDescription className="text-base">
              Create your account to access the university timetable system
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Full Name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-secondary-400 hover:text-secondary-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                <div>
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-secondary-400 hover:text-secondary-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="label">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Role-specific fields */}
              {formData.role === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Department"
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    error={errors.department}
                    placeholder="Enter department"
                    required
                  />
                  <Input
                    label="Designation"
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    error={errors.designation}
                    placeholder="Enter designation"
                    required
                  />
                </div>
              )}

              {formData.role === 'instructor' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Department"
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    error={errors.department}
                    placeholder="Enter department"
                    required
                  />
                  <Input
                    label="Specialization"
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    error={errors.specialization}
                    placeholder="Enter specialization"
                    required
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Availability"
                      type="text"
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                      placeholder="e.g., Monday-Friday 9AM-5PM"
                    />
                  </div>
                </div>
              )}

              {formData.role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Program"
                    type="text"
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                    error={errors.program}
                    placeholder="e.g., BS Computer Science"
                    required
                  />
                  <Input
                    label="Semester"
                    type="number"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    error={errors.semester}
                    placeholder="e.g., 3"
                    min="1"
                    max="20"
                    required
                  />
                  <Input
                    label="Section"
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    error={errors.section}
                    placeholder="e.g., A"
                    required
                  />
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-secondary-500">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in here
              </button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}