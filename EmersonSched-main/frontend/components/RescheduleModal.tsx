import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseRequest: any;
  onSuccess: () => void;
}

export default function RescheduleModal({ isOpen, onClose, courseRequest, onSuccess }: RescheduleModalProps) {
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSlots();
      // Pre-select the current slots
      const currentSlots = courseRequest.selected_time_slots?.map((s: any) => s.time_slot_id) || [];
      setSelectedSlots(currentSlots);
    }
  }, [isOpen]);

  const fetchAvailableSlots = async () => {
    try {
      const res = await api.get('/timetable/available-slots', {
        params: {
          section_id: courseRequest.section_id,
          instructor_id: courseRequest.instructor_id,
        },
      });
      setAvailableSlots(res.data.available_slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      toast.error('Failed to fetch available slots');
    }
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

  const handleSubmit = async () => {
    if (selectedSlots.length === 0) {
      toast.warn('Please select at least one time slot.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/timetable/reschedule', {
        course_request_id: courseRequest.id,
        new_schedule: selectedSlots.map(slotId => ({ time_slot_id: slotId })),
      });
      toast.success('Course rescheduled successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to reschedule course:', error);
      toast.error('Failed to reschedule course');
    } finally {
      setLoading(false);
    }
  };

  const groupSlotsByDay = (slots: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    slots.forEach((slot) => {
      const day = slot.day_of_week || 'any';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(slot);
    });
    return grouped;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Reschedule Course</h2>
        <p className="mb-4">
          Rescheduling <strong>{courseRequest.course_name}</strong>
        </p>

        <div className="max-h-60 overflow-y-auto mb-4">
          {Object.entries(groupSlotsByDay(availableSlots)).map(([day, slots]) => (
            <div key={day}>
              <h3 className="font-semibold text-gray-900 capitalize mb-2">{day}</h3>
              <div className="grid grid-cols-1 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => toggleSlot(slot.time_slot_id)}
                    className={`w-full btn text-left ${
                      selectedSlots.includes(slot.time_slot_id)
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    {slot.slot_label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
