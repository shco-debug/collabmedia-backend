/**
 * Share Controller
 * Handles public post sharing functionality
 */

const SyncedPost = require('../models/syncedpostModel.js');
const Media = require('../models/mediaModel.js');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/**
 * Get public post data for sharing
 * GET /api/share/post/:id
 */
const getPublicPost = async (req, res) => {
  try {
    const postId = req.params.id;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'Post ID is required'
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format'
      });
    }

    // Fetch the SyncedPost
    const post = await SyncedPost.findOne({ 
      _id: new ObjectId(postId), 
      IsDeleted: false 
    }).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Return public post data (limit sensitive info)
    const publicPost = {
      _id: post._id,
      PostStatement: post.PostStatement || '',
      PostImage: post.PostImage || '',
      CapsuleId: post.CapsuleId || null,
      PageId: post.PageId || null,
      PostId: post.PostId || null,
      CreatedOn: post.CreatedOn || null,
      EmailTemplate: post.EmailTemplate || null,
    };

    return res.status(200).json({
      success: true,
      post: publicPost
    });

  } catch (error) {
    console.error('Error fetching public post:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

/**
 * Get blended image data
 * GET /api/share/image/:postHashCode
 */
const getBlendedImage = async (req, res) => {
  try {
    const postHashCode = req.params.postHashCode;

    if (!postHashCode) {
      return res.status(400).json({
        success: false,
        message: 'Post hash code is required'
      });
    }

    // The actual image is served via static file serving from media-assets/streamposts/
    // This endpoint just returns metadata if needed
    return res.status(200).json({
      success: true,
      imageUrl: `/streamposts/${postHashCode}`,
      fullUrl: `https://www.scrpt.com/streamposts/${postHashCode}`
    });

  } catch (error) {
    console.error('Error fetching blended image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch image data',
      error: error.message
    });
  }
};

/**
 * Get public media/post data for sharing (no auth required)
 * GET /api/share/media/:id
 */
const getPublicMedia = async (req, res) => {
  try {
    const mediaId = req.params.id;

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        message: 'Media ID is required'
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID format'
      });
    }

    // Fetch the media/post - return ALL data for proper display
    const media = await Media.findOne({ 
      _id: new ObjectId(mediaId),
      IsDeleted: { $ne: true }
    })
    .select('-__v') // Exclude version key only
    .lean();

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Return the complete media object (it's public anyway for sharing)
    // Just remove sensitive fields like PostedBy details if needed
    return res.status(200).json({
      code: '200',
      success: true,
      response: media
    });

  } catch (error) {
    console.error('Error fetching public media:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

module.exports = {
  getPublicPost,
  getBlendedImage,
  getPublicMedia
};

