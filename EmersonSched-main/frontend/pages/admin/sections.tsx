import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiChevronsRight, FiCornerRightUp, FiBookOpen } from 'react-icons/fi';

export default function Sections() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sectionPage, setSectionPage] = useState(1);
  const [sectionLimit, setSectionLimit] = useState(10);
  const [sectionTotalPages, setSectionTotalPages] = useState(1);
  const [sectionTotalRecords, setSectionTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [showAssignCoursesModal, setShowAssignCoursesModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [newSemester, setNewSemester] = useState<number>(0);

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
    loadInitialData();
  }, [isAdmin, router]);

  const loadInitialData = async () => {
    try {
      const [majorsRes, coursesRes] = await Promise.all([
        adminAPI.getMajors(),
        adminAPI.getCourses(),
      ]);
      setMajors(majorsRes.data.majors);
      setCourses(coursesRes.data.data);
      loadSections();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
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

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await adminAPI.updateSection(editingSection.id, sectionForm);
        toast.success('Section updated successfully');
      } else {
        await adminAPI.createSection(sectionForm);
        toast.success('Section created successfully');
      }
      setShowSectionForm(false);
      setEditingSection(null);
      setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning' });
      loadSections();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save section');
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

  const handleDeleteSection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await adminAPI.deleteSection(id);
      toast.success('Section deleted successfully');
      loadSections();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete section');
    }
  };

  const handleAssignCourses = async () => {
    if (!selectedSection) return;
    try {
      await adminAPI.assignCoursesToSection(selectedSection.id, {
        course_ids: selectedCourses,
        semester: selectedSection.semester,
        intake: '2025', // This should be dynamic
        shift: selectedSection.shift,
        academic_year: '2025-2026', // This should be dynamic
      });
      toast.success('Courses assigned successfully');
      setShowAssignCoursesModal(false);
      setSelectedCourses([]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign courses');
    }
  };

  const handlePromote = async () => {
    if (!selectedSection) return;
    try {
        await adminAPI.promoteSection(selectedSection.id, {
            new_semester: newSemester,
            promote_courses: true,
        });
        toast.success('Section promoted successfully');
        setShowPromoteModal(false);
        loadSections();
    } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to promote section');
    }
  };

  useEffect(() => {
    loadSections();
  }, [sectionPage, sectionLimit]);

  if (loading) return <Layout><div className="spinner"></div></Layout>;

  return (
    <Layout>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Sections</h2>
            <button onClick={() => setShowSectionForm(true)} className="btn btn-primary"><FiPlus /> Add Section</button>
          </div>

          {showSectionForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSectionSubmit}
              className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4"
            >
              {/* Section form fields */}
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
                        <button onClick={() => handleEditSection(section)} className="btn btn-sm"><FiEdit /></button>
                        <button onClick={() => handleDeleteSection(section.id)} className="btn btn-sm btn-error"><FiTrash2 /></button>
                        <button onClick={() => { setSelectedSection(section); setShowAssignCoursesModal(true); }} className="btn btn-secondary btn-sm flex items-center space-x-1" title="Assign Courses">
                          <FiChevronsRight size={14} /> <span>Assign Courses</span>
                        </button>
                        <button onClick={() => { setSelectedSection(section); setNewSemester(section.semester + 1); setShowPromoteModal(true); }} className="btn btn-secondary btn-sm flex items-center space-x-1" title="Promote Section">
                          <FiCornerRightUp size={14} /> <span>Promote</span>
                        </button>
                        <button onClick={() => router.push(`/admin/sections/${section.name}/record`)} className="btn btn-info btn-sm flex items-center space-x-1" title="View Record">
                          <FiBookOpen size={14} /> <span>View Record</span>
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

        {showAssignCoursesModal && (
            <div className="modal modal-open">
                <div className="modal-box w-11/12 max-w-5xl">
                    <h3 className="font-bold text-lg">Assign Courses to {selectedSection?.name}</h3>
                    <div className="py-4">
                        <select multiple value={selectedCourses} onChange={e => setSelectedCourses(Array.from(e.target.selectedOptions, option => option.value))} className="input h-64">
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="modal-action">
                        <button onClick={handleAssignCourses} className="btn btn-primary">Assign</button>
                        <button onClick={() => setShowAssignCoursesModal(false)} className="btn">Cancel</button>
                    </div>
                </div>
            </div>
        )}

        {showPromoteModal && (
            <div className="modal modal-open">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Promote {selectedSection?.name} to Semester {newSemester}?</h3>
                    <p className="py-4">This will copy the current course offerings to the new semester.</p>
                    <div className="modal-action">
                        <button onClick={handlePromote} className="btn btn-primary">Promote</button>
                        <button onClick={() => setShowPromoteModal(false)} className="btn">Cancel</button>
                    </div>
                </div>
            </div>
        )}
    </Layout>
  );
}