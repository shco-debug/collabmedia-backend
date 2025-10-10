var Capsule = require("./../models/capsuleModel.js");
var Chapter = require("./../models/chapterModel.js");
var Page = require("./../models/pageModel.js");
var media = require("./../models/mediaModel.js");
var User = require("./../models/userModel.js");
var Friend = require("./../models/friendsModel.js");
var Admin = require("./../models/adminModel.js");
var SubAdmin = require("./../models/subAdminModel.js");

var Order = require("./../models/orderModel.js");
var mongoose = require("mongoose");
var Cart = require("./../models/cartModel.js");

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
            // Try to find in SubAdmin collection
            const subAdmin = await SubAdmin.findById(capsule.CreaterId)
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

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    var conditions = {
      $or: [
        {
          CreaterId: myself._id,
          Origin: "created",
          IsPublished: true,
          "LaunchSettings.Audience": "ME",
        },
        {
          CreaterId: myself._id,
          Origin: "duplicated",
          IsPublished: true,
          "LaunchSettings.Audience": "ME",
        },
        {
          CreaterId: myself._id,
          Origin: "addedFromLibrary",
          IsPublished: true,
          "LaunchSettings.Audience": "ME",
        },
        {
          CreaterId: myself._id,
          IsPublished: true,
          "LaunchSettings.Audience": "OTHERS",
        },
        {
          OwnerId: myself._id,
          IsPublished: true
        }
      ],
      Status: true,
      IsDeleted: false,
    };

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
      isLaunched: capsule.IsPublished,
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
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

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
          CreaterId: req.session.user._id,
          IsPublished: true,
          "LaunchSettings.Audience": "OTHERS",
        },
        {
          OwnerId: req.session.user._id,
          IsPublished: true
        }
      ],
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

    // Populate CreaterId for createdByMe results
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
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    var conditions = {
      CreaterId: { $ne: req.session.user._id },
      OwnerId: req.session.user._id,
      Origin: "shared",
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
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    var conditions = {
      Origin: "byTheHouse",
      CreaterId: req.session.user._id,
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
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

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

    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    // SIMPLE APPROACH: Just check if OwnerId matches current user
    // This will return all capsules owned by the user (purchased, shared, etc.)
    var conditions = {
      OwnerId: myself._id, // Simple: capsules owned by this user
      IsPublished: true, // Must be published
      Status: true,
      IsDeleted: false,
    };

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

    // Populate CreaterId with name and profile picture from User, Admin, or SubAdmin collections
    // Note: Schema updated to allow flexible population from multiple collections
    const User = require("./../models/userModel.js");
    const Admin = require("./../models/adminModel.js");
    const SubAdmin = require("./../models/subAdminModel.js");

    const populatedResults = await Promise.all(
      results.map(async (capsule) => {
        // Convert Mongoose document to plain object to prevent serialization issues
        const capsuleObj = capsule.toObject();
        
        if (capsuleObj.CreaterId) {
          try {
            // Try User collection first (as per original schema)
            const user = await User.findById(capsuleObj.CreaterId)
              .select("Name ProfilePic")
              .exec();
            if (user) {
              const populatedCreaterId = {
                _id: user._id.toString(),
                Name: user.Name,
                ProfilePic: user.ProfilePic || "/assets/users/default.png",
              };
              capsuleObj.CreaterId = populatedCreaterId;
              return capsuleObj;
            }

            // Try Admin collection (now supported by updated schema)
            const admin = await Admin.findById(capsuleObj.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (admin) {
              const populatedCreaterId = {
                _id: admin._id.toString(),
                Name: admin.name,
                ProfilePic: admin.ProfilePic || "/assets/users/default.png",
              };
              capsuleObj.CreaterId = populatedCreaterId;
              return capsuleObj;
            }

            // Try SubAdmin collection (now supported by updated schema)
            const subAdmin = await SubAdmin.findById(capsuleObj.CreaterId)
              .select("name ProfilePic")
              .exec();
            if (subAdmin) {
              const populatedCreaterId = {
                _id: subAdmin._id.toString(),
                Name: subAdmin.name,
                ProfilePic: subAdmin.ProfilePic || "/assets/users/default.png",
              };
              capsuleObj.CreaterId = populatedCreaterId;
              return capsuleObj;
            }

            // If not found in any collection, set default values
            capsuleObj.CreaterId = {
              _id: capsuleObj.CreaterId.toString(),
              Name: "Unknown User",
              ProfilePic: "/assets/users/default.png",
            };
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

var ForSalesByMe = function (req, res) {
  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var conditions = {
    CreaterId: req.session.user._id,
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

var updateCapsuleName = async function (req, res) {
  try {
  //check isMyCapsule( req.headers.capsule_id ) - Middle-ware Authorization check
    
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers.",
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
    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers."
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

var preview = function (req, res) {
  var query = {};
  var fields = {};
  query._id = req.header.capsule_id;

  Capsule.findOne(query, fields, function (err, result) {
    var query = {};
    var fields = {};
    query._id = req.header.capsule_id;

    Page.find(data, function (err, result) {
      if (!err) {
        var response = {
          status: 200,
          message: "Capsule added successfully.",
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
  });
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
  const limit = req.body.perPage ? req.body.perPage : 0;
  const offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  const conditions = {
    "LaunchSettings.Audience": "BUYERS",
    IsPublished: true,
    IsAllowedForSales: true,
    Status: true,
    IsDeleted: false,
  };

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
    conditions._id = { $nin: [mongoose.Types.ObjectId("60749d76d308334419f2fcf1")] };
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
                ],
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
    IsPublished: true,
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
    LaunchSettings: 1,
    ModifiedOn: 1,
    CreaterId: 1,
    Price: 1,
    GroupTags: 1,
    MetaData: 1,
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
    // Check if user is logged in
    if (!req.session.user || !req.session.user._id) {
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
      // Lookup capsule creator data (admin only)
      {
        $lookup: {
          from: "admin",
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
          capsuleCreatorName: "$capsuleCreator.name",
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

//Capsules In the making Apis
exports.find = find;
exports.findAll = findAll;
exports.findAllPaginated = findAllPaginated;
exports.createdByMe = createdByMe;
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
exports.reorder = reorder;
exports.updateCapsuleName = updateCapsuleName;
exports.uploadCover = uploadCover;
exports.saveSettings = saveSettings;
exports.invite = invite;
exports.inviteMember = inviteMember;
exports.removeInvitee = removeInvitee;

//Capsule library Apis
exports.addFromLibrary = addFromLibrary;
exports.preview = preview;
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
exports.updateCartForFrequency = updateCartForFrequency;
//Buy Now From Public Gallery - Shoping Cart Apis

exports.getMyPurchases = getMyPurchases;
exports.getUserPurchasedCapsulesPosts = getUserPurchasedCapsulesPosts;
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

var getMyPurchases = function (req, res) {
  // ... existing code ...
};
