import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

export default function Courses() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  // Pagination state for courses
  const [coursePage, setCoursePage] = useState(1);
  const [courseLimit, setCourseLimit] = useState(10);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [courseTotalRecords, setCourseTotalRecords] = useState(0);
  // Pagination state for sections
  const [sectionPage, setSectionPage] = useState(1);
  const [sectionLimit, setSectionLimit] = useState(10);
  const [sectionTotalPages, setSectionTotalPages] = useState(1);
  const [sectionTotalRecords, setSectionTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  
  // Filter states - using empty string for "no selection" to enforce strict dependency chain
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  
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

  // Reset dependent filters when parent changes (no automatic API calls)
  useEffect(() => {
    // When program is cleared or changed, reset major and semester
    if (!selectedProgram) {
      setSelectedMajor('');
      setSelectedSemester('');
    }
  }, [selectedProgram]);

  useEffect(() => {
    // When major is cleared or changed, reset semester
    if (!selectedMajor) {
      setSelectedSemester('');
    }
  }, [selectedMajor]);

  const loadData = async () => {
    try {
      const [programsRes, majorsRes, sectionsRes] = await Promise.all([
        adminAPI.getPrograms(),
        adminAPI.getMajors(),
        adminAPI.getSections({ page: sectionPage, limit: sectionLimit }),
      ]);
      setPrograms(programsRes.data.programs);
      setMajors(majorsRes.data.majors);
      setSections(sectionsRes.data.data);
      setSectionTotalPages(sectionsRes.data.totalPages);
      setSectionTotalRecords(sectionsRes.data.totalRecords);
      
      // Load courses without filters initially
      const coursesRes = await adminAPI.getCourses({ page: coursePage, limit: courseLimit });
      setCourses(coursesRes.data.data);
      setCourseTotalPages(coursesRes.data.totalPages);
      setCourseTotalRecords(coursesRes.data.totalRecords);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Load filtered courses from backend
  const loadFilteredCourses = async (params: { program?: string; major?: string; semester?: string }) => {
    try {
      const coursesRes = await adminAPI.getCourses({ ...params, page: coursePage, limit: courseLimit });
      setCourses(coursesRes.data.data);
      setCourseTotalPages(coursesRes.data.totalPages);
      setCourseTotalRecords(coursesRes.data.totalRecords);
    } catch (error) {
      console.error('Failed to load filtered courses:', error);
      toast.error('Failed to load filtered courses');
    }
  };

  // Load sections (with optional filters) for current page
  const loadSectionsPage = async (params: { major_id?: string; semester?: string; shift?: string } = {}) => {
    try {
      const sectionsRes = await adminAPI.getSections({ ...params, page: sectionPage, limit: sectionLimit });
      setSections(sectionsRes.data.data);
      setSectionTotalPages(sectionsRes.data.totalPages);
      setSectionTotalRecords(sectionsRes.data.totalRecords);
    } catch (error) {
      console.error('Failed to load sections:', error);
      toast.error('Failed to load sections');
    }
  };

  // Load majors filtered by program
  const loadMajorsByProgram = async (programName: string) => {
    setLoadingMajors(true);
    try {
      // Find the program ID by name from our programs state
      const program = programs.find((p: any) => p.name === programName);
      
      if (program) {
        const majorsRes = await adminAPI.getMajors(program.id);
        setMajors(majorsRes.data.majors);
      } else {
        // If no program selected, load all majors
        const majorsRes = await adminAPI.getMajors();
        setMajors(majorsRes.data.majors);
      }
    } catch (error) {
      console.error('Failed to load majors by program:', error);
      toast.error('Failed to load majors');
    } finally {
      setLoadingMajors(false);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await handleUpdateCourse(e);
        return;
      }
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
      if (editingSection) {
        await handleUpdateSection(e);
        return;
      }
      await adminAPI.createSection(sectionForm);
      toast.success('Section created successfully');
      setShowSectionForm(false);
      setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create section');
    }
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setCourseForm({
      major_id: course.major_id || '',
      name: course.name,
      code: course.code,
      credit_hours: course.credit_hours,
      semester: course.semester,
      type: course.type,
    });
    setShowCourseForm(true);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      await adminAPI.updateCourse(editingCourse.id, {
        name: courseForm.name,
        code: courseForm.code,
        credit_hours: courseForm.credit_hours,
        type: courseForm.type,
      });
      toast.success('Course updated successfully');
      setEditingCourse(null);
      setShowCourseForm(false);
      setCourseForm({ major_id: '', name: '', code: '', credit_hours: '3+0', semester: 1, type: 'theory' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteCourse(id);
      toast.success('Course deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete course');
    }
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      major_id: section.major_id,
      name: section.name,
      semester: section.semester,
      student_strength: section.student_strength,
      shift: section.shift,
    });
    setShowSectionForm(true);
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    try {
      await adminAPI.updateSection(editingSection.id, sectionForm);
      toast.success('Section updated successfully');
      setEditingSection(null);
      setShowSectionForm(false);
      setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update section');
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteSection(id);
      toast.success('Section deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete section');
    }
  };

  // Filter courses with strict dependency chain: Program → Major → Semester
  // NOTE: This hook MUST be called before any conditional returns to follow Rules of Hooks
  // Now using backend-filtered results, so we just return the courses as they come from API
  const filteredCourses = useMemo(() => {
    const ids = courses.map(c => c.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.warn('Duplicate course IDs found:', duplicateIds);
    }
    return courses;
  }, [courses]);

  // Dynamic dropdown options based on progressive filtering
  
  // All available programs from programs state
  const availablePrograms = programs.map((p: any) => p.name).sort();
  
  // Available majors: from majors state (already filtered by program if selected)
  const availableMajors = majors.map((m: any) => m.name).sort();
  
  // Available semesters: only those in the selected program + major combination (empty if no major selected)
  const availableSemesters = useMemo(() => {
    if (!selectedProgram || !selectedMajor) return [];

    const semesterValues = courses
      .filter(course => 
        course.program_name === selectedProgram && 
        course.major_name === selectedMajor
      )
      .map(c => c.semester)
      .filter(Boolean);

    return [...new Set(semesterValues)].sort((a, b) => a - b);
  }, [courses, selectedProgram, selectedMajor]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  // Handle program change - no automatic filtering
  const handleProgramChange = (value: string) => {
    setSelectedProgram(value);
    // Load majors for the selected program only
    loadMajorsByProgram(value);
  };

  // Handle major change - no automatic filtering
  const handleMajorChange = (value: string) => {
    setSelectedMajor(value);
  };

  // Handle semester change - no automatic filtering
  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);
  };

  // Apply filters - single API call with current selections
  const handleApplyFilters = () => {
    // Reset to first page when filters change
    setCoursePage(1);
    const params: { program?: string; major?: string; semester?: string } = {};
    if (selectedProgram) params.program = selectedProgram;
    if (selectedMajor) params.major = selectedMajor;
    if (selectedSemester) params.semester = selectedSemester;
    
    loadFilteredCourses(params);
  };

  // Reset all filters and reload all courses
  const handleResetFilters = () => {
    setSelectedProgram('');
    setSelectedMajor('');
    setSelectedSemester('');
    setCoursePage(1);
    
    // Load all courses
    loadFilteredCourses({});
  };

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

          {/* Filter Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap items-center gap-4">
              {/* Program Filter - Must be selected first */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Program</option>
                  {availablePrograms.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>

              {/* Major Filter - Disabled until Program is selected */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Major
                </label>
                <select
                  value={selectedMajor}
                  onChange={(e) => handleMajorChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                  disabled={!selectedProgram || loadingMajors}
                >
                  <option value="">
                    {!selectedProgram ? 'Select Program First' : loadingMajors ? 'Loading...' : 'All Majors'}
                  </option>
                  {availableMajors.map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester Filter - Disabled until Major is selected */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                  disabled={!selectedMajor}
                >
                  <option value="">
                    {!selectedMajor ? 'Select Major First' : 'All Semesters'}
                  </option>
                  {availableSemesters.map((semester) => (
                    <option key={semester} value={semester.toString()}>
                      {semester}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply Button */}
              <div className="flex items-end">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Apply Filters
                </button>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedProgram && !selectedMajor && !selectedSemester}
                >
                  Reset Filters
                </button>
              </div>
            </div>
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
                <button type="submit" className="btn btn-primary">
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCourseForm(false);
                    setEditingCourse(null);
                    setCourseForm({ major_id: '', name: '', code: '', credit_hours: '3+0', semester: 1, type: 'theory' });
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            {filteredCourses.length === 0 && (selectedProgram || selectedMajor || selectedSemester) ? (
              <div className="text-center py-8 text-gray-600">
                <p className="text-lg">No courses found for the selected criteria.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Reset filters to see all courses
                </button>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Program</th>
                    <th>Major</th>
                    <th>Credit Hours</th>
                    <th>Semester</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id.toString()}>
                      <td className="font-medium">{course.code}</td>
                      <td>{course.name}</td>
                      <td>{course.program_names || course.program_name || 'N/A'}</td>
                      <td>{course.major_names || course.major_name}</td>
                      <td>{course.credit_hours}</td>
                      <td>{course.semester ?? course.semesters}</td>
                      <td className="capitalize">
                        <span className="badge badge-info">{course.type}</span>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditCourse(course)}
                            className="btn btn-secondary btn-sm flex items-center space-x-1"
                            title="Edit Course"
                          >
                            <FiEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="btn btn-error btn-sm flex items-center space-x-1"
                            title="Delete Course"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Courses Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">Showing page {coursePage} of {courseTotalPages} ({courseTotalRecords} total)</div>
              <div className="flex items-center gap-2 text-sm">
                <span>Per page:</span>
                <select
                  value={courseLimit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setCourseLimit(newLimit);
                    setCoursePage(1);
                    const params: { program?: string; major?: string; semester?: string } = {};
                    if (selectedProgram) params.program = selectedProgram;
                    if (selectedMajor) params.major = selectedMajor;
                    if (selectedSemester) params.semester = selectedSemester;
                    adminAPI.getCourses({ ...params, page: 1, limit: newLimit }).then((res) => {
                      setCourses(res.data.data);
                      setCourseTotalPages(res.data.totalPages);
                      setCourseTotalRecords(res.data.totalRecords);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={coursePage <= 1}
                onClick={() => {
                  if (coursePage <= 1) return;
                  const nextPage = coursePage - 1;
                  setCoursePage(nextPage);
                  const params: { program?: string; major?: string; semester?: string } = {};
                  if (selectedProgram) params.program = selectedProgram;
                  if (selectedMajor) params.major = selectedMajor;
                  if (selectedSemester) params.semester = selectedSemester;
                  adminAPI.getCourses({ ...params, page: nextPage, limit: courseLimit }).then((res) => {
                    setCourses(res.data.data);
                    setCourseTotalPages(res.data.totalPages);
                    setCourseTotalRecords(res.data.totalRecords);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  });
                }}
              >
                ← Previous
              </button>
              {Array.from({ length: courseTotalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`btn btn-sm ${num === coursePage ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setCoursePage(num);
                    const params: { program?: string; major?: string; semester?: string } = {};
                    if (selectedProgram) params.program = selectedProgram;
                    if (selectedMajor) params.major = selectedMajor;
                    if (selectedSemester) params.semester = selectedSemester;
                    adminAPI.getCourses({ ...params, page: num, limit: courseLimit }).then((res) => {
                      setCourses(res.data.data);
                      setCourseTotalPages(res.data.totalPages);
                      setCourseTotalRecords(res.data.totalRecords);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                disabled={coursePage >= courseTotalPages}
                onClick={() => {
                  if (coursePage >= courseTotalPages) return;
                  const nextPage = coursePage + 1;
                  setCoursePage(nextPage);
                  const params: { program?: string; major?: string; semester?: string } = {};
                  if (selectedProgram) params.program = selectedProgram;
                  if (selectedMajor) params.major = selectedMajor;
                  if (selectedSemester) params.semester = selectedSemester;
                  adminAPI.getCourses({ ...params, page: nextPage, limit: courseLimit }).then((res) => {
                    setCourses(res.data.data);
                    setCourseTotalPages(res.data.totalPages);
                    setCourseTotalRecords(res.data.totalRecords);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  });
                }}
              >
                Next →
              </button>
            </div>
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
                <button type="submit" className="btn btn-primary">
                  {editingSection ? 'Update Section' : 'Create Section'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowSectionForm(false);
                    setEditingSection(null);
                    setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning' });
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
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
                        <button
                          onClick={() => handleEditSection(section)}
                          className="btn btn-secondary btn-sm flex items-center space-x-1"
                          title="Edit Section"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="btn btn-error btn-sm flex items-center space-x-1"
                          title="Delete Section"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Sections Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">Showing page {sectionPage} of {sectionTotalPages} ({sectionTotalRecords} total)</div>
              <div className="flex items-center gap-2 text-sm">
                <span>Per page:</span>
                <select
                  value={sectionLimit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setSectionLimit(newLimit);
                    setSectionPage(1);
                    loadSectionsPage();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={sectionPage <= 1}
                onClick={() => {
                  if (sectionPage <= 1) return;
                  const nextPage = sectionPage - 1;
                  setSectionPage(nextPage);
                  loadSectionsPage();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ← Previous
              </button>
              {Array.from({ length: sectionTotalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  className={`btn btn-sm ${num === sectionPage ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setSectionPage(num);
                    loadSectionsPage();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                disabled={sectionPage >= sectionTotalPages}
                onClick={() => {
                  if (sectionPage >= sectionTotalPages) return;
                  const nextPage = sectionPage + 1;
                  setSectionPage(nextPage);
                  loadSectionsPage();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}