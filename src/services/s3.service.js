/**
 * s3.service.js
 *
 * Abstraction over AWS S3 operations.
 * All S3 logic is isolated here — no other file imports @aws-sdk directly.
 *
 * Environment variables required:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
 */

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const path = require('path');

// ── S3 client (lazy-initialised to avoid crashing on startup if env vars missing) ─

let _client = null;

function _getClient() {
  if (!_client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in .env'
      );
    }

    _client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

function _getBucket() {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('S3_BUCKET_NAME is not set in .env');
  return bucket;
}

/** Generate a URL-safe file name with a short unique suffix. */
function _safeFileName(originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}${ext}`;
}

// ── Public methods ────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to S3.
 *
 * @param {Buffer} fileBuffer     - Raw file bytes (from multer memoryStorage)
 * @param {string} originalName   - Original file name (for extension + slug)
 * @param {string} mimeType       - e.g. 'application/pdf'
 * @param {string} [folder]       - S3 sub-folder (default: 'uploads')
 * @returns {Promise<string>}     - Public URL of the uploaded file
 */
async function uploadFile(fileBuffer, originalName, mimeType, folder = 'uploads') {
  const client = _getClient();
  const bucket = _getBucket();
  const fileName = _safeFileName(originalName);
  const key = `${folder}/${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType || 'application/octet-stream',
    })
  );

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3 by its key (path within bucket).
 *
 * @param {string} fileKey - e.g. 'mou_documents/my-mou-abc12.pdf'
 */
async function deleteFile(fileKey) {
  const client = _getClient();
  const bucket = _getBucket();

  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: fileKey })
  );
}

/**
 * Generate a time-limited signed URL for private S3 objects.
 * Requires @aws-sdk/s3-request-presigner (install separately).
 *
 * @param {string} fileKey    - S3 object key
 * @param {number} [expiresIn] - Seconds until URL expires (default: 3600)
 * @returns {Promise<string>}
 */
async function getSignedUrl(fileKey, expiresIn = 3600) {
  // Lazy-require so startup doesn't fail if package isn't installed
  let presigner;
  try {
    presigner = require('@aws-sdk/s3-request-presigner');
  } catch {
    throw new Error('Install @aws-sdk/s3-request-presigner to use signed URLs');
  }

  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const client = _getClient();
  const bucket = _getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
  return presigner.getSignedUrl(client, command, { expiresIn });
}

module.exports = { uploadFile, deleteFile, getSignedUrl };
