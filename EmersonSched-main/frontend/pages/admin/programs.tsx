import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

export default function Programs() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showMajorForm, setShowMajorForm] = useState(false);
  
  const [programForm, setProgramForm] = useState({
    name: '',
    code: '',
    system_type: 'semester',
    total_semesters: 8,
    shift: 'morning',
  });

  const [majorForm, setMajorForm] = useState({
    program_id: '',
    name: '',
    code: '',
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
      const [programsRes, majorsRes] = await Promise.all([
        adminAPI.getPrograms(),
        adminAPI.getMajors(),
      ]);
      setPrograms(programsRes.data.programs);
      setMajors(majorsRes.data.majors);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createProgram(programForm);
      toast.success('Program created successfully');
      setShowProgramForm(false);
      setProgramForm({ name: '', code: '', system_type: 'semester', total_semesters: 8, shift: 'morning' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create program');
    }
  };

  const handleMajorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createMajor(majorForm);
      toast.success('Major created successfully');
      setShowMajorForm(false);
      setMajorForm({ program_id: '', name: '', code: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create major');
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Programs & Majors</h1>
        </div>

        {/* Programs Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Programs</h2>
            <button
              onClick={() => setShowProgramForm(!showProgramForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiPlus /> <span>Add Program</span>
            </button>
          </div>

          {showProgramForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleProgramSubmit}
              className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Program Name</label>
                  <input
                    type="text"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    className="input"
                    placeholder="BS Computer Science"
                    required
                  />
                </div>
                <div>
                  <label className="label">Code</label>
                  <input
                    type="text"
                    value={programForm.code}
                    onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                    className="input"
                    placeholder="BSCS"
                    required
                  />
                </div>
                <div>
                  <label className="label">System Type</label>
                  <select
                    value={programForm.system_type}
                    onChange={(e) => setProgramForm({ ...programForm, system_type: e.target.value })}
                    className="input"
                  >
                    <option value="semester">Semester</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Total Semesters</label>
                  <input
                    type="number"
                    value={programForm.total_semesters}
                    onChange={(e) => setProgramForm({ ...programForm, total_semesters: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Shift</label>
                  <select
                    value={programForm.shift}
                    onChange={(e) => setProgramForm({ ...programForm, shift: e.target.value })}
                    className="input"
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="weekend">Weekend</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">Create Program</button>
                <button type="button" onClick={() => setShowProgramForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>System</th>
                  <th>Semesters</th>
                  <th>Shift</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td className="font-medium">{program.name}</td>
                    <td>{program.code}</td>
                    <td className="capitalize">{program.system_type}</td>
                    <td>{program.total_semesters}</td>
                    <td className="capitalize">{program.shift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Majors Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Majors</h2>
            <button
              onClick={() => setShowMajorForm(!showMajorForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiPlus /> <span>Add Major</span>
            </button>
          </div>

          {showMajorForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleMajorSubmit}
              className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Program</label>
                  <select
                    value={majorForm.program_id}
                    onChange={(e) => setMajorForm({ ...majorForm, program_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Major Name</label>
                  <input
                    type="text"
                    value={majorForm.name}
                    onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })}
                    className="input"
                    placeholder="Artificial Intelligence"
                    required
                  />
                </div>
                <div>
                  <label className="label">Code</label>
                  <input
                    type="text"
                    value={majorForm.code}
                    onChange={(e) => setMajorForm({ ...majorForm, code: e.target.value })}
                    className="input"
                    placeholder="AI"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">Create Major</button>
                <button type="button" onClick={() => setShowMajorForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Major Name</th>
                  <th>Code</th>
                  <th>Program</th>
                </tr>
              </thead>
              <tbody>
                {majors.map((major) => (
                  <tr key={major.id}>
                    <td className="font-medium">{major.name}</td>
                    <td>{major.code}</td>
                    <td>{major.program_name}</td>
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
