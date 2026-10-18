import { Request, Response, NextFunction } from 'express';
import { DoctorApplicationService } from '../../application/doctor/DoctorApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';
import { DoctorModel } from '../../infrastructure/database/schemas/Doctor.schema';
import { AppError } from '../../domain/errors/AppError';

export class DoctorController {
  constructor(private readonly doctorService: DoctorApplicationService) {}

  public createDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { firstName, lastName, email, phone, specialization } = req.body;

      const doctorId = await this.doctorService.createDoctor({
        firstName,
        lastName,
        email,
        phone,
        specialization,
      });

      const user = await UserModel.findOne({ email: email.trim().toLowerCase(), role: 'doctor' });
      if (user) {
        await DoctorModel.findOneAndUpdate({ doctorId }, { userId: user._id });
        user.linkedId = doctorId;
        await user.save();
      }

      res.status(201).json({
        success: true,
        message: 'Doctor created successfully',
        doctorId,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMyDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;

      if (!user || user.role !== 'doctor') {
        throw new AppError(403, 'Forbidden');
      }
      if (!user.linkedId) {
        throw new AppError(404, 'No doctor profile is linked to your account.');
      }

      const doctor = await this.doctorService.getDoctor(user.linkedId);
      res.status(200).json({
        success: true,
        data: {
          doctorId: doctor.doctorId.getValue(),
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          fullName: doctor.fullName,
          email: doctor.email.getValue(),
          phone: doctor.phone,
          specialization: doctor.specialization,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctorId = String(req.params.doctorId);
      const doctor = await this.doctorService.getDoctor(doctorId);

      res.status(200).json({
        success: true,
        data: {
          doctorId: doctor.doctorId.getValue(),
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          fullName: doctor.fullName,
          email: doctor.email.getValue(),
          phone: doctor.phone,
          specialization: doctor.specialization,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllDoctors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctors = await this.doctorService.getAllDoctors();

      const data = doctors.map((doctor) => ({
        doctorId: doctor.doctorId.getValue(),
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        fullName: doctor.fullName,
        email: doctor.email.getValue(),
        phone: doctor.phone,
        specialization: doctor.specialization,
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
