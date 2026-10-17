import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ScanFace, ShieldCheck, Stethoscope, User, UserRoundPlus } from 'lucide-react';
import api from '../../shared/services/api';
import { AivoraLogo } from '../atoms/AivoraLogo';
import { Card } from '../molecules/Card';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';
import { beginOAuth, type OAuthProvider } from '../../shared/services/oauth';
import { FaceScanModal } from '../molecules/FaceScanModal';
import './RegisterPage.css';

const FaceScanModel = lazy(() =>
  import('./FaceScanModel').then(({ FaceScanModel: model }) => ({ default: model }))
);

const COUNTRY_CALLING_CODES = [
  { code: '+1', country: 'US/CA' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'AU' },
  { code: '+91', country: 'IN' },
  { code: '+92', country: 'PK' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'KSA' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+81', country: 'JP' },
  { code: '+86', country: 'CN' },
  { code: '+353', country: 'IE' },
  { code: '+41', country: 'CH' },
  { code: '+34', country: 'ES' },
  { code: '+39', country: 'IT' },
  { code: '+55', country: 'BR' },
];

const registerSchema = z
  .object({
    role: z.enum(['patient', 'doctor']),
    username: z.string().trim().min(3, 'Full name must be at least 3 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    countryCode: z.string(),
    phoneNumber: z
      .string()
      .trim()
      .min(7, 'Phone number must be at least 7 digits')
      .max(16, 'Phone number cannot exceed 16 digits')
      .regex(/^[\d\s\-()]+$/, 'Phone number must contain only numbers and standard separators'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    specialty: z.string().trim().optional(),
    licenseNumber: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.role === 'doctor') {
      if (!data.specialty || data.specialty.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Medical specialty is required for doctor accounts',
          path: ['specialty'],
        });
      }
      if (!data.licenseNumber || data.licenseNumber.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Medical license / registration number is required',
          path: ['licenseNumber'],
        });
      }
    }
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

