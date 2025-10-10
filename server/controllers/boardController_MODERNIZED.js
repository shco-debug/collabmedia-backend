// MODERNIZED VERSION - Works with pageModel (Medias as ObjectId array)
// NOTE: sessionCompatibility middleware is applied globally in server/middlewares.js
// It automatically maps req.user (from JWT) to req.session.user
var board = require('./../models/pageModel.js');
var media = require('./../models/mediaModel.js');
var user = require('./../models/userModel.js');
var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate session and extract user
 * NOTE: sessionCompatibility middleware already mapped req.user to req.session.user globally
 */
function validateSession(req) {
	// Simply validate that session.user exists (mapping already done by global middleware)
	if (!req.session || !req.session.user || !req.session.user._id) {
		throw new Error('SESSION_REQUIRED');
	}
	
	return req.session.user;
}

/**
 * Validate if string is a valid MongoDB ObjectId
 */
function isValidObjectId(id) {
	if (!id) return false;
	// ObjectId must be exactly 24 hex characters
	return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Parse and validate request parameters
 */
function parseRequestParams(req) {
	const pageNo = parseInt(req.body.pageNo) || 1;
	const perPage = parseInt(req.body.perPage) || 20;
	
	// Validate page ID format
	if (req.body.id && !isValidObjectId(req.body.id)) {
		throw new Error('INVALID_PAGE_ID');
	}
	
	// Validate post_id format if provided
	if (req.body.post_id && !isValidObjectId(req.body.post_id)) {
		throw new Error('INVALID_POST_ID');
	}
	
	// Validate filterByUserId format if provided
	if (req.body.filterByUserId && !isValidObjectId(req.body.filterByUserId)) {
		throw new Error('INVALID_USER_ID');
	}
	
	// Validate StreamId format if provided
	if (req.body.StreamId && !isValidObjectId(req.body.StreamId)) {
		throw new Error('INVALID_STREAM_ID');
	}
	
	return {
		pageId: req.body.id,
		post_id: req.body.post_id,
		perPage: perPage,
		pageNo: pageNo,
		offset: (pageNo - 1) * perPage,
		searchByTagName: req.body.searchByTagName || null,
		searchByLabel: req.body.searchByLabel || null,
		filterByUserId: req.body.filterByUserId || null,
		IsAddedFromStream: req.body.IsAddedFromStream || false,
		IsPostForUser: req.body.IsPostForUser || false,
		IsPostForTeam: req.body.IsPostForTeam || false,
		StreamId: req.body.StreamId || null,
		criteria: req.body.criteria || null,
		CapsuleFor: req.body.CapsuleFor || null
	};
}

/**
 * Safely get ShareMode from page data
 */
function getShareMode(pageData) {
	try {
		if (!pageData || !pageData[0]) return 'friend-solo';
		const chapterId = pageData[0].ChapterId;
		if (!chapterId || !chapterId.LaunchSettings) return 'friend-solo';
		return chapterId.LaunchSettings.ShareMode || 'friend-solo';
	} catch (e) {
		console.error('Error getting ShareMode:', e);
		return 'friend-solo';
	}
}

/**
 * Apply privacy settings to results (hide user names if needed)
 */
function applyPrivacyToResults(results) {
	const tmpResults = [];
	const resultsClone = JSON.parse(JSON.stringify(results));
	
	for (let i = 0; i < resultsClone.length; i++) {
		const record = resultsClone[i];
		record.media = record.media || {};
		record.media.PostPrivacySetting = record.media.PostPrivacySetting || "PublicWithoutName";
		record.media.PostedBy = record.media.PostedBy || {};
		
		if (record.media.PostPrivacySetting === "PublicWithoutName") {
			record.media.PostedBy.Name = "";
			record.media.PostedBy.NickName = "";
			record.media.PostedBy.ProfilePic = "";
		}
		
		tmpResults.push(record);
	}
	
	return tmpResults;
}

/**
 * Extract unique labels from results
 */
function getLabelsArr(results) {
	const labelsArr = [];
	for (let i = 0; i < results.length; i++) {
		if (results[i].media && results[i].media.Label) {
			labelsArr.push(results[i].media.Label);
		}
	}
	return labelsArr;
}

/**
 * Field selections
 */
const DONT_SELECT_CHAPTER_FIELDS = { 'ChapterPlaylist': 0 };
const DONT_SELECT_USER_FIELDS = { 'Name': 1, 'NickName': 1, 'ProfilePic': 1 };
const PAGE_SELECT_FIELDS = {
	_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, IsDeleted: 1,
	Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1,
	Collection: 1, HeaderImage: 1, IsLabelAllowed: 1, DefaultLabels: 1,
	OwnerLabels: 1, Labels: 1, HeaderColorCode: 1, Medias: 1, PageType: 1
};

// ============================================================================
// MAIN CONTROLLER FUNCTION
// ============================================================================

var getCurrentBoardDetails_V4_WithPrivacySettings = async function(req, res) {
	try {
		// Debug logging
		console.log('🔍 getCurrentBoardDetails called');
		console.log('🔍 req.user:', req.user ? 'EXISTS' : 'MISSING');
		console.log('🔍 req.session:', req.session ? 'EXISTS' : 'MISSING');
		console.log('🔍 req.session.user:', req.session?.user ? 'EXISTS' : 'MISSING');
		
		// Validate session
		const currentUser = validateSession(req);
		console.log('✅ Session validated, user:', currentUser.Email);
		
		// Parse parameters
		const params = parseRequestParams(req);
		console.log('🔍 Parsed params:', {
			pageId: params.pageId,
			post_id: params.post_id,
			perPage: params.perPage,
			pageNo: params.pageNo,
			filterByUserId: params.filterByUserId
		});
		
		// Route to appropriate handler
		if (params.post_id) {
			console.log('📍 Routing to getSinglePost');
			return await getSinglePost(params, currentUser, res);
		}
		
		if (params.CapsuleFor === 'Theme') {
			console.log('📍 Routing to Theme handler');
			// Delegate to theme handler (keep existing function)
			return getCurrentBoardDetails_CapsuleForThemeCases(req, res);
		}
		
		console.log('📍 Routing to getAllPosts');
		return await getAllPosts(params, currentUser, res);
		
	} catch (error) {
		console.error('Error in getCurrentBoardDetails:', error);
		
		// Handle specific error types
		if (error.message === 'SESSION_REQUIRED') {
			return res.status(401).json({
				code: "401",
				msg: "Session required. Please login."
			});
		}
		
		if (error.message === 'INVALID_PAGE_ID') {
			return res.status(400).json({
				code: "400",
				msg: "Invalid page ID format. Must be a 24-character hexadecimal string."
			});
		}
		
		if (error.message === 'INVALID_POST_ID') {
			return res.status(400).json({
				code: "400",
				msg: "Invalid post ID format. Must be a 24-character hexadecimal string."
			});
		}
		
		if (error.message === 'INVALID_USER_ID') {
			return res.status(400).json({
				code: "400",
				msg: "Invalid user ID format. Must be a 24-character hexadecimal string."
			});
		}
		
		if (error.message === 'INVALID_STREAM_ID') {
			return res.status(400).json({
				code: "400",
				msg: "Invalid stream ID format. Must be a 24-character hexadecimal string."
			});
		}
		
		return res.status(500).json({
			code: "500",
			msg: "Internal server error"
		});
	}
};

// ============================================================================
// SINGLE POST HANDLER
// ============================================================================

async function getSinglePost(params, currentUser, res) {
	try {
		// Fetch page metadata first (without populating Medias to check if post_id is in array)
		const pageData = await board.findById(params.pageId)
			.select(PAGE_SELECT_FIELDS)
			.populate([
				{ path: 'ChapterId', select: DONT_SELECT_CHAPTER_FIELDS },
				{ path: 'OwnerId', select: DONT_SELECT_USER_FIELDS }
			])
			.exec();
		
		if (!pageData) {
			return res.json({ code: "404", msg: "Page not found" });
		}
		
		const shareMode = getShareMode([pageData]);
		const mediaIds = pageData.Medias || [];
		
		// Check if the requested post_id is in this page's media array
		const postIdExists = mediaIds.some(id => id.toString() === params.post_id);
		
		if (!postIdExists) {
			return res.json({
				code: "404",
				msg: "Post not found in this page"
			});
		}
		
		// Fetch the actual media document from media collection
		const mediaDoc = await media.findById(params.post_id)
			.populate('PostedBy', DONT_SELECT_USER_FIELDS)
			.exec();
		
		if (!mediaDoc) {
			return res.json({ code: "404", msg: "Media not found" });
		}
		
		// Apply privacy settings
		const results = [{ media: mediaDoc }];
		const finalResults = applyPrivacyToResults(results);
		
		return res.json({
			code: "200",
			msg: "Success",
			response: [pageData],
			media: finalResults,
			mode: shareMode,
			userId: currentUser._id,
			LabelsArr: getLabelsArr(finalResults)
		});
		
	} catch (error) {
		console.error('Error in getSinglePost:', error);
		return res.status(500).json({
			code: "500",
			msg: "Error retrieving post"
		});
	}
}

// ============================================================================
// ALL POSTS HANDLER  
// ============================================================================

async function getAllPosts(params, currentUser, res) {
	try {
		// Step 1: Fetch page metadata (without populating all Medias - just get the IDs)
		const pageData = await board.findById(params.pageId)
			.select(PAGE_SELECT_FIELDS)
			.populate([
				{ path: 'ChapterId', select: DONT_SELECT_CHAPTER_FIELDS },
				{ path: 'OwnerId', select: DONT_SELECT_USER_FIELDS }
			])
			.exec();
		
		if (!pageData) {
			return res.json({ code: "404", msg: "Page not found" });
		}
		
		const shareMode = getShareMode([pageData]);
		const mediaIds = pageData.Medias || [];
		
		if (mediaIds.length === 0) {
			return res.json({
				code: "200",
				msg: "Success",
				response: [pageData],
				media: [],
				mode: shareMode,
				userId: currentUser._id,
				LabelsArr: []
			});
		}
		
		// Step 2: Build MongoDB query for media collection
		const mediaQuery = buildMediaQuery(params, currentUser, pageData, shareMode, mediaIds);
		
		console.log('🔍 Media Query:', JSON.stringify(mediaQuery, null, 2));
		
		// Step 3: Query media collection with all filters, sorting, and pagination at DB level
		const mediaResults = await media.find(mediaQuery)
			.populate('PostedBy', DONT_SELECT_USER_FIELDS)
			.sort({ PostedOn: -1 })
			.skip(params.offset)
			.limit(params.perPage)
			.exec();
		
		console.log('✅ Media results count:', mediaResults.length);
		
		// Step 4: Apply privacy settings (hide names if needed)
		const formattedResults = mediaResults.map(m => ({ media: m }));
		const finalResults = applyPrivacyToResults(formattedResults);
		
		return res.json({
			code: "200",
			msg: "Success",
			response: [pageData],
			media: finalResults,
			mode: shareMode,
			userId: currentUser._id,
			LabelsArr: getLabelsArr(finalResults)
		});
		
	} catch (error) {
		console.error('Error in getAllPosts:', error);
		return res.status(500).json({
			code: "500",
			msg: "Error retrieving posts"
		});
	}
}

// ============================================================================
// MONGODB QUERY BUILDER (Efficient DB-level filtering)
// ============================================================================

/**
 * Build MongoDB query for media collection
 * This is MUCH more efficient than loading all media and filtering in JavaScript
 */
function buildMediaQuery(params, currentUser, page, shareMode, mediaIds) {
	// Base query: Only media that belongs to this page
	const query = {
		_id: { $in: mediaIds },  // ← Critical: Only query media in this page's array
		IsDeleted: { $ne: true }
	};
	
	// Privacy filtering based on ShareMode and user role
	const isOwner = page.ChapterId && 
		page.ChapterId.OwnerId && 
		page.ChapterId.OwnerId.toString() === currentUser._id.toString();
	
	if (!isOwner) {
		// Not owner - apply privacy filters
		if (shareMode === 'friend-solo') {
			// Friend-solo: Only show my posts, owner posts, or posts I'm tagged in
			const ownerId = page.ChapterId && page.ChapterId.OwnerId ? 
				new ObjectId(page.ChapterId.OwnerId) : null;
			
			query.$or = [
				{ PostedBy: new ObjectId(currentUser._id) },
				{ PostedBy: ownerId },
				{ TaggedUsers: currentUser.Email }
			];
		} else {
			// Friend-group or other: Apply post-level privacy
			query.$or = [
				{ PostPrivacySetting: { $ne: "OnlyForOwner" } },
				{ PostPrivacySetting: "OnlyForOwner", PostedBy: new ObjectId(currentUser._id) },
				{ TaggedUsers: currentUser.Email }
			];
		}
	}
	
	// Add search/filter criteria
	
	// Filter by tag name (stored as GroupTags in media collection)
	if (params.searchByTagName) {
		query["GroupTags"] = {
			$elemMatch: { GroupTagTitle: params.searchByTagName }
		};
	}
	
	// Filter by label
	if (params.searchByLabel) {
		query.Label = params.searchByLabel;
	}
	
	// Filter by specific user
	if (params.filterByUserId) {
		query.PostedBy = new ObjectId(params.filterByUserId);
	}
	
	// Filter stream posts
	if (params.IsAddedFromStream) {
		query.IsAddedFromStream = true;
	}
	
	// Filter user-specific posts
	if (params.IsPostForUser) {
		query.IsPostForUser = true;
	}
	
	// Filter team posts
	if (params.IsPostForTeam) {
		query.IsPostForTeam = true;
	}
	
	// Filter by specific stream ID
	if (params.StreamId) {
		query.StreamId = new ObjectId(params.StreamId);
	}
	
	return query;
}

// ============================================================================
// PLACEHOLDER FOR THEME HANDLER (Keep existing function)
// ============================================================================

var getCurrentBoardDetails_CapsuleForThemeCases = function(req, res) {
	// Keep the existing implementation from the old code
	// This function hasn't been modernized yet
	res.json({
		code: "501",
		msg: "Theme capsule handler not yet implemented in modernized version"
	});
};

// ============================================================================
// GET THEMES FROM POSTS (Extract unique tags from page's media)
// ============================================================================

/**
 * Get unique themes/tags from all posts in a page
 * Used for showing available filter tags in UI
 */
var getThemesFromPosts = async function(req, res) {
	try {
		// Validate session
		const currentUser = validateSession(req);
		
		// Parse parameters
		const params = parseRequestParams(req);
		
		console.log('🔍 getThemesFromPosts called for page:', params.pageId);
		
		// Fetch page to get media IDs
		const page = await board.findById(params.pageId)
			.select({ _id: 1, ChapterId: 1, OwnerId: 1, Medias: 1, Themes: 1 })
			.populate({ path: 'ChapterId', select: { LaunchSettings: 1, OwnerId: 1 } })
			.exec();
		
		if (!page) {
			return res.json({ code: "404", msg: "Page not found" });
		}
		
		const mediaIds = page.Medias || [];
		
		if (mediaIds.length === 0) {
			return res.json({ 
				code: "200", 
				msg: "Success", 
				response: [] 
			});
		}
		
		const shareMode = getShareMode([page]);
		
		// Build query based on criteria
		const mediaQuery = buildThemesMediaQuery(params, currentUser, page, shareMode, mediaIds);
		
		console.log('🔍 Themes media query:', JSON.stringify(mediaQuery, null, 2));
		
		// Fetch media documents (select both GroupTags and Themes for compatibility)
		const mediaResults = await media.find(mediaQuery)
			.select({ GroupTags: 1, Themes: 1 })
			.exec();
		
		console.log('✅ Found', mediaResults.length, 'media documents');
		console.log('🔍 Sample media doc:', JSON.stringify(mediaResults[0], null, 2));
		
		// Extract unique themes (check both GroupTags and Themes fields)
		const themesMap = new Map();
		
		for (const mediaDoc of mediaResults) {
			// Try GroupTags first (new schema)
			if (mediaDoc.GroupTags && Array.isArray(mediaDoc.GroupTags)) {
				for (const groupTag of mediaDoc.GroupTags) {
					if (groupTag.GroupTagID && groupTag.GroupTagTitle) {
						themesMap.set(groupTag.GroupTagID, groupTag.GroupTagTitle);
					}
				}
			}
			
			// Also try Themes field (in case old data exists)
			if (mediaDoc.Themes && Array.isArray(mediaDoc.Themes)) {
				for (const theme of mediaDoc.Themes) {
					if (theme.id && theme.text) {
						themesMap.set(theme.id, theme.text);
					}
				}
			}
		}
		
		// Convert to array format
		const uniqueThemes = Array.from(themesMap).map(([id, text]) => ({
			_id: id,
			text: text
		}));
		
		console.log('✅ Found', uniqueThemes.length, 'unique themes');
		
		return res.json({
			code: "200",
			msg: "Success",
			response: uniqueThemes
		});
		
	} catch (error) {
		console.error('Error in getThemesFromPosts:', error);
		
		if (error.message === 'SESSION_REQUIRED') {
			return res.status(401).json({
				code: "401",
				msg: "Session required. Please login."
			});
		}
		
		if (error.message === 'INVALID_PAGE_ID') {
			return res.status(400).json({
				code: "400",
				msg: "Invalid page ID format."
			});
		}
		
		return res.status(500).json({
			code: "500",
			msg: "Error retrieving themes"
		});
	}
};

/**
 * Build media query for themes extraction
 */
function buildThemesMediaQuery(params, currentUser, page, shareMode, mediaIds) {
	const query = {
		_id: { $in: mediaIds },
		IsDeleted: { $ne: true }
		// Don't require GroupTags/Themes - we'll extract them if they exist
	};
	
	const criteria = params.criteria || null;
	const isOwner = page.ChapterId && page.ChapterId.OwnerId && 
		page.ChapterId.OwnerId.toString() === currentUser._id.toString();
	
	// Handle different criteria
	if (!criteria || criteria === 'All') {
		// Apply privacy filters
		if (!isOwner) {
			if (shareMode === 'friend-solo') {
				const ownerId = page.ChapterId && page.ChapterId.OwnerId ? 
					new ObjectId(page.ChapterId.OwnerId) : null;
				
				query.$or = [
					{ PostedBy: new ObjectId(currentUser._id) },
					{ PostedBy: ownerId }
				];
			} else {
				// Friend-group: exclude OnlyForOwner posts
				query.$or = [
					{ PostPrivacySetting: { $ne: "OnlyForOwner" } },
					{ PostPrivacySetting: "OnlyForOwner", PostedBy: new ObjectId(currentUser._id) }
				];
			}
		}
	} else if (criteria === 'MyPosts') {
		// Only my posts
		query.PostedBy = new ObjectId(currentUser._id);
		
		// If search by tag provided, filter by that tag too
		if (params.searchByTagName) {
			query.GroupTags = {
				$elemMatch: { GroupTagTitle: params.searchByTagName }
			};
		}
	} else if (criteria === 'GlobalCommunity') {
		// Community posts (non-owner, public posts from other pages)
		query.PostPrivacySetting = { $nin: ["OnlyForOwner", "InvitedFriends"] };
		query.Origin = { $nin: ["Copy"] };
		query.$or = [
			{ IsAdminApproved: { $exists: false } },
			{ IsAdminApproved: true }
		];
	}
	
	return query;
}

// ============================================================================
// DEBUG ENDPOINT
// ============================================================================

var debugBoardAuth = function(req, res) {
	console.log('=== DEBUG BOARD AUTH ===');
	console.log('req.user:', req.user);
	console.log('req.session:', req.session);
	console.log('req.session.user:', req.session?.user);
	console.log('Headers:', req.headers);
	
	res.json({
		hasUser: !!req.user,
		hasSession: !!req.session,
		hasSessionUser: !!(req.session && req.session.user),
		user: req.user || null,
		sessionUser: req.session?.user || null,
		headers: {
			authorization: req.headers.authorization ? 'Present' : 'Missing',
			xSessionId: req.headers['x-session-id'] ? 'Present' : 'Missing'
		}
	});
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
	getCurrentBoardDetails: getCurrentBoardDetails_V4_WithPrivacySettings,
	getCurrentBoardDetails_V4_WithPrivacySettings,
	getThemesFromPosts,
	debugBoardAuth
};

