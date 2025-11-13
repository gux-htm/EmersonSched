import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI, timingAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';

export default function CourseRequests() {
  const { user, isInstructor } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);

  useEffect(() => {
    if (!isInstructor) {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [isInstructor, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await timetableAPI.getCourseRequests({ status: 'pending' });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load course requests:', error);
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (shift: string) => {
    try {
        const response = await timingAPI.getTimeSlots(shift);
        setAvailableSlots(response.data.slots || []);
    } catch (error) {
        console.error('Failed to load available slots:', error);
        toast.error('Failed to load available slots');
    }
  };

  const handleSelectRequest = (request: any) => {
    setSelectedRequest(request);
    setSelectedSlots([]);
    loadAvailableSlots(request.shift);
  };

  const toggleSlot = (slotId: number) => {
    setSelectedSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  const handleAccept = async () => {
    if (!selectedRequest || selectedSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }

    try {
      await timetableAPI.acceptCourseRequest({
        request_id: selectedRequest.id,
        selections: selectedSlots.map(slotId => ({ time_slot_id: slotId })),
      });
      toast.success('Course request accepted successfully!');
      setSelectedRequest(null);
      setSelectedSlots([]);
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept request');
    }
  };

  if (loading) return <Layout><div className="spinner"></div></Layout>;

  const groupSlotsByDay = (slots: any[]) => {
    return slots.reduce((acc, slot) => {
      const day = slot.day_of_week || 'Available';
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    }, {} as Record<string, any[]>);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Course Requests</h1>

        {requests.length === 0 ? (
          <div className="card text-center py-12"><p>No pending course requests.</p></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card hover:shadow-lg transition-shadow ${selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleSelectRequest(request)}
                >
                  <h3 className="font-bold text-lg">{request.course_name}</h3>
                  <p className="text-sm text-gray-500">{request.course_code}</p>
                  <div className="text-sm mt-2">
                    <strong>Section:</strong> {request.section_name} <br />
                    <strong>Semester:</strong> {request.semester} <br />
                    <strong>Shift:</strong> {request.shift}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {selectedRequest ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">Select Time Slots for {selectedRequest.course_name}</h2>
                  {Object.entries(groupSlotsByDay(availableSlots)).map(([day, slots]) => (
                    <div key={day}>
                      <h3 className="font-semibold capitalize mb-2"><FiClock className="inline mr-2" />{day}</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => toggleSlot(slot.id)}
                            className={`w-full btn text-left ${selectedSlots.includes(slot.id) ? 'btn-primary' : 'btn-secondary'}`}
                          >
                            {slot.slot_label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t flex justify-between items-center">
                    <span>{selectedSlots.length} slots selected</span>
                    <div className="flex space-x-2">
                        <button onClick={handleAccept} className="btn btn-success" disabled={selectedSlots.length === 0}>Accept</button>
                        <button onClick={() => setSelectedRequest(null)} className="btn btn-ghost">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Select a course to view available time slots.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}