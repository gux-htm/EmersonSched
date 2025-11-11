import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { requestAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiSend, FiClock } from 'react-icons/fi';

export default function CourseRequests() {
  const { user, isInstructor } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isInstructor && user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadData();
  }, [isInstructor, user, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getForInstructor();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequests = async () => {
    if (sending) return;
    setSending(true);
    try {
      await requestAPI.create({});
      toast.success('Course requests sent to all instructors');
      loadData();
    } catch (error: any) {
      console.error('Error sending requests:', error);
      toast.error(error.response?.data?.error || 'Failed to send course requests');
    } finally {
      setSending(false);
    }
  };

  const handleSelectRequest = (request: any) => {
    setSelectedRequest(request);
    setSelectedSlots([]);
  };

  const toggleSlot = (slotId: number) => {
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      } else {
        return [...prev, slotId];
      }
    });
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    if (selectedSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }

    try {
      const response = await requestAPI.accept({
        request_id: selectedRequest.id,
        time_slots: selectedSlots,
      });
      toast.success('Course request accepted successfully!');
      setSelectedRequest(null);
      setSelectedSlots([]);
      loadData();
    } catch (error: any) {
      if (error.response?.status === 409) {
        const conflicts = error.response?.data?.conflicts || [];
        const conflictMessages = conflicts
          .map((c: any) => `${c.time_slot_id}: ${c.reason}`)
          .join(', ');
        toast.error(`Conflict: ${conflictMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to accept request');
      }
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

  // Group slots by day for better display
  const groupSlotsByDay = (slots: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    slots.forEach((slot) => {
      const day = slot.day_of_week || 'any';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(slot);
    });
    return grouped;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Course Requests</h1>

          {/* Only admin sees the Send Requests button */}
          {user?.role === 'admin' && (
            <button
              onClick={handleSendRequests}
              disabled={sending}
              className="btn btn-primary flex items-center space-x-2"
            >
              <FiSend />
              <span>{sending ? 'Sending...' : 'Send Course Requests'}</span>
            </button>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No pending course requests available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Available Courses</h2>
              {requests
                .filter((r) => r.status === 'pending')
                .map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`card hover:shadow-lg transition-shadow ${
                      selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleSelectRequest(request)}
                      >
                        <h3 className="font-bold text-lg text-gray-900">
                          {request.course_name || 'Unnamed Course'}
                        </h3>
                        <p className="text-sm text-gray-600">{request.course_code}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-2">
                          <span><strong>Major:</strong> {request.major_name || 'N/A'}</span>
                          <span><strong>Semester:</strong> {request.semester || 'N/A'}</span>
                          <span className="capitalize"><strong>Shift:</strong> {request.shift || 'morning'}</span>
                          <span><strong>Section:</strong> {request.section_name}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          <strong>Credit Hours:</strong> {request.credit_hours || 'N/A'}
                        </div>
                        <div className="text-sm mt-2">
                          <span className="badge badge-info">
                            {request.available_time_slots?.length || 0} slots available
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <button
                          onClick={() => handleSelectRequest(request)}
                          className="w-full btn btn-primary flex items-center justify-center space-x-2"
                        >
                          <FiCheck /> <span>Accept & Select Slots</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Slot Selection Panel */}
            <div className="card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {selectedRequest ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Select Time Slots</h2>
                    <p className="text-gray-600">
                      {selectedRequest.course_name} - {selectedRequest.section_name}
                    </p>
                  </div>

                  {/* Available Time Slots */}
                  {selectedRequest.available_time_slots &&
                  selectedRequest.available_time_slots.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(
                        groupSlotsByDay(selectedRequest.available_time_slots)
                      ).map(([day, slots]) => (
                        <div key={day}>
                          <h3 className="font-semibold text-gray-900 capitalize mb-2 flex items-center space-x-2">
                            <FiClock />
                            <span>{day === 'any' ? 'All Days' : day}</span>
                          </h3>
                          <div className="grid grid-cols-1 gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => toggleSlot(slot.id)}
                                className={`w-full btn text-left ${
                                  selectedSlots.includes(slot.id)
                                    ? 'btn-primary'
                                    : 'btn-secondary'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{slot.label}</span>
                                  {selectedSlots.includes(slot.id) && (
                                    <FiCheck className="text-primary" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No available time slots
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Selected:</span>
                      <span className="font-bold text-primary">
                        {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAccept}
                        className="flex-1 btn btn-success flex items-center justify-center space-x-2"
                        disabled={selectedSlots.length === 0}
                      >
                        <FiCheck /> <span>Accept Request</span>
                      </button>
                      <button
                        onClick={() => setSelectedRequest(null)}
                        className="btn btn-secondary"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a course to view available time slots
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
