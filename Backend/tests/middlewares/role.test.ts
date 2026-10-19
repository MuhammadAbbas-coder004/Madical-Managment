import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';
import { requirePatientSelfOrRole, requireRole } from '../../src/presentation/middlewares/role.middleware';
import { AuthenticatedRequest } from '../../src/presentation/middlewares/auth.middleware';
import { UserModel } from '../../src/infrastructure/database/schemas/User.schema';
import { AppointmentModel } from '../../src/infrastructure/database/schemas/Appointment.schema';

describe('Role & Patient Access Control Middleware', () => {
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('requirePatientSelfOrRole', () => {
    it('should allow admins and nurses to access any patient data', async () => {
      const middleware = requirePatientSelfOrRole('patientId', 'doctor', 'nurse');

      const staffRoles = ['admin', 'nurse'];
      for (const role of staffRoles) {
        mockNext.mockClear();
        const req: Partial<AuthenticatedRequest> = {
          user: { userId: 'staff-1', role },
          params: { patientId: 'patient-999' },
        };

        await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      }
    });

    it('allows verified doctors to access their assigned patients', async () => {
      const findById = vi.spyOn(UserModel, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          role: 'doctor',
          doctorVerificationStatus: 'verified',
        }),
      } as never);
      const appointmentExists = vi.spyOn(AppointmentModel, 'exists').mockResolvedValue({ _id: 'appointment-1' } as never);
      const middleware = requirePatientSelfOrRole('patientId', 'doctor', 'nurse');

      try {
        await middleware(
          {
            user: { userId: 'doctor-1', role: 'doctor', linkedId: 'doctor-profile-1' },
            params: { patientId: 'patient-1' },
          } as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
        expect(appointmentExists).toHaveBeenCalledWith({
          doctorId: 'doctor-profile-1',
          patientId: 'patient-1',
        });
      } finally {
        findById.mockRestore();
        appointmentExists.mockRestore();
      }
    });

    it('blocks doctors from accessing patients without an appointment relationship', async () => {
      const findById = vi.spyOn(UserModel, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          role: 'doctor',
          doctorVerificationStatus: 'verified',
        }),
      } as never);
      const appointmentExists = vi.spyOn(AppointmentModel, 'exists').mockResolvedValue(null);
      const middleware = requirePatientSelfOrRole('patientId', 'doctor', 'nurse');

      try {
        await middleware(
          {
            user: { userId: 'doctor-1', role: 'doctor', linkedId: 'doctor-profile-1' },
            params: { patientId: 'unassigned-patient' },
          } as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      } finally {
        findById.mockRestore();
        appointmentExists.mockRestore();
      }
    });

    it('blocks unverified doctors from staff routes', async () => {
      const findById = vi.spyOn(UserModel, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          role: 'doctor',
          doctorVerificationStatus: 'pending',
        }),
      } as never);
      const middleware = requirePatientSelfOrRole('patientId', 'doctor', 'nurse');

      try {
        await middleware(
          {
            user: { userId: 'doctor-1', role: 'doctor' },
            params: { patientId: 'patient-1' },
          } as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Doctor account verification is pending',
        });
      } finally {
        findById.mockRestore();
      }
    });

    it('returns a rejected status message for doctors whose credentials were rejected', async () => {
      const findById = vi.spyOn(UserModel, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          role: 'doctor',
          doctorVerificationStatus: 'rejected',
        }),
      } as never);
      const middleware = requireRole('admin', 'doctor');

      try {
        await middleware(
          {
            user: { userId: 'doctor-1', role: 'doctor' },
            params: {},
          } as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Doctor verification was not approved. Please contact an administrator.',
        });
      } finally {
        findById.mockRestore();
      }
    });

    it('should allow patient to access their own records and force patientId from token', async () => {
      const middleware = requirePatientSelfOrRole('patientId');
      const req: Partial<AuthenticatedRequest> = {
        user: { userId: 'user-1', role: 'patient', linkedId: 'patient-123' },
        params: { patientId: 'patient-123' },
      };

      await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.params!.patientId).toBe('patient-123');
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 when a patient tries to access another patient data', async () => {
      const middleware = requirePatientSelfOrRole('patientId');
      const req: Partial<AuthenticatedRequest> = {
        user: { userId: 'user-1', role: 'patient', linkedId: 'patient-123' },
        params: { patientId: 'other-patient-456' },
      };

      await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden: Patients can only access their own data',
      });
    });

    it('should force patientId from token when URL params is empty or missing for a patient', async () => {
      const middleware = requirePatientSelfOrRole('patientId');
      const req: Partial<AuthenticatedRequest> = {
        user: { userId: 'user-1', role: 'patient', linkedId: 'patient-123' },
        params: {},
      };

      await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.params!.patientId).toBe('patient-123');
    });

    it('should return 401 when request is not authenticated', async () => {
      const middleware = requirePatientSelfOrRole('patientId');
      const req: Partial<AuthenticatedRequest> = {
        params: { patientId: 'patient-123' },
      };

      await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });
  });

  describe('requireRole', () => {
    it('should allow an approved user with a matching doctor role', async () => {
      const middleware = requireRole('admin', 'doctor');
      const req: Partial<AuthenticatedRequest> = {
        user: { userId: 'u1', role: 'doctor' },
      };
      const findById = vi.spyOn(UserModel, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          role: 'doctor',
          doctorVerificationStatus: 'verified',
        }),
      } as never);
      const appointmentExists = vi.spyOn(AppointmentModel, 'exists').mockResolvedValue(null);

      try {
        await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      } finally {
        findById.mockRestore();
        appointmentExists.mockRestore();
      }
    });

    it('should return 403 when a doctor has not been approved', async () => {
      const middleware = requireRole('admin', 'doctor');
      const req: Partial<AuthenticatedRequest> = {
        user: { userId: 'u1', role: 'doctor' },
      };
      const findById = vi.spyOn(UserModel, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          role: 'doctor',
          doctorVerificationStatus: 'pending',
        }),
      } as never);

      try {
        await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Doctor account verification is pending',
        });
      } finally {
        findById.mockRestore();
      }
    });

    it('should return 403 when user role is not authorized', async () => {
      const middleware = requireRole('admin');
      const req: Partial<AuthenticatedRequest> = {
        user: { userId: 'u1', role: 'patient' },
      };

      await middleware(req as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
