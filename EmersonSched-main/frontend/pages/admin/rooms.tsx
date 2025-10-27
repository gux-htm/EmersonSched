import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiPlus } from 'react-icons/fi';

export default function Rooms() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
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

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadRooms();
  }, [isAdmin, router]);

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
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FiPlus /> <span>Add Room</span>
          </button>
        </div>

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
