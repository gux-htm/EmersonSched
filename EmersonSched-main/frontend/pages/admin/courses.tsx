import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiChevronsRight, FiCornerRightUp } from 'react-icons/fi';

export default function Courses() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [courseLimit, setCourseLimit] = useState(10);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [courseTotalRecords, setCourseTotalRecords] = useState(0);
  const [sectionPage, setSectionPage] = useState(1);
  const [sectionLimit, setSectionLimit] = useState(10);
  const [sectionTotalPages, setSectionTotalPages] = useState(1);
  const [sectionTotalRecords, setSectionTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    credit_hours: '3+0',
    type: 'theory',
    major_ids: [] as string[],
    applies_to_all_programs: false,
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadInitialData();
  }, [isAdmin, router]);

  const loadInitialData = async () => {
    try {
      const [programsRes, majorsRes] = await Promise.all([
        adminAPI.getPrograms(),
        adminAPI.getMajors(),
      ]);
      setPrograms(programsRes.data.programs);
      setMajors(majorsRes.data.majors);
      loadCourses();
      loadSections();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const params = {
        page: coursePage,
        limit: courseLimit,
        program: selectedProgram || undefined,
        major: selectedMajor || undefined,
        search: searchQuery || undefined,
      };
      const coursesRes = await adminAPI.getCourses(params);
      setCourses(coursesRes.data.data);
      setCourseTotalPages(coursesRes.data.totalPages);
      setCourseTotalRecords(coursesRes.data.totalRecords);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadSections = async () => {
    try {
        const sectionsRes = await adminAPI.getSections({ page: sectionPage, limit: sectionLimit });
        setSections(sectionsRes.data.data);
        setSectionTotalPages(sectionsRes.data.totalPages);
        setSectionTotalRecords(sectionsRes.data.totalRecords);
    } catch (error) {
        console.error('Failed to load sections:', error);
        toast.error('Failed to load sections');
    }
  };


  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await adminAPI.updateCourse(editingCourse.id, courseForm);
        toast.success('Course updated successfully');
      } else {
        await adminAPI.createCourse(courseForm);
        toast.success('Course created successfully');
      }
      setShowCourseForm(false);
      setEditingCourse(null);
      setCourseForm({ name: '', code: '', credit_hours: '3+0', type: 'theory', major_ids: [], applies_to_all_programs: false });
      loadCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save course');
    }
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      code: course.code,
      credit_hours: course.credit_hours,
      type: course.type,
      major_ids: majors.filter(m => course.major_names.includes(m.name)).map(m => m.id),
      applies_to_all_programs: false, // This would need more complex logic to determine
    });
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await adminAPI.deleteCourse(id);
      toast.success('Course deleted successfully');
      loadCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete course');
    }
  };
  
  useEffect(() => {
    loadCourses();
  }, [coursePage, courseLimit]);

  const handleFilterChange = () => {
    setCoursePage(1);
    loadCourses();
  };

  if (loading) return <Layout><div className="spinner"></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Course Library & Sections</h1>

        {/* Course Library Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Course Library</h2>
            <button onClick={() => setShowCourseForm(true)} className="btn btn-primary"><FiPlus /> Add Course</button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="input">
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={selectedMajor} onChange={e => setSelectedMajor(e.target.value)} className="input">
              <option value="">All Majors</option>
              {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or code" className="input" />
            <button onClick={handleFilterChange} className="btn btn-secondary">Apply Filters</button>
          </div>

          {showCourseForm && (
            <motion.form onSubmit={handleCourseSubmit} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
              {/* Form fields for creating/editing a course */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Course Name" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} className="input" required />
                <input type="text" placeholder="Course Code" value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} className="input" required />
                <select value={courseForm.credit_hours} onChange={e => setCourseForm({...courseForm, credit_hours: e.target.value})} className="input">
                    <option value="2+0">2+0 (Theory only)</option>
                    <option value="3+0">3+0 (Theory only)</option>
                    <option value="2+1">2+1 (Theory + Lab)</option>
                    <option value="3+1">3+1 (Theory + Lab)</option>
                    <option value="0+1">0+1 (Lab only)</option>
                </select>
                <select value={courseForm.type} onChange={e => setCourseForm({...courseForm, type: e.target.value})} className="input">
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                    <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="label">Majors</label>
                <select multiple value={courseForm.major_ids} onChange={e => setCourseForm({...courseForm, major_ids: Array.from(e.target.selectedOptions, option => option.value)})} className="input h-32">
                  {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="all_programs" checked={courseForm.applies_to_all_programs} onChange={e => setCourseForm({...courseForm, applies_to_all_programs: e.target.checked})} className="mr-2" />
                <label htmlFor="all_programs">Applies to all BS programs</label>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">{editingCourse ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowCourseForm(false); setEditingCourse(null); }} className="btn btn-secondary">Cancel</button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Credit Hours</th>
                  <th>Type</th>
                  <th>Majors</th>
                  <th>Programs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td>{course.code}</td>
                    <td>{course.name}</td>
                    <td>{course.credit_hours}</td>
                    <td>{course.type}</td>
                    <td>{course.major_names}</td>
                    <td>{course.program_names}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditCourse(course)} className="btn btn-sm"><FiEdit /></button>
                        <button onClick={() => handleDeleteCourse(course.id)} className="btn btn-sm btn-error"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination for courses */}
        </div>

        {/* Sections Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Sections</h2>
           <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Major</th>
                  <th>Semester</th>
                  <th>Students</th>
                  <th>Shift</th>
                  <th>Actions</th>
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
                    <td>
                      <div className="flex items-center space-x-2">
                        <button className="btn btn-secondary btn-sm flex items-center space-x-1" title="Assign Courses">
                          <FiChevronsRight size={14} /> <span>Assign Courses</span>
                        </button>
                        <button className="btn btn-secondary btn-sm flex items-center space-x-1" title="Promote Section">
                          <FiCornerRightUp size={14} /> <span>Promote</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination for sections */}
        </div>
      </div>
    </Layout>
  );
}