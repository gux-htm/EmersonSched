import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiUser } from 'react-icons/fi';

export default function Instructors() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadInstructors();
  }, [isAdmin, router]);

  const loadInstructors = async () => {
    try {
      const response = await adminAPI.getInstructors();
      setInstructors(response.data.instructors);
    } catch (error) {
      console.error('Failed to load instructors:', error);
      toast.error('Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  // Helper: safely extract metadata as object
  const parseMetadata = (metadata: any) => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Instructors</h1>
            <p className="text-gray-600 mt-1">{instructors.length} approved instructor(s)</p>
          </div>
        </div>

        {instructors.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No instructors registered yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Instructors need to register and be approved first
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((instructor, index) => {
              const metadata = parseMetadata(instructor.metadata);
              return (
                <motion.div
                  key={instructor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card"
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary p-3 rounded-full text-white">
                        <FiUser size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{instructor.name}</h3>
                        <span className="badge badge-success text-xs">Instructor</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FiMail size={16} />
                      <span>{instructor.email}</span>
                    </div>

                    {instructor.department && (
                      <div>
                        <p className="text-xs text-gray-600">Department</p>
                        <p className="font-medium text-gray-900">{instructor.department}</p>
                      </div>
                    )}

                    {metadata && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600 mb-1">Specialization</p>
                        <p className="text-sm text-gray-900">
                          {metadata.specialization || 'Not specified'}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
