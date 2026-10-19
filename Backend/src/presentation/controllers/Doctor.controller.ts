import { Request, Response, NextFunction } from 'express';
import { DoctorApplicationService } from '../../application/doctor/DoctorApplicationService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { IUserDocument, UserModel } from '../../infrastructure/database/schemas/User.schema';
import { DoctorModel } from '../../infrastructure/database/schemas/Doctor.schema';
import { AppError } from '../../domain/errors/AppError';
import { ensureUserProfile } from '../../infrastructure/database/UserProfileLinker';

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
      const linkedId = await ensureUserProfile(user);
      if (!linkedId) {
        throw new AppError(404, 'No doctor profile is linked to your account.');
      }

      const doctor = await this.doctorService.getDoctor(linkedId);
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
      const isAdmin = (req as AuthenticatedRequest).user?.role?.toLowerCase() === 'admin';
      const doctorIds = doctors.map((doctor) => doctor.doctorId.getValue());
      const doctorEmails = doctors.map((doctor) => doctor.email.getValue().toLowerCase());
      const users = isAdmin && doctors.length > 0
        ? await UserModel.find({
            role: 'doctor',
            $or: [
              { linkedId: { $in: doctorIds } },
              { email: { $in: doctorEmails } },
            ],
          }).select('linkedId email doctorVerificationStatus licenseNumber')
        : [];
      const verificationByDoctorId = new Map<string, IUserDocument['doctorVerificationStatus']>();
      const verificationByEmail = new Map<string, IUserDocument['doctorVerificationStatus']>();
      const licenseByDoctorId = new Map<string, string | undefined>();
      const licenseByEmail = new Map<string, string | undefined>();
      for (const user of users) {
        if (user.linkedId) {
          verificationByDoctorId.set(user.linkedId, user.doctorVerificationStatus);
          licenseByDoctorId.set(user.linkedId, user.licenseNumber);
        }
        verificationByEmail.set(user.email.toLowerCase(), user.doctorVerificationStatus);
        licenseByEmail.set(user.email.toLowerCase(), user.licenseNumber);
      }

      const data = doctors.map((doctor) => ({
        doctorId: doctor.doctorId.getValue(),
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        fullName: doctor.fullName,
        email: doctor.email.getValue(),
        phone: doctor.phone,
        specialization: doctor.specialization,
        ...(isAdmin
          ? {
              doctorVerificationStatus:
                verificationByEmail.get(doctor.email.getValue().toLowerCase())
                ?? verificationByDoctorId.get(doctor.doctorId.getValue())
                ?? 'not_applicable',
              licenseNumber:
                licenseByEmail.get(doctor.email.getValue().toLowerCase())
                ?? licenseByDoctorId.get(doctor.doctorId.getValue()),
            }
          : {}),
      }));

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateVerificationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const doctorId = String(req.params.doctorId);
      const { status } = req.body as { status: IUserDocument['doctorVerificationStatus'] };
      const doctor = await DoctorModel.findOne({ doctorId }).select('email userId');
      if (!doctor) throw new AppError(404, 'Doctor profile not found.');

      const updateStatus = (filter: Record<string, unknown>) =>
        UserModel.findOneAndUpdate(
          { ...filter, role: 'doctor' },
          { $set: { doctorVerificationStatus: status } },
          { new: true, runValidators: true }
        );
      const user = (
        (doctor.userId ? await updateStatus({ _id: doctor.userId }) : null)
        ?? await updateStatus({ linkedId: doctorId })
        ?? await updateStatus({ email: doctor.email.trim().toLowerCase() })
      );
      if (!user) throw new AppError(404, 'No doctor account is linked to this profile.');

      res.status(200).json({
        success: true,
        data: {
          doctorId,
          doctorVerificationStatus: user.doctorVerificationStatus,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
