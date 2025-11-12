var formidable = require("formidable");
var fs = require("fs");
var counters = require("../models/countersModel.js");
const os = require("os");
const path = require("path");

// Required imports for video/audio processing
const media = require('../models/mediaModel.js');
const mongoose = require("mongoose");
const Page = require('../models/pageModel.js');
const { crop_image, resize_image } = require('./mediaController.js');
const { uploadVideoToS3Folder, uploadVideoThumbnailsToS3, uploadAudioToS3Folder } = require('../utilities/awsS3Utils.js');
const { 
  convertVideoModern, 
  getVideoMetadata, 
  convertToMultipleFormats, 
  optimizeForWeb,
  createHighQualityVersion 
} = require('../utilities/videoConversionUtils.js');
const crypto = require("crypto");

// Configuration for process.urls if not defined
if (!process.urls) {
  process.urls = {
    small__thumbnail: "small_thumbnail",
    SG__thumbnail: "SG_thumbnail",
    medium__thumbnail: "medium_thumbnail",
    large__thumbnail: "large_thumbnail",
    aspectfit__thumbnail: "aspectfit_thumbnail",
    aspectfit_small__thumbnail: "aspectfit_small_thumbnail",
    __VIDEO_UPLOAD_DIR: __dirname + "/../../public/assets/Media/video"
  };
}

const DEFAULT_VIDEO_UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "assets", "Media", "video");
const TEMP_VIDEO_UPLOAD_DIR = path.join(os.tmpdir(), "scrpt-media-uploads");
let resolvedUploadDir = null;

