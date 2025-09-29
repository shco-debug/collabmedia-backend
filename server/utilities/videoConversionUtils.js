/*
 * Modern Video Conversion Utility
 * High-quality video processing with size optimization
 */

const ffmpeg = require('ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Modern video conversion with quality preservation and size optimization
 * @param {String} inputPath - Path to input video file
 * @param {String} outputPath - Path for output video file
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} Conversion result
 */
const convertVideoModern = async function(inputPath, outputPath, options = {}) {
    try {
        console.log('=== MODERN VIDEO CONVERSION START ===');
        console.log('Input:', inputPath);
        console.log('Output:', outputPath);
        console.log('Options:', options);

        // Default conversion settings for optimal quality and size
        const defaultOptions = {
            // Video codec settings
            videoCodec: 'libx264',           // H.264 - most compatible
            videoBitrate: '2000k',           // 2Mbps for good quality
            videoPreset: 'medium',           // Balance between speed and compression
            videoCrf: 23,                    // Constant Rate Factor (18-28, lower = better quality)
            
            // Audio codec settings
            audioCodec: 'aac',               // AAC - most compatible
            audioBitrate: '128k',            // 128kbps for good quality
            audioSampleRate: 44100,          // Standard sample rate
            
            // Container format
            format: 'mp4',                   // MP4 - most reliable format
            
            // Quality settings
            maxWidth: 1920,                  // Max width (Full HD)
            maxHeight: 1080,                 // Max height (Full HD)
            maintainAspectRatio: true,       // Keep original aspect ratio
            
            // Performance settings
            threads: 0,                      // Use all available CPU cores
            faststart: true,                 // Enable fast start for web streaming
            movflags: '+faststart',          // Optimize for streaming
            
            // Override with user options
            ...options
        };

        // Check if input file exists
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input video file not found: ${inputPath}`);
        }

        // Get file info
        const inputStats = fs.statSync(inputPath);
        const inputSize = inputStats.size;
        console.log('Input file size:', (inputSize / 1024 / 1024).toFixed(2), 'MB');

        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Build FFmpeg command
        const command = buildFFmpegCommand(inputPath, outputPath, defaultOptions);
        console.log('FFmpeg command:', command);

        // Execute conversion using child_process for better control
        const { exec } = require('child_process');
        const execAsync = promisify(exec);

        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(command);
        const endTime = Date.now();
        const conversionTime = (endTime - startTime) / 1000;

        console.log('Conversion completed in:', conversionTime, 'seconds');
        if (stdout) console.log('FFmpeg stdout:', stdout);
        if (stderr) console.log('FFmpeg stderr:', stderr);

        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('Output video file was not created');
        }

        // Get output file info
        const outputStats = fs.statSync(outputPath);
        const outputSize = outputStats.size;
        const compressionRatio = ((inputSize - outputSize) / inputSize * 100).toFixed(2);

        console.log('Output file size:', (outputSize / 1024 / 1024).toFixed(2), 'MB');
        console.log('Compression ratio:', compressionRatio, '%');

        return {
            success: true,
            inputPath: inputPath,
            outputPath: outputPath,
            inputSize: inputSize,
            outputSize: outputSize,
            compressionRatio: parseFloat(compressionRatio),
            conversionTime: conversionTime,
            settings: defaultOptions
        };

    } catch (error) {
        console.error('Video conversion error:', error);
        return {
            success: false,
            error: error.message,
            inputPath: inputPath,
            outputPath: outputPath
        };
    }
};

/**
 * Build optimized FFmpeg command for video conversion
 * @param {String} inputPath - Input video path
 * @param {String} outputPath - Output video path
 * @param {Object} options - Conversion options
 * @returns {String} FFmpeg command
 */
const buildFFmpegCommand = function(inputPath, outputPath, options) {
    const {
        videoCodec,
        videoBitrate,
        videoPreset,
        videoCrf,
        audioCodec,
        audioBitrate,
        audioSampleRate,
        format,
        maxWidth,
        maxHeight,
        maintainAspectRatio,
        threads,
        faststart,
        movflags
    } = options;

    let command = `ffmpeg -i "${inputPath}"`;

    // Video encoding settings
    command += ` -c:v ${videoCodec}`;
    command += ` -preset ${videoPreset}`;
    command += ` -crf ${videoCrf}`;
    command += ` -b:v ${videoBitrate}`;
    
    // Video scaling with aspect ratio preservation
    if (maintainAspectRatio) {
        command += ` -vf "scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease"`;
    } else {
        command += ` -vf "scale=${maxWidth}:${maxHeight}"`;
    }

    // Audio encoding settings
    command += ` -c:a ${audioCodec}`;
    command += ` -b:a ${audioBitrate}`;
    command += ` -ar ${audioSampleRate}`;

    // Performance settings
    if (threads > 0) {
        command += ` -threads ${threads}`;
    }

    // Streaming optimization
    if (faststart) {
        command += ` -movflags ${movflags}`;
    }

    // Output format and file
    command += ` -f ${format}`;
    command += ` -y`; // Overwrite output file
    command += ` "${outputPath}"`;

    return command;
};

/**
 * Get video metadata using FFprobe
 * @param {String} videoPath - Path to video file
 * @returns {Promise<Object>} Video metadata
 */
const getVideoMetadata = async function(videoPath) {
    try {
        const { exec } = require('child_process');
        const execAsync = promisify(exec);

        const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
        const { stdout } = await execAsync(command);
        
        const metadata = JSON.parse(stdout);
        
        // Extract useful information
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        return {
            success: true,
            duration: parseFloat(metadata.format.duration),
            size: parseInt(metadata.format.size),
            bitrate: parseInt(metadata.format.bit_rate),
            video: videoStream ? {
                codec: videoStream.codec_name,
                width: videoStream.width,
                height: videoStream.height,
                fps: eval(videoStream.r_frame_rate), // Convert fraction to decimal
                bitrate: parseInt(videoStream.bit_rate) || 0
            } : null,
            audio: audioStream ? {
                codec: audioStream.codec_name,
                sampleRate: parseInt(audioStream.sample_rate),
                channels: audioStream.channels,
                bitrate: parseInt(audioStream.bit_rate) || 0
            } : null
        };

    } catch (error) {
        console.error('Error getting video metadata:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Convert video to multiple formats for compatibility
 * @param {String} inputPath - Input video path
 * @param {String} baseOutputPath - Base output path (without extension)
 * @param {Array} formats - Array of formats to convert to
 * @returns {Promise<Object>} Conversion results
 */
const convertToMultipleFormats = async function(inputPath, baseOutputPath, formats = ['mp4', 'webm']) {
    try {
        console.log('=== MULTI-FORMAT CONVERSION ===');
        console.log('Input:', inputPath);
        console.log('Formats:', formats);

        const results = [];
        
        for (const format of formats) {
            const outputPath = `${baseOutputPath}.${format}`;
            
            let options = {};
            
            // Format-specific optimizations
            if (format === 'webm') {
                options = {
                    videoCodec: 'libvpx-vp9',
                    audioCodec: 'libopus',
                    format: 'webm',
                    videoCrf: 30, // VP9 uses different CRF scale
                    videoPreset: 'fast'
                };
            } else if (format === 'mp4') {
                options = {
                    videoCodec: 'libx264',
                    audioCodec: 'aac',
                    format: 'mp4',
                    videoCrf: 23,
                    videoPreset: 'medium'
                };
            }

            console.log(`Converting to ${format}...`);
            const result = await convertVideoModern(inputPath, outputPath, options);
            results.push({
                format: format,
                ...result
            });
        }

        return {
            success: true,
            results: results
        };

    } catch (error) {
        console.error('Multi-format conversion error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Optimize video for web streaming
 * @param {String} inputPath - Input video path
 * @param {String} outputPath - Output video path
 * @returns {Promise<Object>} Optimization result
 */
const optimizeForWeb = async function(inputPath, outputPath) {
    const webOptimizedOptions = {
        videoCodec: 'libx264',
        videoPreset: 'fast',           // Faster encoding for web
        videoCrf: 28,                  // Slightly lower quality for smaller size
        videoBitrate: '1500k',         // Lower bitrate for web
        audioCodec: 'aac',
        audioBitrate: '96k',           // Lower audio bitrate
        maxWidth: 1280,                // HD instead of Full HD
        maxHeight: 720,
        faststart: true,               // Enable fast start
        movflags: '+faststart',
        threads: 0                     // Use all cores
    };

    return await convertVideoModern(inputPath, outputPath, webOptimizedOptions);
};

/**
 * Create high-quality version for archival
 * @param {String} inputPath - Input video path
 * @param {String} outputPath - Output video path
 * @returns {Promise<Object>} High-quality conversion result
 */
const createHighQualityVersion = async function(inputPath, outputPath) {
    const highQualityOptions = {
        videoCodec: 'libx264',
        videoPreset: 'slow',           // Slower but better compression
        videoCrf: 18,                  // Higher quality
        videoBitrate: '5000k',         // Higher bitrate
        audioCodec: 'aac',
        audioBitrate: '192k',          // Higher audio quality
        maxWidth: 1920,                // Full HD
        maxHeight: 1080,
        faststart: true,
        movflags: '+faststart',
        threads: 0
    };

    return await convertVideoModern(inputPath, outputPath, highQualityOptions);
};

module.exports = {
    convertVideoModern,
    getVideoMetadata,
    convertToMultipleFormats,
    optimizeForWeb,
    createHighQualityVersion,
    buildFFmpegCommand
};
