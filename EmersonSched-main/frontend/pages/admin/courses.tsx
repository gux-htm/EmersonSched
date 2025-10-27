import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus } from 'react-icons/fi';

export default function Courses() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  
  const [courseForm, setCourseForm] = useState({
    major_id: '',
    name: '',
    code: '',
    credit_hours: '3+0',
    semester: 1,
    type: 'theory',
  });

  const [sectionForm, setSectionForm] = useState({
    major_id: '',
    name: '',
    semester: 1,
    student_strength: 50,
    shift: 'morning',
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAdmin, router]);

  const loadData = async () => {
    try {
      const [coursesRes, majorsRes, sectionsRes] = await Promise.all([
        adminAPI.getCourses(),
        adminAPI.getMajors(),
        adminAPI.getSections(),
      ]);
      setCourses(coursesRes.data.courses);
      setMajors(majorsRes.data.majors);
      setSections(sectionsRes.data.sections);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createCourse(courseForm);
      toast.success('Course created successfully');
      setShowCourseForm(false);
      setCourseForm({ major_id: '', name: '', code: '', credit_hours: '3+0', semester: 1, type: 'theory' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create course');
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createSection(sectionForm);
      toast.success('Section created successfully');
      setShowSectionForm(false);
      setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create section');
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

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Courses & Sections</h1>

        {/* Courses Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Courses</h2>
            <button
              onClick={() => setShowCourseForm(!showCourseForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiPlus /> <span>Add Course</span>
            </button>
          </div>

          {showCourseForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleCourseSubmit}
              className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label">Major</label>
                  <select
                    value={courseForm.major_id}
                    onChange={(e) => setCourseForm({ ...courseForm, major_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select Major</option>
                    {majors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name} ({major.program_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Course Name</label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="input"
                    placeholder="Data Structures"
                    required
                  />
                </div>
                <div>
                  <label className="label">Course Code</label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="input"
                    placeholder="CS201"
                    required
                  />
                </div>
                <div>
                  <label className="label">Credit Hours</label>
                  <select
                    value={courseForm.credit_hours}
                    onChange={(e) => setCourseForm({ ...courseForm, credit_hours: e.target.value })}
                    className="input"
                  >
                    <option value="2+0">2+0 (Theory only)</option>
                    <option value="3+0">3+0 (Theory only)</option>
                    <option value="2+1">2+1 (Theory + Lab)</option>
                    <option value="3+1">3+1 (Theory + Lab)</option>
                    <option value="0+1">0+1 (Lab only)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Semester</label>
                  <input
                    type="number"
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({ ...courseForm, semester: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                    max="8"
                    required
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={courseForm.type}
                    onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                    className="input"
                  >
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">Create Course</button>
                <button type="button" onClick={() => setShowCourseForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Major</th>
                  <th>Credit Hours</th>
                  <th>Semester</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="font-medium">{course.code}</td>
                    <td>{course.name}</td>
                    <td>{course.major_name}</td>
                    <td>{course.credit_hours}</td>
                    <td>{course.semester}</td>
                    <td className="capitalize">
                      <span className="badge badge-info">{course.type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sections Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Sections</h2>
            <button
              onClick={() => setShowSectionForm(!showSectionForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiPlus /> <span>Add Section</span>
            </button>
          </div>

          {showSectionForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSectionSubmit}
              className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">Major</label>
                  <select
                    value={sectionForm.major_id}
                    onChange={(e) => setSectionForm({ ...sectionForm, major_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select Major</option>
                    {majors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section Name</label>
                  <input
                    type="text"
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                    className="input"
                    placeholder="A"
                    required
                  />
                </div>
                <div>
                  <label className="label">Semester</label>
                  <input
                    type="number"
                    value={sectionForm.semester}
                    onChange={(e) => setSectionForm({ ...sectionForm, semester: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                    max="8"
                    required
                  />
                </div>
                <div>
                  <label className="label">Student Strength</label>
                  <input
                    type="number"
                    value={sectionForm.student_strength}
                    onChange={(e) => setSectionForm({ ...sectionForm, student_strength: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Shift</label>
                  <select
                    value={sectionForm.shift}
                    onChange={(e) => setSectionForm({ ...sectionForm, shift: e.target.value })}
                    className="input"
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="weekend">Weekend</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">Create Section</button>
                <button type="button" onClick={() => setShowSectionForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Major</th>
                  <th>Semester</th>
                  <th>Students</th>
                  <th>Shift</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.id}>
                    <td className="font-medium">{section.name}</td>
                    <td>{section.major_name}</td>
                    <td>{section.semester}</td>
                    <td>{section.student_strength}</td>
                    <td className="capitalize">{section.shift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}