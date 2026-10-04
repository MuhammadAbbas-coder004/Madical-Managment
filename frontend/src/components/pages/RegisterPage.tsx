import React, { useRef,  useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

const registerSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      toast.success('Registration successful!');
      navigate('/face-enrollment-prompt');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to register';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-textPrimary">MedSystem Portal</h1>
          <p className="text-sm text-textSecondary mt-1">Create your clinical staff / patient account</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Username" type="text" placeholder="e.g. dr_smith" required
              error={errors.username?.message} {...register('username')} />
            <FormField label="Email Address" type="email" placeholder="name@hospital.com" required
              error={errors.email?.message} {...register('email')} />
            <FormField label="Password" type="password" placeholder="••••••••" required
              error={errors.password?.message} {...register('password')} />
            <FormField label="Confirm Password" type="password" placeholder="••••••••" required
              error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isSubmitting}>
              Create Account
            </Button>
          </form>
          <p className="text-xs text-center text-textSecondary mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
