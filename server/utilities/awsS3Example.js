/*
 * Example usage of AWS S3 Utility
 * This shows how to integrate S3 uploads into your existing controllers
 */

const awsS3Utils = require('../utilities/awsS3Utils');

// Example controller function for uploading files
const uploadFile = async function (req, res) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.json({
                status: 400,
                message: "No file uploaded. Please upload a file.",
                results: null
            });
        }

        // Upload to S3 with custom folder and metadata
        const uploadResult = await awsS3Utils.uploadToS3(
            req.file, 
            'scrptMedia/img/100', // S3 folder for 100px images
            {
                'uploaded-by': req.session.user ? req.session.user.Email : 'anonymous',
                'user-id': req.session.user ? req.session.user._id : null
            }
        );

        if (uploadResult.success) {
            // Save file info to database
            const fileRecord = {
                fileName: uploadResult.fileName,
                fileUrl: uploadResult.fileUrl,
                fileSize: uploadResult.fileSize,
                contentType: uploadResult.contentType,
                originalName: uploadResult.originalName,
                bucket: uploadResult.bucket,
                region: uploadResult.region,
                uploadedBy: req.session.user ? req.session.user._id : null,
                uploadedAt: new Date()
            };

            // TODO: Save fileRecord to your database
            // Example: await FileModel.create(fileRecord);

            res.json({
                status: 200,
                message: "File uploaded successfully!",
                results: {
                    fileId: fileRecord._id, // From database
                    fileName: uploadResult.fileName,
                    fileUrl: uploadResult.fileUrl,
                    fileSize: uploadResult.fileSize,
                    contentType: uploadResult.contentType,
                    originalName: uploadResult.originalName
                }
            });
        } else {
            res.json({
                status: 500,
                message: "Error uploading file to S3",
                results: {
                    error: uploadResult.error,
                    code: uploadResult.code,
                    name: uploadResult.name
                }
            });
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.json({
            status: 500,
            message: "Error uploading file",
            results: {
                error: error.message
            }
        });
    }
};

// Example function to get a signed URL for private files
const getFileUrl = async function (req, res) {
    try {
        const { fileKey } = req.params;
        const { expiresIn = 3600 } = req.query; // Default 1 hour

        const signedUrlResult = await awsS3Utils.generateSignedUrl(fileKey, parseInt(expiresIn));

        if (signedUrlResult.success) {
            res.json({
                status: 200,
                message: "Signed URL generated successfully",
                results: {
                    signedUrl: signedUrlResult.url,
                    expiresIn: expiresIn,
                    fileKey: fileKey
                }
            });
        } else {
            res.json({
                status: 404,
                message: "File not found or error generating URL",
                results: null
            });
        }

    } catch (error) {
        console.error('Get URL error:', error);
        res.json({
            status: 500,
            message: "Error generating file URL",
            results: {
                error: error.message
            }
        });
    }
};

// Example function for uploading images to multiple sizes
const uploadImageToMultipleSizes = async function (req, res) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.json({
                status: 400,
                message: "No file uploaded. Please upload a file.",
                results: null
            });
        }

        const { baseName } = req.body; // Base name for the image
        const { sizes } = req.body; // Optional: custom sizes array

        // Upload to multiple S3 folders (different sizes)
        const uploadResult = await awsS3Utils.uploadImageToMultipleSizes(
            req.file,
            baseName || 'image', // Base name for the image
            sizes || ['100', '300', '600', 'aspectfit_small', 'aspectfit'], // Default sizes
            {
                'uploaded-by': req.session.user ? req.session.user.Email : 'anonymous',
                'user-id': req.session.user ? req.session.user._id : null
            }
        );

        if (uploadResult.success) {
            // Save file info to database
            const fileRecord = {
                baseName: uploadResult.baseName,
                originalName: uploadResult.originalName,
                fileSize: uploadResult.fileSize,
                contentType: uploadResult.contentType,
                bucket: uploadResult.bucket,
                region: uploadResult.region,
                uploadedBy: req.session.user ? req.session.user._id : null,
                uploadedAt: new Date(),
                sizes: uploadResult.uploads // Array of all size uploads
            };

            // TODO: Save fileRecord to your database
            // Example: await FileModel.create(fileRecord);

            res.json({
                status: 200,
                message: "Image uploaded to multiple sizes successfully!",
                results: {
                    baseName: uploadResult.baseName,
                    originalName: uploadResult.originalName,
                    fileSize: uploadResult.fileSize,
                    contentType: uploadResult.contentType,
                    uploads: uploadResult.uploads // Array with all size uploads
                }
            });
        } else {
            res.json({
                status: 500,
                message: "Error uploading image to S3",
                results: {
                    error: uploadResult.error,
                    code: uploadResult.code,
                    name: uploadResult.name
                }
            });
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.json({
            status: 500,
            message: "Error uploading image",
            results: {
                error: error.message
            }
        });
    }
};

// Example function to convert S3 URI to HTTPS URL
const convertToHttps = function (req, res) {
    try {
        const { s3Uri } = req.body;

        if (!s3Uri || !s3Uri.startsWith('s3://')) {
            return res.json({
                status: 400,
                message: "Invalid S3 URI provided",
                results: null
            });
        }

        const httpsUrl = awsS3Utils.s3UriToHttps(s3Uri);

        res.json({
            status: 200,
            message: "S3 URI converted to HTTPS URL",
            results: {
                s3Uri: s3Uri,
                httpsUrl: httpsUrl
            }
        });

    } catch (error) {
        console.error('Convert URL error:', error);
        res.json({
            status: 500,
            message: "Error converting S3 URI",
            results: {
                error: error.message
            }
        });
    }
};

module.exports = {
    uploadFile: uploadFile,
    uploadImageToMultipleSizes: uploadImageToMultipleSizes,
    getFileUrl: getFileUrl,
    convertToHttps: convertToHttps,
    upload: awsS3Utils.upload // Export multer middleware
};
