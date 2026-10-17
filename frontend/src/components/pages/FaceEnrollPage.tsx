import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const FaceEnrollPage: React.FC = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/login');
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Card className="text-center py-8 px-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-5">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-textPrimary">Face sign-in is unavailable</h2>
          <p className="text-sm text-textSecondary mt-2 mb-6">
            This server does not support secure biometric enrollment, liveness detection, or server-verified face authentication. No face image or biometric data was captured or stored.
          </p>
          <p className="text-xs text-textSecondary mb-6">
            Use your password to sign in. Device passkeys can be added when the server supports WebAuthn; your device verifies its biometrics locally and does not enroll a face with this website.
          </p>
          <div className="space-y-3">
            <Button variant="primary" className="w-full py-2.5" onClick={handleContinue}>
              Continue to sign in
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