const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'h-4 w-4 shrink-0' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleLogo: React.FC<{ className?: string }> = ({ className = 'h-4 w-4 shrink-0' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8.92-2.87-.93.04-2.02.63-2.66 1.38-.56.65-.99 1.69-.87 2.73 1.05.08 2.06-.54 2.61-1.24z" />
  </svg>
);

const ProviderSpinner: React.FC = () => (
  <svg
    className="h-4 w-4 shrink-0 animate-spin text-[#C7FFBE]"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3.5"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor'>('patient');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('+1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [providerLoading, setProviderLoading] = useState<OAuthProvider | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resetStates = () => {
      setProviderLoading(null);
      setIsSubmitting(false);
    };

    window.addEventListener('pageshow', resetStates);
    window.addEventListener('popstate', resetStates);
    window.addEventListener('focus', resetStates);

    return () => {
      window.removeEventListener('pageshow', resetStates);
      window.removeEventListener('popstate', resetStates);
      window.removeEventListener('focus', resetStates);
    };
  }, []);

  useFadeUp(containerRef);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'patient',
      countryCode: '+1',
      phoneNumber: '',
    },
  });

  const password = watch('password', '');
  const strength = passwordStrength(password);

  const handleRoleSelect = (role: 'patient' | 'doctor') => {
    setSelectedRole(role);
    setValue('role', role, { shouldValidate: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setAuthNotice(null);

    // Normalize phone number to E.164 standard format with selected country code
    const rawDigits = data.phoneNumber.replace(/[^\d]/g, '');
    const normalizedPhone = `${selectedCountryCode}${rawDigits}`;

    try {
      await api.post(
        '/auth/register',
        {
          username: data.username.trim(),
          fullName: data.username.trim(),
          email: data.email.trim(),
          phoneNumber: normalizedPhone,
          phone: normalizedPhone,
          password: data.password,
          role: data.role,
          ...(data.role === 'doctor'
            ? {
                specialty: data.specialty?.trim(),
                licenseNumber: data.licenseNumber?.trim(),
              }
            : {}),
        },
        { skipToast: true }
      );
      toast.success('Account Created Successfully!');
      navigate('/login');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create your account. Please try again.';
      setAuthNotice(message);

      if (
        message.includes('already exists') ||
        message.includes('taken') ||
        message.includes('409')
      ) {
        toast.error('An account with this email already exists.');
      } else if (
        message.includes('Connection') ||
        message.includes('Network') ||
        message.includes('unavailable') ||
        message.includes('ECONNREFUSED')
      ) {
        toast.error(`Connection Problem: ${message}`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const startProviderSignUp = (provider: OAuthProvider) => {
    if (providerLoading) return;
    setAuthNotice(null);
    setProviderLoading(provider);

    try {
      beginOAuth(provider, selectedRole);
    } catch (error) {
      setProviderLoading(null);
      const msg =
        error instanceof Error ? error.message : 'Unable to connect to sign-up provider.';
      setAuthNotice(msg);
      toast.error(msg);
    }
  };

  return (
    <main
      ref={containerRef}
      className="medivanta-register relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-3 sm:px-6 lg:py-5"
    >
      <div aria-hidden="true" className="medivanta-register-glow medivanta-register-glow-left" />
      <div aria-hidden="true" className="medivanta-register-glow medivanta-register-glow-right" />

      <div className="relative z-10 grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-7">
        <section className="gsap-card medivanta-register-panel flex flex-col justify-center rounded-[1.5rem] p-4 shadow-2xl sm:p-5 lg:p-6">
          <Link
            to="/"
            className="mb-2.5 inline-flex w-fit items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE]"
          >
            <AivoraLogo className="h-8 w-8" />
            <span className="text-base font-semibold tracking-tight text-white">Medivanta</span>
          </Link>

          <div className="mb-3">
            <h1 className="register-heading text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
              Your Journey to Better Health Starts Here
            </h1>
            <p className="mt-1 text-xs text-white/70">
              Create your Medivanta account for a more connected healthcare experience.
            </p>
          </div>

          <Card className="medivanta-register-card rounded-2xl border-white/10 p-3.5 shadow-xl sm:p-4">
            <p className="mb-2.5 text-xs text-white/60">
              Join Medivanta and keep your healthcare journey organized in one place.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5" noValidate>
              {/* Role Selection Cards */}
              <div>
                <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wider text-white/80">
                  Select Role <span className="text-[#C7FFBE]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Registration Role">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'patient'}
                    onClick={() => handleRoleSelect('patient')}
                    className={`group relative flex flex-col items-start rounded-xl border p-2.5 text-left transition-all duration-200 ${
                      selectedRole === 'patient'
                        ? 'border-[#C7FFBE] bg-[#C7FFBE]/10 shadow-[0_0_14px_rgba(199,255,190,0.15)] ring-1 ring-[#C7FFBE]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between mb-0.5">
                      <User className={`h-3.5 w-3.5 ${selectedRole === 'patient' ? 'text-[#C7FFBE]' : 'text-white/60'}`} />
                      {selectedRole === 'patient' && (
                        <span className="rounded-full bg-[#C7FFBE] px-1.5 py-0.2 text-[0.58rem] font-bold text-[#171B1A]">
                          Selected
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white">Patient</span>
                    <span className="text-[0.62rem] leading-3 text-white/55">Health records & appointments</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'doctor'}
                    onClick={() => handleRoleSelect('doctor')}
                    className={`group relative flex flex-col items-start rounded-xl border p-2.5 text-left transition-all duration-200 ${
                      selectedRole === 'doctor'
                        ? 'border-[#C7FFBE] bg-[#C7FFBE]/10 shadow-[0_0_14px_rgba(199,255,190,0.15)] ring-1 ring-[#C7FFBE]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between mb-0.5">
                      <Stethoscope className={`h-3.5 w-3.5 ${selectedRole === 'doctor' ? 'text-[#C7FFBE]' : 'text-white/60'}`} />
                      {selectedRole === 'doctor' && (
                        <span className="rounded-full bg-[#C7FFBE] px-1.5 py-0.2 text-[0.58rem] font-bold text-[#171B1A]">
                          Selected
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white">Doctor</span>
                    <span className="text-[0.62rem] leading-3 text-white/55">Clinical practice & portal</span>
                  </button>
                </div>
              </div>

              {/* Doctor Specific Fields */}
              {selectedRole === 'doctor' && (
                <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C7FFBE]">
                    <Stethoscope className="h-3.5 w-3.5" />
                    <span>Doctor Credentials</span>
                  </div>
                  <FormField
                    label="Medical Specialty"
                    type="text"
                    placeholder="e.g. Cardiology, Internal Medicine"
                    required
                    error={errors.specialty?.message}
                    {...register('specialty')}
                  />
                  <FormField
                    label="Medical License / Registration No."
                    type="text"
                    placeholder="e.g. MD-849201"
                    required
                    error={errors.licenseNumber?.message}
                    {...register('licenseNumber')}
                  />
                  <div className="flex items-start gap-1.5 rounded-lg bg-white/5 p-2 text-[0.65rem] leading-4 text-white/60">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#C7FFBE] mt-0.5" />
                    <span>Doctor accounts remain pending administrative verification before clinical access is granted.</span>
                  </div>
                </div>
              )}

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

              <FormField
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              {/* Phone Number with Country Calling Code Selector */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">
                  Phone Number <span className="text-[#C7FFBE]">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    aria-label="Country Calling Code"
                    className="w-28 rounded-xl border border-white/15 bg-[#171d1a] px-2.5 text-xs text-white focus:border-[#c7ffbe] focus:outline-none"
                  >
                    {COUNTRY_CALLING_CODES.map((item) => (
                      <option key={`${item.code}-${item.country}`} value={item.code} className="bg-[#171B1A] text-white">
                        {item.code} ({item.country})
                      </option>
                    ))}
                  </select>
                  <div className="flex-1">
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      autoComplete="tel-national"
                      required
                      className={`w-full rounded-xl border bg-[#171d1a] px-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[#c7ffbe] focus:outline-none ${
                        errors.phoneNumber ? 'border-red-500' : 'border-white/15'
                      }`}
                      {...register('phoneNumber')}
                    />
                  </div>
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-[0.68rem] text-red-400">{errors.phoneNumber.message}</p>
                )}
              </div>

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
                  className="medivanta-register-password-toggle absolute right-2.5 top-[30px] inline-flex h-8 w-8 items-center justify-center rounded-lg"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>

              <div className="medivanta-password-strength" aria-live="polite">
                <div className="flex items-center justify-between gap-3 text-xs">
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
                  className="medivanta-register-password-toggle absolute right-2.5 top-[30px] inline-flex h-8 w-8 items-center justify-center rounded-lg"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>

              {/* Set Up Face Scan Option */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C7FFBE]/10 text-[#C7FFBE]">
                    <ScanFace className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Biometric Face Verification</p>
                    <p className="text-[0.62rem] text-white/50">
                      {faceEnrolled ? 'Face scanned' : 'Optional biometric presence verification'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFaceModalOpen(true)}
                  className="text-xs px-2.5 py-1 border border-white/10 text-[#C7FFBE] hover:bg-[#C7FFBE]/10 min-h-8"
                >
                  {faceEnrolled ? 'Re-scan' : 'Set Up Scan'}
                </Button>
              </div>

              {authNotice && (
                <div className="medivanta-register-notice" role="alert" aria-live="polite">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C7FFBE]" aria-hidden="true" />
                  <p>{authNotice}</p>
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  className="medivanta-register-submit mt-1 min-h-10 w-full rounded-xl text-sm font-semibold shadow-lg transition-[transform,background-color,box-shadow] duration-200"
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? 'Creating account…'
                    : `Create ${selectedRole === 'doctor' ? 'Doctor' : 'Patient'} Account`}
                </Button>
                <p className="mt-1.5 text-center text-[0.72rem] text-white/50">
                  Your account. Your health journey. One connected experience.
                </p>
              </div>
            </form>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#202725] px-3 text-white/45">Or continue with</span>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="medivanta-register-provider flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium"
                onClick={() => startProviderSignUp('google')}
                disabled={isSubmitting || Boolean(providerLoading)}
                aria-label="Continue with Google"
                aria-busy={providerLoading === 'google'}
              >
                {providerLoading === 'google' ? <ProviderSpinner /> : <GoogleLogo className="h-4 w-4 shrink-0" />}
                <span>Google</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="medivanta-register-provider flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium"
                onClick={() => startProviderSignUp('apple')}
                disabled={isSubmitting || Boolean(providerLoading)}
                aria-label="Continue with Apple"
                aria-busy={providerLoading === 'apple'}
              >
                {providerLoading === 'apple' ? <ProviderSpinner /> : <AppleLogo className="h-4 w-4 shrink-0 fill-current" />}
                <span>Apple</span>
              </Button>
            </div>

            {providerLoading && (
              <p className="mt-2 text-center text-xs text-white/55" role="status" aria-live="polite">
                Connecting to {providerLoading === 'google' ? 'Google' : 'Apple'}…
              </p>
            )}

            <p className="mt-3 text-center text-xs text-white/60">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#C7FFBE] transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE]"
              >
                Sign in
              </Link>
            </p>
          </Card>
        </section>

        <aside className="gsap-card medivanta-register-face relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/10 shadow-2xl sm:min-h-[380px] lg:min-h-full">
          <div className="medivanta-register-face-model" aria-hidden="true">
            <Suspense fallback={<div className="medivanta-register-face-loading" aria-hidden="true" />}>
              <FaceScanModel followPointer />
            </Suspense>
          </div>
          <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between p-4 sm:p-6">
            <div className="flex justify-end">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[0.68rem] text-white/70 backdrop-blur">
                <UserRoundPlus className="h-3.5 w-3.5 text-[#C7FFBE]" aria-hidden="true" />
                Integrated Care Network
              </div>
            </div>
            <div />
          </div>
        </aside>
      </div>

      <FaceScanModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onComplete={() => setFaceEnrolled(true)}
        mode="enrollment"
      />
    </main>
  );
};
