import {
  DeleteFacesCommand,
  IndexFacesCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { AppError } from '../../domain/errors/AppError';
import { env } from '../config/env';

export interface FaceEnrollmentConfiguration {
  enabled: boolean;
  region: string;
  collectionId: string;
}

export const faceEnrollmentConfiguration: FaceEnrollmentConfiguration = {
  enabled: env.FACE_ENROLLMENT_ENABLED,
  region: env.AWS_REGION,
  collectionId: env.REKOGNITION_COLLECTION_ID,
};

export const isFaceEnrollmentConfigured = (
  configuration = faceEnrollmentConfiguration
) =>
  configuration.enabled &&
  Boolean(configuration.region) &&
  Boolean(configuration.collectionId);

const providerErrorName = (error: unknown) =>
  error instanceof Error ? error.name : 'UnknownProviderError';

export class FaceEnrollmentService {
  private readonly client: RekognitionClient;

  constructor(
    private readonly configuration = faceEnrollmentConfiguration,
    client?: RekognitionClient
  ) {
    this.client = client ?? new RekognitionClient({ region: configuration.region || undefined });
  }

  private assertConfigured(): void {
    if (!isFaceEnrollmentConfigured(this.configuration)) {
      throw new AppError(
        503,
        'Face enrollment is not configured. Please use another registration method or contact support.'
      );
    }
  }

  public async enrollFace(userId: string, image: Buffer): Promise<string> {
    this.assertConfigured();

    let result;
    try {
      result = await this.client.send(
        new IndexFacesCommand({
          CollectionId: this.configuration.collectionId,
          Image: { Bytes: image },
          ExternalImageId: userId,
          MaxFaces: 2,
          QualityFilter: 'AUTO',
          DetectionAttributes: ['DEFAULT'],
        })
      );
    } catch (error: unknown) {
      const name = providerErrorName(error);
      if (['InvalidImageFormatException', 'ImageTooLargeException'].includes(name)) {
        throw new AppError(400, 'Use a clear JPEG or PNG image smaller than 5 MB.');
      }
      if (name === 'InvalidParameterException') {
        throw new AppError(400, 'The image could not be processed. Use a clear JPEG or PNG image.');
      }
      if (name === 'ResourceNotFoundException') {
        throw new AppError(503, 'The configured face collection is unavailable. Please contact support.');
      }
      if (name === 'AccessDeniedException') {
        throw new AppError(503, 'The face enrollment service is not authorized to use its configured collection.');
      }
      console.error(`[FaceEnrollment] Rekognition index request failed (provider_error=${name}).`);
      throw new AppError(
        503,
        'Face enrollment service could not process this request. Please try again later.'
      );
    }

    const faceRecords = result.FaceRecords ?? [];
    const unindexedFaces = result.UnindexedFaces ?? [];
    if (faceRecords.length !== 1 || faceRecords.length + unindexedFaces.length !== 1) {
      const faceIds = faceRecords.flatMap(({ Face }) => (Face?.FaceId ? [Face.FaceId] : []));
      if (faceIds.length) await this.deleteFaces(faceIds);
      throw new AppError(
        422,
        'Enrollment needs one clear, well-lit face in the camera frame. Adjust your position and try again.'
      );
    }

    const faceId = faceRecords[0]?.Face?.FaceId;
    if (!faceId) {
      throw new AppError(503, 'The biometric service did not return an enrollment reference. Please retry.');
    }
    return faceId;
  }

  public async deleteFaces(faceIds: string[]): Promise<void> {
    if (!faceIds.length) return;
    this.assertConfigured();

    try {
      await this.client.send(
        new DeleteFacesCommand({
          CollectionId: this.configuration.collectionId,
          FaceIds: faceIds,
        })
      );
    } catch (error: unknown) {
      const name = providerErrorName(error);
      console.error(`[FaceEnrollment] Rekognition cleanup failed (provider_error=${name}).`);
      throw new AppError(
        503,
        'The biometric service could not clean up an incomplete enrollment. Contact support before retrying.'
      );
    }
  }
}

export const faceEnrollmentService = new FaceEnrollmentService();
