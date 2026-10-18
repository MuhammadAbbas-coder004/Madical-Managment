import {
  DetectFacesCommand,
  RekognitionClient,
  SearchFacesByImageCommand,
} from '@aws-sdk/client-rekognition';
import { AppError } from '../../domain/errors/AppError';
import {
  faceEnrollmentConfiguration,
  isFaceEnrollmentConfigured,
} from './FaceEnrollmentService';

const providerErrorName = (error: unknown) =>
  error instanceof Error ? error.name : 'UnknownProviderError';

export class FaceVerificationService {
  private readonly client: RekognitionClient;

  constructor(
    private readonly configuration = faceEnrollmentConfiguration,
    client?: RekognitionClient
  ) {
    this.client = client ?? new RekognitionClient({ region: configuration.region || undefined });
  }

  public async findMatchingFaces(image: Buffer): Promise<string[]> {
    if (!isFaceEnrollmentConfigured(this.configuration)) {
      throw new AppError(
        503,
        'Face verification is not configured. Please sign in with your email and password.'
      );
    }

    try {
      const detected = await this.client.send(
        new DetectFacesCommand({
          Image: { Bytes: image },
          Attributes: ['DEFAULT'],
        })
      );
      if (detected.FaceDetails?.length !== 1) {
        throw new AppError(
          422,
          detected.FaceDetails?.length
            ? 'Show only one face in the camera frame, then retry.'
            : 'No clear face was detected. Improve the lighting and retry.'
        );
      }

      const result = await this.client.send(
        new SearchFacesByImageCommand({
          CollectionId: this.configuration.collectionId,
          Image: { Bytes: image },
          MaxFaces: 10,
          FaceMatchThreshold: 95,
        })
      );

      return [...new Set(
        (result.FaceMatches ?? [])
          .filter((match) => (match.Similarity ?? 0) >= 95)
          .flatMap((match) => (match.Face?.FaceId ? [match.Face.FaceId] : []))
      )];
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const name = providerErrorName(error);
      if (['InvalidImageFormatException', 'ImageTooLargeException'].includes(name)) {
        throw new AppError(400, 'Use a clear JPEG or PNG image smaller than 5 MB.');
      }
      if (name === 'InvalidParameterException') {
        throw new AppError(422, 'The camera frame could not be processed. Improve the lighting and retry.');
      }
      if (name === 'ResourceNotFoundException') {
        throw new AppError(503, 'The configured face collection is unavailable. Please contact support.');
      }
      if (name === 'AccessDeniedException') {
        throw new AppError(503, 'The face verification service is not authorized to use its configured collection.');
      }
      console.error(`[FaceVerification] Rekognition search failed (provider_error=${name}).`);
      throw new AppError(
        503,
        'Face verification service could not process this request. Please use email and password or try again later.'
      );
    }
  }
}

export const faceVerificationService = new FaceVerificationService();