function ensureWritableUploadDir() {
  if (resolvedUploadDir && fs.existsSync(resolvedUploadDir)) {
    return resolvedUploadDir;
  }

  const candidates = [
    TEMP_VIDEO_UPLOAD_DIR,
    process.urls?.__VIDEO_UPLOAD_DIR || DEFAULT_VIDEO_UPLOAD_DIR,
  ];

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      const testFile = path.join(
        candidate,
        `.write-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
      );
      fs.writeFileSync(testFile, "ok");
      try {
        fs.unlinkSync(testFile);
      } catch (cleanupError) {
        console.warn("Failed to clean upload dir test file:", cleanupError.message);
      }
      resolvedUploadDir = candidate;
      process.urls.__VIDEO_UPLOAD_DIR = candidate;
      console.log("Using writable upload directory:", candidate);
      return resolvedUploadDir;
    } catch (error) {
      console.warn(`Upload directory not writable (${candidate}):`, error.message);
    }
  }

  return null;
}

function getFirstFieldValue(field) {
  if (Array.isArray(field)) {
    return field.length > 0 ? field[0] : undefined;
  }
  return field;
}

function parseNumericField(field) {
  const raw = getFirstFieldValue(field);
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ensureFilenameWithExtension(baseName, fallbackExt) {
  if (!baseName || typeof baseName !== "string") {
    return null;
  }
  if (baseName.includes(".")) {
    return baseName;
  }
  const safeExt = fallbackExt ? fallbackExt.replace(/^\./, "") : "";
  if (!safeExt) {
    return baseName;
  }
  return `${baseName}.${safeExt}`;
}

function scheduleDeferredMediaProcessing({
  fileType,
  mediaId,
  uploadResult,
  generatedFileName,
  ext,
  initialDuration = null,
  initialDimensions = null,
}) {
  if (!mediaId) {
    return;
  }

  if (fileType === "Video" && !uploadResult?.videoUrl) {
    return;
  }

  setImmediate(async () => {
    console.log("🎬 Deferred processing started:", { mediaId, fileType });
    try {
      if (fileType === "Video") {
        let conversionResult = null;
        let thumbnailResult = null;
        let metadataResult = null;

        try {
          conversionResult = await processVideoWithConversion_S3(
            uploadResult.videoUrl,
            generatedFileName,
            ext
          );
        } catch (conversionError) {
          console.error("❌ Deferred conversion failed:", conversionError.message);
        }

        try {
          metadataResult = await getVideoMetadata(uploadResult.videoUrl);
        } catch (metadataError) {
          console.error("❌ Deferred metadata extraction failed:", metadataError.message);
        }

        try {
          thumbnailResult = await video__getNsaveThumbnail_S3(uploadResult.videoUrl, mediaId, {
            fallbackDimensions: initialDimensions || metadataResult?.video,
          });
        } catch (thumbnailError) {
          console.error("❌ Deferred thumbnail generation failed:", thumbnailError.message);
        }

        const mediaDoc = await media.findById(mediaId);
        if (!mediaDoc) {
          console.warn("⚠️ Deferred processing skipped, media not found:", mediaId);
          return;
        }

        let hasChanges = false;
        mediaDoc.MetaData = mediaDoc.MetaData || {};
        mediaDoc.Location = Array.isArray(mediaDoc.Location) ? mediaDoc.Location : [];

        if (conversionResult?.success && conversionResult.s3Info?.url) {
          const existingConverted = mediaDoc.Location.some(
            (loc) => loc?.Type === "converted" && loc?.S3Key === conversionResult.s3Info?.s3Key
          );
          if (!existingConverted) {
            mediaDoc.Location.push({
              Size: conversionResult.convertedSize,
              URL: conversionResult.s3Info.url,
              Type: "converted",
              Index: mediaDoc.Location.length,
              S3Key: conversionResult.s3Info.s3Key,
              Format: conversionResult.convertedFormat,
              CompressionRatio: conversionResult.compressionRatio,
              Duration: conversionResult.duration || initialDuration || null,
            });
            mediaDoc.markModified("Location");
            hasChanges = true;
          }
        }

        let durationToSet = initialDuration;
        if (metadataResult?.success && typeof metadataResult.duration === "number") {
          durationToSet = metadataResult.duration;
        }
        if (durationToSet !== null) {
          const originalLocation = mediaDoc.Location.find((loc) => loc && loc.Type === "original");
          if (originalLocation) {
            originalLocation.Duration = durationToSet;
            mediaDoc.markModified("Location");
            hasChanges = true;
          }
        }

        let finalDimensions = initialDimensions;
        if (
          metadataResult?.success &&
          metadataResult.video?.width &&
          metadataResult.video?.height
        ) {
          finalDimensions = {
            width: metadataResult.video.width,
            height: metadataResult.video.height,
            aspectRatio:
              metadataResult.video.height === 0
                ? null
                : parseFloat((metadataResult.video.width / metadataResult.video.height).toFixed(4)),
          };
        }

        if (thumbnailResult?.success) {
          const aspectfitThumbnail = thumbnailResult.thumbnails?.find((t) => t.size === "aspectfit");
          if (aspectfitThumbnail?.thumbnailUrl) {
            mediaDoc.thumbnail = aspectfitThumbnail.thumbnailUrl;
          }
          if (thumbnailResult.dimensions) {
            finalDimensions = thumbnailResult.dimensions;
          }
          hasChanges = true;
        }

        if (finalDimensions) {
          mediaDoc.MetaData.VideoDimensions = finalDimensions;
          hasChanges = true;
        }

        mediaDoc.ProcessingStatus = "completed";
        mediaDoc.UpdatedOn = new Date();

        if (hasChanges) {
          mediaDoc.markModified("MetaData");
          await mediaDoc.save();
          console.log("🎬 Deferred video processing completed:", mediaId);
        } else {
          await media.updateOne(
            { _id: mediaId },
            {
              $set: {
                ProcessingStatus: "completed",
                UpdatedOn: new Date(),
              },
            }
          );
        }
      } else if (fileType === "Audio") {
        await media.updateOne(
          { _id: mediaId },
          {
            $set: {
              ProcessingStatus: "completed",
              UpdatedOn: new Date(),
            },
          }
        );
        console.log("🎧 Deferred audio processing marked complete:", mediaId);
      }
    } catch (error) {
      console.error("❌ Deferred processing crashed:", { mediaId, fileType, error: error.message });
      try {
        await media.updateOne(
          { _id: mediaId },
          {
            $set: {
              ProcessingStatus: "failed",
              ProcessingError: error.message,
              UpdatedOn: new Date(),
            },
          }
        );
      } catch (updateError) {
        console.error("❌ Failed to update processing status:", updateError.message);
      }
    }
  });
}

function deriveS3InfoFromUrl(url) {
  if (!url) {
    return {
      bucket: process.env.AWS_BUCKET_NAME || null,
      region: process.env.AWS_REGION || null,
      key: null
    };
  }

  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    const bucket = hostParts[0] || process.env.AWS_BUCKET_NAME || null;
    const region = hostParts.length >= 3 ? hostParts[2] : process.env.AWS_REGION || null;
    const key = decodeURIComponent(parsed.pathname.replace(/^\/+/g, ''));

    return { bucket, region, key };
  } catch (error) {
    console.warn("Failed to derive S3 info from URL:", error.message);
    return {
      bucket: process.env.AWS_BUCKET_NAME || null,
      region: process.env.AWS_REGION || null,
      key: null
    };
  }
}

function cloneAndSanitizeLocations(locations = []) {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations.map((location) => {
    const cloned = { ...(location || {}) };
    delete cloned._id;
    delete cloned.id;
    return cloned;
  });
}

function parseNumericValue(value) {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ensureAspectRatio(width, height) {
  if (!width || !height || height === 0) {
    return null;
  }

  const ratio = width / height;
  return Number.isFinite(ratio) ? parseFloat(ratio.toFixed(4)) : null;
}

function ensureVideoDimensions(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') {
    return null;
  }

  const width = parseNumericValue(dimensions.width);
  const height = parseNumericValue(dimensions.height);

  if (!width || !height) {
    return null;
  }

  return {
    width,
    height,
    aspectRatio: ensureAspectRatio(width, height)
  };
}

function ensureDuration(value) {
  const duration = parseNumericValue(value);
  return typeof duration === 'number' ? duration : null;
}

function ensureFileSize(value, fallback) {
  const size = parseNumericValue(value);
  if (typeof size === 'number') {
    return size;
  }
  return fallback;
}

function ensureContentType(existingType, fallback) {
  if (existingType && typeof existingType === 'string') {
    return existingType;
  }
  return fallback;
}

function ensureS3Key(existingKey, derivedKey) {
  if (existingKey && typeof existingKey === 'string') {
    return existingKey;
  }
  return derivedKey || null;
}

function ensureBucket(existingBucket, derivedBucket) {
  if (existingBucket && typeof existingBucket === 'string') {
    return existingBucket;
  }
  return derivedBucket || process.env.AWS_BUCKET_NAME || 'scrpt';
}

function ensureRegion(existingRegion, derivedRegion) {
  if (existingRegion && typeof existingRegion === 'string') {
    return existingRegion;
  }
  return derivedRegion || process.env.AWS_REGION || 'us-east-1';
}

function ensureVideoUrl(location, fallbackUrl) {
  if (location && location.URL) {
    return location.URL;
  }
  return fallbackUrl || null;
}

function cloneMetaData(metaData) {
  if (!metaData || typeof metaData !== 'object') {
    return {};
  }

  return JSON.parse(JSON.stringify(metaData));
}

function calculateFileHash(filePath, algorithm = 'md5') {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('error', (streamError) => {
        console.error(`Error reading file for hash (${algorithm}):`, streamError);
        reject(streamError);
      });

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => {
        const digest = hash.digest('hex');
        resolve(digest);
      });
    } catch (error) {
      reject(error);
    }
  });
}


async function video__getNsaveThumbnail_S3(s3VideoUrl, MediaId, options = {}) {
  try {
    console.log("=== GENERATE VIDEO THUMBNAIL (S3) ===");
    console.log("S3 Video URL:", s3VideoUrl);
    console.log("MediaId:", MediaId);

    const util = require("util");
    const exec = require("child_process").exec;
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const axios = require('axios');

    const fallbackDimensions = options && options.fallbackDimensions ? options.fallbackDimensions : null;
    const isValidDimension = (value) => typeof value === 'number' && !isNaN(value) && value > 0;
    let videoDimensions = null;

    if (fallbackDimensions && isValidDimension(fallbackDimensions.width) && isValidDimension(fallbackDimensions.height)) {
      videoDimensions = {
        width: fallbackDimensions.width,
        height: fallbackDimensions.height
      };
    }

    // Extract filename from S3 URL for thumbnail naming
    const urlParts = s3VideoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const baseFileName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    
    console.log("Base filename for thumbnails:", baseFileName);

    // Create temporary directory for processing
    const tempDir = __dirname + "/../../temp/";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate thumbnail filename
    const outputThumbnail = baseFileName + "_thumbnail.png";
    const tempOutputPath = tempDir + outputThumbnail;

    console.log("Temp output path:", tempOutputPath);

    // Generate thumbnail directly from S3 URL using FFmpeg (preserving original dimensions)
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    const command = `"${ffmpeg.path}" -i "${s3VideoUrl}" -vframes 1 -y "${tempOutputPath}"`;
    console.log("FFmpeg command (S3 direct, original dimensions):", command);

    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) console.log("FFmpeg stdout:", stdout);
    if (stderr) console.log("FFmpeg stderr:", stderr);

    // Extract duration from FFmpeg stderr output
    let videoDuration = null;
    if (stderr) {
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        videoDuration = hours * 3600 + minutes * 60 + seconds;
        console.log("🎬 Extracted duration from FFmpeg:", videoDuration, "seconds");
      }

      if (!videoDimensions) {
        const resolutionMatch = stderr.match(/,\s*(\d{2,5})x(\d{2,5})/);
        if (resolutionMatch) {
          const parsedWidth = parseInt(resolutionMatch[1], 10);
          const parsedHeight = parseInt(resolutionMatch[2], 10);

          if (isValidDimension(parsedWidth) && isValidDimension(parsedHeight)) {
            videoDimensions = {
              width: parsedWidth,
              height: parsedHeight
            };
            console.log("🎬 Extracted resolution from FFmpeg:", videoDimensions);
          }
        }
      }
    }

    // Check if thumbnail was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error("Thumbnail generation failed - output file not created");
    }

    console.log("Thumbnail generated successfully:", tempOutputPath);

    // Read thumbnail file
    const thumbnailBuffer = fs.readFileSync(tempOutputPath);
    console.log("Thumbnail buffer size:", thumbnailBuffer.length);

    // Upload thumbnails to S3 (only aspectfit for speed)
    const thumbnailResult = await uploadVideoThumbnailsToS3(
      thumbnailBuffer, 
      baseFileName, 
      ['aspectfit']
    );

    if (!thumbnailResult.success) {
      throw new Error(`S3 thumbnail upload failed: ${thumbnailResult.error}`);
    }

    console.log("🎬 S3 thumbnail upload successful:", thumbnailResult);

    // Update media record with thumbnail info (use existing thumbnail field)
    const aspectfitThumbnail = thumbnailResult.thumbnails.find(t => t.size === 'aspectfit');
    const thumbnailUpdate = {
      thumbnail: aspectfitThumbnail ? aspectfitThumbnail.thumbnailUrl : outputThumbnail
    };

    if (videoDimensions && isValidDimension(videoDimensions.width) && isValidDimension(videoDimensions.height)) {
      const aspectRatio = videoDimensions.height === 0 ? null : parseFloat((videoDimensions.width / videoDimensions.height).toFixed(4));
      thumbnailUpdate['MetaData.VideoDimensions'] = {
        width: videoDimensions.width,
        height: videoDimensions.height,
        aspectRatio: Number.isFinite(aspectRatio) ? aspectRatio : null
      };
      console.log("🎬 Updating MetaData with video dimensions:", thumbnailUpdate['MetaData.VideoDimensions']);
    }

    // If we extracted duration, update it in the Location array
    if (videoDuration !== null) {
      thumbnailUpdate['Location.0.Duration'] = videoDuration;
      console.log("🎬 Also updating duration in Location array:", videoDuration, "seconds");
    }

    console.log("🎬 Updating media record with thumbnail info:", JSON.stringify(thumbnailUpdate, null, 2));
    console.log("🎬 MediaId being updated:", MediaId);

    const updateResult = await media.updateOne(
      { _id: MediaId },
      { $set: thumbnailUpdate }
    );

    console.log("🎬 Media record update result:", updateResult);
    console.log("🎬 Media record updated with thumbnail info");

    // Verify the update by checking the database
    const updatedMedia = await media.findById(MediaId);
    if (updatedMedia && updatedMedia.thumbnail) {
      console.log("✅ VERIFICATION: Thumbnail field found in database");
      console.log("✅ VERIFICATION: Thumbnail URL:", updatedMedia.thumbnail);
      if (updatedMedia.Location && updatedMedia.Location[0] && updatedMedia.Location[0].Duration) {
        console.log("✅ VERIFICATION: Duration field found in Location array:", updatedMedia.Location[0].Duration, "seconds");
      } else {
        console.log("⚠️ VERIFICATION: Duration field NOT found in Location array");
      }
      if (updatedMedia.MetaData && updatedMedia.MetaData.VideoDimensions) {
        console.log("✅ VERIFICATION: Video dimensions stored in MetaData:", updatedMedia.MetaData.VideoDimensions);
      } else {
        console.log("⚠️ VERIFICATION: Video dimensions NOT found in MetaData");
      }
    } else {
      console.log("❌ VERIFICATION: Thumbnail field NOT found in database");
    }

    // Clean up temporary thumbnail file only
    try {
      fs.unlinkSync(tempOutputPath);
      console.log("Temporary thumbnail file cleaned up");
    } catch (cleanupError) {
      console.warn("Failed to clean up temporary thumbnail file:", cleanupError.message);
    }

    return {
      success: true,
      baseFileName: baseFileName,
      thumbnails: thumbnailResult.thumbnails,
      dimensions: thumbnailUpdate['MetaData.VideoDimensions'] || (videoDimensions ? {
        width: videoDimensions.width,
        height: videoDimensions.height,
        aspectRatio: videoDimensions.height === 0 ? null : parseFloat((videoDimensions.width / videoDimensions.height).toFixed(4))
      } : null)
    };

  } catch (error) {
    console.error("Error generating video thumbnail:", error);
    console.error("Error stack:", error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert audio to MP3 format (S3-based)
 * @param {String} filePath - Path to audio file
 * @param {String} fileName - Audio file name
 * @returns {Promise<Object>} Conversion result
 */
async function Audio__anyToMP3_S3(filePath, fileName) {
  try {
    console.log("=== AUDIO CONVERSION (S3-ONLY) START ===");
    console.log("File path:", filePath);
    console.log("File name:", fileName);

    const util = require("util");
    const exec = require("child_process").exec;
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Create temporary directory for processing
    const tempDir = __dirname + "/../../temp/";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempOutputPath = tempDir + fileName.replace(/\.[^/.]+$/, "_converted.mp3");

    // Convert to MP3 directly from file path
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    const command = `"${ffmpeg.path}" -i "${filePath}" -acodec libmp3lame -ab 128k "${tempOutputPath}"`;
    console.log("FFmpeg command:", command);

    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) console.log("FFmpeg stdout:", stdout);
    if (stderr) console.log("FFmpeg stderr:", stderr);

    // Check if conversion was successful
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error("Audio conversion failed - output file not created");
    }

    console.log("Audio conversion successful:", tempOutputPath);

    // Upload converted audio to S3
    const convertedFileObj = {
      path: tempOutputPath,
      originalname: fileName.replace(/\.[^/.]+$/, "_converted.mp3"),
      mimetype: 'audio/mpeg',
      size: fs.statSync(tempOutputPath).size
    };

    const convertedUploadResult = await uploadAudioToS3Folder(
      convertedFileObj, 
      fileName.replace(/\.[^/.]+$/, "_converted.mp3"), 
      'audio/mpeg',
      { 
        converted: true,
        originalFormat: fileName.split('.').pop()
      }
    );

    if (!convertedUploadResult.success) {
      // Clean up temp file
      fs.unlinkSync(tempOutputPath);
      throw new Error(`S3 upload of converted audio failed: ${convertedUploadResult.error}`);
    }

    console.log("Converted audio uploaded to S3:", convertedUploadResult);

    // Clean up temp file
    fs.unlinkSync(tempOutputPath);

    return {
      success: true,
      converted: true,
      originalFormat: fileName.split('.').pop(),
      convertedFormat: 'mp3',
      s3Info: {
        s3Key: convertedUploadResult.s3Key,
        url: convertedUploadResult.audioUrl,
        bucket: convertedUploadResult.bucket,
        region: convertedUploadResult.region
      }
    };

  } catch (error) {
    console.error("Error in S3 audio processing:", error);
    return {
      success: false,
      error: error.message,
      converted: false
    };
  }
}

function Audio__anyToMP3(inputFile) {
  if (inputFile) {
    var outputFile = "";
    var extension = "";
    extension = inputFile.split(".").pop();
    extensionUpper = extension.toUpperCase();

    switch (extensionUpper) {
      case "OGG":
        outputFile = inputFile.replace("." + extension, ".mp3");
        __convertAudio(inputFile, outputFile);
        break;

      case "WAV":
        outputFile = inputFile.replace("." + extension, ".mp3");
        __convertAudio(inputFile, outputFile);
        break;

      case "MP3":
        //no need to convert
        break;

      default:
        console.log("------Unknown extension found = ", extension);
        if (extension != "" && extension != null) {
          outputFile = inputFile.replace("." + extension, ".mp3");
          __convertAudio(inputFile, outputFile);
        }
        break;
    }
  }
  return;
}

function __convertAudio(inputFile, outputFile) {
  var util = require("util"),
    exec = require("child_process").exec;

  const ffmpeg = require('@ffmpeg-installer/ffmpeg');
  var command =
    `"${ffmpeg.path}" -fflags +genpts -i "` +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    inputFile +
    `" -r 24 "` +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    outputFile + `"`;

  exec(command, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);

    if (error) {
      console.log("exec error: " + error);
      //response.statusCode = 404;
      //response.end();
    } else {
      console.log(
        "==========Successfully converted from " +
          inputFile +
          " to " +
          outputFile
      );
    }
  });
}
function __convertVideo(inputFile, outputFile) {
  var util = require("util"),
    exec = require("child_process").exec;

  const ffmpeg = require('@ffmpeg-installer/ffmpeg');
  var command =
    `"${ffmpeg.path}" -fflags +genpts -i "` +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    inputFile +
    `" -r 24 "` +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    outputFile + `"`;

  exec(command, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);

    if (error) {
      console.log("exec error: " + error);
      //response.statusCode = 404;
      //response.end();
    } else {
      console.log(
        "==========Successfully converted from " +
          inputFile +
          " to " +
          outputFile
      );
    }
  });
}

