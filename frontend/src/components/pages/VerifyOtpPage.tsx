import React, { useRef,  useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { email?: string } | null;
  const [email, setEmail] = useState(locationState?.email || '');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) { toast.error('Please enter both your email and OTP code'); return; }
    if (otp.length < 6) { toast.error('OTP must be 6 digits'); return; }
    setIsLoading(true);
    try {
      const res = await api.post('/auth/verify-reset-otp', { email, otp }) as { message?: string };
      toast.success(res.message || 'OTP verified successfully');
      navigate('/reset-password', { state: { email, otp } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Invalid or expired OTP';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-textPrimary">Verify OTP Code</h1>
            <p className="text-sm text-textSecondary mt-1">
              Enter the 6-digit code sent to{' '}
              {email ? <strong className="text-textPrimary">{email}</strong> : 'your email'}.
            </p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            {!locationState?.email && (
              <FormField label="Email Address" type="email" placeholder="doctor@hospital.com" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
            <FormField label="6-Digit OTP" type="text" maxLength={6} placeholder="123456" required
              className="tracking-widest text-center"
              value={otp} onChange={(e) => setOtp(e.target.value.trim())} />
            <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={isLoading}>
              Verify Code
            </Button>
          </form>
          <p className="text-xs text-center text-textSecondary mt-6">
            Didn&apos;t receive a code?{' '}
            <Link to="/forgot-password" className="text-primary font-medium hover:underline">Request again</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
