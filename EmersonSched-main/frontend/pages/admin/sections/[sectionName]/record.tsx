import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { adminAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function SectionRecord() {
  const router = useRouter();
  const { sectionName } = router.query;
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);

  useEffect(() => {
    if (sectionName) {
      const fetchRecord = async () => {
        try {
          const res = await adminAPI.getSectionRecord(sectionName as string);
          setRecord(res.data);
        } catch (error) {
          toast.error('Failed to fetch section record');
        } finally {
          setLoading(false);
        }
      };
      fetchRecord();
    }
  }, [sectionName]);

  if (loading) return <Layout><div className="spinner"></div></Layout>;
  if (!record) return <Layout><p>No record found.</p></Layout>;

  return (
    <Layout>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Academic Record for {record.section.name}</h2>
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">Section Details</h3>
          <p><strong>Major:</strong> {record.section.major}</p>
          <p><strong>Current Semester:</strong> {record.section.currentSemester} / {record.section.totalSemesters}</p>
          <p><strong>Students:</strong> {record.section.studentCount}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-green-500">Completed Courses</h3>
            <div className="space-y-2">
              {record.completedCourses.map((semester: any) => (
                <details key={semester.semester} className="collapse collapse-arrow border rounded-box">
                  <summary className="collapse-title text-lg font-medium">
                    Semester {semester.semester}
                  </summary>
                  <div className="collapse-content">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Course</th>
                          <th>Credits</th>
                          <th>Instructor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semester.courses.map((course: any) => (
                          <tr key={course.courseCode}>
                            <td>{course.courseCode}</td>
                            <td>{course.courseName}</td>
                            <td>{course.creditHours}</td>
                            <td>{course.instructor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2 text-yellow-500">Pending Courses</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course</th>
                    <th>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {record.pendingCourses.map((course: any) => (
                    <tr key={course.courseCode}>
                      <td>{course.courseCode}</td>
                      <td>{course.courseName}</td>
                      <td>{course.creditHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
