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

  // Test email endpoint for debugging email issues in production
  router.get("/testEmail", function (req, res) {
    const testEmail = require("../../../controllers/testEmail.js");
    testEmail(req, res);
  });

  router.get("/processSubscriptionRenewalsApi", function (req, res) {
    CronJobsModule.processSubscriptionRenewalsApi(req, res);
  });

  router.get("/expireDueSubscriptionsApi", function (req, res) {
    CronJobsModule.expireDueSubscriptionsApi(req, res);
  });

  // 🧪 TEST ENDPOINT: Create a test SyncedPost for delivery testing
  router.get("/createTestSyncedPost", function (req, res) {
    CronJobsModule.createTestSyncedPost(req, res);
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

  router.post("/backfillMediaTagsForGroup", function (req, res) {
    media.backfillMediaTagsForGroup(req, res);
  });

  router.post("/assignGroupTagsFromPrompt", function (req, res) {
    media.assignGroupTagsFromPrompt(req, res);
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

  // Verify card by charging $1.00 and immediately refunding it
  router.post("/verifyCard", async (req, res) => {
    try {
      if (!process.STRIPE_CONFIG) {
        return res.status(500).json({
          code: 500,
          message: 'Stripe configuration not loaded'
        });
      }
      
      // Detect environment and use appropriate Stripe key
      const isProduction = process.env.NODE_ENV === 'production';
      let stripeKey;
      
      if (isProduction) {
        if (!process.STRIPE_CONFIG.LIVE || !process.STRIPE_CONFIG.LIVE.secret_key) {
          return res.status(500).json({
            code: 500,
            message: 'Stripe LIVE configuration missing'
          });
        }
        stripeKey = process.STRIPE_CONFIG.LIVE.secret_key;
      } else {
        if (!process.STRIPE_CONFIG.DEV || !process.STRIPE_CONFIG.DEV.secret_key) {
          return res.status(500).json({
            code: 500,
            message: 'Stripe DEV configuration missing'
          });
        }
        stripeKey = process.STRIPE_CONFIG.DEV.secret_key;
      }
      
      const stripe = require("stripe")(stripeKey);
      const { token, email } = req.body;
      
      if (!token) {
        return res.status(400).json({
          code: 400,
          message: 'Token is required'
        });
      }
      
      if (!email) {
        return res.status(400).json({
          code: 400,
          message: 'Email is required'
        });
      }
      
      // Step 1: Create Stripe customer
      const customer = await stripe.customers.create({
        email: email,
        source: token
      });
      
      // Step 2: Charge $1.00 to verify card
      const charge = await stripe.charges.create({
        amount: 100, // $1.00 in cents
        currency: 'usd',
        customer: customer.id,
        description: 'Card verification - will be refunded immediately'
      });
      
      // Step 3: Immediately refund the $1.00
      const refund = await stripe.refunds.create({
        charge: charge.id
      });
      
      res.json({
        code: 200,
        message: 'Card verified successfully. $1.00 charged and immediately refunded.',
        cardVerified: true,
        verification: {
          chargeId: charge.id,
          refundId: refund.id,
          cardLast4: charge.payment_method_details?.card?.last4 || 'N/A',
          cardBrand: charge.payment_method_details?.card?.brand || 'N/A',
          customerId: customer.id,
          status: 'verified_and_refunded'
        }
      });
      
    } catch (err) {
      res.status(500).json({
        code: 500,
        message: 'Card verification failed',
        error: err.message,
        cardVerified: false
      });
    }
  });

  // Refund a payment (full or partial)
  router.post("/refundPayment__TEST_API", async (req, res) => {
    try {
      if (!process.STRIPE_CONFIG || !process.STRIPE_CONFIG.DEV || !process.STRIPE_CONFIG.DEV.secret_key) {
        return res.status(500).json({
          code: 500,
          message: 'Stripe configuration not loaded'
        });
      }
      
      const stripe = require("stripe")(process.STRIPE_CONFIG.DEV.secret_key);
      const { chargeId, amount, reason = 'requested_by_customer' } = req.body;
      
      if (!chargeId) {
        return res.status(400).json({
          code: 400,
          message: 'chargeId is required. Get this from the payment response or Stripe dashboard.'
        });
      }
      
      // Create refund
      const refundData = { charge: chargeId };
      if (amount) {
        refundData.amount = amount; // Partial refund (in cents)
      }
      if (reason) {
        refundData.reason = reason; // 'duplicate', 'fraudulent', 'requested_by_customer'
      }
      
      const refund = await stripe.refunds.create(refundData);
      
      // Get charge details
      const charge = await stripe.charges.retrieve(chargeId);
      
      res.json({
        code: 200,
        message: amount ? `Partial refund of $${amount/100} processed` : 'Full refund processed',
        refund: {
          id: refund.id,
          amount: refund.amount / 100, // Convert cents to dollars
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason
        },
        charge: {
          id: charge.id,
          originalAmount: charge.amount / 100,
          amountRefunded: charge.amount_refunded / 100,
          fullyRefunded: charge.refunded
        }
      });
      
    } catch (err) {
      res.status(500).json({
        code: 500,
        message: 'Refund failed',
        error: err.message,
        details: err.type
      });
    }
  });

  // Test endpoint to generate Stripe tokens for different test scenarios
  router.post("/generateStripeTestToken__TEST_API", async (req, res) => {
    try {
      // Verify Stripe config is loaded
      if (!process.STRIPE_CONFIG || !process.STRIPE_CONFIG.DEV || !process.STRIPE_CONFIG.DEV.secret_key) {
        return res.status(500).json({
          code: 500,
          message: 'Stripe configuration not loaded. Please restart the server.',
          debug: {
            hasConfig: !!process.STRIPE_CONFIG,
            hasDev: !!process.STRIPE_CONFIG?.DEV,
            hasKey: !!process.STRIPE_CONFIG?.DEV?.secret_key
          }
        });
      }
      
      const stripe = require("stripe")(process.STRIPE_CONFIG.DEV.secret_key);
      
      const { cardType = 'success' } = req.body;
      
      const testCards = {
        success: { number: '4242424242424242', desc: 'Successful payment' },
        decline: { number: '4000000000000002', desc: 'Card declined' },
        insufficient: { number: '4000000000009995', desc: 'Insufficient funds' },
        expired: { number: '4000000000000069', desc: 'Expired card' },
        processing_error: { number: '4000000000000119', desc: 'Processing error' },
        incorrect_cvc: { number: '4000000000000127', desc: 'Incorrect CVC' },
        '3d_secure': { number: '4000002500003155', desc: 'Requires 3D Secure' },
      };
      
      const card = testCards[cardType] || testCards.success;
      
      const tokenObj = await stripe.tokens.create({
        card: {
          number: card.number,
          exp_month: 12,
          exp_year: 2030,
          cvc: '123'
        }
      });
      
      res.json({
        code: 200,
        message: `Test token generated: ${card.desc}`,
        token: tokenObj.id,
        cardType: cardType,
        testCard: card.number,
        usage: `Use this token in buyNow API: { "token": "${tokenObj.id}" }`
      });
      
    } catch (err) {
      res.status(500).json({
        code: 500,
        message: 'Failed to generate test token',
        error: err.message
      });
    }
  });
};
