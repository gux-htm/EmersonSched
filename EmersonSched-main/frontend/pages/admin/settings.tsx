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
    }
  }, [isAdmin, router]);

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <FiSettings size={32} className="text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">University Settings</h1>
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
