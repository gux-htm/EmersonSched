import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI, timingAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiCheck, FiX } from 'react-icons/fi';

export default function InstructorRequests() {
  const { user, isInstructor } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [preferences, setPreferences] = useState({
    days: [] as string[],
    time_slots: [] as number[],
  });

  useEffect(() => {
    if (!isInstructor && user?.role !== 'admin') {
      router.push('/login');
      return;
    }

    loadData();
  }, [isInstructor, user, router]);

  const loadData = async () => {
    try {
      const [requestsRes, slotsRes] = await Promise.all([
        timetableAPI.getCourseRequests({ status: 'pending' }),
        timingAPI.getTimeSlots(),
      ]);

      setRequests(requestsRes.data.requests);
      setTimeSlots(slotsRes.data.slots);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequest = (request: any) => {
    setSelectedRequest(request);
    setPreferences({ days: [], time_slots: [] });
  };

  const toggleDay = (day: string) => {
    setPreferences((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const toggleTimeSlot = (slotId: number) => {
    setPreferences((prev) => ({
      ...prev,
      time_slots: prev.time_slots.includes(slotId)
        ? prev.time_slots.filter((id) => id !== slotId)
        : [...prev.time_slots, slotId],
    }));
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;

    if (preferences.days.length === 0 || preferences.time_slots.length === 0) {
      toast.error('Please select at least one day and time slot');
      return;
    }

    try {
      await timetableAPI.acceptCourseRequest({
        request_id: selectedRequest.id,
        preferences,
      });

      toast.success('Course request accepted! You have 10 seconds to undo.');
      setSelectedRequest(null);
      setPreferences({ days: [], time_slots: [] });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept request');
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

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Course Requests</h1>

        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No pending course requests</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Available Courses</h2>
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`card cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectRequest(request)}
                >
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900">
                      {request.course_code} - {request.course_name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Section: {request.section_name}</span>
                      <span>Major: {request.major_name}</span>
                      <span className="capitalize">Shift: {request.shift}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="badge badge-info">{request.credit_hours} Credit Hours</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Preferences Panel */}
            <div className="card sticky top-24">
              {selectedRequest ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Set Preferences</h2>
                    <p className="text-gray-600">
                      Course: {selectedRequest.course_code} - {selectedRequest.course_name}
                    </p>
                  </div>

                  {/* Days Selection */}
                  <div>
                    <label className="label">Select Preferred Days</label>
                    <div className="grid grid-cols-2 gap-2">
                      {days.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`btn ${
                            preferences.days.includes(day)
                              ? 'btn-primary'
                              : 'btn-secondary'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots Selection */}
                  <div>
                    <label className="label">Select Time Slots</label>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {timeSlots
                        .filter((slot) => slot.shift === selectedRequest.shift)
                        .map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => toggleTimeSlot(slot.id)}
                            className={`w-full btn text-left ${
                              preferences.time_slots.includes(slot.id)
                                ? 'btn-primary'
                                : 'btn-secondary'
                            }`}
                          >
                            {slot.slot_label}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button onClick={handleAccept} className="flex-1 btn btn-success flex items-center justify-center space-x-2">
                      <FiCheck /> <span>Accept Course</span>
                    </button>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="btn btn-secondary"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a course to set your preferences
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
