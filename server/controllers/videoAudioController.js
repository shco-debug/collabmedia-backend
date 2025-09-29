var formidable = require("formidable");
var fs = require("fs");
var counters = require("../models/countersModel.js");


// Required imports for video/audio processing
const media = require('../models/mediaModel.js');
const { crop_image, resize_image } = require('./mediaController.js');
const { uploadVideoToS3Folder, uploadVideoThumbnailsToS3, uploadAudioToS3Folder } = require('../utilities/awsS3Utils.js');
const { 
  convertVideoModern, 
  getVideoMetadata, 
  convertToMultipleFormats, 
  optimizeForWeb,
  createHighQualityVersion 
} = require('../utilities/videoConversionUtils.js');

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


async function video__getNsaveThumbnail_S3(s3VideoUrl, MediaId) {
  try {
    console.log("=== GENERATE VIDEO THUMBNAIL (S3) ===");
    console.log("S3 Video URL:", s3VideoUrl);
    console.log("MediaId:", MediaId);

    const util = require("util");
    const exec = require("child_process").exec;
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const axios = require('axios');

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

    // Generate thumbnail directly from S3 URL using FFmpeg (optimized for speed)
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    const command = `"${ffmpeg.path}" -i "${s3VideoUrl}" -vframes 1 -vf "scale=640:360" -y "${tempOutputPath}"`;
    console.log("FFmpeg command (S3 direct, optimized):", command);

    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) console.log("FFmpeg stdout:", stdout);
    if (stderr) console.log("FFmpeg stderr:", stderr);

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

    console.log("S3 thumbnail upload successful:", thumbnailResult);

    // Update media record with thumbnail info (use existing thumbnail field)
    const aspectfitThumbnail = thumbnailResult.thumbnails.find(t => t.size === 'aspectfit');
    const thumbnailUpdate = {
      thumbnail: aspectfitThumbnail ? aspectfitThumbnail.thumbnailUrl : outputThumbnail
    };

    console.log("Updating media record with thumbnail info:", JSON.stringify(thumbnailUpdate, null, 2));

    const updateResult = await media.updateOne(
      { _id: MediaId },
      { $set: thumbnailUpdate }
    );

    console.log("Media record update result:", updateResult);
    console.log("Media record updated with thumbnail info");

    // Verify the update by checking the database
    const updatedMedia = await media.findById(MediaId);
    if (updatedMedia && updatedMedia.thumbnail) {
      console.log("✅ VERIFICATION: Thumbnail field found in database");
      console.log("✅ VERIFICATION: Thumbnail URL:", updatedMedia.thumbnail);
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
      thumbnails: thumbnailResult.thumbnails
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

async function saveMedia__toDB_S3(req, res, incNum, fileName, fileType, uploadResult, conversionResult = null, fields = {}) {
  try {
    console.log("=== SAVE MEDIA TO DB (S3) ===");
    console.log("incNum:", incNum);
    console.log("fileName:", fileName);
    console.log("fileType:", fileType);
    console.log("uploadResult:", uploadResult);

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
      AddedWhere: "board",
      IsDeleted: 0,
      TagType: "",
      ContentType: cType,
      MediaType: fileType,
      AddedHow: "recording",
      OwnerFSGs: req.session.user.FSGsArr2,
      IsPrivate: isPrivate,
      Locator: locator,
      thumbnail: thumbName,
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

    // Add S3 URL to Location array
    dataToUpload.Location.push({
      Size: uploadResult.fileSize,
      URL: uploadResult.videoUrl || uploadResult.audioUrl,
      Type: "original",
      Index: 0,
      S3Key: uploadResult.s3Key
    });

    // Add converted video if available
    if (conversionResult && conversionResult.success && conversionResult.converted) {
      dataToUpload.Location.push({
        Size: conversionResult.convertedSize,
        URL: conversionResult.s3Info.url,
        Type: "converted",
        Index: 1,
        S3Key: conversionResult.s3Info.s3Key,
        Format: conversionResult.convertedFormat,
        CompressionRatio: conversionResult.compressionRatio
      });
    }

    console.log("Saving to database:", dataToUpload);

    const model = await media(dataToUpload).save();
        dataToUpload._id = model._id;

    console.log("Database save successful, ID:", dataToUpload._id);

    // Generate thumbnail for videos
      if (fileType.startsWith("video/")) {
        try {
          console.log("Starting thumbnail generation for video...");
          const thumbnailResult = await video__getNsaveThumbnail_S3(uploadResult.videoUrl, dataToUpload._id);
          console.log("Thumbnail generation result:", thumbnailResult);
        } catch (thumbnailError) {
          console.error("Thumbnail generation failed:", thumbnailError);
          // Continue with the upload even if thumbnail generation fails
        }
      }

    console.log("=== UPLOAD COMPLETE ===");
    
    const response = {
      success: true,
      message: `${fileType} uploaded successfully`,
      data: dataToUpload,
      s3Info: {
        s3Key: uploadResult.s3Key,
        url: uploadResult.videoUrl || uploadResult.audioUrl,
        bucket: uploadResult.bucket,
        region: uploadResult.region
      }
    };

    // Add conversion info if available
    if (conversionResult && conversionResult.success) {
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

  } catch (error) {
    console.error("Error saving media to DB:", error);
    res.json({
      success: false,
      error: error.message,
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
  
  // Ensure upload directory exists
  const uploadDir = __dirname + "/../../public/assets/Media/video/";
  if (!fs.existsSync(uploadDir)) {
    console.log("Creating upload directory:", uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  var form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.uploadDir = uploadDir; // Temporary local storage
  form.maxFileSize = 100 * 1024 * 1024; // 100MB limit
  
  form.parse(req, async function (err, fields, files) {
    if (err) {
      console.error("Form parsing error:", err);
      return res.json({ success: false, error: "File upload failed" });
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
    if (fileKeys.length === 0) {
      console.error("No files uploaded");
      return res.json({ success: false, error: "No files uploaded" });
    }

    // Get the file (prefer 'file' field, fallback to first available)
    let fileKey = 'file';
    if (!files.file && fileKeys.length > 0) {
      fileKey = fileKeys[0];
    }
    let uploadedFile = files[fileKey];
    
    // Handle case where file is an array (formidable sometimes returns arrays)
    if (Array.isArray(uploadedFile)) {
      uploadedFile = uploadedFile[0]; // Take the first file
    }
    
    console.log("=== DEBUG: FILE DETAILS ===");
    console.log("File key:", fileKey);
    console.log("Uploaded file:", uploadedFile);
    console.log("Is array:", Array.isArray(files[fileKey]));

    // Validate file upload
    if (!uploadedFile) {
      console.error("No file uploaded");
      return res.json({ success: false, error: "No file uploaded" });
    }

    // Get file properties (formidable uses different property names)
    const originalFileName = uploadedFile.originalFilename || uploadedFile.name;
    const fileSize = uploadedFile.size;
    const fileType = uploadedFile.mimetype || uploadedFile.type;
    const filePath = uploadedFile.filepath || uploadedFile.path;

    if (!originalFileName || originalFileName === 'invalid-name') {
      console.error("Invalid file name:", originalFileName);
      return res.json({ success: false, error: "Invalid file name" });
    }

    if (!fileSize || fileSize === 0) {
      console.error("Empty file uploaded");
      return res.json({ success: false, error: "Empty file uploaded" });
    }

    console.log("=== FILE INFO ===");
    console.log("File size:", fileSize);
    console.log("File name:", originalFileName);
    console.log("File type:", fileType);
    console.log("File path:", filePath);
    
    console.log("=== FORM FIELDS ===");
    console.log("Content:", fields.content);
    console.log("Title:", fields.title);
    console.log("Prompt:", fields.prompt);
    console.log("GroupTags:", fields.groupTags);
    console.log("PostPrivacySetting:", fields.postPrivacySetting);

    try {
    // Validate and extract file extension
    var temp = originalFileName.split(".");
    if (temp.length < 2) {
      console.error("File has no extension:", originalFileName);
      return res.json({ success: false, error: "File must have a valid extension" });
    }
    
    var ext = temp.pop();
    if (!ext || ext.length === 0) {
      console.error("Invalid file extension:", ext);
      return res.json({ success: false, error: "Invalid file extension" });
    }

    // Validate file extension for video/audio
    const validExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', 'webm', 'mp3', 'wav', 'ogg'];
    if (!validExtensions.includes(ext.toLowerCase())) {
      console.error("Unsupported file extension:", ext);
      return res.json({ success: false, error: `Unsupported file extension: ${ext}. Supported: ${validExtensions.join(', ')}` });
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
          var generatedFileName = Date.now() + "_recording_" + incNum + "." + ext;

      console.log("Generated fileName:", generatedFileName);
      console.log("File extension:", ext);

      // Upload directly to S3 (no local storage)
      const fileObj = {
        path: filePath, // Use the temporary file path from formidable
        originalname: generatedFileName,
        mimetype: fileType,
        size: fileSize
      };

      let uploadResult;
      if (fileType.startsWith("video/")) {
        uploadResult = await uploadVideoToS3Folder(fileObj, generatedFileName, fileType);
              } else {
        uploadResult = await uploadAudioToS3Folder(fileObj, generatedFileName, fileType);
      }

      if (!uploadResult.success) {
        throw new Error(`S3 upload failed: ${uploadResult.error}`);
      }

      console.log("S3 upload successful:", uploadResult);

      // Process video/audio with modern conversion (using S3 URLs)
      let conversionResult = null;
      if (fileType.startsWith("video/")) {
        // Download from S3, convert, and upload back to S3
        conversionResult = await processVideoWithConversion_S3(uploadResult.videoUrl, generatedFileName, ext);
      } else {
        // For audio, we can process locally and upload to S3
        await Audio__anyToMP3_S3(filePath, generatedFileName);
      }

      // Save to database with S3 URLs and conversion info
      await saveMedia__toDB_S3(req, res, incNum, generatedFileName, fileType, uploadResult, conversionResult, fields);

    } catch (error) {
      console.error("Error in saveFile:", error);
      res.json({ 
        success: false, 
        error: error.message,
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
};