/**
 * Process video with modern conversion and optimization (S3-based)
 * @param {String} s3VideoUrl - S3 URL of the video file
 * @param {String} fileName - Original filename
 * @param {String} ext - File extension
 * @returns {Promise<Object>} Conversion result
 */
async function processVideoWithConversion_S3(s3VideoUrl, fileName, ext) {
  try {
    console.log("=== MODERN VIDEO PROCESSING (S3-ONLY) START ===");
    console.log("S3 Video URL:", s3VideoUrl);
    console.log("File name:", fileName);
    console.log("Extension:", ext);

    // Create temporary directory for processing only
    const tempDir = __dirname + "/../../temp/";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempOutputPath = tempDir + fileName.replace(`.${ext}`, '_converted.mp4');

    console.log("Processing video directly from S3 URL");

    // Get video metadata directly from S3 URL
    const metadata = await getVideoMetadata(s3VideoUrl);
    if (!metadata.success) {
      console.warn("Could not get video metadata:", metadata.error);
    } else {
      console.log("Video metadata:", metadata);
    }

    // Determine if conversion is needed
    const needsConversion = shouldConvertVideo(ext, metadata);
    console.log("Needs conversion:", needsConversion);

    if (!needsConversion) {
      console.log("Video format is already optimal, skipping conversion");
      return {
        success: true,
        converted: false,
        originalFormat: ext,
        duration: metadata.success ? metadata.duration : null,
        message: "Video format is already optimal"
      };
    }

    // Convert to optimized MP4 directly from S3 URL
    const conversionResult = await convertVideoModern(s3VideoUrl, tempOutputPath, {
      // Optimized settings for web delivery
      videoCodec: 'libx264',
      videoPreset: 'medium',        // Good balance of speed and quality
      videoCrf: 23,                 // High quality
      videoBitrate: '2000k',        // 2Mbps for good quality
      audioCodec: 'aac',
      audioBitrate: '128k',         // Good audio quality
      maxWidth: 1920,               // Full HD max
      maxHeight: 1080,
      maintainAspectRatio: true,
      faststart: true,              // Enable fast start for streaming
      threads: 0                    // Use all CPU cores
    });

    if (!conversionResult.success) {
      throw new Error(`Video conversion failed: ${conversionResult.error}`);
    }

    console.log("Video conversion successful:", conversionResult);

    // Upload converted video to S3
    const convertedFileObj = {
      path: tempOutputPath,
      originalname: fileName.replace(`.${ext}`, '_converted.mp4'),
      mimetype: 'video/mp4',
      size: conversionResult.outputSize
    };

    const convertedUploadResult = await uploadVideoToS3Folder(
      convertedFileObj, 
      fileName.replace(`.${ext}`, '_converted.mp4'), 
      'video/mp4',
      { 
        converted: true,
        originalFormat: ext,
        compressionRatio: conversionResult.compressionRatio
      }
    );

    if (!convertedUploadResult.success) {
      // Clean up temp file
      fs.unlinkSync(tempOutputPath);
      throw new Error(`S3 upload of converted video failed: ${convertedUploadResult.error}`);
    }

    console.log("Converted video uploaded to S3:", convertedUploadResult);

    // Clean up temp file
    fs.unlinkSync(tempOutputPath);

    return {
      success: true,
      converted: true,
      originalFormat: ext,
      convertedFormat: 'mp4',
      originalSize: conversionResult.inputSize,
      convertedSize: conversionResult.outputSize,
      compressionRatio: conversionResult.compressionRatio,
      conversionTime: conversionResult.conversionTime,
      duration: metadata.success ? metadata.duration : null,
      s3Info: {
        s3Key: convertedUploadResult.s3Key,
        url: convertedUploadResult.videoUrl,
        bucket: convertedUploadResult.bucket,
        region: convertedUploadResult.region
      },
      metadata: metadata
    };

  } catch (error) {
    console.error("Error in S3 video processing:", error);
    return {
      success: false,
      error: error.message,
      converted: false
    };
  }
}

