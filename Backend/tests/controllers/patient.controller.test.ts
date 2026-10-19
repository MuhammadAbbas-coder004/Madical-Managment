import { describe, expect, it, vi, afterEach } from 'vitest';
import type { NextFunction, Response } from 'express';
import { Email } from '../../src/domain/patient/Email';
import { Patient } from '../../src/domain/patient/Patient.entity';
import { PatientId } from '../../src/domain/patient/PatientId';
import { PatientApplicationService } from '../../src/application/patient/PatientApplicationService';
import { PatientController } from '../../src/presentation/controllers/Patient.controller';
import { AppointmentModel } from '../../src/infrastructure/database/schemas/Appointment.schema';
import { UserModel } from '../../src/infrastructure/database/schemas/User.schema';
import { AuthenticatedRequest } from '../../src/presentation/middlewares/auth.middleware';
import * as ProfileLinker from '../../src/infrastructure/database/UserProfileLinker';

const makePatient = (patientId: string, firstName: string) =>
  new Patient({
    patientId: new PatientId(patientId),
    firstName,
    lastName: 'Patient',
    email: new Email(`${patientId}@example.com`),
    phone: '555-0100',
  });

describe('PatientController.getAllPatients', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns only patients linked to the authenticated doctor by appointments', async () => {
    const assignedPatient = makePatient('assigned-1', 'Assigned');
    const otherPatient = makePatient('other-1', 'Other');
    const service = {
      getAllPatients: vi.fn().mockResolvedValue([assignedPatient, otherPatient]),
    } as unknown as PatientApplicationService;
    vi.spyOn(UserModel, 'findById').mockResolvedValue({ role: 'doctor' } as never);
    vi.spyOn(ProfileLinker, 'ensureUserProfile').mockResolvedValue('doctor-profile');
    const distinct = vi.spyOn(AppointmentModel, 'distinct').mockResolvedValue(['assigned-1'] as never);
    const responseBody = vi.fn();
    const responseStatus = vi.fn().mockReturnValue({ json: responseBody });
    const next = vi.fn() as NextFunction;
    const controller = new PatientController(service);

    await controller.getAllPatients(
      {
        user: { userId: 'doctor-user', role: 'doctor', linkedId: 'doctor-profile' },
      } as AuthenticatedRequest,
      { status: responseStatus } as unknown as Response,
      next
    );

    expect(distinct).toHaveBeenCalledWith('patientId', { doctorId: 'doctor-profile' });
    expect(responseStatus).toHaveBeenCalledWith(200);
    expect(responseBody).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          patientId: 'assigned-1',
          firstName: 'Assigned',
        }),
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses the persisted doctor profile link when the session token has an outdated linkedId', async () => {
    const assignedPatient = makePatient('assigned-1', 'Assigned');
    const service = {
      getAllPatients: vi.fn().mockResolvedValue([assignedPatient]),
    } as unknown as PatientApplicationService;
    vi.spyOn(UserModel, 'findById').mockResolvedValue({ role: 'doctor' } as never);
    vi.spyOn(ProfileLinker, 'ensureUserProfile').mockResolvedValue('current-doctor-profile');
    const distinct = vi.spyOn(AppointmentModel, 'distinct').mockResolvedValue(['assigned-1'] as never);
    const responseBody = vi.fn();
    const responseStatus = vi.fn().mockReturnValue({ json: responseBody });
    const next = vi.fn() as NextFunction;
    const controller = new PatientController(service);

    await controller.getAllPatients(
      {
        user: { userId: 'doctor-user', role: 'doctor', linkedId: 'stale-doctor-profile' },
      } as AuthenticatedRequest,
      { status: responseStatus } as unknown as Response,
      next
    );

    expect(distinct).toHaveBeenCalledWith('patientId', { doctorId: 'current-doctor-profile' });
    expect(responseBody).toHaveBeenCalledWith({
      success: true,
      data: [expect.objectContaining({ patientId: 'assigned-1' })],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
