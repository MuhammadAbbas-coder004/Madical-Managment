import { Request, Response, NextFunction } from 'express';
import { MedicalRecordApplicationService } from '../../application/medical-record/MedicalRecordApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../domain/errors/AppError';

export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordApplicationService) {}

  public createRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { patientId, doctorId, diagnosis, notes, allergies } = req.body;
      if (user?.role === 'doctor' && (!user.linkedId || user.linkedId !== doctorId)) {
        throw new AppError(403, 'Doctors can only create records under their own profile');
      }

      const recordId = await this.medicalRecordService.createRecord({
        patientId,
        doctorId,
        diagnosis,
        notes,
        allergies: allergies || [],
      });

      res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        recordId,
      });
    } catch (error) {
      next(error);
    }
  };

  public getRecordsByPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const records = await this.medicalRecordService.getRecordsByPatient(patientId);

      const data = records.map((r) => ({
        recordId: r.recordId,
        patientId: r.patientId,
        doctorId: r.doctorId,
        diagnosis: r.diagnosis,
        notes: r.notes,
        allergies: r.allergies,
        createdAt: r.createdAt,
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
