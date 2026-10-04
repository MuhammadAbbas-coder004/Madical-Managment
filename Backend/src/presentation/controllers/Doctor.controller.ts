import { Request, Response } from 'express';
import { DoctorApplicationService } from '../../application/doctor/DoctorApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../../infrastructure/database/schemas/User.schema';

export class DoctorController {
  constructor(private readonly doctorService: DoctorApplicationService) {}

  public createDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
      const { firstName, lastName, email, phone, specialization } = req.body;

      const doctorId = await this.doctorService.createDoctor({
        firstName,
        lastName,
        email,
        phone,
        specialization,
      });

      await UserModel.findOneAndUpdate(
        { email: email.trim().toLowerCase(), role: 'doctor' },
        { linkedId: doctorId }
      );

      res.status(201).json({
        success: true,
        message: 'Doctor created successfully',
        doctorId,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create doctor',
      });
    }
  };

  public getMyDoctor = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.userId;
      const user = userId ? await UserModel.findById(userId) : null;

      if (!user || user.role !== 'doctor') {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
      if (!user.linkedId) {
        res.status(404).json({
          success: false,
          message: 'No doctor profile is linked to your account.',
        });
        return;
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve doctor profile';
      res.status(message === 'Doctor not found' ? 404 : 500).json({
        success: false,
        message,
      });
    }
  };

  public getDoctor = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Doctor not found',
      });
    }
  };

  public getAllDoctors = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve doctors',
      });
    }
  };
}
