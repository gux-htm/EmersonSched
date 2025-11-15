import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiCheckCircle } from 'react-icons/fi';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { email } = router.query;

  useEffect(() => {
    if (!email) {
      router.push('/forgot-password');
      toast.error('Something went wrong. Please try again.');
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.verifyOtp({ email, otp });
      toast.success('OTP verified successfully!');
      router.push(`/reset-password?email=${email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-primary">
              Verify OTP
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Enter the OTP sent to {email}.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <div className="relative">
                  <FiCheckCircle className="absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10"
                    placeholder="123456"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Didn't receive an OTP?{' '}
                <Link
                  href="/forgot-password"
                  className="text-primary font-semibold hover:underline"
                >
                  Resend
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
