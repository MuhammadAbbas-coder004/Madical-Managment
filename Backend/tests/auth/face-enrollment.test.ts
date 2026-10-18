import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeleteFacesCommand,
  IndexFacesCommand,
  type RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { AppError } from '../../src/domain/errors/AppError';
import {
  FaceEnrollmentService,
  faceEnrollmentService,
} from '../../src/infrastructure/biometrics/FaceEnrollmentService';
import { JwtService } from '../../src/infrastructure/auth/JwtService';
import { AuthController } from '../../src/presentation/controllers/Auth.controller';
import type { AuthenticatedRequest } from '../../src/presentation/middlewares/auth.middleware';
import { UserModel } from '../../src/infrastructure/database/schemas/User.schema';
import { env } from '../../src/infrastructure/config/env';
import type { Response } from 'express';

const configuration = {
  enabled: true,
  region: 'us-east-1',
  collectionId: 'test-face-collection',
};

const mockClient = (send: ReturnType<typeof vi.fn>) =>
  ({ send }) as unknown as RekognitionClient;

const configuredEnrollmentFlag = env.FACE_ENROLLMENT_ENABLED;
afterEach(() => {
  env.FACE_ENROLLMENT_ENABLED = configuredEnrollmentFlag;
  vi.restoreAllMocks();
});

describe('AWS Rekognition face enrollment', () => {
  it('indexes the submitted frame under the authenticated account ID', async () => {
    const send = vi.fn().mockResolvedValue({
      FaceRecords: [{ Face: { FaceId: 'provider-face-id' } }],
      UnindexedFaces: [],
    });
    const service = new FaceEnrollmentService(configuration, mockClient(send));
    const image = Buffer.from('jpeg bytes');

    await expect(service.enrollFace('user-object-id', image)).resolves.toBe('provider-face-id');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(IndexFacesCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({
      CollectionId: 'test-face-collection',
      ExternalImageId: 'user-object-id',
      Image: { Bytes: image },
      MaxFaces: 2,
      QualityFilter: 'AUTO',
    });
  });

  it('rejects frames without exactly one indexable face', async () => {
    const send = vi.fn().mockResolvedValue({ FaceRecords: [], UnindexedFaces: [] });
    const service = new FaceEnrollmentService(configuration, mockClient(send));

    await expect(service.enrollFace('user-object-id', Buffer.from('jpeg bytes'))).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('one clear'),
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(IndexFacesCommand);
  });

  it('removes indexed faces when the image contains more than one face', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({
        FaceRecords: [
          { Face: { FaceId: 'face-a' } },
          { Face: { FaceId: 'face-b' } },
        ],
        UnindexedFaces: [],
      })
      .mockResolvedValueOnce({ DeletedFaces: ['face-a', 'face-b'] });
    const service = new FaceEnrollmentService(configuration, mockClient(send));

    await expect(service.enrollFace('user-object-id', Buffer.from('jpeg bytes'))).rejects.toBeInstanceOf(AppError);
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteFacesCommand);
    expect(send.mock.calls[1][0].input.FaceIds).toEqual(['face-a', 'face-b']);
  });

  it('does not report success when Rekognition fails', async () => {
    const send = vi.fn().mockRejectedValue(Object.assign(new Error('provider unavailable'), {
      name: 'ServiceUnavailableException',
    }));
    const service = new FaceEnrollmentService(configuration, mockClient(send));

    await expect(service.enrollFace('user-object-id', Buffer.from('jpeg bytes'))).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('fails closed when the service is not configured', async () => {
    const send = vi.fn();
    const service = new FaceEnrollmentService(
      { enabled: false, region: '', collectionId: '' },
      mockClient(send)
    );

    await expect(service.enrollFace('user-object-id', Buffer.from('jpeg bytes'))).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('face enrollment tickets', () => {
  it('issues a scoped short-lived Patient/Doctor ticket and rejects normal session tokens as tickets', () => {
    const ticket = JwtService.generateFaceEnrollmentToken('account-id', 'doctor');

    expect(JwtService.verifyFaceEnrollmentToken(ticket)).toMatchObject({
      userId: 'account-id',
      role: 'doctor',
      scope: 'face_enrollment',
    });
    expect(() => JwtService.verifyFaceEnrollmentToken(
      JwtService.generateToken('account-id', 'doctor')
    )).toThrow('Invalid face enrollment ticket');
  });
});

describe('authenticated face enrollment association', () => {
  it.each([
    ['patient', 'patient-account-id'],
    ['doctor', 'doctor-account-id'],
  ] as const)('persists only the Rekognition reference on the %s account', async (role, userId) => {
    env.FACE_ENROLLMENT_ENABLED = true;
    const user = {
      _id: { toString: () => userId },
      role,
      faceEnrollmentStatus: 'not_enrolled',
      doctorVerificationStatus: role === 'doctor' ? 'pending' : undefined,
    };
    vi.spyOn(UserModel, 'findById').mockResolvedValue(user as never);
    const findOneAndUpdate = vi.spyOn(UserModel, 'findOneAndUpdate')
      .mockResolvedValueOnce(user as never)
      .mockResolvedValueOnce({
        ...user,
        faceEnrollmentStatus: 'enrolled',
      } as never);
    const enrollFace = vi.spyOn(faceEnrollmentService, 'enrollFace').mockResolvedValue(`face-${role}`);
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const clearCookie = vi.fn();
    const response = { status, json, clearCookie } as unknown as Response;
    const next = vi.fn();

    await new AuthController().enrollFace(
      {
        user: { userId, role },
        body: { consent: 'true' },
        file: { buffer: Buffer.from('camera frame') },
      } as unknown as AuthenticatedRequest,
      response,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(enrollFace).toHaveBeenCalledWith(userId, Buffer.from('camera frame'));
    expect(findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ _id: user._id, role }),
      expect.objectContaining({
        $set: expect.objectContaining({ faceEnrollmentStatus: 'enrolling' }),
      }),
      { new: true }
    );
    expect(findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ _id: user._id, faceEnrollmentStatus: 'enrolling' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          faceEnrollmentStatus: 'enrolled',
          faceProviderFaceId: `face-${role}`,
        }),
      }),
      { new: true }
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      enrolled: true,
      role,
      faceEnrollmentStatus: 'enrolled',
    }));
    expect(JSON.stringify(json.mock.calls)).not.toContain(`face-${role}`);
  });
});