/**
 * Process video with modern conversion and optimization (legacy local version)
 * @param {String} localFilePath - Path to local video file
 * @param {String} fileName - Original filename
 * @param {String} ext - File extension
 * @returns {Promise<Object>} Conversion result
 */
async function processVideoWithConversion(localFilePath, fileName, ext) {
  try {
    console.log("=== MODERN VIDEO PROCESSING START ===");
    console.log("Local file path:", localFilePath);
    console.log("File name:", fileName);
    console.log("Extension:", ext);

    // Get video metadata
    const metadata = await getVideoMetadata(localFilePath);
    if (!metadata.success) {
      console.warn("Could not get video metadata:", metadata.error);
  } else {
      console.log("Video metadata:", metadata);
    }

    // Determine if conversion is needed
    const needsConversion = shouldConvertVideo(ext, metadata);
    console.log("Needs conversion:", needsConversion);

    if (!needsConversion) {
      console.log("Video format is already optimal, skipping conversion");
      return {
        success: true,
        converted: false,
        originalFormat: ext,
        duration: metadata.success ? metadata.duration : null,
        message: "Video format is already optimal"
      };
    }

    // Create conversion paths
    const baseFileName = fileName.replace(`.${ext}`, '');
    const convertedFileName = `${baseFileName}_converted.mp4`;
    const convertedPath = localFilePath.replace(fileName, convertedFileName);

    console.log("Converting to:", convertedPath);

    // Convert to optimized MP4
    const conversionResult = await convertVideoModern(localFilePath, convertedPath, {
      // Optimized settings for web delivery
      videoCodec: 'libx264',
      videoPreset: 'medium',        // Good balance of speed and quality
      videoCrf: 23,                 // High quality
      videoBitrate: '2000k',        // 2Mbps for good quality
      audioCodec: 'aac',
      audioBitrate: '128k',         // Good audio quality
      maxWidth: 1920,               // Full HD max
      maxHeight: 1080,
      maintainAspectRatio: true,
      faststart: true,              // Enable fast start for streaming
      threads: 0                    // Use all CPU cores
    });

    if (!conversionResult.success) {
      throw new Error(`Video conversion failed: ${conversionResult.error}`);
    }

    console.log("Video conversion successful:", conversionResult);

    // Upload converted video to S3
    const convertedFileObj = {
      path: convertedPath,
      originalname: convertedFileName,
      mimetype: 'video/mp4',
      size: conversionResult.outputSize
    };

    const convertedUploadResult = await uploadVideoToS3Folder(
      convertedFileObj, 
      convertedFileName, 
      'video/mp4',
      { 
        converted: true,
        originalFormat: ext,
        compressionRatio: conversionResult.compressionRatio
      }
    );

    if (!convertedUploadResult.success) {
      throw new Error(`S3 upload of converted video failed: ${convertedUploadResult.error}`);
    }

    console.log("Converted video uploaded to S3:", convertedUploadResult);

    // Clean up local converted file
    try {
      fs.unlinkSync(convertedPath);
      console.log("Local converted file cleaned up");
    } catch (cleanupError) {
      console.warn("Failed to clean up converted file:", cleanupError.message);
    }

    return {
      success: true,
      converted: true,
      originalFormat: ext,
      convertedFormat: 'mp4',
      originalSize: conversionResult.inputSize,
      convertedSize: conversionResult.outputSize,
      compressionRatio: conversionResult.compressionRatio,
      conversionTime: conversionResult.conversionTime,
      duration: metadata.success ? metadata.duration : null,
      s3Info: {
        s3Key: convertedUploadResult.s3Key,
        url: convertedUploadResult.videoUrl,
        bucket: convertedUploadResult.bucket,
        region: convertedUploadResult.region
      },
      metadata: metadata
    };

  } catch (error) {
    console.error("Error in video processing:", error);
    return {
      success: false,
      error: error.message,
      converted: false
    };
  }
}

/**
 * Determine if video needs conversion based on format and metadata
 * @param {String} ext - File extension
 * @param {Object} metadata - Video metadata
 * @returns {Boolean} Whether conversion is needed
 */
function shouldConvertVideo(ext, metadata) {
  // Always convert these formats for better compatibility
  const formatsToConvert = ['avi', 'wmv', 'flv', 'mkv', 'm4v', 'mov'];
  
  if (formatsToConvert.includes(ext.toLowerCase())) {
    return true;
  }

  // For MP4 and WebM, check if optimization is needed
  if (ext.toLowerCase() === 'mp4' || ext.toLowerCase() === 'webm') {
    if (metadata.success && metadata.video) {
      // Convert if video is too large or uses inefficient codec
      const { width, height, codec, bitrate } = metadata.video;
      
      // Convert if resolution is too high
      if (width > 1920 || height > 1080) {
        return true;
      }
      
      // Convert if using old codec
      if (codec && !['h264', 'h265', 'vp8', 'vp9'].includes(codec.toLowerCase())) {
        return true;
      }
      
      // Convert if bitrate is too high (over 5Mbps)
      if (bitrate > 5000000) {
        return true;
      }
    }
  }

  return false;
}

