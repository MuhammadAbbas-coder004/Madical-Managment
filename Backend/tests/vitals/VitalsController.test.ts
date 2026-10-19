import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VitalsController } from '../../src/presentation/controllers/Vitals.controller';
import { UserModel } from '../../src/infrastructure/database/schemas/User.schema';
import * as ProfileLinker from '../../src/infrastructure/database/UserProfileLinker';

describe('VitalsController.getVitalsByPatient', () => {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  const getVitalsByPatient = vi.fn();
  const controller = new VitalsController({ getVitalsByPatient } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a patient\'s own records by the canonical linked profile ID', async () => {
    vi.spyOn(UserModel, 'findById').mockResolvedValue({ role: 'patient', linkedId: 'stale-id' } as never);
    vi.spyOn(ProfileLinker, 'ensureUserProfile').mockResolvedValue('current-patient-id');
    getVitalsByPatient.mockResolvedValue([]);
    const req = {
      user: { userId: 'patient-user-id', role: 'patient', linkedId: 'stale-id' },
      params: { patientId: 'current-patient-id' },
    };

    await controller.getVitalsByPatient(req as never, response as never, next);

    expect(getVitalsByPatient).toHaveBeenCalledWith('current-patient-id');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: [] });
    expect(next).not.toHaveBeenCalled();
  });

  it('loads the selected assigned patient ID for a doctor request', async () => {
    vi.spyOn(UserModel, 'findById').mockResolvedValue({ role: 'doctor' } as never);
    getVitalsByPatient.mockResolvedValue([]);
    const req = {
      user: { userId: 'doctor-user-id', role: 'doctor', linkedId: 'doctor-profile-id' },
      params: { patientId: 'assigned-patient-id' },
    };

    await controller.getVitalsByPatient(req as never, response as never, next);

    expect(getVitalsByPatient).toHaveBeenCalledWith('assigned-patient-id');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: [] });
    expect(next).not.toHaveBeenCalled();
  });
});
