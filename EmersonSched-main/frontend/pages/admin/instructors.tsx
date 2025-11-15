import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiUser } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

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
        <div>
          <h1 className="text-3xl font-bold">Instructors</h1>
          <p className="text-muted-foreground mt-1">{instructors.length} approved instructor(s)</p>
        </div>

        {instructors.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-muted-foreground text-lg">No instructors registered yet</p>
            <p className="text-muted-foreground text-sm mt-2">
              Instructors need to register and be approved first
            </p>
          </Card>
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
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${instructor.name}&background=random`} />
                          <AvatarFallback>{instructor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{instructor.name}</CardTitle>
                          <Badge>Instructor</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <FiMail size={16} />
                        <span>{instructor.email}</span>
                      </div>
                      {instructor.department && (
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium">{instructor.department}</p>
                        </div>
                      )}
                      {metadata && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Specialization</p>
                          <p className="text-sm">
                            {metadata.specialization || 'Not specified'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
