import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timingAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiClock, FiCalendar, FiSettings, FiZap, FiX } from 'react-icons/fi';

export default function Settings() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timings, setTimings] = useState<any>(null);
  const [timingForm, setTimingForm] = useState({
    opening_time: '08:00',
    closing_time: '17:00',
    break_duration: 60,
    slot_length: 60,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });
  const [generating, setGenerating] = useState(false);
  const [slotGeneration, setSlotGeneration] = useState({
    shift: 'morning',
    start_time: '08:00',
    end_time: '13:00',
    distribution: [{ len: 90, count: 2 }, { len: 60, count: 1 }],
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadTimings();
  }, [isAdmin, router]);

  const loadTimings = async () => {
    try {
      const response = await timingAPI.getUniversityTimings();
      if (response.data.timings) {
        const t = response.data.timings;
        setTimings(t);
        setTimingForm({
          opening_time: t.opening_time.substring(0, 5),
          closing_time: t.closing_time.substring(0, 5),
          break_duration: t.break_duration,
          slot_length: t.slot_length,
          working_days: typeof t.working_days === 'string' 
            ? JSON.parse(t.working_days) 
            : t.working_days,
        });
      }
    } catch (error) {
      console.error('Failed to load timings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await timingAPI.setUniversityTimings(timingForm);
      toast.success('University timings updated successfully');
      loadTimings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update timings');
    }
  };

  const toggleDay = (day: string) => {
    setTimingForm((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const handleGenerateSlots = async () => {
    try {
      setGenerating(true);
      const response = await timingAPI.generateSlots({
        shift: slotGeneration.shift,
        start_time: slotGeneration.start_time + ':00',
        end_time: slotGeneration.end_time + ':00',
        distribution: slotGeneration.distribution,
        working_days: slotGeneration.working_days,
      });
      
      toast.success(`Generated ${response.data.count} time slots successfully!`);
    } catch (error: any) {
      console.error('Error generating slots:', error);
      toast.error(error.response?.data?.error || 'Failed to generate time slots');
    } finally {
      setGenerating(false);
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

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <FiSettings size={32} className="text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">University Settings</h1>
        </div>

        {/* Current Timings Display */}
        {timings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-r from-primary to-indigo-600 text-white"
          >
            <h2 className="text-xl font-bold mb-4">Current Settings</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-purple-200 text-sm">Opening Time</p>
                <p className="text-2xl font-bold">{timings.opening_time.substring(0, 5)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm">Closing Time</p>
                <p className="text-2xl font-bold">{timings.closing_time.substring(0, 5)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm">Break Duration</p>
                <p className="text-2xl font-bold">{timings.break_duration} min</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm">Slot Length</p>
                <p className="text-2xl font-bold">{timings.slot_length} min</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timing Configuration Form */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <FiClock className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Configure University Timings</h2>
          </div>

          <form onSubmit={handleTimingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Opening Time</label>
                <input
                  type="time"
                  value={timingForm.opening_time}
                  onChange={(e) => setTimingForm({ ...timingForm, opening_time: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Closing Time</label>
                <input
                  type="time"
                  value={timingForm.closing_time}
                  onChange={(e) => setTimingForm({ ...timingForm, closing_time: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Break Duration (minutes)</label>
                <input
                  type="number"
                  value={timingForm.break_duration}
                  onChange={(e) => setTimingForm({ ...timingForm, break_duration: parseInt(e.target.value) })}
                  className="input"
                  min="15"
                  max="120"
                  step="15"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Typically lunch break (60 minutes)</p>
              </div>

              <div>
                <label className="label">Slot Length (minutes)</label>
                <select
                  value={timingForm.slot_length}
                  onChange={(e) => setTimingForm({ ...timingForm, slot_length: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value="60">60 minutes (1 hour)</option>
                  <option value="90">90 minutes (1.5 hours)</option>
                  <option value="120">120 minutes (2 hours)</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">Duration of each class period</p>
              </div>
            </div>

            <div>
              <label className="label flex items-center space-x-2">
                <FiCalendar />
                <span>Working Days</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`btn ${
                      timingForm.working_days.includes(day.key)
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select the days when classes are conducted
              </p>
            </div>

            <div className="flex items-center space-x-4 pt-4 border-t">
              <button type="submit" className="btn btn-primary">
                Save Settings
              </button>
              <p className="text-sm text-gray-600">
                ⚠️ Changing timings will regenerate time slots
              </p>
            </div>
          </form>
        </div>

        {/* Information Card */}
        <div className="card bg-blue-50 border-l-4 border-blue-500">
          <h3 className="font-bold text-gray-900 mb-2">📋 Important Notes</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Time slots are automatically generated based on these settings</li>
            <li>Morning shift typically runs from opening until break</li>
            <li>Evening shift runs after break until closing</li>
            <li>60-minute slots are suitable for 2-credit courses</li>
            <li>90-minute slots are suitable for 3-credit courses</li>
            <li>Changing settings will require timetable regeneration</li>
          </ul>
        </div>

        {/* Dynamic Slot Generation */}
        <div className="card border-t-4 border-indigo-500">
          <div className="flex items-center space-x-3 mb-6">
            <FiZap className="text-indigo-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Dynamic Time Slot Generation</h2>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleGenerateSlots();
          }} className="space-y-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-800">
                Configure custom slot distributions. Example: 2 × 90min + 1 × 60min for morning shift.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Shift</label>
                <select
                  value={slotGeneration.shift}
                  onChange={(e) => setSlotGeneration({ ...slotGeneration, shift: e.target.value })}
                  className="input"
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>

              <div>
                <label className="label">Start Time</label>
                <input
                  type="time"
                  value={slotGeneration.start_time}
                  onChange={(e) => setSlotGeneration({ ...slotGeneration, start_time: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">End Time</label>
                <input
                  type="time"
                  value={slotGeneration.end_time}
                  onChange={(e) => setSlotGeneration({ ...slotGeneration, end_time: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Slot Distribution</label>
              <div className="space-y-2">
                {slotGeneration.distribution.map((slot, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={slot.len}
                      onChange={(e) => {
                        const newDist = [...slotGeneration.distribution];
                        newDist[idx].len = parseInt(e.target.value);
                        setSlotGeneration({ ...slotGeneration, distribution: newDist });
                      }}
                      className="input"
                      placeholder="Minutes"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      value={slot.count}
                      onChange={(e) => {
                        const newDist = [...slotGeneration.distribution];
                        newDist[idx].count = parseInt(e.target.value);
                        setSlotGeneration({ ...slotGeneration, distribution: newDist });
                      }}
                      className="input"
                      placeholder="Count"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newDist = slotGeneration.distribution.filter((_, i) => i !== idx);
                        setSlotGeneration({ ...slotGeneration, distribution: newDist });
                      }}
                      className="btn btn-error"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSlotGeneration({
                      ...slotGeneration,
                      distribution: [...slotGeneration.distribution, { len: 60, count: 1 }],
                    });
                  }}
                  className="btn btn-secondary"
                >
                  Add Slot Type
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={generating}
                className="btn btn-primary"
              >
                {generating ? 'Generating...' : 'Generate Time Slots'}
              </button>
              <button
                type="button"
                onClick={() => setSlotGeneration({
                  shift: 'morning',
                  start_time: '08:00',
                  end_time: '13:00',
                  distribution: [{ len: 90, count: 2 }, { len: 60, count: 1 }],
                  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                })}
                className="btn btn-secondary"
              >
                Reset to Default
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
