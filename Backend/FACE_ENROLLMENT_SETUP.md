# AWS Rekognition face enrollment and sign-in

Face enrollment and face sign-in are opt-in and disabled until the server is
configured. Enrollment uses `IndexFaces`; sign-in first requires exactly one
detected face and then calls `SearchFacesByImage` with a 95% similarity
threshold. A matching Rekognition `FaceId` must also map to exactly one active,
enrolled Patient or Doctor record in MongoDB before the backend issues the
normal Medivanta session cookie and role-bearing JWT. Ambiguous and unmatched
results fail closed. The application never trusts an account ID or role from
the browser.

Camera uploads are held in memory and are not written to application disk or
MongoDB. MongoDB stores the account role, enrollment status/time, consent time,
and Rekognition `FaceId` reference. Rekognition retains biometric face
features in the configured collection.

This image-similarity flow does **not** detect liveness or presentation
attacks. A photograph or screen replay may be accepted if it matches an
enrolled face. It does not prove legal identity and should not be treated as a
high-assurance or sole authentication factor. Keep password sign-in available
and complete jurisdiction-specific privacy, consent, and security review
before enabling biometric sign-in in production.

## AWS setup

1. The requested development values are region `us-east-1` and collection ID
   `medivanta-face-users-dev`. Confirm `us-east-1` satisfies the account,
   privacy, and data-residency requirements before creating it.
2. Configure an AWS CLI profile for an administrator identity locally. Check
   which account and profile will be used without printing credentials:

   ```powershell
   aws sts get-caller-identity --profile <admin-profile>
   ```

   Check whether the collection already exists:

   ```powershell
   aws rekognition describe-collection `
     --collection-id medivanta-face-users-dev `
     --region us-east-1 `
     --profile <admin-profile>
   ```

   If that command reports `ResourceNotFoundException`, create the collection
   once:

   ```powershell
   aws rekognition create-collection `
     --collection-id medivanta-face-users-dev `
     --region us-east-1 `
     --profile <admin-profile>
   ```

   Then repeat `describe-collection` and confirm it returns the collection
   details. The AWS administrator identity must be allowed to create and
   describe collections.

   If policy requires a customer-managed KMS key, create the collection with
   the appropriate `--kms-key-id` and ensure the key policy permits Rekognition
   to use it.
3. Give the backend AWS identity only `rekognition:IndexFaces`,
   `rekognition:DeleteFaces`, and `rekognition:SearchFacesByImage` access to
   the configured collection ARN. `rekognition:DetectFaces` is also required
   and may require `Resource: "*"`, because it does not operate on a collection.
   Do not give the runtime role collection-management or account-wide
   permissions.
4. Set these values in `Backend/.env` (or the deployment secret/config store):

   ```dotenv
   FACE_ENROLLMENT_ENABLED=true
   AWS_REGION=us-east-1
   REKOGNITION_COLLECTION_ID=medivanta-face-users-dev
   ```

   Only set `FACE_ENROLLMENT_ENABLED=true` after the collection exists and the
   backend identity has been configured and verified. This flag enables both
   enrollment and verification. For local development, set
   `AWS_PROFILE=<admin-or-runtime-profile>` in the backend process environment
   and configure that profile with `aws configure --profile <profile-name>`
   (credentials remain in the user's AWS config files, not in this repository).
   In production, use an IAM role or workload identity instead of a profile.
   Never put access keys in source control or paste them into chat.
5. Restart the backend and test both enrollment and sign-in in a non-production
   AWS account. Explicit consent is required before enrollment. Face sign-in
   only compares a frame to an enrolled face; it does not perform liveness
   detection. Doctor approval status is unchanged by enrollment or face
   sign-in; existing authorization middleware continues to block clinical
   access until approval.

## Data handling

Face features are biometric data. Obtain any jurisdiction-specific consent and
privacy review before enabling this in production. Configure AWS region,
collection encryption, access logging, retention, and deletion procedures to
meet the organization's requirements. Deleting the account in MongoDB does not
automatically delete a face from Rekognition; remove the stored `FaceId` from
the collection as part of a separately approved account-deletion process.
