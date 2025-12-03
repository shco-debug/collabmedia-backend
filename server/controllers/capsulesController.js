var Capsule = require("./../models/capsuleModel.js");
var Chapter = require("./../models/chapterModel.js");
var Page = require("./../models/pageModel.js");
var media = require("./../models/mediaModel.js");
var User = require("./../models/userModel.js");
var Friend = require("./../models/friendsModel.js");
var Admin = require("./../models/adminModel.js");
var SubAdmin = require("./../models/subAdminModel.js");
var AppSetting = require("./../models/appSettingModel.js");

var Order = require("./../models/orderModel.js");
var mongoose = require("mongoose");
var Cart = require("./../models/cartModel.js");
var PageStream = require("./../models/pageStreamModel.js");
var SyncedPost = require("./../models/syncedpostModel.js");
var SyncedpostsMap = require("./../models/SyncedpostsMap.js");

var fs = require("fs");
var formidable = require("formidable");
var mediaController = require("./../controllers/mediaController.js");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

var im = require("imagemagick");
//var Page = require('./../models/pageModel.js');
var EmailTemplate = require("./../models/emailTemplateModel.js");

var async = require("async");

var counters = require("./../models/countersModel.js");

// Modern page layout utilities
var PageLayoutUtils = require("./../utilities/pageLayoutUtilities.js");

var dateFormat = function () {
  var d = new Date(),
    dformat =
      [
        d.getMonth() + 1 > 10 ? d.getMonth() + 1 : "0" + (d.getMonth() + 1),
        d.getDate() > 10 ? d.getDate() : "0" + d.getDate(),
        d.getFullYear(),
      ].join("") +
      "" +
      [d.getHours(), d.getMinutes(), d.getSeconds()].join("");
  return dformat;
};

/*________________________________________________________________________
   * @Date:      		2025-10-08
   * @Method :   		createPageWithModernSchema
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Helper to create a page using the new component-based schema
   * @Param:     		pageData, components array
   * @Return:    	 	Created page object
   * @Access Category:	"Internal Helper"
_________________________________________________________________________
*/
async function createPageWithModernSchema(pageData, components = []) {
  const nowDate = Date.now();
  
  const data = {
    ...pageData,
    Content: components,
    PageLayout: pageData.PageLayout || {
      type: "stack",
      columns: { mobile: 1, tablet: 2, desktop: 3 },
      gap: "md",
      maxWidth: "1200px"
    },
    PageBackground: pageData.PageBackground || {
      type: "color",
      value: "#ffffff",
      opacity: 1
    },
    CreatedOn: nowDate,
    UpdatedOn: nowDate
  };
  
  return await Page(data).save();
}

/*________________________________________________________________________
   * @Date:      		2025-10-08
   * @Method :   		createQuestionPage
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Create a question page for streams (simplified for birthday/event streams)
   * @Param:     		chapterId, questionText, options
   * @Return:    	 	Created page object
   * @Access Category:	"Internal Helper"
_________________________________________________________________________
*/
async function createQuestionPage(chapterId, userId, questionText, options = {}) {
  const questionComponent = PageLayoutUtils.createQuestionComponent(questionText, options);
  
  const pageData = {
    CreaterId: userId,
    OwnerId: userId,
    ChapterId: chapterId,
    Title: options.title || questionText.substring(0, 50),
    PageType: "content",
    Order: options.order || 0,
    Origin: options.origin || "created"
  };
  
  return await createPageWithModernSchema(pageData, [questionComponent]);
}

/*________________________________________________________________________
   * @Date:      		2025-10-08
   * @Method :   		addComponentToPage
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Add a component to an existing page
   * @Param:     		pageId, component
   * @Return:    	 	Updated page
   * @Access Category:	"Internal Helper"
_________________________________________________________________________
*/
async function addComponentToPage(pageId, component) {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new Error('Page not found');
  }
  
  // Initialize Content array if it doesn't exist
  if (!page.Content) {
    page.Content = [];
  }
  
  // Ensure component has an ID
  if (!component.id) {
    component.id = new mongoose.Types.ObjectId().toString();
  }
  
  page.Content.push(component);
  page.UpdatedOn = Date.now();
  
  return await page.save();
}

/*________________________________________________________________________
   * @Date:      		2025-10-08
   * @Method :   		inspectPageContent
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Debug endpoint to inspect page widgets/components
   * @Param:     		page_id in query params
   * @Return:    	 	Detailed page content analysis
   * @Access Category:	"Debug Helper"
_________________________________________________________________________
*/
var debugSession = function (req, res) {
  const sessionData = {
    hasSession: !!req.session,
    hasUser: !!(req.session && req.session.user),
    hasAdmin: !!(req.session && req.session.admin),
    hasSubAdmin: !!(req.session && req.session.subadmin),
    
    currentUser: req.session?.user ? {
      _id: req.session.user._id,
      Email: req.session.user.Email,
      Name: req.session.user.Name
    } : null,
    
    currentAdmin: req.session?.admin ? {
      _id: req.session.admin._id,
      email: req.session.admin.email,
      name: req.session.admin.name
    } : null,
    
    currentSubAdmin: req.session?.subadmin ? {
      _id: req.session.subadmin._id,
      email: req.session.subadmin.email,
      name: req.session.subadmin.name
    } : null
  };
  
  res.json({
    code: 200,
    message: "Session debug info",
    session: sessionData
  });
};
var inspectPageContent = async function (req, res) {
  try {
    const pageId = req.query.page_id || req.body.page_id || req.headers.page_id;
    
    if (!pageId) {
      return res.json({
        code: 400,
        message: "page_id is required"
      });
    }

    const page = await Page.findById(pageId);
    
    if (!page) {
      return res.json({
        code: 404,
        message: "Page not found"
      });
    }

    // Analyze page structure
    const analysis = {
      pageId: page._id,
      title: page.Title,
      pageType: page.PageType,
      origin: page.Origin,
      originatedFrom: page.OriginatedFrom,
      
      // Check which format this page uses
      schemaFormat: {
        hasNewContent: !!(page.Content && page.Content.length > 0),
        hasOldViewports: !!(page.ViewportDesktopSections || page.ViewportTabletSections || page.ViewportMobileSections)
      },
      
      // New format analysis
      newFormat: page.Content ? {
        componentCount: page.Content.length,
        componentTypes: page.Content.map(c => c.type),
        qaReferences: page.Content
          .filter(c => c.type === 'qa')
          .map(c => ({
            componentId: c.id,
            referencedPageId: c.data?.qaPageId || c.data?.qaPageRef
          })),
        components: page.Content.map(c => ({
          id: c.id,
          type: c.type,
          hasData: !!c.data,
          dataKeys: c.data ? Object.keys(c.data) : [],
          layout: c.layout,
          hasResponsive: !!c.responsive,
          style: c.style
        })),
        pageLayout: page.PageLayout,
        pageBackground: page.PageBackground
      } : null,
      
      // Old format analysis
      oldFormat: {
        desktop: page.ViewportDesktopSections ? {
          widgetCount: page.ViewportDesktopSections.Widgets?.length || 0,
          widgetTypes: page.ViewportDesktopSections.Widgets?.map(w => w.Type) || [],
          qaWidgets: page.ViewportDesktopSections.Widgets
            ?.filter(w => w.Type === 'questAnswer')
            .map(w => ({
              widgetIndex: w.SrNo,
              referencedPageId: w.QAWidObj?.PageId
            })) || [],
          background: page.ViewportDesktopSections.Background
        } : null,
        
        tablet: page.ViewportTabletSections ? {
          widgetCount: page.ViewportTabletSections.Widgets?.length || 0,
          widgetTypes: page.ViewportTabletSections.Widgets?.map(w => w.Type) || []
        } : null,
        
        mobile: page.ViewportMobileSections ? {
          widgetCount: page.ViewportMobileSections.Widgets?.length || 0,
          widgetTypes: page.ViewportMobileSections.Widgets?.map(w => w.Type) || []
        } : null
      },
      
      // Other page properties
      otherData: {
        selectedMedia: page.SelectedMedia,
        headerImage: page.HeaderImage,
        backgroundMusic: page.BackgroundMusic,
        createdOn: page.CreatedOn,
        updatedOn: page.UpdatedOn
      }
    };

    res.json({
      code: 200,
      message: "Page content analysis",
      analysis: analysis,
      rawPage: page  // Full page object for detailed inspection
    });

  } catch (error) {
    console.error("Inspect page error:", error);
    res.json({
      code: 500,
      message: "Error inspecting page",
      error: error.message
    });
  }
};

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		populateCapsuleWithGroupTags
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Utility function to populate a single capsule with its Group Tags
   * @Param:     		capsuleId (String)
   * @Return:    	 	Promise with enhanced capsule data
   * @Access Category:	"Internal Utility"
_________________________________________________________________________
*/

var populateCapsuleWithGroupTags = async function (capsuleId) {
  try {
    console.log('🔍 Step 1: Getting capsule with ID:', capsuleId);
    // Step 1: Get the capsule with basic info
    const capsule = await Capsule.findById(capsuleId).exec();

    if (!capsule) {
      console.log('🔍 Step 1: Capsule not found');
      return null;
    }
    
    console.log('🔍 Step 1: Capsule found:', capsule.Title);

    // Step 2: Get all chapter IDs from the capsule
    console.log('🔍 Step 2: Getting chapter IDs');
    const chapterIds = capsule.Chapters || [];
    console.log('🔍 Step 2: Found', chapterIds.length, 'chapters');

    if (chapterIds.length === 0) {
      console.log('🔍 Step 2: No chapters, returning capsule with empty tags');
      // No chapters, return capsule with empty tags
      return {
        ...capsule.toObject(),
        groupTags: [],
        tagStats: {
          totalTags: 0,
          uniqueGroupTags: 0,
          tagCategories: {},
          mediaWithTags: 0,
          tagCoverage: "0%",
        },
      };
    }

    // Step 3: Get all pages from all chapters using aggregation for better performance
    console.log('🔍 Step 3: Getting chapter documents');
    const Chapter = require("./../models/chapterModel.js");
    const chapterDocs = await Chapter.find({ _id: { $in: chapterIds } }).exec();
    console.log('🔍 Step 3: Found', chapterDocs.length, 'chapter documents');

    // Alternative approach: Extract pages directly from chapter documents
    console.log('🔍 Step 3: Extracting page IDs from chapters');
    const allPageIds = [];
    chapterDocs.forEach((chapter) => {
      if (chapter.pages && Array.isArray(chapter.pages)) {
        chapter.pages.forEach((pageId) => {
          // Convert ObjectId to string if needed
          const pageIdStr = pageId.toString();
          if (!allPageIds.includes(pageIdStr)) {
            allPageIds.push(pageIdStr);
          }
        });
      }
    });
    console.log('🔍 Step 3: Found', allPageIds.length, 'page IDs');

    if (allPageIds.length === 0) {
      console.log('🔍 Step 3: No pages, returning capsule with empty tags');
      // No pages, return capsule with empty tags
      return {
        ...capsule.toObject(),
        groupTags: [],
        tagStats: {
          totalTags: 0,
          uniqueGroupTags: 0,
          tagCategories: {},
          mediaWithTags: 0,
          tagCoverage: "0%",
        },
      };
    }

    // Step 4: Get all media IDs from all pages using aggregation for better performance
    console.log('🔍 Step 4: Getting page documents');

    // Debug: Check what's in the page documents
    const Page = require("./../models/pageModel.js");
    const pageDocs = await Page.find({ _id: { $in: allPageIds } }).exec();
    console.log('🔍 Step 4: Found', pageDocs.length, 'page documents');

    pageDocs.forEach((page, index) => {});

    // Alternative approach: Extract media IDs directly from page documents
    console.log('🔍 Step 4: Extracting media IDs from pages');
    const allMediaIds = [];
    pageDocs.forEach((page) => {
      if (page.Medias && Array.isArray(page.Medias)) {
        page.Medias.forEach((mediaId) => {
          // Convert ObjectId to string if needed
          const mediaIdStr = mediaId.toString();
          if (!allMediaIds.includes(mediaIdStr)) {
            allMediaIds.push(mediaIdStr);
          }
        });
      }
    });
    console.log('🔍 Step 4: Found', allMediaIds.length, 'media IDs');

    if (allMediaIds.length > 0) {
      allMediaIds.forEach((mediaId, index) => {});
    }

    if (allMediaIds.length === 0) {
      console.log('🔍 Step 4: No media, returning capsule with empty tags');
      // No media, return capsule with empty tags
      return {
        ...capsule.toObject(),
        groupTags: [],
        tagStats: {
          totalTags: 0,
          uniqueGroupTags: 0,
          tagCategories: {},
          mediaWithTags: 0,
          tagCoverage: "0%",
        },
      };
    }

    // Step 4.5: Fetch GroupTags from master media collection
    console.log('🔍 Step 4.5: Fetching master media documents');

    if (allMediaIds.length > 0) {
      allMediaIds.forEach((mediaId, index) => {});
    }

    // Fetch master media documents to get GroupTags
    const Media = require("./../models/mediaModel.js");
    const masterMediaDocs = await Media.find({
      _id: { $in: allMediaIds },
      Status: { $in: [0, 1, 2, 3] }, // Include all status types
    }).exec();
    console.log('🔍 Step 4.5: Found', masterMediaDocs.length, 'master media documents');

    // Create a map of MediaID to GroupTags for quick lookup
    const mediaGroupTagsMap = new Map();
    masterMediaDocs.forEach((masterMedia) => {
      mediaGroupTagsMap.set(
        masterMedia._id.toString(),
        masterMedia.GroupTags || []
      );
    });

    // Step 5: Extract all unique GroupTag IDs from all media

    const groupTagIds = new Set();
    const groupTagOccurrences = new Map(); // Track how many times each tag appears

    allMediaIds.forEach((mediaId, mediaIndex) => {
      // Get GroupTags from master media
      const groupTags = mediaGroupTagsMap.get(mediaId.toString()) || [];

      if (groupTags.length > 0) {
        groupTags.forEach((groupTag, tagIndex) => {
          if (groupTag.GroupTagID) {
            const tagId = groupTag.GroupTagID.toString();
            groupTagIds.add(tagId);
            groupTagOccurrences.set(
              tagId,
              (groupTagOccurrences.get(tagId) || 0) + 1
            );
          }
        });
      } else {
      }
    });

    const uniqueGroupTagIds = Array.from(groupTagIds);

    if (uniqueGroupTagIds.length > 0) {
      uniqueGroupTagIds.forEach((tagId, index) => {
        const occurrenceCount = groupTagOccurrences.get(tagId);
      });
    }

    if (uniqueGroupTagIds.length === 0) {
      // No tags, return capsule with empty tags
      return {
        ...capsule.toObject(),
        groupTags: [],
        tagStats: {
          totalTags: 0,
          uniqueGroupTags: 0,
          tagCategories: {},
          mediaWithTags: 0,
          tagCoverage: "0%",
        },
      };
    }

    // Step 6: Get full Group Tag details with population
    // COMMENTED OUT TO PREVENT HANGING
    /*
    const groupTags = require("./../models/groupTagsModel.js");

    console.log('🔍 Fetching group tags for', uniqueGroupTagIds.length, 'tag IDs');
    const groupTagsData = await groupTags
      .find(
        {
          _id: { $in: uniqueGroupTagIds },
          $or: [{ status: 1 }, { status: 3 }], // Active and descriptor tags only
        },
        {
          Tags: 0, // Exclude the Tags array to reduce response size
        }
      )
      .exec();
    
    console.log('🔍 Found', groupTagsData.length, 'group tags');
    */
    
    // Return capsule with empty group tags to prevent hanging
    const groupTagsData = [];

    if (groupTagsData.length > 0) {
      groupTagsData.forEach((groupTag, index) => {});
    }

    // Step 7: Enhance Group Tags with occurrence count and media info
    // COMMENTED OUT TO PREVENT HANGING
    /*
    const enhancedGroupTags = groupTagsData.map((groupTag) => {
      const occurrenceCount =
        groupTagOccurrences.get(groupTag._id.toString()) || 0;

      return {
        _id: groupTag._id,
        GroupTagTitle: groupTag.GroupTagTitle,
        Notes: groupTag.Notes,
        MetaMetaTagID: groupTag.MetaMetaTagID,
        MetaTagID: groupTag.MetaTagID,
        More: groupTag.More || [],
        Less: groupTag.Less || [],
        Think: groupTag.Think || [],
        status: groupTag.status,
        DateAdded: groupTag.DateAdded,
        LastModified: groupTag.LastModified,
        MediaCount: groupTag.MediaCount,
        PostMediaCount: groupTag.PostMediaCount,
        // Additional computed fields
        occurrenceCount: occurrenceCount,
        usagePercentage: (
          (occurrenceCount / masterMediaDocs.length) *
          100
        ).toFixed(2),
        mediaWithThisTag: occurrenceCount,
      };
    });
    */

    // Return empty enhanced group tags to prevent hanging
    const enhancedGroupTags = [];

    // Step 8: Calculate tag statistics
    // COMMENTED OUT TO PREVENT HANGING
    /*
    const totalTags = Array.from(groupTagOccurrences.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const uniqueGroupTags = enhancedGroupTags.length;

    // Categorize tags by status
    const tagCategories = {
      active: enhancedGroupTags.filter((tag) => tag.status === 1).length,
      descriptor: enhancedGroupTags.filter((tag) => tag.status === 3).length,
      user: enhancedGroupTags.filter((tag) => tag.status === 2).length,
    };

    // Sort tags by occurrence count (most used first)
    enhancedGroupTags.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    const mediaWithTags = masterMediaDocs.filter(
      (media) => media.GroupTags && media.GroupTags.length > 0
    ).length;
    */
    
    // Return empty statistics to prevent hanging
    const totalTags = 0;
    const uniqueGroupTags = 0;
    const tagCategories = { active: 0, descriptor: 0, user: 0 };
    const mediaWithTags = 0;

    // Return enhanced capsule with tags
    return {
      ...capsule.toObject(),
      groupTags: enhancedGroupTags,
      tagStats: {
        totalTags: totalTags,
        uniqueGroupTags: uniqueGroupTags,
        tagCategories: tagCategories,
        mediaWithTags: mediaWithTags,
        tagCoverage:
          ((mediaWithTags / masterMediaDocs.length) * 100).toFixed(2) + "%",
      },
    };
  } catch (error) {
    console.error("❌ ERROR in populateCapsuleWithGroupTags:", error);
    console.error("Error stack:", error.stack);
    console.error("Capsule ID that failed:", capsuleId);
    // Return original capsule without tags if error occurs
    const capsule = await Capsule.findById(capsuleId).exec();
    if (capsule) {
      return {
        ...capsule.toObject(),
        groupTags: [],
        tagStats: {
          totalTags: 0,
          uniqueGroupTags: 0,
          tagCategories: {},
          mediaWithTags: 0,
          tagCoverage: "0%",
        },
      };
    } else {
      return null;
    }
  }
};

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		populateCapsulesWithGroupTags
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Utility function to populate multiple capsules with their Group Tags
   * @Param:     		capsules (Array of capsule objects or IDs)
   * @Return:    	 	Promise with enhanced capsules array
   * @Access Category:	"Internal Utility"
_________________________________________________________________________
*/

var populateCapsulesWithGroupTags = async function (capsules) {
  try {
    if (!Array.isArray(capsules) || capsules.length === 0) {
      return [];
    }

    // Process capsules in parallel for better performance
    const enhancedCapsules = await Promise.all(
      capsules.map(async (capsule, index) => {
        const capsuleId = typeof capsule === "string" ? capsule : capsule._id;
        const result = await populateCapsuleWithGroupTags(capsuleId);
        return result;
      })
    );

    // Filter out null results (capsules that weren't found)
    const validCapsules = enhancedCapsules.filter(
      (capsule) => capsule !== null
    );

    return validCapsules;
  } catch (error) {
    // Return original capsules without tags if error occurs
    return capsules;
  }
};

//Capsules In the making Apis

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		find
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var find = async function (req, res) {
  try {
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers.",
      });
    }

    var conditions = {
      _id: req.headers.capsule_id,
      Status: 1,
      IsDeleted: 0,
    };

    var fields = {};

    // Get the basic capsule
    let capsule = await Capsule.findOne(conditions).exec();

    if (!capsule) {
      var response = {
        status: 404,
        message: "Capsule not found",
      };
      return res.json(response);
    }

    // 🎯 Populate CreaterId for stream details page
    if (capsule.CreaterId) {
      try {
        // Try to find in User collection first
        const user = await User.findById(capsule.CreaterId)
          .select("Name ProfilePic")
          .exec();
        if (user) {
          capsule = capsule.toObject();
          capsule.CreaterId = {
            _id: user._id,
            Name: user.Name,
            ProfilePic: user.ProfilePic,
          };
        } else {
          // Try to find in Admin collection
          const admin = await Admin.findById(capsule.CreaterId)
            .select("name ProfilePic")
            .exec();
          if (admin) {
            capsule = capsule.toObject();
            capsule.CreaterId = {
              _id: admin._id,
              Name: admin.name,
              ProfilePic: admin.ProfilePic,
            };
          } else {
            // Try to find in SubAdmin collection (using consistent casing)
            const SubAdminModel = require("./../models/subAdminModel.js");
            const subAdmin = await SubAdminModel.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (subAdmin) {
              capsule = capsule.toObject();
              capsule.CreaterId = {
                _id: subAdmin._id,
                Name: subAdmin.name,
                ProfilePic: subAdmin.ProfilePic,
              };
            } else {
              // If not found in any collection, set default values
              capsule = capsule.toObject();
              capsule.CreaterId = {
                _id: capsule.CreaterId,
                Name: "Unknown User",
                ProfilePic: "/assets/users/default.png",
              };
            }
          }
        }
      } catch (error) {
        console.error("❌ Error populating CreaterId:", error);
        capsule = capsule.toObject();
        capsule.CreaterId = {
          _id: capsule.CreaterId,
          Name: "Unknown User",
          ProfilePic: "/assets/users/default.png",
        };
      }
    }

    var response = {
      status: 200,
      message: "Capsule retrieved successfully",
      result: capsule,
    };
    res.json(response);
  } catch (error) {
    console.error("❌ ERROR in find:", error);
    console.error("Error stack:", error.stack);
    var response = {
      status: 501,
      message: "Something went wrong.",
      result: null,
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		findAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAll = async function (req, res) {
  console.log(
    "🔍 FINDALL FUNCTION CALLED - This should NOT appear for publishedForMe!"
  );
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    /*
		var conditions = {
			$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
			CreaterId : req.session.user._id,
			IsPublished : false,
			Status : 1,
			IsDeleted : 0
		};
		*/
    var conditions = {
      CreaterId: myself._id,
      $or: [
        { Origin: "created" },
        { Origin: "duplicated" },
        { Origin: "addedFromLibrary" },
      ],
      IsPublished: false,
      IsLaunched: false,  // ✅ Only unpublished and unlaunched capsules
      Status: true,
      IsDeleted: false,
    };

    var sortObj = {
      Order: 1,
      ModifiedOn: -1,
    };

    var fields = {};

    // Get basic capsules first
    const results = await Capsule.find(conditions, fields).sort(sortObj).exec();

    // Populate CreaterId from different schemas (user, admin, subadmin)
    const populatedResults = await Promise.all(
      results.map(async (capsule) => {
        if (capsule.CreaterId) {
          try {
            // Try to find in User collection first
            const user = await User.findById(capsule.CreaterId)
              .select("Name ProfilePic")
              .exec();
            if (user) {
              capsule.CreaterId = {
                _id: user._id,
                Name: user.Name,
                ProfilePic: user.ProfilePic,
              };
              return capsule;
            }

            // Try to find in Admin collection
            const admin = await Admin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            console.log(admin, "No admin found");
            if (admin) {
              capsule.CreaterId = {
                _id: admin._id,
                Name: admin.name,
                ProfilePic: admin.ProfilePic,
              };
              return capsule;
            }

            // Try to find in SubAdmin collection
            const subAdmin = await SubAdmin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (subAdmin) {
              capsule.CreaterId = {
                _id: subAdmin._id,
                Name: subAdmin.name,
                ProfilePic: subAdmin.ProfilePic,
              };
              return capsule;
            }

            // If not found in any collection, set default values
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          } catch (error) {
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          }
        }
        return capsule;
      })
    );

    // 🎯 OPTIMIZED: Return capsules without group tags for better performance
    var response = {
      status: 200,
      message: "Capsules listing",
      results: populatedResults,
    };
    res.json(response);
  } catch (error) {
    var response = {
      status: 501,
      message: "Something went wrong.",
      results: null,
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		findAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAllPaginated = async function (req, res) {
  try {
    console.log('🔍 findAllPaginated called');
    
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get actual Role field
    const currentUser = await User.findById(myself._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    const userRole = currentUser.Role || 'user';  // Get Role from database
    console.log('👤 Current user:', { id: currentUser._id, name: currentUser.Name, role: userRole });

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    // Build conditions based on user role from database
    var conditions;
    
    if (userRole === 'admin') {
      // For ADMIN: Only published created capsules + published shared capsules
      conditions = {
        $or: [
          {
            CreaterId: currentUser._id,
            Origin: "created",
            IsPublished: true  // ✅ Only published for admin
          },
          {
            CreaterId: currentUser._id,
            Origin: "duplicated",
            IsPublished: true
          },
          {
            CreaterId: currentUser._id,
            Origin: "addedFromLibrary",
            IsPublished: true
          },
          {
            CreaterId: { $ne: currentUser._id },
            OwnerId: currentUser._id,
            Origin: "shared",
            IsPublished: true  // ✅ Only published shared capsules for admin
          }
        ],
        Status: true,
        IsDeleted: false,
      };
    } else {
      // For USER/SUBADMIN: All capsules (created, shared, purchased, journal)
      conditions = {
        $or: [
          {
            CreaterId: currentUser._id,
          Origin: "created"
        },
        {
            CreaterId: currentUser._id,
          Origin: "duplicated"
        },
        {
            CreaterId: currentUser._id,
          Origin: "addedFromLibrary"
        },
        {
            CreaterId: { $ne: currentUser._id },
            OwnerId: currentUser._id,
          Origin: "shared"
        },
        {
            OwnerId: currentUser._id,
          Origin: "published"
        },
        {
            CreaterId: currentUser._id,
          Origin: "journal"
        }
      ],
      Status: true,
      IsDeleted: false,
    };
    }

    var sortObj = {
      ModifiedOn: -1,
    };

    console.log('📋 Query conditions:', JSON.stringify(conditions, null, 2));

    // 🎯 OPTIMIZED: Only select fields needed for dashboard cards
    var fields = {
      _id: 1,
      Title: 1,
      Description: 1,
      CoverArt: 1,
      LaunchSettings: 1,
      ModifiedOn: 1,
      CreaterId: 1,
      OwnerId: 1,
      Origin: 1,
      OriginatedFrom: 1, // ✅ Added for e-book redirect logic
      IsPublished: 1,
      Status: 1,
      IsDeleted: 1,
      // Add price field if it exists
      Price: 1,
      // Add basic stats fields
      PostCount: 1,
      MemberCount: 1
    };

    // Get basic capsules with only essential fields
    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();
    const resultsLength = await Capsule.countDocuments(conditions).exec();
    
    console.log(`✅ Found ${resultsLength} total capsules, returning ${results.length} results`);
    console.log('📊 Sample results:', results.slice(0, 2).map(r => ({ 
      id: r._id, 
      title: r.Title, 
      published: r.IsPublished, 
      audience: r.LaunchSettings?.Audience,
      origin: r.Origin
    })));

    // 🎯 Populate CreaterId for dashboard cards
    const populatedResults = await Promise.all(
      results.map(async (capsule) => {
        if (capsule.CreaterId) {
          try {
            // Try to find in User collection first
            const user = await User.findById(capsule.CreaterId)
              .select("Name ProfilePic")
              .exec();
            if (user) {
              capsule.CreaterId = {
                _id: user._id,
                Name: user.Name,
                ProfilePic: user.ProfilePic,
              };
              return capsule;
            }

            // Try to find in Admin collection
            const admin = await Admin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (admin) {
              capsule.CreaterId = {
                _id: admin._id,
                Name: admin.name,
                ProfilePic: admin.ProfilePic,
              };
              return capsule;
            }

            // Try to find in SubAdmin collection
            const subAdmin = await SubAdmin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (subAdmin) {
              capsule.CreaterId = {
                _id: subAdmin._id,
                Name: subAdmin.name,
                ProfilePic: subAdmin.ProfilePic,
              };
              return capsule;
            }

            // If not found in any collection, set default values
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          } catch (error) {
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          }
        }
        return capsule;
      })
    );

    // 🎯 Transform to dashboard-friendly format with populated creator
    const dashboardResults = populatedResults.map(capsule => ({
      _id: capsule._id,
      id: capsule._id.toString(),
      title: capsule.Title || 'Untitled',
      description: capsule.Description || '',
      coverImage: capsule.CoverArt ? `https://www.scrpt.com/assets/Media/capsules/600/${capsule.CoverArt}` : '/placeholder-stream.jpg',
      privacy: capsule.LaunchSettings?.Audience === 'ME' ? 'private' : 
               capsule.LaunchSettings?.Audience === 'OTHERS' ? 'friends' : 'public',
      collaborators: capsule.MemberCount || 0,
      posts: capsule.PostCount || 0,
      lastActivity: capsule.ModifiedOn ? new Date(capsule.ModifiedOn).toLocaleDateString() : 'Unknown',
      tags: [], // Empty for now - can be populated separately if needed
      status: capsule.Status,
      isPublished: capsule.IsPublished,
      isLaunched: capsule.IsLaunched,  // FIXED: was capsule.IsPublished (copy-paste error)
      isDeleted: capsule.IsDeleted,
      origin: capsule.Origin,
      ownerId: capsule.OwnerId?.toString(),
      author: capsule.CreaterId?.Name || 'Unknown',
      price: capsule.Price || '$0',
      modifiedOn: capsule.ModifiedOn,
      // Add creator info for frontend mapping
      CreaterId: capsule.CreaterId
    }));

    var response = {
      count: resultsLength,
      status: 200,
      message: "Capsules listing optimized for dashboard",
      results: dashboardResults,
    };
    res.json(response);
  } catch (error) {
    console.error("❌ ERROR in findAllPaginated:", error);
    console.error("Error stack:", error.stack);
    var response = {
      status: 501,
      message: "Something went wrong.",
      results: null,
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		createdByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var createdByMe = async function (req, res) {
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get actual Role field
    const currentUser = await User.findById(myself._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    const userRole = currentUser.Role || 'user';  // Get Role from database

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    console.log('🔍 createdByMe - Current user:', { id: currentUser._id, role: userRole });

    // Build conditions based on user role from database
    var conditions;
    
    if (userRole === 'admin') {
      // For ADMIN: Only published capsules where admin is creator
      conditions = {
        $or: [
          {
            CreaterId: currentUser._id,
            Origin: "created",
            IsPublished: true  // ✅ Only published for admin
          },
          {
            CreaterId: currentUser._id,
            Origin: "duplicated",
            IsPublished: true
          },
          {
            CreaterId: currentUser._id,
            Origin: "addedFromLibrary",
            IsPublished: true
          }
        ],
        Status: true,
        IsDeleted: false,
      };
    } else {
      // For USER/SUBADMIN: Both published AND unpublished capsules
      conditions = {
      $or: [
        {
          CreaterId: currentUser._id,
          Origin: "created"
        },
        {
          CreaterId: currentUser._id,
          Origin: "duplicated"
        },
        {
          CreaterId: currentUser._id,
          Origin: "addedFromLibrary"
        }
      ],
      Status: true,
      IsDeleted: false,
    };
    }

    console.log('📋 createdByMe conditions:', JSON.stringify(conditions, null, 2));

    var sortObj = {
      ModifiedOn: -1,
    };

    var fields = {};

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();
    
    console.log(`✅ createdByMe found ${resultsLength} total capsules, returning ${results.length} results`);

    // Populate CreaterId from different schemas based on role
    const populatedResults = await Promise.all(
      results.map(async (capsule) => {
        if (capsule.CreaterId) {
          try {
            // Try User collection first
            const user = await User.findById(capsule.CreaterId)
              .select("Name ProfilePic Role")
              .exec();
            
            if (user) {
              capsule.CreaterId = {
                _id: user._id,
                Name: user.Name,
                ProfilePic: user.ProfilePic,
                Role: user.Role
              };
              return capsule;
            }

            // Try Admin collection
            const admin = await Admin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            
            if (admin) {
              capsule.CreaterId = {
                _id: admin._id,
                Name: admin.name,
                ProfilePic: admin.ProfilePic,
                Role: 'admin'
              };
              return capsule;
            }

            // Try SubAdmin collection
            const subAdmin = await SubAdmin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            
            if (subAdmin) {
              capsule.CreaterId = {
                _id: subAdmin._id,
                Name: subAdmin.name,
                ProfilePic: subAdmin.ProfilePic,
                Role: 'subadmin'
              };
              return capsule;
            }

              // If not found, set default values
              capsule.CreaterId = {
                _id: capsule.CreaterId,
                Name: "Unknown User",
                ProfilePic: "/assets/users/default.png",
                Role: "user"
              };
          } catch (error) {
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
              Role: "user"
            };
          }
        }
        return capsule;
      })
    );

    var response = {
      count: resultsLength,
      status: 200,
      message: "Capsules listing",
      results: populatedResults,
    };
    res.json(response);
  } catch (error) {
    console.log(error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		November 4 2025
   * @Method :   		ownedByMe
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Get capsules for the current user's "My Streams" tab (Frontend only)
   *                  - SubAdmin: Streams they CREATED (CreaterId)
   *                  - Normal User: Streams they OWN (OwnerId - created, purchased, gifted, shared)
   *                  Shows ALL streams regardless of published/launched status
   *                  NOTE: Admin role is NOT handled by this endpoint (admin uses separate system)
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var ownedByMe = async function (req, res) {
  try {
    // Get user from session
    if (!req.session || !req.session.user) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get current Role and permissions
    const currentUser = await User.findById(req.session.user._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    console.log('🔍 ownedByMe - Current user:', { id: currentUser._id, role: currentUser.Role });

    // Role-based logic:
    // - SubAdmin: Show streams they CREATED (CreaterId)
    // - Normal User: Show streams they OWN (OwnerId)
    const isSubAdmin = currentUser.Role === 'subadmin';
    const userIdField = isSubAdmin ? 'CreaterId' : 'OwnerId';

    console.log('🎯 Using field:', userIdField, 'for role:', currentUser.Role);

    // Get all capsules created/owned by the user (no matter if published/launched)
    var conditions = {
      [userIdField]: currentUser._id,
      Status: true,
      IsDeleted: false,
    };

    console.log('📋 ownedByMe conditions:', JSON.stringify(conditions, null, 2));

    var sortObj = {
      ModifiedOn: -1,
    };

    // 🎯 OPTIMIZED: Only select fields needed for dashboard cards
    var fields = {
      _id: 1,
      Title: 1,
      Description: 1,
      CoverArt: 1,
      LaunchSettings: 1,
      ModifiedOn: 1,
      CreaterId: 1,
      OwnerId: 1,
      Origin: 1,
      OriginatedFrom: 1, // ✅ Added for e-book redirect logic
      IsPublished: 1,
      IsLaunched: 1,
      Status: 1,
      IsDeleted: 1,
      Price: 1,
      PostCount: 1,
      MemberCount: 1
    };

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();
    
    console.log(`✅ ownedByMe found ${resultsLength} total capsules, returning ${results.length} results`);
    console.log('📊 Sample results:', results.slice(0, 2).map(r => ({ 
      id: r._id, 
      title: r.Title, 
      published: r.IsPublished,
      launched: r.IsLaunched,
      audience: r.LaunchSettings?.Audience,
      origin: r.Origin
    })));

    // 🎯 Populate CreaterId for dashboard cards
    const populatedResults = await Promise.all(
      results.map(async (capsule) => {
        if (capsule.CreaterId) {
          try {
            // Try to find in User collection first
            const user = await User.findById(capsule.CreaterId)
              .select("Name ProfilePic")
              .exec();
            if (user) {
              capsule.CreaterId = {
                _id: user._id,
                Name: user.Name,
                ProfilePic: user.ProfilePic,
              };
              return capsule;
            }

            // Try to find in Admin collection
            const admin = await Admin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (admin) {
              capsule.CreaterId = {
                _id: admin._id,
                Name: admin.name,
                ProfilePic: admin.ProfilePic,
              };
              return capsule;
            }

            // Try to find in SubAdmin collection
            const subAdmin = await SubAdmin.findById(capsule.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (subAdmin) {
              capsule.CreaterId = {
                _id: subAdmin._id,
                Name: subAdmin.name,
                ProfilePic: subAdmin.ProfilePic,
              };
              return capsule;
            }

            // If not found in any collection, set default values
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          } catch (error) {
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          }
        }
        return capsule;
      })
    );

    var response = {
      count: resultsLength,
      status: 200,
      message: isSubAdmin ? "Capsules created by current user" : "Capsules owned by current user",
      results: populatedResults,
    };
    res.json(response);
  } catch (error) {
    console.error('❌ Error in ownedByMe:', error);
    var response = {
      status: 501,
      message: "Unable to get capsule listing",
      results: null,
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		January 2025
   * @Method :   		getPlatformStreamTitles
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Get stream titles for platform subscription display
   *                  Returns only Title and _id for streams that:
   *                  - Created by admin or subadmin
   *                  - Origin: "created"
   *                  - LaunchSettings.Audience: "BUYERS"
   *                  - IsLaunched: true
   *                  - IsPublished: true
   * @Param:     		None (public endpoint)
   * @Return:    	 	yes
   * @Access Category:	"PUBLIC"
_________________________________________________________________________
*/

var getPlatformStreamTitles = async function (req, res) {
  try {
    // Get all admin and subadmin IDs from User collection only (Role field)
    const adminUsers = await User.find({ 
      $or: [
        { Role: 'admin' },
        { Role: 'subadmin' }
      ],
      IsDeleted: false 
    }).select('_id').lean().exec();
    
    const adminSubAdminIds = adminUsers.map(u => u._id);
    
    console.log('🔍 getPlatformStreamTitles - Admin/SubAdmin users found:', adminSubAdminIds.length);
    console.log('🔍 getPlatformStreamTitles - Sample IDs:', adminSubAdminIds.slice(0, 3).map(id => String(id)));
    
    if (adminSubAdminIds.length === 0) {
      console.log('⚠️ getPlatformStreamTitles - No admin/subadmin found in User collection');
      return res.status(200).json({
        code: 200,
        msg: "Success",
        data: []
      });
    }
    
    // Query conditions - step by step debugging
    // First, let's check if there are any streams created by admin/subadmin
    var baseConditions = {
      CreaterId: { $in: adminSubAdminIds },
      Status: true,
      IsDeleted: false
    };
    
    const baseCount = await Capsule.countDocuments(baseConditions).exec();
    console.log('🔍 getPlatformStreamTitles - Streams created by admin/subadmin:', baseCount);
    
    // Check with Origin
    var originConditions = {
      ...baseConditions,
      Origin: "created"
    };
    const originCount = await Capsule.countDocuments(originConditions).exec();
    console.log('🔍 getPlatformStreamTitles - With Origin="created":', originCount);
    
    // Check with Audience
    var audienceConditions = {
      ...originConditions,
      "LaunchSettings.Audience": "BUYERS"
    };
    const audienceCount = await Capsule.countDocuments(audienceConditions).exec();
    console.log('🔍 getPlatformStreamTitles - With Audience="BUYERS":', audienceCount);
    
    // Check with IsLaunched
    var launchedConditions = {
      ...audienceConditions,
      IsLaunched: true
    };
    const launchedCount = await Capsule.countDocuments(launchedConditions).exec();
    console.log('🔍 getPlatformStreamTitles - With IsLaunched=true:', launchedCount);
    
    // Final conditions
    var conditions = {
      ...launchedConditions,
      IsPublished: true
    };
    
    const finalCount = await Capsule.countDocuments(conditions).exec();
    console.log('🔍 getPlatformStreamTitles - Final count (with IsPublished=true):', finalCount);
    
    // If no results, try without some strict conditions to see what we have
    if (finalCount === 0) {
      // Try without IsPublished requirement
      const withoutPublished = await Capsule.find({
        ...launchedConditions
      }).select('_id Title IsPublished LaunchSettings.Audience Origin IsLaunched').limit(5).lean().exec();
      
      console.log('🔍 getPlatformStreamTitles - Sample streams (without IsPublished filter):', 
        withoutPublished.map(s => ({
          id: s._id,
          title: s.Title,
          isPublished: s.IsPublished,
          audience: s.LaunchSettings?.Audience,
          origin: s.Origin,
          isLaunched: s.IsLaunched
        }))
      );
    }
    
    // Only select Title and _id
    var fields = {
      _id: 1,
      Title: 1
    };
    
    var sortObj = {
      ModifiedOn: -1
    };
    
    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .exec();
    
    console.log('✅ getPlatformStreamTitles - Found', results.length, 'streams');
    
    // Fetch platform subscription price from AppSettings
    let platformPrice = 1; // Default price
    try {
      const appSettings = await AppSetting.findOne({ isDeleted: false }).exec();
      if (appSettings && typeof appSettings.PlatformSubscriptionPrice === 'number') {
        platformPrice = appSettings.PlatformSubscriptionPrice;
      }
    } catch (error) {
      console.error('⚠️ getPlatformStreamTitles - Error fetching app settings:', error);
      // Continue with default price
    }
    
    // Map to simple format with platform price
    const titles = results.map(capsule => ({
      id: capsule._id,
      title: capsule.Title || 'Untitled Stream'
    }));
    
    return res.status(200).json({
      code: 200,
      msg: "Success",
      data: {
        titles: titles,
        platformPrice: platformPrice
      }
    });
  } catch (error) {
    console.error('❌ Error in getPlatformStreamTitles:', error);
    return res.status(500).json({
      code: 500,
      msg: "Internal server error",
      error: error.message
    });
  }
};

/*________________________________________________________________________
   * @Date:      		November 3 2025
   * @Method :   		activeLaunched
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Get capsules that are both published AND launched
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var activeLaunched = async function (req, res) {
  try {
    // Get user from session
    if (!req.session || !req.session.user) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get current Role and permissions
    const currentUser = await User.findById(req.session.user._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    console.log('🚀 activeLaunched - Current user ID:', currentUser._id);

    // Get capsules that are both published AND launched (including purchased streams)
    var conditions = {
      $or: [
        {
          CreaterId: currentUser._id,
          Origin: "created"
        },
        {
          CreaterId: currentUser._id,
          Origin: "duplicated"
        },
        {
          CreaterId: currentUser._id,
          Origin: "addedFromLibrary"
        },
        {
          CreaterId: { $ne: currentUser._id },
          OwnerId: currentUser._id,
          Origin: "shared"
        },
        {
          OwnerId: currentUser._id,
          Origin: "published"
        }
      ],
      IsPublished: true,
      IsLaunched: true,
      Status: true,
      IsDeleted: false,
    };

    console.log('📋 activeLaunched conditions:', JSON.stringify(conditions, null, 2));

    var sortObj = {
      ModifiedOn: -1,
    };

    var fields = {};

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();
    
    console.log(`✅ activeLaunched found ${resultsLength} total capsules, returning ${results.length} results`);

    var response = {
      count: resultsLength,
      status: 200,
      message: "Active launched capsules",
      results: results,
    };
    res.json(response);
  } catch (error) {
    console.log(error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		sharedWithMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var sharedWithMe = async function (req, res) {
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get actual Role field
    const currentUser = await User.findById(myself._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    const userRole = currentUser.Role || 'user';  // Get Role from database

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    console.log('🔍 sharedWithMe - Current user:', { id: currentUser._id, role: userRole });

    // Build conditions based on user role from database
    var conditions;
    
    if (userRole === 'admin') {
      // For ADMIN: Only published capsules shared TO admin
      conditions = {
      CreaterId: { $ne: currentUser._id },
      OwnerId: currentUser._id,
      Origin: "shared",
        IsPublished: true,  // ✅ Only published for admin
      Status: true,
      IsDeleted: false,
    };
    } else {
      // For USER/SUBADMIN: All shared capsules (published and unpublished)
      conditions = {
        CreaterId: { $ne: currentUser._id },
        OwnerId: currentUser._id,
        Origin: "shared",
        Status: true,
        IsDeleted: false,
      };
    }

    var sortObj = {
      ModifiedOn: -1,
    };

    var fields = {};

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();

    var response = {
      count: resultsLength,
      status: 200,
      message: "Capsules listing",
      results: results,
    };
    res.json(response);
  } catch (error) {
    console.log(error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		byTheHouse
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var byTheHouse = async function (req, res) {
  try {
    // Get user from session
    if (!req.session || !req.session.user) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get current Role and permissions
    const currentUser = await User.findById(req.session.user._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    var conditions = {
      Origin: "byTheHouse",
      CreaterId: currentUser._id,
      Status: true,
      IsDeleted: false,
    };
    
    var sortObj = {
      ModifiedOn: -1,
    };

    var fields = {};

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();

    var response = {
      count: resultsLength,
      status: 200,
      message: "Capsules listing",
      results: results,
    };
    res.json(response);
  } catch (error) {
    console.log(error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		14 October 2015
   * @Method :   		allPublished
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var allPublished_backup = function (req, res) {
  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  /*
	var conditions = {
		$or : [
			{Origin:"created",CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{Origin:"duplicated",CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{Origin:"addedFromLibrary",CreaterId : req.session.user._id,IsPublished : true,"LaunchSettings.Audience" : "ME"},
			{Origin:"published",OwnerId : req.session.user._id},
			//{Origin:"shared",OwnerId : req.session.user._id,IsPublised : false} //add invitation case here
		],
		//IsPublished : true, 
		Status : true,
		IsDeleted : false
	};
	*/
  var conditions = {
    $or: [
      {
        CreaterId: req.session.user._id,
        Origin: "created",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
      {
        CreaterId: req.session.user._id,
        Origin: "duplicated",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
      {
        CreaterId: req.session.user._id,
        Origin: "addedFromLibrary",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
      {
        CreaterId: { $ne: req.session.user._id },
        OwnerId: req.session.user._id,
        Origin: "published",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
      //{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id} //Add Invitation Logic here.
    ],
    Status: true,
    IsDeleted: false,
  };

  var sortObj = {
    //Order : 1,
    ModifiedOn: -1,
  };

  var fields = {};

  Capsule.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec(function (err, results) {
      if (!err) {
        Capsule.find(conditions, fields).exec(function (errr, resultsLength) {
          if (!errr) {
            var response = {
              count: resultsLength,
              status: 200,
              message: "Capsules listing",
              results: results,
            };
            res.json(response);
          } else {
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          }
        });
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
};

var allPublished = function (req, res) {
  var finalObj = {
    count: 0,
    results: [],
  };

  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var sortObj = {
    ModifiedOn: -1,
  };

  async.series(
    {
      getAllPublished: function (callback) {
        var returnObj = {
          count: 0,
          results: [],
        };

        var conditions = {
          $or: [
            {
              CreaterId: req.session.user._id,
              Origin: "created",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: req.session.user._id,
              Origin: "duplicated",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: req.session.user._id,
              Origin: "addedFromLibrary",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: { $ne: req.session.user._id },
              OwnerId: req.session.user._id,
              Origin: "published",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
          ],
          Status: true,
          IsDeleted: false,
        };
        var fields = {};

        Capsule.find(conditions, fields)
          .sort(sortObj)
          .skip(offset)
          .limit(limit)
          .exec(function (err, results) {
            if (!err) {
              Capsule.find(conditions, fields)
                .count()
                .exec(function (errr, results2count) {
                  if (!errr) {
                    returnObj.count = results2count;
                    returnObj.results = results;

                    callback(null, returnObj);
                  } else {
                    return callback(errr, returnObj);
                  }
                });
            } else {
              return callback(err, returnObj);
            }
          });
      },
      getAllInvited: function (callback) {
        var returnObj = {
          count: 0,
          results: [],
        };

        var conditions = {
          CapsuleId: { $exists: true },
          //"LaunchSettings.Invitees.UserID" :req.session.user._id,
          "LaunchSettings.Invitees.UserEmail": req.session.user.Email,
          IsLaunched: true,
          Status: true,
          IsDeleted: false,
        };
        var fields = {};

        Chapter.find(conditions, fields, function (err, result) {
          if (!err) {
            var capsules = new Array();

            i = 0;
            for (test in result) {
              capsules[i] = result[test].CapsuleId;
              i++;
            }

            var conditions = {
              _id: { $in: capsules },
              IsPublished: true,
              IsLaunched: true,
              Status: true,
              IsDeleted: false,
            };

            var totalNoOfPages =
              capsules.length > 0 && capsules.length <= limit
                ? 1
                : capsules.length == 0
                ? 0
                : Math.ceil(capsules.length / limit);

            Capsule.find(conditions, fields)
              .sort(sortObj)
              .skip(offset)
              .limit(limit)
              .exec(function (err, results) {
                if (!err) {
                  Capsule.find(conditions, fields)
                    .count()
                    .exec(function (err, results2count) {
                      if (!err) {
                        returnObj.count = results2count;
                        returnObj.results = results;

                        callback(null, returnObj);
                      } else {
                        return callback(err, returnObj);
                      }
                    });
                } else {
                  return callback(err, returnObj);
                }
              });
          } else {
            return callback(err, returnObj);
          }
        });
      },
    },
    function (err, results) {
      //results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
      if (!err) {
        finalObj = {
          count: parseInt(
            results.getAllPublished.count + results.getAllInvited.count
          ),
          results: results.getAllPublished.results.concat(
            results.getAllInvited.results
          ),
        };

        //sort it
        var response = {
          count: finalObj.count,
          status: 200,
          message: "Capsules listing",
          results: finalObj.results,
        };
        res.json(response);
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    }
  );
};
var allDashboardCapsules = function (req, res) {
  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var sortObj = {
    ModifiedOn: -1,
  };

  async.series(
    {
      getAllInvitedCapsules: function (callback) {
        var conditions = {
          CapsuleId: { $exists: true },
          //"LaunchSettings.Invitees.UserID" :req.session.user._id,
          "LaunchSettings.Invitees.UserEmail": req.session.user.Email,
          IsLaunched: true,
          Status: true,
          IsDeleted: false,
        };
        var fields = {
          CapsuleId: true,
        };

        Chapter.find(conditions, fields)
          .exec()
          .then(function (result) {
            var capsules = new Array();

            i = 0;
            for (test in result) {
              if (result[test].CapsuleId) {
                capsules[i] = result[test].CapsuleId;
              }
              i++;
            }
            //console.log(capsules);
            callback(null, capsules);
          })
          .catch(function (err) {
            return callback(err, []);
          });
      },
    },
    function (err, results) {
      //results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
      if (!err) {
        var allInvitedCapsulesIds = results.getAllInvitedCapsules.length
          ? results.getAllInvitedCapsules
          : [];
        var conditions = {
          $or: [
            {
              CreaterId: req.session.user._id,
              Origin: "created",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: req.session.user._id,
              Origin: "duplicated",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: req.session.user._id,
              Origin: "addedFromLibrary",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: { $ne: req.session.user._id },
              OwnerId: req.session.user._id,
              Origin: "published",
              IsPublished: true,
              "LaunchSettings.Audience": "ME",
            },
            {
              CreaterId: req.session.user._id,
              IsPublished: true,
              "LaunchSettings.Audience": "BUYERS",
              IsAllowedForSales: true,
            },
          ],
          Status: true,
          IsDeleted: false,
        };

        if (allInvitedCapsulesIds.length) {
          conditions = {
            $or: [
              {
                CreaterId: req.session.user._id,
                Origin: "created",
                IsPublished: true,
                "LaunchSettings.Audience": "ME",
              },
              {
                CreaterId: req.session.user._id,
                Origin: "duplicated",
                IsPublished: true,
                "LaunchSettings.Audience": "ME",
              },
              {
                CreaterId: req.session.user._id,
                Origin: "addedFromLibrary",
                IsPublished: true,
                "LaunchSettings.Audience": "ME",
              },
              {
                CreaterId: { $ne: req.session.user._id },
                OwnerId: req.session.user._id,
                Origin: "published",
                IsPublished: true,
                "LaunchSettings.Audience": "ME",
              },
              {
                CreaterId: req.session.user._id,
                IsPublished: true,
                "LaunchSettings.Audience": "BUYERS",
                IsAllowedForSales: true,
              },
              { _id: { $in: allInvitedCapsulesIds }, IsPublished: true },
            ],
            Status: true,
            IsDeleted: false,
          };
        }
        var fields = {};

        Capsule.find(conditions, fields)
          .sort(sortObj)
          .skip(offset)
          .limit(limit)
          .exec()
          .then(function (results) {
            Capsule.find(conditions, fields)
              .countDocuments()
              .exec()
              .then(function (results2count) {
                var response = {
                  count: results2count,
                  status: 200,
                  message: "Capsules listing",
                  results: results,
                };
                res.json(response);
              })
              .catch(function (err) {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              });
          })
          .catch(function (err) {
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          });
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    }
  );
};
/*________________________________________________________________________
   * @Date:      		14 October 2015
   * @Method :   		publishedByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var publishedByMe = async function (req, res) {
  try {
    // Get user from session
    if (!req.session || !req.session.user) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get current Role and permissions
    const currentUser = await User.findById(req.session.user._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    console.log('🔍 publishedByMe - Current user ID:', currentUser._id);
    console.log('🔍 publishedByMe - User Role:', currentUser.Role);
    
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    // For ADMIN: Check CreaterId (who created the stream)
    // For REGULAR USER: Check OwnerId (who owns the stream)
    const isAdmin = currentUser.Role === 'admin';
    const userIdField = isAdmin ? 'CreaterId' : 'OwnerId';
    
    var conditions = {
      $or: [
        {
          [userIdField]: currentUser._id,
          Origin: "created"
        },
        {
          [userIdField]: currentUser._id,
          Origin: "duplicated"
        },
        {
          [userIdField]: currentUser._id,
          Origin: "addedFromLibrary"
        }
      ],
      Status: true,
      IsDeleted: false,
      IsPublished: true  // Only get published capsules
    };

    console.log('📋 publishedByMe conditions (Role: ' + currentUser.Role + '):', JSON.stringify(conditions, null, 2));

    var sortObj = {
      ModifiedOn: -1,
    };

    var fields = {};

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();

    var response = {
      count: resultsLength,
      status: 200,
      message: "Capsules listing",
      results: results,
    };
    res.json(response);
  } catch (error) {
    console.log(error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		publishedForMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var publishedForMe = async function (req, res) {
  try {
    // Get user from session
    if (!req.session || !req.session.user) {
      var response = {
        status: 401,
        message: "User session not found",
        results: null,
      };
      return res.json(response);
    }

    // Fetch user from database to get current Role and permissions
    const currentUser = await User.findById(req.session.user._id)
      .select('_id Name Email Role Permissions')
      .lean()
      .exec();

    if (!currentUser) {
      var response = {
        status: 401,
        message: "User not found in database",
        results: null,
      };
      return res.json(response);
    }

    const myself = currentUser;

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    console.log('🛒 publishedForMe - Current user ID:', myself._id);

    // Match scrpt reference - returns purchased/received capsules (instances created for this user)
    var conditions = {
      $or: [
        {
          UniqueIdPerOwner: { $exists: true },
          OwnerId: myself._id,
          Origin: "published",
          IsPublished: true,
          "LaunchSettings.Audience": "ME"
        }
      ],
      Status: true,
      IsDeleted: false,
    };

    console.log('📋 publishedForMe conditions:', JSON.stringify(conditions, null, 2));

    var sortObj = {
      //Order : 1,
      ModifiedOn: -1,
    };

    var fields = {};

    // Use modern async/await syntax instead of callback
    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();
    const resultsLength = await Capsule.countDocuments(conditions).exec();

    // Populate CreaterId with name and profile picture from User collection
    // All users (regular, subadmin, admin) are in the User collection with Role field
    const populatedResults = await Promise.all(
      results.map(async (capsule) => {
        // Convert Mongoose document to plain object to prevent serialization issues
        const capsuleObj = capsule.toObject();
        
        if (capsuleObj.CreaterId) {
          try {
            // Fetch creator from User collection (includes users, subadmins, and admins)
            const creator = await User.findById(capsuleObj.CreaterId)
              .select("Name ProfilePic Role")
              .exec();
            
            if (creator) {
              capsuleObj.CreaterId = {
                _id: creator._id.toString(),
                Name: creator.Name,
                ProfilePic: creator.ProfilePic || "/assets/users/default.png",
                Role: creator.Role
              };
            } else {
              // If not found, set default values
              capsuleObj.CreaterId = {
                _id: capsuleObj.CreaterId.toString(),
                Name: "Unknown User",
                ProfilePic: "/assets/users/default.png",
                Role: "user"
              };
            }
          } catch (error) {
            console.error(
              "❌ Error populating CreaterId for capsule:",
              capsuleObj._id,
              error
            );
            // If error occurs, set default values
            capsuleObj.CreaterId = {
              _id: capsuleObj.CreaterId.toString(),
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
              Role: "user"
            };
          }
        }
        return capsuleObj;
      })
    );

    // 🎯 OPTIMIZED: Skip group tags population for better performance
    const enhancedResults = populatedResults;


    var response = {
      count: resultsLength,
      status: 200,
      message: "Published capsules listing with Group Tags",
      results: enhancedResults,
    };

    res.json(response);
  } catch (error) {
    console.error("Error in publishedForMe:", error);
    var response = {
      status: 501,
      message: "Error retrieving published capsules!",
      results: null,
    };
    return res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		invitationForMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var invitationForMe = function (req, res) {
  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var conditions = {
    CapsuleId: { $exists: true },
    //"LaunchSettings.Invitees.UserID" :req.session.user._id,
    "LaunchSettings.Invitees.UserEmail": req.session.user.Email,
    IsLaunched: true,
    Status: true,
    IsDeleted: false,
  };

  var fields = {
    CapsuleId: true,
  };
  var sortObj = {
    //Order : 1,
    ModifiedOn: -1,
  };

  var fields = {};

  Chapter.find(conditions, fields, function (err, result) {
    if (!err) {
      var capsules = new Array();

      i = 0;
      for (test in result) {
        if (result[test].CapsuleId) {
          capsules[i] = result[test].CapsuleId;
        }
        i++;
      }

      var conditions = {
        _id: { $in: capsules },
        IsPublished: true,
        IsLaunched: true,
        Status: true,
        IsDeleted: false,
      };

      var fields = {
        //Title : true
      };
      var sortObj = {
        //Order : 1,
        ModifiedOn: -1,
      };

      //Capsule.find(conditions,fields).exec(function(err,results){
      Capsule.find(conditions, fields)
        .sort(sortObj)
        .skip(offset)
        .limit(limit)
        .exec(function (err, results) {
          if (!err) {
            var response = {
              count: capsules.length,
              status: 200,
              message: "Capsules listing",
              results: results,
            };
            res.json(response);
          } else {
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          }
        });
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

/*________________________________________________________________________
   * @Date:      		10 July 2017
   * @Method :   		ForSalesByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var ForSalesByMe = async function (req, res) {
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message: "User session not found. Please login.",
        results: null,
      };
      return res.json(response);
    }

  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var conditions = {
      CreaterId: myself._id,
    "LaunchSettings.Audience": "BUYERS",
    IsPublished: true,
    IsAllowedForSales: true,
    Status: true,
    IsDeleted: false,
  };

  var sortObj = {
    ModifiedOn: -1,
  };

  var fields = {};

    // Use async/await instead of callbacks (Mongoose v8+ requirement)
    const results = await Capsule.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
      .exec();

    const resultsLength = await Capsule.countDocuments(conditions).exec();

              var response = {
                count: resultsLength,
                status: 200,
                message: "Capsules listing",
                results: results,
              };
              res.json(response);
  } catch (error) {
    console.error("Error in ForSalesByMe:", error);
              var response = {
                status: 501,
                message: "Something went wrong.",
      error: error.message,
              };
              res.json(response);
            }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		create
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

const create = async function (req, res) {
  try {
    var data = {};
    //set required field of the CapsuleModel
    data = {
      CreaterId: req.session.user._id,
      OwnerId: req.session.user._id,
    };
    
    // Accept optional fields from request body
    if (req.body.Title) data.Title = req.body.Title;
    if (req.body.Price !== undefined) data.Price = req.body.Price;
    if (req.body.DiscountPrice !== undefined) data.DiscountPrice = req.body.DiscountPrice;
    if (req.body.IsAllowedForSales !== undefined) data.IsAllowedForSales = req.body.IsAllowedForSales;
    
    console.log("data = ", data);
    
    const result = await Capsule(data).save();
    
    var response = {
      status: 200,
      message: "Capsule created successfully.",
      result: result,
    };
    res.json(response);
  } catch (error) {
    console.log(error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		duplicate
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var duplicate = async function (req, res) {
  try {
    //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers.",
      });
    }

    const capsuleId = req.headers.capsule_id;
    const userId = req.session.user._id;
    const nowDate = Date.now();

    // Step 1: Find and duplicate the original capsule
    const originalCapsule = await Capsule.findById(capsuleId).select('Title CoverArt');
    
    if (!originalCapsule) {
      return res.json({
        status: 404,
        message: "Capsule not found.",
      });
    }

    const capsuleData = {
      Origin: "duplicated",
      OriginatedFrom: capsuleId,
      CreaterId: userId,
      OwnerId: userId,
      Title: originalCapsule.Title,
      CoverArt: originalCapsule.CoverArt,
      CreatedOn: nowDate,
      ModifiedOn: nowDate,
    };

    const newCapsule = await Capsule(capsuleData).save();
    const newCapsuleId = newCapsule._id;

    // Step 2: Find and duplicate all chapters
    const chapters = await Chapter.find({
      CapsuleId: capsuleId,
      OwnerId: userId,
      IsDeleted: false,
    })
    .select('Title CoverArt Order CoverArtFirstPage ChapterPlaylist')
    .sort({ Order: 1, ModifiedOn: -1 });

    // Array to track new chapter IDs for the capsule
    const newChapterIds = [];

    // Step 3: Duplicate each chapter and its pages
    for (const chapter of chapters) {
      const chapterData = {
        Origin: "duplicated",
        OriginatedFrom: chapter._id,
        CreaterId: userId,
        OwnerId: userId,
        Title: chapter.Title,
        CoverArt: chapter.CoverArt,
        CapsuleId: newCapsuleId,
        Order: chapter.Order,
        CoverArtFirstPage: chapter.CoverArtFirstPage || "",
        ChapterPlaylist: chapter.ChapterPlaylist || [],
        CreatedOn: nowDate,
        ModifiedOn: nowDate,
      };

      const newChapter = await Chapter(chapterData).save();
      const newChapterId = newChapter._id;
      
      // Add new chapter ID to the capsule's Chapters array
      newChapterIds.push(newChapterId);

      // Step 4: Find all pages for this chapter
      const pages = await Page.find({
        ChapterId: chapter._id,
        OwnerId: userId,
        IsDeleted: false,
      }).sort({ Order: 1, UpdatedOn: -1 });

      // Step 5: First pass - identify all pages and Q&A references
      const pageIdMap = {}; // Map: oldPageId -> newPageId
      const pagesWithQA = []; // Pages that have Q&A components
      
      // Collect all Q&A references
      pages.forEach(page => {
        let hasQA = false;
        
        // Check new Content format
        if (page.Content && page.Content.length > 0) {
          page.Content.forEach(component => {
            if (component.type === 'qa' && component.data?.qaPageId) {
              hasQA = true;
            }
          });
        }
        
        // Check old Viewport format
        if (page.ViewportDesktopSections?.Widgets) {
          page.ViewportDesktopSections.Widgets.forEach(widget => {
            if (widget.Type === 'questAnswer' && widget.QAWidObj?.PageId) {
              hasQA = true;
            }
          });
        }
        
        if (hasQA) {
          pagesWithQA.push(page._id.toString());
        }
      });

      // Step 6: Duplicate all pages (first pass - create pages)
      for (const page of pages) {
        const newPage = await PageLayoutUtils.duplicatePageWithComponents(
          Page, 
          page._id, 
          newChapterId, 
          userId, 
          {}  // Empty map for first pass
        );
        pageIdMap[page._id.toString()] = newPage._id.toString();
      }

      // Step 7: Update Q&A references in duplicated pages (second pass)
      if (pagesWithQA.length > 0) {
        for (const pageId of pagesWithQA) {
          const newPageId = pageIdMap[pageId];
          if (!newPageId) continue;
          
          const newPage = await Page.findById(newPageId);
          if (!newPage) continue;
          
          let updated = false;
          
          // Update new Content format
          if (newPage.Content && newPage.Content.length > 0) {
            newPage.Content.forEach(component => {
              if (component.type === 'qa' && component.data?.qaPageId) {
                const oldQAPageId = component.data.qaPageId.toString();
                const newQAPageId = pageIdMap[oldQAPageId];
                if (newQAPageId) {
                  component.data.qaPageId = newQAPageId;
                  updated = true;
                }
              }
            });
          }
          
          if (updated) {
            await newPage.save();
          }
        }
      }
    }

    // Step 8: Update capsule's Chapters array with all new chapter IDs
    if (newChapterIds.length > 0) {
      await Capsule.updateOne(
        { _id: newCapsuleId },
        { $set: { Chapters: newChapterIds } }
      );
    }

    // Step 9: Fetch the updated capsule to return
    const updatedCapsule = await Capsule.findById(newCapsuleId);

    // Step 10: Return success response
    res.json({
      status: 200,
      message: "Capsule duplicated successfully.",
      result: updatedCapsule,
    });

  } catch (err) {
    console.log("Duplicate error:", err);
    res.json({
      status: 501,
      message: "Something went wrong.",
      error: err.message
    });
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		deleteCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var remove = function (req, res) {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {};
  //console.log("req.headers = " , req.headers)

  conditions._id = req.headers.capsule_id;
  data.IsDeleted = 1;
  data.ModifiedOn = Date.now();
  //if this is called from member's dashboard then just unfollow him from the all chapters of the capsule
  //case pending ...
  //end

  //Capsule.update(query , $set:data , function( err , result ){
  Capsule.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
    var response = {
      status: 200,
        message: "Capsule removed successfully.",
      result: result,
    };
    res.json(response);
    } else {
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
  });
};

/**
 * Cascade delete capsule and all related data
 * Deletes: Capsule, Chapters, Pages, SyncedPosts, SyncedpostsMap
 * Preserves: Media, PageStream (shared resources)
 * @Route: POST /capsules/cascadeDelete
 * @Body: { capsule_id: string } OR { capsuleId: string }
 * @Headers: capsule_id (optional)
 * @Access: Admin, SubAdmin, or Owner
 */
const cascadeDeleteCapsule = async (req, res) => {
  try {
    const capsuleId = req.headers.capsule_id || req.body.capsuleId || req.body.capsule_id;
    const userId = req.session?.user?._id;

    if (!capsuleId) {
      return res.json({
        status: 400,
        message: "Capsule ID is required"
      });
    }

    console.log(`🗑️ Starting cascade delete for capsule: ${capsuleId}`);
    const startTime = Date.now();

    // Step 1: Verify capsule exists
    const capsule = await Capsule.findOne({ 
      _id: new mongoose.Types.ObjectId(capsuleId) 
    });

    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found"
      });
    }

    // Step 2: Check permissions (Admin, SubAdmin, or Owner can delete)
    console.log('🔐 Checking permissions...');
    console.log('   Session User:', req.session?.user?._id);
    console.log('   Role:', req.session?.user?.Role);
    console.log('   IsAdmin:', req.session?.user?.IsAdmin);
    console.log('   IsSubAdmin:', req.session?.user?.IsSubAdmin);
    console.log('   Capsule OwnerId:', capsule.OwnerId);
    
    // Check for admin/subadmin - support both Role field and IsAdmin/IsSubAdmin boolean fields
    const isAdmin = req.session?.user?.IsAdmin === true || 
                    req.session?.user?.Role === 'admin' || 
                    req.session?.user?.Role === 'Admin';
    const isSubAdmin = req.session?.user?.IsSubAdmin === true || 
                       req.session?.user?.Role === 'subadmin' || 
                       req.session?.user?.Role === 'SubAdmin';
    const isOwner = userId && capsule.OwnerId && capsule.OwnerId.toString() === userId.toString();

    console.log('   Permission Check: Admin=' + isAdmin + ', SubAdmin=' + isSubAdmin + ', Owner=' + isOwner);

    if (!isAdmin && !isSubAdmin && !isOwner) {
      return res.json({
        status: 403,
        message: "You don't have permission to delete this capsule"
      });
    }

    console.log(`👤 Deletion authorized by: ${isAdmin ? 'Admin' : isSubAdmin ? 'SubAdmin' : 'Owner'}`);

    const deletionStats = {
      capsules: 0,
      chapters: 0,
      pages: 0,
      media: 0,
      pageStreams: 0,
      syncedPosts: 0
    };

    // Step 2: Find all chapters
    const chapters = await Chapter.find({ 
      CapsuleId: new mongoose.Types.ObjectId(capsuleId) 
    }).lean();
    
    const chapterIds = chapters.map(ch => ch._id);
    console.log(`📋 Found ${chapterIds.length} chapters to delete`);

    // Step 3: Find all pages (pages are linked to ChapterId, not CapsuleId)
    const pages = await Page.find({ 
      ChapterId: { $in: chapterIds.map(id => id.toString()) }
    }).lean();
    
    const pageIds = pages.map(p => p._id);
    console.log(`📄 Found ${pageIds.length} pages to delete`);

    // Step 4: Collect all media IDs from pages
    let allMediaIds = [];
    pages.forEach(page => {
      if (page.Medias && Array.isArray(page.Medias)) {
        allMediaIds = allMediaIds.concat(page.Medias);
      }
    });
    
    // Remove duplicates
    allMediaIds = [...new Set(allMediaIds.map(id => id.toString()))];
    console.log(`🖼️ Found ${allMediaIds.length} unique media IDs to delete`);

    // Step 5: Delete in order (from bottom up)
    // Note: This only deletes the CREATOR'S capsule instance
    // Buyers' capsule instances (with different CapsuleIds) are not affected
    
    // 5a. Delete SyncedPosts (only for THIS capsule instance)
    const syncedPostsQuery = {
      $or: [
        { CapsuleId: new mongoose.Types.ObjectId(capsuleId) }
      ]
    };
    
    // Add PageId conditions if pages exist
    if (pageIds.length > 0) {
      syncedPostsQuery.$or.push({ PageId: { $in: pageIds.map(id => new mongoose.Types.ObjectId(id)) } });
    }
    
    const syncedPostsResult = await SyncedPost.deleteMany(syncedPostsQuery);
    deletionStats.syncedPosts = syncedPostsResult.deletedCount || 0;
    console.log(`✅ Deleted ${deletionStats.syncedPosts} SyncedPosts for this capsule instance`);

    // 5a2. Delete SyncedpostsMap (container for synced posts array)
    const syncedPostsMapResult = await SyncedpostsMap.deleteMany({
      CapsuleId: new mongoose.Types.ObjectId(capsuleId)
    });
    deletionStats.syncedPostsMap = syncedPostsMapResult.deletedCount || 0;
    console.log(`✅ Deleted ${deletionStats.syncedPostsMap} SyncedpostsMap documents`);

    // 5b. PageStream - DO NOT DELETE (Shared Resource)
    // PageStream stores blend configurations that are READ by all buyers
    // It's not duplicated per buyer - all buyers reference the same PageStream
    // Deleting it would break blend images for ALL users who purchased this stream
    deletionStats.pageStreams = 0;
    console.log(`⏭️ Skipped PageStream deletion - blend configs remain (shared resource)`);

    // 5c. Media - DO NOT DELETE (Shared Resource)
    // Media is shared across all buyers of the stream
    // Deleting media would break the stream for ALL users who purchased it
    // Media should remain in the database even after capsule deletion
    deletionStats.media = 0;
    console.log(`⏭️ Skipped Media deletion - ${allMediaIds.length} media posts remain (shared resource)`);
    console.log(`ℹ️ Media posts are referenced by ${pages.length} pages and may be used by multiple buyers`);

    // 5d. Delete Pages
    if (pageIds.length > 0) {
      const pagesResult = await Page.deleteMany({
        _id: { $in: pageIds.map(id => new mongoose.Types.ObjectId(id)) }
      });
      deletionStats.pages = pagesResult.deletedCount || 0;
      console.log(`✅ Deleted ${deletionStats.pages} Pages`);
    }

    // 5e. Delete Chapters
    if (chapterIds.length > 0) {
      const chaptersResult = await Chapter.deleteMany({
        _id: { $in: chapterIds.map(id => new mongoose.Types.ObjectId(id)) }
      });
      deletionStats.chapters = chaptersResult.deletedCount || 0;
      console.log(`✅ Deleted ${deletionStats.chapters} Chapters`);
    }

    // 5f. Delete Capsule (hard delete)
    const capsuleResult = await Capsule.deleteOne({
      _id: new mongoose.Types.ObjectId(capsuleId)
    });
    deletionStats.capsules = capsuleResult.deletedCount || 0;
    console.log(`✅ Deleted ${deletionStats.capsules} Capsule`);

    const duration = Date.now() - startTime;
    console.log(`🎉 Cascade delete completed in ${duration}ms`);

    return res.json({
      status: 200,
      message: "Capsule and all related data deleted successfully",
      deletionStats,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('❌ Error in cascadeDeleteCapsule:', error);
    return res.json({
      status: 500,
      message: "Error deleting capsule",
      error: error.message
    });
  }
};

//Capsule library Apis

/*________________________________________________________________________
   * @Date:      		31 Aug 2015
   * @Method :   		addFromLibrary
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var addFromLibrary = async function (req, res) {
  try {
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers.",
      });
    }

    const capsuleId = req.headers.capsule_id;
    const userId = req.session.user._id;
    const nowDate = Date.now();

    // Step 1: Find the library capsule
    const originalCapsule = await Capsule.findById(capsuleId).select('Title CoverArt');
    
    if (!originalCapsule) {
      return res.json({
        status: 404,
        message: "Capsule not found in library.",
      });
    }

    const capsuleData = {
      Origin: "addedFromLibrary",
      OriginatedFrom: capsuleId,
      CreaterId: userId,
      OwnerId: userId,
      Title: originalCapsule.Title,
      CoverArt: originalCapsule.CoverArt,
      CreatedOn: nowDate,
      ModifiedOn: nowDate,
    };

    const newCapsule = await Capsule(capsuleData).save();
    const newCapsuleId = newCapsule._id;

    // Step 2: Find and copy all chapters
    const chapters = await Chapter.find({
      CapsuleId: capsuleId,
      IsDeleted: false,
    })
    .select('Title CoverArt Order CoverArtFirstPage ChapterPlaylist')
    .sort({ Order: 1, ModifiedOn: -1 });

    const newChapterIds = [];

    // Step 3: Copy each chapter and its pages
    for (const chapter of chapters) {
      const chapterData = {
        Origin: "addedFromLibrary",
        OriginatedFrom: chapter._id,
        CreaterId: userId,
        OwnerId: userId,
        Title: chapter.Title,
        CoverArt: chapter.CoverArt,
        CapsuleId: newCapsuleId,
        Order: chapter.Order,
        CoverArtFirstPage: chapter.CoverArtFirstPage || "",
        ChapterPlaylist: chapter.ChapterPlaylist || [],
        CreatedOn: nowDate,
        ModifiedOn: nowDate,
      };

      const newChapter = await Chapter(chapterData).save();
      const newChapterId = newChapter._id;
      newChapterIds.push(newChapterId);

      // Step 4: Find and copy all pages for this chapter
      const pages = await Page.find({
        ChapterId: chapter._id,
        IsDeleted: false,
      }).sort({ Order: 1, UpdatedOn: -1 });

      const pageIdMap = {};
      const pagesWithQA = [];
      
      // Collect Q&A references
      pages.forEach(page => {
        let hasQA = false;
        if (page.Content && page.Content.length > 0) {
          page.Content.forEach(component => {
            if (component.type === 'qa' && component.data?.qaPageId) {
              hasQA = true;
            }
          });
        }
        if (hasQA) {
          pagesWithQA.push(page._id.toString());
        }
      });

      // Step 5: Copy all pages
      for (const page of pages) {
        const newPage = await PageLayoutUtils.duplicatePageWithComponents(
          Page, 
          page._id, 
          newChapterId, 
          userId, 
          {}
        );
        pageIdMap[page._id.toString()] = newPage._id.toString();
      }

      // Step 6: Update Q&A references
      if (pagesWithQA.length > 0) {
        for (const pageId of pagesWithQA) {
          const newPageId = pageIdMap[pageId];
          if (!newPageId) continue;
          
          const newPage = await Page.findById(newPageId);
          if (!newPage || !newPage.Content) continue;
          
          let updated = false;
          newPage.Content.forEach(component => {
            if (component.type === 'qa' && component.data?.qaPageId) {
              const oldQAPageId = component.data.qaPageId.toString();
              const newQAPageId = pageIdMap[oldQAPageId];
              if (newQAPageId) {
                component.data.qaPageId = newQAPageId;
                updated = true;
              }
            }
          });
          
          if (updated) {
            await newPage.save();
          }
        }
      }
    }

    // Step 7: Update capsule's Chapters array
    if (newChapterIds.length > 0) {
      await Capsule.updateOne(
        { _id: newCapsuleId },
        { $set: { Chapters: newChapterIds } }
      );
    }

    // Step 8: Fetch updated capsule
    const updatedCapsule = await Capsule.findById(newCapsuleId);

    res.json({
      status: 200,
      message: "Capsule added from library successfully.",
      result: updatedCapsule,
    });

  } catch (err) {
    console.log("AddFromLibrary error:", err);
    res.json({
      status: 501,
      message: "Something went wrong.",
      error: err.message
    });
  }
};

/*________________________________________________________________________
   * @Date:      		15 September 2015
   * @Method :   		preview
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var preview = async function (req, res) {
  try {
    var query = {};
    var fields = {};
    query._id = req.header.capsule_id;

    const result = await Capsule.findOne(query, fields).exec();
    
    var response = {
      status: 200,
      message: "Capsule preview",
      result: result
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    var response = {
      status: 501,
      message: "Something went wrong."
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		shareCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var share = async function (req, res) {
  try {
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers."
      });
    }

    var init_conditions = {};
    var fields = {
      Title: 1,
      CoverArt: 1,
    };

    init_conditions._id = req.headers.capsule_id;

    const capsule = await Capsule.findOne(init_conditions, fields).exec();
    
    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found."
      });
    }

    var shareWithEmail = req.body.share_with_email ? req.body.share_with_email : false;
    var shareWithName = req.body.share_with_name ? req.body.share_with_name : "";

    if (!shareWithEmail) {
      return res.json({
        status: 400,
        message: "Email is required to share capsule."
      });
    }

    // Find user by email
    var conditions = { Email: shareWithEmail };
    const UserData = await User.find(conditions).exec();

    if (UserData.length) {
      // User exists - create shared instance
      var data = {};
      data.Origin = "shared";
      data.OriginatedFrom = init_conditions._id;
      data.CreaterId = req.session.user._id;
      data.OwnerId = UserData[0]._id;
      data.OwnerEmail = shareWithEmail;
      data.Title = capsule.Title;
      data.CoverArt = capsule.CoverArt;

      var nowDate = Date.now();
      data.CreatedOn = nowDate;
      data.ModifiedOn = nowDate;

      const newCapsule = await Capsule(data).save();

      var response = {
        status: 200,
        message: "Capsule shared successfully.",
        result: newCapsule,
      };
      res.json(response);
    } else {
      // User not found
      var response = {
        status: 404,
        message: "User with this email not found."
      };
      res.json(response);
    }
  } catch (err) {
    console.log("Share error:", err);
    var response = {
      status: 501,
      message: "Something went wrong.",
      error: err.message
    };
    res.json(response);
  }
};
/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		uploadCover
                                    data.PageType = result.PageType;
                                    data.Order = result.Order;
                                    data.HeaderImage = result.HeaderImage
                                      ? result.HeaderImage
                                      : "";
                                    data.BackgroundMusic =
                                      result.BackgroundMusic
                                        ? result.BackgroundMusic
                                        : "";
                                    data.SelectedMedia = result.SelectedMedia
                                      ? result.SelectedMedia
                                      : [];
                                    data.SelectedCriteria =
                                      result.SelectedCriteria;
                                    data.HeaderBlurValue =
                                      result.HeaderBlurValue
                                        ? result.HeaderBlurValue
                                        : 0;
                                    data.HeaderTransparencyValue =
                                      result.HeaderTransparencyValue
                                        ? result.HeaderTransparencyValue
                                        : 0;

                                    data.CreatedOn = nowDate;
                                    data.UpdatedOn = nowDate;

                                    var Desktop__allHiddenBoardId_Arr = [];
                                    var Tablet__allHiddenBoardId_Arr = [];
                                    var Mobile__allHiddenBoardId_Arr = [];

                                    var allHiddenBoardId_Arr = [];

                                    var Desktop__allHiddenBoardId__index_Arr =
                                      [];
                                    var Tablet__allHiddenBoardId__index_Arr =
                                      [];
                                    var Mobile__allHiddenBoardId__index_Arr =
                                      [];

                                    var margedArrOfAllQAPageIds = [];
                                    var UNIQUE__margedArrOfAllQAPageIds = [];

                                    var sourcePageId__DestinationPageId__Arr =
                                      [];

                                    if (data.PageType == "content") {
                                      data.CommonParams = result.CommonParams
                                        ? result.CommonParams
                                        : {};
                                      data.ViewportDesktopSections =
                                        result.ViewportDesktopSections
                                          ? result.ViewportDesktopSections
                                          : {};
                                      data.ViewportTabletSections =
                                        result.ViewportTabletSections
                                          ? result.ViewportTabletSections
                                          : {};
                                      data.ViewportMobileSections =
                                        result.ViewportMobileSections
                                          ? result.ViewportMobileSections
                                          : {};

                                      //AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
                                      //desktop viewport filter
                                      data.ViewportDesktopSections.Widgets =
                                        data.ViewportDesktopSections.Widgets
                                          ? data.ViewportDesktopSections.Widgets
                                          : [];

                                      for (
                                        var loop = 0;
                                        loop <
                                        data.ViewportDesktopSections.Widgets
                                          .length;
                                        loop++
                                      ) {
                                        var widObj =
                                          data.ViewportDesktopSections.Widgets[
                                            loop
                                          ];
                                        widObj.Type = widObj.Type
                                          ? widObj.Type
                                          : "";
                                        if (widObj.Type == "questAnswer") {
                                          // If Widget is a QA Widget then ...
                                          widObj.QAWidObj = widObj.QAWidObj
                                            ? widObj.QAWidObj
                                            : {};
                                          var HiddenBoardId = widObj.QAWidObj
                                            .PageId
                                            ? widObj.QAWidObj.PageId
                                            : "SOMETHING__WRONG";
                                          if (
                                            HiddenBoardId != "SOMETHING__WRONG"
                                          ) {
                                            Desktop__allHiddenBoardId_Arr.push(
                                              HiddenBoardId
                                            );
                                            Desktop__allHiddenBoardId__index_Arr.push(
                                              HiddenBoardId +
                                                "__" +
                                                loop +
                                                "__" +
                                                "DESKTOP"
                                            );
                                          }
                                        }
                                      }

                                      //tablet viewport filter
                                      data.ViewportTabletSections.Widgets = data
                                        .ViewportTabletSections.Widgets
                                        ? data.ViewportTabletSections.Widgets
                                        : [];

                                      for (
                                        var loop = 0;
                                        loop <
                                        data.ViewportTabletSections.Widgets
                                          .length;
                                        loop++
                                      ) {
                                        var widObj =
                                          data.ViewportTabletSections.Widgets[
                                            loop
                                          ];
                                        if (widObj.Type == "questAnswer") {
                                          // If Widget is a QA Widget then ...
                                          widObj.QAWidObj = widObj.QAWidObj
                                            ? widObj.QAWidObj
                                            : {};
                                          var HiddenBoardId = widObj.QAWidObj
                                            .PageId
                                            ? widObj.QAWidObj.PageId
                                            : "SOMETHING_WRONG";
                                          if (
                                            HiddenBoardId != "SOMETHING__WRONG"
                                          ) {
                                            Tablet__allHiddenBoardId_Arr.push(
                                              HiddenBoardId
                                            );
                                            Tablet__allHiddenBoardId__index_Arr.push(
                                              HiddenBoardId +
                                                "__" +
                                                loop +
                                                "__" +
                                                "TABLET"
                                            );
                                          }
                                        }
                                      }

                                      //mobile viewport filter
                                      data.ViewportMobileSections.Widgets = data
                                        .ViewportMobileSections.Widgets
                                        ? data.ViewportMobileSections.Widgets
                                        : [];

                                      for (
                                        var loop = 0;
                                        loop <
                                        data.ViewportMobileSections.Widgets
                                          .length;
                                        loop++
                                      ) {
                                        var widObj =
                                          data.ViewportMobileSections.Widgets[
                                            loop
                                          ];
                                        if (widObj.Type == "questAnswer") {
                                          // If Widget is a QA Widget then ...
                                          widObj.QAWidObj = widObj.QAWidObj
                                            ? widObj.QAWidObj
                                            : {};
                                          var HiddenBoardId = widObj.QAWidObj
                                            .PageId
                                            ? widObj.QAWidObj.PageId
                                            : "SOMETHING__WRONG";
                                          if (
                                            HiddenBoardId != "SOMETHING__WRONG"
                                          ) {
                                            Mobile__allHiddenBoardId_Arr.push(
                                              HiddenBoardId
                                            );
                                            Mobile__allHiddenBoardId__index_Arr.push(
                                              HiddenBoardId +
                                                "__" +
                                                loop +
                                                "__" +
                                                "MOBILE"
                                            );
                                          }
                                        }
                                      }

                                      margedArrOfAllQAPageIds =
                                        Desktop__allHiddenBoardId__index_Arr.concat(
                                          Tablet__allHiddenBoardId__index_Arr
                                        );
                                      margedArrOfAllQAPageIds =
                                        margedArrOfAllQAPageIds.concat(
                                          Mobile__allHiddenBoardId__index_Arr
                                        );

                                      //UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

                                      allHiddenBoardId_Arr =
                                        Desktop__allHiddenBoardId_Arr.concat(
                                          Tablet__allHiddenBoardId_Arr
                                        );
                                      allHiddenBoardId_Arr =
                                        allHiddenBoardId_Arr.concat(
                                          Mobile__allHiddenBoardId_Arr
                                        );

                                      UNIQUE__allHiddenBoardId_Arr =
                                        allHiddenBoardId_Arr.unique();

                                      //just for testing...
                                      var finalObj = {
                                        Desktop__allHiddenBoardId__index_Arr:
                                          Desktop__allHiddenBoardId__index_Arr,
                                        Tablet__allHiddenBoardId__index_Arr:
                                          Tablet__allHiddenBoardId__index_Arr,
                                        Mobile__allHiddenBoardId__index_Arr:
                                          Mobile__allHiddenBoardId__index_Arr,
                                        margedArrOfAllQAPageIds:
                                          margedArrOfAllQAPageIds,
                                        UNIQUE__allHiddenBoardId_Arr:
                                          UNIQUE__allHiddenBoardId_Arr,
                                      };

                                      //now create new instances of the unique hidden boards and update the PageId on corresponding entries...
                                      async.series(
                                        {
                                          createNewInstance__HiddenBoard:
                                            function (callback) {
                                              if (
                                                finalObj
                                                  .UNIQUE__allHiddenBoardId_Arr
                                                  .length
                                              ) {
                                                var conditions = {
                                                  _id: {
                                                    $in: finalObj.UNIQUE__allHiddenBoardId_Arr,
                                                  },
                                                };
                                                var fields = {
                                                  Medias: false,
                                                };
                                                Page.find(conditions, fields)
                                                  .lean()
                                                  .exec(function (
                                                    err,
                                                    results
                                                  ) {
                                                    if (!err) {
                                                      var results = results
                                                        ? results
                                                        : [];
                                                      var returnCounter = 0;
                                                      var totalOps =
                                                        results.length
                                                          ? results.length
                                                          : 0;
                                                      if (totalOps) {
                                                        var oldPageId = null;
                                                        for (
                                                          var loop = 0;
                                                          loop < totalOps;
                                                          loop++
                                                        ) {
                                                          oldPageId =
                                                            results[loop]._id;
                                                          var newInstanceData =
                                                            results[loop];
                                                          newInstanceData.OriginatedFrom =
                                                            oldPageId;
                                                          newInstanceData.Origin =
                                                            "duplicated";

                                                          //console.log("WTF-----------------------",oldPageId);
                                                          delete newInstanceData._id;
                                                          //console.log("WTF-----------------------",oldPageId);

                                                          newInstanceData.CreatedOn =
                                                            Date.now();
                                                          newInstanceData.UpdatedOn =
                                                            Date.now();
                                                          //console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
                                                          CreateNewInstance__HiddenBoardFunc(
                                                            oldPageId,
                                                            newInstanceData,
                                                            totalOps
                                                          );
                                                        }

                                                        function CreateNewInstance__HiddenBoardFunc(
                                                          sourcePageId,
                                                          dataToSave,
                                                          totalOps
                                                        ) {
                                                          var sourcePageId =
                                                            sourcePageId
                                                              ? sourcePageId
                                                              : "SOMETHING_WRONG";
                                                          //sourcePageId__DestinationPageId
                                                          Page(dataToSave).save(
                                                            function (
                                                              err,
                                                              result
                                                            ) {
                                                              returnCounter++;
                                                              if (!err) {
                                                                var sourcePageId__DestinationPageId =
                                                                  sourcePageId +
                                                                  "__" +
                                                                  result._id;
                                                                sourcePageId__DestinationPageId__Arr.push(
                                                                  sourcePageId__DestinationPageId
                                                                );
                                                              } else {
                                                                return callback(
                                                                  err
                                                                );
                                                              }

                                                              if (
                                                                totalOps ==
                                                                returnCounter
                                                              ) {
                                                                callback(
                                                                  null,
                                                                  sourcePageId__DestinationPageId__Arr
                                                                );
                                                              }
                                                            }
                                                          );
                                                        }
                                                      } else {
                                                        callback(
                                                          null,
                                                          sourcePageId__DestinationPageId__Arr
                                                        );
                                                      }
                                                    } else {
                                                      return callback(err);
                                                    }
                                                  });
                                              } else {
                                                callback(
                                                  null,
                                                  sourcePageId__DestinationPageId__Arr
                                                );
                                              }
                                            },
                                        },
                                        function (err, results) {
                                          //results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
                                          if (!err) {
                                            var createNewInstance__HiddenBoardOutputArr =
                                              results.createNewInstance__HiddenBoard
                                                ? results.createNewInstance__HiddenBoard
                                                : [];
                                            for (
                                              var loop = 0;
                                              loop <
                                              createNewInstance__HiddenBoardOutputArr.length;
                                              loop++
                                            ) {
                                              var recordArr =
                                                createNewInstance__HiddenBoardOutputArr[
                                                  loop
                                                ].split("__");
                                              var SourcePageId = recordArr[0];
                                              var NewPageId = recordArr[1];

                                              for (
                                                var loop2 = 0;
                                                loop2 <
                                                finalObj.margedArrOfAllQAPageIds
                                                  .length;
                                                loop2++
                                              ) {
                                                var recordArr2 =
                                                  finalObj.margedArrOfAllQAPageIds[
                                                    loop2
                                                  ].split("__");
                                                var SourcePageId_2 =
                                                  recordArr2[0];
                                                var WidgetIndex = recordArr2[1];
                                                var Viewport = recordArr2[2];
                                                if (
                                                  SourcePageId_2 == SourcePageId
                                                ) {
                                                  switch (Viewport) {
                                                    case "DESKTOP":
                                                      data.ViewportDesktopSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj = data
                                                        .ViewportDesktopSections
                                                        .Widgets[WidgetIndex]
                                                        .QAWidObj
                                                        ? data
                                                            .ViewportDesktopSections
                                                            .Widgets[
                                                            WidgetIndex
                                                          ].QAWidObj
                                                        : {};
                                                      data.ViewportDesktopSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj.PageId =
                                                        NewPageId;
                                                      break;

                                                    case "TABLET":
                                                      data.ViewportTabletSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj = data
                                                        .ViewportTabletSections
                                                        .Widgets[WidgetIndex]
                                                        .QAWidObj
                                                        ? data
                                                            .ViewportTabletSections
                                                            .Widgets[
                                                            WidgetIndex
                                                          ].QAWidObj
                                                        : {};
                                                      data.ViewportTabletSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj.PageId =
                                                        NewPageId;
                                                      break;

                                                    case "MOBILE":
                                                      data.ViewportMobileSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj = data
                                                        .ViewportMobileSections
                                                        .Widgets[WidgetIndex]
                                                        .QAWidObj
                                                        ? data
                                                            .ViewportMobileSections
                                                            .Widgets[
                                                            WidgetIndex
                                                          ].QAWidObj
                                                        : {};
                                                      data.ViewportMobileSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj.PageId =
                                                        NewPageId;
                                                      break;
                                                  }
                                                }
                                              }
                                            }
                                          } else {
                                          }

                                          Page(data).save(function (
                                            err,
                                            result
                                          ) {
                                            if (!err) {
                                            } else {
                                            }
                                          });
                                        }
                                      );
                                    } else {
                                      Page(data).save(function (err, result) {
                                        if (!err) {
                                        } else {
                                        }
                                      });
                                    }
                                  }
                                );
                              }
                            } else {
                              var response = {
                                status: 501,
                                message: "Something went wrong.",
                              };
                              res.json(response);
                            }
                          });
                      } else {
                        var response = {
                          status: 501,
                          message: "Something went wrong.",
                        };
                        res.json(response);
                      }
                    });
                  } else {
                    var response = {
                      status: 501,
                      message: "Something went wrong.",
                    };
                    res.json(response);
                  }
                });
              }
            } else {
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });

          var response = {
            status: 20000,
            message: "Capsule duplicated successfully.",
            result: result,
          };
          res.json(response);
        } else {
          var response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        }
      });
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		deleteCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var remove = function (req, res) {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {};
  //console.log("req.headers = " , req.headers)

  conditions._id = req.headers.capsule_id;
  data.IsDeleted = 1;
  data.ModifiedOn = Date.now();
  //if this is called from member's dashboard then just unfollow him from the all chapters of the capsule
  //case pending ...
  //end

  //Capsule.update(query , $set:data , function( err , result ){
  Capsule.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
      var conditions = {};
      var data = {};

      conditions.CapsuleId = req.headers.capsule_id;
      data.IsDeleted = 1;

      Chapter.update(
        conditions,
        { $set: data },
        { multi: true },
        function (err, result) {
          if (!err) {
            //get All chapters
            var fields = {
              _id: true,
            };

            Chapter.find(conditions, fields, function (err, result) {
              if (!err) {
                var ChapterIds = [];
                for (var loop = 0; loop < result.length; loop++) {
                  ChapterIds.push(result[loop]._id);
                }
                var conditions = {};
                var data = {};

                conditions.ChapterId = { $in: ChapterIds };
                data.IsDeleted = 1;

                Page.update(
                  conditions,
                  { $set: data },
                  { multi: true },
                  function (err, result) {
                    if (!err) {
                      var response = {
                        status: 200,
                        message: "page deleted successfully.",
                        result: result,
                      };
                    } else {
                      var response = {
                        status: 501,
                        message: "Something went wrong.",
                      };
                    }
                  }
                );
              } else {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
              }
            });
          } else {
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
          }
        }
      );

      var response = {
        status: 200,
        message: "Capsule deleted successfully.",
        result: result,
      };
      res.json(response);
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};
//this is upgraded version - now the same function will work for Owner (will delete the instance) and Members (will unfollow the member).
var remove_V2 = function (req, res) {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check

  var conditions = {
    _id: req.headers.capsule_id,
    OwnerId: req.session.user._id,
    IsDeleted: 0,
  };

  var fields = {
    OwnerId: true,
  };

  Capsule.find(conditions, fields)
    .count()
    .exec(function (err, resultLength) {
      if (!err) {
        if (resultLength) {
          //Owner wants to delete - just delete the capsule paranently.
          var conditions = {};
          var data = {};
          //console.log("req.headers = " , req.headers)

          conditions._id = req.headers.capsule_id;
          data.IsDeleted = 1;
          data.ModifiedOn = Date.now();

          //Capsule.update(query , $set:data , function( err , result ){
          Capsule.update(conditions, { $set: data }, function (err, result) {
            if (!err) {
              var conditions = {};
              var data = {};

              conditions.CapsuleId = req.headers.capsule_id;
              data.IsDeleted = 1;

              Chapter.update(
                conditions,
                { $set: data },
                { multi: true },
                function (err, result) {
                  if (!err) {
                    //get All chapters
                    var fields = {
                      _id: true,
                    };

                    Chapter.find(conditions, fields, function (err, result) {
                      if (!err) {
                        var ChapterIds = [];
                        for (var loop = 0; loop < result.length; loop++) {
                          ChapterIds.push(result[loop]._id);
                        }
                        var conditions = {};
                        var data = {};

                        conditions.ChapterId = { $in: ChapterIds };
                        data.IsDeleted = 1;

                        Page.update(
                          conditions,
                          { $set: data },
                          { multi: true },
                          function (err, result) {
                            if (!err) {
                              var response = {
                                status: 200,
                                message: "page deleted successfully.",
                                result: result,
                              };
                            } else {
                              var response = {
                                status: 501,
                                message: "Something went wrong.",
                              };
                            }
                          }
                        );
                      } else {
                        var response = {
                          status: 501,
                          message: "Something went wrong.",
                        };
                      }
                    });
                  } else {
                    var response = {
                      status: 501,
                      message: "Something went wrong.",
                    };
                  }
                }
              );

              var response = {
                status: 200,
                message: "Capsule deleted successfully.",
                result: result,
              };
              res.json(response);
            } else {
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });
        } else {
          //Member wants to delete - just un-follow the member from this association.
          var UserEmail = req.session.user.Email;
          var findConditions = {
            CapsuleId: req.headers.capsule_id,
            "LaunchSettings.Invitees": {
              $elemMatch: { UserEmail: { $regex: new RegExp(UserEmail, "i") } },
            },
            IsDeleted: 0,
          };

          Chapter.update(
            findConditions,
            {
              $pull: {
                "LaunchSettings.Invitees": {
                  UserEmail: { $regex: new RegExp(UserEmail, "i") },
                },
              },
            },
            { multi: true },
            function (err, result) {
              if (err) {
                var response = {
                  status: 501,
                  message: "something went wrong",
                };
                res.json(response);
              } else {
                var response = {
                  status: 200,
                  message: "Capsule deleted successfully.",
                  result: result,
                };
                res.json(response);
              }
            }
          );
        }
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		reorder
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

function getObjArrayIdxByKey(ObjArr, matchKey, matchVal) {
  var idx;
  for (var loop = 0; loop < ObjArr.length; loop++) {
    if (ObjArr[loop].hasOwnProperty(matchKey)) {
      if (ObjArr[loop][matchKey] == matchVal) {
        idx = loop;
        break;
      }
    }
  }
  return idx;
}

var reorder = async function (req, res) {
  try {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check
  var CapsuleIds = req.body.capsule_ids ? req.body.capsule_ids : [];
    
    if (!CapsuleIds.length) {
      return res.json({
        status: 501,
        message: "No capsule IDs provided.",
      });
    }
    
    // Update all capsules in parallel
    const updatePromises = CapsuleIds.map((capsuleId, index) => {
      return Capsule.findByIdAndUpdate(
        capsuleId,
        { Order: index + 1 },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    var response = {
      status: 200,
      message: "Capsules reordered successfully.",
    };
    res.json(response);
  } catch (error) {
    console.log("Reorder error:", error);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		updateCapsuleName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		updateCapsule
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Update capsule fields (for edit page)
   * @Param:     		capsule_id in URL params, update data in body
   * @Return:    	 	Updated capsule
   * @Access Category:	"UR + CR (req.params.id)"
_________________________________________________________________________
*/
var updateCapsule = async function (req, res) {
  try {
    // Check if user is authenticated
    if (!req.session?.user?._id) {
      return res.json({
        status: 401,
        message: "Authentication required. Please login first.",
      });
    }
    
    const capsuleId = req.params.id;
    
    if (!capsuleId) {
      return res.json({
        status: 400,
        message: "Capsule ID is required.",
      });
    }

    // First, fetch the capsule to check ownership/creator
    const capsule = await Capsule.findOne({
      _id: capsuleId,
      Status: true,
      IsDeleted: false
    });

    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found or has been deleted.",
      });
    }

    // Authorization check based on role
    const userRole = req.session.user.Role || 'user';
    const userId = req.session.user._id.toString();
    const isOwner = capsule.OwnerId && capsule.OwnerId.toString() === userId;
    const isCreator = capsule.CreaterId && capsule.CreaterId.toString() === userId;

    let authorized = false;
    let allowedFields = [];

    if (userRole === 'admin' || userRole === 'subadmin') {
      // Admin/SubAdmin: Can edit if they are either creator OR owner
      authorized = isCreator || isOwner;
      // Admins can edit all fields
      allowedFields = ['title', 'description', 'isPublished', 'privacy', 'audience', 'tags'];
    } else {
      // Normal user: Can only edit if they are the owner
      authorized = isOwner;
      // Normal users can only edit title (cover and icon are separate endpoints)
      allowedFields = ['title'];
    }

    if (!authorized) {
      return res.json({
        status: 403,
        message: "You don't have permission to edit this stream. Only the owner can edit.",
      });
    }

    // Build update object based on allowed fields
    const updateData = {};

    // Title - allowed for all users (only if provided and not empty)
    if (req.body.title && typeof req.body.title === 'string' && req.body.title.trim()) {
      if (allowedFields.includes('title')) {
        updateData.Title = req.body.title.trim();
      }
    }

    // Admin-only fields (only update if user is admin/subadmin)
    if (userRole === 'admin' || userRole === 'subadmin') {
      // Description - stored in MetaData.description
      if (req.body.description !== undefined && typeof req.body.description === 'string') {
        // Allow empty string to clear description, but trim non-empty values
        updateData['MetaData.description'] = req.body.description.trim();
      }
      
      // IsPublished - boolean field, check for boolean type
      if (req.body.isPublished !== undefined && typeof req.body.isPublished === 'boolean') {
        updateData.IsPublished = req.body.isPublished;
      }
      
      // Privacy (ShareMode) - only if provided and not empty
      if (req.body.privacy && typeof req.body.privacy === 'string') {
        updateData['LaunchSettings.ShareMode'] = req.body.privacy;
      }
      
      // Audience - only if provided and not empty
      if (req.body.audience && typeof req.body.audience === 'string') {
        updateData['LaunchSettings.Audience'] = req.body.audience;
      }
      
      // Tags - only if provided as array
      if (req.body.tags && Array.isArray(req.body.tags)) {
        // Tags are stored as groupTags array of objects with {GroupTagID, GroupTagTitle}
        // For now, just log - implement proper tag handling if needed
        // TODO: Implement proper tag update logic if needed
        // Would need to map string tags to groupTag objects with IDs
      }
    }

    // Always update ModifiedOn
    updateData.ModifiedOn = Date.now();

    // Check if there's anything to update besides ModifiedOn
    if (Object.keys(updateData).length === 1) {
      return res.json({
        status: 400,
        message: "No valid fields provided for update.",
      });
    }

    const result = await Capsule.updateOne(
      { _id: capsuleId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.json({
        status: 404,
        message: "Capsule not found.",
      });
    }

    // Fetch the updated capsule to return
    const updatedCapsule = await Capsule.findById(capsuleId);

    var response = {
      code: "200",
      status: 200,
      message: "Stream updated successfully.",
      result: updatedCapsule,
      data: updatedCapsule
    };
    res.json(response);
  } catch (err) {
    console.error('❌ Error in updateCapsule:', err);
    var response = {
      status: 501,
      message: "Something went wrong.",
      error: err.message
    };
    res.json(response);
  }
};

var updateCapsuleName = async function (req, res) {
  try {
    // Check if user is authenticated
    if (!req.session?.user?._id) {
      return res.json({
        status: 401,
        message: "Authentication required. Please login first.",
      });
    }
    
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers.",
      });
    }

    // First, fetch the capsule to check ownership/creator
    const capsule = await Capsule.findOne({
      _id: req.headers.capsule_id,
      Status: true,
      IsDeleted: false
    });

    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found or has been deleted.",
      });
    }

    // Authorization check based on role
    const userRole = req.session.user.Role || 'user';
    const userId = req.session.user._id.toString();
    const isOwner = capsule.OwnerId && capsule.OwnerId.toString() === userId;
    const isCreator = capsule.CreaterId && capsule.CreaterId.toString() === userId;

    let authorized = false;

    if (userRole === 'admin' || userRole === 'subadmin') {
      // Admin/SubAdmin: Can edit if they are either creator OR owner
      authorized = isCreator || isOwner;
    } else {
      // Normal user: Can only edit if they are the owner
      authorized = isOwner;
    }

    if (!authorized) {
      return res.json({
        status: 403,
        message: "You don't have permission to edit this stream. Only the owner can edit.",
      });
    }

  var conditions = {};
  var data = {};

  conditions._id = req.headers.capsule_id;
  data.Title = req.body.Capsule_name
    ? req.body.Capsule_name
    : "Untitled Capsule";
  data.ModifiedOn = Date.now();

    const result = await Capsule.updateOne(conditions, { $set: data });
    
    if (result.matchedCount === 0) {
      return res.json({
        status: 404,
        message: "Capsule not found.",
      });
    }

      var response = {
        status: 200,
        message: "Capsule name updated successfully.",
        result: result,
      };
      res.json(response);
  } catch (err) {
    console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
};

//Capsule library Apis

/*________________________________________________________________________
   * @Date:      		25 Aug 2015
   * @Method :   		uploadCover
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var uploadCover = async function (req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = __dirname + "/../../media-assets/capsule/covers/";
  form.keepExtensions = true;

  form.parse(req, async function (err, fields, files) {
    if (err) {
      return res.json({
        code: "500",
        message: "Error parsing form data",
        error: err.message
      });
    }

    const capsuleId =
      fields.capsule_id ||
      fields.capsuleId ||
      req.headers.capsule_id ||
      req.headers["capsule_id"];

    if (!capsuleId) {
      return res.json({
        code: "400",
        message: "capsule_id is required in form data or headers."
      });
    }

    const uploadedFile = files.file || files.coverImage || files.image;

    if (!uploadedFile) {
      return res.json({
        code: "400",
        message: "No file uploaded."
      });
    }

    // Simple local file handling (can be replaced with S3 upload)
    const fileName = `${capsuleId}_${Date.now()}.jpg`;
    const newPath = form.uploadDir + fileName;

    fs.rename(uploadedFile.filepath, newPath, async function (err) {
      if (err) {
        return res.json({
          code: "500",
          message: "Error saving file",
          error: err.message
        });
      }

      // Update capsule with cover art path
      await Capsule.updateOne(
        { _id: capsuleId },
        { $set: { CoverArt: `/assets/capsule/covers/${fileName}`, ModifiedOn: Date.now() } }
      );

      res.json({
        code: "200",
        message: "Cover image uploaded successfully",
        result: { coverArt: `/assets/capsule/covers/${fileName}` }
      });
    });
  });
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		saveSettings
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var saveSettings = async function (req, res) {
  try {
    console.log('⚙️ saveSettings called - Auth debug:', {
      hasUser: !!req.user,
      hasSessionUser: !!(req.session && req.session.user),
      userId: req.session?.user?._id,
      role: req.session?.user?.Role,
      capsuleId: req.headers.capsule_id
    });

    // Check if user is authenticated
    if (!req.session?.user?._id) {
      return res.json({
        status: 401,
        message: "Authentication required. Please login first.",
      });
    }

    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers."
      });
    }

    // First, fetch the capsule to check ownership/creator
    const capsule = await Capsule.findOne({
      _id: req.headers.capsule_id,
      Status: true,
      IsDeleted: false
    });

    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found or has been deleted.",
      });
    }

    // Authorization check based on role
    const userRole = req.session.user.Role || 'user';
    const userId = req.session.user._id.toString();
    const isOwner = capsule.OwnerId && capsule.OwnerId.toString() === userId;
    const isCreator = capsule.CreaterId && capsule.CreaterId.toString() === userId;

    let authorized = false;

    if (userRole === 'admin' || userRole === 'subadmin') {
      // Admin/SubAdmin: Can edit if they are either creator OR owner
      authorized = isCreator || isOwner;
      console.log('🔐 Admin/SubAdmin authorization for saveSettings:', {
        role: userRole,
        isCreator,
        isOwner,
        authorized
      });
    } else {
      // Normal user: Cannot use saveSettings (advanced settings only)
      // They should use updateCapsule with limited fields
      return res.json({
        status: 403,
        message: "Only administrators can modify advanced settings. Regular users can only edit title, cover art, and menu icon.",
      });
    }

    if (!authorized) {
      return res.json({
        status: 403,
        message: "You don't have permission to edit this stream.",
      });
    }

    var condition = {};
    condition._id = req.headers.capsule_id;
    
    var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
    var CapsuleFor = req.body.CapsuleFor ? req.body.CapsuleFor : 'Stream';
    var StreamType = req.body.StreamType ? req.body.StreamType : null;
    var participation = req.body.participation ? req.body.participation : 'private';
    var price = req.body.price ? parseFloat(req.body.price) : 0;
    var DiscountPrice = req.body.DiscountPrice ? parseFloat(req.body.DiscountPrice) : 0;

    req.body.LaunchSettings = req.body.LaunchSettings ? req.body.LaunchSettings : {};
    var OwnerBirthday = req.body.LaunchSettings.OwnerBirthday ? req.body.LaunchSettings.OwnerBirthday : null;

    var StreamFlow = req.body.StreamFlow ? req.body.StreamFlow : 'Birthday';
    var OwnerAnswer = req.body.OwnerAnswer ? req.body.OwnerAnswer : false;
    var IsOwnerPostsForMember = req.body.IsOwnerPostsForMember ? req.body.IsOwnerPostsForMember : false;
    var IsPurchaseNeededForAllPosts = req.body.IsPurchaseNeededForAllPosts ? req.body.IsPurchaseNeededForAllPosts : false;

    var Frequency = req.body.Frequency ? req.body.Frequency : 'medium';
    var MonthFor = req.body.MonthFor ? req.body.MonthFor : 'M12';

    if (req.body.title) {
      var title = req.body.title;

      var setObj = {
        'LaunchSettings.Audience': makingFor,
        'LaunchSettings.CapsuleFor': CapsuleFor,
        'LaunchSettings.ShareMode': participation,
        'Title': title,
        'ModifiedOn': Date.now()
      };

      if (setObj['LaunchSettings.CapsuleFor'] == 'Stream') {
        setObj['LaunchSettings.StreamType'] = StreamType ? StreamType : '';
        setObj['StreamFlow'] = StreamFlow;
        setObj['OwnerAnswer'] = OwnerAnswer;
        setObj['IsOwnerPostsForMember'] = IsOwnerPostsForMember;
        setObj['IsPurchaseNeededForAllPosts'] = IsPurchaseNeededForAllPosts;

        setObj['Frequency'] = Frequency;
        setObj['MonthFor'] = MonthFor;
      }

      if (OwnerBirthday) {
        setObj['LaunchSettings.OwnerBirthday'] = OwnerBirthday;
      }

      if (makingFor == 'BUYERS' && price == 0) {
        // Skip price update if BUYERS but price is 0
      } else {
        setObj.Price = price;
      }

      setObj.DiscountPrice = DiscountPrice;

      const result = await Capsule.updateOne(condition, { $set: setObj });

      if (result.matchedCount === 0) {
        return res.json({
          status: 404,
          message: "Capsule not found."
        });
      }

      // Fetch the updated capsule to return
      const updatedCapsule = await Capsule.findById(req.headers.capsule_id);

      var response = {
        status: 200,
        message: "Capsule settings updated successfully.",
        result: updatedCapsule
      };
      res.json(response);
    } else {
      var response = {
        status: 400,
        message: "Title is required."
      };
      res.json(response);
    }
  } catch (err) {
    console.log(err);
    var response = {
      status: 501,
      message: "Something went wrong."
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		saveBirthday
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   		Save owner birthday date for birthday streams
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var saveBirthday = async function(req, res) {
  try {
    var condition = {};
    condition._id = req.headers.capsule_id ? req.headers.capsule_id : '0';
    var OwnerBirthday = req.body.OwnerBirthday ? req.body.OwnerBirthday : null;

    if (OwnerBirthday) {
      var setObj = {
        'LaunchSettings.OwnerBirthday': OwnerBirthday,
        'ModifiedOn': Date.now()
      };

      const result = await Capsule.updateOne(condition, { $set: setObj });
      
      if (result.matchedCount === 0) {
        return res.json({
          status: 404,
          message: "Capsule not found."
        });
      }

      var response = {
        status: 200,
        message: "Birthday date saved successfully.",
        result: result
      };
      res.json(response);
    } else {
      var response = {
        status: 400,
        message: "OwnerBirthday is required."
      };
      res.json(response);
    }
  } catch (error) {
    console.error('saveBirthday error:', error);
    var response = {
      status: 501,
      message: "Something went wrong.",
      error: error.message
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		26 Aug 2015
   * @Method :   		invite
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var invite = function (req, res) {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check
  var Invitees = req.body.invitees ? req.body.invitees : [];
  var conditions = { _id: req.headers.capsule_id };

  Capsule.update(
    conditions,
    { $addToSet: { "LaunchSettings.Invitees": { $each: Invitees } } },
    { multi: false },
    function (err, numAffected) {
      if (!err) {
        var response = {
          status: 200,
          message: "Invitee added successfully.",
          result: numAffected
        };
        res.json(response);
      } else {
        var response = {
          status: 501,
          message: "Something went wrong."
        };
        res.json(response);
      }
    }
  );
};

/*________________________________________________________________________
   * @Date:      		26 Aug 2015
   * @Method :   		inviteMember
                          Origin: { $ne: "publishNewChanges" },
                          ChapterId: oldChapterId,
                          OwnerId: req.session.user._id,
                          IsDeleted: false,
                          PageType: { $in: ["gallery", "content"] },
                        };

                        var sortObj = {
                          Order: 1,
                          UpdatedOn: -1,
                        };
                        var fields = {
                          _id: true,
                        };

                        var newChapterId = result._id;
                        Page.find(conditions, fields)
                          .sort(sortObj)
                          .exec(function (err, results) {
                            if (!err) {
                              var fields = {
                                _id: true,
                                Title: true,
                                PageType: true,
                                Order: true,
                                HeaderImage: true,
                                BackgroundMusic: true,
                                CommonParams: true,
                                ViewportDesktopSections: true,
                                ViewportTabletSections: true,
                                ViewportMobileSections: true,
                                SelectedMedia: true,
                                SelectedCriteria: true,
                                HeaderBlurValue: true,
                                HeaderTransparencyValue: true,
                              };
                              for (
                                var loop = 0;
                                loop < results.length;
                                loop++
                              ) {
                                var conditions = {};
                                conditions._id = results[loop]._id;
                                Page.findOne(
                                  conditions,
                                  fields,
                                  function (err, result) {
                                    //delete result._id;
                                    var data = {};
                                    data.Origin = "addedFromLibrary";
                                    data.OriginatedFrom = conditions._id;
                                    data.CreaterId = req.session.user._id;
                                    data.OwnerId = req.session.user._id;
                                    data.ChapterId = newChapterId;
                                    data.Title = result.Title;
                                    data.PageType = result.PageType;
                                    data.Order = result.Order;
                                    data.HeaderImage = result.HeaderImage
                                      ? result.HeaderImage
                                      : "";
                                    data.BackgroundMusic =
                                      result.BackgroundMusic
                                        ? result.BackgroundMusic
                                        : "";
                                    data.SelectedMedia = result.SelectedMedia
                                      ? result.SelectedMedia
                                      : [];
                                    data.SelectedCriteria =
                                      result.SelectedCriteria;
                                    data.HeaderBlurValue =
                                      result.HeaderBlurValue
                                        ? result.HeaderBlurValue
                                        : 0;
                                    data.HeaderTransparencyValue =
                                      result.HeaderTransparencyValue
                                        ? result.HeaderTransparencyValue
                                        : 0;

                                    data.CreatedOn = nowDate;
                                    data.UpdatedOn = nowDate;

                                    var Desktop__allHiddenBoardId_Arr = [];
                                    var Tablet__allHiddenBoardId_Arr = [];
                                    var Mobile__allHiddenBoardId_Arr = [];

                                    var allHiddenBoardId_Arr = [];

                                    var Desktop__allHiddenBoardId__index_Arr =
                                      [];
                                    var Tablet__allHiddenBoardId__index_Arr =
                                      [];
                                    var Mobile__allHiddenBoardId__index_Arr =
                                      [];

                                    var margedArrOfAllQAPageIds = [];
                                    var UNIQUE__margedArrOfAllQAPageIds = [];

                                    var sourcePageId__DestinationPageId__Arr =
                                      [];

                                    if (data.PageType == "content") {
                                      data.CommonParams = result.CommonParams
                                        ? result.CommonParams
                                        : {};
                                      data.ViewportDesktopSections =
                                        result.ViewportDesktopSections
                                          ? result.ViewportDesktopSections
                                          : {};
                                      data.ViewportTabletSections =
                                        result.ViewportTabletSections
                                          ? result.ViewportTabletSections
                                          : {};
                                      data.ViewportMobileSections =
                                        result.ViewportMobileSections
                                          ? result.ViewportMobileSections
                                          : {};

                                      //AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
                                      //desktop viewport filter
                                      data.ViewportDesktopSections.Widgets =
                                        data.ViewportDesktopSections.Widgets
                                          ? data.ViewportDesktopSections.Widgets
                                          : [];

                                      for (
                                        var loop = 0;
                                        loop <
                                        data.ViewportDesktopSections.Widgets
                                          .length;
                                        loop++
                                      ) {
                                        var widObj =
                                          data.ViewportDesktopSections.Widgets[
                                            loop
                                          ];
                                        widObj.Type = widObj.Type
                                          ? widObj.Type
                                          : "";
                                        if (widObj.Type == "questAnswer") {
                                          // If Widget is a QA Widget then ...
                                          widObj.QAWidObj = widObj.QAWidObj
                                            ? widObj.QAWidObj
                                            : {};
                                          var HiddenBoardId = widObj.QAWidObj
                                            .PageId
                                            ? widObj.QAWidObj.PageId
                                            : "SOMETHING__WRONG";
                                          if (
                                            HiddenBoardId != "SOMETHING__WRONG"
                                          ) {
                                            Desktop__allHiddenBoardId_Arr.push(
                                              HiddenBoardId
                                            );
                                            Desktop__allHiddenBoardId__index_Arr.push(
                                              HiddenBoardId +
                                                "__" +
                                                loop +
                                                "__" +
                                                "DESKTOP"
                                            );
                                          }
                                        }
                                      }

                                      //tablet viewport filter
                                      data.ViewportTabletSections.Widgets = data
                                        .ViewportTabletSections.Widgets
                                        ? data.ViewportTabletSections.Widgets
                                        : [];

                                      for (
                                        var loop = 0;
                                        loop <
                                        data.ViewportTabletSections.Widgets
                                          .length;
                                        loop++
                                      ) {
                                        var widObj =
                                          data.ViewportTabletSections.Widgets[
                                            loop
                                          ];
                                        if (widObj.Type == "questAnswer") {
                                          // If Widget is a QA Widget then ...
                                          widObj.QAWidObj = widObj.QAWidObj
                                            ? widObj.QAWidObj
                                            : {};
                                          var HiddenBoardId = widObj.QAWidObj
                                            .PageId
                                            ? widObj.QAWidObj.PageId
                                            : "SOMETHING_WRONG";
                                          if (
                                            HiddenBoardId != "SOMETHING__WRONG"
                                          ) {
                                            Tablet__allHiddenBoardId_Arr.push(
                                              HiddenBoardId
                                            );
                                            Tablet__allHiddenBoardId__index_Arr.push(
                                              HiddenBoardId +
                                                "__" +
                                                loop +
                                                "__" +
                                                "TABLET"
                                            );
                                          }
                                        }
                                      }

                                      //mobile viewport filter
                                      data.ViewportMobileSections.Widgets = data
                                        .ViewportMobileSections.Widgets
                                        ? data.ViewportMobileSections.Widgets
                                        : [];

                                      for (
                                        var loop = 0;
                                        loop <
                                        data.ViewportMobileSections.Widgets
                                          .length;
                                        loop++
                                      ) {
                                        var widObj =
                                          data.ViewportMobileSections.Widgets[
                                            loop
                                          ];
                                        if (widObj.Type == "questAnswer") {
                                          // If Widget is a QA Widget then ...
                                          widObj.QAWidObj = widObj.QAWidObj
                                            ? widObj.QAWidObj
                                            : {};
                                          var HiddenBoardId = widObj.QAWidObj
                                            .PageId
                                            ? widObj.QAWidObj.PageId
                                            : "SOMETHING__WRONG";
                                          if (
                                            HiddenBoardId != "SOMETHING__WRONG"
                                          ) {
                                            Mobile__allHiddenBoardId_Arr.push(
                                              HiddenBoardId
                                            );
                                            Mobile__allHiddenBoardId__index_Arr.push(
                                              HiddenBoardId +
                                                "__" +
                                                loop +
                                                "__" +
                                                "MOBILE"
                                            );
                                          }
                                        }
                                      }

                                      margedArrOfAllQAPageIds =
                                        Desktop__allHiddenBoardId__index_Arr.concat(
                                          Tablet__allHiddenBoardId__index_Arr
                                        );
                                      margedArrOfAllQAPageIds =
                                        margedArrOfAllQAPageIds.concat(
                                          Mobile__allHiddenBoardId__index_Arr
                                        );

                                      //UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

                                      allHiddenBoardId_Arr =
                                        Desktop__allHiddenBoardId_Arr.concat(
                                          Tablet__allHiddenBoardId_Arr
                                        );
                                      allHiddenBoardId_Arr =
                                        allHiddenBoardId_Arr.concat(
                                          Mobile__allHiddenBoardId_Arr
                                        );

                                      UNIQUE__allHiddenBoardId_Arr =
                                        allHiddenBoardId_Arr.unique();

                                      //just for testing...
                                      var finalObj = {
                                        Desktop__allHiddenBoardId__index_Arr:
                                          Desktop__allHiddenBoardId__index_Arr,
                                        Tablet__allHiddenBoardId__index_Arr:
                                          Tablet__allHiddenBoardId__index_Arr,
                                        Mobile__allHiddenBoardId__index_Arr:
                                          Mobile__allHiddenBoardId__index_Arr,
                                        margedArrOfAllQAPageIds:
                                          margedArrOfAllQAPageIds,
                                        UNIQUE__allHiddenBoardId_Arr:
                                          UNIQUE__allHiddenBoardId_Arr,
                                      };

                                      //now create new instances of the unique hidden boards and update the PageId on corresponding entries...
                                      async.series(
                                        {
                                          createNewInstance__HiddenBoard:
                                            function (callback) {
                                              if (
                                                finalObj
                                                  .UNIQUE__allHiddenBoardId_Arr
                                                  .length
                                              ) {
                                                var conditions = {
                                                  _id: {
                                                    $in: finalObj.UNIQUE__allHiddenBoardId_Arr,
                                                  },
                                                };
                                                var fields = {
                                                  Medias: false,
                                                };
                                                Page.find(conditions, fields)
                                                  .lean()
                                                  .exec(function (
                                                    err,
                                                    results
                                                  ) {
                                                    if (!err) {
                                                      var results = results
                                                        ? results
                                                        : [];
                                                      var returnCounter = 0;
                                                      var totalOps =
                                                        results.length
                                                          ? results.length
                                                          : 0;
                                                      if (totalOps) {
                                                        var oldPageId = null;
                                                        for (
                                                          var loop = 0;
                                                          loop < totalOps;
                                                          loop++
                                                        ) {
                                                          oldPageId =
                                                            results[loop]._id;
                                                          var newInstanceData =
                                                            results[loop];
                                                          newInstanceData.OriginatedFrom =
                                                            oldPageId;
                                                          newInstanceData.Origin =
                                                            "addedFromLibrary";

                                                          //console.log("WTF-----------------------",oldPageId);
                                                          delete newInstanceData._id;
                                                          //console.log("WTF-----------------------",oldPageId);

                                                          newInstanceData.CreatedOn =
                                                            Date.now();
                                                          newInstanceData.UpdatedOn =
                                                            Date.now();
                                                          //console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
                                                          CreateNewInstance__HiddenBoardFunc(
                                                            oldPageId,
                                                            newInstanceData,
                                                            totalOps
                                                          );
                                                        }

                                                        function CreateNewInstance__HiddenBoardFunc(
                                                          sourcePageId,
                                                          dataToSave,
                                                          totalOps
                                                        ) {
                                                          var sourcePageId =
                                                            sourcePageId
                                                              ? sourcePageId
                                                              : "SOMETHING_WRONG";
                                                          //sourcePageId__DestinationPageId
                                                          Page(dataToSave).save(
                                                            function (
                                                              err,
                                                              result
                                                            ) {
                                                              returnCounter++;
                                                              if (!err) {
                                                                var sourcePageId__DestinationPageId =
                                                                  sourcePageId +
                                                                  "__" +
                                                                  result._id;
                                                                sourcePageId__DestinationPageId__Arr.push(
                                                                  sourcePageId__DestinationPageId
                                                                );
                                                              } else {
                                                                return callback(
                                                                  err
                                                                );
                                                              }

                                                              if (
                                                                totalOps ==
                                                                returnCounter
                                                              ) {
                                                                callback(
                                                                  null,
                                                                  sourcePageId__DestinationPageId__Arr
                                                                );
                                                              }
                                                            }
                                                          );
                                                        }
                                                      } else {
                                                        callback(
                                                          null,
                                                          sourcePageId__DestinationPageId__Arr
                                                        );
                                                      }
                                                    } else {
                                                      return callback(err);
                                                    }
                                                  });
                                              } else {
                                                callback(
                                                  null,
                                                  sourcePageId__DestinationPageId__Arr
                                                );
                                              }
                                            },
                                        },
                                        function (err, results) {
                                          //results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
                                          if (!err) {
                                            var createNewInstance__HiddenBoardOutputArr =
                                              results.createNewInstance__HiddenBoard
                                                ? results.createNewInstance__HiddenBoard
                                                : [];
                                            for (
                                              var loop = 0;
                                              loop <
                                              createNewInstance__HiddenBoardOutputArr.length;
                                              loop++
                                            ) {
                                              var recordArr =
                                                createNewInstance__HiddenBoardOutputArr[
                                                  loop
                                                ].split("__");
                                              var SourcePageId = recordArr[0];
                                              var NewPageId = recordArr[1];

                                              for (
                                                var loop2 = 0;
                                                loop2 <
                                                finalObj.margedArrOfAllQAPageIds
                                                  .length;
                                                loop2++
                                              ) {
                                                var recordArr2 =
                                                  finalObj.margedArrOfAllQAPageIds[
                                                    loop2
                                                  ].split("__");
                                                var SourcePageId_2 =
                                                  recordArr2[0];
                                                var WidgetIndex = recordArr2[1];
                                                var Viewport = recordArr2[2];
                                                if (
                                                  SourcePageId_2 == SourcePageId
                                                ) {
                                                  switch (Viewport) {
                                                    case "DESKTOP":
                                                      data.ViewportDesktopSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj = data
                                                        .ViewportDesktopSections
                                                        .Widgets[WidgetIndex]
                                                        .QAWidObj
                                                        ? data
                                                            .ViewportDesktopSections
                                                            .Widgets[
                                                            WidgetIndex
                                                          ].QAWidObj
                                                        : {};
                                                      data.ViewportDesktopSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj.PageId =
                                                        NewPageId;
                                                      break;

                                                    case "TABLET":
                                                      data.ViewportTabletSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj = data
                                                        .ViewportTabletSections
                                                        .Widgets[WidgetIndex]
                                                        .QAWidObj
                                                        ? data
                                                            .ViewportTabletSections
                                                            .Widgets[
                                                            WidgetIndex
                                                          ].QAWidObj
                                                        : {};
                                                      data.ViewportTabletSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj.PageId =
                                                        NewPageId;
                                                      break;

                                                    case "MOBILE":
                                                      data.ViewportMobileSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj = data
                                                        .ViewportMobileSections
                                                        .Widgets[WidgetIndex]
                                                        .QAWidObj
                                                        ? data
                                                            .ViewportMobileSections
                                                            .Widgets[
                                                            WidgetIndex
                                                          ].QAWidObj
                                                        : {};
                                                      data.ViewportMobileSections.Widgets[
                                                        WidgetIndex
                                                      ].QAWidObj.PageId =
                                                        NewPageId;
                                                      break;
                                                  }
                                                }
                                              }
                                            }
                                          } else {
                                          }

                                          Page(data).save(function (
                                            err,
                                            result
                                          ) {
                                            if (!err) {
                                            } else {
                                            }
                                          });
                                        }
                                      );
                                    } else {
                                      Page(data).save(function (err, result) {
                                        if (!err) {
                                        } else {
                                        }
                                      });
                                    }
                                  }
                                );
                              }
                            } else {
                              var response = {
                                status: 501,
                                message: "Something went wrong.",
                              };
                              res.json(response);
                            }
                          });
                      } else {
                        var response = {
                          status: 501,
                          message: "Something went wrong.",
                        };
                        res.json(response);
                      }
                    });
                  } else {
                    var response = {
                      status: 501,
                      message: "Something went wrong.",
                    };
                    res.json(response);
                  }
                });
              }
            } else {
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });

          var response = {
            status: 20000,
            message: "Capsule added from library successfully.",
            result: result,
          };
          res.json(response);
        } else {
          var response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        }
      });
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		previewCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var share = function (req, res) {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check
  var init_conditions = {};
  var fields = {
    Title: 1,
    CoverArt: 1,
  };

  init_conditions._id = req.headers.capsule_id;

  Capsule.findOne(init_conditions, fields, function (err, result) {
    if (!err) {
      var shareWithEmail = req.body.share_with_email
        ? req.body.share_with_email
        : false;
      var shareWithName = req.body.share_with_name
        ? req.body.share_with_name
        : "";

      if (shareWithEmail) {
        var conditions = {};
        conditions.Email = shareWithEmail;

        var fields = {
          Email: true,
        };

        User.find(conditions, fields, function (err, UserData) {
          if (!err) {
            var data = {};
            data.Origin = "shared";
            data.OriginatedFrom = init_conditions._id; //logging refeerence of the parent capsule.

            data.CreaterId = req.session.user._id;

            if (!UserData.length) {
              //Non-Registered user case
              data.OwnerId = req.session.user._id;
              //data.OwnerEmail = req.session.user.Email;
              data.OwnerEmail = shareWithEmail; //fixed on 04Jan2017
            } else {
              data.OwnerId = UserData[0]._id;
              data.OwnerEmail = UserData[0].Email;
            }

            data.Title = result.Title;
            data.CoverArt = result.CoverArt;

            var nowDate = Date.now();
            data.CreatedOn = nowDate;
            data.ModifiedOn = nowDate;

            Capsule(data).save(function (err, result) {
              if (!err) {
                //console.log("==========CAPSULE INSTANCE : SUCCESS==================", result);

                //chapters under capsule
                var conditions = {
                  CapsuleId: req.headers.capsule_id
                    ? req.headers.capsule_id
                    : 0,
                  OwnerId: req.session.user._id,
                  IsDeleted: false,
                };
                var sortObj = {
                  Order: 1,
                  ModifiedOn: -1,
                };
                var fields = {
                  _id: true,
                };

                var newCapsuleId = result._id;
                //console.log("&&&&&&&&&&&&&&&conditions = ",conditions);
                //Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
                Chapter.find(conditions, fields, function (err, results) {
                  if (!err) {
                    for (var loop = 0; loop < results.length; loop++) {
                      var conditions = {};
                      var fields = {
                        Title: true,
                        CoverArt: true,
                        CapsuleId: true,
                        Order: true,
                        CoverArtFirstPage: true,
                        ChapterPlaylist: true,
                      };

                      conditions._id = results[loop]._id;

                      Chapter.findOne(
                        conditions,
                        fields,
                        function (err, result) {
                          if (!err) {
                            var data = {};
                            data.Origin = "shared";
                            data.OriginatedFrom = conditions._id;

                            data.CreaterId = req.session.user._id;

                            if (!UserData.length) {
                              //Non-Registered user case
                              data.OwnerId = req.session.user._id;
                              //data.OwnerEmail = req.session.user.Email;
                              data.OwnerEmail = shareWithEmail; //fixed on 04Jan2017
                            } else {
                              data.OwnerId = UserData[0]._id;
                              data.OwnerEmail = UserData[0].Email;
                            }

                            data.Title = result.Title;
                            data.CoverArt = result.CoverArt;
                            data.CapsuleId = newCapsuleId;
                            data.Order = result.Order;
                            data.CoverArtFirstPage = result.CoverArtFirstPage
                              ? result.CoverArtFirstPage
                              : "";
                            data.ChapterPlaylist = result.ChapterPlaylist
                              ? result.ChapterPlaylist
                              : [];

                            var nowDate = Date.now();
                            data.CreatedOn = nowDate;
                            data.ModifiedOn = nowDate;

                            //console.log("Chapter under loop%%%%%%%%%%%%%%%%%%%%%%%%%%%%%data = ",data);
                            var oldChapterId = result._id;
                            //var Chapter = new Chapter(data);
                            Chapter(data).save(function (err, result) {
                              //Chapter.save(function( err , result ){
                              if (!err) {
                                //console.log("new chapter saved ------",result);
                                //pages under chapters duplication will be implemented later
                                var conditions = {
                                  ChapterId: oldChapterId,
                                  OwnerId: req.session.user._id,
                                  IsDeleted: false,
                                  PageType: { $in: ["gallery", "content"] },
                                };
                                var sortObj = {
                                  Order: 1,
                                  UpdatedOn: -1,
                                };
                                var fields = {
                                  _id: true,
                                };

                                var newChapterId = result._id;
                                Page.find(conditions, fields)
                                  .sort(sortObj)
                                  .exec(function (err, results) {
                                    if (!err) {
                                      //console.log("@@@@@@@@@@@PAGE COUNT = ",results.length);
                                      var fields = {
                                        _id: true,
                                        Title: true,
                                        PageType: true,
                                        Order: true,
                                        HeaderImage: true,
                                        BackgroundMusic: true,
                                        CommonParams: true,
                                        ViewportDesktopSections: true,
                                        ViewportTabletSections: true,
                                        ViewportMobileSections: true,
                                        SelectedMedia: true,
                                        SelectedCriteria: true,
                                        HeaderBlurValue: true,
                                        HeaderTransparencyValue: true,
                                      };
                                      for (
                                        var loop = 0;
                                        loop < results.length;
                                        loop++
                                      ) {
                                        var conditions = {};
                                        conditions._id = results[loop]._id;
                                        Page.findOne(
                                          conditions,
                                          fields,
                                          function (err, result) {
                                            //delete result._id;
                                            var data = {};
                                            data.Origin = "shared";
                                            data.OriginatedFrom =
                                              conditions._id;

                                            data.CreaterId =
                                              req.session.user._id;

                                            if (!UserData.length) {
                                              //Non-Registered user case
                                              data.OwnerId =
                                                req.session.user._id;
                                              //data.OwnerEmail = req.session.user.Email;
                                              data.OwnerEmail = shareWithEmail; //fixed on 04Jan2017
                                            } else {
                                              data.OwnerId = UserData[0]._id;
                                              data.OwnerEmail =
                                                UserData[0].Email;
                                            }

                                            data.ChapterId = newChapterId;

                                            data.Title = result.Title;
                                            data.PageType = result.PageType;
                                            data.Order = result.Order;
                                            data.HeaderImage =
                                              result.HeaderImage
                                                ? result.HeaderImage
                                                : "";
                                            data.BackgroundMusic =
                                              result.BackgroundMusic
                                                ? result.BackgroundMusic
                                                : "";
                                            data.SelectedMedia =
                                              result.SelectedMedia
                                                ? result.SelectedMedia
                                                : [];
                                            data.SelectedCriteria =
                                              result.SelectedCriteria;
                                            data.HeaderBlurValue =
                                              result.HeaderBlurValue
                                                ? result.HeaderBlurValue
                                                : 0;
                                            data.HeaderTransparencyValue =
                                              result.HeaderTransparencyValue
                                                ? result.HeaderTransparencyValue
                                                : 0;

                                            data.CreatedOn = nowDate;
                                            data.UpdatedOn = nowDate;

                                            var Desktop__allHiddenBoardId_Arr =
                                              [];
                                            var Tablet__allHiddenBoardId_Arr =
                                              [];
                                            var Mobile__allHiddenBoardId_Arr =
                                              [];

                                            var allHiddenBoardId_Arr = [];

                                            var Desktop__allHiddenBoardId__index_Arr =
                                              [];
                                            var Tablet__allHiddenBoardId__index_Arr =
                                              [];
                                            var Mobile__allHiddenBoardId__index_Arr =
                                              [];

                                            var margedArrOfAllQAPageIds = [];
                                            var UNIQUE__margedArrOfAllQAPageIds =
                                              [];
                                            var sourcePageId__DestinationPageId__Arr =
                                              [];

                                            if (data.PageType == "content") {
                                              data.CommonParams =
                                                result.CommonParams
                                                  ? result.CommonParams
                                                  : {};
                                              data.ViewportDesktopSections =
                                                result.ViewportDesktopSections
                                                  ? result.ViewportDesktopSections
                                                  : {};
                                              data.ViewportTabletSections =
                                                result.ViewportTabletSections
                                                  ? result.ViewportTabletSections
                                                  : {};
                                              data.ViewportMobileSections =
                                                result.ViewportMobileSections
                                                  ? result.ViewportMobileSections
                                                  : {};

                                              //AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
                                              //desktop viewport filter
                                              data.ViewportDesktopSections.Widgets =
                                                data.ViewportDesktopSections
                                                  .Widgets
                                                  ? data.ViewportDesktopSections
                                                      .Widgets
                                                  : [];

                                              for (
                                                var loop = 0;
                                                loop <
                                                data.ViewportDesktopSections
                                                  .Widgets.length;
                                                loop++
                                              ) {
                                                var widObj =
                                                  data.ViewportDesktopSections
                                                    .Widgets[loop];
                                                widObj.Type = widObj.Type
                                                  ? widObj.Type
                                                  : "";
                                                if (
                                                  widObj.Type == "questAnswer"
                                                ) {
                                                  // If Widget is a QA Widget then ...
                                                  widObj.QAWidObj =
                                                    widObj.QAWidObj
                                                      ? widObj.QAWidObj
                                                      : {};
                                                  var HiddenBoardId = widObj
                                                    .QAWidObj.PageId
                                                    ? widObj.QAWidObj.PageId
                                                    : "SOMETHING__WRONG";
                                                  if (
                                                    HiddenBoardId !=
                                                    "SOMETHING__WRONG"
                                                  ) {
                                                    Desktop__allHiddenBoardId_Arr.push(
                                                      HiddenBoardId
                                                    );
                                                    Desktop__allHiddenBoardId__index_Arr.push(
                                                      HiddenBoardId +
                                                        "__" +
                                                        loop +
                                                        "__" +
                                                        "DESKTOP"
                                                    );
                                                  }
                                                }
                                              }

                                              //tablet viewport filter
                                              data.ViewportTabletSections.Widgets =
                                                data.ViewportTabletSections
                                                  .Widgets
                                                  ? data.ViewportTabletSections
                                                      .Widgets
                                                  : [];

                                              for (
                                                var loop = 0;
                                                loop <
                                                data.ViewportTabletSections
                                                  .Widgets.length;
                                                loop++
                                              ) {
                                                var widObj =
                                                  data.ViewportTabletSections
                                                    .Widgets[loop];
                                                if (
                                                  widObj.Type == "questAnswer"
                                                ) {
                                                  // If Widget is a QA Widget then ...
                                                  widObj.QAWidObj =
                                                    widObj.QAWidObj
                                                      ? widObj.QAWidObj
                                                      : {};
                                                  var HiddenBoardId = widObj
                                                    .QAWidObj.PageId
                                                    ? widObj.QAWidObj.PageId
                                                    : "SOMETHING_WRONG";
                                                  if (
                                                    HiddenBoardId !=
                                                    "SOMETHING__WRONG"
                                                  ) {
                                                    Tablet__allHiddenBoardId_Arr.push(
                                                      HiddenBoardId
                                                    );
                                                    Tablet__allHiddenBoardId__index_Arr.push(
                                                      HiddenBoardId +
                                                        "__" +
                                                        loop +
                                                        "__" +
                                                        "TABLET"
                                                    );
                                                  }
                                                }
                                              }

                                              //mobile viewport filter
                                              data.ViewportMobileSections.Widgets =
                                                data.ViewportMobileSections
                                                  .Widgets
                                                  ? data.ViewportMobileSections
                                                      .Widgets
                                                  : [];

                                              for (
                                                var loop = 0;
                                                loop <
                                                data.ViewportMobileSections
                                                  .Widgets.length;
                                                loop++
                                              ) {
                                                var widObj =
                                                  data.ViewportMobileSections
                                                    .Widgets[loop];
                                                if (
                                                  widObj.Type == "questAnswer"
                                                ) {
                                                  // If Widget is a QA Widget then ...
                                                  widObj.QAWidObj =
                                                    widObj.QAWidObj
                                                      ? widObj.QAWidObj
                                                      : {};
                                                  var HiddenBoardId = widObj
                                                    .QAWidObj.PageId
                                                    ? widObj.QAWidObj.PageId
                                                    : "SOMETHING__WRONG";
                                                  if (
                                                    HiddenBoardId !=
                                                    "SOMETHING__WRONG"
                                                  ) {
                                                    Mobile__allHiddenBoardId_Arr.push(
                                                      HiddenBoardId
                                                    );
                                                    Mobile__allHiddenBoardId__index_Arr.push(
                                                      HiddenBoardId +
                                                        "__" +
                                                        loop +
                                                        "__" +
                                                        "MOBILE"
                                                    );
                                                  }
                                                }
                                              }

                                              margedArrOfAllQAPageIds =
                                                Desktop__allHiddenBoardId__index_Arr.concat(
                                                  Tablet__allHiddenBoardId__index_Arr
                                                );
                                              margedArrOfAllQAPageIds =
                                                margedArrOfAllQAPageIds.concat(
                                                  Mobile__allHiddenBoardId__index_Arr
                                                );

                                              //UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

                                              allHiddenBoardId_Arr =
                                                Desktop__allHiddenBoardId_Arr.concat(
                                                  Tablet__allHiddenBoardId_Arr
                                                );
                                              allHiddenBoardId_Arr =
                                                allHiddenBoardId_Arr.concat(
                                                  Mobile__allHiddenBoardId_Arr
                                                );

                                              UNIQUE__allHiddenBoardId_Arr =
                                                allHiddenBoardId_Arr.unique();

                                              //just for testing...
                                              var finalObj = {
                                                Desktop__allHiddenBoardId__index_Arr:
                                                  Desktop__allHiddenBoardId__index_Arr,
                                                Tablet__allHiddenBoardId__index_Arr:
                                                  Tablet__allHiddenBoardId__index_Arr,
                                                Mobile__allHiddenBoardId__index_Arr:
                                                  Mobile__allHiddenBoardId__index_Arr,
                                                margedArrOfAllQAPageIds:
                                                  margedArrOfAllQAPageIds,
                                                UNIQUE__allHiddenBoardId_Arr:
                                                  UNIQUE__allHiddenBoardId_Arr,
                                              };

                                              //now create new instances of the unique hidden boards and update the PageId on corresponding entries...
                                              async.series(
                                                {
                                                  createNewInstance__HiddenBoard:
                                                    function (callback) {
                                                      if (
                                                        finalObj
                                                          .UNIQUE__allHiddenBoardId_Arr
                                                          .length
                                                      ) {
                                                        var conditions = {
                                                          _id: {
                                                            $in: finalObj.UNIQUE__allHiddenBoardId_Arr,
                                                          },
                                                        };
                                                        var fields = {
                                                          Medias: false,
                                                        };
                                                        Page.find(
                                                          conditions,
                                                          fields
                                                        )
                                                          .lean()
                                                          .exec(function (
                                                            err,
                                                            results
                                                          ) {
                                                            if (!err) {
                                                              var results =
                                                                results
                                                                  ? results
                                                                  : [];
                                                              var returnCounter = 0;
                                                              var totalOps =
                                                                results.length
                                                                  ? results.length
                                                                  : 0;
                                                              if (totalOps) {
                                                                var oldPageId =
                                                                  null;
                                                                for (
                                                                  var loop = 0;
                                                                  loop <
                                                                  totalOps;
                                                                  loop++
                                                                ) {
                                                                  oldPageId =
                                                                    results[
                                                                      loop
                                                                    ]._id;
                                                                  var newInstanceData =
                                                                    results[
                                                                      loop
                                                                    ];
                                                                  newInstanceData.OriginatedFrom =
                                                                    oldPageId;
                                                                  newInstanceData.Origin =
                                                                    "shared";

                                                                  //console.log("WTF-----------------------",oldPageId);
                                                                  delete newInstanceData._id;
                                                                  //console.log("WTF-----------------------",oldPageId);

                                                                  newInstanceData.CreatedOn =
                                                                    Date.now();
                                                                  newInstanceData.UpdatedOn =
                                                                    Date.now();
                                                                  //console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
                                                                  CreateNewInstance__HiddenBoardFunc(
                                                                    oldPageId,
                                                                    newInstanceData,
                                                                    totalOps
                                                                  );
                                                                }

                                                                function CreateNewInstance__HiddenBoardFunc(
                                                                  sourcePageId,
                                                                  dataToSave,
                                                                  totalOps
                                                                ) {
                                                                  var sourcePageId =
                                                                    sourcePageId
                                                                      ? sourcePageId
                                                                      : "SOMETHING_WRONG";
                                                                  //sourcePageId__DestinationPageId
                                                                  Page(
                                                                    dataToSave
                                                                  ).save(
                                                                    function (
                                                                      err,
                                                                      result
                                                                    ) {
                                                                      returnCounter++;
                                                                      if (
                                                                        !err
                                                                      ) {
                                                                        var sourcePageId__DestinationPageId =
                                                                          sourcePageId +
                                                                          "__" +
                                                                          result._id;
                                                                        sourcePageId__DestinationPageId__Arr.push(
                                                                          sourcePageId__DestinationPageId
                                                                        );
                                                                      } else {
                                                                        return callback(
                                                                          err
                                                                        );
                                                                      }

                                                                      if (
                                                                        totalOps ==
                                                                        returnCounter
                                                                      ) {
                                                                        callback(
                                                                          null,
                                                                          sourcePageId__DestinationPageId__Arr
                                                                        );
                                                                      }
                                                                    }
                                                                  );
                                                                }
                                                              } else {
                                                                callback(
                                                                  null,
                                                                  sourcePageId__DestinationPageId__Arr
                                                                );
                                                              }
                                                            } else {
                                                              return callback(
                                                                err
                                                              );
                                                            }
                                                          });
                                                      } else {
                                                        callback(
                                                          null,
                                                          sourcePageId__DestinationPageId__Arr
                                                        );
                                                      }
                                                    },
                                                },
                                                function (err, results) {
                                                  //results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
                                                  if (!err) {
                                                    var createNewInstance__HiddenBoardOutputArr =
                                                      results.createNewInstance__HiddenBoard
                                                        ? results.createNewInstance__HiddenBoard
                                                        : [];
                                                    for (
                                                      var loop = 0;
                                                      loop <
                                                      createNewInstance__HiddenBoardOutputArr.length;
                                                      loop++
                                                    ) {
                                                      var recordArr =
                                                        createNewInstance__HiddenBoardOutputArr[
                                                          loop
                                                        ].split("__");
                                                      var SourcePageId =
                                                        recordArr[0];
                                                      var NewPageId =
                                                        recordArr[1];

                                                      for (
                                                        var loop2 = 0;
                                                        loop2 <
                                                        finalObj
                                                          .margedArrOfAllQAPageIds
                                                          .length;
                                                        loop2++
                                                      ) {
                                                        var recordArr2 =
                                                          finalObj.margedArrOfAllQAPageIds[
                                                            loop2
                                                          ].split("__");
                                                        var SourcePageId_2 =
                                                          recordArr2[0];
                                                        var WidgetIndex =
                                                          recordArr2[1];
                                                        var Viewport =
                                                          recordArr2[2];
                                                        if (
                                                          SourcePageId_2 ==
                                                          SourcePageId
                                                        ) {
                                                          switch (Viewport) {
                                                            case "DESKTOP":
                                                              data.ViewportDesktopSections.Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj = data
                                                                .ViewportDesktopSections
                                                                .Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj
                                                                ? data
                                                                    .ViewportDesktopSections
                                                                    .Widgets[
                                                                    WidgetIndex
                                                                  ].QAWidObj
                                                                : {};
                                                              data.ViewportDesktopSections.Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj.PageId =
                                                                NewPageId;
                                                              break;

                                                            case "TABLET":
                                                              data.ViewportTabletSections.Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj = data
                                                                .ViewportTabletSections
                                                                .Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj
                                                                ? data
                                                                    .ViewportTabletSections
                                                                    .Widgets[
                                                                    WidgetIndex
                                                                  ].QAWidObj
                                                                : {};
                                                              data.ViewportTabletSections.Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj.PageId =
                                                                NewPageId;
                                                              break;

                                                            case "MOBILE":
                                                              data.ViewportMobileSections.Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj = data
                                                                .ViewportMobileSections
                                                                .Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj
                                                                ? data
                                                                    .ViewportMobileSections
                                                                    .Widgets[
                                                                    WidgetIndex
                                                                  ].QAWidObj
                                                                : {};
                                                              data.ViewportMobileSections.Widgets[
                                                                WidgetIndex
                                                              ].QAWidObj.PageId =
                                                                NewPageId;
                                                              break;
                                                          }
                                                        }
                                                      }
                                                    }
                                                  } else {
                                                  }

                                                  Page(data).save(function (
                                                    err,
                                                    result
                                                  ) {
                                                    if (!err) {
                                                    } else {
                                                    }
                                                  });
                                                }
                                              );
                                            } else {
                                              Page(data).save(function (
                                                err,
                                                result
                                              ) {
                                                if (!err) {
                                                } else {
                                                }
                                              });
                                            }
                                          }
                                        );
                                      }
                                    } else {
                                      var response = {
                                        status: 501,
                                        message: "Something went wrong.",
                                      };
                                      res.json(response);
                                    }
                                  });
                              } else {
                                var response = {
                                  status: 501,
                                  message: "Something went wrong.",
                                };
                                res.json(response);
                              }
                            });
                          } else {
                            var response = {
                              status: 501,
                              message: "Something went wrong.",
                            };
                            res.json(response);
                          }
                        }
                      );
                    }
                  } else {
                    var response = {
                      status: 501,
                      message: "Something went wrong.",
                    };
                    res.json(response);
                  }
                });

                var response = {
                  status: 200,
                  message: "Capsule shared successfully.",
                  result: result,
                };
                res.json(response);
                var condition = {};
                condition.name = "Share__Capsule";

                EmailTemplate.find(condition, {}, function (err, results) {
                  if (!err) {
                    if (results.length) {
                      var RecipientName = shareWithName ? shareWithName : "";
                      User.find(
                        { Email: shareWithEmail },
                        { Name: true },
                        function (err, name) {
                          if (name.length > 0) {
                            var name = name[0].Name
                              ? name[0].Name.split(" ")
                              : "";
                            RecipientName = name[0];
                          }

                          var SharedByUserName = req.session.user.Name
                            ? req.session.user.Name.split(" ")[0]
                            : "";

                          var newHtml = results[0].description.replace(
                            /{SharedByUserName}/g,
                            SharedByUserName
                          );
                          newHtml = newHtml.replace(
                            /{CapsuleName}/g,
                            data.Title
                          );
                          newHtml = newHtml.replace(
                            /{RecipientName}/g,
                            RecipientName
                          );

                          /*
												var transporter = nodemailer.createTransport({
													service: 'Gmail',
													auth: {
														user: 'collabmedia.scrpt@gmail.com',
														pass: 'scrpt123_2014collabmedia#1909'
													}
												}); 
												*/
                          /*
												var options = {
													service: 'Godaddy',
													auth: {
														user: 'info@scrpt.com',
														pass: 'TaKe1Off13!MpdC'
													}
												};
												*/
                          var transporter = nodemailer.createTransport(
                            smtpTransport(process.EMAIL_ENGINE.info.smtpOptions)
                          );

                          var to = shareWithEmail;
                          results[0].subject =
                            typeof results[0].subject == "string"
                              ? results[0].subject
                              : "";
                          var subject = results[0].subject.replace(
                            /{SharedByUserName}/g,
                            SharedByUserName
                          );

                          var mailOptions = {
                            //from: "Scrpt <collabmedia.scrpt@gmail.com>",
                            from: process.EMAIL_ENGINE.info.senderLine,
                            to: to,
                            subject:
                              subject != ""
                                ? subject
                                : "Scrpt - " +
                                  req.session.user.Name +
                                  " has shared a Capsule with you!",
                            html: newHtml,
                          };

                          transporter.sendMail(
                            mailOptions,
                            function (error, info) {
                              if (error) {
                              } else {
                              }
                            }
                          );
                        }
                      );
                    }
                  }
                });
              } else {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              }
            });
          } else {
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          }
        });
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

/*________________________________________________________________________
   * @Date:      		25 Aug 2015
   * @Method :   		uploadCover
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var uploadCover = async function (req, res) {
  try {
    // Check if user is authenticated
    if (!req.session?.user?._id) {
      return res.json({
        code: "401",
        message: "Authentication required. Please login first.",
      });
    }

    const awsS3Utils = require("../utilities/awsS3Utils");
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, async function (err, fields, files) {
      try {
        // Check if capsule_id is provided FIRST - check both form fields and headers
        var capsuleId =
          fields.capsule_id ||
          fields.capsuleId ||
          fields.capsuleId ||
          req.headers.capsule_id ||
          req.headers["capsule_id"] ||
          req.headers["capsule-id"] ||
          req.headers["capsuleId"];

        console.log("=== CAPSULE ID DEBUG ===");
        console.log("fields.capsule_id:", fields.capsule_id);
        console.log("fields.capsuleId:", fields.capsuleId);
        console.log("req.headers.capsule_id:", req.headers.capsule_id);
        console.log("req.headers['capsule_id']:", req.headers["capsule_id"]);
        console.log("req.headers['capsule-id']:", req.headers["capsule-id"]);
        console.log("req.headers['capsuleId']:", req.headers["capsuleId"]);
        console.log("Final capsuleId:", capsuleId);

        if (!capsuleId) {
          return res.json({
            code: "400",
            message:
              "capsule_id is required. Please provide capsule_id in the form data or headers.",
          });
        }

        // Authorization check - fetch capsule and verify ownership
        const capsule = await Capsule.findOne({
          _id: capsuleId,
          Status: true,
          IsDeleted: false
        });

        if (!capsule) {
          return res.json({
            code: "404",
            message: "Capsule not found or has been deleted.",
          });
        }

        // Authorization check based on role
        const userRole = req.session.user.Role || 'user';
        const userId = req.session.user._id.toString();
        const isOwner = capsule.OwnerId && capsule.OwnerId.toString() === userId;
        const isCreator = capsule.CreaterId && capsule.CreaterId.toString() === userId;

        let authorized = false;

        if (userRole === 'admin' || userRole === 'subadmin') {
          // Admin/SubAdmin: Can edit if they are either creator OR owner
          authorized = isCreator || isOwner;
          console.log('🔐 Admin/SubAdmin authorization for cover upload:', {
            role: userRole,
            isCreator,
            isOwner,
            authorized
          });
        } else {
          // Normal user: Can only edit if they are the owner
          authorized = isOwner;
          console.log('🔐 User authorization for cover upload:', {
            role: userRole,
            isOwner,
            authorized
          });
        }

        if (!authorized) {
          return res.json({
            code: "403",
            message: "You don't have permission to edit this stream. Only the owner can edit.",
          });
        }

        // Check for different possible field names
        var uploadedFile = null;
        var fieldName = null;

        // Common field names for file uploads
        const possibleFieldNames = [
          "file",
          "coverImage",
          "image",
          "upload",
          "photo",
        ];

        for (const name of possibleFieldNames) {
          if (files[name]) {
            // Handle both single file and array of files
            if (Array.isArray(files[name])) {
              uploadedFile = files[name][0]; // Take first file if array
            } else {
              uploadedFile = files[name];
            }
            fieldName = name;
            break;
          }
        }

        if (!uploadedFile) {
          return res.json({
            code: "400",
            message:
              "No file uploaded. Please send a file with one of these field names: " +
              possibleFieldNames.join(", "),
          });
        }

        // Create a temporary file object for AWS S3 upload
        const tempFile = {
          path: uploadedFile.filepath,
          originalname: uploadedFile.originalFilename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        };

        // Upload to AWS S3 - capsuleMedia/covers/ folder with 600px size only
        const uploadResult = await awsS3Utils.uploadImageToMultipleSizes(
          tempFile,
          `${capsuleId}_${Date.now()}`,
          ["600"], // Only 600px size as requested
          {
            "capsule-id": capsuleId,
            "upload-type": "cover-image",
            "original-filename": uploadedFile.originalFilename,
          },
          "capsuleMedia/covers" // Custom folder structure
        );

        if (!uploadResult.success) {
          return res.json({
            code: "500",
            message: "Error uploading cover image to S3",
            error: uploadResult.error,
          });
        }

        // Get the 600px image URL
        const coverImageUrl = uploadResult.uploads[0].fileUrl; // S3 URI format
        const coverImageDirectUrl = uploadResult.uploads[0].fileUrl.replace(
          "s3://",
          "https://scrpt.s3.us-east-1.amazonaws.com/"
        );

        // Update Capsule's CoverArt field with S3 URL
        var conditions = { _id: capsuleId };
        var data = {
          $set: {
            CoverArt: coverImageUrl, // Store S3 URI
            CoverArtDirectUrl: coverImageDirectUrl, // Store direct HTTPS URL
            ModifiedOn: Date.now(),
          },
        };

        const updateResult = await Capsule.updateOne(conditions, data).exec();

        var response = {
          status: 200,
          message: "Capsule cover uploaded successfully to AWS S3.",
          result: {
            s3Url: coverImageUrl,
            directUrl: coverImageDirectUrl,
            capsuleId: capsuleId,
            size: "600px",
            uploadDetails: uploadResult.uploads[0],
          },
        };
        res.json(response);
      } catch (error) {
        res.json({
          code: "500",
          message: "Error uploading cover image",
          error: error.message,
        });
      }
    });
  } catch (error) {
    res.json({
      code: "500",
      message: "Error in uploadCover function",
      error: error.message,
    });
  }
};

// saveSettings function removed - duplicate found at line 3847 (modernized version)

/*________________________________________________________________________
   * @Date:      		26 Aug 2015
   * @Method :   		invite
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var invite = function (req, res) {
  var capsule_id = req.headers.capsule_id;
  var invitee = {};
  invitee.email = req.body.invitee.email ? req.body.invitee.email : "";
  invitee.name = req.body.invitee.name ? req.body.invitee.name : "";
  invitee.relation = req.body.invitee.relation ? req.body.invitee.relation : "";
  var rel = invitee.relation;
  rel = rel.split("~");

  if (new RegExp(invitee.email, "i").test(req.session.user.Email)) {
    var response = {
      status: 402,
      message: "Can not invite yourself.",
    };
    res.json(response);
  } else {
    Capsule.find(
      {
        _id: capsule_id,
        "LaunchSettings.Invitees": {
          $elemMatch: { UserEmail: { $regex: new RegExp(invitee.email, "i") } },
        },
      },
      function (errr, dataa) {
        if (errr) {
          var response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        } else {
          if (dataa.length == 0) {
            User.findOne(
              { Email: { $regex: new RegExp(invitee.email, "i") } },
              function (err, data) {
                if (err) {
                  var response = {
                    status: 501,
                    message: "Something went wrong.",
                  };
                  res.json(response);
                } else {
                  if (data != undefined && data != null) {
                    var newInvitee = {};
                    newInvitee.UserID = data._id;
                    newInvitee.UserEmail = data.Email;
                    newInvitee.UserName = invitee.name;
                    newInvitee.UserNickName = data.NickName;
                    newInvitee.CreatedOn = Date.now();
                    newInvitee.Relation = rel[0].trim();
                    newInvitee.RelationId = rel[1].trim();
                    newInvitee.UserPic = data.ProfilePic;
                    newInvitee.IsRegistered = true;
                    var userPic = data.ProfilePic;

                    Friend.find(
                      {
                        UserID: req.session.user._id,
                        "Friend.Email": {
                          $regex: new RegExp(invitee.email, "i"),
                        },
                        Status: 1,
                        IsDeleted: 0,
                      },
                      function (err1, data2) {
                        if (err1) {
                          var response = {
                            status: 501,
                            message: "Something went wrong.",
                          };
                          res.json(response);
                        } else {
                          if (data2.length > 0) {
                            //do nothing
                          } else {
                            //call function to add member

                            var newFriendData = {};
                            newFriendData.ID = newInvitee.UserID;
                            newFriendData.Email = newInvitee.UserEmail;
                            newFriendData.Name = newInvitee.UserName;
                            newFriendData.NickName = newInvitee.UserNickName;
                            newFriendData.Pic = userPic;
                            newFriendData.Relation = rel[0].trim();
                            newFriendData.RelationID = rel[1].trim();

                            var friendship = new Friend();
                            friendship.UserID = req.session.user._id;
                            friendship.Friend = newFriendData;
                            friendship.Status = 1;
                            friendship.IsDeleted = 0;
                            friendship.CreatedOn = Date.now();
                            friendship.ModifiedOn = Date.now();
                            friendship.save(function (err4, data) {
                              if (err4) {
                                console.log(err4);
                              }
                            });
                          }

                          Capsule.update(
                            { _id: capsule_id },
                            {
                              $push: { "LaunchSettings.Invitees": newInvitee },
                            },
                            { multi: false },
                            function (err, data3) {
                              if (err) {
                                var response = {
                                  status: 501,
                                  message: "Something went wrong.",
                                };
                                res.json(response);
                              } else {
                                var response = {
                                  status: 200,
                                  message: "user invited sucessfully",
                                  result: data3,
                                };
                                res.json(response);
                              }
                            }
                          );
                        }
                      }
                    );
                  } else {
                    var newInvitee = {};
                    newInvitee.UserEmail = invitee.email;
                    newInvitee.UserName = invitee.name;
                    newInvitee.CreatedOn = Date.now();
                    newInvitee.Relation = rel[0].trim();
                    newInvitee.RelationId = rel[1].trim();
                    newInvitee.IsRegistered = false;

                    Capsule.update(
                      { _id: capsule_id },
                      { $push: { "LaunchSettings.Invitees": newInvitee } },
                      { multi: false },
                      function (err, data3) {
                        if (err) {
                          var response = {
                            status: 501,
                            message: "Something went wrong.",
                          };
                          res.json(response);
                        } else {
                          var response = {
                            status: 200,
                            message: "user invited sucessfully",
                            result: data3,
                          };
                          res.json(response);
                        }
                      }
                    );
                  }
                }
              }
            );
          } else {
            var response = {
              status: 401,
              message: "already invited",
            };
            res.json(response);
          }
        }
      }
    );
  }
};

/*________________________________________________________________________
   * @Date:      		1 Oct 2015
   * @Method :   		inviteMember
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var inviteMember = function (req, res) {
  var capsule_id = req.headers.capsule_id;
  var member = req.body.member ? req.body.member : "";
  Capsule.find(
    {
      _id: capsule_id,
      "LaunchSettings.Invitees": {
        $elemMatch: {
          UserEmail: { $regex: new RegExp(member.UserEmail, "i") },
        },
      },
    },
    function (errr, dataa) {
      if (errr) {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      } else {
        if (dataa.length == 0) {
          Capsule.update(
            { _id: capsule_id },
            { $push: { "LaunchSettings.Invitees": member } },
            { multi: false },
            function (err, data3) {
              if (err) {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              } else {
                var response = {
                  status: 200,
                  message: "user invited sucessfully",
                  result: data3,
                };
                res.json(response);
              }
            }
          );
        } else {
          var response = {
            status: 401,
            message: "already invited",
          };
          res.json(response);
        }
      }
    }
  );
};

/*________________________________________________________________________
   * @Date:      		1 Oct 2015
   * @Method :   		removeInvitee
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var removeInvitee = function (req, res) {
  var capsule_id = req.headers.capsule_id;
  var member = req.body.member ? req.body.member : "";
  Capsule.find(
    {
      _id: capsule_id,
      "LaunchSettings.Invitees": {
        $elemMatch: {
          UserEmail: { $regex: new RegExp(member.UserEmail, "i") },
        },
      },
    },
    function (errr, dataa) {
      if (errr) {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      } else {
        if (dataa.length == 0) {
          var response = {
            status: 401,
            message: "not a member",
          };
          res.json(response);
        } else {
          Capsule.update(
            { _id: capsule_id },
            {
              $pull: {
                "LaunchSettings.Invitees": {
                  UserEmail: { $regex: new RegExp(member.UserEmail, "i") },
                },
              },
            },
            { multi: false },
            function (err, data) {
              if (err) {
                var response = {
                  status: 502,
                  message: "something went wrong",
                };
                res.json(response);
              } else {
                var response = {
                  status: 200,
                  message: "user deleted sucessfully",
                  result: data,
                };
                res.json(response);
              }
            }
          );
        }
      }
    }
  );
};
// //upload menu icon for capsule by arun sahani

var uploadMenuIcon = async function (req, res) {
  try {
    console.log('🎨 uploadMenuIcon called - Auth debug:', {
      hasUser: !!req.user,
      hasSessionUser: !!(req.session && req.session.user),
      userId: req.session?.user?._id,
      role: req.session?.user?.Role
    });

    // Check if user is authenticated
    if (!req.session?.user?._id) {
      return res.json({
        code: "401",
        message: "Authentication required. Please login first.",
      });
    }

    const awsS3Utils = require("../utilities/awsS3Utils");
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, async function (err, fields, files) {
      try {
        console.log("fields  --", fields);
        console.log("Files  --", files);
        console.log("headers --", req.headers);

        // Check if capsule_id is provided FIRST - check both form fields and headers
        var capsuleId =
          fields.capsule_id ||
          req.headers.capsule_id ||
          req.headers["capsule_id"];

        if (!capsuleId) {
          return res.json({
            code: "400",
            message:
              "capsule_id is required. Please provide capsule_id in the form data or headers.",
          });
        }

        // Authorization check - fetch capsule and verify ownership
        const capsule = await Capsule.findOne({
          _id: capsuleId,
          Status: true,
          IsDeleted: false
        });

        if (!capsule) {
          return res.json({
            code: "404",
            message: "Capsule not found or has been deleted.",
          });
        }

        // Authorization check based on role
        const userRole = req.session.user.Role || 'user';
        const userId = req.session.user._id.toString();
        const isOwner = capsule.OwnerId && capsule.OwnerId.toString() === userId;
        const isCreator = capsule.CreaterId && capsule.CreaterId.toString() === userId;

        let authorized = false;

        if (userRole === 'admin' || userRole === 'subadmin') {
          // Admin/SubAdmin: Can edit if they are either creator OR owner
          authorized = isCreator || isOwner;
          console.log('🔐 Admin/SubAdmin authorization for menu icon upload:', {
            role: userRole,
            isCreator,
            isOwner,
            authorized
          });
        } else {
          // Normal user: Can only edit if they are the owner
          authorized = isOwner;
          console.log('🔐 User authorization for menu icon upload:', {
            role: userRole,
            isOwner,
            authorized
          });
        }

        if (!authorized) {
          return res.json({
            code: "403",
            message: "You don't have permission to edit this stream. Only the owner can edit.",
          });
        }

        // Check for different possible field names
        var uploadedFile = null;
        var fieldName = null;

        // Common field names for file uploads
        const possibleFieldNames = [
          "myFile",
          "menuIcon",
          "file",
          "image",
          "upload",
          "photo",
        ];

        for (const name of possibleFieldNames) {
          if (files[name]) {
            // Handle both single file and array of files
            if (Array.isArray(files[name])) {
              uploadedFile = files[name][0]; // Take first file if array
            } else {
              uploadedFile = files[name];
            }
            fieldName = name;
            break;
          }
        }

        if (!uploadedFile || !uploadedFile.originalFilename) {
          return res.json({
            code: "400",
            message:
              "No file uploaded. Please send a file with one of these field names: " +
              possibleFieldNames.join(", "),
          });
        }

        // Create a temporary file object for AWS S3 upload
        const tempFile = {
          path: uploadedFile.filepath,
          originalname: uploadedFile.originalFilename,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        };

        // Upload to AWS S3 - capsuleMedia/icons/ folder with 300px size (good for menu icons)
        const uploadResult = await awsS3Utils.uploadImageToMultipleSizes(
          tempFile,
          `${capsuleId}_${Date.now()}`,
          ["300"], // 300px size for menu icons
          {
            "capsule-id": capsuleId,
            "upload-type": "menu-icon",
            "original-filename": uploadedFile.originalFilename,
          },
          "capsuleMedia/icons" // Custom folder structure
        );

        if (!uploadResult.success) {
          return res.json({
            code: "500",
            message: "Error uploading menu icon to S3",
            error: uploadResult.error,
          });
        }

        // Get the 300px image URL
        const menuIconUrl = uploadResult.uploads[0].fileUrl; // S3 URI format
        const menuIconDirectUrl = uploadResult.uploads[0].fileUrl.replace(
          "s3://",
          "https://scrpt.s3.us-east-1.amazonaws.com/"
        );

        // Update Capsule's MenuIcon field with S3 URL
        var conditions = { _id: capsuleId };
        var data = {
          $set: {
            MenuIcon: menuIconUrl, // Store S3 URI
            MenuIconDirectUrl: menuIconDirectUrl, // Store direct HTTPS URL
            ModifiedOn: Date.now(),
          },
        };

        const updateResult = await Capsule.updateOne(conditions, data).exec();

        var response = {
          status: 200,
          message: "Capsule menu icon uploaded successfully to AWS S3.",
          result: {
            s3Url: menuIconUrl,
            directUrl: menuIconDirectUrl,
            capsuleId: capsuleId,
            size: "300px",
            uploadDetails: uploadResult.uploads[0],
          },
        };
        res.json(response);
      } catch (error) {
        res.json({
          code: "500",
          message: "Error uploading menu icon",
          error: error.message,
        });
      }
    });
  } catch (error) {
    res.json({
      code: "500",
      message: "Error in uploadMenuIcon function",
      error: error.message,
    });
  }
};

var resize_image = function (srcPath, dstPath, w, h) {
  try {
    im.identify(srcPath, function (err, features) {
      if (err) {
      } else {
        if (features.height >= 50) {
          im.resize({
            srcPath: srcPath,
            dstPath: dstPath,
            //width: w,
            height: h,
            //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
            //gravity: 'Center' // optional: position crop area when using 'aspectfill'
          });
        } else if (features.width >= 50) {
          im.resize({
            srcPath: srcPath,
            dstPath: dstPath,
            width: w,
            //height: 1440,
            //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
            //gravity: 'Center' // optional: position crop area when using 'aspectfill'
          });
        } else {
          im.resize({
            srcPath: srcPath,
            dstPath: dstPath,
            width: features.width,
            height: features.height,
            //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
            //gravity: 'Center' // optional: position crop area when using 'aspectfill'
          });
        }
      }
    });
  } catch (e) {}
};

// to delete menu icon of capsule

var delMenuIcon = function (req, res) {
  var conditions = {},
    fields = {};

  conditions._id = req.body.capsule_id;
  fields.MenuIcon = null;
  fields.ModifiedOn = Date.now();
  Capsule.update(conditions, { $set: fields }, function (err, numAffected) {
    if (!err) {
      var response = {
        status: 200,
        message: "Menu icon deleted successfully.",
        result: numAffected,
      };
      res.json(response);
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};
var delCoverArt = function (req, res) {
  var conditions = {},
    fields = {};

  conditions._id = req.body.capsule_id;
  fields.CoverArt = null;
  fields.ModifiedOn = Date.now();
  Capsule.update(conditions, { $set: fields }, function (err, numAffected) {
    if (!err) {
      var response = {
        status: 200,
        message: "CoverArt deleted successfully.",
        result: numAffected,
      };
      res.json(response);
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

var updateCapsuleForChapterId = function (req, res) {
  var conditionsIntial = {
    _id: req.headers.capsule_id,
  };
  Capsule.findOne(conditionsIntial).exec(function (err, results) {
    if (err) {
    } else {
      if (results.Chapters.length) {
        var response = {
          status: 200,
          message: "Already updated.",
          result: results.length,
        };
        res.json(response);
      } else {
        var conditions = {
          CapsuleId: req.headers.capsule_id,
        };
        var fields = {};
        Chapter.find(conditions, fields).exec(function (err, results) {
          if (err) {
          } else {
            console.log("Searching:", results);
            var conditions = {
              _id: req.headers.capsule_id,
            };
            var chapterCount = 0;
            if (results.length) {
              for (var i = 0; i < results.length; i++) {
                Capsule.update(
                  { _id: conditions._id },
                  { $push: { Chapters: results[i]._id } },
                  function (err, data) {
                    if (err) {
                    } else {
                    }
                  }
                );
                chapterCount++;
              }

              if (chapterCount == results.length) {
                var response = {
                  status: 200,
                  message: "Capsule updated successfully.",
                  result: results.length,
                };
                res.json(response);
              }
            } else {
              var response = {
                status: 200,
                message: "No chapter exists.",
                result: results.length,
              };
              res.json(response);
            }
          }
        });
      }
    }
  });
};

/*________________________________________________________________________
 * @Date:      		
 * @Method :   		
 * Created By: 		smartData Enterprises Ltd
 * Modified On:		-
 * @Purpose:
 * @Param:     		2
 * @Return:    	 	yes
 * @Access Category:	"UR"
 _________________________________________________________________________
 */

var getIds = function (req, res) {
  var conditions = {
    $or: [
      {
        CreaterId: req.session.user._id,
        Origin: "created",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
      {
        CreaterId: req.session.user._id,
        Origin: "duplicated",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
      {
        CreaterId: req.session.user._id,
        Origin: "addedFromLibrary",
        IsPublished: true,
        "LaunchSettings.Audience": "ME",
      },
    ],
    Status: true,
    IsDeleted: false,
  };

  var fields = {
    Title: 1,
    Origin: 1,
    CreaterId: 1,
    IsPublished: 1,
    LaunchSettings: 1,
  };
  //console.log('***',conditions);
  Capsule.find(conditions, fields).exec(function (err, results) {
    if (!err) {
      var response = {
        status: 200,
        message: "Capsules listing",
        result: results,
      };
      res.json(response);
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

var saveMetaDataSettings = async function (req, res) {
  try {
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers."
      });
    }

    if (!req.body.MetaData) {
      return res.json({
        status: 400,
        message: "MetaData is required in body."
      });
    }

    var condition = { _id: req.headers.capsule_id };
    var metadata = req.body.MetaData;

    const result = await Capsule.updateOne(
      condition,
      { $set: { MetaData: metadata, ModifiedOn: Date.now() } }
    );

    if (result.matchedCount === 0) {
      return res.json({
        status: 404,
        message: "Capsule not found."
      });
    }

    const updatedCapsule = await Capsule.findById(req.headers.capsule_id).select('MetaData');

    var response = {
      status: 200,
      message: "Capsule metadata updated successfully.",
      result: updatedCapsule ? updatedCapsule.MetaData : metadata
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    var response = {
      status: 501,
      message: "Something went wrong."
    };
    res.json(response);
  }
};

var saveMetaDataFsg = async function (req, res) {
  try {
    var capsuleId = req.body.capsuleId || req.headers.capsule_id;
    
    if (!capsuleId) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in body or headers."
      });
    }

    if (!req.body.temp || !req.body.temp.FSGsArr) {
      return res.json({
        status: 400,
        message: "FSGsArr is required in body.temp"
      });
    }

    var condition = { _id: capsuleId };
    var metadata = req.body.temp;

    const result = await Capsule.updateOne(
      condition,
      { $set: { "MetaData.Fsg": metadata.FSGsArr, ModifiedOn: Date.now() } }
    );

    if (result.matchedCount === 0) {
      return res.json({
        status: 404,
        message: "Capsule not found."
      });
    }

    const updatedCapsule = await Capsule.findById(capsuleId).select('MetaData');

    var response = {
      status: 200,
      message: "Capsule FSG tags updated successfully.",
      result: updatedCapsule ? updatedCapsule.MetaData : metadata.FSGsArr
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    var response = {
      status: 501,
      message: "Something went wrong.",
      error: err.message
    };
    res.json(response);
  }
};

var savePhaseFocusKey = function (req, res) {
  var condition = {};
  condition._id = req.body.capsuleId ? req.body.capsuleId : "0";
  var type = req.body.type ? req.body.type : "Phase";
  //console.log('******************************',req.body);
  if (req.body.temp) {
    if (type) {
      if (type == "Phase") {
        var data = { "MetaData.phase": req.body.temp };
      } else if (type == "Focus") {
        var data = { "MetaData.focus": req.body.temp };
      } else if (type == "Keywords") {
        var data = { "MetaData.keywords": req.body.temp };
      }

      //var metadata = req.body.temp;
      console.log(data); //return
      Capsule.update(
        condition,
        { $set: data },
        { multi: false },
        function (err, numAffected) {
          if (!err) {
            Capsule.findOne(condition, function (err, capsule) {
              if (!err) {
                var response = {
                  status: 200,
                  message: "Capsule settings updated successfully.",
                  result: capsule.MetaData,
                };
                res.json(response);
              }
            });
          } else {
            var response = {
              status: 501,
              message: "Something went wrong.",
              error: err,
            };
            res.json(response);
          }
        }
      );
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  } else {
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

var getUniqueIds = function (req, res) {
  var requiredIds = req.query.requiredIds ? req.query.requiredIds : 0;
  var uniqueIds = [];
  if (requiredIds.length) {
    for (var j = 0; j < requiredIds; j++) {
      var text = "";
      var possible =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

      for (var i = 0; i < 12; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      uniqueIds.push(text);
    }
    var response = {
      status: 200,
      message: "Unique Ids received.",
      result: uniqueIds,
    };
  } else {
    var response = {
      status: 501,
      message: "Something went wrong.",
      result: uniqueIds,
    };
  }
  res.json(response);
};

var getCreaterName = function (req, res) {
  var conditions = {};
  conditions._id = req.query.userId;
  var fields = {
    _id: 1,
    Name: 1,
  };

  User.findOne(conditions, function (err, user) {
    var response = {
      status: 200,
      message: "User Data retrieved successfully",
      user: user,
    };
    res.json(response);
  });
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		findAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var allUnverifiedCapsules = function (req, res) {
  req.session = req.session ? req.session : {};
  req.session.user = req.session.user ? req.session.user : {};
  req.session.user.Email = req.session.user.Email
    ? req.session.user.Email
    : null;

  if (
    req.session.user.Email != null &&
    process.CAPSULE_VERIFIER.indexOf(req.session.user.Email) >= 0
  ) {
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    var conditions = {
      "LaunchSettings.Audience": "BUYERS",
      IsPublished: true,
      IsAllowedForSales: false,
      Status: true,
      IsDeleted: false,
    };

    var sortObj = {
      ModifiedOn: -1,
    };

    var fields = {};

    Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec(function (err, results) {
        if (!err) {
          Capsule.find(conditions, fields)
            .count()
            .exec(function (errr, resultsLength) {
              if (!errr) {
                var response = {
                  count: resultsLength,
                  status: 200,
                  message: "Capsules listing",
                  results: results,
                };
                res.json(response);
              } else {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              }
            });
        } else {
          var response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        }
      });
  } else {
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		findAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var allPublicCapsules = function (req, res) {
  console.log('🔍 allPublicCapsules function called');
  // Support both GET (query params) and POST (body params)
  const limit = req.body.perPage || req.query.perPage ? parseInt(req.body.perPage || req.query.perPage) : 20;
  const offset = req.body.pageNo || req.query.pageNo ? (parseInt(req.body.pageNo || req.query.pageNo) - 1) * limit : 0;

  const conditions = {
    "LaunchSettings.Audience": "BUYERS",
    IsPublished: true,
    IsLaunched: true,  // Only show launched streams
    IsAllowedForSales: true,
    Status: true,
    IsDeleted: false,
  };
  
  console.log('📋 allPublicCapsules conditions:', JSON.stringify(conditions, null, 2));

  const sortObj = {
    ModifiedOn: -1,
  };

  const fields = {};

  // Special users who can see all capsules including restricted ones
  const specialUsers = [
    "manishpodiyal@gmail.com",
    "manishpodiyal@yopmail.com",
    "darshanchitrabhanu@gmail.com",
    "scrptco@gmail.com",
    "darshannyc@gmail.com"
  ];

  // Don't show "The Elements" capsule to regular users (non-special users)
  if (req.session && req.session.user && specialUsers.indexOf(req.session.user.Email) < 0) {
    conditions._id = { $nin: [new mongoose.Types.ObjectId("60749d76d308334419f2fcf1")] };
  }

  Capsule.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec()
    .then(function (results) {
      Capsule.find(conditions, fields)
        .countDocuments()
        .exec()
        .then(function (resultsLength) {
          const response = {
            count: resultsLength,
            status: 200,
            message: "Capsules listing",
            results: results,
          };
          res.json(response);
        })
        .catch(function (err) {
          const response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        });
    })
    .catch(function (err) {
      const response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    });
};
/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		galleryCapsulesList
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   		Get all capsules for gallery display
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/
// Get all posts from a capsule (chapters -> pages -> media)
var getCapsulePosts = async function (req, res) {
  try {
    const capsuleId = req.headers.capsule_id || req.body.capsuleId;

    if (!capsuleId) {
      return res.json({ code: "400", message: "capsule_id is required" });
    }

    // Build aggregation pipeline
    const pipeline = [
      // Start with chapters that belong to this capsule
      {
        $match: {
          CapsuleId: new mongoose.Types.ObjectId(capsuleId),
          IsDeleted: { $ne: true },
        },
      },
      // Unwind the pages array to get individual page IDs
      {
        $unwind: {
          path: "$pages",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Lookup the actual page documents
      {
        $lookup: {
          from: "Pages",
          localField: "pages",
          foreignField: "_id",
          as: "pageDoc",
        },
      },
      // Unwind page documents
      {
        $unwind: {
          path: "$pageDoc",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Filter out deleted pages
      {
        $match: {
          "pageDoc.IsDeleted": { $ne: true },
        },
      },
      // Unwind the Medias array to get individual media items
      {
        $unwind: {
          path: "$pageDoc.Medias",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Lookup the actual media documents
      {
        $lookup: {
          from: "media",
          let: { mediaId: "$pageDoc.Medias" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$mediaId" }] },
              },
            },
          ],
          as: "mediaDoc",
        },
      },
      // Unwind media documents
      {
        $unwind: {
          path: "$mediaDoc",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Filter out media documents that don't exist (empty mediaDoc)
      {
        $match: {
          mediaDoc: { $exists: true, $ne: null },
        },
      },
      // Filter by media type if provided (but skip if type is "all")
      ...(req.body.type && req.body.type !== "all"
        ? [
            {
              $match: {
                $or: [
                  { "mediaDoc.MediaType": req.body.type },
                  ...(req.body.type === "Image"
                    ? [
                        {
                          "mediaDoc.MediaType": "Link",
                          "mediaDoc.LinkType": "image",
                        },
                        { "mediaDoc.MediaType": "1MJPost" },
                        { "mediaDoc.MediaType": "2MJPost" },
                        { "mediaDoc.MediaType": "1UnsplashPost" },
                        { "mediaDoc.MediaType": "2UnsplashPost" },
                      ]
                    : []),
                  ...(req.body.type === "Video"
                    ? [
                        {
                          "mediaDoc.MediaType": "Link",
                          "mediaDoc.LinkType": { $ne: "image" },
                        },
                        { "mediaDoc.MediaType": "Video" },
                        { "mediaDoc.MediaType": "Audio" },
                      ]
                    : []),
                  ...(req.body.type === "Audio"
                    ? [
                        { "mediaDoc.MediaType": "Audio" },
                      ]
                    : []),
                  // E-book filter
                  ...(req.body.type === "E-book"
                    ? [
                        {
                          "mediaDoc.MediaType": "Link",
                          "mediaDoc.LinkType": "E-book",
                        },
                      ]
                    : []),
                ],
              },
            },
          ]
        : []),
      // If isEbook flag is set, filter for e-book posts only (Chapters → Pages → Media)
      ...(req.body.isEbook || req.query.isEbook === 'true' || req.query.isEbook === true
        ? [
            {
              $match: {
                "mediaDoc.MediaType": "Link",
                "mediaDoc.LinkType": "E-book",
              },
            },
          ]
        : []),
      // Filter by group tag if provided (handle both string array and object array formats)
      ...(req.body.selectedKeyword
        ? [
            {
              $match: {
                $or: [
                  { "mediaDoc.GroupTags.GroupTagID": req.body.selectedKeyword },
                  { "mediaDoc.GroupTags": req.body.selectedKeyword },
                ],
              },
            },
          ]
        : []),
      // Project media document as root with pageId included
      {
        $replaceRoot: { 
          newRoot: {
            $mergeObjects: [
              "$mediaDoc",
              { 
                pageId: "$pageDoc._id",
                pageTitle: "$pageDoc.Title"
              }
            ]
          }
        },
      },
      // Sort by upload date (newest first)
      {
        $sort: { UploadedOn: -1 },
      },
      // Apply pagination
      {
        $skip: req.body.skip || 0,
      },
      {
        $limit: req.body.limit || 20,
      },
      // Lookup interactions for each post
      {
        $lookup: {
          from: "MediaActionLogs",
          localField: "_id",
          foreignField: "MediaId",
          as: "interactions",
        },
      },
      // Unwind interactions
      {
        $unwind: {
          path: "$interactions",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add field to mark which interactions need user data
      {
        $addFields: {
          "interactions.needsUserData": {
            $eq: ["$interactions.Action", "Comment"],
          },
        },
      },
      // Lookup user data only for comments
      {
        $lookup: {
          from: "users",
          let: {
            userId: "$interactions.UserId",
            needsUser: "$interactions.needsUserData",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$userId"] },
                    { $eq: ["$$needsUser", true] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                Name: 1,
                UserName: 1,
                Email: 1,
                ProfilePic: 1,
              },
            },
          ],
          as: "interactions.user",
        },
      },
      // Group by post ID to aggregate interactions
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          interactions: { $push: "$interactions" },
        },
      },
      // Replace root with post data
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { interactions: "$interactions" }],
          },
        },
      },
      // Add interaction counts and separate arrays
      {
        $addFields: {
          likes: {
            $filter: {
              input: "$interactions",
              cond: {
                $and: [
                  { $eq: ["$$this.Action", "Vote"] },
                  { $eq: ["$$this.LikeType", "1"] },
                  { $eq: ["$$this.IsDeleted", false] },
                ],
              },
            },
          },
          dislikes: {
            $filter: {
              input: "$interactions",
              cond: {
                $and: [
                  { $eq: ["$$this.Action", "Vote"] },
                  { $eq: ["$$this.LikeType", "2"] },
                  { $eq: ["$$this.IsDeleted", false] },
                ],
              },
            },
          },
          comments: {
            $map: {
              input: {
                $filter: {
                  input: "$interactions",
                  cond: {
                    $and: [
                      { $eq: ["$$this.Action", "Comment"] },
                      { $eq: ["$$this.IsDeleted", false] },
                    ],
                  },
                },
              },
              as: "comment",
              in: {
                $mergeObjects: [
                  "$$comment",
                  {
                    user: {
                      $arrayElemAt: ["$$comment.user", 0],
                    },
                  },
                ],
              },
            },
          },
          likeCount: {
            $size: {
              $filter: {
                input: "$interactions",
                cond: {
                  $and: [
                    { $eq: ["$$this.Action", "Vote"] },
                    { $eq: ["$$this.LikeType", "1"] },
                    { $eq: ["$$this.IsDeleted", false] },
                  ],
                },
              },
            },
          },
          dislikeCount: {
            $size: {
              $filter: {
                input: "$interactions",
                cond: {
                  $and: [
                    { $eq: ["$$this.Action", "Vote"] },
                    { $eq: ["$$this.LikeType", "2"] },
                    { $eq: ["$$this.IsDeleted", false] },
                  ],
                },
              },
            },
          },
          commentCount: {
            $size: {
              $filter: {
                input: "$interactions",
                cond: {
                  $and: [
                    { $eq: ["$$this.Action", "Comment"] },
                    { $eq: ["$$this.IsDeleted", false] },
                  ],
                },
              },
            },
          },
        },
      },
      // Remove raw interactions
      {
        $project: {
          interactions: 0,
        },
      },
    ];

    // Debug: Log the pipeline and test each step
    console.log("=== DEBUG: getCapsulePosts ===");
    console.log("CapsuleId:", capsuleId);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Pipeline length:", pipeline.length);

    // Debug: Check if chapters exist for this capsule
    const chaptersCount = await Chapter.countDocuments({
      CapsuleId: new mongoose.Types.ObjectId(capsuleId),
      IsDeleted: { $ne: true },
    });
    console.log("Chapters found for capsule:", chaptersCount);
    
    // Debug: Check total media count by type in the database
    const Media = require("./../models/mediaModel.js");
    const videoCount = await Media.countDocuments({ MediaType: "Video", IsDeleted: { $ne: 1 } });
    const audioCount = await Media.countDocuments({ MediaType: "Audio", IsDeleted: { $ne: 1 } });
    const imageCount = await Media.countDocuments({ MediaType: "Image", IsDeleted: { $ne: 1 } });
    const mj1Count = await Media.countDocuments({ MediaType: "1MJPost", IsDeleted: { $ne: 1 } });
    const mj2Count = await Media.countDocuments({ MediaType: "2MJPost", IsDeleted: { $ne: 1 } });
    const unsplash1Count = await Media.countDocuments({ MediaType: "1UnsplashPost", IsDeleted: { $ne: 1 } });
    const unsplash2Count = await Media.countDocuments({ MediaType: "2UnsplashPost", IsDeleted: { $ne: 1 } });
    const notesCount = await Media.countDocuments({ MediaType: "Notes", IsDeleted: { $ne: 1 } });
    
    console.log("=== TOTAL MEDIA COUNT BY TYPE ===");
    console.log(`Video: ${videoCount}`);
    console.log(`Audio: ${audioCount}`);
    console.log(`Image: ${imageCount}`);
    console.log(`1MJPost: ${mj1Count}`);
    console.log(`2MJPost: ${mj2Count}`);
    console.log(`1UnsplashPost: ${unsplash1Count}`);
    console.log(`2UnsplashPost: ${unsplash2Count}`);
    console.log(`Notes: ${notesCount}`);
    console.log("=== END TOTAL MEDIA COUNT ===");

    // Debug: Check if any chapters have pages
    const chaptersWithPages = await Chapter.find({
      CapsuleId: new mongoose.Types.ObjectId(capsuleId),
      IsDeleted: { $ne: true },
      pages: { $exists: true, $ne: [] },
    }).select("_id pages");
    console.log("Chapters with pages:", chaptersWithPages.length);
    if (chaptersWithPages.length > 0) {
      console.log("Sample chapter pages:", chaptersWithPages[0].pages);
    }

    // Debug: Test each step of the pipeline
    console.log("\n=== Testing Pipeline Steps ===");

    // Step 1: Test basic chapter match
    const step1 = await Chapter.aggregate([
      {
        $match: {
          CapsuleId: new mongoose.Types.ObjectId(capsuleId),
          IsDeleted: { $ne: true },
        },
      },
    ]);
    console.log("Step 1 - Chapters matched:", step1.length);

    // Step 2: Test with unwind pages
    const step2 = await Chapter.aggregate([
      {
        $match: {
          CapsuleId: new mongoose.Types.ObjectId(capsuleId),
          IsDeleted: { $ne: true },
        },
      },
      {
        $unwind: {
          path: "$pages",
          preserveNullAndEmptyArrays: false,
        },
      },
    ]);
    console.log("Step 2 - After unwind pages:", step2.length);

    // Step 3: Test with page lookup
    const step3 = await Chapter.aggregate([
      {
        $match: {
          CapsuleId: new mongoose.Types.ObjectId(capsuleId),
          IsDeleted: { $ne: true },
        },
      },
      {
        $unwind: {
          path: "$pages",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "Pages",
          localField: "pages",
          foreignField: "_id",
          as: "pageDoc",
        },
      },
    ]);
    console.log("Step 3 - After page lookup:", step3.length);
    if (step3.length > 0) {
      console.log("Sample pageDoc:", step3[0].pageDoc);
    }

    // Step 4: Test with page unwind
    const step4 = await Chapter.aggregate([
      {
        $match: {
          CapsuleId: new mongoose.Types.ObjectId(capsuleId),
          IsDeleted: { $ne: true },
        },
      },
      {
        $unwind: {
          path: "$pages",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "Pages",
          localField: "pages",
          foreignField: "_id",
          as: "pageDoc",
        },
      },
      {
        $unwind: {
          path: "$pageDoc",
          preserveNullAndEmptyArrays: false,
        },
      },
    ]);
    console.log("Step 4 - After page unwind:", step4.length);
    if (step4.length > 0) {
      console.log("Sample pageDoc.Medias:", step4[0].pageDoc.Medias);
    }

    const posts = await Chapter.aggregate(pipeline);
    console.log("Final posts found:", posts.length);
    
    // Debug: Log the MediaTypes of found posts
    if (posts.length > 0) {
      console.log("=== POST TYPES DEBUG ===");
      posts.forEach((post, index) => {
        console.log(`Post ${index + 1}: MediaType = "${post.MediaType}", Location = ${post.Location ? post.Location.length : 0} items`);
        if (post.Location && post.Location.length > 0) {
          console.log(`  - Location[0].URL: ${post.Location[0].URL ? 'EXISTS' : 'MISSING'}`);
        }
      });
      console.log("=== END POST TYPES DEBUG ===");
    }

    // Add user's interaction status for each post and clean up user data
    if (req.session.user && req.session.user._id) {
      const userId = req.session.user._id;
      posts.forEach(function (post) {
        post.isLikedByMe = post.likes.some(function (like) {
          return String(like.UserId) === String(userId);
        });
        post.isDislikedByMe = post.dislikes.some(function (dislike) {
          return String(dislike.UserId) === String(userId);
        });
        post.isCommentedByMe = post.comments.some(function (comment) {
          return String(comment.UserId) === String(userId);
        });

        // Remove user field from likes and dislikes (only keep for comments)
        post.likes.forEach(function (like) {
          delete like.user;
        });

        post.dislikes.forEach(function (dislike) {
          delete dislike.user;
        });
      });
    } else {
      // Remove user field from likes and dislikes even without session
      posts.forEach(function (post) {
        post.likes.forEach(function (like) {
          delete like.user;
        });

        post.dislikes.forEach(function (dislike) {
          delete dislike.user;
        });
      });
    }

    // Get total count for pagination (without skip/limit and interaction processing)
    // We need to stop before the skip/limit stages and before interaction processing
    const countPipeline = pipeline.slice(0, 13); // Stop before skip/limit and interaction processing
    countPipeline.push({ $count: "total" });
    const countResult = await Chapter.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    // Remove allBlendConfigurations from BlendSettings before sending response
    const cleanedPosts = posts.map(post => {
      if (post.BlendSettings && post.BlendSettings.allBlendConfigurations) {
        const { allBlendConfigurations, ...cleanedBlendSettings } = post.BlendSettings;
        post.BlendSettings = cleanedBlendSettings;
      }
      return post;
    });

    res.json({
      code: "200",
      msg: "Success",
      response: cleanedPosts, // Updated to use cleanedPosts
      count: totalCount,
      capsuleId: capsuleId,
      pagination: {
        skip: req.body.skip || 0,
        limit: req.body.limit || 20,
        hasMore: (req.body.skip || 0) + (req.body.limit || 20) < totalCount,
      },
      filters: {
        type: req.body.type || null,
        selectedKeyword: req.body.selectedKeyword || null,
      },
    });
  } catch (error) {
    console.error("Error in getCapsulePosts:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

var galleryCapsulesList = function (req, res) {
  console.log('🔍 galleryCapsulesList function called');
  const limit = req.query.perPage ? parseInt(req.query.perPage) : 20;
  const offset = req.query.pageNo
    ? (parseInt(req.query.pageNo) - 1) * limit
    : 0;

  const conditions = {
    "LaunchSettings.Audience": "BUYERS",
    IsPublished: false, // Changed to false - show unpublished streams marked for buyers (drafts/previews)
    IsAllowedForSales: true,
    Status: true,
    IsDeleted: false,
  };

  const sortObj = {
    ModifiedOn: -1,
  };

  const fields = {
    Title: 1,
    Description: 1,
    CoverImage: 1,
    CoverArt: 1,      // Added to support both field names
    MenuIcon: 1,      // Added as fallback
    LaunchSettings: 1,
    ModifiedOn: 1,
    CreaterId: 1,
    OwnerId: 1,       // Added for ownership checks
    Price: 1,
    DiscountPrice: 1, // Added for discount display
    GroupTags: 1,
    MetaData: 1,
    Chapters: 1,      // Added for post count
    IsAllowedForSales: 1,
    IsPublished: 1,
    Status: 1,
    IsDeleted: 1,
  };

  console.log('🔍 Executing database query for galleryCapsulesList');
  Capsule.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec()
    .then(async function (results) {
      console.log('🔍 Database query results count:', results.length);
      // 🎯 Populate CreaterId for gallery capsules
      const enhancedResults = [];
      for (let i = 0; i < results.length; i++) {
        const capsule = results[i];
        console.log('🔍 Processing capsule', i + 1, 'of', results.length, ':', capsule.Title);
        
        // Populate CreaterId
        if (capsule.CreaterId) {
          try {
            // Try to find in User collection first
            const user = await User.findById(capsule.CreaterId)
              .select("Name ProfilePic")
              .exec();
            if (user) {
              capsule.CreaterId = {
                _id: user._id,
                Name: user.Name,
                ProfilePic: user.ProfilePic,
              };
        } else {
              // Try to find in Admin collection
              const admin = await Admin.findById(capsule.CreaterId)
                .select("name ProfilePic")
                .exec();
              if (admin) {
                capsule.CreaterId = {
                  _id: admin._id,
                  Name: admin.name,
                  ProfilePic: admin.ProfilePic,
                };
              } else {
                // Try to find in SubAdmin collection
                const subAdmin = await SubAdmin.findById(capsule.CreaterId)
                  .select("name ProfilePic")
                  .exec();
                if (subAdmin) {
                  capsule.CreaterId = {
                    _id: subAdmin._id,
                    Name: subAdmin.name,
                    ProfilePic: subAdmin.ProfilePic,
                  };
                } else {
                  // If not found in any collection, set default values
                  capsule.CreaterId = {
                    _id: capsule.CreaterId,
                    Name: "Unknown User",
                    ProfilePic: "/assets/users/default.png",
                  };
                }
              }
            }
          } catch (error) {
            console.error('❌ Error populating CreaterId for capsule:', capsule.Title, error);
            capsule.CreaterId = {
              _id: capsule.CreaterId,
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
          }
        }
        
        enhancedResults.push(capsule.toObject());
      }

      Capsule.find(conditions, fields)
        .countDocuments()
        .exec()
        .then(function (resultsLength) {
          console.log('🔍 Sending response with', enhancedResults.length, 'capsules');
          const response = {
            count: resultsLength,
            status: 200,
            message: "Gallery capsules listing",
            results: enhancedResults,
          };
          res.json(response);
        })
        .catch(function (err) {
          console.error('❌ Error in countDocuments:', err);
          const response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        });
    })
    .catch(function (err) {
      console.error('❌ Error in galleryCapsulesList:', err);
      const response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    });
};

/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		deleteCapsule
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.capsule_id)"
_________________________________________________________________________
*/

var approveCapsuleForSales = function (req, res) {
  req.session = req.session ? req.session : {};
  req.session.user = req.session.user ? req.session.user : {};
  req.session.user.Email = req.session.user.Email
    ? req.session.user.Email
    : null;

  if (
    req.session.user.Email != null &&
    process.CAPSULE_VERIFIER.indexOf(req.session.user.Email) >= 0
  ) {
    var conditions = {};
    var data = {};

    conditions._id = req.headers.capsule_id;
    data.IsAllowedForSales = true;
    data.ModifiedOn = Date.now();
    Capsule.update(conditions, { $set: data }, function (err, result) {
      if (!err) {
        var response = {
          status: 200,
          message: "Capsule approved for sales by admin authority.",
          result: result,
        };
        res.json(response);
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
  } else {
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};
var getCartCapsule = function (req, res) {
  var conditions = {
    _id: { $in: req.body.capsuleIds },
  };

  var fields = {};
  var count = 0;
  var uniqueIds = [];

  Capsule.findOne(conditions, fields).exec(function (err, results) {
    if (!err) {
      var response = {
        status: 200,
        message: "Capsules listing",
        results: results,
      };
      res.json(response);
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};
var updateCartCapsule = async function (req, res) {
  try {
    // Debug logging for authentication
    console.log('🛒 updateCartCapsule called - Auth debug:', {
      hasUser: !!req.user,
      hasSession: !!req.session,
      hasSessionUser: !!(req.session && req.session.user),
      userId: req.user?.userId,
      sessionUserId: req.session?.user?._id,
      operation: req.body.operation,
      capsuleId: req.body.capsuleId
    });

    // Check if user is logged in
    if (!req.session.user || !req.session.user._id) {
      console.error('❌ Authentication failed in updateCartCapsule:', {
        hasUser: !!req.user,
        hasSession: !!req.session,
        hasSessionUser: !!(req.session && req.session.user)
      });
      var response = {
        status: 401,
        message: "User not logged in. Please login first.",
      };
      return res.json(response);
    }

    var data = {
      CreatedById: req.session.user._id,
    };
    var operation = req.body.operation;

    // Get capsule details to find the creator
    const capsule = await Capsule.findById(req.body.capsuleId);
    if (!capsule) {
      var response = {
        status: 404,
        message: "Capsule not found.",
      };
      return res.json(response);
    }

    var CartItems = {
        CapsuleId: req.body.capsuleId,
        CapsuleCreatedBy: capsule.CreaterId, // Automatically get from capsule data
      },
      query = { CreatedById: req.session.user._id };

    if (operation == "push") {
      doc = {
        $set: {
          CreatedById: req.session.user._id,
          CreatedByEmail: req.session.user.Email,
        },
        $push: { CartItems: CartItems },
      };
    } else if (operation == "pull") {
      doc = {
        $pull: { CartItems: { CapsuleId: req.body.capsuleId } },
      };
    } else {
      var response = {
        status: 400,
        message: "Invalid operation. Use 'push' or 'pull'.",
      };
      return res.json(response);
    }

    options = { upsert: true };

    // Find existing cart
    const record = await Cart.findOne({ CreatedById: req.session.user._id })
      .populate("CartItems.CapsuleId")
      .exec();

    if (operation == "pull") {
      // For pull operation, check if cart exists and capsule is in it
      if (record == null) {
        var response = {
          status: 404,
          message: "Cart not found.",
        };
        return res.json(response);
      }

      // Check if capsule exists in cart
      const capsuleExists = record.CartItems.some(
        (item) => item.CapsuleId._id.toString() === req.body.capsuleId
      );

      if (!capsuleExists) {
        var response = {
          status: 404,
          message: "Capsule not found in cart.",
        };
        return res.json(response);
      }

      // Remove capsule from cart
      await Cart.updateOne(query, doc).exec();

      // Get updated cart with populated data
      const recordLatest = await Cart.findOne({
        CreatedById: req.session.user._id,
      })
        .populate("CartItems.CapsuleId")
        .populate("CartItems.CapsuleCreatedBy", "Name")
        .exec();

      var response = {
        status: 200,
        message: "Capsule has been removed from cart.",
        results: recordLatest,
      };
      res.json(response);
    } else {
      // Push operation logic
      if (record == null) {
        // No cart exists, create new one
        await Cart.updateOne(query, doc, options).exec();

        // Get updated cart with populated data
        const recordLatest = await Cart.findOne({
          CreatedById: req.session.user._id,
        })
          .populate("CartItems.CapsuleId")
          .populate("CartItems.CapsuleCreatedBy", "Name")
          .exec();

        var response = {
          status: 200,
          message: "Capsules has been added to cart.",
          results: recordLatest,
        };
        res.json(response);
      } else {
        // Cart exists, check if capsule already in cart
        const recordMatch = await Cart.findOne({
          CreatedById: req.session.user._id,
          CartItems: { $elemMatch: { CapsuleId: req.body.capsuleId } },
        }).exec();

        if (recordMatch == null) {
          // Capsule not in cart, add it
          await Cart.updateOne(query, doc, options).exec();

          // Get updated cart with populated data
          const recordLatest = await Cart.findOne({
            CreatedById: req.session.user._id,
          })
            .populate("CartItems.CapsuleId")
            .populate("CartItems.CapsuleCreatedBy", "Name")
            .exec();

          var response = {
            status: 200,
            message: "Capsules has been added.",
            results: recordLatest,
          };
          res.json(response);
        } else {
          // Capsule already exists in cart
          var response = {
            status: 201,
            message: "Capsule already exists.",
            results: record,
          };
          res.json(response);
        }
      }
    }
  } catch (err) {
    var response = {
      status: 500,
      message: "something went wrong please try again later.",
      results: err,
    };
    res.json(response);
  }
};

var updatePullCartCapsule = function (req, res) {
  var data = {
    CreatedById: req.session.user._id,
  };
  var operation = req.body.operation;
  var CartItems = {
      CapsuleId: req.body.capsuleId,
    },
    query = { CreatedById: req.session.user._id };
  if (operation == "pull") {
    doc = {
      $pull: { CartItems: CartItems },
    };
  }

  Cart.findOne({ CreatedById: req.session.user._id })
    .populate("CartItems.CapsuleId")
    .exec(function (err, record) {
      if (err) {
        var response = {
          status: 407,
          message: "Something went wrong.",
          results: err,
        };
        res.json(response);
      } else {
        if (record == null) {
          var response = {
            status: 200,
            message: "This cart is empty.",
            results: record,
          };
          res.json(response);
        } else {
          // console.log(query);
          Cart.updateOne(query, doc, function (err, ucart) {
            if (err) {
              var response = {
                status: 408,
                message: "Something went wrong.",
                results: err,
              };
              res.json(response);
            } else {
              if (ucart.nModified == 1) {
                Cart.findOne({ CreatedById: req.session.user._id })
                  .populate("CartItems.CapsuleId")
                  .populate("CartItems.CapsuleCreatedBy", "Name")
                  .exec(function (err, recordLatest) {
                    if (!err) {
                      var response = {
                        status: 200,
                        message: "Capsule has been removed.",
                        results: recordLatest,
                      };
                      res.json(response);
                    }
                  });
              } else {
                var response = {
                  status: 200,
                  message: "This capsule does not exists.",
                  results: record,
                };
                res.json(response);
              }
            }
          });
        }
      }
    });
};

var transferCartToCurrentUser = async function (req, res) {
  try {
    // Find carts by email (in case user ID changed)
    const cartsByEmail = await Cart.find({
      CreatedByEmail: req.session.user.Email,
    }).exec();

    if (cartsByEmail.length === 0) {
      var response = {
        status: 404,
        message: "No carts found for this email.",
        results: null,
      };
      return res.json(response);
    }

    // Transfer all carts to current user ID
    const transferResult = await Cart.updateMany(
      { CreatedByEmail: req.session.user.Email },
      { $set: { CreatedById: req.session.user._id } }
    ).exec();

    // Get the updated cart
    const updatedCart = await Cart.findOne({
      CreatedById: req.session.user._id,
    })
      .populate("CartItems.CapsuleId")
      .exec();

    if (updatedCart) {
      // Populate creator information
      const finalCart = await Cart.populate(updatedCart, {
        path: "CartItems.CapsuleId.CreaterId",
        model: "user",
        select: "Name",
      });

      var response = {
        status: 200,
        message: "Cart transferred successfully.",
        results: finalCart,
      };
      res.json(response);
    } else {
      var response = {
        status: 200,
        message: "Cart transferred but not found.",
        results: null,
      };
      res.json(response);
    }
  } catch (err) {
    var response = {
      status: 501,
      message: "Error transferring cart!",
      results: err,
    };
    res.json(response);
  }
};

var getCart = async function (req, res) {
  try {
    // Validate session exists
    if (!req.session || !req.session.user || !req.session.user._id) {
      return res.status(401).json({
        status: 401,
        message: "User session not found. Please login.",
        results: null,
      });
    }

    // Find cart with populated capsule data
    const recordLatest = await Cart.findOne({
      CreatedById: req.session.user._id,
    })
      .populate("CartItems.CapsuleId")
      .exec();

    if (!recordLatest) {
      // Check if there are any carts for this user with different criteria
      const allUserCarts = await Cart.find({
        CreatedByEmail: req.session.user.Email,
      }).exec();

      if (allUserCarts.length > 0) {
        // Optionally transfer cart to current user ID
        // await Cart.updateMany(
        // 	{CreatedByEmail: req.session.user.Email},
        // 	{$set: {CreatedById: req.session.user._id}}
        // ).exec();
      }

      // Return empty cart structure instead of 404
      var emptyCart = {
        _id: null,
        CreatedById: req.session.user._id,
        CreatedByEmail: req.session.user.Email,
        CartItems: [],
        Status: false,
        IsDeleted: false,
        CreatedOn: new Date(),
        UpdatedOn: null,
      };

      var response = {
        status: 200,
        message: "Cart retrieved successfully (empty).",
        results: emptyCart,
      };
      return res.json(response);
    }

    // Populate creator information for each capsule
    const recordLatest2 = await Cart.populate(recordLatest, {
      path: "CartItems.CapsuleId.CreaterId",
      model: "user",
      select: "Name",
    });

    var response = {
      status: 200,
      message: "Cart has been retrieved successfully.",
      results: recordLatest2,
    };
    res.json(response);
  } catch (err) {
    console.error("Error in getCart:", err);
    var response = {
      status: 501,
      message: "Error retrieving cart. Please try again.",
      results: null,
    };
    res.json(response);
  }
};

var updateCartOwners_v1 = function (req, res) {
  var ownerObj = req.body.owner ? req.body.owner : [];
  var text = "";
  var possible =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  if (ownerObj.length > 1) {
    for (var j = 0; j < ownerObj.length; j++) {
      for (var i = 0; i < 12; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      ownerObj[j].uniqueId = text;
    }
  } else {
    for (var i = 0; i < 12; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    ownerObj.uniqueId = text;
  }

  var CapsuleId = req.body.capsuleId ? req.body.capsuleId : [];

  query = {
    CreatedById: req.session.user._id,
    "CartItems.CapsuleId": CapsuleId,
  };

  doc = {
    $push: { "CartItems.$.Owners": ownerObj },
  };

  Cart.updateOne(query, doc, function (err, record) {
    if (err) {
      var response = {
        status: 402,
        message: "something went wrong please try again later.",
        results: record,
      };
      res.json(response);
    } else {
      if (record.nModified == 1) {
        Cart.findOne(query, { "CartItems.$": 1 }, function (err, recordLatest) {
          if (!err) {
            var response = {
              status: 200,
              message: "Owner added successfully.",
              results: recordLatest,
            };
            res.json(response);
          }
        });
      } else {
        var response = {
          status: 200,
          message: "Incapable to update owner",
          results: record,
        };
        res.json(response);
      }
    }
  });
};

var updateCartOwners = function (req, res) {
  var ownerObj = req.body.owner ? req.body.owner : [];
  var text = "";
  var possible =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  //console.log(req.body.owner.length);
  var outOwnerArr = [];
  if (typeof ownerObj == "object") {
    outOwnerArr.push(ownerObj);

    for (var i = 0; i < 12; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    ownerObj.uniqueId = text;
  } else {
    for (var j = 0; j < ownerObj.length; j++) {
      for (var i = 0; i < 12; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      ownerObj[j].uniqueId = text;
    }
    outOwnerArr = ownerObj;
  }

  var CapsuleId = req.body.capsuleId ? req.body.capsuleId : [];

  var query = {
    CreatedById: req.session.user._id,
    "CartItems.CapsuleId": CapsuleId,
  };

  var doc = {};

  //console.log('------------------------------------------',doc);

  Cart.findOne(query, { "CartItems.$": 1 }, function (err, commonRecordCheck) {
    if (!err) {
      var insideOwners = commonRecordCheck.CartItems[0].Owners;

      for (var x = 0; x < outOwnerArr.length; x++) {
        //Iterate through all elements in second array
        for (var y = 0; y < insideOwners.length; y++) {
          /*This causes us to compare all elements 
					 in first array to each element in second array
					Since md1[x] stays fixed while md2[y] iterates through second array.
					 We compare the first two indexes of each array in conditional
				  */
          var countmatch = 0;

          console.log(
            outOwnerArr[x].UserEmail,
            "------",
            insideOwners[y].UserEmail
          );
          if (outOwnerArr[x].UserEmail == insideOwners[y].UserEmail) {
            //console.log(outOwnerArr[x][0],'',insideOwners[y][0]);

            outOwnerArr.splice(x, 1);
            countmatch++;
            if (outOwnerArr.length == 0) {
              break;
            }
          } else {
          }
        }
      }

      if (outOwnerArr.length == countmatch) {
        if (outOwnerArr.length == 1) {
          var response = {
            status: 200,
            message: "Owner already exists",
            results: commonRecordCheck,
          };
          res.json(response);
        } else {
          var response = {
            status: 200,
            message: "All group owners already exists",
            results: commonRecordCheck,
          };
          res.json(response);
        }
      } else {
        if (outOwnerArr.length == 1) {
          doc = {
            $push: { "CartItems.$.Owners": outOwnerArr[0] },
          };
          Cart.updateOne(query, doc, function (err, record) {
            if (err) {
              var response = {
                status: 402,
                message: "something went wrong please try again later.",
                results: record,
              };
              res.json(response);
            } else {
              if (record.nModified == 1) {
                Cart.findOne(
                  query,
                  { "CartItems.$": 1 },
                  function (err, recordLatest) {
                    if (!err) {
                      var response = {
                        status: 200,
                        message: "Owner added successfully.",
                        results: recordLatest,
                      };
                      res.json(response);
                    }
                  }
                );
              } else {
                var response = {
                  status: 200,
                  message: "Incapable to update owner",
                  results: record,
                };
                res.json(response);
              }
            }
          });
        } else if (outOwnerArr.length > 1) {
          doc = {
            $push: { "CartItems.$.Owners": outOwnerArr },
          };
          Cart.updateOne(query, doc, function (err, record) {
            if (err) {
              var response = {
                status: 402,
                message: "something went wrong please try again later.",
                results: record,
              };
              res.json(response);
            } else {
              if (record.nModified == 1) {
                Cart.findOne(
                  query,
                  { "CartItems.$": 1 },
                  function (err, recordLatest) {
                    if (!err) {
                      var response = {
                        status: 200,
                        message: "Owners added successfully.",
                        results: recordLatest,
                      };
                      res.json(response);
                    }
                  }
                );
              } else {
                var response = {
                  status: 200,
                  message: "Incapable to update owner",
                  results: record,
                };
                res.json(response);
              }
            }
          });
        } else {
          Cart.findOne(
            query,
            { "CartItems.$": 1 },
            function (err, recordLatest) {
              if (!err) {
                var response = {
                  status: 200,
                  message: "Owners already exists.",
                  results: recordLatest,
                };
                res.json(response);
              }
            }
          );
        }
      }
    }
  });
};

var updatePullCartOwners = function (req, res) {
  var ownerEmail = req.body.ownerEmail ? req.body.ownerEmail : "";

  var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;

  query = {
    CreatedById: req.session.user._id,
    "CartItems.CapsuleId": CapsuleId,
  };

  doc = {
    $pull: { "CartItems.$.Owners": { UserEmail: ownerEmail } },
  };

  Cart.updateOne(query, doc, function (err, record) {
    if (err) {
      // console.log(err);
      var response = {
        status: 402,
        message: "something went wrong please try again later.",
        results: record,
      };
      res.json(response);
    } else {
      if (record.nModified == 1) {
        Cart.findOne(query, { "CartItems.$": 1 }, function (err, recordLatest) {
          if (!err) {
            var response = {
              status: 200,
              message: "Owner removed successfully.",
              results: recordLatest,
            };
            res.json(response);
          }
        });
      } else {
        var response = {
          status: 200,
          message: "Incapable to update owner",
          results: record,
        };
        res.json(response);
      }
    }
  });
};

var getCapsuleOwners = function (req, res) {
  query = {
    CreatedById: req.session.user._id,
    "CartItems.CapsuleId": req.query.capsuleId,
  };
  Cart.findOne(query, { "CartItems.$": 1 }, function (err, recordLatest) {
    if (!err) {
      var response = {
        status: 200,
        message: "Cart owners  has been retrieved successfully.",
        results: recordLatest,
      };
      res.json(response);
    }
  });
};
var updateCartForMyself = function (req, res) {
  // Safe session access for admin, subadmin, and regular users
  var myself = null;

  if (req.session && req.session.user) {
    myself = req.session.user;
  } else if (req.session && req.session.admin) {
    myself = req.session.admin;
  } else if (req.session && req.session.subadmin) {
    myself = req.session.subadmin;
  }

  if (!myself) {
    var response = {
      status: 401,
      message:
        "User session not found. Please login as admin, subadmin, or regular user.",
      results: null,
    };
    return res.json(response);
  }
  var text = "";
  var possible =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (var i = 0; i < 12; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  // uniqueIds.push(text);
  var ownerObj = {
    UserID: myself._id,
    UserEmail: myself.email || myself.Email, // Handle both admin and user email fields
    UserName: myself.name || myself.Name, // Handle both admin and user name fields
    UserNickName:
      myself.nickname || myself.NickName || myself.name || myself.Name, // Fallback for nickname
    CreatedOn: Date.now(),
    uniqueId: text,
    //member.Relation : myself.MemberRelation,
    //member.RelationId : myself.MemberRelationID,
    UserPic: myself.profilePic || myself.ProfilePic || null, // Handle both admin and user profile pic fields
  };

  //console.log(ownerObj);return

  var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;

  var query = { CreatedById: myself._id, "CartItems.CapsuleId": CapsuleId };

  var doc = {
    $set: { "CartItems.$.PurchaseFor": "Myself", "CartItems.$.Owners": [] },
  };
  var docOnlyMyself = {
    $set: { "CartItems.$.PurchaseFor": "Myself" },
    $push: { "CartItems.$.Owners": ownerObj },
  };

  var docMyself = {
    $push: { "CartItems.$.Owners": ownerObj },
  };

  Cart.findOne(query, { "CartItems.$": 1 }, function (err, recordLatest) {
    if (!err) {
      if (recordLatest.CartItems[0].Owners.length) {
        //console.log('i am in');
        Cart.updateOne(query, doc, function (err, record) {
          if (err) {
            //.populate('CartItems.CapsuleCreatedBy','Name')
            Cart.findOne({ CreatedById: myself._id })
              .populate("CartItems.CapsuleId")
              .exec(function (err, recordLatest) {
                if (!err) {
                  //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                  //res.json(response);

                  Cart.populate(
                    recordLatest,
                    {
                      path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                      model: "user",
                      select: "Name",
                    },
                    function (err, recordLatest2) {
                      if (err) {
                        var response = {
                          status: 501,
                          message: "Error!",
                          results: recordLatest,
                        };
                        res.json(response);
                      } else {
                        //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                        var response = {
                          status: 200,
                          message: "Cart has been retrieved successfully.",
                          results: recordLatest2,
                        };
                        res.json(response);
                      }
                    }
                  );
                }
              });
          } else {
            if (record.nModified == 1) {
              Cart.updateOne(query, docMyself, function (err, record) {
                if (err) {
                  //.populate('CartItems.CapsuleCreatedBy','Name')
                  Cart.findOne({ CreatedById: myself._id })
                    .populate("CartItems.CapsuleId")
                    .exec(function (err, recordLatest) {
                      if (!err) {
                        //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                        //res.json(response);

                        Cart.populate(
                          recordLatest,
                          {
                            path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                            model: "user",
                            select: "Name",
                          },
                          function (err, recordLatest2) {
                            if (err) {
                              var response = {
                                status: 501,
                                message: "Error!",
                                results: recordLatest,
                              };
                              res.json(response);
                            } else {
                              //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                              var response = {
                                status: 200,
                                message:
                                  "Cart has been retrieved successfully.",
                                results: recordLatest2,
                              };
                              res.json(response);
                            }
                          }
                        );
                      }
                    });
                } else {
                  if (record.nModified == 1) {
                    //.populate('CartItems.CapsuleCreatedBy','Name')
                    Cart.findOne({ CreatedById: req.session.user._id })
                      .populate("CartItems.CapsuleId")
                      .exec(function (err, recordLatest) {
                        if (!err) {
                          //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                          //res.json(response);

                          Cart.populate(
                            recordLatest,
                            {
                              path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                              model: "user",
                              select: "Name",
                            },
                            function (err, recordLatest2) {
                              if (err) {
                                var response = {
                                  status: 501,
                                  message: "Error!",
                                  results: recordLatest,
                                };
                                res.json(response);
                              } else {
                                //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                                var response = {
                                  status: 200,
                                  message:
                                    "Cart has been retrieved successfully.",
                                  results: recordLatest2,
                                };
                                res.json(response);
                              }
                            }
                          );
                        }
                      });
                  } else {
                    //.populate('CartItems.CapsuleCreatedBy','Name')
                    Cart.findOne({ CreatedById: myself._id })
                      .populate("CartItems.CapsuleId")
                      .exec(function (err, recordLatest) {
                        if (!err) {
                          //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                          //res.json(response);

                          Cart.populate(
                            recordLatest,
                            {
                              path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                              model: "user",
                              select: "Name",
                            },
                            function (err, recordLatest2) {
                              if (err) {
                                var response = {
                                  status: 501,
                                  message: "Error!",
                                  results: recordLatest,
                                };
                                res.json(response);
                              } else {
                                //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                                var response = {
                                  status: 200,
                                  message:
                                    "Cart has been retrieved successfully.",
                                  results: recordLatest2,
                                };
                                res.json(response);
                              }
                            }
                          );
                        }
                      });
                  }
                }
              });
            } else {
              //.populate('CartItems.CapsuleCreatedBy','Name')
              Cart.findOne({ CreatedById: myself._id })
                .populate("CartItems.CapsuleId")
                .exec(function (err, recordLatest) {
                  if (!err) {
                    //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                    //res.json(response);

                    Cart.populate(
                      recordLatest,
                      {
                        path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                        model: "user",
                        select: "Name",
                      },
                      function (err, recordLatest2) {
                        if (err) {
                          var response = {
                            status: 501,
                            message: "Error!",
                            results: recordLatest,
                          };
                          res.json(response);
                        } else {
                          //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                          var response = {
                            status: 200,
                            message: "Cart has been retrieved successfully.",
                            results: recordLatest2,
                          };
                          res.json(response);
                        }
                      }
                    );
                  }
                });
            }
          }
        });
      } else {
        Cart.updateOne(query, docOnlyMyself, function (err, record) {
          if (err) {
            //.populate('CartItems.CapsuleCreatedBy','Name')
            Cart.findOne({ CreatedById: myself._id })
              .populate("CartItems.CapsuleId")
              .exec(function (err, recordLatest) {
                if (!err) {
                  //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                  //res.json(response);

                  Cart.populate(
                    recordLatest,
                    {
                      path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                      model: "user",
                      select: "Name",
                    },
                    function (err, recordLatest2) {
                      if (err) {
                        var response = {
                          status: 501,
                          message: "Error!",
                          results: recordLatest,
                        };
                        res.json(response);
                      } else {
                        //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                        var response = {
                          status: 200,
                          message: "Cart has been retrieved successfully.",
                          results: recordLatest2,
                        };
                        res.json(response);
                      }
                    }
                  );
                }
              });
          } else {
            if (record.nModified == 1) {
              //.populate('CartItems.CapsuleCreatedBy','Name')
              Cart.findOne({ CreatedById: myself._id })
                .populate("CartItems.CapsuleId")
                .exec(function (err, recordLatest) {
                  if (!err) {
                    //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                    //res.json(response);

                    Cart.populate(
                      recordLatest,
                      {
                        path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                        model: "user",
                        select: "Name",
                      },
                      function (err, recordLatest2) {
                        if (err) {
                          var response = {
                            status: 501,
                            message: "Error!",
                            results: recordLatest,
                          };
                          res.json(response);
                        } else {
                          //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                          var response = {
                            status: 200,
                            message: "Cart has been retrieved successfully.",
                            results: recordLatest2,
                          };
                          res.json(response);
                        }
                      }
                    );
                  }
                });
            } else {
              //.populate('CartItems.CapsuleCreatedBy','Name')
              Cart.findOne({ CreatedById: myself._id })
                .populate("CartItems.CapsuleId")
                .exec(function (err, recordLatest) {
                  if (!err) {
                    //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
                    //res.json(response);

                    Cart.populate(
                      recordLatest,
                      {
                        path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                        model: "user",
                        select: "Name",
                      },
                      function (err, recordLatest2) {
                        if (err) {
                          var response = {
                            status: 501,
                            message: "Error!",
                            results: recordLatest,
                          };
                          res.json(response);
                        } else {
                          //console.log(util.inspect(recordLatest2, {showHidden: true, depth: null}));
                          var response = {
                            status: 200,
                            message: "Cart has been retrieved successfully.",
                            results: recordLatest2,
                          };
                          res.json(response);
                        }
                      }
                    );
                  }
                });
            }
          }
        });
      }
    } else {
      //.populate('CartItems.CapsuleCreatedBy','Name')
      Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec(function (err, recordLatest) {
          if (!err) {
            //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
            //res.json(response);

            Cart.populate(
              recordLatest,
              {
                path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                model: "user",
                select: "Name",
              },
              function (err, recordLatest2) {
                if (err) {
                  var response = {
                    status: 501,
                    message: "Error!",
                    results: recordLatest,
                  };
                  res.json(response);
                } else {
                  //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                  var response = {
                    status: 200,
                    message: "Cart has been retrieved successfully.",
                    results: recordLatest2,
                  };
                  res.json(response);
                }
              }
            );
          }
        });
    }
  });
};

var updateCartForGift = function (req, res) {
  var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;

  var query = {
    CreatedById: req.session.user._id,
    "CartItems.CapsuleId": CapsuleId,
  };

  var doc = {
    $set: { "CartItems.$.Owners": [], "CartItems.$.PurchaseFor": "Gift" },
  };

  Cart.updateOne(query, doc, function (err, record) {
    if (err) {
      Cart.findOne({ CreatedById: req.session.user._id })
        .populate("CartItems.CapsuleId")
        .exec(function (err, recordLatest) {
          if (!err) {
            //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
            //res.json(response);
            Cart.populate(
              recordLatest,
              {
                path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                model: "user",
                select: "Name",
              },
              function (err, recordLatest2) {
                if (err) {
                  var response = {
                    status: 501,
                    message: "Error!",
                    results: recordLatest,
                  };
                  res.json(response);
                } else {
                  //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                  var response = {
                    status: 200,
                    message: "Cart has been retrieved successfully.",
                    results: recordLatest2,
                  };
                  res.json(response);
                }
              }
            );
          }
        });
    } else {
      if (record.nModified == 1) {
        Cart.findOne({ CreatedById: req.session.user._id })
          .populate("CartItems.CapsuleId")
          .exec(function (err, recordLatest) {
            if (!err) {
              //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
              //res.json(response);
              Cart.populate(
                recordLatest,
                {
                  path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                  model: "user",
                  select: "Name",
                },
                function (err, recordLatest2) {
                  if (err) {
                    var response = {
                      status: 501,
                      message: "Error!",
                      results: recordLatest,
                    };
                    res.json(response);
                  } else {
                    //console.log(util.inspect(recordLatest2, { showHidden: true, depth: null }));
                    var response = {
                      status: 200,
                      message: "Cart has been retrieved successfully.",
                      results: recordLatest2,
                    };
                    res.json(response);
                  }
                }
              );
            }
          });
      } else {
        Cart.findOne({ CreatedById: req.session.user._id })
          .populate("CartItems.CapsuleId")
          .exec(function (err, recordLatest) {
            if (!err) {
              //var response = {status: 200,  message: "Cart has been retrieved successfully.",results : recordLatest}
              //res.json(response);
              Cart.populate(
                recordLatest,
                {
                  path: "CartItems.CapsuleId.CreaterId", //CapsuleCreatedBy
                  model: "user",
                  select: "Name",
                },
                function (err, recordLatest2) {
                  if (err) {
                    var response = {
                      status: 501,
                      message: "Error!",
                      results: recordLatest,
                    };
                    res.json(response);
                  } else {
                    //console.log(util.inspect(recordLatest2, {showHidden: true, depth: null}));
                    var response = {
                      status: 200,
                      message: "Cart has been retrieved successfully.",
                      results: recordLatest2,
                    };
                    res.json(response);
                  }
                }
              );
            }
          });
      }
    }
  });
};

var getMyPurchases = function (req, res) {
  var offset = req.body.offset ? req.body.offset : 0;
  var limit = req.body.limit ? req.body.limit : 10;

  var conditions = {
    CreatedById: req.session.user._id,
    TransactionState: "Completed",
  };
  var sortObj = {
    UpdatedOn: -1,
  };

  Order.find(conditions)
    .populate("CartItems.CapsuleId")
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec(function (err, recordLatest) {
      if (!err) {
        Order.find(conditions)
          .count()
          .exec(function (err, dataCount) {
            if (!err) {
              var response = {
                status: 200,
                message: "Orders has been retrieved successfully.",
                results: recordLatest,
                count: dataCount,
              };
            } else {
              var response = {
                status: 501,
                message: "Something went wrong.",
                results: recordLatest,
                count: 0,
              };
            }
            res.json(response);
          });
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
          results: recordLatest,
          count: 0,
        };
        res.json(response);
      }
    });
};

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		getUserPurchasedCapsulesPosts
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Fetch random posts from all capsules purchased by the user
   * @Param:     		limit (optional, default: 10), type (optional), selectedKeyword (optional)
   * @Return:    	 	Mixed feed of posts from all purchased capsules
   * @Access Category:	"User Feed"
_________________________________________________________________________
*/

var getUserPurchasedCapsulesPosts = async function (req, res) {
  try {
    const limit = req.body.limit || 10;
    const skip = req.body.skip || 0;
    const type = req.body.type || null;
    const selectedKeyword = req.body.selectedKeyword || null;

    // Get all capsules owned by the user
    const userCapsules = await Capsule.find({
      OwnerId: new mongoose.Types.ObjectId(req.session.user._id),
      IsDeleted: { $ne: true },
    }).exec();

    if (userCapsules.length === 0) {
      return res.json({
        code: 200,
        msg: "Success",
        response: [],
        count: 0,
        message: "No capsules owned by user found",
      });
    }

    // Get all posts from user-owned capsules
    const capsuleIds = userCapsules.map((c) => c._id);

    const pipeline = [
      // Match chapters from user-owned capsules
      { $match: { CapsuleId: { $in: capsuleIds }, IsDeleted: { $ne: true } } },

      // Unwind pages array
      { $unwind: { path: "$pages", preserveNullAndEmptyArrays: false } },

      // Lookup page documents
      {
        $lookup: {
          from: "Pages",
          localField: "pages",
          foreignField: "_id",
          as: "pageDoc",
        },
      },
      { $unwind: { path: "$pageDoc", preserveNullAndEmptyArrays: false } },
      { $match: { "pageDoc.IsDeleted": { $ne: true } } },

      // Unwind medias array
      {
        $unwind: { path: "$pageDoc.Medias", preserveNullAndEmptyArrays: false },
      },

      // Lookup media documents
      {
        $lookup: {
          from: "media",
          let: { mediaId: "$pageDoc.Medias" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$mediaId" }] },
              },
            },
          ],
          as: "mediaDoc",
        },
      },
      { $unwind: { path: "$mediaDoc", preserveNullAndEmptyArrays: false } },
      { $match: { mediaDoc: { $exists: true, $ne: null } } },

      // Apply media type filter
      ...(type && type !== "all"
        ? [
            {
              $match: {
                $or: [
                  { "mediaDoc.MediaType": type },
                  ...(type === "Image"
                    ? [
                        {
                          "mediaDoc.MediaType": "Link",
                          "mediaDoc.LinkType": "image",
                        },
                        { "mediaDoc.MediaType": "1MJPost" },
                        { "mediaDoc.MediaType": "2MJPost" },
                        { "mediaDoc.MediaType": "1UnsplashPost" },
                        { "mediaDoc.MediaType": "2UnsplashPost" },
                      ]
                    : []),
                  ...(type === "Video"
                    ? [
                        {
                          "mediaDoc.MediaType": "Link",
                          "mediaDoc.LinkType": { $ne: "image" },
                        },
                        { "mediaDoc.MediaType": "Video" },
                        { "mediaDoc.MediaType": "Audio" },
                      ]
                    : []),
                ],
              },
            },
          ]
        : []),

      // Apply keyword filter
      ...(selectedKeyword
        ? [
            {
              $match: {
                $or: [
                  { "mediaDoc.GroupTags.GroupTagID": selectedKeyword },
                  { "mediaDoc.GroupTags": selectedKeyword },
                ],
              },
            },
          ]
        : []),

      // Project final structure with media as root
      {
        $project: {
          _id: "$mediaDoc._id",
          MediaType: "$mediaDoc.MediaType",
          LinkType: "$mediaDoc.LinkType",
          Content: "$mediaDoc.Content",
          Location: "$mediaDoc.Location",
          UploadedBy: "$mediaDoc.UploadedBy",
          UploadedOn: "$mediaDoc.UploadedOn",
          UploaderID: "$mediaDoc.UploaderID",
          GroupTags: "$mediaDoc.GroupTags",
          BlendSettings: "$mediaDoc.BlendSettings",
          Status: "$mediaDoc.Status",
          IsDeleted: "$mediaDoc.IsDeleted",
          IsPrivate: "$mediaDoc.IsPrivate",
          AddedWhere: "$mediaDoc.AddedWhere",
          AddedHow: "$mediaDoc.AddedHow",
          ContentType: "$mediaDoc.ContentType",
          thumbnail: "$mediaDoc.thumbnail",
          Locator: "$mediaDoc.Locator",
          AutoId: "$mediaDoc.AutoId",
          pageId: "$pageDoc._id",
          pageTitle: "$pageDoc.Title",
          pageType: "$pageDoc.PageType",
          chapterId: "$_id",
          chapterTitle: "$Title",
          capsuleId: "$CapsuleId",
        },
      },

      // Sort by upload date (newest first) with _id as tiebreaker for consistent pagination
      { $sort: { UploadedOn: -1, _id: -1 } },

      // Apply pagination
      { $skip: skip },
      { $limit: limit },

      // Lookup capsule data with owner information
      {
        $lookup: {
          from: "Capsules",
          localField: "capsuleId",
          foreignField: "_id",
          as: "capsuleData",
        },
      },
      // Unwind capsule data
      {
        $unwind: {
          path: "$capsuleData",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup capsule owner data
      {
        $lookup: {
          from: "users",
          localField: "capsuleData.OwnerId",
          foreignField: "_id",
          as: "capsuleOwner",
        },
      },
      // Unwind capsule owner data
      {
        $unwind: {
          path: "$capsuleOwner",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup capsule creator data (from users collection)
      {
        $lookup: {
          from: "users",
          localField: "capsuleData.CreaterId",
          foreignField: "_id",
          as: "capsuleCreator",
        },
      },
      // Unwind capsule creator data
      {
        $unwind: {
          path: "$capsuleCreator",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add capsule fields to the response
      {
        $addFields: {
          capsuleTitle: "$capsuleData.Title",
          capsuleCoverArt: "$capsuleData.CoverArt",
          capsuleMenuIcon: "$capsuleData.MenuIcon",
          capsuleOwnerId: "$capsuleData.OwnerId",
          capsuleOwnerName: "$capsuleOwner.Name",
          capsuleOwnerProfilePic: "$capsuleOwner.ProfilePic",
          capsuleCreatorId: "$capsuleData.CreaterId",
          capsuleCreatorName: "$capsuleCreator.Name",
          capsuleCreatorProfilePic: "$capsuleCreator.ProfilePic",
        },
      },

      // Lookup PageStream data to get SelectedBlendImages
      {
        $lookup: {
          from: "PageStream",
          localField: "_id",
          foreignField: "PostId",
          as: "pageStreamData",
        },
      },
      // Add SelectedBlendImages from PageStream with better error handling
      {
        $addFields: {
          selectedBlendImage: {
            $let: {
              vars: {
                pageStream: { $arrayElemAt: ["$pageStreamData", 0] }
              },
              in: {
                $cond: {
                  if: { $ne: ["$$pageStream", null] },
                  then: {
                    $cond: {
                      if: { 
                        $and: [
                          { $ne: ["$$pageStream.SelectedBlendImages", null] },
                          { $isArray: "$$pageStream.SelectedBlendImages" },
                          { $gt: [{ $size: "$$pageStream.SelectedBlendImages" }, 0] }
                        ]
                      },
                      then: { $arrayElemAt: ["$$pageStream.SelectedBlendImages", 0] },
                      else: null
                    }
                  },
                  else: null
                }
              }
            }
          },
        }
      },

      // Lookup interactions for each post
      {
        $lookup: {
          from: "MediaActionLogs",
          localField: "_id",
          foreignField: "MediaId",
          as: "interactions",
        },
      },
      // Unwind interactions
      {
        $unwind: {
          path: "$interactions",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add field to mark which interactions need user data
      {
        $addFields: {
          "interactions.needsUserData": {
            $eq: ["$interactions.Action", "Comment"],
          },
        },
      },
      // Lookup user data only for comments
      {
        $lookup: {
          from: "users",
          let: {
            userId: "$interactions.UserId",
            needsUser: "$interactions.needsUserData",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$userId"] },
                    { $eq: ["$$needsUser", true] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                Name: 1,
                UserName: 1,
                Email: 1,
                ProfilePic: 1,
              },
            },
          ],
          as: "interactions.user",
        },
      },
      // Group by post ID to aggregate interactions
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          interactions: { $push: "$interactions" },
        },
      },
      // Replace root with post data
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { interactions: "$interactions" }],
          },
        },
      },
      // Add interaction counts and separate arrays
      {
        $addFields: {
          likes: {
            $filter: {
              input: "$interactions",
              cond: {
                $and: [
                  { $eq: ["$$this.Action", "Vote"] },
                  { $eq: ["$$this.LikeType", "1"] },
                  { $eq: ["$$this.IsDeleted", false] },
                ],
              },
            },
          },
          dislikes: {
            $filter: {
              input: "$interactions",
              cond: {
                $and: [
                  { $eq: ["$$this.Action", "Vote"] },
                  { $eq: ["$$this.LikeType", "2"] },
                  { $eq: ["$$this.IsDeleted", false] },
                ],
              },
            },
          },
          comments: {
            $map: {
              input: {
                $filter: {
                  input: "$interactions",
                  cond: {
                    $and: [
                      { $eq: ["$$this.Action", "Comment"] },
                      { $eq: ["$$this.IsDeleted", false] },
                    ],
                  },
                },
              },
              as: "comment",
              in: {
                $mergeObjects: [
                  "$$comment",
                  {
                    user: {
                      $arrayElemAt: ["$$comment.user", 0],
                    },
                  },
                ],
              },
            },
          },
          likeCount: {
            $size: {
              $filter: {
                input: "$interactions",
                cond: {
                  $and: [
                    { $eq: ["$$this.Action", "Vote"] },
                    { $eq: ["$$this.LikeType", "1"] },
                    { $eq: ["$$this.IsDeleted", false] },
                  ],
                },
              },
            },
          },
          dislikeCount: {
            $size: {
              $filter: {
                input: "$interactions",
                cond: {
                  $and: [
                    { $eq: ["$$this.Action", "Vote"] },
                    { $eq: ["$$this.LikeType", "2"] },
                    { $eq: ["$$this.IsDeleted", false] },
                  ],
                },
              },
            },
          },
          commentCount: {
            $size: {
              $filter: {
                input: "$interactions",
                cond: {
                  $and: [
                    { $eq: ["$$this.Action", "Comment"] },
                    { $eq: ["$$this.IsDeleted", false] },
                  ],
                },
              },
            },
          },
        },
      },
      // Remove raw interactions and ensure capsule fields are included
      {
        $project: {
          interactions: 0,
          capsuleData: 0, // Remove the raw capsuleData object
          capsuleOwner: 0, // Remove the raw capsuleOwner object
          capsuleCreator: 0, // Remove the raw capsuleCreator object
          pageStreamData: 0, // Remove the raw pageStreamData object
        },
      },
      // Re-sort after $group to maintain consistent order
      { $sort: { UploadedOn: -1, _id: -1 } },
    ];

    const posts = await Chapter.aggregate(pipeline).exec();

    // Add user's interaction status for each post and clean up user data
    if (req.session.user && req.session.user._id) {
      const userId = req.session.user._id;
      posts.forEach(function (post) {
        post.isLikedByMe = post.likes.some(function (like) {
          return String(like.LikedById) === String(userId);
        });
        post.isDislikedByMe = post.dislikes.some(function (dislike) {
          return String(dislike.UserId) === String(userId);
        });
        post.isCommentedByMe = post.comments.some(function (comment) {
          return String(comment.UserId) === String(userId);
        });

        // Remove user field from likes and dislikes (only keep for comments)
        post.likes.forEach(function (like) {
          delete like.user;
        });

        post.dislikes.forEach(function (dislike) {
          delete dislike.user;
        });
      });
    } else {
      // Remove user field from likes and dislikes even without session
      posts.forEach(function (post) {
        post.likes.forEach(function (like) {
          delete like.user;
        });

        post.dislikes.forEach(function (dislike) {
          delete dislike.user;
        });
      });
    }

    // Get total count for pagination (without skip/limit and interaction stages)
    const countPipeline = pipeline.slice(0, -15); // Remove skip, limit, and all interaction-related stages
    countPipeline.push({ $count: "total" });
    const countResult = await Chapter.aggregate(countPipeline).exec();
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    // Calculate hexcode_blendedImage and clean BlendSettings before sending response
    const crypto = require('crypto');
    const cleanedPosts = posts.map(post => {
      // Calculate hexcode_blendedImage for blended posts
      let hexcode_blendedImage = null;
      if (post.BlendSettings) {
        const blendImage1 = post.BlendSettings.blendImage1 || post.BlendSettings.image1Url;
        const blendImage2 = post.BlendSettings.blendImage2 || post.BlendSettings.image2Url;
        const blendMode = post.BlendSettings.blendMode;
        
        if (blendImage1 && blendImage2 && blendMode && blendImage1 !== blendImage2) {
          const data = blendImage1 + blendImage2 + blendMode;
          const hexcode = crypto.createHash("md5").update(data).digest("hex");
          if (hexcode) {
            hexcode_blendedImage = `/streamposts/${hexcode}.png`;
          }
        } else if (blendImage1 === blendImage2 && blendImage1) {
          // For single image posts, use the image itself
          hexcode_blendedImage = blendImage1.replace("/Media/img/300/", "/Media/img/600/");
        }
      }
      
      // Add hexcode_blendedImage to post
      if (hexcode_blendedImage) {
        post.hexcode_blendedImage = hexcode_blendedImage;
      }
      
      // Remove allBlendConfigurations from BlendSettings
      if (post.BlendSettings && post.BlendSettings.allBlendConfigurations) {
        const { allBlendConfigurations, ...cleanedBlendSettings } = post.BlendSettings;
        post.BlendSettings = cleanedBlendSettings;
      }
      return post;
    });

    res.json({
      code: 200,
      msg: "Success",
      response: cleanedPosts,
      count: totalCount,
      userCapsules: userCapsules.length,
      pagination: {
        skip: skip,
        limit: limit,
        hasMore: skip + limit < totalCount,
      },
      filters: {
        type: type,
        selectedKeyword: selectedKeyword,
      },
    });
  } catch (error) {
    res.json({
      code: 500,
      msg: "Error fetching posts from purchased capsules",
      error: error.message,
      response: [],
    });
  }
};

/*________________________________________________________________________
   * @Date:      		2025-10-31
   * @Method :   		getUserMixedFeedPosts
   * @Purpose:   		Fetch posts from user's streams (SyncedPost, Delivered=false) + 
   *                  posts where friends interacted (from any stream)
   * @Param:     		limit, skip, type, selectedKeyword
   * @Return:    	 	Mixed feed with same format as getUserPurchasedCapsulesPosts
   * @Access Category:	"User Feed"
   * @Collections:     SyncedPost (base), MediaActionLogs, StreamLikes, StreamComments
_________________________________________________________________________
*/
var getUserMixedFeedPosts = async function (req, res) {
  try {
    // ✅ CRITICAL: Check if user is logged in
    if (!req.session || !req.session.user || !req.session.user._id) {
      console.error('❌ getUserMixedFeedPosts - No user session found');
      return res.status(401).json({
        code: 401,
        msg: "Unauthorized - User not logged in",
        response: [],
        count: 0
      });
    }

    const limit = req.body.limit || 10;
    const skip = req.body.skip || 0;
    const type = req.body.type || null;
    const selectedKeyword = req.body.selectedKeyword || null;
    const loginUserId = req.session.user._id;

    const Friend = require('./../models/friendsModel.js');
    const SyncedPost = require('./../models/syncedpostModel.js');
    const StreamLikes = require('./../models/StreamLikes.js');
    const StreamComments = require('./../models/StreamCommentsModel.js');
    const StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
    const User = require('./../models/userModel.js');
    const StreamMember = require('./../models/StreamMembersModel.js');
    const loginUserObjectId = new mongoose.Types.ObjectId(loginUserId);
    const streamCommentLikesCollection =
      (StreamCommentLikes.collection && (StreamCommentLikes.collection.collectionName || StreamCommentLikes.collection.name)) ||
      'streamcommentlikes';
    
    console.log('🚀 getUserMixedFeedPosts - Start', { userId: loginUserId, limit, skip, type, selectedKeyword });
    const startTime = Date.now();
    const perfLog = {}; // Performance tracking

    // ✅ OPTIMIZATION 1: Parallelize initial queries
    const t1 = Date.now();
    const [friends, userCapsules, userMemberships] = await Promise.all([
      // STEP 1: Get user's friends
      Friend.find({
      UserID: String(loginUserId),
      IsDeleted: false,
      Status: true,
      'Friend.IsRegistered': true
      }).lean().maxTimeMS(10000), // 10 second timeout
      
      // STEP 2: Get user's owned capsules (for filtering user's own posts)
      Capsule.find({
        OwnerId: new mongoose.Types.ObjectId(loginUserId),
        IsDeleted: { $ne: true },
      }).lean().maxTimeMS(10000), // 10 second timeout

      // STEP 3: Get user's stream memberships (for InvitedFriends privacy)
      StreamMember.find({
        Members: new mongoose.Types.ObjectId(loginUserId),  // ✅ Members is an array
        IsDeleted: false,
        Status: true
      }).select('StreamId').lean().maxTimeMS(10000)
    ]);

    const friendIds = friends
      .map(f => {
        try {
          return f.Friend && f.Friend.ID ? new mongoose.Types.ObjectId(f.Friend.ID) : null;
        } catch (e) {
          return null;
        }
      })
      .filter(id => id !== null);

    const userCapsuleIds = userCapsules.map((c) => c._id);
    
    // Extract capsule IDs where user is a member (for InvitedFriends privacy)
    const memberCapsuleIds = userMemberships.map(m => new mongoose.Types.ObjectId(m.StreamId));
    
    perfLog.step1_friends_capsules = Date.now() - t1;
    console.log(`📊 getUserMixedFeedPosts: friends=${friends.length}/${friendIds.length} capsules=${userCapsuleIds.length} memberships=${memberCapsuleIds.length} [${perfLog.step1_friends_capsules}ms]`);

    // ✅ OPTIMIZATION 2: Parallelize interaction queries
    let friendInteractedPostIds = [];
    
    if (friendIds.length > 0) {
      // STEP 3: Get PostIds where friends have interacted (from any stream)
      const t2 = Date.now();
      const [streamLikes, streamComments, streamCommentLikes] = await Promise.all([
      // From StreamLikes
        StreamLikes.find({
        UserId: { $in: friendIds },
        IsDeleted: false
        }, { SocialPostId: 1 }).lean(),
      
      // From StreamComments
        StreamComments.find({
        UserId: { $in: friendIds },
        IsDeleted: 0
        }, { SocialPostId: 1 }).lean(),
      
      // From StreamCommentLikes (friends who liked comments)
        StreamCommentLikes.find({
        LikedById: { $in: friendIds },
        IsDeleted: false
        }).populate('CommentId', 'SocialPostId').lean()
      ]);
      
      // Combine all PostIds
      const postIdsSet = new Set();
      
      streamLikes.forEach(like => {
        if (like.SocialPostId) postIdsSet.add(String(like.SocialPostId));
      });
      
      streamComments.forEach(comment => {
        if (comment.SocialPostId) postIdsSet.add(String(comment.SocialPostId));
      });
      
      streamCommentLikes.forEach(commentLike => {
        if (commentLike.CommentId && commentLike.CommentId.SocialPostId) {
          postIdsSet.add(String(commentLike.CommentId.SocialPostId));
        }
      });
      
      friendInteractedPostIds = Array.from(postIdsSet).map(id => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (e) {
          return null;
        }
      }).filter(id => id !== null);
      
      perfLog.step2_interactions = Date.now() - t2;
      console.log(`📊 getUserMixedFeedPosts: friendInteractedPosts=${friendInteractedPostIds.length} [${perfLog.step2_interactions}ms]`);
    }

    // STEP 4: Query SyncedPost for BOTH sources
    // Source 1: User's stream posts (Delivered = false)
    // Source 2: Posts where friends interacted (any stream)
    
    // ⚡ CRITICAL FIX: Build $or array only with valid conditions
    const orConditions = [];
    
    // Always add user's own capsules condition (even if empty array)
    if (userCapsuleIds.length > 0) {
      orConditions.push({
        CapsuleId: { $in: userCapsuleIds },
        IsDeleted: false,
        Status: true,
        'EmailEngineDataSets.Delivered': false
      })
    }

    // Add friend-interacted posts condition only if there are any
    if (friendInteractedPostIds.length > 0) {
      orConditions.push({
        PostId: { $in: friendInteractedPostIds },
        IsDeleted: false,
        Status: true
      })
    }
    
    // ⚡ CRITICAL: If no conditions, return empty result immediately
    if (orConditions.length === 0) {
      console.log('❌ No capsules or friend interactions found, returning empty result');
      return res.json({
        code: 200,
        msg: "Success",
        response: [],
        count: 0,
        userCapsules: 0,
        friendsCount: friends.length,
        friendInteractedPostsCount: 0,
        pagination: { skip: skip, limit: limit, hasMore: false },
        filters: { type: type, selectedKeyword: selectedKeyword },
      });
    }
    
    const syncedPostConditions = {
      $or: orConditions
    };
    
    // ⚡ CRITICAL: First check if any documents match before running expensive aggregation
    const t_count = Date.now();
    const matchCount = await SyncedPost.countDocuments(syncedPostConditions).maxTimeMS(5000);
    console.log(`📊 getUserMixedFeedPosts: matchedSyncedPosts=${matchCount} [${Date.now() - t_count}ms]`);
    
    if (matchCount === 0) {
      console.log('❌ No SyncedPost documents found, returning empty result');
      return res.json({
        code: 200,
        msg: "Success - No posts found",
        response: [],
        count: 0,
        userCapsules: userCapsuleIds.length,
        friendsCount: friends.length,
        friendInteractedPostsCount: friendInteractedPostIds.length,
        pagination: { skip: skip, limit: limit, hasMore: false },
        filters: { type: type, selectedKeyword: selectedKeyword },
      });
    }

    const pipeline = [
      { $match: syncedPostConditions },
      
      // ⚡ CRITICAL FIX: Sort and paginate BEFORE unwinding to reduce row count
      { $sort: { CreatedOn: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit * 10 },  // Get 10× limit to account for duplicates after unwind
      
      // NOW unwind EmailEngineDataSets (only on limited docs!)
      { $unwind: { path: "$EmailEngineDataSets", preserveNullAndEmptyArrays: false } },
      
      // NOW deduplicate by PostId
      {
        $group: {
          _id: "$PostId",
          // Keep first occurrence of all fields
          doc_id: { $first: "$_id" },
          CapsuleId: { $first: "$CapsuleId" },
          PageId: { $first: "$PageId" },
          PostId: { $first: "$PostId" },
          PostStatement: { $first: "$PostStatement" },
          postTags: { $first: "$postTags" }, // ✅ Added: Include postTags from SyncedPost
          PostOwnerId: { $first: "$PostOwnerId" },
          SyncedBy: { $first: "$SyncedBy" },
          ReceiverEmails: { $first: "$ReceiverEmails" },
          CreatedOn: { $first: "$CreatedOn" },
          Delivered: { $first: "$EmailEngineDataSets.Delivered" },
          VisualUrls: { $first: "$EmailEngineDataSets.VisualUrls" },
          SoundFileUrl: { $first: "$EmailEngineDataSets.SoundFileUrl" },
          TextAboveVisual: { $first: "$EmailEngineDataSets.TextAboveVisual" },
          TextBelowVisual: { $first: "$EmailEngineDataSets.TextBelowVisual" },
          DateOfDelivery: { $first: "$EmailEngineDataSets.DateOfDelivery" },
          BlendMode: { $first: "$EmailEngineDataSets.BlendMode" },
          EmailTemplate: { $first: "$EmailTemplate" },
          Subject: { $first: "$EmailSubject" },
          IsOnetimeStream: { $first: "$IsOnetimeStream" },
          IsOnlyPostImage: { $first: "$IsOnlyPostImage" },
          hexcode_blendedImage_temp: { $first: "$EmailEngineDataSets.hexcode_blendedImage" },
          UploaderID: { $first: "$UploaderID" }, // ✅ Preserve for uploader lookup
        },
      },
      
      // Limit again after grouping to get exactly what we need
      { $limit: limit },
      
      // Project to restore field structure
      {
        $project: {
          _id: "$doc_id",
          CapsuleId: 1,
          PageId: 1,
          PostId: 1,
          PostStatement: 1,
          postTags: 1, // ✅ Added: Include postTags from SyncedPost
          PostOwnerId: 1,
          SyncedBy: 1,
          ReceiverEmails: 1,
          CreatedOn: 1,
          Delivered: 1,
          VisualUrls: 1,
          SoundFileUrl: 1,
          TextAboveVisual: 1,
          TextBelowVisual: 1,
          DateOfDelivery: 1,
          BlendMode: 1,
          EmailTemplate: 1,
          Subject: 1,
          IsOnetimeStream: 1,
          IsOnlyPostImage: 1,
          hexcode_blendedImage_temp: 1,
          UploaderID: 1, // ✅ Preserve for uploader lookup
        },
      },
      
      // Lookup actual Media document for additional fields
      {
        $lookup: {
          from: "media",
          let: { postId: "$PostId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$postId" }] }
              }
            }
          ],
          as: "mediaDoc"
        }
      },
      { $unwind: { path: "$mediaDoc", preserveNullAndEmptyArrays: true } },
      
      // Add media fields to root
      {
        $addFields: {
          MediaType: "$mediaDoc.MediaType",
          LinkType: "$mediaDoc.LinkType",
          Content: "$mediaDoc.Content",
          Location: "$mediaDoc.Location",
          UploadedBy: "$mediaDoc.UploadedBy",
          UploadedOn: { $ifNull: ["$mediaDoc.UploadedOn", "$CreatedOn"] },
          UploaderID: "$mediaDoc.UploaderID",
          GroupTags: "$mediaDoc.GroupTags",
          BlendSettings: "$mediaDoc.BlendSettings",
          thumbnail: "$mediaDoc.thumbnail",
          Locator: "$mediaDoc.Locator",
          AutoId: "$mediaDoc.AutoId",
          ContentType: "$mediaDoc.ContentType",
        }
      },
      
      // Apply media type filter
      ...(type && type !== "all"
        ? [
            {
              $match: {
                $or: [
                  { MediaType: type },
                  ...(type === "Image"
                    ? [
                        { MediaType: "Link", LinkType: "image" },
                        { MediaType: "1MJPost" },
                        { MediaType: "2MJPost" },
                        { MediaType: "1UnsplashPost" },
                        { MediaType: "2UnsplashPost" },
                      ]
                    : []),
                  ...(type === "Video"
                    ? [
                        { MediaType: "Link", LinkType: { $ne: "image" } },
                        { MediaType: "Video" },
                        { MediaType: "Audio" },
                      ]
                    : []),
                ],
              },
            },
          ]
        : []),

      // Apply keyword filter
      ...(selectedKeyword
        ? [
            {
              $match: {
                $or: [
                  { "GroupTags.GroupTagID": selectedKeyword },
                  { GroupTags: selectedKeyword },
                ],
              },
            },
          ]
        : []),
      
      // ⚡ ULTRA-OPTIMIZED: Combine Capsule + Owner lookup in single stage
      {
        $lookup: {
          from: "Capsules",
          let: { capsuleId: "$CapsuleId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$capsuleId"] } } },
            { $limit: 1 },
            // Nested lookup for owner (faster in subpipeline)
      {
        $lookup: {
                from: "users",
                localField: "OwnerId",
          foreignField: "_id",
                as: "owner"
              }
            },
            { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                Title: 1,
                OwnerId: 1,
                ownerName: "$owner.Name",
                ownerEmail: "$owner.Email",
                ownerProfilePic: "$owner.ProfilePic"
              }
            }
          ],
          as: "capsuleData"
        }
      },
      { $unwind: { path: "$capsuleData", preserveNullAndEmptyArrays: true } },
      
      // ⚡ Lookup post uploader (creator) details
      {
        $lookup: {
          from: "users",
          let: { uploaderId: "$UploaderID" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [
                    { $toString: "$_id" },  // ✅ Convert ObjectId to string
                    "$$uploaderId"           // ✅ UploaderID is stored as string
                  ] 
                }
              }
            },
            {
              $project: {
                Name: 1,
                ProfilePic: 1
              }
            }
          ],
          as: "uploaderData"
        }
      },
      { $unwind: { path: "$uploaderData", preserveNullAndEmptyArrays: true } },
      
      // Add capsule and page info to root (minimal fields only)
      {
        $addFields: {
          capsuleId: "$CapsuleId",
          capsuleOwnerId: "$capsuleData.OwnerId", // ✅ For OwnerId in like/comment API
          postOwnerId: "$PostOwnerId", // ✅ For PostOwnerId in like/comment API
          capsuleTitle: "$capsuleData.Title",
          capsuleOwnerName: "$capsuleData.ownerName",
          capsuleOwnerEmail: "$capsuleData.ownerEmail",
          capsuleOwnerProfilePic: "$capsuleData.ownerProfilePic",
          // ✅ Add post creator (uploader) details - ONLY name and pic
          capsuleCreatorName: "$uploaderData.Name",
          capsuleCreatorProfilePic: "$uploaderData.ProfilePic",
          pageId: "$PageId",
        }
      },
      
      // Sort by upload date (newest first)
      { $sort: { UploadedOn: -1, _id: -1 } },
      
      // ⚡ CRITICAL FIX: Group by PostId IMMEDIATELY after media lookup to deduplicate
      // This prevents EmailEngineDataSets multiplication (12 datasets × 4 comments = 48 fake comments!)
      {
        $group: {
          _id: "$PostId",
          firstDoc: { $first: "$$ROOT" }
        }
      },
      
      // Restore document structure
      {
        $replaceRoot: { newRoot: "$firstDoc" }
      },
      
      // NOW lookup interactions on deduplicated posts (4 comments, not 48!)
      {
        $lookup: {
          from: "StreamLikes",
          let: { syncedPostId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$SocialPostId", "$$syncedPostId"] },
                    { $ne: ["$IsDeleted", true] },
                    { $ne: ["$IsDeleted", 1] }
                  ]
                }
              }
            },
            // Lookup user details for each like
            {
              $lookup: {
                from: "users",
                localField: "UserId",
                foreignField: "_id",
                as: "user"
              }
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                UserId: 1,
                CreatedOn: 1,
                UpdatedOn: 1,
                IsDeleted: 1,
                user: {
                  _id: "$user._id",
                  Name: "$user.Name",
                  UserName: "$user.UserName",
                  ProfilePic: "$user.ProfilePic",
                  Email: "$user.Email"
                }
              }
            }
          ],
          as: "likes",
        },
      },
      // ⚡ Lookup comments with PRIVACY FILTERING
      {
        $lookup: {
          from: "StreamComments",
          let: { 
            syncedPostId: "$_id",  // Use SyncedPost _id (not PostId) since comments use SyncedPost._id as SocialPostId
            capsuleId: "$capsuleId"
          },
          pipeline: [
            {
              $match: {
                $and: [
                  // IsDeleted filter
                  {
                    $expr: { 
                      $and: [
                        { $eq: ["$SocialPostId", "$$syncedPostId"] },
                        { $ne: ["$IsDeleted", true] },
                        { $ne: ["$IsDeleted", 1] }
                      ]
                    }
                  },
                  // Top-level comments only (no ParentId)
                  {
                    $or: [
                      { ParentId: { $exists: false } },
                      { ParentId: null }
                    ]
                  },
                  // ✅ PRIVACY FILTER (FAST - In aggregation!)
                  {
                    $or: [
                      // 1. PublicWithName or no setting
                      { PrivacySetting: { $exists: false } },
                      { PrivacySetting: 'PublicWithName' },
                      
                      // 2. PublicWithoutName (will anonymize later)
                      { PrivacySetting: 'PublicWithoutName' },
                      
                      // 3. OnlyForOwner - you're the author
                      { 
                        PrivacySetting: 'OnlyForOwner',
                        UserId: new mongoose.Types.ObjectId(loginUserId)
                      },
                      
                      // 4. OnlyForOwner - you're the stream owner
                      { 
                        PrivacySetting: 'OnlyForOwner',
                        OwnerId: new mongoose.Types.ObjectId(loginUserId)
                      },
                      
                      // 5. InvitedFriends - you're a member of this stream
                      { 
                        PrivacySetting: 'InvitedFriends',
                        $expr: { $in: ["$$capsuleId", memberCapsuleIds] }
                      }
                    ]
                  }
                ]
              }
            },
            // Sort by creation date (newest first)
            { $sort: { CreatedOn: -1 } },
            // Limit to first 10 top-level comments for performance
            { $limit: 10 },
            // Lookup user data for comment author (only essential fields)
      {
        $lookup: {
          from: "users",
                let: { userId: "$UserId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$userId"] }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      Name: 1,
                      UserName: 1,
                      ProfilePic: 1,
                      Email: 1
                    }
                  }
                ],
                as: "user"
              }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            // Lookup comment likes (with user details)
            {
              $lookup: {
                from: streamCommentLikesCollection,
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $and: [
                          { $eq: ["$CommentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  },
                  {
                    $lookup: {
                      from: "users",
                      localField: "LikedById",
                      foreignField: "_id",
                      as: "likedByUser"
                    }
                  },
                  { $unwind: { path: "$likedByUser", preserveNullAndEmptyArrays: true } },
                  {
                    $project: {
                      _id: 1,
                      CommentId: 1,
                      SocialPageId: 1,
                      LikedById: 1,
                      CreatedOn: 1,
                      likedByUser: {
                        _id: "$likedByUser._id",
                        Name: "$likedByUser.Name",
                        UserName: "$likedByUser.UserName",
                        ProfilePic: "$likedByUser.ProfilePic",
                        Email: "$likedByUser.Email"
                      }
                    }
                  }
                ],
                as: "commentLikes"
              }
            },
            // ✅ Lookup replies for this comment (limit to first 2 for performance)
            {
              $lookup: {
                from: "StreamComments",
                let: { 
                  commentId: "$_id",
                  capsuleId: "$$capsuleId"  // Pass capsuleId from parent lookup
                },
                pipeline: [
                  {
                    $match: {
                      $and: [
                        // ParentId and IsDeleted filter
                        {
                          $expr: { 
                            $and: [
                              { $eq: ["$ParentId", "$$commentId"] },
                              { $ne: ["$IsDeleted", true] },
                              { $ne: ["$IsDeleted", 1] }
                            ]
                          }
                        },
                        // ✅ PRIVACY FILTER for replies (same as comments)
                        {
                          $or: [
                            { PrivacySetting: { $exists: false } },
                            { PrivacySetting: 'PublicWithName' },
                            { PrivacySetting: 'PublicWithoutName' },
                            { PrivacySetting: 'OnlyForOwner', UserId: loginUserObjectId },
                            { PrivacySetting: 'OnlyForOwner', OwnerId: loginUserObjectId },
                            { PrivacySetting: 'InvitedFriends', $expr: { $in: ["$$capsuleId", memberCapsuleIds] } }
                          ]
                        }
                      ]
                    }
                  },
                  { $sort: { CreatedOn: 1 } }, // Replies sorted oldest first
                  { $limit: 2 }, // ⚡ Only first 2 replies per comment for faster load
                  // Lookup user data for reply author (only essential fields)
                  {
                    $lookup: {
                      from: "users",
                      let: { userId: "$UserId" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$_id", "$$userId"] }
                          }
                        },
                        {
                          $project: {
                            _id: 1,
                            Name: 1,
                            UserName: 1,
                            ProfilePic: 1,
                            Email: 1
                          }
                        }
                      ],
                      as: "user"
                    }
                  },
                  { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
                  // Lookup reply likes (with user details)
                  {
                    $lookup: {
                      from: streamCommentLikesCollection,
                      let: { replyId: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { 
                              $and: [
                                { $eq: ["$CommentId", "$$replyId"] },
                                { $ne: ["$IsDeleted", true] },
                                { $ne: ["$IsDeleted", 1] }
                              ]
                            }
                          }
                        },
                        {
                          $lookup: {
                            from: "users",
                            localField: "LikedById",
                            foreignField: "_id",
                            as: "likedByUser"
                          }
                        },
                        { $unwind: { path: "$likedByUser", preserveNullAndEmptyArrays: true } },
                        {
                          $project: {
                            _id: 1,
                            CommentId: 1,
                            SocialPageId: 1,
                            LikedById: 1,
                            CreatedOn: 1,
                            likedByUser: {
                              _id: "$likedByUser._id",
                              Name: "$likedByUser.Name",
                              UserName: "$likedByUser.UserName",
                              ProfilePic: "$likedByUser.ProfilePic",
                              Email: "$likedByUser.Email"
                            }
                          }
                        }
                      ],
                      as: "replyLikes"
                    }
                  },
                  {
                    $addFields: {
                      replyLikes: {
                        $filter: {
                          input: "$replyLikes",
                          cond: { $ne: ["$$this", null] }
                        }
                      },
                      CommentLikeCount: { $size: "$replyLikes" },
                      likedByCurrentUser: {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: "$replyLikes",
                                cond: {
                                  $and: [
                                    { $ne: ["$$this", null] },
                                    { $eq: ["$$this.LikedById", loginUserObjectId] }
                                  ]
                                }
                              }
                            }
                          },
                          0
                        ]
                      }
                    }
                  },
                  // Project reply fields
                  {
                    $project: {
                      _id: 1,
                      UserId: 1,
                      ParentId: 1,
                      Comment: 1,
                      CreatedOn: 1,
                      PrivacySetting: 1,
                      user: 1,
                      CommentLikeCount: 1,
                      likedByCurrentUser: { $ifNull: ["$likedByCurrentUser", false] },
                      likes: {
                        $map: {
                          input: "$replyLikes",
                          as: "like",
                          in: {
                            _id: "$$like._id",
                            CommentId: "$$like.CommentId",
                            SocialPageId: "$$like.SocialPageId",
                            LikedById: "$$like.LikedById",
                            CreatedOn: "$$like.CreatedOn",
                            likedByUser: "$$like.likedByUser"
                          }
                        }
                      }
                    }
                  }
                ],
                as: "replies"
              }
            },
            // ✅ Count TOTAL replies (not just fetched 2)
            {
              $lookup: {
                from: "StreamComments",
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $and: [
                          { $eq: ["$ParentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  },
                  { $count: "total" }
                ],
                as: "replyCountArr"
              }
            },
            // Add counts
      {
        $addFields: {
                commentLikesFiltered: {
                  $filter: {
                    input: "$commentLikes",
                    cond: {
                      $and: [
                        { $ne: ["$$this.IsDeleted", true] },
                        { $ne: ["$$this.IsDeleted", 1] }
                      ]
                    }
                  }
                }
              }
            },
            {
              $addFields: {
                CommentLikeCount: { $size: "$commentLikesFiltered" },
                replyCount: { $ifNull: [{ $arrayElemAt: ["$replyCountArr.total", 0] }, 0] }
              }
            },
            {
              $addFields: {
                likedByCurrentUser: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$commentLikesFiltered",
                          cond: {
                            $eq: ["$$this.LikedById", loginUserObjectId]
                          }
                        }
                      }
                    },
                    0
                  ]
                },
                likes: {
                  $map: {
                    input: "$commentLikesFiltered",
                    as: "like",
                    in: {
                      _id: "$$like._id",
                      CommentId: "$$like.CommentId",
                      SocialPageId: "$$like.SocialPageId",
                      LikedById: "$$like.LikedById",
                      CreatedOn: "$$like.CreatedOn",
                      likedByUser: "$$like.likedByUser"
                    }
                  }
                }
              }
            },
            // Project comment fields
            {
              $project: {
                _id: 1,
                UserId: 1,
                Comment: 1,
                CreatedOn: 1,
                PrivacySetting: 1,
                user: 1,
                CommentLikeCount: 1,
                replies: 1, // ✅ Include full replies array
                replyCount: 1,
                likedByCurrentUser: 1,
                likes: 1
              }
            }
          ],
          as: "comments"
        }
      },
      
      // Add interaction counts
      {
        $addFields: {
          likeCount: {
            $size: {
              $filter: {
                input: "$likes",
                cond: { $eq: ["$$this.IsDeleted", false] }
            }
          }
        },
          commentCount: { $size: "$comments" }
        }
      },
      // Project final structure matching getUserPurchasedCapsulesPosts
      {
        $lookup: {
          from: "users",
          localField: "likes.LikedById",
          foreignField: "_id",
          as: "likesUsers"
        }
      },
      {
        $addFields: {
          likes: {
            $map: {
              input: "$likes",
              as: "like",
              in: {
                $mergeObjects: [
                  "$$like",
                  {
                    likedByUser: {
                      $let: {
                        vars: {
                          matchedUser: {
                            $first: {
                              $filter: {
                                input: "$likesUsers",
                                as: "userDoc",
                                cond: { $eq: ["$$userDoc._id", "$$like.LikedById"] }
                              }
                            }
                          }
                        },
                        in: {
                          _id: "$$matchedUser._id",
                          Name: "$$matchedUser.Name",
                          UserName: "$$matchedUser.UserName",
                          ProfilePic: "$$matchedUser.ProfilePic",
                          Email: "$$matchedUser.Email"
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          likesUsers: 0
        }
      },
      {
        $project: {
          _id: "$PostId",
          MediaType: 1,
          LinkType: 1,
          Content: 1,
          Location: 1,
          UploadedBy: 1,
          UploadedOn: 1,
          UploaderID: 1,
          GroupTags: 1,
          BlendSettings: 1,
          thumbnail: 1,
          Locator: 1,
          AutoId: 1,
          ContentType: 1,
          PostStatement: 1,
          postTags: 1, // ✅ Added: Include postTags from SyncedPost
          VisualUrls: 1,
          BlendMode: 1,
          hexcode_blendedImage_temp: 1,
          capsuleId: 1,
          capsuleOwnerId: 1,
          postOwnerId: 1,
          capsuleTitle: 1,
          capsuleOwnerName: 1,
          capsuleOwnerEmail: 1,
          capsuleOwnerProfilePic: 1,
          capsuleCreatorName: 1,
          capsuleCreatorProfilePic: 1,
          pageId: 1,
          likes: 1,
          comments: 1,
          likeCount: 1,
          commentCount: 1
        }
      },
      // Re-sort by creation date (already done earlier, but ensure final order)
      { $sort: { CreatedOn: -1, _id: -1 } },
    ];

      const t3 = Date.now();
    
    const posts = await SyncedPost.aggregate(pipeline, {
      allowDiskUse: true,
      maxTimeMS: 30000 // 30 second timeout
    }).exec();
    
    console.log('🧪 getUserMixedFeedPosts debug', {
      requested: { skip, limit },
      matchCount,
      aggregatedCount: posts.length,
      aggregatedPostIds: posts.map(post => post._id),
    });
    
      perfLog.step3_main_aggregation = Date.now() - t3;
      console.log(`✅ Aggregation completed [posts=${posts.length}, duration=${perfLog.step3_main_aggregation}ms]`);

    // Targeted diagnostics for comment likes
    posts.forEach((post) => {
      if (!Array.isArray(post.comments) || post.comments.length === 0) return;
      post.comments.slice(0, 10).forEach((comment) => {
        console.log('🧪 CommentLikeDebug', {
          postId: post._id,
          commentId: comment._id,
          commentLikeCount: comment.CommentLikeCount,
          likedByCurrentUser: comment.likedByCurrentUser,
          likesArrayLength: Array.isArray(comment.likes) ? comment.likes.length : 0,
          likeIds: Array.isArray(comment.likes) ? comment.likes.map(like => like._id) : []
        });
      });
    });

    // Add user's interaction status AND friend activity metadata for each post
    if (req.session.user && req.session.user._id) {
      const userId = req.session.user._id;
      const userIdStr = String(userId);
      
      // ✅ Fetch friend names for activity display
      const Friend = require('./../models/friendsModel.js');
      const User = require('./../models/userModel.js');
      
      // Get friend names in parallel with interaction checking
      const friendIdToNameMap = {};
      if (friendIds.length > 0) {
        const friendUsers = await User.find(
          { _id: { $in: friendIds } },
          { _id: 1, Name: 1 }
        ).lean().exec();
        
        friendUsers.forEach(function(user) {
          friendIdToNameMap[String(user._id)] = user.Name;
        });
      }
      
      posts.forEach(function (post) {
        // Check if user liked this post
        post.isLikedByMe = post.likes && post.likes.some(function (like) {
          return String(like.LikedById) === String(userId);
        });
        
        // Check if user commented on this post
        post.isCommentedByMe = post.comments && post.comments.some(function (comment) {
          return String(comment.UserId) === String(userId);
        });
        
        // ✅ NEW: Add friend activity metadata with names!
        // Find which friends interacted with this post
        const friendsWhoLiked = [];
        const friendsWhoCommented = [];
        
        if (post.likes && post.likes.length > 0) {
          post.likes.forEach(function(like) {
            const likeUserIdStr = String(like.LikedById);
            // Check if this like is from a friend (not the user themselves)
            if (likeUserIdStr !== userIdStr && friendIds.some(fid => String(fid) === likeUserIdStr)) {
              const friendName = friendIdToNameMap[likeUserIdStr] || 'Unknown Friend';
              friendsWhoLiked.push({ id: likeUserIdStr, name: friendName });
            }
          });
        }
        
        if (post.comments && post.comments.length > 0) {
          post.comments.forEach(function(comment) {
            const commentUserIdStr = String(comment.UserId);
            // Check if this comment is from a friend (not the user themselves)
            if (commentUserIdStr !== userIdStr && friendIds.some(fid => String(fid) === commentUserIdStr)) {
              const friendName = friendIdToNameMap[commentUserIdStr] || 'Unknown Friend';
              // Avoid duplicates
              if (!friendsWhoCommented.some(f => f.id === commentUserIdStr)) {
                friendsWhoCommented.push({ id: commentUserIdStr, name: friendName });
              }
            }
          });
        }
        
        // Add friend activity summary
        post.friendActivity = {
          friendsWhoLiked: friendsWhoLiked.slice(0, 3), // Max 3 friends with names
          friendsWhoCommented: friendsWhoCommented.slice(0, 3), // Max 3 friends with names
          totalFriendsInteracted: [...new Set([
            ...friendsWhoLiked.map(f => f.id), 
            ...friendsWhoCommented.map(f => f.id)
          ])].length
        };
        
        // ✅ NOTE: We keep user data for PublicWithoutName comments
        // Frontend will decide whether to show name or "Anonymous" based on:
        // - If comment.UserId === loggedInUserId → Show real name/pic (author sees themselves)
        // - If comment.UserId !== loggedInUserId → Show "Anonymous" (others see anonymous)
        
        // Initialize dislikes (StreamLikes doesn't have dislikes, only likes)
        post.dislikes = [];
        post.dislikeCount = 0;
        post.isDislikedByMe = false;
      });
    } else {
      // Initialize interaction status without session
      posts.forEach(function (post) {
        post.isLikedByMe = false;
        post.isDislikedByMe = false;
        post.isCommentedByMe = false;
        post.dislikes = [];
        post.dislikeCount = 0;
        post.friendActivity = { friendsWhoLiked: [], friendsWhoCommented: [], totalFriendsInteracted: 0 };
      });
    }

    // ⚡ SIMPLIFIED COUNT: Just count matching SyncedPosts (fast, approximate)
    // Note: This is approximate since we paginate before deduplication
    const t4 = Date.now();
    const totalCount = await SyncedPost.countDocuments(syncedPostConditions).exec();
    perfLog.step4_count_aggregation = Date.now() - t4;

    // Calculate hexcode_blendedImage and clean BlendSettings
    const t5 = Date.now();
    const crypto = require('crypto');
    const fs = require('fs');
    const cleanedPosts = posts.map(post => {
      // Calculate hexcode_blendedImage for blended posts
      let hexcode_blendedImage = post.hexcode_blendedImage_temp || null;
      
      if (!hexcode_blendedImage && post.VisualUrls && post.VisualUrls.length >= 2 && post.BlendMode) {
        const blendImage1 = post.VisualUrls[0];
        const blendImage2 = post.VisualUrls[1];
        const blendMode = post.BlendMode;
        
        if (blendImage1 && blendImage2 && blendMode && blendImage1 !== blendImage2) {
          const data = blendImage1 + blendImage2 + blendMode;
          const hexcode = crypto.createHash("md5").update(data).digest("hex");
          if (hexcode) {
            hexcode_blendedImage = `/streamposts/${hexcode}.png`;
          }
        } else if (blendImage1 === blendImage2 && blendImage1) {
          // For single image posts, use the image itself
          hexcode_blendedImage = blendImage1.replace("/Media/img/300/", "/Media/img/600/");
        }
      }
      
      // Add hexcode_blendedImage to post
      if (hexcode_blendedImage) {
        post.hexcode_blendedImage = hexcode_blendedImage;
      }
      
      // Remove temporary field
      delete post.hexcode_blendedImage_temp;
      
      // Remove allBlendConfigurations from BlendSettings
      if (post.BlendSettings && post.BlendSettings.allBlendConfigurations) {
        const { allBlendConfigurations, ...cleanedBlendSettings } = post.BlendSettings;
        post.BlendSettings = cleanedBlendSettings;
      }
      
      return post;
    });

    res.json({
      code: 200,
      msg: "Success",
      response: cleanedPosts,
      count: totalCount,
      userCapsules: userCapsules.length,
      friendsCount: friends.length,
      friendInteractedPostsCount: friendInteractedPostIds.length,
      pagination: {
        skip: skip,
        limit: limit,
        hasMore: skip + limit < totalCount,
      },
      filters: {
        type: type,
        selectedKeyword: selectedKeyword,
      },
    });

    perfLog.step5_post_processing = Date.now() - t5;
    
    // ✅ Performance logging with breakdown
    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  PERFORMANCE BREAKDOWN:`);
    console.log(`   1. Friends + Capsules: ${perfLog.step1_friends_capsules}ms`);
    console.log(`   2. Interactions: ${perfLog.step2_interactions || 0}ms`);
    console.log(`   3. Main Aggregation: ${perfLog.step3_main_aggregation}ms ⚠️`);
    console.log(`   4. Count Aggregation: ${perfLog.step4_count_aggregation}ms ⚠️`);
    console.log(`   5. Post Processing: ${perfLog.step5_post_processing}ms`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   TOTAL: ${elapsed}ms\n`);
    console.log(`✅ getUserMixedFeedPosts completed | Posts: ${cleanedPosts.length}/${totalCount}`);
  } catch (error) {
    console.error("❌ Error in getUserMixedFeedPosts:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({
      code: 500,
      msg: "Error fetching mixed feed posts",
      error: error.message,
      errorDetails: error.toString(),
      response: [],
      count: 0
    });
  }
};

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		getUserFeedPosts
   * @Purpose:   		Fetch posts from user's streams (SyncedPost, Delivered=false) 
   *                  WITHOUT friend activities - only user's own capsule posts
   * @Param:     		limit, skip, type, selectedKeyword
   * @Return:    	 	Feed posts with same format as getUserMixedFeedPosts but no friend activities
   * @Access Category:	"User Feed"
   * @Collections:     SyncedPost (base), StreamLikes, StreamComments, StreamCommentLikes
_________________________________________________________________________*/

/**
 * Generic helper function to check for audio file existence for a given post ID
 * Can be used by getUserFeedPosts, getStreamPostsOptimized, getUserMixedFeedPosts, etc.
 * @param {string|ObjectId} postId - The post ID to check for audio file
 * @returns {Promise<Object|null>} - Audio file data object or null if not found
 */
var getPostAudioFileData = async function (postId) {
  if (!postId) return null;
  
  const path = require('path');
  const fs = require('fs');
  
  const postIdString = String(postId);
  // Support various audio formats including MPEG formats
  // .mp3 is MPEG-1 Audio Layer 3 (most common MPEG audio format)
  // Also support other MPEG audio formats: .mp2, .mp1, .mpa, .mpeg (audio)
  const audioFormats = [
    ".mp3",   // MPEG-1 Audio Layer 3 (most common)
    ".mp2",   // MPEG-1 Audio Layer 2
    ".mp1",   // MPEG-1 Audio Layer 1
    ".mpa",   // MPEG audio
    ".mpeg",  // MPEG audio (less common)
    ".wav",   // Waveform Audio
    ".m4a",   // MPEG-4 Audio
    ".ogg",   // Ogg Vorbis
    ".aac",   // Advanced Audio Coding
    ".flac",  // Free Lossless Audio Codec
    ".wma"    // Windows Media Audio
  ];
  // Audio files are stored in public/assets/postaudios
  const audioDir = path.join(__dirname, "../../public/assets/postaudios");
  
  for (let i = 0; i < audioFormats.length; i++) {
    const audioFile = path.join(audioDir, postIdString + audioFormats[i]);
    if (fs.existsSync(audioFile)) {
      // Get base URL from environment or use default
      // Ensure we use backend port (3002), not frontend port (3000)
      const baseUrl = (process.env.HOST_URL || process.HOST_URL || "http://localhost:3002").replace(':3000', ':3002');
      // Audio files are served from /assets/postaudios (public/assets/postaudios)
      const audioUrl = `${baseUrl}/assets/postaudios/${postIdString}${audioFormats[i]}`;
      
      return {
        exists: true,
        url: audioUrl,
        format: audioFormats[i],
        filename: `${postIdString}${audioFormats[i]}`
      };
    }
  }
  
  return null;
};

/**
 * Generic helper function to add audio file data to an array of posts
 * Can be used by getUserFeedPosts, getStreamPostsOptimized, getUserMixedFeedPosts, etc.
 * @param {Array} posts - Array of post objects
 * @returns {Promise<Array>} - Array of posts with audioFile property added
 */
var addAudioFileDataToPosts = async function (posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return posts;
  }
  
  const path = require('path');
  const fs = require('fs');
  
  // Process posts and check for audio files
  const postsWithAudio = await Promise.all(posts.map(async (post) => {
    // ✅ Check for audio file using PostId ONLY (from SyncedPost.PostId which references Media._id)
    // Audio files are named after the original Media document's _id, not SyncedPost's _id
    if (post.PostId) {
      const audioData = await getPostAudioFileData(post.PostId);
      if (audioData) {
        post.audioFile = audioData;
      } else {
        post.audioFile = null;
      }
    } else {
      post.audioFile = null;
    }
    
    return post;
  }));
  
  return postsWithAudio;
};

var getUserFeedPosts = async function (req, res) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 [BACKEND] getUserFeedPosts ENDPOINT CALLED');
    console.log('   Route: /capsules/getUserFeedPosts');
    console.log('   Note: This endpoint returns user\'s own capsule posts ONLY (NO friend activities)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ✅ CRITICAL: Check if user is logged in
    if (!req.session || !req.session.user || !req.session.user._id) {
      console.error('❌ [BACKEND] getUserFeedPosts - No user session found');
      return res.status(401).json({
        code: 401,
        msg: "Unauthorized - User not logged in",
        response: [],
        count: 0
      });
    }

    const limit = req.body.limit || 10;
    const skip = req.body.skip || 0;
    const type = req.body.type || null;
    const selectedKeyword = req.body.selectedKeyword || null;
    const loadOlderPosts = req.body.loadOlderPosts || false;  // Flag to specifically load older posts
    const loginUserId = req.session.user._id;

    const SyncedPost = require('./../models/syncedpostModel.js');
    const StreamLikes = require('./../models/StreamLikes.js');
    const StreamComments = require('./../models/StreamCommentsModel.js');
    const StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
    const User = require('./../models/userModel.js');
    const StreamMember = require('./../models/StreamMembersModel.js');
    const loginUserObjectId = new mongoose.Types.ObjectId(loginUserId);
    const streamCommentLikesCollection =
      (StreamCommentLikes.collection && (StreamCommentLikes.collection.collectionName || StreamCommentLikes.collection.name)) ||
      'streamcommentlikes';
    
    console.log('🚀 [BACKEND] getUserFeedPosts - Start', { 
      userId: loginUserId, 
      limit, 
      skip, 
      type, 
      selectedKeyword,
      endpoint: '/capsules/getUserFeedPosts'
    });
    const startTime = Date.now();
    const perfLog = {}; // Performance tracking

    // ✅ STEP 1: Get user's owned capsules and memberships (NO FRIEND QUERIES)
    const t1 = Date.now();
    const [userCapsules, userMemberships] = await Promise.all([
      // Get user's owned capsules (for filtering user's own posts)
      Capsule.find({
        OwnerId: new mongoose.Types.ObjectId(loginUserId),
        IsDeleted: { $ne: true },
      }).lean().maxTimeMS(10000),

      // Get user's stream memberships (for InvitedFriends privacy)
      StreamMember.find({
        Members: new mongoose.Types.ObjectId(loginUserId),
        IsDeleted: false,
        Status: true
      }).select('StreamId').lean().maxTimeMS(10000)
    ]);

    const userCapsuleIds = userCapsules.map((c) => c._id);
    
    // Extract capsule IDs where user is a member (for InvitedFriends privacy)
    const memberCapsuleIds = userMemberships.map(m => new mongoose.Types.ObjectId(m.StreamId));
    
    perfLog.step1_capsules = Date.now() - t1;
    console.log(`📊 getUserFeedPosts: capsules=${userCapsuleIds.length} memberships=${memberCapsuleIds.length} [${perfLog.step1_capsules}ms]`);

    // ✅ STEP 2: Query SyncedPost for user's own capsules ONLY (NO FRIEND INTERACTIONS)
    if (userCapsuleIds.length === 0) {
      console.log('❌ No capsules found, returning empty result');
      return res.json({
        code: 200,
        msg: "Success",
        response: [],
        count: 0,
        userCapsules: 0,
        pagination: { skip: skip, limit: limit, hasMore: false },
        filters: { type: type, selectedKeyword: selectedKeyword },
      });
    }
    
    // ✅ Calculate today's date (DATE ONLY - ignore time) - Same as getStreamPostsOptimized
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // ✅ Get date string for comparison (YYYY-MM-DD format)
    const todayDateStr = today.toISOString().split('T')[0]; // e.g., "2025-11-25"
    
    console.log(`📅 Today's date (date only): ${todayDateStr}`);
    console.log(`📅 Current date/time: ${new Date().toISOString()}`);
    
    // ✅ Count posts for today using date-only comparison (ignores time)
    const t_count = Date.now();
    let totalCountResult = await SyncedPost.aggregate([
      { 
        $match: {
          CapsuleId: { $in: userCapsuleIds },
          IsDeleted: false,
          Status: true
        }
      },
      {
        $addFields: {
          firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] },
          DateOfDeliveryDateOnly: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: { $arrayElemAt: ["$EmailEngineDataSets.DateOfDelivery", 0] },
              timezone: "UTC"
            }
          }
        }
      },
      {
        $match: {
          DateOfDeliveryDateOnly: todayDateStr
        }
      },
      { $count: "total" }
    ], { maxTimeMS: 5000, allowDiskUse: true });
    
    let totalCountToday = totalCountResult[0]?.total || 0;
    let usePastPosts = false;
    let totalCount = totalCountToday;
    
    // If loadOlderPosts flag is set, directly load past posts
    if (loadOlderPosts) {
      console.log(`📅 Load older posts flag is set, loading past posts only`);
      usePastPosts = true;
      
      // ✅ Count past posts using date-only comparison
      totalCountResult = await SyncedPost.aggregate([
        { 
          $match: {
            CapsuleId: { $in: userCapsuleIds },
            IsDeleted: false,
            Status: true
          }
        },
        {
          $addFields: {
            firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] },
            DateOfDeliveryDateOnly: {
              $dateToString: { 
                format: "%Y-%m-%d", 
                date: { $arrayElemAt: ["$EmailEngineDataSets.DateOfDelivery", 0] },
                timezone: "UTC"
              }
            }
          }
        },
        {
          $match: {
            DateOfDeliveryDateOnly: { $lt: todayDateStr }
          }
        },
        { $count: "total" }
      ], { maxTimeMS: 5000, allowDiskUse: true });
      
      totalCount = totalCountResult[0]?.total || 0;
      console.log(`📊 Found ${totalCount} past posts [${Date.now() - t_count}ms]`);
    } else if (totalCountToday === 0) {
      // If no posts for today, fallback to past posts
      console.log(`📅 No posts found for today, falling back to past posts`);
      usePastPosts = true;
      
      // ✅ Count past posts using date-only comparison
      totalCountResult = await SyncedPost.aggregate([
        { 
          $match: {
            CapsuleId: { $in: userCapsuleIds },
            IsDeleted: false,
            Status: true
          }
        },
        {
          $addFields: {
            firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] },
            DateOfDeliveryDateOnly: {
              $dateToString: { 
                format: "%Y-%m-%d", 
                date: { $arrayElemAt: ["$EmailEngineDataSets.DateOfDelivery", 0] },
                timezone: "UTC"
              }
            }
          }
        },
        {
          $match: {
            DateOfDeliveryDateOnly: { $lt: todayDateStr }
          }
        },
        { $count: "total" }
      ], { maxTimeMS: 5000, allowDiskUse: true });
      
      totalCount = totalCountResult[0]?.total || 0;
      console.log(`📊 Found ${totalCount} past posts [${Date.now() - t_count}ms]`);
    } else {
      totalCount = totalCountToday;
      console.log(`📊 Found ${totalCount} posts for today [${Date.now() - t_count}ms]`);
      
      // If we have very few posts for today (less than the limit), also include past posts
      if (totalCountToday < limit) {
        console.log(`📅 Only ${totalCountToday} posts for today (less than limit ${limit}), including past posts`);
        usePastPosts = true;
        
        // ✅ Count all posts (today + past) using date-only comparison
        totalCountResult = await SyncedPost.aggregate([
          { 
            $match: {
              CapsuleId: { $in: userCapsuleIds },
              IsDeleted: false,
              Status: true
            }
          },
          {
            $addFields: {
              firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] },
              DateOfDeliveryDateOnly: {
                $dateToString: { 
                  format: "%Y-%m-%d", 
                  date: { $arrayElemAt: ["$EmailEngineDataSets.DateOfDelivery", 0] },
                  timezone: "UTC"
                }
              }
            }
          },
          {
            $match: {
              DateOfDeliveryDateOnly: { $lte: todayDateStr }  // Include all posts up to today (today's + past)
            }
          },
          { $count: "total" }
        ], { maxTimeMS: 5000, allowDiskUse: true });
        
        totalCount = totalCountResult[0]?.total || 0;
        console.log(`📊 Found ${totalCount} total posts (today + past) [${Date.now() - t_count}ms]`);
      }
    }
    
    if (totalCount === 0) {
      console.log('❌ No SyncedPost documents found, returning empty result');
      return res.json({
        code: 200,
        msg: "Success - No posts found",
        response: [],
        count: 0,
        userCapsules: userCapsuleIds.length,
        pagination: { skip: skip, limit: limit, hasMore: false },
        filters: { type: type, selectedKeyword: selectedKeyword },
      });
    }

    // ✅ Build pipeline with date-only filtering (same as getStreamPostsOptimized)
    const pipeline = [
      { 
        $match: {
          CapsuleId: { $in: userCapsuleIds },
          IsDeleted: false,
          Status: true
        }
      },
      
      // Extract DateOfDelivery first for sorting and date comparison
      {
        $addFields: {
          firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] }
        }
      },
      {
        $addFields: {
          DateOfDeliveryForSort: "$firstDataSet.DateOfDelivery",
          // ✅ Extract date only (YYYY-MM-DD) for comparison - ignore time completely
          DateOfDeliveryDateOnly: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$firstDataSet.DateOfDelivery",
              timezone: "UTC"
            }
          }
        }
      },
      
      // ✅ Filter by date only (not time) - compare date strings
      {
        $match: usePastPosts
          ? (totalCountToday < limit && !loadOlderPosts && totalCountToday > 0)
            ? {
                DateOfDeliveryDateOnly: { $lte: todayDateStr }  // Include today + past
              }
            : {
                DateOfDeliveryDateOnly: { $lt: todayDateStr }  // Past only
              }
          : {
              DateOfDeliveryDateOnly: todayDateStr  // Today only
            }
      },
      
      // Sort by DateOfDelivery (most recent first for past posts, or CreatedOn for today's posts)
      { $sort: usePastPosts 
          ? { DateOfDeliveryForSort: -1, _id: -1 }  // Most recent past posts first
          : { CreatedOn: -1, _id: -1 }              // Today's posts by creation date
      },
      { $skip: skip },
      { $limit: limit },
      
      // Extract remaining EmailEngineDataSets fields (firstDataSet already extracted above)
      {
        $addFields: {
          Delivered: "$firstDataSet.Delivered",
          VisualUrls: "$firstDataSet.VisualUrls",
          SoundFileUrl: "$firstDataSet.SoundFileUrl",
          TextAboveVisual: "$firstDataSet.TextAboveVisual",
          TextBelowVisual: "$firstDataSet.TextBelowVisual",
          DateOfDelivery: "$firstDataSet.DateOfDelivery",
          BlendMode: "$firstDataSet.BlendMode",
          hexcode_blendedImage_temp: "$firstDataSet.hexcode_blendedImage",
        },
      },
      
      // ✅ Add flag to indicate if this is an old post (compare by date only, not time)
      {
        $addFields: {
          isOldPost: {
            $lt: ["$DateOfDeliveryDateOnly", todayDateStr]
          }
        }
      },
      
      // Project fields
      {
        $project: {
          _id: 1,
          CapsuleId: 1,
          PageId: 1,
          PostId: 1,
          PostStatement: 1,
          postTags: 1, // ✅ Added: Include postTags from SyncedPost
          PostOwnerId: 1,
          SyncedBy: 1,
          ReceiverEmails: 1,
          CreatedOn: 1,
          Delivered: 1,
          VisualUrls: 1,
          SoundFileUrl: 1,
          TextAboveVisual: 1,
          TextBelowVisual: 1,
          DateOfDelivery: 1,
          BlendMode: 1,
          EmailTemplate: 1,
          Subject: "$EmailSubject",
          IsOnetimeStream: 1,
          IsOnlyPostImage: 1,
          hexcode_blendedImage_temp: 1,
          UploaderID: 1,
          isOldPost: 1,
        },
      },
      
      // Lookup actual Media document for additional fields
      {
        $lookup: {
          from: "media",
          let: { postId: "$PostId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$postId" }] }
              }
            }
          ],
          as: "mediaDoc"
        }
      },
      { $unwind: { path: "$mediaDoc", preserveNullAndEmptyArrays: true } },
      
      // Add media fields to root
      {
        $addFields: {
          MediaType: "$mediaDoc.MediaType",
          LinkType: "$mediaDoc.LinkType",
          Content: "$mediaDoc.Content",
          Location: "$mediaDoc.Location",
          UploadedBy: "$mediaDoc.UploadedBy",
          UploadedOn: { $ifNull: ["$mediaDoc.UploadedOn", "$CreatedOn"] },
          UploaderID: "$mediaDoc.UploaderID",
          GroupTags: "$mediaDoc.GroupTags",
          BlendSettings: "$mediaDoc.BlendSettings",
          thumbnail: "$mediaDoc.thumbnail",
          Locator: "$mediaDoc.Locator",
          AutoId: "$mediaDoc.AutoId",
          ContentType: "$mediaDoc.ContentType",
        }
      },
      
      // Apply media type filter
      ...(type && type !== "all"
        ? [
            {
              $match: {
                $or: [
                  { MediaType: type },
                  ...(type === "Image"
                    ? [
                        { MediaType: "Link", LinkType: "image" },
                        { MediaType: "1MJPost" },
                        { MediaType: "2MJPost" },
                        { MediaType: "1UnsplashPost" },
                        { MediaType: "2UnsplashPost" },
                      ]
                    : []),
                  ...(type === "Video"
                    ? [
                        { MediaType: "Link", LinkType: { $ne: "image" } },
                        { MediaType: "Video" },
                        { MediaType: "Audio" },
                      ]
                    : []),
                ],
              },
            },
          ]
        : []),

      // Apply keyword filter
      ...(selectedKeyword
        ? [
            {
              $match: {
                $or: [
                  { "GroupTags.GroupTagID": selectedKeyword },
                  { GroupTags: selectedKeyword },
                ],
              },
            },
          ]
        : []),
      
      // ⚡ ULTRA-OPTIMIZED: Combine Capsule + Owner lookup in single stage
      {
        $lookup: {
          from: "Capsules",
          let: { capsuleId: "$CapsuleId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$capsuleId"] } } },
            { $limit: 1 },
            // Nested lookup for owner (faster in subpipeline)
            {
              $lookup: {
                from: "users",
                localField: "OwnerId",
                foreignField: "_id",
                as: "owner"
              }
            },
            { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                Title: 1,
                OwnerId: 1,
                ownerName: "$owner.Name",
                ownerEmail: "$owner.Email",
                ownerProfilePic: "$owner.ProfilePic"
              }
            }
          ],
          as: "capsuleData"
        }
      },
      { $unwind: { path: "$capsuleData", preserveNullAndEmptyArrays: true } },
      
      // ⚡ Lookup post uploader (creator) details
      {
        $lookup: {
          from: "users",
          let: { uploaderId: "$UploaderID" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [
                    { $toString: "$_id" },
                    "$$uploaderId"
                  ] 
                }
              }
            },
            {
              $project: {
                Name: 1,
                ProfilePic: 1
              }
            }
          ],
          as: "uploaderData"
        }
      },
      { $unwind: { path: "$uploaderData", preserveNullAndEmptyArrays: true } },
      
      // Add capsule and page info to root (minimal fields only)
      {
        $addFields: {
          capsuleId: "$CapsuleId",
          capsuleOwnerId: "$capsuleData.OwnerId",
          postOwnerId: "$PostOwnerId",
          capsuleTitle: "$capsuleData.Title",
          capsuleOwnerName: "$capsuleData.ownerName",
          capsuleOwnerEmail: "$capsuleData.ownerEmail",
          capsuleOwnerProfilePic: "$capsuleData.ownerProfilePic",
          capsuleCreatorName: "$uploaderData.Name",
          capsuleCreatorProfilePic: "$uploaderData.ProfilePic",
          pageId: "$PageId",
        }
      },
      
      // Sort by upload date (newest first)
      { $sort: { UploadedOn: -1, _id: -1 } },
      
      // NOW lookup interactions on posts
      {
        $lookup: {
          from: "StreamLikes",
          let: { syncedPostId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$SocialPostId", "$$syncedPostId"] },
                    { $ne: ["$IsDeleted", true] },
                    { $ne: ["$IsDeleted", 1] }
                  ]
                }
              }
            },
            // Lookup user details for each like
            {
              $lookup: {
                from: "users",
                localField: "UserId",
                foreignField: "_id",
                as: "user"
              }
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                UserId: 1,
                CreatedOn: 1,
                UpdatedOn: 1,
                IsDeleted: 1,
                user: {
                  _id: "$user._id",
                  Name: "$user.Name",
                  UserName: "$user.UserName",
                  ProfilePic: "$user.ProfilePic",
                  Email: "$user.Email"
                }
              }
            }
          ],
          as: "likes",
        },
      },
      // ⚡ Lookup comments with PRIVACY FILTERING
      {
        $lookup: {
          from: "StreamComments",
          let: { 
            syncedPostId: "$_id",  // Use SyncedPost _id (not PostId) since comments use SyncedPost._id as SocialPostId
            capsuleId: "$capsuleId"
          },
          pipeline: [
            {
              $match: {
                $and: [
                  // IsDeleted filter
                  {
                    $expr: { 
                      $and: [
                        { $eq: ["$SocialPostId", "$$syncedPostId"] },
                        { $ne: ["$IsDeleted", true] },
                        { $ne: ["$IsDeleted", 1] }
                      ]
                    }
                  },
                  // Top-level comments only (no ParentId)
                  {
                    $or: [
                      { ParentId: { $exists: false } },
                      { ParentId: null }
                    ]
                  },
                  // ✅ PRIVACY FILTER (FAST - In aggregation!)
                  {
                    $or: [
                      { PrivacySetting: { $exists: false } },
                      { PrivacySetting: 'PublicWithName' },
                      { PrivacySetting: 'PublicWithoutName' },
                      { 
                        PrivacySetting: 'OnlyForOwner',
                        UserId: new mongoose.Types.ObjectId(loginUserId)
                      },
                      { 
                        PrivacySetting: 'OnlyForOwner',
                        OwnerId: new mongoose.Types.ObjectId(loginUserId)
                      },
                      { 
                        PrivacySetting: 'InvitedFriends',
                        $expr: { $in: ["$$capsuleId", memberCapsuleIds] }
                      }
                    ]
                  }
                ]
              }
            },
            { $sort: { CreatedOn: -1 } },
            { $limit: 10 },
            // Lookup user data for comment author
            {
              $lookup: {
                from: "users",
                let: { userId: "$UserId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$userId"] }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      Name: 1,
                      UserName: 1,
                      ProfilePic: 1,
                      Email: 1
                    }
                  }
                ],
                as: "user"
              }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            // Lookup comment likes (with user details)
            {
              $lookup: {
                from: streamCommentLikesCollection,
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $and: [
                          { $eq: ["$CommentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  },
                  {
                    $lookup: {
                      from: "users",
                      localField: "LikedById",
                      foreignField: "_id",
                      as: "likedByUser"
                    }
                  },
                  { $unwind: { path: "$likedByUser", preserveNullAndEmptyArrays: true } },
                  {
                    $project: {
                      _id: 1,
                      CommentId: 1,
                      SocialPageId: 1,
                      LikedById: 1,
                      CreatedOn: 1,
                      likedByUser: {
                        _id: "$likedByUser._id",
                        Name: "$likedByUser.Name",
                        UserName: "$likedByUser.UserName",
                        ProfilePic: "$likedByUser.ProfilePic",
                        Email: "$likedByUser.Email"
                      }
                    }
                  }
                ],
                as: "commentLikes"
              }
            },
            // ✅ Lookup replies for this comment (limit to first 2 for performance)
            {
              $lookup: {
                from: "StreamComments",
                let: { 
                  commentId: "$_id",
                  capsuleId: "$$capsuleId"
                },
                pipeline: [
                  {
                    $match: {
                      $and: [
                        {
                          $expr: { 
                            $and: [
                              { $eq: ["$ParentId", "$$commentId"] },
                              { $ne: ["$IsDeleted", true] },
                              { $ne: ["$IsDeleted", 1] }
                            ]
                          }
                        },
                        {
                          $or: [
                            { PrivacySetting: { $exists: false } },
                            { PrivacySetting: 'PublicWithName' },
                            { PrivacySetting: 'PublicWithoutName' },
                            { PrivacySetting: 'OnlyForOwner', UserId: loginUserObjectId },
                            { PrivacySetting: 'OnlyForOwner', OwnerId: loginUserObjectId },
                            { PrivacySetting: 'InvitedFriends', $expr: { $in: ["$$capsuleId", memberCapsuleIds] } }
                          ]
                        }
                      ]
                    }
                  },
                  { $sort: { CreatedOn: 1 } },
                  { $limit: 2 },
                  // Lookup user data for reply author
                  {
                    $lookup: {
                      from: "users",
                      let: { userId: "$UserId" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$_id", "$$userId"] }
                          }
                        },
                        {
                          $project: {
                            _id: 1,
                            Name: 1,
                            UserName: 1,
                            ProfilePic: 1,
                            Email: 1
                          }
                        }
                      ],
                      as: "user"
                    }
                  },
                  { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
                  // Lookup reply likes (with user details)
                  {
                    $lookup: {
                      from: streamCommentLikesCollection,
                      let: { replyId: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { 
                              $and: [
                                { $eq: ["$CommentId", "$$replyId"] },
                                { $ne: ["$IsDeleted", true] },
                                { $ne: ["$IsDeleted", 1] }
                              ]
                            }
                          }
                        },
                        {
                          $lookup: {
                            from: "users",
                            localField: "LikedById",
                            foreignField: "_id",
                            as: "likedByUser"
                          }
                        },
                        { $unwind: { path: "$likedByUser", preserveNullAndEmptyArrays: true } },
                        {
                          $project: {
                            _id: 1,
                            CommentId: 1,
                            SocialPageId: 1,
                            LikedById: 1,
                            CreatedOn: 1,
                            likedByUser: {
                              _id: "$likedByUser._id",
                              Name: "$likedByUser.Name",
                              UserName: "$likedByUser.UserName",
                              ProfilePic: "$likedByUser.ProfilePic",
                              Email: "$likedByUser.Email"
                            }
                          }
                        }
                      ],
                      as: "replyLikes"
                    }
                  },
                  {
                    $addFields: {
                      replyLikes: {
                        $filter: {
                          input: "$replyLikes",
                          cond: { $ne: ["$$this", null] }
                        }
                      },
                      CommentLikeCount: { $size: "$replyLikes" },
                      likedByCurrentUser: {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: "$replyLikes",
                                cond: {
                                  $and: [
                                    { $ne: ["$$this", null] },
                                    { $eq: ["$$this.LikedById", loginUserObjectId] }
                                  ]
                                }
                              }
                            }
                          },
                          0
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      UserId: 1,
                      ParentId: 1,
                      Comment: 1,
                      CreatedOn: 1,
                      PrivacySetting: 1,
                      user: 1,
                      CommentLikeCount: 1,
                      likedByCurrentUser: { $ifNull: ["$likedByCurrentUser", false] },
                      likes: {
                        $map: {
                          input: "$replyLikes",
                          as: "like",
                          in: {
                            _id: "$$like._id",
                            CommentId: "$$like.CommentId",
                            SocialPageId: "$$like.SocialPageId",
                            LikedById: "$$like.LikedById",
                            CreatedOn: "$$like.CreatedOn",
                            likedByUser: "$$like.likedByUser"
                          }
                        }
                      }
                    }
                  }
                ],
                as: "replies"
              }
            },
            // ✅ Count TOTAL replies (not just fetched 2)
            {
              $lookup: {
                from: "StreamComments",
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { 
                        $and: [
                          { $eq: ["$ParentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  },
                  { $count: "total" }
                ],
                as: "replyCountArr"
              }
            },
            {
              $addFields: {
                commentLikesFiltered: {
                  $filter: {
                    input: "$commentLikes",
                    cond: {
                      $and: [
                        { $ne: ["$$this.IsDeleted", true] },
                        { $ne: ["$$this.IsDeleted", 1] }
                      ]
                    }
                  }
                }
              }
            },
            {
              $addFields: {
                CommentLikeCount: { $size: "$commentLikesFiltered" },
                replyCount: { $ifNull: [{ $arrayElemAt: ["$replyCountArr.total", 0] }, 0] }
              }
            },
            {
              $addFields: {
                likedByCurrentUser: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$commentLikesFiltered",
                          cond: {
                            $eq: ["$$this.LikedById", loginUserObjectId]
                          }
                        }
                      }
                    },
                    0
                  ]
                },
                likes: {
                  $map: {
                    input: "$commentLikesFiltered",
                    as: "like",
                    in: {
                      _id: "$$like._id",
                      CommentId: "$$like.CommentId",
                      SocialPageId: "$$like.SocialPageId",
                      LikedById: "$$like.LikedById",
                      CreatedOn: "$$like.CreatedOn",
                      likedByUser: "$$like.likedByUser"
                    }
                  }
                }
              }
            },
            {
              $project: {
                _id: 1,
                UserId: 1,
                Comment: 1,
                CreatedOn: 1,
                PrivacySetting: 1,
                user: 1,
                CommentLikeCount: 1,
                replies: 1,
                replyCount: 1,
                likedByCurrentUser: 1,
                likes: 1
              }
            }
          ],
          as: "comments"
        }
      },
      
      // Add interaction counts
      {
        $addFields: {
          likeCount: {
            $size: {
              $filter: {
                input: "$likes",
                cond: { $eq: ["$$this.IsDeleted", false] }
            }
          }
        },
          commentCount: { $size: "$comments" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "likes.LikedById",
          foreignField: "_id",
          as: "likesUsers"
        }
      },
      {
        $addFields: {
          likes: {
            $map: {
              input: "$likes",
              as: "like",
              in: {
                $mergeObjects: [
                  "$$like",
                  {
                    likedByUser: {
                      $let: {
                        vars: {
                          matchedUser: {
                            $first: {
                              $filter: {
                                input: "$likesUsers",
                                as: "userDoc",
                                cond: { $eq: ["$$userDoc._id", "$$like.LikedById"] }
                              }
                            }
                          }
                        },
                        in: {
                          _id: "$$matchedUser._id",
                          Name: "$$matchedUser.Name",
                          UserName: "$$matchedUser.UserName",
                          ProfilePic: "$$matchedUser.ProfilePic",
                          Email: "$$matchedUser.Email"
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          likesUsers: 0
        }
      },
      {
        $project: {
          _id: 1,  // Keep SyncedPost's _id
          PostId: 1,  // ✅ Include original post ID (Media document's _id) for audio lookup
          MediaType: 1,
          LinkType: 1,
          Content: 1,
          Location: 1,
          UploadedBy: 1,
          UploadedOn: 1,
          UploaderID: 1,
          GroupTags: 1,
          BlendSettings: 1,
          thumbnail: 1,
          Locator: 1,
          AutoId: 1,
          ContentType: 1,
          PostStatement: 1,
          postTags: 1, // ✅ Added: Include postTags from SyncedPost
          VisualUrls: 1,
          BlendMode: 1,
          hexcode_blendedImage_temp: 1,
          capsuleId: 1,
          capsuleOwnerId: 1,
          postOwnerId: 1,
          capsuleTitle: 1,
          capsuleOwnerName: 1,
          capsuleOwnerEmail: 1,
          capsuleOwnerProfilePic: 1,
          capsuleCreatorName: 1,
          capsuleCreatorProfilePic: 1,
          pageId: 1,
          likes: 1,
          comments: 1,
          likeCount: 1,
          commentCount: 1,
          DateOfDelivery: 1,
          isOldPost: 1  // Flag indicating if post is from past day (not current day)
        }
      },
      { $sort: { UploadedOn: -1, _id: -1 } },
    ];

    const t3 = Date.now();
    
    const posts = await SyncedPost.aggregate(pipeline, {
      allowDiskUse: true,
      maxTimeMS: 30000
    }).exec();
    
    perfLog.step3_main_aggregation = Date.now() - t3;
    console.log(`✅ Aggregation completed [posts=${posts.length}, duration=${perfLog.step3_main_aggregation}ms]`);

    // Add user's interaction status for each post (NO FRIEND ACTIVITY METADATA)
    if (req.session.user && req.session.user._id) {
      const userId = req.session.user._id;
      
      posts.forEach(function (post) {
        // Check if user liked this post
        post.isLikedByMe = post.likes && post.likes.some(function (like) {
          return String(like.LikedById) === String(userId);
        });
        
        // Check if user commented on this post
        post.isCommentedByMe = post.comments && post.comments.some(function (comment) {
          return String(comment.UserId) === String(userId);
        });
        
        // Initialize dislikes (StreamLikes doesn't have dislikes, only likes)
        post.dislikes = [];
        post.dislikeCount = 0;
        post.isDislikedByMe = false;
      });
    } else {
      // Initialize interaction status without session
      posts.forEach(function (post) {
        post.isLikedByMe = false;
        post.isDislikedByMe = false;
        post.isCommentedByMe = false;
        post.dislikes = [];
        post.dislikeCount = 0;
      });
    }

    // ⚡ Use the totalCount we already calculated earlier (with date filtering)
    const t4 = Date.now();
    // totalCount is already calculated above with date filtering logic
    perfLog.step4_count_aggregation = Date.now() - t4;

    // Calculate hexcode_blendedImage and clean BlendSettings
    const t5 = Date.now();
    const crypto = require('crypto');
    const fs = require('fs');
    const path = require('path');
    
    // Helper function to check if audio file exists and get URL
    // Process posts and check for audio files using generic helper
    const cleanedPosts = await Promise.all(posts.map(async (post) => {
      // Calculate hexcode_blendedImage for blended posts
      let hexcode_blendedImage = post.hexcode_blendedImage_temp || null;
      
      if (!hexcode_blendedImage && post.VisualUrls && post.VisualUrls.length >= 2 && post.BlendMode) {
        const blendImage1 = post.VisualUrls[0];
        const blendImage2 = post.VisualUrls[1];
        const blendMode = post.BlendMode;
        
        if (blendImage1 && blendImage2 && blendMode && blendImage1 !== blendImage2) {
          const data = blendImage1 + blendImage2 + blendMode;
          const hexcode = crypto.createHash("md5").update(data).digest("hex");
          if (hexcode) {
            hexcode_blendedImage = `/streamposts/${hexcode}.png`;
          }
        } else if (blendImage1 === blendImage2 && blendImage1) {
          // For single image posts, use the image itself
          hexcode_blendedImage = blendImage1.replace("/Media/img/300/", "/Media/img/600/");
        }
      }
      
      // Add hexcode_blendedImage to post
      if (hexcode_blendedImage) {
        post.hexcode_blendedImage = hexcode_blendedImage;
      }
      
      // Remove temporary field
      delete post.hexcode_blendedImage_temp;
      
      // Remove allBlendConfigurations from BlendSettings
      if (post.BlendSettings && post.BlendSettings.allBlendConfigurations) {
        const { allBlendConfigurations, ...cleanedBlendSettings } = post.BlendSettings;
        post.BlendSettings = cleanedBlendSettings;
      }
      
      // ✅ Check for audio file using PostId ONLY (from SyncedPost.PostId which references Media._id)
      // Audio files are named after the original Media document's _id, not SyncedPost's _id
      if (post.PostId) {
        const audioData = await getPostAudioFileData(post.PostId);
        if (audioData) {
          post.audioFile = audioData;
        } else {
          post.audioFile = null;
        }
      } else {
        post.audioFile = null;
      }
      
      return post;
    }));

    // ✅ Calculate remaining older posts count
    const t_older_count = Date.now();
    
    // Count total older posts (DateOfDelivery < todayStart) that match user's capsules
    const olderPostsConditions = {
      CapsuleId: { $in: userCapsuleIds },
      IsDeleted: false,
      Status: true,
      'EmailEngineDataSets.DateOfDelivery': {
        $lt: todayStart
      }
    };
    
    // Build aggregation pipeline to count older posts with same filters
    const olderPostsCountPipeline = [
      { $match: olderPostsConditions },
      {
        $addFields: {
          firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] }
        }
      },
      {
        $lookup: {
          from: "media",
          let: { postId: "$PostId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$postId" }] }
              }
            }
          ],
          as: "mediaDoc"
        }
      },
      { $unwind: { path: "$mediaDoc", preserveNullAndEmptyArrays: true } }
    ];
    
    // Apply media type filter if specified
    if (type && type !== "all") {
      olderPostsCountPipeline.push({
        $match: {
          $or: [
            { "mediaDoc.MediaType": type },
            ...(type === "Image"
              ? [
                  { "mediaDoc.MediaType": "Link", "mediaDoc.LinkType": "image" },
                  { "mediaDoc.MediaType": "1MJPost" },
                  { "mediaDoc.MediaType": "2MJPost" },
                  { "mediaDoc.MediaType": "1UnsplashPost" },
                  { "mediaDoc.MediaType": "2UnsplashPost" },
                ]
              : []),
            ...(type === "Video"
              ? [
                  { "mediaDoc.MediaType": "Link", "mediaDoc.LinkType": { $ne: "image" } },
                  { "mediaDoc.MediaType": "Video" },
                  { "mediaDoc.MediaType": "Audio" },
                ]
              : []),
          ],
        }
      });
    }
    
    // Count total older posts
    olderPostsCountPipeline.push({ $count: "total" });
    
    const olderPostsCountResult = await SyncedPost.aggregate(
      olderPostsCountPipeline,
      { maxTimeMS: 5000, allowDiskUse: true }
    );
    
    const totalOlderPosts = olderPostsCountResult[0]?.total || 0;
    
    // Calculate how many older posts have been fetched
    // If loadOlderPosts is true, skip represents older posts already fetched
    // Otherwise, count older posts in current response
    let olderPostsFetched = 0;
    if (loadOlderPosts) {
      // We're loading older posts directly, skip represents already fetched older posts
      olderPostsFetched = skip;
    } else {
      // Count older posts in current response
      olderPostsFetched = cleanedPosts.filter(post => post.isOldPost === true).length;
    }
    
    // Calculate remaining older posts
    const olderPostsRemaining = Math.max(0, totalOlderPosts - olderPostsFetched);
    
    console.log(`📊 Older posts: total=${totalOlderPosts}, fetched=${olderPostsFetched}, remaining=${olderPostsRemaining} [${Date.now() - t_older_count}ms]`);

    console.log('📤 [BACKEND] getUserFeedPosts - Sending response', {
      endpoint: '/capsules/getUserFeedPosts',
      postsCount: cleanedPosts.length,
      totalCount: totalCount,
      userCapsules: userCapsules.length,
      skip,
      limit,
      olderPostsRemaining: olderPostsRemaining
    });

    res.json({
      code: 200,
      msg: "Success",
      response: cleanedPosts,
      count: totalCount,
      userCapsules: userCapsules.length,
      pagination: {
        skip: skip,
        limit: limit,
        hasMore: skip + limit < totalCount,
      },
      olderPostsRemaining: olderPostsRemaining, // ✅ Count of older posts still available in DB
      filters: {
        type: type,
        selectedKeyword: selectedKeyword,
      },
    });

    perfLog.step5_post_processing = Date.now() - t5;
    
    // ✅ Performance logging
    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  [BACKEND] getUserFeedPosts PERFORMANCE BREAKDOWN:`);
    console.log(`   1. Capsules: ${perfLog.step1_capsules}ms`);
    console.log(`   3. Main Aggregation: ${perfLog.step3_main_aggregation}ms`);
    console.log(`   4. Count Aggregation: ${perfLog.step4_count_aggregation}ms`);
    console.log(`   5. Post Processing: ${perfLog.step5_post_processing}ms`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   TOTAL: ${elapsed}ms\n`);
    console.log(`✅ [BACKEND] getUserFeedPosts completed | Posts: ${cleanedPosts.length}/${totalCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error("❌ Error in getUserFeedPosts:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({
      code: 500,
      msg: "Error fetching feed posts",
      error: error.message,
      errorDetails: error.toString(),
      response: [],
      count: 0
    });
  }
};
var getMySales = function (req, res) {
  var offset = req.body.offset ? req.body.offset : 0;
  var limit = req.body.limit ? req.body.limit : 10;

  var userId = req.session.user._id ? req.session.user._id : null;
  Order.aggregate([
    {
      $match: { TransactionState: "Completed", OrderInitiatedFrom: "PGALLARY" },
    },
    { $sort: { CreatedOn: 1 } },
    { $unwind: "$CartItems" },
    {
      $match: { "CartItems.CapsuleCreatedBy": mongoose.Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: "$CartItems.CapsuleId",
        numberOfOrders: { $sum: 1 },
        NoOfSoldCopies: { $sum: { $size: "$CartItems.Owners" } },
        TotalPayments: { $sum: "$CartItems.TotalPayment" },
        TotalCommission: { $sum: "$CartItems.PlatformCommission" },
        grossProfit: {
          $sum: {
            $subtract: [
              "$CartItems.TotalPayment",
              "$CartItems.PlatformCommission",
            ],
          },
        },
        SalesGraphData: {
          $push: {
            CreatedOn: { $subtract: ["$CreatedOn", new Date("1970-01-01")] },
            NoOfSoldCopies: { $size: "$CartItems.Owners" },
          },
        },
      },
    },
    { $skip: offset },
    { $limit: offset + limit },
    {
      $lookup: {
        from: "Capsules",
        localField: "_id",
        foreignField: "_id",
        as: "capsuleData",
      },
    },
  ]).exec(function (err, data) {
    //console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');
    //console.log(data);
    Order.aggregate([
      {
        $match: {
          TransactionState: "Completed",
          OrderInitiatedFrom: "PGALLARY",
        },
      },
      { $sort: { CreatedOn: 1 } },
      { $unwind: "$CartItems" },
      {
        $match: {
          "CartItems.CapsuleCreatedBy": mongoose.Types.ObjectId(userId),
        },
      },
      { $group: { _id: "$CartItems.CapsuleId" } },
    ]).exec(function (err, total) {
      if (!err) {
        var response = {
          status: 200,
          message: "Sales has been retrieved successfully.",
          results: data,
          count: total.length ? total.length : 0,
        };
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
          results: data,
          count: total.length ? total.length : 0,
        };
      }
      res.json(response);
    });
  });
};

var getSalesExcel = function (req, res) {
  var json2xls = require("json2xls");
  var userId = req.session.user._id ? req.session.user._id : null;
  Order.aggregate([
    {
      $match: { TransactionState: "Completed", OrderInitiatedFrom: "PGALLARY" },
    },
    { $unwind: "$CartItems" },
    {
      $match: { "CartItems.CapsuleCreatedBy": mongoose.Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: "$CartItems.CapsuleId",
        numberOfOrders: { $sum: 1 },
        NoOfSoldCopies: { $sum: { $size: "$CartItems.Owners" } },
        TotalPayments: { $sum: "$CartItems.TotalPayment" },
        TotalCommission: { $sum: "$CartItems.PlatformCommission" },
        grossProfit: {
          $sum: {
            $subtract: [
              "$CartItems.TotalPayment",
              "$CartItems.PlatformCommission",
            ],
          },
        },
      },
    },

    {
      $lookup: {
        from: "Capsules",
        localField: "_id",
        foreignField: "_id",
        as: "capsuleData",
      },
    },
  ]).exec(function (err, data) {
    var json = [];
    data.length = data.length ? data.length : 0;
    if (data.length) {
      for (var i = 0; i < data.length; i++) {
        var revenueField = {
          label: "NoOfOrders(TotalSoldCopies)",
          value: data[i].numberOfOrders + " (" + data[i].NoOfSoldCopies + ")",
        };

        json.push({
          Capsule: data[i].capsuleData[0].Title,
          "NoOfOrders(TotalSoldCopies)": revenueField.value,
          "Revenue($)": data[i].grossProfit,
        });
      }
      //export only the field 'poo'
      var xls = json2xls(json, {
        fields: ["Capsule", "NoOfOrders(TotalSoldCopies)", "Revenue($)"],
      });

      var filename = "sales_" + userId + ".xlsx";
      var salesExcelPath = "/../../media-assets/downloads/";
      var filePath = __dirname + salesExcelPath + filename;
      //fs.renameSync(fielname, xls, 'binary');
      fs.exists(filePath, function (exists) {
        if (exists) {
          //var filePath = 'c:/book/discovery.docx';
          fs.unlinkSync(filePath);
          fs.writeFileSync(filePath, xls, "binary");
        } else {
          fs.writeFileSync(filePath, xls, "binary");
        }
      });

      if (filename) {
        var response = {
          status: 200,
          message: "Excel generated successfully.",
          filename: filename,
        };
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
          filename: filename,
        };
      }
      res.json(response);
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
        filename: filename,
      };
      res.json(response);
    }
  });
};

// Get capsule members who purchased the same original capsule
var getCapsuleMembers = async function (req, res) {
  try {
    // Validate required parameters
    if (!req.body.capsuleId) {
      return res.status(400).json({
        status: 400,
        message: "Capsule ID is required",
      });
    }

    var capsuleId = req.body.capsuleId;

    // First, find the original capsule to get its OriginatedFrom
    var originalCapsule = await Capsule.findById(capsuleId)
      .select("OriginatedFrom")
      .exec();

    if (!originalCapsule) {
      return res.status(404).json({
        status: 404,
        message: "Capsule not found",
      });
    }

    // Determine the original capsule ID
    var originalCapsuleId = originalCapsule.OriginatedFrom || capsuleId;

    // Find all capsules with the same OriginatedFrom
    var conditions = {
      OriginatedFrom: originalCapsuleId,
      Status: true,
      IsDeleted: false,
      Origin: "published", // Only purchased capsules
    };

    // Find all capsules and populate owner details
    var capsuleMembers = await Capsule.find(conditions)
      .select("OwnerId")
      .populate({
        path: "OwnerId",
        select: "Name ProfilePic",
        model: "user",
      })
      .exec();

    // Format the response - only name and profile pic
    var members = capsuleMembers.map(function (capsule) {
      return {
        name: capsule.OwnerId ? capsule.OwnerId.Name : "Unknown User",
        profilePic: capsule.OwnerId ? capsule.OwnerId.ProfilePic : null,
      };
    });

    // Remove duplicates based on name and profilePic (same user might have multiple instances)
    var uniqueMembers = [];
    var seenMembers = new Set();

    members.forEach(function (member) {
      var memberKey = member.name + "|" + (member.profilePic || "");
      if (!seenMembers.has(memberKey)) {
        seenMembers.add(memberKey);
        uniqueMembers.push(member);
      }
    });

    var response = {
      status: 200,
      message: "Capsule members retrieved successfully",
      result: {
        totalMembers: uniqueMembers.length,
        members: uniqueMembers,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getCapsuleMembers:", error);
    var response = {
      status: 501,
      message: "Error retrieving capsule members",
      error: error.message,
    };
    res.json(response);
  }
};

const getStreamPriceMap = async function (req, res) {
  try {
    const limit = req.body.limit || 100;
    const offset = req.body.offset || 0;

    const conditions = {
      "LaunchSettings.Audience": "BUYERS",
      IsPublished: true,
      IsAllowedForSales: true,
      Status: true,
      IsDeleted: false
    };

    const sortObj = {
      ModifiedOn: -1
    };

    const fields = {
      Price: 1,
      _id: 1
    };

    const results = await Capsule.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();

    const totalCount = await Capsule.countDocuments(conditions).exec();

    const priceMap = {};
    for (let i = 0; i < results.length; i++) {
      const key = String(results[i]._id) + '_price';
      priceMap[key] = results[i].Price || 0;
    }

    const response = {
      count: totalCount,
      status: 200,
      message: "Capsules price map retrieved successfully",
      results: priceMap
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getStreamPriceMap:", error);
    const response = {
      status: 501,
      message: "Something went wrong.",
      error: error.message
    };
    res.json(response);
  }
};

//Capsules In the making Apis
exports.find = find;
exports.findAll = findAll;
exports.findAllPaginated = findAllPaginated;
exports.createdByMe = createdByMe;
exports.ownedByMe = ownedByMe;
exports.activeLaunched = activeLaunched;
exports.getPlatformStreamTitles = getPlatformStreamTitles;
exports.sharedWithMe = sharedWithMe;
exports.byTheHouse = byTheHouse;
exports.populateCapsuleWithGroupTags = populateCapsuleWithGroupTags;
exports.populateCapsulesWithGroupTags = populateCapsulesWithGroupTags;

//dashboard
//exports.allPublished = allPublished;
exports.allPublished = allDashboardCapsules;
exports.publishedByMe = publishedByMe;
exports.publishedForMe = publishedForMe;
exports.invitationForMe = invitationForMe;
exports.ForSalesByMe = ForSalesByMe;

exports.create = create;
exports.duplicate = duplicate;
//exports.remove = remove;
exports.remove = remove_V2; //both case 1) remove action by Owner 2) remove Action by Member
exports.cascadeDeleteCapsule = cascadeDeleteCapsule; // Cascade delete capsule and all related data
exports.reorder = reorder;
exports.updateCapsule = updateCapsule; // Update capsule (for edit page)
exports.updateCapsuleName = updateCapsuleName;
exports.uploadCover = uploadCover;
exports.saveSettings = saveSettings;
exports.saveBirthday = saveBirthday;
exports.invite = invite;
exports.inviteMember = inviteMember;
exports.removeInvitee = removeInvitee;

//Capsule library Apis
exports.addFromLibrary = addFromLibrary;
exports.share = share;
exports.uploadMenuIcon = uploadMenuIcon;
exports.delMenuIcon = delMenuIcon;
exports.delCoverArt = delCoverArt;
exports.updateCapsuleForChapterId = updateCapsuleForChapterId;
exports.getIds = getIds;
exports.saveMetaDataSettings = saveMetaDataSettings;
exports.saveMetaDataFsg = saveMetaDataFsg;
exports.savePhaseFocusKey = savePhaseFocusKey;

//capsule payment apis
exports.getUniqueIds = getUniqueIds;
exports.getCreaterName = getCreaterName;
//capsule payment apis

exports.allUnverifiedCapsules = allUnverifiedCapsules; //Verify Dashboard Apis
exports.allPublicCapsules = allPublicCapsules; //Public Gallery Capsules Apis
exports.galleryCapsulesList = galleryCapsulesList; //Gallery Capsules List
exports.getCapsulePosts = getCapsulePosts; //Get all posts from a capsule

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		getEbookPosts
   * Created By: 		Auto-generated
   * Modified On:		-
   * @Purpose:   	Get e-book posts from a capsule (optimized - no interactions/comments/likes)
   * @Param:     		capsuleId
   * @Return:    	 	Array of e-book media documents
   * @Access Category:	Authenticated users
_________________________________________________________________________
*/

var getEbookPosts = async function (req, res) {
  try {
    const capsuleId = req.headers.capsule_id || req.body.capsuleId;

    if (!capsuleId) {
      return res.json({ code: "400", message: "capsule_id is required" });
    }

    // Validate and convert capsuleId to ObjectId
    let capsuleObjectId;
    try {
      capsuleObjectId = new mongoose.Types.ObjectId(capsuleId);
    } catch (error) {
      return res.json({ 
        code: "400", 
        message: "Invalid capsule_id format",
        error: error.message 
      });
    }

    // Optimized pipeline for e-books - no interactions, comments, or likes
    const pipeline = [
      // Start with chapters that belong to this capsule
      {
        $match: {
          CapsuleId: capsuleObjectId,
          IsDeleted: { $ne: true },
        },
      },
      // Unwind the pages array to get individual page IDs
      {
        $unwind: {
          path: "$pages",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Lookup the actual page documents
      {
        $lookup: {
          from: "Pages",
          localField: "pages",
          foreignField: "_id",
          as: "pageDoc",
        },
      },
      // Unwind page documents
      {
        $unwind: {
          path: "$pageDoc",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Filter out deleted pages
      {
        $match: {
          "pageDoc.IsDeleted": { $ne: true },
        },
      },
      // Unwind the Medias array to get individual media items
      {
        $unwind: {
          path: "$pageDoc.Medias",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Lookup the actual media documents
      {
        $lookup: {
          from: "media",
          localField: "pageDoc.Medias",
          foreignField: "_id",
          as: "mediaDoc",
        },
      },
      // Unwind media documents
      {
        $unwind: {
          path: "$mediaDoc",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Filter for e-book media only
      {
        $match: {
          "mediaDoc.MediaType": "Link",
          "mediaDoc.LinkType": "E-book",
          mediaDoc: { $exists: true, $ne: null },
        },
      },
      // Project media document as root with pageId included
      {
        $replaceRoot: { 
          newRoot: {
            $mergeObjects: [
              "$mediaDoc",
              { 
                pageId: "$pageDoc._id",
                pageTitle: "$pageDoc.Title"
              }
            ]
          }
        },
      },
      // Populate PostedBy with user information
      {
        $lookup: {
          from: "users",
          localField: "PostedBy",
          foreignField: "_id",
          as: "PostedByUser",
        },
      },
      {
        $unwind: {
          path: "$PostedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Sort by upload date (newest first)
      {
        $sort: { UploadedOn: -1 },
      },
      // Apply pagination
      {
        $skip: req.body.skip || 0,
      },
      {
        $limit: req.body.limit || 20,
      },
      // Project only necessary fields (no interactions)
      // Note: Can't mix inclusion and exclusion in MongoDB projection
      // Use the capsuleId from the request (which could be an owned copy) instead of the media's StreamId
      {
        $project: {
          _id: 1,
          Title: 1,
          PostStatement: 1,
          Prompt: 1,
          MediaType: 1,
          LinkType: 1,
          Location: 1,
          MetaData: 1,
          PostedBy: {
            _id: "$PostedByUser._id",
            Name: "$PostedByUser.Name",
            UserName: "$PostedByUser.UserName",
            ProfilePic: "$PostedByUser.ProfilePic",
            Email: "$PostedByUser.Email",
          },
          PostedOn: 1,
          UploadedOn: 1,
          PostPrivacySetting: 1,
          PostType: 1,
          StreamId: capsuleObjectId, // Use the capsuleId from request (owned copy) instead of media's StreamId
          pageId: 1,
          pageTitle: 1,
          // Only include what we need - interactions don't exist in media collection anyway
        },
      },
    ];

    console.log("📚 getEbookPosts - Fetching e-books for capsule:", capsuleId);
    
    const results = await Chapter.aggregate(pipeline);
    
    // Get total count for pagination
    // Build count pipeline by removing skip, limit, sort, and project stages
    const countPipeline = [];
    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];
      // Skip skip, limit, sort, and project stages (not needed for counting)
      if (stage.$skip || stage.$limit || stage.$sort || stage.$project) {
        continue;
      }
      countPipeline.push(stage);
    }
    
    let totalCount = 0;
    try {
      const countResults = await Chapter.aggregate([
        ...countPipeline,
        { $count: "total" }
      ]);
      totalCount = countResults[0]?.total || 0;
    } catch (countError) {
      console.warn("⚠️ Error getting count, using results length:", countError);
      totalCount = results.length;
    }

    console.log(`📚 Found ${results.length} e-books (total: ${totalCount})`);

    return res.json({
      code: "200",
      message: "E-books fetched successfully",
      response: results || [],
      count: totalCount,
      pagination: {
        skip: req.body.skip || 0,
        limit: req.body.limit || 20,
        hasMore: (req.body.skip || 0) + (results?.length || 0) < totalCount,
      },
    });
  } catch (error) {
    console.error("❌ Error in getEbookPosts:", error);
    console.error("❌ Error stack:", error.stack);
    return res.json({
      code: "500",
      message: "Something went wrong.",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

exports.getEbookPosts = getEbookPosts; //Get e-book posts from a capsule (optimized)

/*________________________________________________________________________
   * @Date:      		2025-01-XX
   * @Method :   		getCapsuleBuyers
   * Created By: 		AI Assistant
   * Modified On:		-
   * @Purpose:   		Get all users who purchased a specific capsule
   * @Param:     		capsule_id (required), skip (optional), limit (optional)
   * @Return:    	 	List of users who purchased the capsule
   * @Access Category:	"Capsule Management"
_________________________________________________________________________
*/

var getCapsuleBuyers = async function (req, res) {
  try {
    const capsuleId =
      req.headers.capsule_id || req.body.capsule_id || req.body.capsuleId;

    if (!capsuleId) {
      return res.json({ code: "400", message: "capsule_id is required" });
    }

    const skip = parseInt(req.body.skip) || 0;
    const limit = parseInt(req.body.limit) || 50;

    // Build aggregation pipeline to get users who purchased this capsule
    const pipeline = [
      // Match completed orders that contain this capsule
      {
        $match: {
          TransactionState: "Completed",
          "CartItems.CapsuleId": new mongoose.Types.ObjectId(capsuleId),
        },
      },
      // Unwind cart items to get individual capsule purchases
      {
        $unwind: "$CartItems",
      },
      // Match only the specific capsule
      {
        $match: {
          "CartItems.CapsuleId": new mongoose.Types.ObjectId(capsuleId),
        },
      },
      // Unwind owners to get individual buyers
      {
        $unwind: "$CartItems.Owners",
      },
      // Project buyer information
      {
        $project: {
          _id: "$_id",
          orderId: "$_id",
          buyerEmail: "$CartItems.Owners.OwnerEmail",
          buyerName: "$CartItems.Owners.OwnerName",
          uniqueIdPerOwner: "$CartItems.Owners.UniqueIdPerOwner",
          capsuleId: "$CartItems.CapsuleId",
          purchaseDate: "$CreatedOn",
          orderStatus: "$TransactionState",
          paymentMethod: "$PaymentMethod",
          totalAmount: "$TotalAmount",
        },
      },
      // Lookup user details from users collection
      {
        $lookup: {
          from: "users",
          localField: "buyerEmail",
          foreignField: "Email",
          as: "userDetails",
        },
      },
      // Unwind user details
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project final structure with user details
      {
        $project: {
          orderId: 1,
          buyerEmail: 1,
          buyerName: 1,
          uniqueIdPerOwner: 1,
          capsuleId: 1,
          purchaseDate: 1,
          orderStatus: 1,
          paymentMethod: 1,
          totalAmount: 1,
          user: {
            _id: "$userDetails._id",
            name: "$userDetails.Name",
            userName: "$userDetails.UserName",
            email: "$userDetails.Email",
            profilePic: "$userDetails.ProfilePic",
            status: "$userDetails.Status",
            createdOn: "$userDetails.CreatedOn",
            lastActiveTime: "$userDetails.LastActiveTime",
          },
        },
      },
      // Sort by purchase date (newest first)
      {
        $sort: { purchaseDate: -1 },
      },
      // Apply pagination
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const buyers = await Order.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
    countPipeline.push({ $count: "total" });
    const countResult = await Order.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      code: "200",
      msg: "Success",
      response: buyers,
      count: totalCount,
      capsuleId: capsuleId,
      pagination: {
        skip: skip,
        limit: limit,
        hasMore: skip + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error in getCapsuleBuyers:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};
exports.getCapsuleBuyers = getCapsuleBuyers;

/**
 * ⚡ NEW API: Get more replies for a specific comment
 * This is called when user clicks "View more replies" on a comment
 * @route GET /capsules/getCommentReplies
 * @param {ObjectId} commentId - The parent comment ID
 * @param {Number} skip - Number of replies to skip (for pagination)
 * @param {Number} limit - Number of replies to fetch (default: 10)
 */
var getCommentReplies = async function (req, res) {
  try {
    // ✅ CRITICAL: Check if user is logged in
    if (!req.session || !req.session.user || !req.session.user._id) {
      console.error('❌ getCommentReplies - No user session found');
      return res.status(401).json({
        code: 401,
        msg: "Unauthorized - User not logged in",
        response: [],
        count: 0
      });
    }

    const commentId = req.query.commentId || req.body.commentId;
    const skip = parseInt(req.query.skip || req.body.skip || 0);
    const limit = parseInt(req.query.limit || req.body.limit || 10);

    if (!commentId) {
      return res.status(400).json({
        code: 400,
        msg: "commentId is required",
        response: [],
        count: 0
      });
    }

    console.log('🔄 getCommentReplies - Fetching replies for comment:', commentId);
    console.log('📊 Params:', { skip, limit });

    const StreamComments = require('./../models/StreamCommentsModel.js');
    const StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
    const User = require('./../models/userModel.js');
    const StreamMember = require('./../models/StreamMembersModel.js');
    const loginUserId = req.session.user._id;

    // ⚡ Pre-fetch user's stream memberships (for InvitedFriends privacy)
    const userMemberships = await StreamMember.find({
      Members: new mongoose.Types.ObjectId(loginUserId),  // ✅ Members is an array
      IsDeleted: false,
      Status: true
    }).select('StreamId').lean();
    
    const memberCapsuleIds = userMemberships.map(m => new mongoose.Types.ObjectId(m.StreamId));

    // Fetch replies with user data and like counts + PRIVACY FILTER
    const replies = await StreamComments.aggregate([
      {
        $match: {
          $and: [
            // ParentId match
            { ParentId: new mongoose.Types.ObjectId(commentId) },
            // IsDeleted filter
            {
              $or: [
                { IsDeleted: false },
                { IsDeleted: 0 }
              ]
            },
            // ✅ PRIVACY FILTER (same as main feed)
            {
              $or: [
                { PrivacySetting: { $exists: false } },
                { PrivacySetting: 'PublicWithName' },
                { PrivacySetting: 'PublicWithoutName' },
                { PrivacySetting: 'OnlyForOwner', UserId: new mongoose.Types.ObjectId(loginUserId) },
                { PrivacySetting: 'OnlyForOwner', OwnerId: new mongoose.Types.ObjectId(loginUserId) }
                // Note: InvitedFriends requires capsuleId - need to add support for this
              ]
            }
          ]
        }
      },
      { $sort: { CreatedOn: 1 } }, // Oldest first
      { $skip: skip },
      { $limit: limit },
      // Lookup user data for reply author (only essential fields)
      {
        $lookup: {
          from: "users",
          let: { userId: "$UserId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$userId"] }
              }
            },
            {
              $project: {
                _id: 1,
                Name: 1,
                UserName: 1,
                ProfilePic: 1,
                Email: 1
              }
            }
          ],
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // Lookup reply likes
      {
        $lookup: {
          from: "StreamCommentLikes",
          let: { replyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ["$CommentId", "$$replyId"] },
                    { $ne: ["$IsDeleted", true] },
                    { $ne: ["$IsDeleted", 1] }
                  ]
                }
              }
            }
          ],
          as: "replyLikes"
        }
      },
      // Project reply fields
      {
        $project: {
          _id: 1,
          UserId: 1,
          ParentId: 1,
          Comment: 1,
          CreatedOn: 1,
          PrivacySetting: 1,
          user: 1,
          CommentLikeCount: { $size: "$replyLikes" }
        }
      }
    ]);

    // Get total reply count
    const totalCount = await StreamComments.countDocuments({
      ParentId: new mongoose.Types.ObjectId(commentId),
      $or: [
        { IsDeleted: false },
        { IsDeleted: 0 }
      ]
    });

    // ✅ NOTE: We keep user data for PublicWithoutName replies
    // Frontend will decide whether to show name or "Anonymous" based on:
    // - If reply.UserId === loggedInUserId → Show real name/pic (author sees themselves)
    // - If reply.UserId !== loggedInUserId → Show "Anonymous" (others see anonymous)

    res.json({
      code: 200,
      msg: "Success",
      response: replies,
      count: totalCount,
      pagination: {
        skip: skip,
        limit: limit,
        hasMore: skip + limit < totalCount,
      },
    });

    console.log(`✅ getCommentReplies completed - Fetched ${replies.length}/${totalCount} replies`);
  } catch (error) {
    console.error("❌ Error in getCommentReplies:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({
      code: 500,
      msg: "Error fetching comment replies",
      error: error.message,
      response: [],
      count: 0
    });
  }
};
exports.getCommentReplies = getCommentReplies;
exports.getStreamPriceMap = getStreamPriceMap;

exports.approveCapsuleForSales = approveCapsuleForSales;

// Modern schema helper functions
exports.createPageWithModernSchema = createPageWithModernSchema;
exports.createQuestionPage = createQuestionPage;
exports.addComponentToPage = addComponentToPage;
exports.inspectPageContent = inspectPageContent;
exports.debugSession = debugSession;
//Buy Now From Public Gallery - Shoping Cart Apis
exports.getCartCapsule = getCartCapsule;
exports.getCart = getCart;
exports.transferCartToCurrentUser = transferCartToCurrentUser;
exports.updatePullCartCapsule = updatePullCartCapsule;
exports.updateCartCapsule = updateCartCapsule;
exports.updateCartOwners = updateCartOwners;
exports.updatePullCartOwners = updatePullCartOwners;
exports.getCapsuleOwners = getCapsuleOwners;
exports.updateCartForMyself = updateCartForMyself;
exports.updateCartForGift = updateCartForGift;
exports.updateCartForSurpriseGift = updateCartForSurpriseGift;
exports.updateCartForMonth = updateCartForMonth;
//Buy Now From Public Gallery - Shoping Cart Apis
// Note: updateCartForFrequency export is at the end of the file after function definition
exports.getMyPurchases = getMyPurchases;
exports.getUserPurchasedCapsulesPosts = getUserPurchasedCapsulesPosts;
exports.getUserMixedFeedPosts = getUserMixedFeedPosts;
exports.getUserFeedPosts = getUserFeedPosts;
exports.getMySales = getMySales;
exports.getSalesExcel = getSalesExcel;
exports.getCapsuleMembers = getCapsuleMembers;

var updateCartForSurpriseGift = async function (req, res) {
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message:
          "User session not found. Please login as admin, subadmin, or regular user.",
        results: null,
      };
      return res.json(response);
    }

    var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
    var surpriseGiftSettings = req.body.surpriseGiftSettings || {};

    if (!CapsuleId) {
      var response = {
        status: 400,
        message: "capsuleId is required",
        results: null,
      };
      return res.json(response);
    }

    var query = { CreatedById: myself._id, "CartItems.CapsuleId": CapsuleId };

    // Update cart item with surprise gift settings
    var doc = {
      $set: {
        "CartItems.$.PurchaseFor": "SurpriseGift",
        "CartItems.$.SurpriseGiftSettings": {
          recipientEmail: surpriseGiftSettings.recipientEmail || "",
          surpriseDate: surpriseGiftSettings.surpriseDate || null,
          isSurprise: surpriseGiftSettings.isSurprise || true,
          updatedOn: Date.now(),
        },
      },
    };

    // Update cart item with surprise gift settings
    var updateResult = await Cart.updateOne(query, doc);

    if (updateResult.modifiedCount === 1) {
      // Successfully updated, get the updated cart with populated data
      var updatedCart = await Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec();

      if (updatedCart) {
        var populatedCart = await Cart.populate(updatedCart, {
          path: "CartItems.CapsuleId.CreaterId",
          model: "user",
          select: "Name",
        });

        var response = {
          status: 200,
          message: "Cart has been updated for surprise gift successfully.",
          results: populatedCart,
        };
        return res.json(response);
      }
    } else {
      // Update didn't modify any documents, still return cart data
      var cartData = await Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec();

      if (cartData) {
        var populatedCart = await Cart.populate(cartData, {
          path: "CartItems.CapsuleId.CreaterId",
          model: "user",
          select: "Name",
        });

        var response = {
          status: 200,
          message: "Cart has been retrieved successfully.",
          results: populatedCart,
        };
        return res.json(response);
      }
    }

    // If we reach here, something went wrong
    var response = {
      status: 500,
      message: "Failed to update cart for surprise gift",
      results: null,
    };
    return res.json(response);
  } catch (error) {
    console.error("Error in updateCartForSurpriseGift:", error);
    var response = {
      status: 501,
      message: "Error updating cart for surprise gift!",
      results: null,
    };
    return res.json(response);
  }
};

var updateCartForMonth = async function (req, res) {
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message:
          "User session not found. Please login as admin, subadmin, or regular user.",
        results: null,
      };
      return res.json(response);
    }

    var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
    var MonthFor = req.body.MonthFor ? req.body.MonthFor : "M1";

    if (!CapsuleId) {
      var response = {
        status: 400,
        message: "capsuleId is required",
        results: null,
      };
      return res.json(response);
    }

    var query = { CreatedById: myself._id, "CartItems.CapsuleId": CapsuleId };

    var doc = {
      $set: { "CartItems.$.MonthFor": MonthFor },
    };

    // Update cart item with month settings
    var updateResult = await Cart.updateOne(query, doc);

    if (updateResult.modifiedCount === 1) {
      // Successfully updated, get the updated cart with populated data
      var updatedCart = await Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec();

      if (updatedCart) {
        var populatedCart = await Cart.populate(updatedCart, {
          path: "CartItems.CapsuleId.CreaterId",
          model: "user",
          select: "Name",
        });

        var response = {
          status: 200,
          message: "Cart has been updated for month successfully.",
          results: populatedCart,
        };
        return res.json(response);
      }
    } else {
      // Update didn't modify any documents, still return cart data
      var cartData = await Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec();

      if (cartData) {
        var populatedCart = await Cart.populate(cartData, {
          path: "CartItems.CapsuleId.CreaterId",
          model: "user",
          select: "Name",
        });

        var response = {
          status: 200,
          message: "Cart has been retrieved successfully.",
          results: populatedCart,
        };
        return res.json(response);
      }
    }

    // If we reach here, something went wrong
    var response = {
      status: 500,
      message: "Failed to update cart for month",
      results: null,
    };
    return res.json(response);
  } catch (error) {
    console.error("Error in updateCartForMonth:", error);
    var response = {
      status: 501,
      message: "Error updating cart for month!",
      results: null,
    };
    return res.json(response);
  }
};

var updateCartForFrequency = async function (req, res) {
  try {
    // Safe session access for admin, subadmin, and regular users
    var myself = null;

    if (req.session && req.session.user) {
      myself = req.session.user;
    } else if (req.session && req.session.admin) {
      myself = req.session.admin;
    } else if (req.session && req.session.subadmin) {
      myself = req.session.subadmin;
    }

    if (!myself) {
      var response = {
        status: 401,
        message:
          "User session not found. Please login as admin, subadmin, or regular user.",
        results: null,
      };
      return res.json(response);
    }

    var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
    var frequencySettings = req.body.frequencySettings || {};
    var frequency = frequencySettings.frequency || req.body.Frequency || "high";
    var daysBetween =
      frequencySettings.daysBetween || req.body.daysBetween || 7;

    if (!CapsuleId) {
      var response = {
        status: 400,
        message: "capsuleId is required",
        results: null,
      };
      return res.json(response);
    }

    var query = { CreatedById: myself._id, "CartItems.CapsuleId": CapsuleId };

    // Update cart item with frequency settings
    var doc = {
      $set: {
        "CartItems.$.Frequency": frequency,
        "CartItems.$.FrequencySettings": {
          frequency: frequency,
          daysBetween: daysBetween,
          updatedOn: Date.now(),
        },
      },
    };

    // Update cart item with frequency settings
    var updateResult = await Cart.updateOne(query, doc);

    if (updateResult.modifiedCount === 1) {
      // Successfully updated, get the updated cart with populated data
      var updatedCart = await Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec();

      if (updatedCart) {
        var populatedCart = await Cart.populate(updatedCart, {
          path: "CartItems.CapsuleId.CreaterId",
          model: "user",
          select: "Name",
        });

        var response = {
          status: 200,
          message: "Cart has been updated for frequency successfully.",
          results: populatedCart,
        };
        return res.json(response);
      }
    } else {
      // Update didn't modify any documents, still return cart data
      var cartData = await Cart.findOne({ CreatedById: myself._id })
        .populate("CartItems.CapsuleId")
        .exec();

      if (cartData) {
        var populatedCart = await Cart.populate(cartData, {
          path: "CartItems.CapsuleId.CreaterId",
          model: "user",
          select: "Name",
        });

        var response = {
          status: 200,
          message: "Cart has been retrieved successfully.",
          results: populatedCart,
        };
        return res.json(response);
      }
    }

    // If we reach here, something went wrong
    var response = {
      status: 500,
      message: "Failed to update cart for frequency",
      results: null,
    };
    return res.json(response);
  } catch (error) {
    console.error("Error in updateCartForFrequency:", error);
    var response = {
      status: 501,
      message: "Error updating cart for frequency!",
      results: null,
    };
    return res.json(response);
  }
};

// Export updateCartForFrequency after function definition
exports.updateCartForFrequency = updateCartForFrequency;

/**
 * Update month/duration for active capsule (after purchase)
 * POST /capsules/updateCartForMonth_ActiveCapsule
 * 
 * This function:
 * 1. Updates the Capsule.MonthFor field
 * 2. Finds all undelivered posts for this capsule
 * 3. Recalculates their DateOfDelivery to fit within new duration
 * 4. Updates NotificationWillEndOn based on new duration
 * 5. Updates all affected SyncedPost records
 */
var updateCartForMonth_ActiveCapsule = async function (req, res) {
  try {
    const CapsuleId = req.body.capsuleId ? req.body.capsuleId : null;
    const MonthFor = req.body.MonthFor ? req.body.MonthFor : 'M12';

    if (!CapsuleId) {
      return res.json({
        status: 400,
        message: "capsuleId is required",
        results: null,
      });
    }

    // Step 1: Get current capsule data to know the frequency
    const capsuleData = await Capsule.findOne({ _id: CapsuleId }).exec();
    
    if (!capsuleData) {
      return res.json({
        status: 404,
        message: "Capsule not found",
        results: null,
      });
    }

    // Step 2: Update Capsule duration
    const conditions = {
      _id: CapsuleId
    };

    const doc = {
      $set: { 'MonthFor': MonthFor }
    };

    await Capsule.updateOne(conditions, doc);
    console.log(`✅ Updated MonthFor to ${MonthFor} for capsule ${CapsuleId}`);

    // Step 3: Get frequency and calculate days between posts
    const currentFrequency = capsuleData.Frequency || 'medium';
    const frequencyToDays = {
      'high': 1,    // Every day
      'medium': 3,  // Every 3 days
      'low': 7      // Every 7 days
    };
    const daysBetween = frequencyToDays[currentFrequency] || 3;

    // Step 4: Calculate total duration in days
    const monthMapping = {
      'M1': 30,
      'M3': 90,
      'M6': 180,
      'M9': 270,
      'M12': 365
    };
    const totalDurationDays = monthMapping[MonthFor] || 365;

    // Step 5: Fetch MASTER list from SyncedpostsMap (SOURCE OF TRUTH - has ALL posts!)
    const syncedpostsMap = await SyncedpostsMap.findOne({
      CapsuleId: CapsuleId,
      IsDeleted: false
    }).lean().exec();

    if (!syncedpostsMap || !syncedpostsMap.SyncedPosts || !Array.isArray(syncedpostsMap.SyncedPosts)) {
      console.log(`⚠️ No SyncedpostsMap found for capsule ${CapsuleId}`);
      return res.json({
        status: 404,
        message: "No master post list found for this capsule. Please recreate the stream.",
        results: null
      });
    }

    const masterPostList = syncedpostsMap.SyncedPosts;  // ALL posts (e.g., 331)!
    console.log(`📦 Found master list with ${masterPostList.length} posts in SyncedpostsMap`);

    // Step 6: BEFORE deleting, track which posts were already delivered
    const oldSyncedPosts = await SyncedPost.find({
      CapsuleId: CapsuleId,
      IsDeleted: false
    }).lean().exec();

    // Build a Set of delivered PostIds (track which posts were sent)
    const deliveredPostIds = new Set();
    
    for (const oldPost of oldSyncedPosts) {
      if (oldPost.EmailEngineDataSets && Array.isArray(oldPost.EmailEngineDataSets)) {
        for (const emailSet of oldPost.EmailEngineDataSets) {
          if (emailSet.Delivered === true) {
            // Track by PostId only (the post itself, not the date)
            deliveredPostIds.add(oldPost.PostId.toString());
          }
        }
      }
    }

    console.log(`📋 Found ${deliveredPostIds.size} already delivered posts to exclude`);

    // Step 7: Delete old Syncedposts collection records (hard delete for clean DB)
    const now = new Date();
    const streamEndDate = new Date(now);
    streamEndDate.setDate(streamEndDate.getDate() + totalDurationDays);

    const deleteResult = await SyncedPost.deleteMany({
      CapsuleId: CapsuleId
    });
    const deletedCount = deleteResult.deletedCount || 0;
    console.log(`🗑️ Hard deleted ${deletedCount} old Syncedposts records`);

    // Step 8: Recreate Syncedposts from master list with new duration
    let recreatedCount = 0;
    let globalPostIndex = 0;
    let skippedDeliveredCount = 0;

    for (const masterPost of masterPostList) {
      if (!masterPost.EmailEngineDataSets || !Array.isArray(masterPost.EmailEngineDataSets)) {
        continue;
      }

      // Check if this post was already delivered (skip it entirely!)
      const postIdStr = masterPost.PostId ? masterPost.PostId.toString() : '';
      const wasDelivered = deliveredPostIds.has(postIdStr);
      
      if (wasDelivered) {
        skippedDeliveredCount++;
        continue;  // Skip this post - already sent to user!
      }

      // Create new EmailEngineDataSets array with recalculated dates (only for undelivered posts)
      const newEmailEngineDataSets = masterPost.EmailEngineDataSets.map((emailSet) => {
        const newDate = new Date(now);
        newDate.setDate(newDate.getDate() + (globalPostIndex * daysBetween));
        newDate.setHours(9, 0, 0, 0); // Set to 9 AM
        globalPostIndex++;

        return {
          ...emailSet,
          DateOfDelivery: newDate,
          Delivered: false
        };
      });

      // Only create if at least one post fits within new duration
      const postsWithinDuration = newEmailEngineDataSets.filter(set => 
        new Date(set.DateOfDelivery) <= streamEndDate
      );

      if (postsWithinDuration.length > 0) {
        const newSyncedPost = new SyncedPost({
          CapsuleId: masterPost.CapsuleId,
          PageId: masterPost.PageId,
          PostId: masterPost.PostId,
          PostImage: masterPost.PostImage,
          PostStatement: masterPost.PostStatement,
          PostOwnerId: masterPost.PostOwnerId,
          ReceiverEmails: masterPost.ReceiverEmails,
          SurpriseSelectedTags: masterPost.SurpriseSelectedTags,
          EmailEngineDataSets: postsWithinDuration,  // Only posts within duration
          EmailTemplate: masterPost.EmailTemplate,
          EmailSubject: masterPost.EmailSubject,
          IsOnetimeStream: masterPost.IsOnetimeStream,
          IsOnlyPostImage: masterPost.IsOnlyPostImage,
          IsPrivateQuestionPost: masterPost.IsPrivateQuestionPost,
          Status: masterPost.Status,
          IsDeleted: false,
          IsPageStreamCase: masterPost.IsPageStreamCase,
          SyncedBy: masterPost.SyncedBy,
          NotificationWillEndOn: streamEndDate,
          CreatedOn: new Date()
        });

        await newSyncedPost.save();
        recreatedCount++;
      }
    }

    console.log(`🗑️ Hard deleted ${deletedCount} old Syncedposts records`);
    console.log(`✅ Recreated ${recreatedCount} Syncedposts records from ${masterPostList.length} master posts`);
    console.log(`⏭️ Skipped ${skippedDeliveredCount} already delivered posts (no duplicates)`);
    console.log(`📅 New stream end date: ${streamEndDate.toISOString()}`);

    return res.json({
      status: 200,
      message: "Stream duration updated successfully and delivery schedule recreated",
      results: { 
        MonthFor,
        durationDays: totalDurationDays,
        currentFrequency,
        daysBetween,
        streamEndDate: streamEndDate.toISOString(),
        masterPostsInMap: masterPostList.length,
        oldRecordsDeleted: deletedCount,
        newRecordsCreated: recreatedCount,
        deliveredPostsSkipped: skippedDeliveredCount
      }
    });

  } catch (error) {
    console.error("Error in updateCartForMonth_ActiveCapsule:", error);
    return res.json({
      status: 501,
      message: "Error updating stream duration",
      error: error.message,
    });
  }
};

/**
 * Update frequency for active capsule (after purchase)
 * POST /capsules/updateCartForFrequency_ActiveCapsule
 * 
 * This function:
 * 1. Updates the Capsule.Frequency field
 * 2. Finds all undelivered posts for this capsule
 * 3. Recalculates their DateOfDelivery based on new frequency
 * 4. Updates all affected SyncedPost records
 */
var updateCartForFrequency_ActiveCapsule = async function (req, res) {
  try {
    const CapsuleId = req.body.capsuleId ? req.body.capsuleId : null;
    const Frequency = req.body.Frequency ? req.body.Frequency : 'high';

    if (!CapsuleId) {
      return res.json({
        status: 400,
        message: "capsuleId is required",
        results: null,
      });
    }

    // Step 1: Update Capsule frequency
    const conditions = {
      _id: CapsuleId
    };

    const doc = {
      $set: { 'Frequency': Frequency }
    };

    await Capsule.updateOne(conditions, doc);
    console.log(`✅ Updated Frequency to ${Frequency} for capsule ${CapsuleId}`);

    // Step 2: Get frequency mapping (days between posts)
    const frequencyToDays = {
      'high': 1,    // Every day
      'medium': 3,  // Every 3 days
      'low': 7      // Every 7 days
    };
    const daysBetween = frequencyToDays[Frequency] || 3;

    // Step 3: Fetch MASTER list from SyncedpostsMap (SOURCE OF TRUTH - has ALL posts!)
    const syncedpostsMap = await SyncedpostsMap.findOne({
      CapsuleId: CapsuleId,
      IsDeleted: false
    }).lean().exec();

    if (!syncedpostsMap || !syncedpostsMap.SyncedPosts || !Array.isArray(syncedpostsMap.SyncedPosts)) {
      console.log(`⚠️ No SyncedpostsMap found for capsule ${CapsuleId}`);
      return res.json({
        status: 404,
        message: "No master post list found for this capsule. Please recreate the stream.",
        results: null
      });
    }

    const masterPostList = syncedpostsMap.SyncedPosts;  // ALL posts (e.g., 331)!
    console.log(`📦 Found master list with ${masterPostList.length} posts in SyncedpostsMap`);

    // Step 4: BEFORE deleting, track which posts were already delivered
    const oldSyncedPosts = await SyncedPost.find({
      CapsuleId: CapsuleId,
      IsDeleted: false
    }).lean().exec();

    // Build a Set of delivered PostIds (track which posts were sent)
    const deliveredPostIds = new Set();
    
    for (const oldPost of oldSyncedPosts) {
      if (oldPost.EmailEngineDataSets && Array.isArray(oldPost.EmailEngineDataSets)) {
        for (const emailSet of oldPost.EmailEngineDataSets) {
          if (emailSet.Delivered === true) {
            // Track by PostId only (the post itself, not the date)
            deliveredPostIds.add(oldPost.PostId.toString());
          }
        }
      }
    }

    console.log(`📋 Found ${deliveredPostIds.size} already delivered posts to exclude`);

    // Step 5: Delete old Syncedposts collection records (hard delete for clean DB)
    const now = new Date();

    const deleteResult = await SyncedPost.deleteMany({
      CapsuleId: CapsuleId
    });
    const deletedCount = deleteResult.deletedCount || 0;
    console.log(`🗑️ Hard deleted ${deletedCount} old Syncedposts records`);

    // Step 6: Recreate Syncedposts from master list with new frequency
    let recreatedCount = 0;
    let globalPostIndex = 0;
    let skippedDeliveredCount = 0;

    for (const masterPost of masterPostList) {
      if (!masterPost.EmailEngineDataSets || !Array.isArray(masterPost.EmailEngineDataSets)) {
        continue;
      }

      // Check if this post was already delivered (skip it entirely!)
      const postIdStr = masterPost.PostId ? masterPost.PostId.toString() : '';
      const wasDelivered = deliveredPostIds.has(postIdStr);
      
      if (wasDelivered) {
        skippedDeliveredCount++;
        continue;  // Skip this post - already sent to user!
      }

      // Create new EmailEngineDataSets array with recalculated dates (only for undelivered posts)
      const newEmailEngineDataSets = masterPost.EmailEngineDataSets.map((emailSet) => {
        const newDate = new Date(now);
        newDate.setDate(newDate.getDate() + (globalPostIndex * daysBetween));
        newDate.setHours(9, 0, 0, 0); // Set to 9 AM
        globalPostIndex++;

        return {
          ...emailSet,
          DateOfDelivery: newDate,
          Delivered: false
        };
      });

      // Create new Syncedposts record (recreate all undelivered posts)
      if (newEmailEngineDataSets.length > 0) {
        const newSyncedPost = new SyncedPost({
          CapsuleId: masterPost.CapsuleId,
          PageId: masterPost.PageId,
          PostId: masterPost.PostId,
          PostImage: masterPost.PostImage,
          PostStatement: masterPost.PostStatement,
          PostOwnerId: masterPost.PostOwnerId,
          ReceiverEmails: masterPost.ReceiverEmails,
          SurpriseSelectedTags: masterPost.SurpriseSelectedTags,
          EmailEngineDataSets: newEmailEngineDataSets,
          EmailTemplate: masterPost.EmailTemplate,
          EmailSubject: masterPost.EmailSubject,
          IsOnetimeStream: masterPost.IsOnetimeStream,
          IsOnlyPostImage: masterPost.IsOnlyPostImage,
          IsPrivateQuestionPost: masterPost.IsPrivateQuestionPost,
          Status: masterPost.Status,
          IsDeleted: false,
          IsPageStreamCase: masterPost.IsPageStreamCase,
          SyncedBy: masterPost.SyncedBy,
          NotificationWillEndOn: masterPost.NotificationWillEndOn,
          CreatedOn: new Date()
        });

        await newSyncedPost.save();
        recreatedCount++;
      }
    }

    console.log(`🗑️ Hard deleted ${deletedCount} old Syncedposts records`);
    console.log(`✅ Recreated ${recreatedCount} Syncedposts records from ${masterPostList.length} master posts`);
    console.log(`⏭️ Skipped ${skippedDeliveredCount} already delivered posts (no duplicates)`);

    return res.json({
      status: 200,
      message: "Email frequency updated successfully and delivery schedule recreated",
      results: { 
        Frequency,
        daysBetween,
        masterPostsInMap: masterPostList.length,
        oldRecordsDeleted: deletedCount,
        newRecordsCreated: recreatedCount,
        deliveredPostsSkipped: skippedDeliveredCount
      }
    });

  } catch (error) {
    console.error("Error in updateCartForFrequency_ActiveCapsule:", error);
    return res.json({
      status: 501,
      message: "Error updating email frequency",
      error: error.message,
    });
  }
};
/**
 * Get scheduled posts for a capsule (for debugging/verification)
 * GET /capsules/getScheduledPosts
 * Query params: capsuleId
 */
var getScheduledPosts = async function (req, res) {
  try {
    const CapsuleId = req.query.capsuleId || req.body.capsuleId;

    if (!CapsuleId) {
      return res.json({
        status: 400,
        message: "capsuleId is required",
        results: null,
      });
    }

    // Find all SyncedPost records for this capsule
    const syncedPosts = await SyncedPost.find({
      CapsuleId: CapsuleId,
      IsDeleted: false
    })
    .sort({ CreatedOn: 1 })
    .select('_id CapsuleId PageId PostId EmailEngineDataSets NotificationWillEndOn CreatedOn Status')
    .lean()
    .exec();

    // Extract and format the delivery schedule
    const schedule = [];
    let totalPosts = 0;
    let deliveredCount = 0;
    let undeliveredCount = 0;

    for (const syncedPost of syncedPosts) {
      if (syncedPost.EmailEngineDataSets && Array.isArray(syncedPost.EmailEngineDataSets)) {
        for (const emailSet of syncedPost.EmailEngineDataSets) {
          totalPosts++;
          const isDelivered = emailSet.Delivered === true;
          
          if (isDelivered) {
            deliveredCount++;
          } else {
            undeliveredCount++;
          }

          schedule.push({
            syncedPostId: syncedPost._id,
            postId: syncedPost.PostId,
            dateOfDelivery: emailSet.DateOfDelivery,
            delivered: isDelivered,
            visualUrls: emailSet.VisualUrls || [],
            textAbove: emailSet.TextAboveVisual || '',
            textBelow: emailSet.TextBelowVisual || ''
          });
        }
      }
    }

    // Sort by delivery date
    schedule.sort((a, b) => {
      const dateA = a.dateOfDelivery ? new Date(a.dateOfDelivery) : new Date(0);
      const dateB = b.dateOfDelivery ? new Date(b.dateOfDelivery) : new Date(0);
      return dateA - dateB;
    });

    // Get capsule info
    const capsule = await Capsule.findOne({ _id: CapsuleId })
      .select('Title Frequency MonthFor IsStreamPaused')
      .exec();

    return res.json({
      status: 200,
      message: "Scheduled posts retrieved successfully",
      results: {
        capsule: {
          id: CapsuleId,
          title: capsule?.Title || 'Unknown',
          frequency: capsule?.Frequency || 'medium',
          duration: capsule?.MonthFor || 'M12',
          isPaused: capsule?.IsStreamPaused || false
        },
        summary: {
          totalPosts,
          deliveredCount,
          undeliveredCount,
          syncedPostRecords: syncedPosts.length
        },
        schedule: schedule,
        notificationWillEndOn: syncedPosts.length > 0 ? syncedPosts[0].NotificationWillEndOn : null
      }
    });

  } catch (error) {
    console.error("Error in getScheduledPosts:", error);
    return res.json({
      status: 501,
      message: "Error retrieving scheduled posts",
      error: error.message,
    });
  }
};
exports.getScheduledPosts = getScheduledPosts;

/**
 * Toggle stream pause/resume
 * POST /capsules/toggleStream
 */
var toggleStream = async function (req, res) {
  try {
    const CapsuleId = req.body.capsuleId ? req.body.capsuleId : null;
    const IsStreamPaused = req.body.IsStreamPaused !== undefined ? req.body.IsStreamPaused : null;

    if (!CapsuleId) {
      return res.json({
        status: 400,
        message: "capsuleId is required",
        results: null,
      });
    }

    const conditions = {
      _id: CapsuleId
    };

    let toggleValue;
    
    if (IsStreamPaused !== null) {
      // If explicit value provided, use it
      toggleValue = IsStreamPaused;
    } else {
      // Otherwise, toggle current value
      const result = await Capsule.findOne(conditions);
      toggleValue = result && result.IsStreamPaused ? false : true;
    }

    const doc = {
      $set: { 'IsStreamPaused': toggleValue }
    };

    await Capsule.updateOne(conditions, doc);

    console.log(`✅ Stream ${toggleValue ? 'paused' : 'resumed'} for capsule ${CapsuleId}`);

    return res.json({
      status: 200,
      message: `Stream ${toggleValue ? 'paused' : 'resumed'} successfully`,
      results: { IsStreamPaused: toggleValue }
    });

  } catch (error) {
    console.error("Error in toggleStream:", error);
    return res.json({
      status: 501,
      message: "Error toggling stream status",
      error: error.message,
    });
  }
};

/*________________________________________________________________________
   * @Method :   		checkPostStreams
   * Created By: 		smartData Enterprises Ltd
   * @Purpose:   		Check if post has streams enabled
   * @Param:     		2
   * @Return:    	 	yes
_________________________________________________________________________
*/
var checkPostStreams = async function (req, res) {
  try {
    const PageStream = require('./../models/pageStreamModel.js');
    
    var cond = {
      PageId: req.body.PageId ? req.body.PageId : null,
      PostId: req.body.PostId ? req.body.PostId : null
    };
    var f = {
      SelectedBlendImages: 1
    };
    var SelectedBlendImagesArr = await PageStream.find(cond, f);
    var SelectedBlendImages = [];

    var response = {
      status: "error",
      message: "Stream is not enabled, Please set now.",
      results: SelectedBlendImages
    };

    if (SelectedBlendImagesArr.length) {
      SelectedBlendImages = SelectedBlendImagesArr[0].SelectedBlendImages ? SelectedBlendImagesArr[0].SelectedBlendImages : [];
      if (SelectedBlendImages.length) {
        response = {
          status: "success",
          message: "Stream is already enabled for this post.",
          results: SelectedBlendImages
        };
      }
    }

    res.json(response);
  } catch (error) {
    console.error('checkPostStreams error:', error);
    res.json({
      status: "error",
      message: "Something went wrong.",
      error: error.message
    });
  }
};

/*________________________________________________________________________
   * @Method :   		unsubscribe_changeSettings
   * Created By: 		smartData Enterprises Ltd
   * @Purpose:   		Update stream settings for active capsule
   * @Param:     		2
   * @Return:    	 	yes
_________________________________________________________________________
*/
var unsubscribe_changeSettings = async function (req, res) {
  try {
    const SyncedPost = require('./../models/syncedpostModel.js');
    const PageStream = require('./../models/pageStreamModel.js');
    
    var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;

    var conditions = {
      _id: CapsuleId
    };

    var doc = {
      $set: {
        MonthFor: req.body.MonthFor ? req.body.MonthFor : 'M12',
        Frequency: req.body.Frequency ? req.body.Frequency : 'medium',
        EmailTemplate: req.body.EmailTemplate ? req.body.EmailTemplate : 'PracticalThinker',
        IsStreamPaused: req.body.IsStreamPaused ? true : false
      }
    };

    if (typeof req.body.EmailSubject != 'undefined') {
      doc.$set.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
    }

    if (typeof req.body.IsOnetimeStream != 'undefined') {
      doc.$set.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
    }

    if (typeof req.body.IsOnlyPostImage != 'undefined') {
      doc.$set.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
    }

    var CapsuleData_beforeUpdate = await Capsule.findOne(conditions);
    await Capsule.updateOne(conditions, doc);

    var CapsuleData = await Capsule.findOne(conditions);

    // Update synced posts status
    var conditions_sp = {
      CapsuleId: CapsuleData._id,
      IsDeleted: 0
    };
    
    var dataToUpdate = {
      Status: !doc.$set.IsStreamPaused,
      EmailTemplate: doc.$set.EmailTemplate ? doc.$set.EmailTemplate : 'PracticalThinker'
    };

    if (typeof req.body.EmailSubject != 'undefined') {
      dataToUpdate.EmailSubject = req.body.EmailSubject ? req.body.EmailSubject : '';
    }

    if (typeof req.body.IsOnetimeStream != 'undefined') {
      dataToUpdate.IsOnetimeStream = req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false;
    }

    if (typeof req.body.IsOnlyPostImage != 'undefined') {
      dataToUpdate.IsOnlyPostImage = req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false;
    }

    await SyncedPost.updateMany(conditions_sp, { $set: dataToUpdate });

    res.json({
      status: 200,
      message: "Stream settings updated successfully."
    });
  } catch (error) {
    console.error('unsubscribe_changeSettings error:', error);
    res.json({
      status: 501,
      message: "Something went wrong.",
      error: error.message
    });
  }
};

/*________________________________________________________________________
   * @Date:      		2025-01-07
   * @Method :   		getStreamPostsOptimized
   * @Purpose:   		Fetch posts from a SPECIFIC stream using SyncedPost collection
   *                  Same structure as getUserMixedFeedPosts but filtered to one stream
   *                  No friend activity - only stream's posts
   * @Param:     		capsule_id (header), limit, skip, type, selectedKeyword
   * @Return:    	 	Stream posts with same format as feed page
   * @Access Category:	"Single Stream View"
   * @Collections:     SyncedPost, StreamLikes, StreamComments, StreamCommentLikes
_________________________________________________________________________
*/
var getStreamPostsOptimized = async function (req, res) {
  try {
    // Get capsule ID from header or body
    const capsuleId = req.headers.capsule_id || req.body.capsuleId;
    
    if (!capsuleId) {
      return res.json({
        code: '400',
        msg: 'capsule_id is required',
        response: [],
        count: 0
      });
    }

    // Check if user is logged in
    if (!req.session || !req.session.user || !req.session.user._id) {
      console.error('❌ getStreamPostsOptimized - No user session found');
      return res.status(401).json({
        code: 401,
        msg: "Unauthorized - User not logged in",
        response: [],
        count: 0
      });
    }

    const limit = req.body.limit || 10;  // ✅ Default to 10 posts per fetch
    const skip = req.body.skip || 0;
    const type = req.body.type || null;
    const selectedKeyword = req.body.selectedKeyword || null;
    const loadOlderRaw = req.body.loadOlderPosts ?? req.query?.loadOlderPosts ?? false;
    const loadOlderPosts = loadOlderRaw === true || loadOlderRaw === 'true' || loadOlderRaw === 1 || loadOlderRaw === '1';
    const loginUserId = req.session.user._id;

    const SyncedPost = require('./../models/syncedpostModel.js');
    const StreamLikes = require('./../models/StreamLikes.js');
    const StreamComments = require('./../models/StreamCommentsModel.js');
    const StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
    const StreamMember = require('./../models/StreamMembersModel.js');
    
    console.log('🚀 getStreamPostsOptimized - Start');
    console.log('👤 User ID:', loginUserId);
    console.log('🎯 Capsule ID:', capsuleId);
    console.log('📊 Params:', { limit, skip, type, selectedKeyword });
    const startTime = Date.now();

    // Get user's stream memberships (for InvitedFriends privacy)
    const userMemberships = await StreamMember.find({
      Members: new mongoose.Types.ObjectId(loginUserId),
      IsDeleted: false,
      Status: true
    }).select('StreamId').lean().maxTimeMS(10000);
    
    const memberCapsuleIds = userMemberships.map(m => new mongoose.Types.ObjectId(m.StreamId));
    console.log(`📊 User is member of ${memberCapsuleIds.length} streams`);

    // ✅ Calculate today's date (DATE ONLY - ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // ✅ Get date string for comparison (YYYY-MM-DD format)
    const todayDateStr = today.toISOString().split('T')[0]; // e.g., "2025-11-25"
    
    console.log(`📅 Today's date (date only): ${todayDateStr}`);
    console.log(`📅 Current date/time: ${new Date().toISOString()}`);

    const t_count = Date.now();
    const baseMatch = {
      CapsuleId: new mongoose.Types.ObjectId(capsuleId),
      IsDeleted: false,
      Status: true
    };
    
    const basePipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          firstDataSet: { $arrayElemAt: ["$EmailEngineDataSets", 0] },
          DateOfDeliveryDateOnly: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: { $arrayElemAt: ["$EmailEngineDataSets.DateOfDelivery", 0] },
              timezone: "UTC"
            }
          }
        }
      }
    ];
    
    // ✅ Count posts for the current mode (today or older)
    const currentModeMatch = loadOlderPosts
      ? { DateOfDeliveryDateOnly: { $lt: todayDateStr } }
      : { DateOfDeliveryDateOnly: todayDateStr };
    
    let totalCountResult = await SyncedPost.aggregate([
      ...basePipeline,
      { $match: currentModeMatch },
      { $count: "total" }
    ], { maxTimeMS: 5000, allowDiskUse: true });
    
    let totalCount = totalCountResult[0]?.total || 0;
    
    // ✅ Always count older posts to determine button visibility
    const olderCountResult = await SyncedPost.aggregate([
      ...basePipeline,
      { $match: { DateOfDeliveryDateOnly: { $lt: todayDateStr } } },
      { $count: "total" }
    ], { maxTimeMS: 5000, allowDiskUse: true });
    const totalOlderPosts = olderCountResult[0]?.total || 0;
    const hasOlderPostsAvailable = totalOlderPosts > 0;
    
    if (!loadOlderPosts) {
      console.log(`📊 Found ${totalCount} posts for today [${Date.now() - t_count}ms]`);
      console.log(`📊 Older posts available: ${totalOlderPosts}`);
    } else {
      console.log(`📊 Loading older posts: ${totalCount} found [${Date.now() - t_count}ms]`);
    }
    
    if (totalCount === 0) {
      return res.json({
        code: '200',
        msg: "Success - No posts found in this stream",
        response: [],
        count: 0,
        hasOlderPosts: loadOlderPosts ? false : hasOlderPostsAvailable,
        pagination: { skip: skip, limit: limit, hasMore: false },
        filters: { type: type, selectedKeyword: selectedKeyword },
      });
    }

    // Build aggregation pipeline - reuse base stages, then filter by mode
    const pipeline = [
      ...basePipeline,
      {
        $match: loadOlderPosts
          ? { DateOfDeliveryDateOnly: { $lt: todayDateStr } }
          : { DateOfDeliveryDateOnly: todayDateStr }
      },
      {
        $addFields: {
          DateOfDeliveryForSort: "$firstDataSet.DateOfDelivery"
        }
      },
      
      // Sort by DateOfDelivery (most recent first for past posts, or CreatedOn for today's posts)
      { $sort: loadOlderPosts 
          ? { DateOfDeliveryForSort: -1, _id: -1 }  // Most recent past posts first
          : { CreatedOn: -1, _id: -1 }              // Today's posts by creation date
      },
      { $skip: skip },
      { $limit: limit },
      
      // Extract remaining EmailEngineDataSets fields (firstDataSet already extracted above)
      {
        $addFields: {
          Delivered: "$firstDataSet.Delivered",
          VisualUrls: "$firstDataSet.VisualUrls",
          SoundFileUrl: "$firstDataSet.SoundFileUrl",
          TextAboveVisual: "$firstDataSet.TextAboveVisual",
          TextBelowVisual: "$firstDataSet.TextBelowVisual",
          DateOfDelivery: "$firstDataSet.DateOfDelivery",
          BlendMode: "$firstDataSet.BlendMode",
          hexcode_blendedImage_temp: "$firstDataSet.hexcode_blendedImage",
        },
      },
      
      // ✅ Add flag to indicate if this is an old post (compare by date only, not time)
      {
        $addFields: {
          isOldPost: {
            $lt: ["$DateOfDeliveryDateOnly", todayDateStr]
          }
        }
      },
      
      // Project fields (exclude temporary fields by not including them)
      {
        $project: {
          _id: 1,
          CapsuleId: 1,
          PageId: 1,
          PostId: 1,
          PostStatement: 1,
          postTags: 1, // ✅ Added: Include postTags from SyncedPost
          PostOwnerId: 1,
          SyncedBy: 1,
          ReceiverEmails: 1,
          CreatedOn: 1,
          Delivered: 1,
          VisualUrls: 1,
          SoundFileUrl: 1,
          TextAboveVisual: 1,
          TextBelowVisual: 1,
          DateOfDelivery: 1,
          BlendMode: 1,
          EmailTemplate: 1,
          Subject: "$EmailSubject",
          IsOnetimeStream: 1,
          IsOnlyPostImage: 1,
          hexcode_blendedImage_temp: 1,
          UploaderID: 1,
          isOldPost: 1, // Flag indicating if post is from past day (not current day)
          // Note: firstDataSet, DateOfDeliveryForSort, todayStartForCheck, and todayEndForCheck 
          // are automatically excluded since we're using inclusion projection
        },
      },
      
      // Lookup actual Media document
      {
        $lookup: {
          from: "media",
          let: { postId: "$PostId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", { $toObjectId: "$$postId" }] }
              }
            }
          ],
          as: "mediaDoc"
        }
      },
      // ⚠️ CRITICAL: preserveNullAndEmptyArrays: true keeps posts even without Media documents
      // If this was false, posts without Media would be removed!
      { $unwind: { path: "$mediaDoc", preserveNullAndEmptyArrays: true } },
      
      // Add media fields to root
      {
        $addFields: {
          MediaType: "$mediaDoc.MediaType",
          LinkType: "$mediaDoc.LinkType",
          Content: "$mediaDoc.Content",
          Location: "$mediaDoc.Location",
          UploadedBy: "$mediaDoc.UploadedBy",
          UploadedOn: { $ifNull: ["$mediaDoc.UploadedOn", "$CreatedOn"] },
          UploaderID: "$mediaDoc.UploaderID",
          GroupTags: "$mediaDoc.GroupTags",
          BlendSettings: "$mediaDoc.BlendSettings",
          thumbnail: "$mediaDoc.thumbnail",
          Locator: "$mediaDoc.Locator",
          AutoId: "$mediaDoc.AutoId",
          ContentType: "$mediaDoc.ContentType",
        }
      },
      
      // Apply media type filter
      ...(type && type !== "all"
        ? [
            {
              $match: {
                $or: [
                  { MediaType: type },
                  ...(type === "Image"
                    ? [
                        { MediaType: "Link", LinkType: "image" },
                        { MediaType: "1MJPost" },
                        { MediaType: "2MJPost" },
                        { MediaType: "1UnsplashPost" },
                        { MediaType: "2UnsplashPost" },
                      ]
                    : []),
                  ...(type === "Video"
                    ? [
                        { MediaType: "Link", LinkType: { $ne: "image" } },
                        { MediaType: "Video" },
                        { MediaType: "Audio" },
                      ]
                    : []),
                ],
              },
            },
          ]
        : []),

      // Apply keyword filter
      ...(selectedKeyword
        ? [
            {
              $match: {
                $or: [
                  { "GroupTags.GroupTagID": selectedKeyword },
                  { GroupTags: selectedKeyword },
                ],
              },
            },
          ]
        : []),
      
      // Lookup Capsule + Owner + Creator
      {
        $lookup: {
          from: "Capsules",
          let: { capsuleId: "$CapsuleId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$capsuleId"] } } },
            { $limit: 1 },
            {
              $lookup: {
                from: "users",
                localField: "OwnerId",
                foreignField: "_id",
                as: "owner"
              }
            },
            { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "users",
                let: { creatorId: "$CreaterId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", { $toObjectId: "$$creatorId" }] }
                    }
                  },
                  { $project: { Name: 1, ProfilePic: 1 } }
                ],
                as: "creator"
              }
            },
            { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                Title: 1,
                OwnerId: 1,
                CreaterId: 1,
                CoverArt: 1,
                MetaData: 1,
                LaunchSettings: 1,
                CreatedOn: 1,
                ModifiedOn: 1,
                ownerName: "$owner.Name",
                ownerEmail: "$owner.Email",
                ownerProfilePic: "$owner.ProfilePic",
                creatorName: "$creator.Name",
                creatorProfilePic: "$creator.ProfilePic"
              }
            }
          ],
          as: "capsuleData"
        }
      },
      { $unwind: { path: "$capsuleData", preserveNullAndEmptyArrays: true } },
      
      // Lookup post uploader details
      {
        $lookup: {
          from: "users",
          let: { uploaderId: "$UploaderID" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $eq: [
                    { $toString: "$_id" },
                    "$$uploaderId"
                  ] 
                }
              }
            },
            {
              $project: {
                Name: 1,
                ProfilePic: 1
              }
            }
          ],
          as: "uploaderData"
        }
      },
      { $unwind: { path: "$uploaderData", preserveNullAndEmptyArrays: true } },
      
      // Add capsule and page info
      {
        $addFields: {
          capsuleId: "$CapsuleId",
          capsuleOwnerId: "$capsuleData.OwnerId",
          postOwnerId: "$PostOwnerId",
          capsuleTitle: "$capsuleData.Title",
          capsuleOwnerName: "$capsuleData.ownerName",
          capsuleOwnerEmail: "$capsuleData.ownerEmail",
          capsuleOwnerProfilePic: "$capsuleData.ownerProfilePic",
          capsuleCoverArt: "$capsuleData.CoverArt",
          capsuleMetaData: "$capsuleData.MetaData",
          capsuleLaunchSettings: "$capsuleData.LaunchSettings",
          capsuleCreatedOn: "$capsuleData.CreatedOn",
          capsuleModifiedOn: "$capsuleData.ModifiedOn",
          capsuleCreatorName: "$capsuleData.creatorName",
          capsuleCreatorProfilePic: "$capsuleData.creatorProfilePic",
          capsuleCreatorId: "$capsuleData.CreaterId",
          pageId: "$PageId",
        }
      },
      
      // Sort by upload date
      { $sort: { UploadedOn: -1, _id: -1 } },
      
      // Lookup StreamLikes with user details
      {
        $lookup: {
          from: "StreamLikes",
          let: { syncedPostId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$SocialPostId", "$$syncedPostId"] },
                    { $ne: ["$IsDeleted", true] },
                    { $ne: ["$IsDeleted", 1] }
                  ]
                }
              }
            },
            // Lookup user details for each like
            {
              $lookup: {
                from: "users",
                localField: "UserId",
                foreignField: "_id",
                as: "user"
              }
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                UserId: 1,
                CreatedOn: 1,
                UpdatedOn: 1,
                IsDeleted: 1,
                user: {
                  _id: "$user._id",
                  Name: "$user.Name",
                  UserName: "$user.UserName",
                  ProfilePic: "$user.ProfilePic",
                  Email: "$user.Email"
                }
              }
            }
          ],
          as: "likes",
        },
      },
      
      // Lookup comments with privacy filtering (SAME AS FEED PAGE)
      {
        $lookup: {
          from: "StreamComments",
          let: { 
            postId: "$_id",  // Use SyncedPost _id, not PostId (Media _id)
            capsuleId: "$capsuleId"
          },
          pipeline: [
            {
              $match: {
                $and: [
                  {
                    $expr: { 
                      $and: [
                        { $eq: [{ $toString: "$SocialPostId" }, { $toString: "$$postId" }] },
                        { $ne: ["$IsDeleted", true] },
                        { $ne: ["$IsDeleted", 1] }
                      ]
                    }
                  },
                  // Top-level comments only
                  {
                    $or: [
                      { ParentId: { $exists: false } },
                      { ParentId: null },
                      { ParentId: "" }
                    ]
                  }
                ]
              }
            },
            // Apply privacy filtering
            {
              $match: {
                $or: [
                  { PrivacySetting: "PublicWithName" },
                  { PrivacySetting: "PublicWithoutName" },
                  {
                    $and: [
                      { PrivacySetting: "InvitedFriends" },
                      { $expr: { $in: ["$$capsuleId", memberCapsuleIds] } }
                    ]
                  },
                  {
                    $and: [
                      { PrivacySetting: "OnlyForOwner" },
                      { $expr: { $eq: [{ $toString: "$UserId" }, String(loginUserId)] } }
                    ]
                  },
                  { PrivacySetting: { $exists: false } }
                ]
              }
            },
            {
              $lookup: {
                from: "users",
                let: { userId: { $toObjectId: "$UserId" } },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                  { $project: { Name: 1, ProfilePic: 1, Email: 1, UserName: 1 } }
                ],
                as: "user"
              }
            },
            {
              $lookup: {
                from: "StreamCommentLikes",
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$CommentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  }
                ],
                as: "commentLikes"
              }
            },
            // Lookup replies with privacy filtering
            {
              $lookup: {
                from: "StreamComments",
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$ParentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  },
                  // Apply same privacy filtering to replies
                  {
                    $match: {
                      $or: [
                        { PrivacySetting: "PublicWithName" },
                        { PrivacySetting: "PublicWithoutName" },
                        {
                          $and: [
                            { PrivacySetting: "InvitedFriends" },
                            { $expr: { $in: ["$$capsuleId", memberCapsuleIds] } }
                          ]
                        },
                        {
                          $and: [
                            { PrivacySetting: "OnlyForOwner" },
                            { $expr: { $eq: [{ $toString: "$UserId" }, String(loginUserId)] } }
                          ]
                        },
                        { PrivacySetting: { $exists: false } }
                      ]
                    }
                  },
                  { $sort: { CreatedOn: 1 } },
                  { $limit: 2 },
                  {
                    $lookup: {
                      from: "users",
                      let: { userId: { $toObjectId: "$UserId" } },
                      pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                        { $project: { Name: 1, ProfilePic: 1, Email: 1, UserName: 1 } }
                      ],
                      as: "user"
                    }
                  },
                  {
                    $lookup: {
                      from: "StreamCommentLikes",
                      let: { replyId: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [
                                { $eq: ["$CommentId", "$$replyId"] },
                                { $ne: ["$IsDeleted", true] },
                                { $ne: ["$IsDeleted", 1] }
                              ]
                            }
                          }
                        },
                        {
                          $lookup: {
                            from: "users",
                            localField: "LikedById",
                            foreignField: "_id",
                            as: "likedByUser"
                          }
                        },
                        { $unwind: { path: "$likedByUser", preserveNullAndEmptyArrays: true } },
                        {
                          $project: {
                            _id: 1,
                            CommentId: 1,
                            SocialPageId: 1,
                            LikedById: 1,
                            CreatedOn: 1,
                            likedByUser: {
                              _id: "$likedByUser._id",
                              Name: "$likedByUser.Name",
                              UserName: "$likedByUser.UserName",
                              ProfilePic: "$likedByUser.ProfilePic",
                              Email: "$likedByUser.Email"
                            }
                          }
                        }
                      ],
                      as: "replyLikes"
                    }
                  },
                  {
                    $addFields: {
                      replyLikes: {
                        $filter: {
                          input: "$replyLikes",
                          cond: { $ne: ["$$this", null] }
                        }
                      },
                      CommentLikeCount: { $size: "$replyLikes" },
                      likedByCurrentUser: {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: "$replyLikes",
                                cond: {
                                  $and: [
                                    { $ne: ["$$this", null] },
                                    { $eq: [{ $toString: "$$this.LikedById" }, String(loginUserId)] }
                                  ]
                                }
                              }
                            }
                          },
                          0
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      UserId: 1,
                      ParentId: 1,
                      Comment: 1,
                      CreatedOn: 1,
                      PrivacySetting: 1,
                      user: { $arrayElemAt: ["$user", 0] },
                      CommentLikeCount: 1,
                      likedByCurrentUser: { $ifNull: ["$likedByCurrentUser", false] },
                      likes: {
                        $map: {
                          input: "$replyLikes",
                          as: "like",
                          in: {
                            _id: "$$like._id",
                            CommentId: "$$like.CommentId",
                            SocialPageId: "$$like.SocialPageId",
                            LikedById: "$$like.LikedById",
                            CreatedOn: "$$like.CreatedOn",
                            likedByUser: "$$like.likedByUser"
                          }
                        }
                      }
                    }
                  }
                ],
                as: "replies"
              }
            },
            // Count total replies
            {
              $lookup: {
                from: "StreamComments",
                let: { commentId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$ParentId", "$$commentId"] },
                          { $ne: ["$IsDeleted", true] },
                          { $ne: ["$IsDeleted", 1] }
                        ]
                      }
                    }
                  },
                  { $count: "total" }
                ],
                as: "replyCountDoc"
              }
            },
            {
              $project: {
                _id: 1,
                UserId: 1,
                Comment: 1,
                PrivacySetting: 1,
                CreatedOn: 1,
                user: { $arrayElemAt: ["$user", 0] },
                CommentLikeCount: { $size: "$commentLikes" },
                replies: 1,
                replyCount: { $ifNull: [{ $arrayElemAt: ["$replyCountDoc.total", 0] }, 0] }
              }
            },
            { $sort: { CreatedOn: -1 } }
          ],
          as: "comments"
        }
      },
      
      // Calculate counts and isLikedByMe
      {
        $addFields: {
          likeCount: { $size: "$likes" },
          commentCount: { $size: "$comments" },
          // ✅ Check if current user liked this post (StreamLikes uses UserId, not LikedById)
          isLikedByMe: {
            $in: [
              String(loginUserId),
              {
                $map: {
                  input: "$likes",
                  as: "like",
                  in: { $toString: "$$like.UserId" }
                }
              }
            ]
          }
        }
      },
      
      // Final projection (exclude temporary lookup fields, keep likes/comments/interactions)
      {
        $project: {
          mediaDoc: 0,
          capsuleData: 0,
          uploaderData: 0,
          GroupTags: 0  // Remove GroupTags from response
          // ✅ likes, comments, likeCount, commentCount, isLikedByMe are automatically included
          // since we're using exclusion projection (fields not excluded are included)
        }
      }
    ];

    console.log(`⚡ Running aggregation pipeline...`);
    console.log(`📊 Pipeline params: limit=${limit}, skip=${skip}, type=${type}, selectedKeyword=${selectedKeyword}`);
    console.log(`📊 Querying capsule: ${capsuleId}, Date filter: ${loadOlderPosts ? 'past posts' : 'today\'s posts'}`);
    
    const t_agg = Date.now();
    const posts = await SyncedPost.aggregate(pipeline).allowDiskUse(true);
    console.log(`✅ Aggregation complete: ${posts.length} posts [${Date.now() - t_agg}ms]`);
    console.log(`📊 Expected limit: ${limit}, Actual posts returned: ${posts.length}`);
    
    if (posts.length === 0) {
      console.warn(`⚠️ WARNING: No posts returned from aggregation!`);
    } else if (posts.length < limit && posts.length > 0) {
      console.log(`ℹ️ INFO: Returned ${posts.length} posts (less than limit of ${limit})`);
    }

    // Clean up posts and add audio file data
    const cleanedPosts = await Promise.all(posts.map(async (post) => {
      const hexcode_blendedImage = post.hexcode_blendedImage_temp || post.hexcode_blendedImage;
      
      if (hexcode_blendedImage) {
        post.hexcode_blendedImage = hexcode_blendedImage;
      }
      
      if (post.BlendSettings && post.BlendSettings.allBlendConfigurations) {
        const { allBlendConfigurations, ...cleanedBlendSettings } = post.BlendSettings;
        post.BlendSettings = cleanedBlendSettings;
      }
      
      // ✅ Check for audio file using PostId ONLY (from SyncedPost.PostId which references Media._id)
      // Audio files are named after the original Media document's _id, not SyncedPost's _id
      if (post.PostId) {
        const audioData = await getPostAudioFileData(post.PostId);
        if (audioData) {
          post.audioFile = audioData;
        } else {
          post.audioFile = null;
        }
      } else {
        post.audioFile = null;
      }
      
      return post;
    }));

    const responseHasOlderPosts = loadOlderPosts
      ? (skip + cleanedPosts.length) < totalCount
      : hasOlderPostsAvailable;

    const totalTime = Date.now() - startTime;
    console.log(`✅ Total time: ${totalTime}ms`);
    console.log(`📤 Sending response: ${cleanedPosts.length} posts, totalCount: ${totalCount}`);
    console.log(`📤 Response details: skip=${skip}, limit=${limit}, hasMore=${skip + limit < totalCount}, hasOlderPosts=${responseHasOlderPosts}`);

    res.json({
      code: '200',
      msg: "Success",
      response: cleanedPosts,
      count: totalCount,
      hasOlderPosts: responseHasOlderPosts,
      pagination: {
        skip: skip,
        limit: limit,
        hasMore: skip + limit < totalCount,
      },
      filters: {
        type: type,
        selectedKeyword: selectedKeyword,
      },
    });
  } catch (error) {
    console.error('❌ Error in getStreamPostsOptimized:', error);
    res.json({
      code: '500',
      msg: "Error fetching stream posts",
      error: error.message,
      response: [],
    });
  }
};

/*________________________________________________________________________
   * @Date:      		2025-01-07
   * @Method :   		getCapsuleDetails
   * @Purpose:   		Get single capsule details with populated creator info
   * @Param:     		capsuleId
   * @Return:    	 	Capsule with CreaterId and OwnerId populated
   * @Access Category:	"Capsule Details"
_________________________________________________________________________
*/
var getCapsuleDetails = async function (req, res) {
  try {
    const capsuleId = req.body.capsuleId || req.params.id;
    
    if (!capsuleId) {
      return res.json({
        code: '400',
        message: 'capsuleId is required',
        data: null
      });
    }

    const User = require('./../models/userModel.js');
    const Admin = require('./../models/adminModel.js');
    const SubAdmin = require('./../models/subAdminModel.js');

    // Find the capsule
    let capsule = await Capsule.findById(capsuleId).exec();
    
    if (!capsule) {
      return res.json({
        code: '404',
        message: 'Capsule not found',
        data: null
      });
    }

    // Convert to plain object
    capsule = capsule.toObject();

    // Populate CreaterId with user details
    if (capsule.CreaterId) {
      try {
        const user = await User.findById(capsule.CreaterId)
          .select('Name ProfilePic Email UserName')
          .exec();
        
        if (user) {
          capsule.CreaterId = {
            _id: user._id,
            Name: user.Name || 'Unknown User',
            ProfilePic: user.ProfilePic || '/assets/users/default.png',
            Email: user.Email,
            UserName: user.UserName
          };
        } else {
          const admin = await Admin.findById(capsule.CreaterId)
            .select('name ProfilePic email')
            .exec();
          
          if (admin) {
            capsule.CreaterId = {
              _id: admin._id,
              Name: admin.name || 'Unknown Admin',
              ProfilePic: admin.ProfilePic || '/assets/users/default.png',
              Email: admin.email
            };
          } else {
            // Try SubAdmin
            const subAdmin = await SubAdmin.findById(capsule.CreaterId)
              .select('name ProfilePic email')
              .exec();
            
            if (subAdmin) {
              capsule.CreaterId = {
                _id: subAdmin._id,
                Name: subAdmin.name || 'Unknown SubAdmin',
                ProfilePic: subAdmin.ProfilePic || '/assets/users/default.png',
                Email: subAdmin.email
              };
            } else {
              // Set default values if not found in any collection
              capsule.CreaterId = {
                _id: capsule.CreaterId,
                Name: 'Unknown User',
                ProfilePic: '/assets/users/default.png'
              };
            }
          }
        }
      } catch (error) {
        console.error('Error populating CreaterId:', error);
        // Set default values on error
        capsule.CreaterId = {
          _id: capsule.CreaterId,
          Name: 'Unknown User',
          ProfilePic: '/assets/users/default.png'
        };
      }
    }

    // Populate OwnerId with user details
    if (capsule.OwnerId) {
      try {
        const owner = await User.findById(capsule.OwnerId)
          .select('Name ProfilePic Email UserName')
          .exec();
        
        if (owner) {
          capsule.OwnerId = {
            _id: owner._id,
            Name: owner.Name,
            ProfilePic: owner.ProfilePic,
            Email: owner.Email,
            UserName: owner.UserName
          };
        }
      } catch (error) {
        console.error('Error populating OwnerId:', error);
      }
    }

    res.json({
      code: '200',
      message: 'Success',
      data: capsule
    });
  } catch (error) {
    console.error('Error in getCapsuleDetails:', error);
    res.json({
      code: '500',
      message: 'Error fetching capsule details',
      error: error.message,
      data: null
    });
  }
};

// Export the new stream settings functions
exports.updateCartForMonth_ActiveCapsule = updateCartForMonth_ActiveCapsule;
exports.updateCartForFrequency_ActiveCapsule = updateCartForFrequency_ActiveCapsule;
exports.toggleStream = toggleStream;
exports.checkPostStreams = checkPostStreams;
exports.unsubscribe_changeSettings = unsubscribe_changeSettings;
exports.getStreamPostsOptimized = getStreamPostsOptimized;
exports.getCapsuleDetails = getCapsuleDetails;
// Export the generic audio file helper function
exports.getPostAudioFileData = getPostAudioFileData;


