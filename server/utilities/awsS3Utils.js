/*
 * AWS S3 Utility Module
 * Production-ready S3 operations for CollabMedia
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Function to create S3Client with proper credential loading
const createS3Client = () => {
    // Ensure environment variables are loaded
    require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
    
    console.log('=== AWS CREDENTIALS DEBUG ===');
    console.log('AWS_REGION:', process.env.AWS_REGION || 'Not Set');
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not Set');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not Set');
    console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || 'Not Set');
    
    return new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Temporary local storage
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow images and documents
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed!'));
        }
    }
});

// Video upload configuration
const videoUpload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit for videos
    },
    fileFilter: function (req, file, cb) {
        // Allow video files
        const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv|m4v/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype.startsWith('video/');

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only video files are allowed!'));
        }
    }
});

/**
 * Upload video file to S3
 * @param {Object} file - Multer file object
 * @param {String} folder - S3 folder path (e.g., 'scrptMedia/video/recorded')
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result with video info
 */
const uploadVideoToS3 = async function (file, folder = 'scrptMedia/video/recorded', metadata = {}) {
    try {
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        // Handle both file path and buffer uploads
        let fileContent;
        if (file.buffer) {
            // Buffer upload (for processed videos)
            fileContent = file.buffer;
        } else if (file.path) {
            // File path upload (for regular files)
            fileContent = fs.readFileSync(file.path);
        } else {
            throw new Error('Video file must have either buffer or path property');
        }
        
        // Generate unique filename for video
        const timestamp = Date.now();
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${timestamp}-${file.originalname}`;

        // S3 upload parameters for video
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            Key: fileName,
            Body: fileContent,
            ContentType: file.mimetype,
            Metadata: {
                'original-name': file.originalname,
                'upload-timestamp': timestamp.toString(),
                'file-type': 'video',
                ...metadata
            }
        };

        console.log('=== S3 VIDEO UPLOAD DEBUG ===');
        console.log('Bucket:', uploadParams.Bucket);
        console.log('Key:', uploadParams.Key);
        console.log('ContentType:', uploadParams.ContentType);
        console.log('Video size:', fileContent.length);

        // Upload to S3
        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);

        // Generate video URL
        const videoUrl = `s3://${process.env.AWS_BUCKET_NAME || 'scrpt'}/${fileName}`;

        // Clean up local file only if it exists (not for buffer uploads)
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        return {
            success: true,
            fileName: fileName,
            videoUrl: videoUrl,
            fileSize: file.size || fileContent.length,
            contentType: file.mimetype,
            originalName: file.originalname,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            s3Result: result
        };

    } catch (error) {
        // Clean up local file if it exists
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
            } catch (cleanupError) {
                console.error('Video cleanup error:', cleanupError);
            }
        }

        return {
            success: false,
            error: error.message,
            fileName: file ? file.originalname : 'unknown'
        };
    }
};

/**
 * Upload file to S3
 * @param {Object} file - Multer file object
 * @param {String} folder - S3 folder path (e.g., 'scrptMedia/img/100', 'scrptMedia/img/300')
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result with file info
 */
