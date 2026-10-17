import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Scan, ShieldAlert, ShieldCheck, X } from 'lucide-react';

interface FaceScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  mode: 'enrollment' | 'login';
}

type ScanStage = 'idle' | 'initializing' | 'ready' | 'scanning' | 'verified' | 'failed';

export const FaceScanModal: React.FC<FaceScanModalProps> = ({
  isOpen,
  onClose,
  mode,
}) => {
  const [stage, setStage] = useState<ScanStage>('idle');
  const [failureReason, setFailureReason] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const unavailableMessage = mode === 'login'
    ? 'Face sign-in is unavailable because this server has no server-side biometric verification service. Please sign in with your email and password.'
    : 'Face enrollment is unavailable because this server has no server-side biometric enrollment service.';
  const displayStage = stage;

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleClose = () => {
    stopCamera();
    setStage('idle');
    setFailureReason('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) stopCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    stopCamera();
    setFailureReason('');
    setStage('initializing');

    try {
      if (!window.isSecureContext) {
        throw new Error('Camera access requires a secure HTTPS connection or localhost.');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      const requestId = ++cameraRequestRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        throw new Error('The camera preview is unavailable. Please try again.');
      }
      video.srcObject = stream;
      await video.play();

      if (requestId === cameraRequestRef.current) setStage('ready');
    } catch (error: unknown) {
      stopCamera();
      setStage('failed');
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setFailureReason('Camera permission was denied. Allow camera access in your browser settings, then retry.');
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        setFailureReason('No camera was found on this device.');
      } else if (error instanceof Error && error.name === 'NotReadableError') {
        setFailureReason('The camera is unavailable or already in use by another application.');
      } else {
        setFailureReason(error instanceof Error ? error.message : 'Unable to access the camera. Please try again.');
      }
    }
  };

  const handleVerify = async () => {
    const video = videoRef.current;
    if (!video || stage !== 'ready' || !video.videoWidth || !video.videoHeight) {
      setStage('failed');
      setFailureReason('The camera has not produced a usable frame. Please retry the camera preview.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setStage('failed');
      setFailureReason('A camera frame could not be captured. Please retry.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const capture = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    canvas.width = 0;
    canvas.height = 0;
    setStage('failed');
    setFailureReason(capture ? unavailableMessage : 'A camera frame could not be captured. Please retry.');
    stopCamera();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="face-verification-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-[#C7FFBE]/20 bg-[#171B1A] p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(199,255,190,0.08)] text-white">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#C7FFBE] animate-ping" />
              <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-[#C7FFBE]">
                Biometric Engine
              </span>
            </div>
            <h2 id="face-verification-heading" className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Face Verification
            </h2>
            <p className="mt-1 text-xs text-white/65">
              {mode === 'login' ? 'Face sign-in is currently unavailable.' : 'Face enrollment is currently unavailable.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close biometric modal"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport Container */}
        <div className="my-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#C7FFBE]/30 bg-[#0E1211] shadow-[0_0_30px_rgba(199,255,190,0.12)]">
            {/* Live Video Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                displayStage === 'ready' || displayStage === 'scanning' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Technical grid backdrop (when camera is not active) */}
            {displayStage !== 'ready' && displayStage !== 'scanning' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: `radial-gradient(rgba(199,255,190,0.4) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                  aria-hidden="true"
                />

                {displayStage === 'idle' && (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C7FFBE]/30 bg-[#C7FFBE]/10 text-[#C7FFBE] shadow-[0_0_24px_rgba(199,255,190,0.2)]">
                      <Camera className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-semibold text-white">Live Camera Preview</p>
                    <p className="mt-1 max-w-xs text-xs text-white/55">
                      Click start to preview your camera. Video stays in this browser and is not used to authenticate.
                    </p>
                  </div>
                )}

                {displayStage === 'initializing' && (
                  <div className="relative z-10 flex flex-col items-center">
                    <RefreshCw className="h-9 w-9 animate-spin text-[#C7FFBE]" />
                    <p className="mt-3 text-sm font-medium text-white">Preparing your camera…</p>
                    <p className="mt-1 text-xs text-white/50">Requesting browser camera permission…</p>
                  </div>
                )}

                {displayStage === 'verified' && (
                  <div className="relative z-10 flex flex-col items-center animate-fade-in">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-[#C7FFBE] bg-[#C7FFBE]/15 text-[#C7FFBE] shadow-[0_0_30px_rgba(199,255,190,0.4)]">
                      <ShieldCheck className="h-9 w-9" />
                    </div>
                    <p className="text-base font-bold text-[#C7FFBE]">Identity verified successfully.</p>
                    <p className="mt-1 text-xs text-white/60">Biometric presence attested.</p>
                  </div>
                )}

                {displayStage === 'failed' && (
                  <div className="relative z-10 flex flex-col items-center max-w-sm px-4">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
                      <ShieldAlert className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-semibold text-white">Camera / Verification Status</p>
                    <p role="alert" className="mt-2 text-xs leading-relaxed text-white/70">{failureReason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Overlays on Live Video */}
            {(displayStage === 'ready' || displayStage === 'scanning') && (
              <>
                {/* Elegant Corner Brackets */}
                <div className="pointer-events-none absolute inset-6 flex flex-col justify-between" aria-hidden="true">
                  <div className="flex justify-between">
                    <div className="h-8 w-8 border-l-2 border-t-2 border-[#C7FFBE] rounded-tl-lg shadow-[-2px_-2px_10px_rgba(199,255,190,0.5)]" />
                    <div className="h-8 w-8 border-r-2 border-t-2 border-[#C7FFBE] rounded-tr-lg shadow-[2px_-2px_10px_rgba(199,255,190,0.5)]" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-8 w-8 border-l-2 border-b-2 border-[#C7FFBE] rounded-bl-lg shadow-[-2px_2px_10px_rgba(199,255,190,0.5)]" />
                    <div className="h-8 w-8 border-r-2 border-b-2 border-[#C7FFBE] rounded-br-lg shadow-[2px_2px_10px_rgba(199,255,190,0.5)]" />
                  </div>
                </div>

                {/* Subtle Centered Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <div className="h-44 w-36 rounded-[50%] border border-[#C7FFBE]/30 shadow-[0_0_20px_rgba(199,255,190,0.15)]" />
                </div>

                {/* Smooth Scanning Laser Beam */}
                {displayStage === 'scanning' && (
                  <div
                    className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C7FFBE] to-transparent shadow-[0_0_15px_#C7FFBE]"
                    style={{
                      animation: 'medivanta-scan-beam 2.2s ease-in-out infinite alternate',
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* Status Badge overlay */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs">
                  <span className="flex items-center gap-2 text-white/80">
                    <span className={`h-2 w-2 rounded-full ${displayStage === 'scanning' ? 'bg-[#C7FFBE] animate-ping' : 'bg-[#C7FFBE]'}`} />
                    {displayStage === 'scanning' ? 'Scanning in progress…' : 'Camera ready — position your face in the frame.'}
                  </span>
                  <span className="font-mono text-[0.65rem] text-[#C7FFBE]">LIVE 60FPS</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {displayStage === 'idle' && (
            <>
              <button
                type="button"
                onClick={startCamera}
                className="group relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C7FFBE] bg-[#171B1A] px-4 py-2.5 text-sm font-semibold text-[#C7FFBE] shadow-[0_0_20px_rgba(199,255,190,0.18)] transition-all duration-200 hover:bg-[#1E2522] hover:shadow-[0_0_28px_rgba(199,255,190,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE] active:scale-[0.99]"
              >
                <Camera className="h-4 w-4 shrink-0 text-[#C7FFBE] transition-transform group-hover:scale-110" aria-hidden="true" />
                <span>Start Face Scan</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
            </>
          )}

          {displayStage === 'initializing' && (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C7FFBE]/40 bg-[#171B1A] px-4 py-2.5 text-sm font-semibold text-[#C7FFBE]/70 cursor-not-allowed opacity-80"
            >
              <RefreshCw className="h-4 w-4 animate-spin text-[#C7FFBE]" />
              <span>Preparing your camera…</span>
            </button>
          )}

          {displayStage === 'ready' && (
            <>
              <button
                type="button"
                onClick={handleVerify}
                className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C7FFBE] bg-[#171B1A] px-4 py-2.5 text-sm font-semibold text-[#C7FFBE] shadow-[0_0_24px_rgba(199,255,190,0.24)] transition-all duration-200 hover:bg-[#1E2522] hover:shadow-[0_0_32px_rgba(199,255,190,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE] active:scale-[0.99]"
              >
                <Scan className="h-4 w-4 shrink-0 text-[#C7FFBE] transition-transform group-hover:scale-110" />
                <span>Verify Face Presence</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
            </>
          )}

          {displayStage === 'scanning' && (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C7FFBE]/50 bg-[#171B1A] px-4 py-2.5 text-sm font-semibold text-[#C7FFBE] cursor-wait"
            >
              <RefreshCw className="h-4 w-4 animate-spin text-[#C7FFBE]" />
              <span>Scanning in progress…</span>
            </button>
          )}

          {displayStage === 'verified' && (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C7FFBE] bg-[#C7FFBE]/15 px-4 py-2.5 text-sm font-semibold text-[#C7FFBE]"
            >
              <ShieldCheck className="h-5 w-5 text-[#C7FFBE]" />
              <span>Identity verified successfully.</span>
            </button>
          )}

          {displayStage === 'failed' && (
            <>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C7FFBE] bg-[#171B1A] px-4 py-2.5 text-sm font-semibold text-[#C7FFBE] shadow-[0_0_20px_rgba(199,255,190,0.18)] transition-all duration-200 hover:bg-[#1E2522] hover:shadow-[0_0_28px_rgba(199,255,190,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FFBE]"
              >
                <RefreshCw className="h-4 w-4 shrink-0 text-[#C7FFBE]" />
                <span>Retry Face Scan</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {mode === 'login' ? 'Sign in with Password Instead' : 'Close'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
