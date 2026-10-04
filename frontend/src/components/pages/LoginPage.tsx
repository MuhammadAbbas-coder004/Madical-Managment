import React, { useRef,  useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ScanFace } from 'lucide-react';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/login', { email: data.email, password: data.password }) as {
        user: { id: string; name?: string; username?: string; email: string; role: string };
        token?: string;
        message?: string;
      };
      login(response.user, response.token || 'session-token');
      toast.success(response.message || 'Login successful!');
      navigate('/dashboard');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Invalid email or password';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaceLogin = () => {
    console.log('Initiating FaceIO authentication...');
    toast('Face login feature coming next!', { icon: '📷' });
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">MedSystem Portal</h1>
          <p className="text-sm text-textSecondary mt-1">Sign in to access your clinical dashboard</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email Address" type="email" placeholder="doctor@hospital.com" required
              error={errors.email?.message} {...register('email')} />
            <div>
              <FormField label="Password" type="password" placeholder="••••••••" required
                error={errors.password?.message} {...register('password')} />
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>
            </div>
            <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-textSecondary">Or access via biometrics</span>
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full py-2.5 flex items-center justify-center gap-2"
            onClick={handleFaceLogin}>
            <ScanFace className="w-4 h-4 text-primary" />
            Login with Face
          </Button>
          <p className="text-xs text-center text-textSecondary mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
