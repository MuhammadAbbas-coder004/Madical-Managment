import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DetectFacesCommand,
  SearchFacesByImageCommand,
  type RekognitionClient,
} from '@aws-sdk/client-rekognition';
import type { Request, Response } from 'express';
import { AppError } from '../../src/domain/errors/AppError';
import { JwtService } from '../../src/infrastructure/auth/JwtService';
import * as ProfileLinker from '../../src/infrastructure/database/UserProfileLinker';
import { UserModel } from '../../src/infrastructure/database/schemas/User.schema';
import { env } from '../../src/infrastructure/config/env';
import { FaceVerificationService } from '../../src/infrastructure/biometrics/FaceVerificationService';
import { faceVerificationService } from '../../src/infrastructure/biometrics/FaceVerificationService';
import { AuthController } from '../../src/presentation/controllers/Auth.controller';

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

describe('AWS Rekognition face verification', () => {
  it('requires one detected face and searches the configured collection at the verification threshold', async () => {
    const image = Buffer.from('camera image');
    const send = vi.fn()
      .mockResolvedValueOnce({ FaceDetails: [{ Confidence: 99 }] })
      .mockResolvedValueOnce({
        FaceMatches: [
          { Face: { FaceId: 'face-match' }, Similarity: 98.5 },
          { Face: { FaceId: 'below-threshold' }, Similarity: 94 },
        ],
      });
    const service = new FaceVerificationService(configuration, mockClient(send));

    await expect(service.findMatchingFaces(image)).resolves.toEqual(['face-match']);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DetectFacesCommand);
    expect(send.mock.calls[1][0]).toBeInstanceOf(SearchFacesByImageCommand);
    expect(send.mock.calls[1][0].input).toMatchObject({
      CollectionId: 'test-face-collection',
      Image: { Bytes: image },
      FaceMatchThreshold: 95,
      MaxFaces: 10,
    });
  });

  it('rejects frames with zero or multiple faces before searching', async () => {
    const noFacesSend = vi.fn().mockResolvedValue({ FaceDetails: [] });
    const noFacesService = new FaceVerificationService(configuration, mockClient(noFacesSend));
    await expect(noFacesService.findMatchingFaces(Buffer.from('image'))).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('No clear face'),
    });
    expect(noFacesSend).toHaveBeenCalledTimes(1);

    const multipleFacesSend = vi.fn().mockResolvedValue({
      FaceDetails: [{}, {}],
    });
    const multipleFacesService = new FaceVerificationService(
      configuration,
      mockClient(multipleFacesSend)
    );
    await expect(
      multipleFacesService.findMatchingFaces(Buffer.from('image'))
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining('only one face'),
    });
    expect(multipleFacesSend).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Rekognition is disabled or unavailable', async () => {
    const disabledSend = vi.fn();
    const disabledService = new FaceVerificationService(
      { ...configuration, enabled: false },
      mockClient(disabledSend)
    );
    await expect(disabledService.findMatchingFaces(Buffer.from('image'))).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(disabledSend).not.toHaveBeenCalled();

    const unavailableService = new FaceVerificationService(
      configuration,
      mockClient(vi.fn().mockRejectedValue(Object.assign(new Error(), {
        name: 'ServiceUnavailableException',
      })))
    );
    await expect(unavailableService.findMatchingFaces(Buffer.from('image'))).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe('face verification account authentication', () => {
  it.each([
    ['patient', 'patient-profile-id'],
    ['doctor', 'doctor-profile-id'],
  ] as const)('authenticates the matched saved %s role and issues its normal session', async (role, linkedId) => {
    env.FACE_ENROLLMENT_ENABLED = true;
    const id = `${role}-account-id`;
    const user = {
      _id: { toString: () => id },
      username: `${role} user`,
      fullName: `${role} name`,
      email: `${role}@example.invalid`,
      role,
      status: 'active',
      doctorVerificationStatus: role === 'doctor' ? 'pending' : undefined,
      faceEnrollmentStatus: 'enrolled',
      faceConsentAt: new Date(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(faceVerificationService, 'findMatchingFaces').mockResolvedValue([`${role}-face-id`]);
    const findUsers = vi.spyOn(UserModel, 'find').mockResolvedValue([user] as never);
    const ensureProfile = vi.spyOn(ProfileLinker, 'ensureUserProfile').mockResolvedValue(linkedId);
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const cookie = vi.fn();
    const response = { status, json, cookie } as unknown as Response;
    const next = vi.fn();

    await new AuthController().faceVerify(
      {
        file: { buffer: Buffer.from('camera image') },
        body: { consent: 'true' },
      } as Request,
      response,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(findUsers).toHaveBeenCalledWith({
      faceProviderFaceId: { $in: [`${role}-face-id`] },
      faceEnrollmentStatus: 'enrolled',
    });
    expect(ensureProfile).toHaveBeenCalledWith(user);
    expect(user.save).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(cookie).toHaveBeenCalledWith(
      'token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
    const responseBody = json.mock.calls[0][0];
    expect(responseBody).toMatchObject({
      verified: true,
      user: {
        id,
        role,
        ...(role === 'patient' ? { patientId: linkedId } : { doctorId: linkedId }),
      },
    });
    expect(JwtService.verifyToken(cookie.mock.calls[0][1])).toMatchObject({ userId: id, role, linkedId });
  });

  it('rejects an ambiguous match instead of authenticating either account', async () => {
    env.FACE_ENROLLMENT_ENABLED = true;
    vi.spyOn(faceVerificationService, 'findMatchingFaces').mockResolvedValue(['face-a', 'face-b']);
    vi.spyOn(UserModel, 'find').mockResolvedValue([
      { _id: { toString: () => 'account-a' } },
      { _id: { toString: () => 'account-b' } },
    ] as never);
    const cookie = vi.fn();
    const next = vi.fn();

    await new AuthController().faceVerify(
      {
        file: { buffer: Buffer.from('camera image') },
        body: { consent: 'true' },
      } as Request,
      { cookie } as unknown as Response,
      next
    );

    expect(cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: expect.stringContaining('Face was not recognized'),
    }));
  });

  it('requires a camera image and respects the server feature setting', async () => {
    env.FACE_ENROLLMENT_ENABLED = true;
    const next = vi.fn();
    await new AuthController().faceVerify(
      {} as Request,
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      message: 'A camera image is required for face sign-in.',
    }));

    env.FACE_ENROLLMENT_ENABLED = false;
    const disabledNext = vi.fn();
    await new AuthController().faceVerify(
      { file: { buffer: Buffer.from('camera image') } } as Request,
      {} as Response,
      disabledNext
    );
    expect(disabledNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(disabledNext.mock.calls[0][0]).toMatchObject({ statusCode: 503 });
  });

  it('requires explicit consent before calling the biometric service', async () => {
    env.FACE_ENROLLMENT_ENABLED = true;
    const verify = vi.spyOn(faceVerificationService, 'findMatchingFaces');
    const next = vi.fn();

    await new AuthController().faceVerify(
      { file: { buffer: Buffer.from('camera image') }, body: { consent: 'false' } } as Request,
      {} as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      message: 'Consent is required before face sign-in.',
    }));
    expect(verify).not.toHaveBeenCalled();
  });
});
