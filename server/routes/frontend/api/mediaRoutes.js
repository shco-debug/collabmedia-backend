var media = require("../../../controllers/mediaController.js");
var videoAudio = require("../../../controllers/videoAudioController.js");
var mediaActionLogs = require("../../../controllers/mediaActionLogsController.js");
var mediaSearchEngine = require("../../../controllers/mediaSearchEngineController.js");
var mediaCopyrightClaims = require("../../../controllers/mediaCopyrightClaimsController.js");
var flagAsInAppropriate = require("../../../controllers/flagAsInAppropriateController.js");
var Journal = require("../../../controllers/journalController.js");
var CronJobsModule = require("../../../cron-jobs/cronJobsController.js");

var mediaSearchEngine__MP = require("../../../controllers/MediaSearchApisController.js");
var MediaSearchApisV2 = require("../../../controllers/MediaSearchApisV2Controller.js");
//var mediaSearchEngine__MP = require('../../../controllers/mediaSearchEngineController.js');
var board = require("../../../controllers/boardController.js");
var ACL = require("../../../middlewares/capsuleMiddlewares.js");

module.exports = function (router) {
  router.get("/updatePostCountsPerGt_API", function (req, res) {
    CronJobsModule.updatePostCountsPerGt_API(req, res);
  });
  router.get("/updateMediaCountsPerGt_API", function (req, res) {
    CronJobsModule.updateMediaCountsPerGt_API(req, res);
  });
  //test cron api
  router.get("/InvitationEngineCron__API", function (req, res) {
    CronJobsModule.InvitationEngineCron__API(req, res);
  });

  router.get("/WishHappyBirthdayCron__API", function (req, res) {
    CronJobsModule.WishHappyBirthdayCron__API(req, res);
  });

  router.get("/SynedPostEmailCronApi", function (req, res) {
    CronJobsModule.SynedPostEmailCronApi(req, res);
  });

  router.post("/mediaActionLogs", function (req, res) {
    mediaActionLogs.addMediaAction(req, res);
  });

  // Upload montage images
  router.post("/updateMontage", function (req, res) {
    media.updateMontage(req, res);
    //mediaActionLogs.addMediaAction(req,res)
  });

  router.post("/addThumbUsingCutyCapt", function (req, res) {
    media.addThumbUsingCutyCapt(req, res);
  });

  router.post("/searchEngine", function (req, res) {
    req.body.searchBy = req.body.searchBy ? req.body.searchBy : false;
    if (req.body.searchBy == "Descriptor") {
      mediaSearchEngine.search_by_descriptor(req, res);
    } else {
      req.body.keywordsSelcted = req.body.keywordsSelcted
        ? req.body.keywordsSelcted
        : false;
      if (req.body.keywordsSelcted) {
        mediaSearchEngine.search_v_8_temp(req, res);
      } else {
        //default case
        //mediaSearchEngine.search_v_8(req,res);

        //mediaSearchEngine__MP.search_v_8(req,res);
        MediaSearchApisV2.getSearchGalleryMedias(req, res);

        //Journal.searchMedia(req, res);
      }
    }
    //mediaSearchEngine.search_v_9(req,res)	//added on 06022015 with multi case:weight - In testing
  });

  router.post("/showMoreMedia", function (req, res) {
    //mediaSearchEngine.showMoreMedia(req,res);

    //mediaSearchEngine__MP.showMoreMedia(req,res);
    MediaSearchApisV2.showMoreMedia(req, res);

    //Journal.searchMedia(req, res);
  });

  /*
   * New endpoint for the updated search_v_8_revised_4 function
   * Features:
   * - Advanced keyword expansion with family sets
   * - Async/await support
   * - Better FSG scoring
   * - Unsplash image filtering
   * - Creates UserMedia_{userId} collections
   *
   * Payload:
   * {
   *   "groupTagID": "507f1f77bcf86cd799439011",
   *   "userFSGs": {"Gender": "Male", "Age": "20-30", ...},
   *   "selectedKeywords": ["id1", "id2"],
   *   "selectedWords": ["cat", "animal"],
   *   "page": 1,
   *   "per_page": 48,
   *   "powerUserCase": 1
   * }
   */
  router.post("/searchEngine_v8", function (req, res) {
    MediaSearchApisV2.search_v_8(req, res);
  });

  // Alternative endpoint for advanced search with keyword expansion
  router.post("/searchEngine_advanced", function (req, res) {
    MediaSearchApisV2.search_v_8(req, res);
  });

  router.post("/addTagsToUploadedMedia", function (req, res) {
    media.addTagsToUploadedMedia(req, res);
  });

  router.post("/addViews", function (req, res) {
    media.viewMedia(req, res);
  });

  router.get("/test_userscore", function (req, res) {
    mediaActionLogs.test_userscore(req, res);
  });

  router.post("/actions", function (req, res) {
    mediaActionLogs.logMediaAction(req, res);
  });

  router.post("/uploadLink", function (req, res) {
    media.uploadLink(req, res);
  });

  //added on 14012015 by manishp : Test api :
  router.get("/generate_thumbnail", function (req, res) {
    media.GenerateThumbnail(req, res);
  });

  //testing
  router.get("/test_sorting", function (req, res) {
    mediaSearchEngine.test_sorting(req, res);
  });

  router.get("/view", function (req, res) {
    res.render("layouts/frontend/openMediaLayout.html");
    //media.getMedia(req,res);
    //media.view_media(req , res);
  });

  //by parul for descriptor auto complete
  router.get("/descriptor", function (req, res) {
    media.get_descriptor(req, res);
  });
  // end

  router.post("/getMediaDetail", function (req, res) {
    media.view_media(req, res);
  });

  //video upload route parul 17 march 2015
  router.post("/videoUpload", function (req, res) {
    videoAudio.videoUpload(req, res);
  });

  //audio upload route parul 17 march 2015
  router.post("/audioUpload", function (req, res) {
    videoAudio.audioUpload(req, res);
  });

  // parul 03-04-2015
  router.post("/viewMedia", function (req, res) {
    media.viewMediaAdmin(req, res);
  });
  // end

  // parul 08-04-2015
  router.post("/getBoardMedia", function (req, res) {
    media.getBoardMedia(req, res);
  });
  // end

  // parul 14-04-2015
  router.post("/makePublic", function (req, res) {
    media.makePublic(req, res);
  });
  // end

  //test api - Identifying faulty images
  router.get("/get_faulty_images", function (req, res) {
    media.get_faulty_images(req, res);
  });

  // parul 20-04-2015
  router.post("/froala_file", function (req, res) {
    media.froala_file(req, res);
  });
  // end
  router.post("/note_screenshot", function (req, res) {
    media.note_screenshot(req, res);
  });
  // end

  // for selected media
  router.post("/findSelectedMedia", function (req, res) {
    media.findSelectedMedia(req, res);
  });
  // For pagination in tailor media gallery by arun sahani 26052016
  router.post("/searchByPage", function (req, res) {
    media.searchByPage(req, res);
  });

  //test api - creating 575X360 resized version of media
  router.get("/createResizedVersion", function (req, res) {
    media.createResizedVersion(req, res);
  });

  router.post("/getComments", function (req, res) {
    mediaActionLogs.getComments(req, res);
  });

  router.post("/deleteComment", function (req, res) {
    mediaActionLogs.deleteComment(req, res);
  });

  //Doctor-Apis :
  router.get("/createFaultyLogs", function (req, res) {
    media.createFaultyLogs(req, res);
  });

  router.get("/getFaultyMedia", function (req, res) {
    media.getFaultyMedia(req, res);
  });

  router.get("/getDuplicatedMediaList", function (req, res) {
    media.getDuplicatedMediaList(req, res);
  });

  router.get("/deleteDuplicatedMediaList", function (req, res) {
    media.deleteDuplicatedMediaList(req, res);
  });
  //End Doctor-Apis

  // To Save DMCA Copyright Details
  router.post("/saveCopyrightDetails", function (req, res) {
    //console.log("****************** Inside saveCopyrightDetails Routes ***********************")
    mediaCopyrightClaims.saveCopyrightDetails(req, res);
  });

  // To Mark Flag as inappropriate Details
  router.post("/markFlagAsInappropriate", function (req, res) {
    //console.log("**************markflagAsInAppropriate route inside*************")
    flagAsInAppropriate.markFlagAsInappropriate(req, res);
  });

  // To UnMark Flag as inappropriate Details
  router.post("/unmarkFlagAsInappropriate", function (req, res) {
    //console.log("**************unmarkFlagAsInappropriate route inside*************")
    flagAsInAppropriate.unmarkFlagAsInappropriate(req, res);
  });

  // To get Flag as inappropriate Details
  router.post("/getMediaInappropriateFlag", function (req, res) {
    //console.log("**************getMediaInappropriateFlag route inside*************")
    flagAsInAppropriate.getMediaInappropriateFlag(req, res);
  });

  /** 20Jan2k17 Changes Start**/
  router.post("/saveCommentLike", function (req, res) {
    //console.log(" - - - - - INside saveCommentLikes Routes - - - - - ");
    mediaActionLogs.saveCommentLike(req, res);
  });

  router.post("/removeCommentLike", function (req, res) {
    //console.log(" - - - - - INside saveCommentLikes Routes - - - - - ");
    mediaActionLogs.removeCommentLike(req, res);
  });

  /** 20Jan2k17 Changes End**/

  //THIS PLACE IS RESERVE FOR MEDIA MASS APIS-----------------------------------------------------------

  router.get("/mapAllKeywords_massapi", function (req, res) {
    //console.log(" - - - - - INside mapAllKeywords_massapi Routes - - - - - ");
    media.mapAllKeywords_massapi(req, res);
  });

  router.get("/updateRandomSortIdPerMedia_API", function (req, res) {
    if (req.session.admin) {
      //console.log(" - - - - - INside updateRandomSortIdPerMedia_API Routes - - - - - ");
      CronJobsModule.updateRandomSortIdPerMedia_API(req, res);
    } else {
      res.json({ code: 401, message: "Unauthorized Access!" });
    }
  });

  router.post("/getAllComments", function (req, res) {
    mediaActionLogs.getAllComments(req, res);
  });

  router.post("/getAllVotes", function (req, res) {
    mediaActionLogs.getAllVotes(req, res);
  });

  router.post("/getMyLikes", function (req, res) {
    mediaActionLogs.getMyLikes(req, res);
  });

  router.post("/getPostsWithInteractions", function (req, res) {
    mediaActionLogs.getPostsWithInteractions(req, res);
  });

  router.post("/editorPickUpdatePost", function (req, res) {
    board.editorPickUpdatePost(req, res);
  });
  //MEDIA MASS APIS-----------------------------------------------------------

  //test apis --- temp purpose - just to send data  --- NOT in use in application
  router.get("/getUnsplashImages__API", function (req, res) {
    media.getUnsplashImages__API(req, res);
  });

  //temp purpose - just to send data

  router.get("/syncGdMjImage_INTERNAL_API", async (req, res) => {
    const fileId = req.query.fileId || "";
    const fileName = req.query.fileName || "";
    const postId = req.query.postId || "";
    const prompt = req.query.prompt || "";
    const lightness = req.query.lightness || 0;
    const title = req.query.title || "";
    const photographer = req.query.photographer || "";
    const source = req.query.source || "";

    const file = await media.syncGdMjImage_INTERNAL_API(
      fileId,
      fileName,
      postId,
      prompt,
      lightness,
      title,
      photographer,
      source
    );
    res.status(200).json({ code: 200, file: file });
  });

  router.post("/addMjImageToMedia__INTERNAL_API", function (req, res) {
    media.addMjImageToMedia__INTERNAL_API(req, res);
  });

  router.post("/addUnsplashImageToMedia__INTERNAL_API", function (req, res) {
    media.addUnsplashImageToMedia__INTERNAL_API(req, res);
  });

  router.post("/syncGdTwoMjImage_INTERNAL_API", async (req, res) => {
    req.body = req.body || {
      PostId: null,
      inputArr: [
        {
          fileName: null,
          fileId: null,
          prompt: "",
          lightness: 0,
          title: "",
          photographer: "",
          source: "",
        },
        {
          fileName: null,
          fileId: null,
          prompt: "",
          lightness: 0,
          title: "",
          photographer: "",
          source: "",
        },
      ],
    };
    media.syncGdTwoMjImage_INTERNAL_API(req, res);
  });

  router.get("/fixUploadedImages_BROWSER_API", async (req, res) => {
    media.fixUploadedImages_BROWSER_API(req, res);
  });
};
