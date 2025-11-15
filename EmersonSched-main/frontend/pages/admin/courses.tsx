import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiChevronsRight, FiCornerRightUp } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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
      applies_to_all_programs: false,
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

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Course Library & Sections</h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Course Library</CardTitle>
            <Dialog open={showCourseForm} onOpenChange={setShowCourseForm}>
              <DialogTrigger asChild>
                <Button>
                  <FiPlus className="mr-2" /> Add Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseName">Course Name</Label>
                      <Input id="courseName" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="Introduction to AI" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseCode">Course Code</Label>
                      <Input id="courseCode" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="CS-101" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditHours">Credit Hours</Label>
                      <Select value={courseForm.credit_hours} onValueChange={(value) => setCourseForm({ ...courseForm, credit_hours: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2+0">2+0 (Theory only)</SelectItem>
                          <SelectItem value="3+0">3+0 (Theory only)</SelectItem>
                          <SelectItem value="2+1">2+1 (Theory + Lab)</SelectItem>
                          <SelectItem value="3+1">3+1 (Theory + Lab)</SelectItem>
                          <SelectItem value="0+1">0+1 (Lab only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseType">Type</Label>
                      <Select value={courseForm.type} onValueChange={(value) => setCourseForm({ ...courseForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theory">Theory</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Majors</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select majors" />
                      </SelectTrigger>
                      <SelectContent>
                        {majors.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="all_programs" checked={courseForm.applies_to_all_programs} onChange={e => setCourseForm({ ...courseForm, applies_to_all_programs: e.target.checked })} />
                    <Label htmlFor="all_programs">Applies to all BS programs</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => { setShowCourseForm(false); setEditingCourse(null); }}>Cancel</Button>
                    <Button type="submit">{editingCourse ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger>
                  <SelectValue placeholder="All Majors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Majors</SelectItem>
                  {majors.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or code" />
              <Button onClick={handleFilterChange}>Apply Filters</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credit Hours</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Majors</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>{course.code}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.credit_hours}</TableCell>
                    <TableCell>{course.type}</TableCell>
                    <TableCell>{course.major_names}</TableCell>
                    <TableCell>{course.program_names}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditCourse(course)}><FiEdit /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteCourse(course.id)}><FiTrash2 /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Major</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>{section.major_name}</TableCell>
                    <TableCell>{section.semester}</TableCell>
                    <TableCell>{section.student_strength}</TableCell>
                    <TableCell className="capitalize">{section.shift}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="flex items-center space-x-1"><FiChevronsRight size={14} /><span>Assign Courses</span></Button>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1"><FiCornerRightUp size={14} /><span>Promote</span></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
