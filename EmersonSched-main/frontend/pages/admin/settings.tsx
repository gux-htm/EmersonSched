import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timingAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiClock, FiCalendar, FiSettings, FiZap, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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
          <h1 className="text-3xl font-bold">University Settings</h1>
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
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <FiZap />
              <span>Dynamic Time Slot Generation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerateSlots(); }} className="space-y-6">
              <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Configure custom slot distributions. Example: 2 × 90min + 1 × 60min for morning shift.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={slotGeneration.shift} onValueChange={(value) => setSlotGeneration({ ...slotGeneration, shift: value })}>
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
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={slotGeneration.start_time} onChange={(e) => setSlotGeneration({ ...slotGeneration, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={slotGeneration.end_time} onChange={(e) => setSlotGeneration({ ...slotGeneration, end_time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slot Distribution</Label>
                <div className="space-y-2">
                  {slotGeneration.distribution.map((slot, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input type="number" value={slot.len} onChange={(e) => { const newDist = [...slotGeneration.distribution]; newDist[idx].len = parseInt(e.target.value); setSlotGeneration({ ...slotGeneration, distribution: newDist }); }} placeholder="Minutes" />
                      <span>×</span>
                      <Input type="number" value={slot.count} onChange={(e) => { const newDist = [...slotGeneration.distribution]; newDist[idx].count = parseInt(e.target.value); setSlotGeneration({ ...slotGeneration, distribution: newDist }); }} placeholder="Count" />
                      <Button type="button" variant="destructive" onClick={() => { const newDist = slotGeneration.distribution.filter((_, i) => i !== idx); setSlotGeneration({ ...slotGeneration, distribution: newDist }); }}><FiX /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => { setSlotGeneration({ ...slotGeneration, distribution: [...slotGeneration.distribution, { len: 60, count: 1 }], }); }}>Add Slot Type</Button>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={generating}>{generating ? 'Generating...' : 'Generate Time Slots'}</Button>
                <Button type="button" variant="outline" onClick={() => setSlotGeneration({ shift: 'morning', start_time: '08:00', end_time: '13:00', distribution: [{ len: 90, count: 2 }, { len: 60, count: 1 }], working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], })}>Reset to Default</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
