var mediaActionLog = require('./../models/mediaActionLogModel.js');
var StreamComments = require('./../models/StreamCommentsModel.js');
var StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
var User = require('./../models/userModel.js');
var ObjectId = require('mongodb').ObjectId;

/**
 * Get activities of a specific user (including inviter)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var getUserActivities = async function (req, res) {
  try {
    var targetUserId = req.body.UserId || req.query.UserId || null;
    var targetUserEmail = req.body.UserEmail || req.query.UserEmail || null;
    var streamId = req.body.StreamId || req.query.StreamId || null;
    var actionType = req.body.ActionType || req.query.ActionType || null; // Filter by action type
    var limit = parseInt(req.body.limit || req.query.limit || 50);
    var skip = parseInt(req.body.skip || req.query.skip || 0);

    // Validate input
    if (!targetUserId && !targetUserEmail) {
      return res.json({
        code: 400,
        message: "UserId or UserEmail is required",
        results: []
      });
    }

    var targetUser = null;
    
    // Find target user by ID or email
    if (targetUserId) {
      targetUser = await User.findOne({
        _id: new ObjectId(targetUserId),
        IsDeleted: false,
        Status: true
      });
    } else if (targetUserEmail) {
      targetUser = await User.findOne({
        Email: targetUserEmail,
        IsDeleted: false,
        Status: true
      });
    }

    if (!targetUser) {
      return res.json({
        code: 404,
        message: "Target user not found",
        results: []
      });
    }

    var conditions = {
      UserId: new ObjectId(targetUser._id),
      IsDeleted: 0
    };

    // Add stream filter if provided
    if (streamId) {
      conditions.StreamId = new ObjectId(streamId);
    }

    // Add action type filter if provided
    if (actionType) {
      conditions.Action = actionType;
    }

    // Get activities from MediaActionLogs
    var activities = await mediaActionLog.find(conditions)
      .populate('UserId', '_id Name Email ProfilePic NickName')
      .populate('MediaId')
      .populate('StreamId')
      .populate('BoardId')
      .sort({ CreatedOn: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get comments from StreamComments
    var commentConditions = {
      UserId: new ObjectId(targetUser._id),
      IsDeleted: 0
    };

    if (streamId) {
      commentConditions.SocialPageId = new ObjectId(streamId);
    }

    var comments = await StreamComments.find(commentConditions)
      .populate('UserId', '_id Name Email ProfilePic NickName')
      .populate('SocialPageId')
      .populate('SocialPostId')
      .sort({ CreatedOn: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get comment likes from StreamCommentLikes
    var commentLikeConditions = {
      LikedById: new ObjectId(targetUser._id),
      IsDeleted: false
    };

    var commentLikes = await StreamCommentLikes.find(commentLikeConditions)
      .populate('LikedById', '_id Name Email ProfilePic NickName')
      .populate('CommentId')
      .populate('SocialPageId')
      .sort({ CreatedOn: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get activity counts
    var totalActivities = await mediaActionLog.countDocuments(conditions);
    var totalComments = await StreamComments.countDocuments(commentConditions);
    var totalCommentLikes = await StreamCommentLikes.countDocuments(commentLikeConditions);

    // Format activities for response
    var formattedActivities = activities.map(activity => ({
      id: activity._id,
      type: 'activity',
      action: activity.Action,
      actionLevel: activity.ActionLevel,
      likeType: activity.LikeType,
      content: activity.Content,
      comment: activity.Comment,
      url: activity.URL,
      mediaType: activity.MediaType,
      contentType: activity.ContentType,
      themes: activity.Themes,
      createdAt: activity.CreatedOn,
      user: activity.UserId,
      media: activity.MediaId,
      stream: activity.StreamId,
      board: activity.BoardId
    }));

    var formattedComments = comments.map(comment => ({
      id: comment._id,
      type: 'comment',
      action: 'Comment',
      content: comment.Comment,
      privacySetting: comment.PrivacySetting,
      createdAt: comment.CreatedOn,
      user: comment.UserId,
      socialPage: comment.SocialPageId,
      socialPost: comment.SocialPostId,
      hexcode: comment.hexcode_blendedImage
    }));

    var formattedCommentLikes = commentLikes.map(like => ({
      id: like._id,
      type: 'comment_like',
      action: 'CommentLike',
      createdAt: like.CreatedOn,
      user: like.LikedById,
      comment: like.CommentId,
      socialPage: like.SocialPageId
    }));

    // Combine and sort all activities by creation date
    var allActivities = [
      ...formattedActivities,
      ...formattedComments,
      ...formattedCommentLikes
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      code: 200,
      message: "User activities retrieved successfully",
      data: {
        user: {
          _id: targetUser._id,
          Name: targetUser.Name,
          Email: targetUser.Email,
          ProfilePic: targetUser.ProfilePic,
          NickName: targetUser.NickName
        },
        activities: allActivities,
        counts: {
          totalActivities: totalActivities,
          totalComments: totalComments,
          totalCommentLikes: totalCommentLikes,
          totalCombined: allActivities.length
        },
        pagination: {
          limit: limit,
          skip: skip,
          hasMore: allActivities.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Error getting user activities:', error);
    return res.json({
      code: 500,
      message: "Failed to get user activities",
      error: error.message,
      results: []
    });
  }
};

/**
 * Get activity statistics for a specific user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var getUserActivityStats = async function (req, res) {
  try {
    var targetUserId = req.body.UserId || req.query.UserId || null;
    var targetUserEmail = req.body.UserEmail || req.query.UserEmail || null;
    var streamId = req.body.StreamId || req.query.StreamId || null;

    if (!targetUserId && !targetUserEmail) {
      return res.json({
        code: 400,
        message: "UserId or UserEmail is required",
        results: {}
      });
    }

    var targetUser = null;
    
    if (targetUserId) {
      targetUser = await User.findOne({
        _id: new ObjectId(targetUserId),
        IsDeleted: false,
        Status: true
      });
    } else if (targetUserEmail) {
      targetUser = await User.findOne({
        Email: targetUserEmail,
        IsDeleted: false,
        Status: true
      });
    }

    if (!targetUser) {
      return res.json({
        code: 404,
        message: "Target user not found",
        results: {}
      });
    }

    var baseConditions = {
      UserId: new ObjectId(targetUser._id),
      IsDeleted: 0
    };

    if (streamId) {
      baseConditions.StreamId = new ObjectId(streamId);
    }

    // Get activity counts by type
    var activityStats = await mediaActionLog.aggregate([
      { $match: baseConditions },
      {
        $group: {
          _id: "$Action",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get like/dislike counts
    var likeCount = await mediaActionLog.countDocuments({
      ...baseConditions,
      Action: "Vote",
      LikeType: "1"
    });

    var dislikeCount = await mediaActionLog.countDocuments({
      ...baseConditions,
      Action: "Vote",
      LikeType: "2"
    });

    // Get comment counts
    var commentConditions = {
      UserId: new ObjectId(targetUser._id),
      IsDeleted: 0
    };

    if (streamId) {
      commentConditions.SocialPageId = new ObjectId(streamId);
    }

    var totalComments = await StreamComments.countDocuments(commentConditions);
    var totalCommentLikes = await StreamCommentLikes.countDocuments({
      LikedById: new ObjectId(targetUser._id),
      IsDeleted: false
    });

    return res.json({
      code: 200,
      message: "User activity stats retrieved successfully",
      data: {
        user: {
          _id: targetUser._id,
          Name: targetUser.Name,
          Email: targetUser.Email,
          ProfilePic: targetUser.ProfilePic
        },
        stats: {
          activities: activityStats,
          likes: likeCount,
          dislikes: dislikeCount,
          comments: totalComments,
          commentLikes: totalCommentLikes
        }
      }
    });

  } catch (error) {
    console.error('Error getting user activity stats:', error);
    return res.json({
      code: 500,
      message: "Failed to get user activity stats",
      error: error.message,
      results: {}
    });
  }
};

module.exports = {
  getUserActivities: getUserActivities,
  getUserActivityStats: getUserActivityStats
};
