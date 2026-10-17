import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';
import api from '../../shared/services/api';
import { COOKIE_SESSION, useAuthStore } from '../../store/authStore';
import { Spinner } from '../atoms/Spinner';

const failureMessages: Record<string, string> = {
  cancelled: 'Sign-in was cancelled. You can try again whenever you are ready.',
  invalid_callback: 'The sign-in response could not be verified. Please start again.',
  account_conflict: 'An account already uses this email with another sign-in method. Sign in using that method first.',
  database_unavailable: 'We could not reach the account database. Your sign-in was not completed; please try again later.',
  not_configured: 'This sign-in provider is not configured on the server yet.',
  provider_error: 'The identity provider could not complete sign-in. Please try again.',
};

interface SessionResponse {
  user?: {
    id: string;
    username?: string;
    email: string;
    role: string;
    patientId?: string;
    doctorId?: string;
  };
}

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const status = searchParams.get('status');
  const reason = searchParams.get('reason') || 'provider_error';
  const provider = searchParams.get('provider');
  const error = status === 'success'
    ? sessionError
    : failureMessages[reason] || failureMessages.provider_error;

  useEffect(() => {
    if (status !== 'success') return;

    let active = true;
    api.get('/auth/session', { skipToast: true })
      .then((response) => {
        if (!active) return;
        const { user } = response as SessionResponse;
        if (!user) throw new Error('The server did not return the authenticated account.');
        login(user, COOKIE_SESSION);
        toast.success('Welcome Back!');
        navigate('/dashboard', { replace: true });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        const message = caught instanceof Error
          ? caught.message
          : 'Unable to complete sign-in. Please try again.';
        setSessionError(message);
      });

    return () => {
      active = false;
    };
  }, [login, navigate, status]);

  if (!error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#171B1A] px-5 text-white">
        <div role="status" className="flex items-center gap-3 text-sm text-white/75">
          <Spinner size="sm" />
          Verifying {provider === 'apple' ? 'Apple' : 'Google'} sign-in…
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#171B1A] px-5 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#202725] p-8 text-center shadow-2xl">
        <ShieldAlert className="mx-auto mb-4 h-9 w-9 text-[#C7FFBE]" aria-hidden="true" />
        <h1 className="mb-3 text-2xl font-semibold">Sign-in could not be completed</h1>
        <p role="alert" className="mb-7 text-sm leading-6 text-white/65">{error}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-[#C7FFBE] px-5 py-3 text-sm font-semibold text-[#171B1A] hover:bg-[#d8ffd1]" to="/login">
            Try signing in
          </Link>
          <Link className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5" to="/register">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
};
