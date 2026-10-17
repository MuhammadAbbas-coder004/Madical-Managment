import React, { lazy, Suspense, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShieldCheck, UserRoundPlus } from 'lucide-react';
import api from '../../shared/services/api';
import { AivoraLogo } from '../atoms/AivoraLogo';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import './RegisterPage.css';

const FaceScanModel = lazy(() =>
  import('./FaceScanModel').then(({ FaceScanModel: model }) => ({ default: model }))
);

const registerSchema = z
  .object({
    username: z.string().trim().min(3, 'Full name must be at least 3 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const passwordStrength = (password: string) => {
  if (!password) return { score: 0, label: 'Use at least 8 characters' };
  const score = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
  return { score, label: labels[score] };
};

const GoogleLogo = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleLogo = () => (
  <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8.92-2.87-.93.04-2.02.63-2.66 1.38-.56.65-.99 1.69-.87 2.73 1.05.08 2.06-.54 2.61-1.24z" />
  </svg>
);

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const password = watch('password', '');
  const strength = passwordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setAuthNotice(null);
    try {
      await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
      }, { skipToast: true });
      toast.success('Your account was created. Continue with password sign-in.');
      navigate('/face-enrollment-prompt');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to create your account. Please try again.';
      setAuthNotice(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showProviderUnavailable = (provider: 'Google' | 'Apple') => {
    setAuthNotice(
      `${provider} sign-up is unavailable because this server has no configured OAuth callback or provider-token verification. No account was created. Use the secure email and password form instead.`
    );
  };

  return (
    <main ref={containerRef} className="medivanta-register relative flex min-h-screen items-start justify-center overflow-hidden px-4 py-8 sm:px-6 lg:items-center lg:py-12">
      <div aria-hidden="true" className="medivanta-register-glow medivanta-register-glow-left" />
      <div aria-hidden="true" className="medivanta-register-glow medivanta-register-glow-right" />

      <div className="relative z-10 grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[0.96fr_1.04fr] lg:gap-8">
        <section className="gsap-card medivanta-register-panel flex flex-col justify-center rounded-[1.75rem] p-6 shadow-2xl sm:p-9 lg:p-10">
          <Link to="/" className="mb-7 inline-flex w-fit items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE]">
            <AivoraLogo className="h-11 w-11" />
            <span className="text-lg font-semibold tracking-tight text-white">Medivanta</span>
          </Link>

          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#C7FFBE]">Care starts here</p>
            <h1 className="register-heading text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">Create your account</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">Set up your secure account to access your healthcare workspace.</p>
          </div>

          <Card className="medivanta-register-card rounded-2xl border-white/10 p-5 shadow-xl sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                label="Full name"
                type="text"
                placeholder="Your first and last name"
                autoComplete="name"
                required
                maxLength={80}
                error={errors.username?.message}
                {...register('username')}
              />
              <p className="-mt-3 text-[0.68rem] leading-4 text-white/40">This name will be used as your account display name.</p>

              <FormField
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="relative">
                <FormField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="medivanta-register-password-toggle absolute right-3 top-[34px] inline-flex h-9 w-9 items-center justify-center rounded-lg"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>

              <div className="medivanta-password-strength" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <span>Password strength</span>
                  <span className={strength.score >= 4 ? 'is-strong' : ''}>{strength.label}</span>
                </div>
                <div className="medivanta-strength-meter" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} className={index < strength.score ? 'is-filled' : ''} />
                  ))}
                </div>
              </div>

              <div className="relative">
                <FormField
                  label="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  required
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  aria-pressed={showConfirmPassword}
                  className="medivanta-register-password-toggle absolute right-3 top-[34px] inline-flex h-9 w-9 items-center justify-center rounded-lg"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>

              {authNotice && (
                <div className="medivanta-register-notice" role="alert" aria-live="polite">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C7FFBE]" aria-hidden="true" />
                  <p>{authNotice}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="medivanta-register-submit mt-1 min-h-12 w-full rounded-xl text-sm font-semibold shadow-lg transition-[transform,background-color,box-shadow] duration-200"
                isLoading={isSubmitting}
              >
                Create Account
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#202725] px-3 text-white/45">Or continue with</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="medivanta-register-provider flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl"
                onClick={() => showProviderUnavailable('Google')}
              >
                <GoogleLogo />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="medivanta-register-provider flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl"
                onClick={() => showProviderUnavailable('Apple')}
              >
                <AppleLogo />
                Continue with Apple
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-white/55">
              Already have an account?{' '}
              <Link to="/login" className="rounded-sm font-semibold text-[#C7FFBE] transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE]">
                Sign in
              </Link>
            </p>
          </Card>
        </section>

        <aside className="gsap-card medivanta-register-face relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl sm:min-h-[430px] lg:min-h-full">
          <div className="medivanta-register-face-model" aria-hidden="true">
            <Suspense fallback={<div className="medivanta-register-face-loading" aria-hidden="true" />}>
              <FaceScanModel followPointer />
            </Suspense>
          </div>
          <div className="pointer-events-none relative z-10 flex items-start justify-between p-6 sm:p-8">
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#C7FFBE]/90">Intelligent healthcare</p>
              <h2 className="text-2xl font-medium tracking-tight text-white sm:text-3xl">A more connected care journey.</h2>
            </div>
          </div>
          <div className="pointer-events-none relative z-10 flex items-end gap-3 p-6 sm:p-8">
            <UserRoundPlus className="h-5 w-5 shrink-0 text-[#C7FFBE]" aria-hidden="true" />
            <p className="max-w-xs text-xs leading-5 text-white/60">A secure account for your care team, health information, and clinical workspace.</p>
          </div>
        </aside>
      </div>
    </main>
  );
};
