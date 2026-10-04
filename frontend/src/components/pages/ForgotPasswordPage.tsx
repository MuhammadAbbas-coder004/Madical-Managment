import React, { useRef,  useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email address'); return; }
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email }) as { message?: string };
      toast.success(res.message || 'Reset code sent to your email');
      navigate('/verify-otp', { state: { email } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send reset code';
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
            <h1 className="text-xl font-bold text-textPrimary">Forgot Password</h1>
            <p className="text-sm text-textSecondary mt-1">Enter your registered email and we&apos;ll send you a 6-digit OTP code.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address" type="email" placeholder="doctor@hospital.com" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={isLoading}>
              Send Reset Code
            </Button>
          </form>
          <p className="text-xs text-center text-textSecondary mt-6">
            <Link to="/login" className="text-primary font-medium hover:underline">Back to Login</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
