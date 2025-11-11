import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI, roomAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus, FiZap, FiMapPin } from 'react-icons/fi';

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
          <h1 className="text-3xl font-bold text-gray-900">Rooms Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowAssignments(!showAssignments);
                if (!showAssignments) {
                  loadAssignments();
                }
              }}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <FiMapPin /> <span>{showAssignments ? 'Hide' : 'View'} Assignments</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiPlus /> <span>Add Room</span>
            </button>
          </div>
        </div>

        {/* Auto-Assign Section */}
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <FiZap className="text-blue-500" /> Auto-Assign Rooms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Shift</label>
              <select
                value={autoAssignForm.shift}
                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, shift: e.target.value })}
                className="input"
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </div>
            <div>
              <label className="label">Semester</label>
              <input
                type="text"
                value={autoAssignForm.semester}
                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, semester: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Policy</label>
              <select
                value={autoAssignForm.policy}
                onChange={(e) => setAutoAssignForm({ ...autoAssignForm, policy: e.target.value })}
                className="input"
              >
                <option value="evening-first">Evening First</option>
                <option value="morning-first">Morning First</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAutoAssign}
            disabled={autoAssigning}
            className="mt-4 btn btn-primary"
          >
            {autoAssigning ? 'Assigning...' : 'Auto-Assign Rooms'}
          </button>
        </div>

        {/* Assignments Display */}
        {showAssignments && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Room Assignments</h2>
            {assignments.length === 0 ? (
              <p className="text-gray-600">No assignments yet. Use auto-assign or assign manually.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Section</th>
                      <th className="text-left p-2">Room</th>
                      <th className="text-left p-2">Time Slot</th>
                      <th className="text-left p-2">Semester</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b">
                        <td className="p-2">{assignment.section_name}</td>
                        <td className="p-2">
                          <InlineRoomEditor
                            assignment={assignment}
                            rooms={rooms}
                            onSaved={loadAssignments}
                          />
                        </td>
                        <td className="p-2">{assignment.slot_label}</td>
                        <td className="p-2">{assignment.semester}</td>
                        <td className="p-2">
                          <span className={`badge ${
                            assignment.status === 'reserved' ? 'badge-success' : 'badge-secondary'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              // Refresh row if needed
                              loadAssignments();
                            }}
                          >
                            Refresh
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Room</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">Room Name</label>
                  <input
                    type="text"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="input"
                    placeholder="Room 101"
                    required
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={roomForm.type}
                    onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                    className="input"
                  >
                    <option value="lecture">Lecture Hall</option>
                    <option value="lab">Lab</option>
                    <option value="seminar">Seminar Room</option>
                  </select>
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                    className="input"
                    min="10"
                    required
                  />
                </div>
                <div>
                  <label className="label">Building</label>
                  <input
                    type="text"
                    value={roomForm.building}
                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                    className="input"
                    placeholder="Main Block"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Resources</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roomForm.resources.projector}
                      onChange={(e) => setRoomForm({
                        ...roomForm,
                        resources: { ...roomForm.resources, projector: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span>Projector</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roomForm.resources.whiteboard}
                      onChange={(e) => setRoomForm({
                        ...roomForm,
                        resources: { ...roomForm.resources, whiteboard: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span>Whiteboard</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roomForm.resources.computers}
                      onChange={(e) => setRoomForm({
                        ...roomForm,
                        resources: { ...roomForm.resources, computers: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span>Computers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roomForm.resources.ac}
                      onChange={(e) => setRoomForm({
                        ...roomForm,
                        resources: { ...roomForm.resources, ac: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span>Air Conditioning</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary">Create Room</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, index) => {
            const resources = typeof room.resources === 'string' 
              ? JSON.parse(room.resources) 
              : room.resources;
            
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                    <span className={`badge ${
                      room.type === 'lab' ? 'badge-info' : 
                      room.type === 'seminar' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {room.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        const newName = prompt('Rename room', room.name);
                        if (!newName) return;
                        try {
                          await adminAPI.updateRoom(room.id, { ...room, name: newName });
                          toast.success('Room updated');
                          loadRooms();
                        } catch (e) {
                          toast.error('Failed to update room');
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      onClick={async () => {
                        if (!confirm('Delete this room?')) return;
                        try {
                          await adminAPI.deleteRoom(room.id);
                          toast.success('Room deleted');
                          loadRooms();
                        } catch (e) {
                          toast.error('Failed to delete room');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Building</p>
                      <p className="font-medium">{room.building}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Capacity</p>
                      <p className="font-medium">{room.capacity} students</p>
                    </div>
                  </div>

                  {resources && (
                    <div>
                      <p className="text-gray-600 text-sm mb-2">Resources:</p>
                      <div className="flex flex-wrap gap-2">
                        {resources.projector && <span className="badge badge-info">Projector</span>}
                        {resources.whiteboard && <span className="badge badge-success">Whiteboard</span>}
                        {resources.computers && <span className="badge badge-warning">Computers</span>}
                        {resources.ac && <span className="badge badge-error">AC</span>}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function InlineRoomEditor({ assignment, rooms, onSaved }: { assignment: any; rooms: any[]; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [roomId, setRoomId] = useState<number>(assignment.room_id);
  const [saving, setSaving] = useState(false);

  const availableRooms = rooms; // Show all; backend will validate clashes

  const save = async () => {
    try {
      setSaving(true);
      await roomAPI.editAssignment(assignment.id, { room_id: roomId, time_slot_id: assignment.time_slot_id });
      setEditing(false);
      onSaved();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update assignment';
      if (error.response?.status === 409) {
        // Clash message
        alert('Clash of resource detected: Room already booked for that slot.');
      } else {
        alert(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center space-x-2">
        <span>{assignment.room_name}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        className="input"
        value={roomId}
        onChange={(e) => setRoomId(parseInt(e.target.value))}
      >
        {availableRooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} (cap {r.capacity})
          </option>
        ))}
      </select>
      <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}
