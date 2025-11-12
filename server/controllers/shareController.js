/**
 * Share Controller
 * Handles public post sharing functionality
 */

const SyncedPost = require('../models/syncedpostModel.js');
const Media = require('../models/mediaModel.js');
const Capsules = require('../models/capsuleModel.js');
const Users = require('../models/userModel.js');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const DEFAULT_MEDIA_BASE_URL =
  process.env.MEDIA_BASE_URL ||
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  'https://scrpt.s3.us-east-1.amazonaws.com/scrptMedia';

function toAbsoluteMediaUrl(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('http://', 'https://');
  }

  if (url.startsWith('/')) {
    return `${DEFAULT_MEDIA_BASE_URL}${url}`;
  }

  return `${DEFAULT_MEDIA_BASE_URL}/${url}`;
}

/**
 * Get public post data for sharing
 * GET /api/share/post/:id
 */
const getPublicPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const rawHexcode = req.query?.hexcode;
    const normalizedHexcode =
      Array.isArray(rawHexcode)
        ? (rawHexcode[0] || '').trim()
        : typeof rawHexcode === 'string'
        ? rawHexcode.trim()
        : undefined;

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

    // Fetch the SyncedPost (primary lookup by _id)
    let post = await SyncedPost.findOne({ 
      _id: new ObjectId(postId), 
      IsDeleted: false 
    }).lean();

    if (!post) {
      // Secondary lookup: treat provided ID as the original media PostId
      const candidates = await SyncedPost.find({
        PostId: new ObjectId(postId),
        IsDeleted: false
      })
        .sort({ CreatedOn: -1 })
        .lean();

      if (!candidates.length) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      post =
        (normalizedHexcode
          ? candidates.find((candidate) =>
              Array.isArray(candidate.EmailEngineDataSets) &&
              candidate.EmailEngineDataSets.some(
                (ds) => ds && ds.hexcode_blendedImage === normalizedHexcode
              )
            )
          : null) || candidates[0];
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    let media = null;
    if (post.PostId) {
      media = await Media.findOne({
        _id: new ObjectId(post.PostId),
        IsDeleted: { $ne: true },
      })
        .select('-__v')
        .lean();
    }

    let capsule = null;
    if (post.CapsuleId) {
      capsule = await Capsules.findOne(
        { _id: new ObjectId(post.CapsuleId) },
        { Title: 1, OwnerId: 1, CoverMedia: 1 }
      )
        .populate({
          path: 'OwnerId',
          select: 'Name Email ProfilePic',
          model: Users,
        })
        .lean();
    }

    // Prepare media data for sharing
    const mediaData = media ? { ...media } : {};
    if (mediaData.Location && Array.isArray(mediaData.Location)) {
      mediaData.Location = mediaData.Location.map((item) => ({
        ...item,
        URL: toAbsoluteMediaUrl(item.URL || item.url),
        url: toAbsoluteMediaUrl(item.url || item.URL),
        thumbnail: toAbsoluteMediaUrl(
          item.thumbnail || (mediaData.thumbnail ? mediaData.thumbnail : null)
        ),
      }));
    }

    const emailDataSetsRaw = Array.isArray(post.EmailEngineDataSets) ? post.EmailEngineDataSets : [];
    const emailDataSets = emailDataSetsRaw.map((dataset) => {
      const visualUrls = Array.isArray(dataset?.VisualUrls)
        ? dataset.VisualUrls.map((url) => toAbsoluteMediaUrl(url)).filter(Boolean)
        : [];

      return {
        ...dataset,
        VisualUrls: visualUrls,
        hexcode_blendedImage: dataset?.hexcode_blendedImage || dataset?.hexcode || null,
      };
    });

    let selectedEmailDataSet = null;
    if (emailDataSets.length > 0) {
      if (normalizedHexcode) {
        selectedEmailDataSet = emailDataSets.find(
          (dataset) => dataset?.hexcode_blendedImage === normalizedHexcode
        );
      }

      if (!selectedEmailDataSet) {
        selectedEmailDataSet =
          emailDataSets.find((dataset) => dataset?.Delivered === false) || emailDataSets[0];
      }
    }

    const datasetImages =
      selectedEmailDataSet?.VisualUrls?.filter(Boolean) || [];

    const mediaImages =
      (mediaData.Location || [])
        .map((item) => item.URL || item.url)
        .filter(Boolean) || [];

    const images = datasetImages.length > 0 ? datasetImages : mediaImages;

    let blendConfig = null;
    const blendSettings = mediaData.BlendSettings || {};

    if (Array.isArray(blendSettings?.allBlendConfigurations)) {
      const selectedBlend =
        blendSettings.allBlendConfigurations.find((config) => config.isSelected) ||
        blendSettings.allBlendConfigurations[0];

      if (selectedBlend) {
        blendConfig = {
          image1: toAbsoluteMediaUrl(selectedBlend.blendImage1),
          image2: toAbsoluteMediaUrl(selectedBlend.blendImage2),
          mode: selectedBlend.blendMode || 'multiply',
        };
      }
    } else if (
      Array.isArray(blendSettings?.SelectedBlendImages) &&
      blendSettings.SelectedBlendImages.length >= 2
    ) {
      const [image1, image2] = blendSettings.SelectedBlendImages;
      blendConfig = {
        image1: toAbsoluteMediaUrl(image1?.MediaURL || image1?.mediaUrl),
        image2: toAbsoluteMediaUrl(image2?.MediaURL || image2?.mediaUrl),
        mode: blendSettings.SelectedBlendMode || blendSettings.blendMode || 'multiply',
      };
    }

    const postStatement =
      blendSettings?.PostStatement ||
      mediaData?.Content ||
      mediaData?.OwnStatement ||
      mediaData?.CurrStatement ||
      mediaData?.TextAboveVisual ||
      mediaData?.TextBelowVisual ||
      mediaData?.SurpriseSelectedWords ||
      mediaData?.PostStatement ||
      post.PostStatement ||
      '';

    const publicPost = {
      _id: post._id,
      SyncedPostId: post._id,
      PostId: post.PostId || null,
      CapsuleId: post.CapsuleId || null,
      PageId: post.PageId || null,
      PostStatement: postStatement,
      CreatedOn: post.CreatedOn || null,
      EmailTemplate: post.EmailTemplate || null,
      EmailSubject: post.EmailSubject || null,
      MediaType: mediaData?.MediaType,
      Content: mediaData?.Content,
      BlendSettings: blendSettings || null,
      Location: mediaData?.Location || [],
      images,
      blendConfig,
      capsule: capsule
        ? {
            _id: capsule._id,
            Title: capsule.Title,
            Owner: capsule.OwnerId
              ? {
                  _id: capsule.OwnerId._id,
                  Name: capsule.OwnerId.Name,
                  Email: capsule.OwnerId.Email,
                  ProfilePic: toAbsoluteMediaUrl(capsule.OwnerId.ProfilePic),
                }
              : null,
            CoverMedia: Array.isArray(capsule.CoverMedia)
              ? capsule.CoverMedia.map((cover) => ({
                  ...cover,
                  URL: toAbsoluteMediaUrl(cover.URL || cover.url),
                  url: toAbsoluteMediaUrl(cover.url || cover.URL),
                }))
              : [],
          }
        : null,
      stream: {
        capsuleTitle: capsule?.Title,
      },
      SyncedPost: post,
      Media: mediaData,
      EmailEngineDataSets: emailDataSets,
      selectedEmailDataSet,
      hexcode_blendedImage: selectedEmailDataSet?.hexcode_blendedImage || null,
    };

    return res.status(200).json({
      code: '200',
      success: true,
      msg: 'Success',
      post: publicPost,
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

