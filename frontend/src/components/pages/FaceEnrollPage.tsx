import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Info, LoaderCircle, ScanFace, ShieldAlert, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
import { FaceScanModal } from '../molecules/FaceScanModal';

interface FaceEnrollmentResponse {
  enrolled?: boolean;
  deleted?: boolean;
  faceEnrollmentStatus?: string;
}

export const FaceEnrollPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [enrollmentAvailable, setEnrollmentAvailable] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | undefined>(
    user?.faceEnrollmentStatus
  );
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/auth/session', { skipToast: true })
      .then((response) => {
        const session = response as {
          user?: typeof user & {
            faceEnrollmentAvailable?: boolean;
            faceEnrollmentStatus?: string;
          };
        };
        if (!active) return;
        if (!session.user || !token) {
          logout();
          navigate('/login', { replace: true });
          return;
        }
        setEnrollmentAvailable(Boolean(session.user.faceEnrollmentAvailable));
        setEnrollmentStatus(session.user.faceEnrollmentStatus);
        login(session.user, token);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof Error
          ? requestError.message
          : 'Unable to check face enrollment for this account.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [login, logout, navigate, token]);

  const finish = useCallback(() => {
    navigate(user?.role.toLowerCase() === 'patient' ? '/portal' : '/dashboard', { replace: true });
  }, [navigate, user?.role]);

  const enrollFace = useCallback(async (image: Blob) => {
    setError('');
    const formData = new FormData();
    formData.append('image', image, 'face-enrollment.jpg');
    formData.append('consent', 'true');
    const result = await api.post(
      '/auth/face-enroll',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipToast: true,
      }
    ) as FaceEnrollmentResponse;

    if (!result.enrolled || result.faceEnrollmentStatus !== 'enrolled') {
      throw new Error('The server did not confirm that your face template and consent were saved. Please retry.');
    }

    setEnrollmentStatus('enrolled');
    if (user && token) {
      login({ ...user, faceEnrollmentStatus: 'enrolled', faceEnrollmentAvailable: true }, token);
    }
    toast.success('Face enrollment completed and saved to your account.');
  }, [login, token, user]);


  const deleteEnrollment = async () => {
    if (!window.confirm(
      'Delete your saved face template and withdraw face sign-in consent? You will no longer be able to use Face Login until you enroll again.'
    )) return;

    setIsDeleting(true);
    setError('');
    try {
      const result = await api.delete('/auth/face-enroll', {
        skipToast: true,
      }) as FaceEnrollmentResponse;
      if (!result.deleted || result.faceEnrollmentStatus !== 'not_enrolled') {
        throw new Error('The server did not confirm deletion of your face enrollment.');
      }
      setEnrollmentStatus('not_enrolled');
      if (user && token) {
        login({ ...user, faceEnrollmentStatus: 'not_enrolled' }, token);
      }
      toast.success('Face template deleted and consent withdrawn.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error
        ? requestError.message
        : 'Face enrollment could not be deleted. Please retry.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Track whether the user just completed enrollment in this session
  const [enrolledThisSession, setEnrolledThisSession] = useState(false);

  const enrollFaceWithSession = useCallback(async (image: Blob) => {
    await enrollFace(image);
    setEnrolledThisSession(true);
  }, [enrollFace]);

  const isEnrolled = enrollmentStatus === 'enrolled';

  return (
    <main className="min-h-screen bg-[#171B1A] px-4 py-10 text-white sm:px-6">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-[#C7FFBE]/20 bg-[#202725] p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C7FFBE]/10 text-[#C7FFBE]">
            <ScanFace className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C7FFBE]">Account security</p>
            <h1 className="text-2xl font-bold">Face sign-in</h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-white/70">
          With your explicit consent, Medivanta sends one camera frame to its local face service.
          The service creates an embedding in memory; the image is not saved. Only an encrypted
          template linked to your account is stored. Face sign-in is optional and does not detect
          presentation attacks.
        </p>

        {/* Step-by-step enrollment instructions */}
        <div className="my-5 rounded-xl border border-[#C7FFBE]/20 bg-[#C7FFBE]/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-[#C7FFBE]">
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">How to set up Face Sign-in</span>
          </div>
          <ol className="space-y-2 text-sm text-white/75" aria-label="Face sign-in setup steps">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7FFBE]/20 text-[0.65rem] font-bold text-[#C7FFBE]">1</span>
              <span>Sign in with your <strong className="text-white">email and password</strong> to reach this page. (You must be logged in to enroll.)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7FFBE]/20 text-[0.65rem] font-bold text-[#C7FFBE]">2</span>
              <span>Read and accept the <strong className="text-white">biometric consent</strong> shown in the face registration dialog. Your data is processed locally and only an encrypted template is stored.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7FFBE]/20 text-[0.65rem] font-bold text-[#C7FFBE]">3</span>
              <span>Click <strong className="text-white">Start Camera Preview</strong> and allow your browser to access the camera when prompted.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7FFBE]/20 text-[0.65rem] font-bold text-[#C7FFBE]">4</span>
              <span>Position your face inside the guide oval, then click <strong className="text-white">Enroll Face</strong> to capture and submit your face template.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7FFBE]/20 text-[0.65rem] font-bold text-[#C7FFBE]">5</span>
              <span>A <strong className="text-[#C7FFBE]">confirmation message</strong> will appear here. From now on, use <strong className="text-white">Sign in with Face</strong> on the login page.</span>
            </li>
          </ol>
        </div>

        <div className="my-6 rounded-xl border border-white/10 bg-black/20 p-4">
          {isLoading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-white/70">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking your enrollment…
            </p>
          ) : isEnrolled && enrolledThisSession ? (
            // Just-enrolled success message
            <div role="status" className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#C7FFBE]">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Face registration successful!
              </p>
              <p className="text-sm text-white/70">
                Next time, choose <strong className="text-white">Face Login</strong> on the login page to sign in with your face.
              </p>
            </div>
          ) : isEnrolled ? (
            <p role="status" className="flex items-center gap-2 text-sm font-semibold text-[#C7FFBE]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Face sign-in is enrolled for this account.
            </p>
          ) : (
            <p className="text-sm text-white/75">
              No saved face enrollment is active for this account.
            </p>
          )}
        </div>

        {!enrollmentAvailable && !isLoading && (
          <p role="alert" className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            Face enrollment is not available on this server. Password sign-in remains available.
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {!isEnrolled && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setIsEnrollmentOpen(true);
              }}
              disabled={isLoading || !enrollmentAvailable}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#C7FFBE] px-4 text-sm font-semibold text-[#171B1A] hover:bg-[#d8ffd1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ScanFace className="h-4 w-4" aria-hidden="true" />
              Enroll my face
            </button>
          )}
          {isEnrolled && (
            <button
              type="button"
              onClick={deleteEnrollment}
              disabled={isDeleting}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-300/40 px-4 text-sm font-semibold text-red-100 hover:bg-red-300/10 disabled:opacity-50"
            >
              {isDeleting
                ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              Withdraw consent and delete template
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white hover:bg-white/5"
          >
            Return to account
          </button>
        </div>
      </section>

      <FaceScanModal
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        mode="enrollment"
        onEnrollmentCapture={enrollFaceWithSession}
      />
    </main>
  );
};
