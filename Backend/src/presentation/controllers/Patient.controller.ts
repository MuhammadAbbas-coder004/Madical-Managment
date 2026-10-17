import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PatientApplicationService } from '../../application/patient/PatientApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { PatientModel } from '../../infrastructure/database/schemas/Patient.schema';
import { AppError } from '../../domain/errors/AppError';

export class PatientController {
  constructor(private readonly patientService: PatientApplicationService) {}

  public createPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { firstName, lastName, email, phone, dateOfBirth } = req.body;

      const patientId = await this.patientService.createPatient({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
      });

      await UserModel.findOneAndUpdate(
        { email: email.trim().toLowerCase(), role: 'patient' },
        { linkedId: patientId }
      );

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        patientId,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMyPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;

      if (!user || user.role !== 'patient') {
        throw new AppError(403, 'Forbidden');
      }

      let linkedId = user.linkedId;
      if (!linkedId) {
        let patientDoc = await PatientModel.findOne({ email: user.email });
        if (!patientDoc) {
          const nameParts = (user.username || 'Patient User').trim().split(/\s+/);
          const firstName = nameParts[0] || 'Patient';
          const lastName = nameParts.slice(1).join(' ') || 'User';
          const newPatientId = randomUUID();
          patientDoc = await PatientModel.create({
            patientId: newPatientId,
            firstName,
            lastName,
            email: user.email,
            phone: 'Not provided',
            dateOfBirth: new Date('2000-01-01'),
          });
        }
        linkedId = patientDoc.patientId;
        user.linkedId = linkedId;
        await user.save();
      }

      const patient = await this.patientService.getPatient(linkedId);
      res.status(200).json({
        success: true,
        data: {
          patientId: patient.patientId.getValue(),
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: patient.fullName,
          email: patient.email.getValue(),
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      let patientId = String(req.params.patientId);

      if (user?.role === 'patient') {
        let patientLinkedId = user.linkedId;
        if (!patientLinkedId && user.userId) {
          const u = await UserModel.findById(user.userId);
          patientLinkedId = u?.linkedId;
        }
        if (!patientLinkedId || (patientId && patientId !== patientLinkedId)) {
          throw new AppError(403, 'Forbidden: Patients can only access their own data');
        }
        if (patientLinkedId) {
          patientId = patientLinkedId;
          req.params.patientId = patientLinkedId;
        }
      }

      const patient = await this.patientService.getPatient(patientId);

      res.status(200).json({
        success: true,
        data: {
          patientId: patient.patientId.getValue(),
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: patient.fullName,
          email: patient.email.getValue(),
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patients = await this.patientService.getAllPatients();

      const data = patients.map((patient) => ({
        patientId: patient.patientId.getValue(),
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName: patient.fullName,
        email: patient.email.getValue(),
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
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
