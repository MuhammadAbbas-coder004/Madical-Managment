import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace } from 'lucide-react';
import { Card } from '../molecules/Card';
import { Button } from '../atoms/Button';
import { useFadeUp } from '../../shared/hooks/useFadeUp';

export const FaceEnrollPage: React.FC = () => {
  const navigate = useNavigate();

  const handleScanFace = () => {
    console.log('Starting face enrollment with FaceIO...');
    // TODO: Wire up FaceIO fio.js SDK enrollment here
    navigate('/login');
  };

  const handleSkip = () => {
    console.log('Skipped face enrollment for now.');
    navigate('/login');
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useFadeUp(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Card className="text-center py-8 px-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-5">
            <ScanFace className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-textPrimary">Set Up Face Authentication</h2>
          <p className="text-sm text-textSecondary mt-2 mb-6">
            Enable instant, secure facial login for emergency and clinical room access.
          </p>
          <div className="space-y-3">
            <Button variant="primary" className="w-full py-2.5 flex items-center justify-center gap-2"
              onClick={handleScanFace}>
              <ScanFace className="w-4 h-4" />
              Scan My Face
            </Button>
            <Button variant="secondary" className="w-full py-2.5" onClick={handleSkip}>
              Skip for Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
