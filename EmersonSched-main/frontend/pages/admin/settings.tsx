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
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
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
          <h1 className="text-3xl font-bold">University Settings</h1>
        </div>

        {timings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle>Current Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm">Opening Time</p>
                    <p className="text-2xl font-bold">{timings.opening_time.substring(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-sm">Closing Time</p>
                    <p className="text-2xl font-bold">{timings.closing_time.substring(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-sm">Break Duration</p>
                    <p className="text-2xl font-bold">{timings.break_duration} min</p>
                  </div>
                  <div>
                    <p className="text-sm">Slot Length</p>
                    <p className="text-2xl font-bold">{timings.slot_length} min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <FiClock />
              <span>Configure University Timings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTimingSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input id="opening_time" type="time" value={timingForm.opening_time} onChange={(e) => setTimingForm({ ...timingForm, opening_time: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input id="closing_time" type="time" value={timingForm.closing_time} onChange={(e) => setTimingForm({ ...timingForm, closing_time: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break_duration">Break Duration (minutes)</Label>
                  <Input id="break_duration" type="number" value={timingForm.break_duration} onChange={(e) => setTimingForm({ ...timingForm, break_duration: parseInt(e.target.value) })} min="15" max="120" step="15" required />
                  <p className="text-sm text-muted-foreground">Typically lunch break (60 minutes)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slot_length">Slot Length (minutes)</Label>
                  <Select value={timingForm.slot_length.toString()} onValueChange={(value) => setTimingForm({ ...timingForm, slot_length: parseInt(value) })}>
                    <SelectTrigger id="slot_length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                      <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                      <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Duration of each class period</p>
                </div>
              </div>
              <div>
                <Label className="flex items-center space-x-2">
                  <FiCalendar />
                  <span>Working Days</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {days.map((day) => (
                    <Button
                      key={day.key}
                      type="button"
                      variant={timingForm.working_days.includes(day.key) ? 'default' : 'outline'}
                      onClick={() => toggleDay(day.key)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Select the days when classes are conducted
                </p>
              </div>
              <div className="flex items-center space-x-4 pt-4 border-t">
                <Button type="submit">Save Settings</Button>
                <p className="text-sm text-muted-foreground">
                  ⚠️ Changing timings will regenerate time slots
                </p>
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