const uploadToS3 = async function (file, folder = 'scrptMedia/img/100', metadata = {}) {
    try {
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        // Handle both file path and buffer uploads
        let fileContent;
        if (file.buffer) {
            // Buffer upload (for processed images)
            fileContent = file.buffer;
        } else if (file.path) {
            // File path upload (for regular files)
            fileContent = fs.readFileSync(file.path);
        } else {
            throw new Error('File must have either buffer or path property');
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${timestamp}-${file.originalname}`;

        // S3 upload parameters
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            Key: fileName,
            Body: fileContent,
            ContentType: file.mimetype,
            Metadata: {
                'original-name': file.originalname,
                'upload-timestamp': timestamp.toString(),
                ...metadata
            }
        };

        console.log('=== S3 UPLOAD DEBUG ===');
        console.log('Bucket:', uploadParams.Bucket);
        console.log('Key:', uploadParams.Key);
        console.log('ContentType:', uploadParams.ContentType);
        console.log('File size:', fileContent.length);

        // Upload to S3
        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);

        // Generate file URL
        const fileUrl = `s3://${process.env.AWS_BUCKET_NAME || 'scrpt'}/${fileName}`;

        // Clean up local file only if it exists (not for buffer uploads)
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        return {
            success: true,
            fileName: fileName,
            fileUrl: fileUrl,
            fileSize: file.size || fileContent.length,
            contentType: file.mimetype,
            originalName: file.originalname,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            s3Result: result
        };

    } catch (error) {
        // Clean up local file if it exists
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }

        return {
            success: false,
            error: error.message,
            code: error.code,
            name: error.name
        };
    }
};

/**
 * Upload image to multiple S3 folders (different sizes)
 * @param {Object} file - Multer file object
 * @param {String} baseName - Base name for the image (without extension)
 * @param {Array} sizes - Array of size folders ['100', '300', '600', 'aspectfit_small', 'aspectfit']
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result with multiple file info
 */
const uploadImageToMultipleSizes = async function (file, baseName, sizes = ['100', '300', '600', 'aspectfit_small', 'aspectfit'], metadata = {}, customFolder = 'scrptMedia/img') {
    try {
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        const results = [];
        const fileExtension = path.extname(file.originalname);
        const timestamp = Date.now();
        
        // Read file content once
        const fileContent = fs.readFileSync(file.path);
        
        // Upload to each size folder
        for (const size of sizes) {
            const folder = `${customFolder}/${size}`;
            const fileName = `${folder}/${timestamp}-${baseName}${fileExtension}`;
            
            const uploadParams = {
                Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
                Key: fileName,
                Body: fileContent,
                ContentType: file.mimetype,
                Metadata: {
                    'original-name': file.originalname,
                    'base-name': baseName,
                    'size': size,
                    'upload-timestamp': timestamp.toString(),
                    ...metadata
                }
            };

            console.log(`=== S3 UPLOAD DEBUG (${size}) ===`);
            console.log('Bucket:', uploadParams.Bucket);
            console.log('Key:', uploadParams.Key);

            const command = new PutObjectCommand(uploadParams);
            const result = await s3Client.send(command);
            
            results.push({
                size: size,
                fileName: fileName,
                fileUrl: `s3://${process.env.AWS_BUCKET_NAME || 'scrpt'}/${fileName}`,
                success: true
            });
        }

        // Clean up local file
        fs.unlinkSync(file.path);

        return {
            success: true,
            baseName: baseName,
            originalName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            uploads: results
        };

    } catch (error) {
        // Clean up local file if it exists
        if (file && file.path) {
            try {
                fs.unlinkSync(file.path);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }

        return {
            success: false,
            error: error.message,
            code: error.code,
            name: error.name
        };
    }
};

/**
 * Generate signed URL for private S3 objects
 * @param {String} fileKey - S3 object key
 * @param {Number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<String>} Signed URL
 */
const generateSignedUrl = async function (fileKey, expiresIn = 3600) {
    try {
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            Key: fileKey
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return { success: true, url: signedUrl };
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return { success: false, error: error.message, name: error.name };
    }
};

/**
 * Convert S3 URI to HTTPS URL
 * @param {String} s3Uri - S3 URI (e.g., s3://bucket/key)
 * @returns {String} HTTPS URL
 */
const s3UriToHttps = function (s3Uri) {
    if (!s3Uri || !s3Uri.startsWith('s3://')) {
        return s3Uri;
    }
    
    const bucket = process.env.AWS_BUCKET_NAME || 'scrpt';
    const region = process.env.AWS_REGION || 'us-east-1';
    
    return s3Uri.replace(`s3://${bucket}/`, `https://${bucket}.s3.${region}.amazonaws.com/`);
};

/**
 * Upload buffer directly to S3 (for MJ images)
 * @param {Buffer} buffer - Image buffer
 * @param {String} key - S3 object key (e.g., 'scrptMedia/img/aspectfit/filename.png')
 * @param {String} contentType - MIME type (e.g., 'image/png')
 * @returns {Promise<Object>} Upload result
 */
const uploadBufferToS3 = async function (buffer, key, contentType = 'image/png') {
    try {
        console.log("=== S3 UPLOAD DEBUG ===");
        console.log("Bucket:", process.env.AWS_BUCKET_NAME || 'scrpt');
        console.log("Key:", key);
        console.log("ContentType:", contentType);
        console.log("Buffer size:", buffer.length);
        
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        // S3 upload parameters
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: {
                'upload-timestamp': Date.now().toString(),
                'source': 'mj-image'
            }
        };

        console.log('=== S3 BUFFER UPLOAD DEBUG ===');
        console.log('Bucket:', uploadParams.Bucket);
        console.log('Key:', uploadParams.Key);
        console.log('ContentType:', uploadParams.ContentType);
        console.log('Buffer size:', buffer.length);

        // Upload to S3
        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);
        
        console.log("✅ S3 Upload successful for key:", key);

        return {
            success: true,
            key: key,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            contentType: contentType,
            bufferSize: buffer.length,
            s3Result: result
        };

    } catch (error) {
        console.error('Error uploading buffer to S3:', error);
        return {
            success: false,
            error: error.message,
            code: error.code,
            name: error.name
        };
    }
};

