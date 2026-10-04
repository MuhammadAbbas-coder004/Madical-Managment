import React, { useRef,  useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; otp?: string } | null;
  const email = state?.email || '';
  const otp = state?.otp || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword }) as { message?: string };
      toast.success(res.message || 'Password reset successfully! Please log in.');
      navigate('/login');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to reset password';
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
            <h1 className="text-xl font-bold text-textPrimary">Set New Password</h1>
            <p className="text-sm text-textSecondary mt-1">Create a secure new password for your account.</p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
            <FormField label="New Password" type="password" placeholder="••••••••" required
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <FormField label="Confirm New Password" type="password" placeholder="••••••••" required
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={isLoading}>
              Reset Password
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
