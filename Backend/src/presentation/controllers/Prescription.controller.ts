import { Request, Response, NextFunction } from 'express';
import { PrescriptionApplicationService } from '../../application/prescription/PrescriptionApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../domain/errors/AppError';

export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionApplicationService) {}

  public createPrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { patientId, doctorId, medicines, diagnosis } = req.body;
      if (user?.role === 'doctor' && (!user.linkedId || user.linkedId !== doctorId)) {
        throw new AppError(403, 'Doctors can only create prescriptions under their own profile');
      }

      const prescriptionId = await this.prescriptionService.createPrescription({
        patientId,
        doctorId,
        medicines,
        diagnosis,
      });

      res.status(201).json({
        success: true,
        message: 'Prescription created successfully',
        prescriptionId,
      });
    } catch (error) {
      next(error);
    }
  };

  public getPrescriptionsByPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let patientId = String(req.params.patientId);
      const user = (req as AuthenticatedRequest).user;
      if (user?.role === 'patient') {
        const patientLinkedId = user.linkedId;
        if (!patientLinkedId || (patientId && patientId !== patientLinkedId)) {
          throw new AppError(403, 'Forbidden: Patients can only access their own data');
        }
        patientId = patientLinkedId;
        req.params.patientId = patientLinkedId;
      }

      const prescriptions = await this.prescriptionService.getPrescriptionsByPatient(patientId);

      const data = prescriptions.map((p) => ({
        prescriptionId: p.prescriptionId,
        patientId: p.patientId,
        doctorId: p.doctorId,
        medicines: p.medicines,
        diagnosis: p.diagnosis,
        createdAt: p.createdAt,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public getPrescriptionsByDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctorId = String(req.params.doctorId);
      const user = (req as AuthenticatedRequest).user;
      if (user?.role === 'doctor' && (!user.linkedId || user.linkedId !== doctorId)) {
        throw new AppError(403, 'Doctors can only view their own prescriptions');
      }
      const prescriptions = await this.prescriptionService.getPrescriptionsByDoctor(doctorId);

      const data = prescriptions.map((p) => ({
        prescriptionId: p.prescriptionId,
        patientId: p.patientId,
        doctorId: p.doctorId,
        medicines: p.medicines,
        diagnosis: p.diagnosis,
        createdAt: p.createdAt,
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
