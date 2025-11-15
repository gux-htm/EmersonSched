import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Programs & Majors</h1>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Programs</CardTitle>
            <Dialog open={showProgramForm} onOpenChange={setShowProgramForm}>
              <DialogTrigger asChild>
                <Button>
                  <FiPlus className="mr-2" /> Add Program
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Program</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleProgramSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="programName">Program Name</Label>
                      <Input
                        id="programName"
                        value={programForm.name}
                        onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                        placeholder="BS Computer Science"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="programCode">Code</Label>
                      <Input
                        id="programCode"
                        value={programForm.code}
                        onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                        placeholder="BSCS"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="systemType">System Type</Label>
                      <Select
                        value={programForm.system_type}
                        onValueChange={(value) => setProgramForm({ ...programForm, system_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semester">Semester</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalSemesters">Total Semesters</Label>
                      <Input
                        id="totalSemesters"
                        type="number"
                        value={programForm.total_semesters}
                        onChange={(e) => setProgramForm({ ...programForm, total_semesters: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shift">Shift</Label>
                      <Select
                        value={programForm.shift}
                        onValueChange={(value) => setProgramForm({ ...programForm, shift: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="weekend">Weekend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowProgramForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Program</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Semesters</TableHead>
                  <TableHead>Shift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.name}</TableCell>
                    <TableCell>{program.code}</TableCell>
                    <TableCell className="capitalize">{program.system_type}</TableCell>
                    <TableCell>{program.total_semesters}</TableCell>
                    <TableCell className="capitalize">{program.shift}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Majors</CardTitle>
            <Dialog open={showMajorForm} onOpenChange={setShowMajorForm}>
              <DialogTrigger asChild>
                <Button>
                  <FiPlus className="mr-2" /> Add Major
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Major</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleMajorSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="program">Program</Label>
                      <Select
                        value={majorForm.program_id}
                        onValueChange={(value) => setMajorForm({ ...majorForm, program_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id.toString()}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="majorName">Major Name</Label>
                      <Input
                        id="majorName"
                        value={majorForm.name}
                        onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })}
                        placeholder="Artificial Intelligence"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="majorCode">Code</Label>
                      <Input
                        id="majorCode"
                        value={majorForm.code}
                        onChange={(e) => setMajorForm({ ...majorForm, code: e.target.value })}
                        placeholder="AI"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowMajorForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Major</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Major Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Program</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {majors.map((major) => (
                  <TableRow key={major.id}>
                    <TableCell className="font-medium">{major.name}</TableCell>
                    <TableCell>{major.code}</TableCell>
                    <TableCell>{major.program_name}</TableCell>
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
