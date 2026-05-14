const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const config = require('../config');

// Initialize S3 Client
const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Configure Multer Storage for S3
 */
const storage = multerS3({
  s3: s3,
  bucket: config.aws.bucketName,
  acl: 'public-read', // As requested, files are public
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const fileType = file.mimetype.split('/')[0]; // image or audio
    const isPdf = file.mimetype === 'application/pdf';
    
    let folder = 'others';
    if (fileType === 'image') folder = 'images';
    else if (fileType === 'audio') folder = 'audio';
    else if (isPdf) folder = 'pdfs';

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, `${folder}/${fileName}`);
  },
});

/**
 * Common Filters
 */
const fileFilter = (req, file, cb) => {
  const allowedMimetypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
    'application/pdf'
  ];

  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

module.exports = upload;
