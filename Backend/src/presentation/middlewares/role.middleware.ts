import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { PatientModel } from '../../infrastructure/database/schemas/Patient.schema';

const doctorVerificationMessage = 'Doctor account verification is pending';

const isDoctorVerified = async (userId: string): Promise<boolean> => {
  const user = await UserModel.findById(userId).select('role doctorVerificationStatus');
  return user?.role === 'doctor' && user.doctorVerificationStatus === 'verified';
};

/**
 * Role-based authorization middleware.
 * Runs after authMiddleware.
 * Validates req.user.role against the allowed roles.
 * Admin has full access. Doctors must be approved before accessing clinician routes.
 * Returns 403 Forbidden if the role is not allowed or doctor approval is pending.
 */
export const requireRole = (...roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userRole = req.user.role.toLowerCase();
    const normalizedAllowedRoles = roles.map((r) => r.toLowerCase());

    if (userRole === 'admin') {
      next();
      return;
    }

    if (!normalizedAllowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions to access this resource',
      });
      return;
    }

    if (userRole === 'doctor') {
      if (!req.user.userId || !(await isDoctorVerified(req.user.userId))) {
        res.status(403).json({
          success: false,
          message: doctorVerificationMessage,
        });
        return;
      }
    }

    next();
  };
};

/**
 * Ensures patients can only access their own records while authorized staff have access.
 * Runs after authMiddleware.
 * - If user is admin or an authorized staff role (e.g. doctor, nurse), allows access.
 * - If user is patient:
 *     1. Validates that patient is accessing their own data.
 *     2. Returns 403 Forbidden if patient tries to access another patient's data.
 *     3. Forces patientId parameter from the authenticated user token.
 */
export const requirePatientSelfOrRole = (
  paramName: string = 'patientId',
  ...allowedStaffRoles: string[]
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.role) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const userRole = req.user.role.toLowerCase();
      const staffRoles = (
        allowedStaffRoles.length > 0 ? allowedStaffRoles : ['admin', 'doctor', 'nurse']
      ).map((r) => r.toLowerCase());

      if (userRole === 'admin') {
        next();
        return;
      }

      if (staffRoles.includes(userRole)) {
        if (
          userRole === 'doctor' &&
          (!req.user.userId || !(await isDoctorVerified(req.user.userId)))
        ) {
          res.status(403).json({
            success: false,
            message: doctorVerificationMessage,
          });
          return;
        }
        next();
        return;
      }

      // Patients must only access their own records
      if (userRole === 'patient') {
        const targetPatientId = req.params[paramName] || req.body?.[paramName] || (req.query?.[paramName] as string | undefined);
        let patientLinkedId = req.user.linkedId;

        // Resolve linkedId if not in token
        if (!patientLinkedId && req.user.userId) {
          const user = await UserModel.findById(req.user.userId);
          patientLinkedId = user?.linkedId;
          if (!patientLinkedId && user?.email) {
            const patient = await PatientModel.findOne({ email: user.email });
            patientLinkedId = patient?.patientId;
          }
        }

        if (!patientLinkedId) {
          res.status(403).json({
            success: false,
            message: 'Forbidden: No patient profile linked to this account',
          });
          return;
        }

        // Return 403 Forbidden if patient attempts to access another patient's records
        if (targetPatientId && String(targetPatientId) !== String(patientLinkedId)) {
          res.status(403).json({
            success: false,
            message: 'Forbidden: Patients can only access their own data',
          });
          return;
        }

        // Force patientId parameter from the authenticated user token
        req.params[paramName] = patientLinkedId;
        if (req.body && typeof req.body === 'object') {
          req.body[paramName] = patientLinkedId;
        }
        req.user.linkedId = patientLinkedId;

        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions to access this resource',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Authorization error',
      });
    }
  };
};