/**
 * Fetch image from Google Drive using fileId
 * @param {String} fileId - Google Drive file ID
 * @returns {Promise<Buffer>} Image buffer
 */
const fetchImageFromGoogleDrive = async function (fileId) {
    return new Promise((resolve, reject) => {
        try {
            console.log('=== GOOGLE DRIVE FETCH DEBUG ===');
            console.log('FileId:', fileId);
            
            // Google Drive direct download URL
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            console.log('Download URL:', downloadUrl);
            
            const protocol = downloadUrl.startsWith('https:') ? https : http;
            
            const request = protocol.get(downloadUrl, (response) => {
                console.log('Response status:', response.statusCode);
                console.log('Response headers:', response.headers);
                
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to fetch image: ${response.statusCode} ${response.statusMessage}`));
                    return;
                }
                
                const chunks = [];
                
                response.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log('Fetched image size:', buffer.length);
                    resolve(buffer);
                });
                
                response.on('error', (error) => {
                    console.error('Response error:', error);
                    reject(error);
                });
            });
            
            request.on('error', (error) => {
                console.error('Request error:', error);
                reject(error);
            });
            
            request.setTimeout(30000, () => {
                console.error('Request timeout');
                request.destroy();
                reject(new Error('Request timeout'));
            });
            
        } catch (error) {
            console.error('Error in fetchImageFromGoogleDrive:', error);
            reject(error);
        }
    });
};

/**
 * Upload video file to S3 with proper folder structure
 * @param {Object} file - File object with buffer or path
 * @param {String} fileName - Generated filename
 * @param {String} contentType - MIME type
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result
 */
const uploadVideoToS3Folder = async function (file, fileName, contentType, metadata = {}) {
    try {
        console.log('=== S3 VIDEO UPLOAD TO FOLDER ===');
        console.log('FileName:', fileName);
        console.log('ContentType:', contentType);
        
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        // Handle both file path and buffer uploads
        let fileContent;
        if (file.buffer) {
            fileContent = file.buffer;
        } else if (file.path) {
            fileContent = fs.readFileSync(file.path);
        } else {
            throw new Error('Video file must have either buffer or path property');
        }
        
        // S3 folder structure: video/original/filename
        const s3Key = `video/original/${fileName}`;
        
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType,
            Metadata: {
                'original-name': fileName,
                'upload-timestamp': Date.now().toString(),
                'file-type': 'video',
                'folder': 'video/original',
                ...metadata
            }
        };

        console.log('S3 Key:', s3Key);
        console.log('File size:', fileContent.length);

        // Upload to S3
        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);

        // Generate video URL
        const videoUrl = `https://${process.env.AWS_BUCKET_NAME || 'scrpt'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

        return {
            success: true,
            fileName: fileName,
            s3Key: s3Key,
            videoUrl: videoUrl,
            fileSize: fileContent.length,
            contentType: contentType,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            s3Result: result
        };

    } catch (error) {
        console.error('Error uploading video to S3:', error);
        return {
            success: false,
            error: error.message,
            fileName: fileName
        };
    }
};

/**
 * Upload video thumbnail to S3 with multiple sizes
 * @param {Buffer} thumbnailBuffer - Thumbnail image buffer
 * @param {String} baseFileName - Base filename without extension
 * @param {Array} sizes - Array of thumbnail sizes ['100', '300', '600', 'aspectfit', 'aspectfit_small']
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result with multiple thumbnails
 */
const uploadVideoThumbnailsToS3 = async function (thumbnailBuffer, baseFileName, sizes = ['100', '300', '600', 'aspectfit', 'aspectfit_small'], metadata = {}) {
    try {
        console.log('=== S3 VIDEO THUMBNAIL UPLOAD ===');
        console.log('BaseFileName:', baseFileName);
        console.log('Sizes:', sizes);
        console.log('Buffer size:', thumbnailBuffer.length);
        
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        const results = [];
        const timestamp = Date.now();
        
        // Upload to each thumbnail size folder
        for (const size of sizes) {
            const s3Key = `video/thumbnails/${size}/${timestamp}-${baseFileName}.png`;
            
            const uploadParams = {
                Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
                Key: s3Key,
                Body: thumbnailBuffer,
                ContentType: 'image/png',
                Metadata: {
                    'base-name': baseFileName,
                    'size': size,
                    'upload-timestamp': timestamp.toString(),
                    'file-type': 'video-thumbnail',
                    'folder': `video/thumbnails/${size}`,
                    ...metadata
                }
            };

            console.log(`Uploading thumbnail (${size}):`, s3Key);

            const command = new PutObjectCommand(uploadParams);
            const result = await s3Client.send(command);
            
            const thumbnailUrl = `https://${process.env.AWS_BUCKET_NAME || 'scrpt'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
            
            results.push({
                size: size,
                s3Key: s3Key,
                thumbnailUrl: thumbnailUrl,
                success: true
            });
        }

        return {
            success: true,
            baseFileName: baseFileName,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            thumbnails: results
        };

    } catch (error) {
        console.error('Error uploading video thumbnails to S3:', error);
        return {
            success: false,
            error: error.message,
            baseFileName: baseFileName
        };
    }
};

/**
 * Upload audio file to S3 with proper folder structure
 * @param {Object} file - File object with buffer or path
 * @param {String} fileName - Generated filename
 * @param {String} contentType - MIME type
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Upload result
 */
const uploadAudioToS3Folder = async function (file, fileName, contentType, metadata = {}) {
    try {
        console.log('=== S3 AUDIO UPLOAD TO FOLDER ===');
        console.log('FileName:', fileName);
        console.log('ContentType:', contentType);
        
        // Create S3Client with proper credentials
        const s3Client = createS3Client();
        
        // Handle both file path and buffer uploads
        let fileContent;
        if (file.buffer) {
            fileContent = file.buffer;
        } else if (file.path) {
            fileContent = fs.readFileSync(file.path);
        } else {
            throw new Error('Audio file must have either buffer or path property');
        }
        
        // S3 folder structure: audio/original/filename
        const s3Key = `audio/original/${fileName}`;
        
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType,
            Metadata: {
                'original-name': fileName,
                'upload-timestamp': Date.now().toString(),
                'file-type': 'audio',
                'folder': 'audio/original',
                ...metadata
            }
        };

        console.log('S3 Key:', s3Key);
        console.log('File size:', fileContent.length);

        // Upload to S3
        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);

        // Generate audio URL
        const audioUrl = `https://${process.env.AWS_BUCKET_NAME || 'scrpt'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

        return {
            success: true,
            fileName: fileName,
            s3Key: s3Key,
            audioUrl: audioUrl,
            fileSize: fileContent.length,
            contentType: contentType,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1',
            s3Result: result
        };

    } catch (error) {
        console.error('Error uploading audio to S3:', error);
        return {
            success: false,
            error: error.message,
            fileName: fileName
        };
    }
};

/**
 * Resize image buffer to multiple sizes using Sharp and upload to S3
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {String} fileName - Base filename (with extension)
 * @param {Array} sizes - Array of size objects with width, height, and folder info
 * @param {Object} options - Additional options for Sharp and S3
 * @returns {Promise<Object>} Resize and upload results
 */
const resizeAndUploadImageToS3 = async function (
    imageBuffer, 
    fileName, 
    sizes = [
        { width: 100, height: 100, folder: '100', fit: 'cover' },
        { width: 300, height: 300, folder: '300', fit: 'cover' },
        { width: 600, height: 600, folder: '600', fit: 'cover' },
        { width: 800, height: null, folder: 'aspectfit_small', fit: 'inside' },
        { width: 1200, height: null, folder: 'aspectfit', fit: 'inside' }
    ],
    options = {}
) {
    try {
        console.log("🔄 Starting image resize and upload process...");
        console.log("📁 Original filename:", fileName);
        console.log("📐 Sizes to generate:", sizes.length);
        console.log("📦 Buffer size:", imageBuffer.length, "bytes");

        // Create S3Client
        const s3Client = createS3Client();
        
        // Extract file info
        const baseName = path.parse(fileName).name;
        const extension = path.parse(fileName).ext || '.png';
        const timestamp = options.timestamp || Date.now();
        const customFolder = options.customFolder || 'scrptMedia/img';
        
        const results = [];
        const errors = [];

        // Process each size
        for (let i = 0; i < sizes.length; i++) {
            const sizeConfig = sizes[i];
            
            try {
                console.log(`🔄 Processing size: ${sizeConfig.folder} (${sizeConfig.width}x${sizeConfig.height || 'auto'})`);
                
                // Create Sharp instance
                let sharpInstance = sharp(imageBuffer);
                
                // Apply resize based on configuration
                if (sizeConfig.height) {
                    // Fixed dimensions
                    sharpInstance = sharpInstance.resize(sizeConfig.width, sizeConfig.height, {
                        fit: sizeConfig.fit || 'cover',
                        position: sizeConfig.position || 'center',
                        background: sizeConfig.background || { r: 255, g: 255, b: 255, alpha: 1 }
                    });
                } else {
                    // Width only (auto height)
                    sharpInstance = sharpInstance.resize(sizeConfig.width, null, {
                        fit: sizeConfig.fit || 'inside',
                        withoutEnlargement: sizeConfig.withoutEnlargement !== false
                    });
                }
                
                // Apply format and quality settings
                if (extension.toLowerCase() === '.jpg' || extension.toLowerCase() === '.jpeg') {
                    sharpInstance = sharpInstance.jpeg({ 
                        quality: sizeConfig.quality || options.jpegQuality || 85,
                        progressive: true
                    });
                } else if (extension.toLowerCase() === '.webp') {
                    sharpInstance = sharpInstance.webp({ 
                        quality: sizeConfig.quality || options.webpQuality || 85 
                    });
                } else {
                    // Default to PNG
                    sharpInstance = sharpInstance.png({ 
                        compressionLevel: sizeConfig.compression || options.pngCompression || 6,
                        progressive: true
                    });
                }
                
                // Generate resized buffer
                const resizedBuffer = await sharpInstance.toBuffer();
                
                console.log(`✅ Resized ${sizeConfig.folder}: ${resizedBuffer.length} bytes`);
                
                // Generate S3 key
                const s3Key = `${customFolder}/${sizeConfig.folder}/${timestamp}_${baseName}${extension}`;
                
                // Upload to S3
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
                    Key: s3Key,
                    Body: resizedBuffer,
                    ContentType: `image/${extension.substring(1)}`,
                    Metadata: {
                        'original-name': fileName,
                        'base-name': baseName,
                        'size-folder': sizeConfig.folder,
                        'dimensions': `${sizeConfig.width}x${sizeConfig.height || 'auto'}`,
                        'fit-mode': sizeConfig.fit || 'cover',
                        'upload-timestamp': timestamp.toString(),
                        'source': options.source || 'resize-util'
                    }
                };
                
                console.log(`🚀 Uploading ${sizeConfig.folder} to S3: ${s3Key}`);
                
                const command = new PutObjectCommand(uploadParams);
                const uploadResult = await s3Client.send(command);
                
                // Generate URLs
                const bucket = process.env.AWS_BUCKET_NAME || 'scrpt';
                const region = process.env.AWS_REGION || 'us-east-1';
                const httpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
                const s3Uri = `s3://${bucket}/${s3Key}`;
                
                results.push({
                    size: sizeConfig.folder,
                    width: sizeConfig.width,
                    height: sizeConfig.height,
                    dimensions: `${sizeConfig.width}x${sizeConfig.height || 'auto'}`,
                    s3Key: s3Key,
                    httpUrl: httpUrl,
                    s3Uri: s3Uri,
                    bufferSize: resizedBuffer.length,
                    success: true,
                    uploadResult: uploadResult
                });
                
                console.log(`✅ Successfully uploaded ${sizeConfig.folder}: ${httpUrl}`);
                
            } catch (sizeError) {
                console.error(`❌ Error processing size ${sizeConfig.folder}:`, sizeError.message);
                errors.push({
                    size: sizeConfig.folder,
                    error: sizeError.message,
                    success: false
                });
            }
        }

        const successCount = results.length;
        const errorCount = errors.length;
        
        console.log(`🎉 Resize and upload completed: ${successCount} successful, ${errorCount} failed`);

        return {
            success: successCount > 0,
            originalFileName: fileName,
            baseName: baseName,
            timestamp: timestamp,
            originalBufferSize: imageBuffer.length,
            totalResults: successCount + errorCount,
            successCount: successCount,
            errorCount: errorCount,
            results: results,
            errors: errors,
            bucket: process.env.AWS_BUCKET_NAME || 'scrpt',
            region: process.env.AWS_REGION || 'us-east-1'
        };

    } catch (error) {
        console.error('❌ Fatal error in resizeAndUploadImageToS3:', error);
        return {
            success: false,
            error: error.message,
            originalFileName: fileName,
            originalBufferSize: imageBuffer ? imageBuffer.length : 0,
            results: [],
            errors: [{ error: error.message, success: false }]
        };
    }
};

module.exports = {
    uploadToS3: uploadToS3,
    uploadVideoToS3: uploadVideoToS3,
    uploadVideoToS3Folder: uploadVideoToS3Folder,
    uploadVideoThumbnailsToS3: uploadVideoThumbnailsToS3,
    uploadAudioToS3Folder: uploadAudioToS3Folder,
    uploadBufferToS3: uploadBufferToS3,
    fetchImageFromGoogleDrive: fetchImageFromGoogleDrive,
    uploadImageToMultipleSizes: uploadImageToMultipleSizes,
    resizeAndUploadImageToS3: resizeAndUploadImageToS3,
    generateSignedUrl: generateSignedUrl,
    s3UriToHttps: s3UriToHttps,
    upload: upload,
    videoUpload: videoUpload,
    createS3Client: createS3Client
};
