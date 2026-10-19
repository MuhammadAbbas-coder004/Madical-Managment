import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import { DoctorController } from '../../src/presentation/controllers/Doctor.controller';
import { DoctorApplicationService } from '../../src/application/doctor/DoctorApplicationService';
import { DoctorModel } from '../../src/infrastructure/database/schemas/Doctor.schema';
import { UserModel } from '../../src/infrastructure/database/schemas/User.schema';
import { Doctor } from '../../src/domain/doctor/Doctor.entity';
import { DoctorId } from '../../src/domain/doctor/DoctorId';
import { Email } from '../../src/domain/patient/Email';

describe('DoctorController.getAllDoctors', () => {
  afterEach(() => vi.restoreAllMocks());

  it('includes database-backed verification status for administrators', async () => {
    const doctor = new Doctor({
      doctorId: new DoctorId('doctor-profile-id'),
      firstName: 'Ava',
      lastName: 'Doctor',
      email: new Email('ava@example.com'),
      specialization: 'Cardiology',
    });
    const service = {
      getAllDoctors: vi.fn().mockResolvedValue([doctor]),
    } as unknown as DoctorApplicationService;
    const userQuery = {
      select: vi.fn().mockResolvedValue([{
        linkedId: 'doctor-profile-id',
        email: 'ava@example.com',
        doctorVerificationStatus: 'pending',
        licenseNumber: 'LIC-12345',
      }]),
    };
    vi.spyOn(UserModel, 'find').mockReturnValue(userQuery as never);
    const responseJson = vi.fn();
    const responseStatus = vi.fn().mockReturnValue({ json: responseJson });
    const controller = new DoctorController(service);

    await controller.getAllDoctors(
      { user: { userId: 'admin-user', role: 'admin' } } as never,
      { status: responseStatus } as unknown as Response,
      vi.fn() as NextFunction
    );

    expect(UserModel.find).toHaveBeenCalledWith({
      role: 'doctor',
      $or: [
        { linkedId: { $in: ['doctor-profile-id'] } },
        { email: { $in: ['ava@example.com'] } },
      ],
    });
    expect(userQuery.select).toHaveBeenCalledWith('linkedId email doctorVerificationStatus licenseNumber');
    expect(responseJson).toHaveBeenCalledWith({
      success: true,
      data: [expect.objectContaining({
        doctorId: 'doctor-profile-id',
        doctorVerificationStatus: 'pending',
        licenseNumber: 'LIC-12345',
      })],
    });
  });
});

describe('DoctorController.updateVerificationStatus', () => {
  afterEach(() => vi.restoreAllMocks());

  it('persists and returns an administrator verification decision', async () => {
    const profileQuery = {
      select: vi.fn().mockResolvedValue({
        email: 'doctor@example.com',
        userId: 'doctor-user-id',
      }),
    };
    vi.spyOn(DoctorModel, 'findOne').mockReturnValue(profileQuery as never);
    const updatedUser = {
      doctorVerificationStatus: 'verified',
      updatedAt: new Date('2026-10-18T00:00:00.000Z'),
    };
    const update = vi.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValue(updatedUser as never);
    const responseJson = vi.fn();
    const responseStatus = vi.fn().mockReturnValue({ json: responseJson });
    const next = vi.fn() as NextFunction;
    const controller = new DoctorController({} as DoctorApplicationService);

    await controller.updateVerificationStatus(
      {
        params: { doctorId: 'doctor-profile-id' },
        body: { status: 'verified' },
      } as never,
      { status: responseStatus } as unknown as Response,
      next
    );

    expect(DoctorModel.findOne).toHaveBeenCalledWith({ doctorId: 'doctor-profile-id' });
    expect(profileQuery.select).toHaveBeenCalledWith('email userId');
    expect(update).toHaveBeenCalledWith(
      { _id: 'doctor-user-id', role: 'doctor' },
      { $set: { doctorVerificationStatus: 'verified' } },
      { new: true, runValidators: true }
    );
    expect(responseStatus).toHaveBeenCalledWith(200);
    expect(responseJson).toHaveBeenCalledWith({
      success: true,
      data: {
        doctorId: 'doctor-profile-id',
        doctorVerificationStatus: 'verified',
        updatedAt: updatedUser.updatedAt,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not report an update when the doctor account is missing', async () => {
    const profileQuery = { select: vi.fn().mockResolvedValue(null) };
    vi.spyOn(DoctorModel, 'findOne').mockReturnValue(profileQuery as never);
    const update = vi.spyOn(UserModel, 'findOneAndUpdate');
    const next = vi.fn() as NextFunction;
    const controller = new DoctorController({} as DoctorApplicationService);

    await controller.updateVerificationStatus(
      {
        params: { doctorId: 'doctor-profile-id' },
        body: { status: 'verified' },
      } as never,
      {} as Response,
      next
    );

    expect(update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      message: 'Doctor profile not found.',
    }));
  });

  it('rejects invalid verification status values at the request schema', async () => {
    const { updateDoctorVerificationSchema } = await import('../../src/presentation/schemas');
    expect(() => updateDoctorVerificationSchema.parse({ status: 'approved' })).toThrow();
  });
});
