import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../shared/services/api';
import { useAuthStore } from '../../store/authStore';
import { FaceScanModal } from '../molecules/FaceScanModal';

interface FaceEnrollmentResponse {
  enrolled: boolean;
  faceEnrollmentStatus: string;
}

export const FaceEnrollPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);

  const finish = useCallback(() => {
    if (user) {
      navigate(user.role.toLowerCase() === 'patient' ? '/portal' : '/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  const enrollFace = useCallback(async (image: Blob) => {
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
    ) as unknown as FaceEnrollmentResponse;

    if (!result.enrolled || result.faceEnrollmentStatus !== 'enrolled') {
      throw new Error('The server did not confirm face enrollment. Please retry.');
    }

    if (user && token) {
      login({ ...user, faceEnrollmentStatus: 'enrolled' }, token);
    }
    toast.success('Face enrollment completed.');
  }, [login, token, user]);

  return (
    <main className="min-h-screen bg-[#171B1A]">
      <FaceScanModal
        isOpen
        onClose={finish}
        mode="enrollment"
        onEnrollmentCapture={enrollFace}
      />
    </main>
  );
};
