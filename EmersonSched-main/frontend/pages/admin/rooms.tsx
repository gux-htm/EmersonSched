import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI, roomAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiZap, FiMapPin, FiEdit, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

export default function Rooms() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);

  const [roomForm, setRoomForm] = useState({
    name: '',
    type: 'lecture',
    capacity: 50,
    building: '',
    resources: {
      projector: false,
      whiteboard: true,
      computers: false,
      ac: false,
    },
  });

  const [autoAssignForm, setAutoAssignForm] = useState({
    shift: 'morning',
    semester: '3',
    policy: 'evening-first',
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadRooms();
    if (showAssignments) {
      loadAssignments();
    }
  }, [isAdmin, router, showAssignments]);

  const loadRooms = async () => {
    try {
      const response = await adminAPI.getRooms();
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await roomAPI.getAssignments();
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load room assignments');
    }
  };

  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);
      const response = await roomAPI.autoAssign(autoAssignForm);
      const summary = response.data.summary;
      toast.success(
        `Auto-assignment complete: ${summary.assigned} assigned, ${summary.unassigned} unassigned, ${summary.conflicts} conflicts`
      );
      if (showAssignments) {
        loadAssignments();
      }
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      toast.error(error.response?.data?.error || 'Failed to auto-assign rooms');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createRoom(roomForm);
      toast.success('Room created successfully');
      setShowForm(false);
      setRoomForm({
        name: '',
        type: 'lecture',
        capacity: 50,
        building: '',
        resources: { projector: false, whiteboard: true, computers: false, ac: false },
      });
      loadRooms();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create room');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Rooms Management</h1>
          <div className="flex space-x-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-assignments">Show Assignments</Label>
              <Switch id="show-assignments" checked={showAssignments} onCheckedChange={setShowAssignments} />
            </div>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button>
                  <FiPlus className="mr-2" /> Add Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Room</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roomName">Room Name</Label>
                      <Input id="roomName" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Room 101" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomType">Type</Label>
                      <Select value={roomForm.type} onValueChange={(value) => setRoomForm({ ...roomForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lecture">Lecture Hall</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="seminar">Seminar Room</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input id="capacity" type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })} min="10" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="building">Building</Label>
                      <Input id="building" value={roomForm.building} onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })} placeholder="Main Block" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Resources</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="projector" checked={roomForm.resources.projector} onCheckedChange={(checked) => setRoomForm({ ...roomForm, resources: { ...roomForm.resources, projector: !!checked } })} />
                        <Label htmlFor="projector">Projector</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="whiteboard" checked={roomForm.resources.whiteboard} onCheckedChange={(checked) => setRoomForm({ ...roomForm, resources: { ...roomForm.resources, whiteboard: !!checked } })} />
                        <Label htmlFor="whiteboard">Whiteboard</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="computers" checked={roomForm.resources.computers} onCheckedChange={(checked) => setRoomForm({ ...roomForm, resources: { ...roomForm.resources, computers: !!checked } })} />
                        <Label htmlFor="computers">Computers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ac" checked={roomForm.resources.ac} onCheckedChange={(checked) => setRoomForm({ ...roomForm, resources: { ...roomForm.resources, ac: !!checked } })} />
                        <Label htmlFor="ac">Air Conditioning</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit">Create Room</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FiZap />
              <span>Auto-Assign Rooms</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
            <div className="space-y-2">
              <Label htmlFor="autoAssignShift">Shift</Label>
              <Select value={autoAssignForm.shift} onValueChange={(value) => setAutoAssignForm({ ...autoAssignForm, shift: value })}>
                <SelectTrigger id="autoAssignShift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="autoAssignSemester">Semester</Label>
              <Input id="autoAssignSemester" value={autoAssignForm.semester} onChange={(e) => setAutoAssignForm({ ...autoAssignForm, semester: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="autoAssignPolicy">Policy</Label>
              <Select value={autoAssignForm.policy} onValueChange={(value) => setAutoAssignForm({ ...autoAssignForm, policy: value })}>
                <SelectTrigger id="autoAssignPolicy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evening-first">Evening First</SelectItem>
                  <SelectItem value="morning-first">Morning First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAutoAssign} disabled={autoAssigning}>
              {autoAssigning ? 'Assigning...' : 'Auto-Assign Rooms'}
            </Button>
          </CardContent>
        </Card>

        {showAssignments && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Room Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-muted-foreground">No assignments yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Time Slot</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>{assignment.section_name}</TableCell>
                          <TableCell>{assignment.room_name}</TableCell>
                          <TableCell>{assignment.slot_label}</TableCell>
                          <TableCell>{assignment.semester}</TableCell>
                          <TableCell>{assignment.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, index) => {
            const resources = typeof room.resources === 'string' ? JSON.parse(room.resources) : room.resources;
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{room.name}</CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon" onClick={() => {/* Edit room */}}><FiEdit /></Button>
                      <Button variant="destructive" size="icon" onClick={() => {/* Delete room */}}><FiTrash2 /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Building</p>
                        <p className="font-medium">{room.building}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Capacity</p>
                        <p className="font-medium">{room.capacity} students</p>
                      </div>
                    </div>
                    {resources && (
                      <div>
                        <p className="text-muted-foreground text-sm mb-2">Resources:</p>
                        <div className="flex flex-wrap gap-2">
                          {resources.projector && <Badge>Projector</Badge>}
                          {resources.whiteboard && <Badge>Whiteboard</Badge>}
                          {resources.computers && <Badge>Computers</Badge>}
                          {resources.ac && <Badge>AC</Badge>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