async function saveMedia__toDB_S3(
  req,
  res,
  incNum,
  fileName,
  fileType,
  uploadResult,
  conversionResult = null,
  fields = {},
  options = {}
) {
  const { deferProcessing = false, onAfterSave } = options || {};
  try {
    console.log("=== SAVE MEDIA TO DB (S3) ===");
    console.log("incNum:", incNum);
    console.log("fileName:", fileName);
    console.log("fileType:", fileType);
    console.log("uploadResult:", uploadResult);

    const isDuplicateMedia = !!(uploadResult && uploadResult.isDuplicate);
    const isVideo = fileType === "Video";

    if (!req.session.user) {
      throw new Error("User not authenticated");
    }

    if (!req.session.user.FSGsArr2) {
    req.session.user.FSGsArr2 = {};
  }

    var thumbName = fileName.replace("." + fileName.split(".").pop(), ".png");
    var locator = fileName.replace("." + fileName.split(".").pop(), "");

    var cType = "video/webm";
    if (fileType === "Audio") {
      cType = "audio/mp3";
      thumbName = "";
    }

    // Check if thumbnail was already set by video processing
    let finalThumbnail = thumbName;
    if (conversionResult && conversionResult.thumbnailUrl) {
      finalThumbnail = conversionResult.thumbnailUrl;
      console.log("🎬 Using thumbnail from video processing:", finalThumbnail);
    } else if (isVideo && uploadResult.thumbnailUrl) {
      finalThumbnail = uploadResult.thumbnailUrl;
      console.log("🎬 Using thumbnail from upload result:", finalThumbnail);
    } else {
      console.log("🎬 Using default thumbnail name:", finalThumbnail);
    }

    // Process group tags - handle both array and string formats
    let groupTagsArray = [];
    if (fields.groupTags) {
      if (Array.isArray(fields.groupTags)) {
        // If it's an array, take the first element and split it
        const groupTagsString = fields.groupTags[0] || '';
        if (groupTagsString) {
          groupTagsArray = groupTagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
      } else if (typeof fields.groupTags === 'string') {
        // If it's a string, split it directly
        groupTagsArray = fields.groupTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    // Look up group tag IDs from the groupTags collection
    let groupTagIds = [];
    if (groupTagsArray.length > 0) {
      try {
        const groupTags = require('../models/groupTagsModel.js');
        const matchingGroupTags = await groupTags.find({
          GroupTagTitle: { $in: groupTagsArray },
          $or: [{ status: 3 }, { status: 1 }] // Active group tags
        });
        
        groupTagIds = matchingGroupTags.map(gt => gt._id.toString());
        console.log('Found group tag IDs:', groupTagIds);
      } catch (error) {
        console.error('Error looking up group tags:', error);
        // Continue without group tags if lookup fails
      }
    }

    // Process form fields - handle arrays from formidable
    const getFieldValue = (field) => {
      if (Array.isArray(field)) {
        return field[0] || '';
      }
      return field || '';
    };

    const content = getFieldValue(fields.content);
    const title = getFieldValue(fields.title);
    const prompt = getFieldValue(fields.prompt);
    const privacySetting = getFieldValue(fields.postPrivacySetting) || "PublicWithName";
    const rawStreamId = getFieldValue(fields.streamId || fields.StreamId || fields.streamID);
    const rawPageId = getFieldValue(fields.pageId || fields.PageId || fields.pageID);
    const streamId = typeof rawStreamId === 'string' ? rawStreamId.trim() : '';
    const pageId = typeof rawPageId === 'string' ? rawPageId.trim() : '';
    const streamObjectId = streamId && mongoose.Types.ObjectId.isValid(streamId)
      ? new mongoose.Types.ObjectId(streamId)
      : null;
    const isPrivate = privacySetting === "OnlyForOwner" ? 1 : 0;

    const dataToUpload = {
      Location: [],
      AutoId: incNum,
      UploadedBy: "user",
      UploadedOn: Date.now(),
      UploaderID: req.session.user._id,
      Source: "User-generated",
      SourceUniqueID: null,
      Domains: null,
      GroupTags: groupTagIds,
      Collection: null,
      Status: 2,
      MetaMetaTags: null,
      MetaTags: null,
      MetaData: uploadResult && uploadResult.isDuplicate && uploadResult.existingMetaData
        ? { ...uploadResult.existingMetaData }
        : {},
      AddedWhere: "board",
      IsDeleted: 0,
      TagType: "",
      ContentType: cType,
      MediaType: fileType,
      AddedHow: "recording",
      OwnerFSGs: req.session.user.FSGsArr2,
      IsPrivate: isPrivate,
      Locator: locator,
      thumbnail: (() => {
        console.log("🎬 SAVE TO DB - Setting thumbnail:", finalThumbnail);
        console.log("🎬 SAVE TO DB - conversionResult:", conversionResult);
        console.log("🎬 SAVE TO DB - uploadResult:", uploadResult);
        return finalThumbnail;
      })(),
      ProcessingStatus: deferProcessing ? "processing" : "completed",
      // Add text content fields
      Content: content,
      Title: title,
      Prompt: prompt,
      PostPrivacySetting: privacySetting,
      // Add post tracking fields
      PostedBy: req.session.user._id,
      PostedOn: new Date(),
      UpdatedOn: new Date()
    };

    if (streamObjectId) {
      dataToUpload.StreamId = streamObjectId;
    }

    // Extract metadata for duration and dimensions
    let videoDuration = conversionResult?.duration || uploadResult?.duplicateDuration || null;
    let videoDimensions = isDuplicateMedia && uploadResult?.existingVideoDimensions
      ? ensureVideoDimensions(uploadResult.existingVideoDimensions)
      : null;

    // Check if duration was provided from the frontend
    if (!videoDuration && fields.duration) {
      const frontendDuration = parseFloat(getFieldValue(fields.duration));
      if (!isNaN(frontendDuration)) {
        videoDuration = frontendDuration;
        console.log("Using duration from frontend:", videoDuration, "seconds");
      }
    }

    // Fetch metadata from the uploaded video when available
    if (!deferProcessing && !isDuplicateMedia && isVideo && uploadResult.videoUrl) {
      try {
        console.log("Extracting metadata from uploaded video for duration and dimensions...");
        const metadataResult = await getVideoMetadata(uploadResult.videoUrl);

        if (metadataResult.success) {
          if (!videoDuration && metadataResult.duration) {
            videoDuration = metadataResult.duration;
            console.log("Duration extracted:", videoDuration);
          }

          if (metadataResult.video && metadataResult.video.width && metadataResult.video.height) {
            videoDimensions = {
              width: metadataResult.video.width,
              height: metadataResult.video.height
            };
            console.log("Video dimensions extracted:", videoDimensions);
          }
        } else if (metadataResult.error) {
          console.warn("Video metadata extraction reported failure:", metadataResult.error);
        }
      } catch (error) {
        console.warn("Failed to extract video metadata:", error.message);
      }
    }

    if (isDuplicateMedia && Array.isArray(uploadResult.existingLocations) && uploadResult.existingLocations.length > 0) {
      dataToUpload.Location = uploadResult.existingLocations.map((location, idx) => {
        const sanitized = { ...(location || {}) };
        delete sanitized._id;
        delete sanitized.id;
        if (sanitized.Index === undefined && typeof location?.Index !== 'number') {
          sanitized.Index = idx;
        }
        if (sanitized.Duration !== undefined) {
          sanitized.Duration = ensureDuration(sanitized.Duration);
        }
        return sanitized;
      });

      if (!videoDuration) {
        const existingOriginalLocation = dataToUpload.Location.find((loc) => loc && loc.Type === "original")
          || dataToUpload.Location[0];
        if (existingOriginalLocation) {
          const derivedDuration = ensureDuration(existingOriginalLocation.Duration);
          if (derivedDuration !== null) {
            videoDuration = derivedDuration;
            existingOriginalLocation.Duration = derivedDuration;
          }
        }
      }
    } else {
      // Add S3 URL to Location array
      dataToUpload.Location.push({
        Size: uploadResult.fileSize,
        URL: uploadResult.videoUrl || uploadResult.audioUrl,
        Type: "original",
        Index: 0,
        S3Key: uploadResult.s3Key,
        Duration: videoDuration // Include duration from video processing
      });

      // Add converted video if available
      if (!deferProcessing && conversionResult && conversionResult.success && conversionResult.converted) {
        dataToUpload.Location.push({
          Size: conversionResult.convertedSize,
          URL: conversionResult.s3Info.url,
          Type: "converted",
          Index: 1,
          S3Key: conversionResult.s3Info.s3Key,
          Format: conversionResult.convertedFormat,
          CompressionRatio: conversionResult.compressionRatio,
          Duration: videoDuration || conversionResult.duration || null // Include duration for converted video
        });
      }
    }

    if (videoDimensions && videoDimensions.width && videoDimensions.height) {
      const aspectRatio = videoDimensions.height === 0 ? null : parseFloat((videoDimensions.width / videoDimensions.height).toFixed(4));
      dataToUpload.MetaData = dataToUpload.MetaData || {};
      dataToUpload.MetaData.VideoDimensions = {
        width: videoDimensions.width,
        height: videoDimensions.height,
        aspectRatio: Number.isFinite(aspectRatio) ? aspectRatio : null
      };
      console.log("Pre-saving MetaData.VideoDimensions:", dataToUpload.MetaData.VideoDimensions);
    }

    if (uploadResult && uploadResult.videoHash) {
      dataToUpload.MetaData = dataToUpload.MetaData || {};
      dataToUpload.MetaData.VideoHash = uploadResult.videoHash;
      console.log("Stored video hash in MetaData.VideoHash:", dataToUpload.MetaData.VideoHash);
    }

    console.log("Saving to database:", dataToUpload);

    const model = await media(dataToUpload).save();
    dataToUpload._id = model._id;

    console.log("Database save successful, ID:", dataToUpload._id);

    // Generate thumbnail for videos
    if (!deferProcessing && isVideo && !isDuplicateMedia) {
        try {
          console.log("Starting thumbnail generation for video...");
          const thumbnailResult = await video__getNsaveThumbnail_S3(uploadResult.videoUrl, dataToUpload._id, {
            fallbackDimensions: videoDimensions
          });
          console.log("Thumbnail generation result:", thumbnailResult);

          if (thumbnailResult && thumbnailResult.dimensions && thumbnailResult.success) {
            dataToUpload.MetaData = dataToUpload.MetaData || {};
            dataToUpload.MetaData.VideoDimensions = thumbnailResult.dimensions;
            console.log("Updated MetaData.VideoDimensions from thumbnail result:", dataToUpload.MetaData.VideoDimensions);
          }
        } catch (thumbnailError) {
          console.error("Thumbnail generation failed:", thumbnailError);
          // Continue with the upload even if thumbnail generation fails
        }
      } else if (isVideo && isDuplicateMedia) {
        console.log("Skipping thumbnail generation for duplicate video asset.");
      }

    console.log("=== UPLOAD COMPLETE ===");
    
    if (pageId) {
      try {
        if (!mongoose.Types.ObjectId.isValid(pageId)) {
          throw new Error("Invalid pageId format");
        }

        const updateResult = await Page.updateOne(
          { _id: new mongoose.Types.ObjectId(pageId) },
          { $push: { Medias: dataToUpload._id } }
        );

        if ((updateResult.modifiedCount ?? updateResult.nModified ?? 0) === 0) {
          console.warn("⚠️ Page update did not modify any documents for pageId:", pageId);
        }
      } catch (pageError) {
        console.error("Error attaching media to page:", pageError.message);
      }
    }

    const response = {
      success: true,
      code: '200', // Add code field for frontend compatibility
      message: pageId
        ? `${fileType} uploaded and added to page successfully`
        : `${fileType} uploaded successfully`,
      msg: pageId
        ? `${fileType} uploaded and added to page successfully`
        : `${fileType} uploaded successfully`, // Add msg field for consistency
      data: dataToUpload,
      s3Info: {
        s3Key: uploadResult.s3Key,
        url: uploadResult.videoUrl || uploadResult.audioUrl,
        bucket: uploadResult.bucket,
        region: uploadResult.region
      },
      pageId: pageId || null,
      streamId: streamId || null,
      pageMediaId: pageId ? dataToUpload._id : null,
    };

    response.isDuplicate = uploadResult?.isDuplicate || false;
    if (uploadResult?.existingMediaId) {
      response.duplicateOf = uploadResult.existingMediaId;
    }

    if (deferProcessing) {
      response.processingDeferred = true;
      response.message = pageId
        ? `${fileType} upload received. Processing will continue in the background before being added to the page.`
        : `${fileType} upload received. Processing will continue in the background.`;
      response.msg = response.message;
    }

    // Add conversion info if available
    if (!deferProcessing && conversionResult && conversionResult.success) {
      response.conversionInfo = {
        converted: conversionResult.converted,
        originalFormat: conversionResult.originalFormat,
        convertedFormat: conversionResult.convertedFormat,
        compressionRatio: conversionResult.compressionRatio,
        conversionTime: conversionResult.conversionTime,
        originalSize: conversionResult.originalSize,
        convertedSize: conversionResult.convertedSize
      };
    }

    res.json(response);

    if (typeof onAfterSave === "function") {
      try {
        onAfterSave({
          mediaId: dataToUpload._id,
          videoDuration,
          videoDimensions,
          fileType,
        });
      } catch (afterSaveError) {
        console.error("Deferred processing callback failed:", afterSaveError.message);
      }
    }

  } catch (error) {
    console.error("Error saving media to DB:", error);
    res.json({
      success: false,
      code: '500', // Add code field for frontend compatibility
      error: error.message,
      msg: error.message, // Add msg field for consistency
      fileName: fileName
    });
  }
}
function video__anyToMP4OrWebm(inputFile) {
  if (inputFile) {
    var outputFile = "";
    var extension = "";
    extension = inputFile.split(".").pop();
    extensionUpper = extension.toUpperCase();

    switch (extensionUpper) {
      case "WEBM":
        outputFile = inputFile.replace("." + extension, ".mp4");
        __convertVideo(inputFile, outputFile);
        break;

      case "MP4":
        outputFile = inputFile.replace("." + extension, ".webm");
        __convertVideo(inputFile, outputFile);
        break;

      case "MOV":
        outputFile = inputFile.replace("." + extension, ".mp4");
        __convertVideo(inputFile, outputFile);

        outputFile = inputFile.replace("." + extension, ".webm");
        __convertVideo(inputFile, outputFile);
        break;

      default:
        console.log("------Unknown extension found = ", extension);
        if (extension != "" && extension != null) {
          outputFile = inputFile.replace("." + extension, ".mp4");
          __convertVideo(inputFile, outputFile);

          outputFile = inputFile.replace("." + extension, ".webm");
          __convertVideo(inputFile, outputFile);
        }
        break;
    }
  }
  return;
}

async function saveFile(req, res, fileType) {
  console.log("=== S3 VIDEO/AUDIO UPLOAD START ===");
  console.log("FileType:", fileType);

  const uploadDir = ensureWritableUploadDir();
  if (!uploadDir) {
    console.error("No writable upload directory available for video/audio uploads");
    return res.json({
      success: false,
      code: '500',
      error: "No writable storage available for uploads",
      msg: "No writable storage available for uploads"
    });
  }

  var form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.uploadDir = uploadDir; // Temporary local storage
  form.maxFileSize = 100 * 1024 * 1024; // 100MB limit
  
  form.parse(req, async function (err, fields, files) {
    if (err) {
      console.error("Form parsing error:", err);
      return res.json({ 
        success: false, 
        code: '500',
        error: "File upload failed",
        msg: "File upload failed"
      });
    }

    // Debug: Log all files and fields
    console.log("=== DEBUG: ALL FILES ===");
    console.log("files object:", JSON.stringify(files, null, 2));
    console.log("files keys:", Object.keys(files));
    
    console.log("=== DEBUG: ALL FIELDS ===");
    console.log("fields object:", JSON.stringify(fields, null, 2));
    console.log("fields keys:", Object.keys(fields));

    // Check if any file was uploaded (regardless of field name)
    const fileKeys = Object.keys(files);
    const hasFileUpload = fileKeys.length > 0;
    const hasS3Metadata =
      !!(
        getFirstFieldValue(fields?.s3Key) ||
        getFirstFieldValue(fields?.s3_object_key) ||
        getFirstFieldValue(fields?.key) ||
        getFirstFieldValue(fields?.mediaUrl) ||
        getFirstFieldValue(fields?.videoUrl) ||
        getFirstFieldValue(fields?.audioUrl) ||
        getFirstFieldValue(fields?.s3Url)
      );
    const isDirectS3Upload = !hasFileUpload && hasS3Metadata;

    if (!hasFileUpload && !isDirectS3Upload) {
      console.error("No files uploaded and no S3 metadata provided");
      return res.json({ 
        success: false, 
        code: '400',
        error: "No files uploaded or S3 metadata provided",
        msg: "No files uploaded or S3 metadata provided"
      });
    }

    // Get the file (prefer 'file' field, fallback to first available)
    let fileKey = 'file';
    if (!files.file && fileKeys.length > 0) {
      fileKey = fileKeys[0];
    }
    let uploadedFile = files[fileKey];
    console.log("=== DEBUG: FILE DETAILS ===");
    console.log("File key:", fileKey);
    console.log("Uploaded file:", uploadedFile);
    console.log("Is array:", Array.isArray(files[fileKey]));

    let cleanupUploadedFile = () => {};
    let originalFileName = "";
    let fileSize = 0;
    let fileMimeType = "";
    let filePath = "";
    let uploadResult;
    let conversionResult = null;
    let providedGeneratedFileName = null;

    if (hasFileUpload) {
      // Handle case where file is an array (formidable sometimes returns arrays)
      if (Array.isArray(uploadedFile)) {
        uploadedFile = uploadedFile[0]; // Take the first file
      }
      
      // Validate file upload
      if (!uploadedFile) {
        console.error("No file uploaded");
        return res.json({ success: false, error: "No file uploaded" });
      }
    }

    // Get file properties (formidable uses different property names)
    if (hasFileUpload) {
      originalFileName = uploadedFile.originalFilename || uploadedFile.name;
      fileSize = uploadedFile.size;
      fileMimeType = uploadedFile.mimetype || uploadedFile.type;
      filePath = uploadedFile.filepath || uploadedFile.path;
      let uploadedFilePath = filePath;

      cleanupUploadedFile = () => {
        if (!uploadedFilePath) {
          return;
        }
        fs.unlink(uploadedFilePath, (unlinkError) => {
          if (unlinkError && unlinkError.code !== "ENOENT") {
            console.warn("Failed to clean temporary upload:", unlinkError.message);
          }
        });
        uploadedFilePath = null;
      };
    }

    if (hasFileUpload) {
      if (!originalFileName || originalFileName === 'invalid-name') {
        console.error("Invalid file name:", originalFileName);
        cleanupUploadedFile();
        return res.json({ success: false, error: "Invalid file name" });
      }

      if (!fileSize || fileSize === 0) {
        console.error("Empty file uploaded");
        cleanupUploadedFile();
        return res.json({ success: false, error: "Empty file uploaded" });
      }

      console.log("=== FILE INFO ===");
      console.log("File size:", fileSize);
      console.log("File name:", originalFileName);
      console.log("File MIME type:", fileMimeType);
      console.log("File path:", filePath);
    } else {
      console.log("=== DIRECT S3 UPLOAD (NO FILE) ===");
    }
    
    console.log("=== FORM FIELDS ===");
    console.log("Content:", fields.content);
    console.log("Title:", fields.title);
    console.log("Prompt:", fields.prompt);
    console.log("GroupTags:", fields.groupTags);
    console.log("PostPrivacySetting:", fields.postPrivacySetting);

    try {
    // Validate and extract file extension
    if (isDirectS3Upload && !originalFileName) {
      originalFileName =
        getFirstFieldValue(fields.generatedFileName) ||
        getFirstFieldValue(fields.fileName) ||
        getFirstFieldValue(fields.originalFileName) ||
        getFirstFieldValue(fields.originalFilename) ||
        getFirstFieldValue(fields.s3Key)?.split("/").pop() ||
        getFirstFieldValue(fields.key)?.split("/").pop() ||
        `remote_${Date.now()}.${fileType === "Video" ? "mp4" : "mp3"}`;
    }

    var temp = (originalFileName || "").split(".");
    if (temp.length < 2) {
      const fallbackExt = fileType === "Video" ? "mp4" : "mp3";
      originalFileName = ensureFilenameWithExtension(originalFileName || `remote_${Date.now()}`, fallbackExt);
      temp = originalFileName.split(".");
    }
    
    var ext = temp.pop();
    if (!ext || ext.length === 0) {
      const fallbackExt = fileType === "Video" ? "mp4" : "mp3";
      ext = fallbackExt;
      originalFileName = ensureFilenameWithExtension(originalFileName || `remote_${Date.now()}`, fallbackExt);
    }

    // Validate file extension for video/audio
    const validExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', 'webm', 'mp3', 'wav', 'ogg'];
    if (!validExtensions.includes(ext.toLowerCase())) {
      console.error("Unsupported file extension:", ext);
      const errorMsg = `Unsupported file extension: ${ext}. Supported: ${validExtensions.join(', ')}`;
      cleanupUploadedFile();
      return res.json({ 
        success: false, 
        code: '400',
        error: errorMsg,
        msg: errorMsg
      });
    }

    let videoHash = null;
    let duplicateMediaRecord = null;
    let isDuplicateVideo = false;

    if (!isDirectS3Upload && fileMimeType.startsWith("video/")) {
      try {
        videoHash = await calculateFileHash(filePath, 'md5');
        console.log("Computed video hash (MD5):", videoHash);
      } catch (hashError) {
        console.error("Failed to compute video hash:", hashError);
      }

      if (videoHash) {
        try {
          duplicateMediaRecord = await media
            .findOne({
              "MetaData.VideoHash": videoHash,
              MediaType: "Video",
              IsDeleted: { $ne: 1 }
            })
            .sort({ UploadedOn: -1 })
            .lean();

          if (duplicateMediaRecord) {
            isDuplicateVideo = true;
            console.log("Duplicate video detected. Reusing media:", duplicateMediaRecord._id);
          }
        } catch (lookupError) {
          console.error("Error checking for duplicate videos:", lookupError);
        }
      }
    }


    var incNum = 0;
      
      // Get counter for unique filename
      const counterData = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
        { new: true }
      );
      
      if (!counterData) {
        throw new Error("Failed to get counter");
      }
      
      incNum = counterData.seq;
      let generatedFileName;
      if (isDirectS3Upload) {
        generatedFileName =
          ensureFilenameWithExtension(
            providedGeneratedFileName || originalFileName || `remote_${incNum}`,
            ext
          ) || `remote_${incNum}.${ext}`;
      } else {
        generatedFileName = Date.now() + "_recording_" + incNum + "." + ext;
      }

      console.log("Generated fileName:", generatedFileName);
      console.log("File extension:", ext);

      // Upload directly to S3 (no local storage)
      const fileObj = hasFileUpload ? {
        path: filePath, // Use the temporary file path from formidable
        originalname: generatedFileName,
        mimetype: fileMimeType,
        size: fileSize
      } : null;

      if (isDirectS3Upload) {
        const directS3Key =
          getFirstFieldValue(fields.s3Key) ||
          getFirstFieldValue(fields.s3_object_key) ||
          getFirstFieldValue(fields.key) ||
          null;
        const directBucket =
          getFirstFieldValue(fields.s3Bucket) ||
          getFirstFieldValue(fields.bucket) ||
          process.env.AWS_BUCKET_NAME ||
          null;
        const directRegion =
          getFirstFieldValue(fields.s3Region) ||
          getFirstFieldValue(fields.region) ||
          process.env.AWS_REGION ||
          null;
        const directUrl =
          getFirstFieldValue(fields.mediaUrl) ||
          getFirstFieldValue(fields.videoUrl) ||
          getFirstFieldValue(fields.audioUrl) ||
          getFirstFieldValue(fields.url) ||
          null;
        const directThumbnail =
          getFirstFieldValue(fields.thumbnailUrl) ||
          getFirstFieldValue(fields.posterUrl) ||
          null;
        const directMime =
          getFirstFieldValue(fields.mimeType) ||
          getFirstFieldValue(fields.contentType) ||
          getFirstFieldValue(fields.fileMimeType) ||
          (fileType === "Video" ? "video/mp4" : "audio/mpeg");
        const directFileSize =
          parseNumericField(fields.fileSize) ||
          parseNumericField(fields.size) ||
          undefined;
        const fallbackExtFromS3 = (() => {
          const keySource =
            (directS3Key || "").split(".").pop() ||
            (directUrl || "").split(".").pop() ||
            null;
          if (keySource && keySource.length <= 6) {
            return keySource;
          }
          return fileType === "Video" ? "mp4" : "mp3";
        })();
        const providedFileNameCandidate =
          getFirstFieldValue(fields.generatedFileName) ||
          getFirstFieldValue(fields.fileName) ||
          getFirstFieldValue(fields.originalFileName) ||
          getFirstFieldValue(fields.originalFilename) ||
          (directS3Key ? directS3Key.split("/").pop() : null) ||
          `remote_${Date.now()}.${fallbackExtFromS3}`;
        const providedFileName = ensureFilenameWithExtension(
          providedFileNameCandidate,
          fallbackExtFromS3
        );
        providedGeneratedFileName = providedFileName;

        originalFileName = providedFileName || generatedFileName;
        fileMimeType = directMime;
        fileSize = directFileSize || 0;

        if (!directS3Key || !directUrl) {
          console.error("Missing S3 metadata (s3Key or media URL)");
          return res.json({
            success: false,
            code: "400",
            error: "Missing S3 metadata (s3Key or media URL)",
            msg: "Missing S3 metadata (s3Key or media URL)"
          });
        }

        uploadResult = {
          success: true,
          isDuplicate: false,
          s3Key: directS3Key,
          bucket: directBucket,
          region: directRegion,
          fileSize: directFileSize,
          contentType: directMime,
        };

        if (fileType === "Video") {
          uploadResult.videoUrl = directUrl;
          if (directThumbnail) {
            uploadResult.thumbnailUrl = directThumbnail;
          }
        } else {
          uploadResult.audioUrl = directUrl;
        }

        const providedVideoHash = getFirstFieldValue(fields.videoHash) || getFirstFieldValue(fields.mediaHash);
        if (providedVideoHash) {
          uploadResult.videoHash = providedVideoHash;
        }
      }

      if (!isDirectS3Upload && fileMimeType.startsWith("video/") && isDuplicateVideo && duplicateMediaRecord) {
        const existingLocations = Array.isArray(duplicateMediaRecord.Location)
          ? duplicateMediaRecord.Location
          : [];
        const originalLocation = existingLocations.find((loc) => loc && loc.Type === "original")
          || existingLocations[0]
          || {};
        const existingVideoUrl = ensureVideoUrl(originalLocation, existingLocations[0]?.URL);

        if (existingVideoUrl) {
          const derivedS3Info = deriveS3InfoFromUrl(existingVideoUrl);
          const duplicateMetaData = cloneMetaData(duplicateMediaRecord.MetaData);
          const duplicateDimensions = ensureVideoDimensions(duplicateMetaData.VideoDimensions);
          const duplicateDuration = ensureDuration(originalLocation?.Duration);
          const duplicateFileSize = ensureFileSize(originalLocation?.Size, fileSize);

          uploadResult = {
            success: true,
            videoUrl: existingVideoUrl,
            fileSize: duplicateFileSize,
            s3Key: ensureS3Key(originalLocation?.S3Key, derivedS3Info.key),
            contentType: ensureContentType(originalLocation?.ContentType, fileMimeType),
            bucket: ensureBucket(originalLocation?.Bucket, derivedS3Info.bucket),
            region: ensureRegion(originalLocation?.Region, derivedS3Info.region),
            thumbnailUrl: duplicateMediaRecord.thumbnail || null,
            isDuplicate: true,
            existingLocations: cloneAndSanitizeLocations(existingLocations),
            existingVideoDimensions: duplicateDimensions,
            duplicateDuration: duplicateDuration,
            existingMediaId: duplicateMediaRecord._id,
            videoHash: videoHash,
            existingMetaData: duplicateMetaData
          };

          console.log("Reusing existing video asset. Duplicate media ID:", duplicateMediaRecord._id);
        } else {
          console.warn("Duplicate media detected but no reusable URL was found. Proceeding with fresh upload.");
          isDuplicateVideo = false;
        }
      }

      if (!uploadResult) {
        if (fileMimeType.startsWith("video/")) {
          uploadResult = await uploadVideoToS3Folder(fileObj, generatedFileName, fileMimeType);
        } else {
          uploadResult = await uploadAudioToS3Folder(fileObj, generatedFileName, fileMimeType);
        }

        if (!uploadResult.success) {
          throw new Error(`S3 upload failed: ${uploadResult.error}`);
        }

        console.log("S3 upload successful:", uploadResult);
        uploadResult.isDuplicate = false;
      } else {
        console.log("Skipping S3 upload because duplicate asset will be reused.");
      }

      if (!uploadResult.videoHash && videoHash) {
        uploadResult.videoHash = videoHash;
      }

      const shouldDeferProcessing =
        (
          (fileType === "Video" && fileMimeType.startsWith("video/")) ||
          (fileType === "Audio" && fileMimeType.startsWith("audio/"))
        ) && !uploadResult?.isDuplicate;

      if (fileMimeType.startsWith("video/")) {
        if (!shouldDeferProcessing) {
          if (!isDirectS3Upload && uploadResult.isDuplicate) {
            console.log("Skipping video conversion for duplicate asset.");
          } else {
            conversionResult = await processVideoWithConversion_S3(
              uploadResult.videoUrl,
              generatedFileName,
              ext
            );
          }
        } else {
          console.log("Scheduling deferred processing for video upload:", generatedFileName);
        }
      } else {
        if (!isDirectS3Upload && filePath) {
          if (!shouldDeferProcessing) {
            await Audio__anyToMP3_S3(filePath, generatedFileName);
          } else {
            console.log("Scheduling deferred processing for audio upload:", generatedFileName);
          }
        }
      }

      await saveMedia__toDB_S3(
        req,
        res,
        incNum,
        generatedFileName,
        fileType,
        uploadResult,
        conversionResult,
        fields,
        shouldDeferProcessing
          ? {
              deferProcessing: true,
              onAfterSave: ({ mediaId, videoDuration, videoDimensions }) => {
                scheduleDeferredMediaProcessing({
                  fileType,
                  mediaId,
                  uploadResult,
                  generatedFileName,
                  ext,
                  initialDuration: videoDuration,
                  initialDimensions: videoDimensions,
                });
              },
            }
          : undefined
      );
      cleanupUploadedFile();

    } catch (error) {
      console.error("Error in saveFile:", error);
      cleanupUploadedFile();
      res.json({ 
        success: false,
        code: '500', // Add code field for frontend compatibility
        error: error.message,
        msg: error.message, // Add msg field for consistency
        fileType: fileType 
      });
    }
  });
}

const videoUpload = function (req, res) {
  saveFile(req, res, "Video");
};

const audioUpload = function (req, res) {
  saveFile(req, res, "Audio");
};

module.exports = {
  videoUpload,
  audioUpload,
  video__getNsaveThumbnail_S3,
};

