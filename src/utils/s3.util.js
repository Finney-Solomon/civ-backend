const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Upload a buffer directly to S3
 * @param {Buffer} buffer 
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - e.g. 'audio/mpeg'
 * @returns {Promise<string>} - Public URL
 */
const uploadBuffer = async (buffer, key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);
  
  // Construct the public URL
  return `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
};

/**
 * Delete an object from S3
 * @param {string} key 
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: config.aws.bucketName,
    Key: key,
  });
  await s3Client.send(command);
};

module.exports = {
  uploadBuffer,
  deleteFile,
};
