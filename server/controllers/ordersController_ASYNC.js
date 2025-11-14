var Capsule = require("./../models/capsuleModel.js");
var Chapter = require("./../models/chapterModel.js");
var Page = require("./../models/pageModel.js");
var PageStream = require("./../models/pageStreamModel.js");
var User = require("./../models/userModel.js");
var Referral = require("./../models/referralModel.js");
var Cart = require("./../models/cartModel.js");
var Order = require("./../models/orderModel.js");

// Import modern capsule instance creation function
const { createCapsuleInstance } = require("./capsuleInstanceManager_ABSOLUTE_FINAL.js");

var Transaction = require("./../models/transectionHistoryModel.js");

// Lazy-load Stripe to ensure process.STRIPE_CONFIG is available
let stripe = null;
function getStripe() {
	if (!stripe) {
		if (!process.STRIPE_CONFIG) {
			throw new Error('Stripe configuration not loaded. process.STRIPE_CONFIG is missing.');
		}
		
		// Detect environment and use appropriate Stripe key
		const isProduction = process.env.NODE_ENV === 'production';
		
		if (isProduction) {
			// PRODUCTION MODE - Use LIVE Stripe key
			if (!process.STRIPE_CONFIG.LIVE || !process.STRIPE_CONFIG.LIVE.secret_key) {
				throw new Error('Stripe LIVE configuration missing. Cannot process live payments.');
			}
			console.log('🔴 Using Stripe LIVE mode');
			stripe = require("stripe")(process.STRIPE_CONFIG.LIVE.secret_key);
		} else {
			// DEVELOPMENT/TEST MODE - Use DEV Stripe key
			if (!process.STRIPE_CONFIG.DEV || !process.STRIPE_CONFIG.DEV.secret_key) {
				throw new Error('Stripe DEV configuration missing. Cannot process test payments.');
			}
			console.log('🟢 Using Stripe TEST mode');
			stripe = require("stripe")(process.STRIPE_CONFIG.DEV.secret_key);
		}
	}
	return stripe;
}

var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

var fs = require("fs");
var formidable = require("formidable");

var mediaController = require("./../controllers/mediaController.js");
var EmailTemplate = require("./../models/emailTemplateModel.js");
var AppSetting = require("./../models/appSettingModel.js");

// Import journal controller functions for direct calls (no HTTP)
var journalController = require("./journalControllerV2.js");

var async_lib = require("async");

var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
//var Page = require('./../models/pageModel.js');

var fsextra = require("fs-extra");
// replace-in-file - dynamic import to avoid ESM issues on Vercel
let replaceInFile = null;
const axios = require("axios");
var SyncedPost = require("./../models/syncedpostModel.js");
var SyncedPostsMap = require("./../models/SyncedpostsMap.js");

/**
 * Get the maximum allowed price (10x the original price)
 * @param {number} price - Current price
 * @returns {string} - Maximum price as string with 2 decimal places
 */
const getPriceUpperLimit = (price) => {
  return (parseFloat(price) * 10).toFixed(2);
};

/**
 * Increment stream/capsule price by a specified amount in cents
 * @param {string} streamId - The stream/capsule ID
 * @param {number} price - Current price in USD
 * @param {number} cent - Amount to increment in cents
 */
const increamentStreamPrice = async (streamId, price, cent) => {
  try {
    const centToUSD = cent / 100;
    const increamentedPrice = parseFloat(price + centToUSD).toFixed(2);
    
    // Use updateOne with new MongoDB ObjectId syntax
    await Capsule.updateOne(
      { _id: new ObjectId(streamId) },
      { $set: { Price: increamentedPrice } }
    );
    
    console.log(`💰 Price updated for stream ${streamId}: $${price} → $${increamentedPrice}`);
  } catch (error) {
    console.error(`❌ Error incrementing price for stream ${streamId}:`, error);
    throw error;
  }
};

/**
 * Increment prices for all purchased capsules/streams in the order
 * @param {Array} cartItems - Array of cart items from the order
 */
const __increamentPriceOfOrderedCapsules = async (cartItems) => {
  try {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      console.log('⚠️ No cart items to process for price increment');
      return;
    }

    for (const cartItem of cartItems) {
      const capsuleId = cartItem.CapsuleId || null;
      
      if (!capsuleId) {
        console.log('⚠️ Skipping cart item - no CapsuleId');
        continue;
      }

      // Fetch current capsule price
      const capsuleObj = await Capsule.findOne(
        { _id: new ObjectId(capsuleId) },
        { Price: 1 }
      );

      if (!capsuleObj || !capsuleObj.Price) {
        console.log(`⚠️ No price found for capsule ${capsuleId}`);
        continue;
      }

      const currentPrice = parseFloat(capsuleObj.Price);
      const maxPrice = parseFloat(getPriceUpperLimit(currentPrice));
      const owners = Array.isArray(cartItem.Owners) ? cartItem.Owners : [];
      const incrementAmount = 1 * owners.length; // 1 cent per owner

      // Only increment if below max price
      if (currentPrice < maxPrice) {
        await increamentStreamPrice(capsuleId, currentPrice, incrementAmount);
      } else {
        console.log(`⚠️ Price cap reached for capsule ${capsuleId} - Max: $${maxPrice}`);
      }
    }

    console.log('✅ Successfully processed price increments for all cart items');
  } catch (error) {
    console.error('❌ Error in __increamentPriceOfOrderedCapsules:', error);
    // Don't throw - we don't want to break the order process if price increment fails
  }
};

function __getEmailEngineDataSetsForKeyPost(
  currentPostObj,
  PagePosts,
  EmailEngineDataSets,
  CapsuleData
) {
  //console.log("PagePosts.length ==--------------- ", PagePosts.length);
  var IsOnetimeStream = true;
  var IsOnlyPostImage = true; //CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

  var concatPostsArr = PagePosts;
  if (!IsOnetimeStream && EmailEngineDataSets.length > PagePosts.length) {
    var neededConcatNo = parseInt(
      EmailEngineDataSets.length / PagePosts.length
    );
    for (let i = 0; i < neededConcatNo; i++) {
      concatPostsArr = concatPostsArr.concat(PagePosts);
    }
  }

  //var loopLimit = EmailEngineDataSets.length;
  var loopLimit =
    EmailEngineDataSets.length > concatPostsArr.length
      ? concatPostsArr.length
      : EmailEngineDataSets.length;
  if (IsOnetimeStream) {
    loopLimit =
      EmailEngineDataSets.length > concatPostsArr.length
        ? concatPostsArr.length
        : EmailEngineDataSets.length;
  }

  var NewEmailEngineDataSets = [];
  var selectBlendImageCounter = -1;
  for (let i = 0; i < loopLimit; i++) {
    var postObj = concatPostsArr[i];
    postObj.SelectedBlendImages = postObj.SelectedBlendImages
      ? postObj.SelectedBlendImages
      : [];
    if (currentPostObj._id == postObj._id) {
      var emailDataSet = EmailEngineDataSets[i];
      emailDataSet.VisualUrls = [];

      if (IsOnlyPostImage) {
        var PostImage = postObj.thumbnail
          ? postObj.thumbnail
          : postObj.MediaURL;
        PostImage = PostImage ? PostImage : "";
        PostImage =
          PostImage.indexOf("unsplash") >= 0
            ? PostImage
            : "https://www.scrpt.com/assets/Media/img/300/" + PostImage;

        emailDataSet.VisualUrls[0] = PostImage;
        emailDataSet.VisualUrls[1] = PostImage;
        emailDataSet.BlendMode = "hard-light";
      } else {
        if (postObj.SelectedBlendImages.length) {
          selectBlendImageCounter++;
          const blendConfig = postObj.SelectedBlendImages[selectBlendImageCounter];
          
          if (
            postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 &&
            postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2
          ) {
            emailDataSet.VisualUrls[0] =
              postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
            emailDataSet.VisualUrls[1] =
              postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
          } else if (blendConfig.image1Url && blendConfig.image2Url) {
            // Fallback: try image1Url/image2Url format
            emailDataSet.VisualUrls[0] = blendConfig.image1Url;
            emailDataSet.VisualUrls[1] = blendConfig.image2Url;
          }

          emailDataSet.BlendMode = postObj.SelectedBlendImages[
            selectBlendImageCounter
          ].blendMode
            ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode
            : "hard-light";

          // Populate SelectedKeywords from the blend configuration
          emailDataSet.SelectedKeywords = postObj.SelectedBlendImages[
            selectBlendImageCounter
          ].Keywords
            ? postObj.SelectedBlendImages[selectBlendImageCounter].Keywords
            : [];

          if (
            selectBlendImageCounter ==
            postObj.SelectedBlendImages.length - 1
          ) {
            selectBlendImageCounter = -1;
          }
        }
      }
      NewEmailEngineDataSets.push(emailDataSet);
    }
  }

  return NewEmailEngineDataSets;
}

function __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData) {
  var EmailEngineDataSets = [];

  var frequency = CapsuleData.Frequency ? CapsuleData.Frequency : "high";
  var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : "M12";

  var afterDaysArr = process.StreamConfig[selectedMonths][frequency]
    ? process.StreamConfig[selectedMonths][frequency]
    : [];
  for (let i = 0; i < afterDaysArr.length; i++) {
    EmailEngineDataSets.push({
      TextAboveVisual: "",
      TextBelowVisual: "",
      AfterDays: afterDaysArr[i],
    });
  }

  return EmailEngineDataSets;
}

function __getEmailEngineDataSetsBasedOnMonthAndKeyPost_AllPosts(CapsuleData) {
  var EmailEngineDataSets = [];

  var selectedMonths = "M12"; //CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';

  var afterDaysArr = process.StreamConfig[selectedMonths]["KeyPost"]
    ? process.StreamConfig[selectedMonths]["KeyPost"]
    : [];
  for (let i = 0; i < afterDaysArr.length; i++) {
    EmailEngineDataSets.push({
      TextAboveVisual: "",
      TextBelowVisual: "",
      AfterDays: afterDaysArr[i],
    });
  }

  return EmailEngineDataSets;
}

function __getEmailEngineDataSetsBasedOnMonthAndFreq_AllPosts(CapsuleData) {
  var EmailEngineDataSets = [];

  var frequency = "high"; //CapsuleData.Frequency ? CapsuleData.Frequency : 'high';
  var selectedMonths = "M12"; //CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';

  var afterDaysArr = process.StreamConfig[selectedMonths][frequency]
    ? process.StreamConfig[selectedMonths][frequency]
    : [];
  for (let i = 0; i < afterDaysArr.length; i++) {
    EmailEngineDataSets.push({
      TextAboveVisual: "",
      TextBelowVisual: "",
      AfterDays: afterDaysArr[i],
    });
  }

  return EmailEngineDataSets;
}

function __getEmailEngineDataSetsFromSelectedBlendImages_NDays(
  currentPostObj,
  PagePosts,
  EmailEngineDataSets,
  CapsuleData,
  nDays
) {
  var postPerDay = nDays ? nDays : 1;
  var eeDataSets = [];
  for (let e = 0; e < EmailEngineDataSets.length; e++) {
    eeDataSets.push(EmailEngineDataSets[e]);
    for (var p = 0; p < postPerDay - 1; p++) {
      eeDataSets.push(EmailEngineDataSets[e]);
    }
  }
  EmailEngineDataSets = eeDataSets;

  console.log("PagePosts.length ==--------------- ", PagePosts.length);
  var IsOnetimeStream = CapsuleData.IsOnetimeStream
    ? CapsuleData.IsOnetimeStream
    : false;
  var IsOnlyPostImage = CapsuleData.IsOnlyPostImage
    ? CapsuleData.IsOnlyPostImage
    : false;

  var concatPostsArr = PagePosts;
  if (!IsOnetimeStream && EmailEngineDataSets.length > PagePosts.length) {
    var PagePosts_WithoutGeneralPosts = PagePosts.filter(function (obj) {
      obj.PostType = obj.PostType ? obj.PostType : "Post";
      if (obj.PostType == "Post") {
        return obj;
      }
    });
    //var PagePosts_WithoutGeneralPosts = PagePosts;
    if (PagePosts_WithoutGeneralPosts.length) {
      var neededConcatNo = parseInt(
        EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length
      );
      for (let mp = 0; mp < neededConcatNo; mp++) {
        concatPostsArr = concatPostsArr.concat(PagePosts_WithoutGeneralPosts);
      }
    }
  }

  //var loopLimit = EmailEngineDataSets.length;
  var loopLimit =
    EmailEngineDataSets.length > concatPostsArr.length
      ? concatPostsArr.length
      : EmailEngineDataSets.length;
  if (IsOnetimeStream) {
    loopLimit =
      EmailEngineDataSets.length > concatPostsArr.length
        ? concatPostsArr.length
        : EmailEngineDataSets.length;
  }

  var NewEmailEngineDataSets = [];
  var selectBlendImageCounter = -1;
  
  // 🔍 VERIFICATION: Track blend version usage for specific post
  const VERIFY_POST_ID = "68fc1008446b78142c1c9e4f";
  const versionUsageMap = new Map();
  
  for (let jt = 0; jt < loopLimit; jt++) {
    var postObj = concatPostsArr[jt];
    IsOnlyPostImage = CapsuleData.IsOnlyPostImage
      ? CapsuleData.IsOnlyPostImage
      : false;

    currentPostObj.PostType = currentPostObj.PostType
      ? currentPostObj.PostType
      : "Post";
    if (currentPostObj.PostType == "GeneralPost") {
      IsOnlyPostImage = true;
    }

    currentPostObj.SelectedBlendImages = currentPostObj.SelectedBlendImages
      ? currentPostObj.SelectedBlendImages
      : [];
    if (currentPostObj._id == postObj._id) {
      var emailDataSet = EmailEngineDataSets[jt];
      emailDataSet.VisualUrls = [];

      if (IsOnlyPostImage) {
        var PostImage = currentPostObj.thumbnail
          ? currentPostObj.thumbnail
          : currentPostObj.MediaURL;
        PostImage = PostImage ? PostImage : "";
        PostImage =
          PostImage.indexOf("unsplash") >= 0
            ? PostImage
            : "https://www.scrpt.com/assets/Media/img/300/" + PostImage;

        emailDataSet.VisualUrls[0] = PostImage;
        emailDataSet.VisualUrls[1] = PostImage;
        emailDataSet.BlendMode = "hard-light";
      } else {
        if (currentPostObj.SelectedBlendImages.length) {
          selectBlendImageCounter = selectBlendImageCounter + 1;
          const blendConfig = currentPostObj.SelectedBlendImages[selectBlendImageCounter];
          
          // 🔍 VERIFICATION: Log version usage for specific post
          if (currentPostObj._id.toString() === VERIFY_POST_ID) {
            const versionKey = `Version_${selectBlendImageCounter + 1}`;
            versionUsageMap.set(versionKey, (versionUsageMap.get(versionKey) || 0) + 1);
            console.log(`🎨 [VERIFY] Post ${VERIFY_POST_ID} - Using ${versionKey} (counter: ${selectBlendImageCounter}) - Appearance #${versionUsageMap.get(versionKey)}`);
          }
          
          if (
            currentPostObj.SelectedBlendImages[selectBlendImageCounter]
              .blendImage1 &&
            currentPostObj.SelectedBlendImages[selectBlendImageCounter]
              .blendImage2
          ) {
            emailDataSet.VisualUrls[0] =
              currentPostObj.SelectedBlendImages[
                selectBlendImageCounter
              ].blendImage1;
            emailDataSet.VisualUrls[1] =
              currentPostObj.SelectedBlendImages[
                selectBlendImageCounter
              ].blendImage2;
          } else if (blendConfig.image1Url && blendConfig.image2Url) {
            // Fallback: try image1Url/image2Url format
            emailDataSet.VisualUrls[0] = blendConfig.image1Url;
            emailDataSet.VisualUrls[1] = blendConfig.image2Url;
          }

          emailDataSet.BlendMode = currentPostObj.SelectedBlendImages[
            selectBlendImageCounter
          ].blendMode
            ? currentPostObj.SelectedBlendImages[selectBlendImageCounter]
                .blendMode
            : "hard-light";

          // Populate SelectedKeywords from the blend configuration
          emailDataSet.SelectedKeywords = currentPostObj.SelectedBlendImages[
            selectBlendImageCounter
          ].Keywords
            ? currentPostObj.SelectedBlendImages[selectBlendImageCounter].Keywords
            : [];

          if (
            selectBlendImageCounter ==
            currentPostObj.SelectedBlendImages.length - 1
          ) {
            selectBlendImageCounter = -1;
          }
        }
      }
      NewEmailEngineDataSets.push(emailDataSet);
    }
  }
  
  // 🔍 VERIFICATION: Summary of version usage
  if (versionUsageMap.size > 0) {
    console.log(`\n📊 [VERIFY] Blend Version Usage Summary for Post ${VERIFY_POST_ID}:`);
    versionUsageMap.forEach((count, version) => {
      console.log(`   ${version}: Used ${count} times`);
    });
    console.log(`   Total unique versions used: ${versionUsageMap.size}`);
    console.log(`   Expected versions: ${currentPostObj.SelectedBlendImages.length}`);
    if (versionUsageMap.size === currentPostObj.SelectedBlendImages.length) {
      console.log(`   ✅ SUCCESS: All ${versionUsageMap.size} versions are being used!\n`);
    } else {
      console.log(`   ⚠️ WARNING: Only ${versionUsageMap.size} out of ${currentPostObj.SelectedBlendImages.length} versions used!\n`);
    }
  }

  return NewEmailEngineDataSets;
}

function getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn, minusDays) {
  var d = new Date(CreatedOn);
  if (minusDays) {
    d.setDate(d.getDate() - minusDays + NoOfDays);
  } else {
    d.setDate(d.getDate() + NoOfDays);
  }
  return d;
}

function getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn) {
  var d = new Date(CreatedOn);
  d.setDate(d.getDate() - 24 + NoOfDays);
  return d;
}

async function mapPostsAsPerSettings(CapsuleData, firstTimeFlag) {
  var returnVal = false;
  try {
    var todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    var datePlusOne = new Date();
    datePlusOne.setDate(datePlusOne.getDate() + 1);
    var datePlusOneTimestamp = datePlusOne.getTime();

    var StreamId = CapsuleData._id || null;
    var Frequency = CapsuleData.Frequency || null;
    var MonthFor = CapsuleData.MonthFor || null;

    CapsuleData.LaunchSettings = CapsuleData.LaunchSettings || {};
    var __StreamTYPE = CapsuleData.LaunchSettings.StreamType
      ? CapsuleData.LaunchSettings.StreamType
      : "";

    if (!StreamId) {
      return false;
    }

    if (firstTimeFlag) {
      //1) fetch all saved SyncedPosts
      var conditions = {
        CapsuleId: new ObjectId(StreamId),
        IsDeleted: false,
      };
      var allSyncedPosts = await SyncedPost.find(conditions).sort({
        "EmailEngineDataSets.DateOfDelivery": 1,
      });
      
      console.log(`📧 First purchase - Found ${allSyncedPosts.length} SyncedPosts created by API calls`);

      //2) save SyncedPostsMap here
      var dataToSave = {
        CapsuleId: new ObjectId(StreamId),
        SyncedPosts: allSyncedPosts,
      };
      
      // 🔍 VERIFICATION: Check versions in SyncedpostsMap for specific post
      const VERIFY_POST_ID = "68fc1008446b78142c1c9e4f";
      const verifyPostEntries = allSyncedPosts.filter(post => 
        post.PostId && post.PostId.toString() === VERIFY_POST_ID
      );
      
      if (verifyPostEntries.length > 0) {
        console.log(`\n📦 [VERIFY] Saving to SyncedpostsMap - Found ${verifyPostEntries.length} entries for Post ${VERIFY_POST_ID}`);
        const uniqueVisuals = new Set();
        const blendModes = new Set();
        
        verifyPostEntries.forEach((entry, idx) => {
          const emailSet = entry.EmailEngineDataSets?.[0];
          if (emailSet && emailSet.VisualUrls && emailSet.VisualUrls.length === 2) {
            const combo = `${emailSet.VisualUrls[0]}|${emailSet.VisualUrls[1]}`;
            uniqueVisuals.add(combo);
            blendModes.add(emailSet.BlendMode || 'N/A');
            
            if (idx < 5) {
              const img1 = emailSet.VisualUrls[0].split('/').pop().substring(0, 25);
              const img2 = emailSet.VisualUrls[1].split('/').pop().substring(0, 25);
              console.log(`   Entry ${idx + 1}: AfterDays=${emailSet.AfterDays}, Mode=${emailSet.BlendMode}, Images=[${img1}..., ${img2}...]`);
            }
          }
        });
        
        console.log(`\n📦 [VERIFY] SyncedpostsMap Analysis for Post ${VERIFY_POST_ID}:`);
        console.log(`   Total entries: ${verifyPostEntries.length}`);
        console.log(`   Unique visual combinations: ${uniqueVisuals.size}`);
        console.log(`   Blend modes used: ${[...blendModes].join(', ')}`);
        
        if (uniqueVisuals.size >= 4) {
          console.log(`   ✅ SUCCESS! All 4 versions are stored in SyncedpostsMap!\n`);
        } else if (uniqueVisuals.size > 1) {
          console.log(`   ⚠️ PARTIAL: Only ${uniqueVisuals.size} out of 4 versions stored!\n`);
        } else {
          console.log(`   ❌ ERROR: Only 1 version stored - cycling failed!\n`);
        }
      }
      
      await SyncedPostsMap(dataToSave).save();

      //3) fetch SyncedPostsMap
      var allSyncedPostsMap = await SyncedPostsMap.findOne({
        CapsuleId: new ObjectId(StreamId),
        IsDeleted: false,
        //"SyncedPosts.EmailEngineDataSets.DateOfDelivery" : {$gte : todayEnd}
      });

      //4) delete old records
      var conditions = {
        CapsuleId: new ObjectId(StreamId),
        IsDeleted: false,
      };
      await SyncedPost.deleteMany(conditions);

      //5) getEmailSchedules based on frequency
      var CreatedOn = Date.now();
      var EmailEngineDataSets =
        __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData);

      //6) reMap email schedules based on email schedules and SyncedPostsMap
      allSyncedPostsMap.SyncedPosts = allSyncedPostsMap.SyncedPosts || [];
      
      for (var i = 0; i < EmailEngineDataSets.length; i++) {
        var NoOfDays = EmailEngineDataSets[i].AfterDays
          ? parseInt(EmailEngineDataSets[i].AfterDays)
          : 0;
        EmailEngineDataSets[i].DateOfDelivery =
          __StreamTYPE == "Group"
            ? getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn)
            : getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn, 5);

        if (allSyncedPostsMap.SyncedPosts[i]) {
          var tmpObj = allSyncedPostsMap.SyncedPosts[i];
          tmpObj.EmailEngineDataSets[0].AfterDays =
            EmailEngineDataSets[i].AfterDays;
          tmpObj.EmailEngineDataSets[0].DateOfDelivery =
            EmailEngineDataSets[i].DateOfDelivery;
          await SyncedPost(tmpObj).save();
        }
      }
      
      console.log(`✅ Remapped ${allSyncedPostsMap.SyncedPosts.length} SyncedPosts`);
      returnVal = true;
    } else {
      //1) fetch SyncedPostsMap
      var allSyncedPostsMap = await SyncedPostsMap.aggregate([
        {
          $match: {
            CapsuleId: new ObjectId(StreamId),
            IsDeleted: false,
            "SyncedPosts.EmailEngineDataSets.DateOfDelivery": { $gt: todayEnd },
          },
        },
        { $unwind: "$SyncedPosts" },
        {
          $match: {
            CapsuleId: new ObjectId(StreamId),
            IsDeleted: false,
            "SyncedPosts.EmailEngineDataSets.DateOfDelivery": { $gt: todayEnd },
          },
        },
        {
          $group: {
            _id: "$CapsuleId",
            SyncedPosts: {
              $push: "$$Root",
            },
          },
        },
      ]);

      //2) getEmailSchedules based on frequency
      var CreatedOn =
        __StreamTYPE === "Group" && CapsuleData.LaunchDate
          ? new Date(String(CapsuleData.LaunchDate))
          : new Date(String(CapsuleData.CreatedOn));
      var EmailEngineDataSets =
        __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData);

      //3) delete old records after currentDate
      var conditions = {
        CapsuleId: new ObjectId(StreamId),
        IsDeleted: false,
        "EmailEngineDataSets.DateOfDelivery": { $gt: todayEnd },
      };
      await SyncedPost.deleteMany(conditions);

      //4) reMap SyncedPosts based on currentDate, email schedules and SyncedPostsMap
      for (var i = 0; i < EmailEngineDataSets.length; i++) {
        var NoOfDays = EmailEngineDataSets[i].AfterDays
          ? parseInt(EmailEngineDataSets[i].AfterDays)
          : 0;
        EmailEngineDataSets[i].DateOfDelivery =
          __StreamTYPE == "Group"
            ? getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn)
            : getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn, 5);

        var t = new Date(EmailEngineDataSets[i].DateOfDelivery);
        var ty = t.getFullYear();
        var tm = t.getMonth() + 1;
        var td = t.getDate();
        var date = new Date(ty + "-" + tm + "-" + td);
        EmailEngineDataSets[i].DateOfDelivery_Timestamp = date.getTime();

        if (
          EmailEngineDataSets[i].DateOfDelivery_Timestamp >=
            datePlusOneTimestamp &&
          allSyncedPostsMap[i]
        ) {
          allSyncedPostsMap.SyncedPosts = allSyncedPostsMap.SyncedPosts || [];
          if (allSyncedPostsMap.SyncedPosts[i]) {
            var tmpObj = allSyncedPostsMap.SyncedPosts[i];
            tmpObj.EmailEngineDataSets[0].AfterDays =
              EmailEngineDataSets[i].AfterDays;
            tmpObj.EmailEngineDataSets[0].DateOfDelivery =
              EmailEngineDataSets[i].DateOfDelivery;
            await SyncedPost(tmpObj).save();
          }
        }
      }
      returnVal = true;
    }
  } catch (err) {
    console.log("Caught Error = ", err);
    returnVal = false;
  }
  return returnVal;
}

async function AreSyncedPostsAlreadyThere(StreamId) {
  var firstTimeFlag = false;
  try {
    var alreadySavedRecords = await SyncedPost.find({
      CapsuleId: new ObjectId(StreamId),
    });
    alreadySavedRecords = Array.isArray(alreadySavedRecords)
      ? alreadySavedRecords
      : [];
    firstTimeFlag = alreadySavedRecords.length > 0 ? false : true;
  } catch (err) {
    firstTimeFlag = false;
    console.log(err);
  }
  return firstTimeFlag;
}

async function __streamPagePostNow(
  PagePosts,
  PageData,
  shareWithEmail,
  req,
  CapsuleData,
  NewOwnerId = null // Optional: override PostedBy for purchased streams
) {
  console.log(`📧 Processing ${PagePosts.length} stream posts for ${shareWithEmail}`);
  if (NewOwnerId) {
    console.log(`📧 Using new owner ID for SyncedPosts: ${NewOwnerId}`);
  }

  //first check if this is the first time
  var firstTimeFlag = await AreSyncedPostsAlreadyThere(CapsuleData._id);

  //PagePosts = PagePosts.reverse();
  var PagePosts2 = PagePosts.sort((a, b) => {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return new Date(b.PostedOn) - new Date(a.PostedOn);
  });

  var PagePosts_keyposts = PagePosts2.filter((obj) => {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (obj.PostType == "KeyPost") {
      return obj;
    }
  });

  var PagePosts2 = PagePosts2.filter((obj) => {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (
      obj.PostType != "AdPost" &&
      obj.PostType != "BroadcastPost" &&
      obj.PostType != "KeyPost"
    ) {
      return obj;
    }
  });

  var EmailEngineDataSets =
    __getEmailEngineDataSetsBasedOnMonthAndFreq_AllPosts(CapsuleData);
  if (!EmailEngineDataSets.length) {
    EmailEngineDataSets = null;
  }
  PageData.EmailEngineDataSets = PageData.EmailEngineDataSets
    ? PageData.EmailEngineDataSets
    : [];
  PageData.EmailEngineDataSets = EmailEngineDataSets
    ? EmailEngineDataSets
    : PageData.EmailEngineDataSets;

  for (let loop365 = 0; loop365 < PagePosts2.length; loop365++) {
    var postObj = PagePosts2[loop365];
    
    // Check for blend images in both formats
    const blendImageCount = postObj.BlendSettings?.allBlendConfigurations?.length || 
                           postObj.SelectedBlendImages?.length || 
                           0;
    
    console.log(`\n📝 Processing Post ${loop365 + 1}/${PagePosts2.length}:`, {
      _id: postObj._id,
      MediaType: postObj.MediaType,
      PostType: postObj.PostType,
      hasThumbnail: !!postObj.thumbnail,
      hasMediaURL: !!postObj.MediaURL,
      hasPostStatement: !!postObj.PostStatement,
      hasContent: !!postObj.Content,
      hasBlendImages: blendImageCount,
      PostedBy: postObj.PostedBy
    });
    
    var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
    PostImage = PostImage ? PostImage : "";
    PostImage =
      PostImage.indexOf("unsplash") >= 0
        ? PostImage
        : "https://www.scrpt.com/assets/Media/img/300/" + PostImage;

    var PostStatement =
      postObj.MediaType != "Notes" ? postObj.PostStatement : postObj.Content;

    /*PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');*/

    var inputObj = {
      CapsuleId: CapsuleData._id ? CapsuleData._id : null,
      PageId: PageData._id ? PageData._id : null,
      PostId: postObj._id,
      PostOwnerId: NewOwnerId || postObj.PostedBy, // Use new owner if provided (for purchased streams)
      ReceiverEmails: shareWithEmail ? [shareWithEmail] : [],
      PostImage: PostImage,
      PostStatement: PostStatement,
      IsSurpriseCase: true,
      IsPageStreamCase: true,
      EmailEngineDataSets: [],
      SurpriseSelectedWords: postObj.SurpriseSelectedWords
        ? postObj.SurpriseSelectedWords.split(",")
        : null,
      SurpriseSelectedTags: [],
      SyncedBy: req.session.user._id,
      SyncedByName: req.session.user.Name,
      EmailTemplate: CapsuleData.EmailTemplate
        ? CapsuleData.EmailTemplate
        : "PracticalThinker",
      IsStreamPaused: CapsuleData.IsStreamPaused
        ? CapsuleData.IsStreamPaused
        : 0,
      EmailSubject: CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
      IsOnetimeStream: CapsuleData.IsOnetimeStream
        ? CapsuleData.IsOnetimeStream
        : false,
      IsOnlyPostImage: CapsuleData.IsOnlyPostImage
        ? CapsuleData.IsOnlyPostImage
        : false,
    };

    inputObj.EmailEngineDataSets = [];

    var LabelId = postObj.Label ? String(postObj.Label) : null;

    for (let i365 = 0; i365 < PageData.EmailEngineDataSets.length; i365++) {
      var obj = PageData.EmailEngineDataSets[i365];
      obj.LabelId = obj.LabelId ? String(obj.LabelId) : null;
      if (LabelId === obj.LabelId) {
        inputObj.EmailEngineDataSets.push(obj);
      }
    }

    if (!inputObj.EmailEngineDataSets.length) {
      inputObj.EmailEngineDataSets = PageData.EmailEngineDataSets
        ? PageData.EmailEngineDataSets
        : [];
    }

    for (let i365 = 0; i365 < inputObj.EmailEngineDataSets.length; i365++) {
      inputObj.EmailEngineDataSets[i365].TextAboveVisual = inputObj
        .EmailEngineDataSets[i365].TextAboveVisual
        ? inputObj.EmailEngineDataSets[i365].TextAboveVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
      inputObj.EmailEngineDataSets[i365].TextBelowVisual = inputObj
        .EmailEngineDataSets[i365].TextBelowVisual
        ? inputObj.EmailEngineDataSets[i365].TextBelowVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
    }

    // Support both SelectedBlendImages and BlendSettings (collabmedia-backend uses BlendSettings)
    // ⚠️ IMPORTANT: Convert BlendSettings BEFORE calling __getEmailEngineDataSetsFromSelectedBlendImages_NDays
    if (postObj.BlendSettings && postObj.BlendSettings.allBlendConfigurations) {
      // Map the structure - allBlendConfigurations already has blendImage1/2 properties
      postObj.SelectedBlendImages = postObj.BlendSettings.allBlendConfigurations.map(config => ({
        blendImage1: config.blendImage1 || config.image1Url,  // Try blendImage1 first (correct format)
        blendImage2: config.blendImage2 || config.image2Url,  // Try blendImage2 first (correct format)
        blendMode: config.blendMode,
        lightness1: config.lightness1,
        lightness2: config.lightness2,
        Keywords: config.Keywords || config.SelectedKeywords || []
      }));
    } else {
      postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
      
      // If SelectedBlendImages exists but doesn't have blendImage1/2, map it
      if (postObj.SelectedBlendImages.length > 0 && !postObj.SelectedBlendImages[0].blendImage1) {
        postObj.SelectedBlendImages = postObj.SelectedBlendImages.map(config => ({
          blendImage1: config.blendImage1 || config.image1Url,
          blendImage2: config.blendImage2 || config.image2Url,
          blendMode: config.blendMode,
          lightness1: config.lightness1,
          lightness2: config.lightness2,
          Keywords: config.Keywords || config.SelectedKeywords || []
        }));
      }
    }
    
    //get the selected blend images of the post if there is any else use the default procedure.
    //inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages (postObj, PagePosts2, inputObj.EmailEngineDataSets, CapsuleData);
    inputObj.EmailEngineDataSets =
      __getEmailEngineDataSetsFromSelectedBlendImages_NDays(
        postObj,
        PagePosts2,
        inputObj.EmailEngineDataSets,
        CapsuleData,
        1
      );

    if (inputObj.IsOnetimeStream || postObj.PostType == "GeneralPost") {
      console.log(`📧 Post ${loop365 + 1}: Onetime/General path - calling function directly`);
      if (
        inputObj.PageId &&
        inputObj.PostId &&
        inputObj.PostOwnerId &&
        inputObj.EmailEngineDataSets &&
        inputObj.ReceiverEmails.length
      ) {
        // Call function directly instead of HTTP
        const mockReq = { body: inputObj, session: req.session };
        const mockRes = { 
          json: (data) => {
            console.log(`✅ Function call successful for post ${loop365 + 1}, response code:`, data.code);
            return data;
          }
        };
        await journalController.streamPage__WithSelectedBlendCase(mockReq, mockRes);
      } else {
        console.log(`⚠️ Post ${loop365 + 1}: Onetime/General path - conditions NOT met, skipping`);
      }
    } else {
      if (postObj.SelectedBlendImages.length) {
        console.log(`📧 Post ${loop365 + 1}: Has SelectedBlendImages - checking API conditions`);
        
        // Debug: Check each condition
        const conditionCheck = {
          hasPageId: !!inputObj.PageId,
          hasPostId: !!inputObj.PostId,
          hasPostOwnerId: !!inputObj.PostOwnerId,
          hasEmailEngineDataSets: !!inputObj.EmailEngineDataSets,
          hasReceiverEmails: inputObj.ReceiverEmails && inputObj.ReceiverEmails.length > 0,
          hasPostImage: !!inputObj.PostImage
        };
        console.log(`🔍 Post ${loop365 + 1} conditions:`, JSON.stringify(conditionCheck, null, 2));

        if (
          inputObj.PageId &&
          inputObj.PostId &&
          inputObj.PostOwnerId &&
          inputObj.EmailEngineDataSets &&
          inputObj.ReceiverEmails.length &&
          inputObj.PostImage
        ) {
          // Call function directly instead of HTTP
          const mockReq = { body: inputObj, session: req.session };
          const mockRes = { 
            json: (data) => {
              console.log(`✅ Function call successful for post ${loop365 + 1}, response code:`, data.code);
              return data;
            }
          };
          await journalController.streamPage__WithSelectedBlendCase(mockReq, mockRes);
        } else {
          console.log(`⚠️ Post ${loop365 + 1}: Skipping due to missing required fields`);
        }
      } else {
        // 🚀 OPTIMIZATION: Skip Audio/Video posts - they don't need blend image processing
        const mediaType = postObj.MediaType || '';
        const isNonBlendableType = mediaType === 'Audio' || 
                                   mediaType === 'Video' || 
                                   mediaType === '1AudioPost' || 
                                   mediaType === '1VideoPost';
        
        if (isNonBlendableType) {
          console.log(`⏭️ Post ${loop365 + 1}: Skipping ${mediaType} - no blend processing needed`);
          // Audio/Video posts don't need the expensive streamPost call
          // They'll be delivered via the normal email flow without blend image selection
          continue;
        }
        
        console.log(`📧 Post ${loop365 + 1}: NO SelectedBlendImages - checking streamPage API conditions`);
        
        // Debug: Check each condition
        const conditionCheck = {
          hasPageId: !!inputObj.PageId,
          hasPostId: !!inputObj.PostId,
          hasPostOwnerId: !!inputObj.PostOwnerId,
          hasEmailEngineDataSets: inputObj.EmailEngineDataSets && inputObj.EmailEngineDataSets.length > 0,
          emailDataSetsLength: inputObj.EmailEngineDataSets ? inputObj.EmailEngineDataSets.length : 0,
          hasReceiverEmails: inputObj.ReceiverEmails && inputObj.ReceiverEmails.length > 0,
          receiverEmailsCount: inputObj.ReceiverEmails ? inputObj.ReceiverEmails.length : 0,
          hasPostImage: !!inputObj.PostImage,
          PostImageValue: inputObj.PostImage || 'NULL'
        };
        console.log(`🔍 Post ${loop365 + 1} conditions:`, JSON.stringify(conditionCheck, null, 2));
        
        if (
          inputObj.PageId &&
          inputObj.PostId &&
          inputObj.PostOwnerId &&
          inputObj.EmailEngineDataSets.length &&
          inputObj.ReceiverEmails.length &&
          inputObj.PostImage
        ) {
          // Call function directly instead of HTTP
          const mockReq = { body: inputObj, session: req.session };
          const mockRes = { 
            json: (data) => {
              console.log(`✅ Function call successful for post ${loop365 + 1}, response code:`, data.code);
              return data;
            }
          };
          await journalController.streamPost(mockReq, mockRes);
        } else {
          console.log(`⚠️ Post ${loop365 + 1}: Skipping due to missing required fields`);
        }
      }
    }
  }

  var EmailEngineDataSets_keyposts =
    __getEmailEngineDataSetsBasedOnMonthAndKeyPost_AllPosts(CapsuleData);
  if (!EmailEngineDataSets_keyposts.length) {
    EmailEngineDataSets_keyposts = null;
  }
  EmailEngineDataSets_keyposts = EmailEngineDataSets_keyposts
    ? EmailEngineDataSets_keyposts
    : [];

  PagePosts_keyposts = PagePosts_keyposts ? PagePosts_keyposts : [];
  for (let loop366 = 0; loop366 < PagePosts_keyposts.length; loop366++) {
    var postObj = PagePosts_keyposts[loop366];
    var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
    PostImage = PostImage ? PostImage : "";
    PostImage =
      PostImage.indexOf("unsplash") >= 0
        ? PostImage
        : "https://www.scrpt.com/assets/Media/img/300/" + PostImage;

    var PostStatement =
      postObj.MediaType != "Notes" ? postObj.PostStatement : postObj.Content;

    /*PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');*/

    var inputObj = {
      CapsuleId: CapsuleData._id ? CapsuleData._id : null,
      PageId: PageData._id ? PageData._id : null,
      PostId: postObj._id,
      PostOwnerId: NewOwnerId || postObj.PostedBy, // Use new owner if provided (for purchased streams)
      ReceiverEmails: shareWithEmail ? [shareWithEmail] : [],
      PostImage: PostImage,
      PostStatement: PostStatement,
      IsSurpriseCase: true,
      IsPageStreamCase: true,
      EmailEngineDataSets: [],
      SurpriseSelectedWords: postObj.SurpriseSelectedWords
        ? postObj.SurpriseSelectedWords.split(",")
        : null,
      SurpriseSelectedTags: [],
      SyncedBy: req.session.user._id,
      SyncedByName: req.session.user.Name,
      EmailTemplate: CapsuleData.EmailTemplate
        ? CapsuleData.EmailTemplate
        : "PracticalThinker",
      IsStreamPaused: CapsuleData.IsStreamPaused
        ? CapsuleData.IsStreamPaused
        : 0,
      EmailSubject: CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
      IsOnetimeStream: CapsuleData.IsOnetimeStream
        ? CapsuleData.IsOnetimeStream
        : false,
      IsOnlyPostImage: CapsuleData.IsOnlyPostImage
        ? CapsuleData.IsOnlyPostImage
        : false,
    };

    inputObj.EmailEngineDataSets = [];

    if (!inputObj.EmailEngineDataSets.length) {
      inputObj.EmailEngineDataSets = EmailEngineDataSets_keyposts
        ? EmailEngineDataSets_keyposts
        : [];
    }

    for (let i366 = 0; i366 < inputObj.EmailEngineDataSets.length; i366++) {
      inputObj.EmailEngineDataSets[i366].TextAboveVisual = inputObj
        .EmailEngineDataSets[i366].TextAboveVisual
        ? inputObj.EmailEngineDataSets[i366].TextAboveVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
      inputObj.EmailEngineDataSets[i366].TextBelowVisual = inputObj
        .EmailEngineDataSets[i366].TextBelowVisual
        ? inputObj.EmailEngineDataSets[i366].TextBelowVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
    }

    //get the selected blend images of the post if there is any else use the default procedure.
    inputObj.EmailEngineDataSets = __getEmailEngineDataSetsForKeyPost(
      postObj,
      PagePosts_keyposts,
      inputObj.EmailEngineDataSets,
      CapsuleData
    );
    // Support both SelectedBlendImages and BlendSettings for KeyPosts
    if (postObj.BlendSettings && postObj.BlendSettings.allBlendConfigurations) {
      postObj.SelectedBlendImages = postObj.BlendSettings.allBlendConfigurations;
    } else {
      postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
    }

    var KeyPost_case = true; //inputObj.IsOnetimeStream
    if (KeyPost_case) {
      if (
        inputObj.PageId &&
        inputObj.PostId &&
        inputObj.PostOwnerId &&
        inputObj.EmailEngineDataSets &&
        inputObj.ReceiverEmails.length
      ) {
        // Call function directly instead of HTTP
        const mockReq = { body: inputObj, session: req.session };
        const mockRes = { 
          json: (data) => {
            console.log(`✅ KeyPost function call successful, response code:`, data.code);
            return data;
          }
        };
        await journalController.streamPage__WithSelectedBlendCase(mockReq, mockRes);
      }
    } else {
      if (postObj.SelectedBlendImages.length) {
        //inputObj.EmailEngineDataSets = NewEmailEngineDataSets;

        if (
          inputObj.PageId &&
          inputObj.PostId &&
          inputObj.PostOwnerId &&
          inputObj.EmailEngineDataSets &&
          inputObj.ReceiverEmails.length &&
          inputObj.PostImage &&
          inputObj.SurpriseSelectedWords
        ) {
          // Call function directly instead of HTTP
          const mockReq = { body: inputObj, session: req.session };
          const mockRes = { 
            json: (data) => {
              console.log(`✅ KeyPost blend function call successful, response code:`, data.code);
              return data;
            }
          };
          await journalController.streamPage__WithSelectedBlendCase(mockReq, mockRes);
        }
      } else {
        if (
          inputObj.PageId &&
          inputObj.PostId &&
          inputObj.PostOwnerId &&
          inputObj.EmailEngineDataSets.length &&
          inputObj.ReceiverEmails.length &&
          inputObj.PostImage &&
          inputObj.SurpriseSelectedWords
        ) {
          // Call function directly instead of HTTP
          const mockReq = { body: inputObj, session: req.session };
          const mockRes = { 
            json: (data) => {
              console.log(`✅ KeyPost streamPost function call successful, response code:`, data.code);
              return data;
            }
          };
          await journalController.streamPost(mockReq, mockRes);
        }
      }
    }
  }

  if (await mapPostsAsPerSettings(CapsuleData, firstTimeFlag)) {
    // Check final SyncedPosts count
    const finalSyncedPosts = await SyncedPost.find({ CapsuleId: new ObjectId(CapsuleData._id) });
    console.log(`✅ Stream setup complete. Final SyncedPosts count: ${finalSyncedPosts.length}`);
  } else {
    console.log("❌ Stream setup failed");
  }
}

/*________________________________________________________________________
   * @Date:      		16 September 2015
   * @Method :   		getAllChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var getChapters = function (req, res) {
  var conditions = {
    CapsuleId: req.headers.capsule_id,
    //CreaterId : req.session.user._id,
    OwnerId: req.session.user._id, //used by both creater - for publish and by Owner - for launch.
    //IsLaunched : 0,
    Status: 1,
    IsDeleted: 0,
  };
  var sortObj = {
    Order: 1,
    ModifiedOn: -1,
  };

  var fields = {};

  Chapter.find(conditions, fields)
    .sort(sortObj)
    .exec(function (err, results) {
      if (!err) {
        var chapter_ids = [];
        for (var loop = 0; loop < results.length; loop++) {
          chapter_ids.push(results[loop]._id);
        }

        var response = {
          status: 200,
          message: "Chapters listing",
          results: results,
          chapter_ids: chapter_ids,
        };
        res.json(response);
      } else {
        // //console.log(err);
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
   * @Method :   		find
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var find = function (req, res) {
  var conditions = {
    //CreaterId : req.session.user._id,
    _id: req.headers.capsule_id ? req.headers.capsule_id : 0,
    Status: 1,
    IsDeleted: 0,
  };

  var fields = {};
  // //console.log('===========================================');
  // //console.log(conditions);
  // //console.log('===========================================');

  Capsule.findOne(conditions).exec(function (err, results) {
    if (!err) {
      var response = {
        status: 200,
        message: "Capsules listing",
        result: results,
      };
      res.json(response);
    } else {
      // //console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

var chapter__sendInvitations = function (ChapterData, invitees, req) {
  function sendInvitationEmail(
    results,
    shareWithEmail,
    shareWithName,
    ChapterViewURL
  ) {
    User.find(
      { Email: shareWithEmail, IsDeleted: false },
      { Name: true },
      function (err, name) {
        var RecipientName = shareWithName ? shareWithName : "";
        if (name.length > 0) {
          var name = name[0].Name ? name[0].Name.split(" ") : "";
          RecipientName = name.length ? name[0] : "";
        }
        var OwnerName = req.session.user.Name
          ? req.session.user.Name.split(" ")[0]
          : "";

        var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
        newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
        newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
        newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

        var to = shareWithEmail;
        results[0].subject =
          typeof results[0].subject == "string" ? results[0].subject : "";
        var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
        subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
        subject =
          subject != ""
            ? subject
            : "Scrpt - " +
              req.session.user.Name +
              " has invited you in a chapter to join!";
        /*
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'collabmedia.scrpt@gmail.com',
                    pass: 'scrpt123_2014collabmedia#1909'
                }
            });
			*/
        var transporter = nodemailer.createTransport(
          process.EMAIL_ENGINE.info.smtpOptions
        );
        var mailOptions = {
          //from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
          from: process.EMAIL_ENGINE.info.senderLine,
          to: to, // list of receivers
          subject: subject,
          html: newHtml,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            // //console.log(error);
          } else {
            // //console.log('Message sent to: ' + mailOptions.to + info.response);
          }
        });
      }
    );
  }

  //check type of capsule here and map email template accordingly!
  //make chapter view url
  var condition1 = {};
  condition1 = {
    _id: ChapterData.CapsuleId ? ChapterData.CapsuleId : 0,
    //"LaunchSettings.CapsuleFor" : "Birthday",
    IsDeleted: 0,
  };
  var fields1 = {};
  var __capsuleFOR = "";

  Capsule.find(condition1, fields1, function (err, results) {
    if (!err) {
      if (results.length) {
        results[0].LaunchSettings = results[0].LaunchSettings
          ? results[0].LaunchSettings
          : {};
        __capsuleFOR = results[0].LaunchSettings.CapsuleFor
          ? results[0].LaunchSettings.CapsuleFor
          : "";
      }
      goAhead(ChapterData, invitees, req);
    }
  });

  function goAhead(ChapterData, invitees, req) {
    //make chapter view url
    var condition = {};
    condition = {
      ChapterId: ChapterData._id ? ChapterData._id : 0,
      IsDeleted: 0,
      IsDasheditpage: { $ne: true },
      PageType: { $in: ["gallery", "content"] },
    };

    var sortObj = {
      Order: 1,
    };

    var fields = {
      _id: true,
      ChapterId: true,
      PageType: true,
    };

    var ChapterViewURL = "";

    var invitees = invitees ? invitees : [];
    if (invitees.length) {
      Page.find(condition, fields)
        .sort(sortObj)
        .exec(function (err, results) {
          if (!err) {
            console.log(
              "-------------------------------Pages found---------------------------------"
            );
            var data = {
              status: 200,
              message: "Pages listing",
              results: results,
            };
            //res.json(response);

            if (data.results.length) {
              var conditions = {};
              if (__capsuleFOR == "Birthday") {
                if (data.results[0].PageType == "content") {
                  ChapterViewURL =
                    process.HOST_URL +
                    "/birthday-view/cp/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                } else if (data.results[0].PageType == "gallery") {
                  ChapterViewURL =
                    process.HOST_URL +
                    "/birthday-view/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                } else {
                  // //console.log("Something went wrong.");
                  ChapterViewURL =
                    process.HOST_URL +
                    "/birthday-view/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                }

                conditions.name = "Chapter__invitation_BIRTHDAY";
              } else if (__capsuleFOR == "Theme") {
                if (data.results[0].PageType == "content") {
                  ChapterViewURL =
                    process.HOST_URL +
                    "/birthday-view/cp/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                } else if (data.results[0].PageType == "gallery") {
                  ChapterViewURL =
                    process.HOST_URL +
                    "/birthday-view/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                } else {
                  // //console.log("Something went wrong.");
                  ChapterViewURL =
                    process.HOST_URL +
                    "/birthday-view/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                }

                conditions.name = "Chapter__invitation_THEME";
              } else {
                if (data.results[0].PageType == "content") {
                  ChapterViewURL =
                    process.HOST_URL +
                    "/chapter-view/cp/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                } else if (data.results[0].PageType == "gallery") {
                  ChapterViewURL =
                    process.HOST_URL +
                    "/chapter-view/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                } else {
                  // //console.log("Something went wrong.");
                  ChapterViewURL =
                    process.HOST_URL +
                    "/chapter-view/" +
                    condition.ChapterId +
                    "/" +
                    data.results[0]._id;
                }

                conditions.name = "Chapter__Invitation";
              }

              EmailTemplate.find(conditions, {}, function (err, results) {
                if (!err) {
                  if (results.length) {
                    for (var loop = 0; loop < invitees.length; loop++) {
                      var shareWithEmail = invitees[loop].UserEmail;
                      var shareWithName = invitees[loop].UserName
                        ? invitees[loop].UserName
                        : " ";

                      // //console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
                      sendInvitationEmail(
                        results,
                        shareWithEmail,
                        shareWithName,
                        ChapterViewURL
                      );
                    }
                  }
                }
              });
            } else {
              //console.log("No Page Found...");
            }
          } else {
            //console.log(err);
          }
        });
    } else {
      //console.log("-------------------- No invitees -----------------");
    }
  }
};

var createCelebrityInstance = async function (req, res) {
  var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
  var OwnerId = req.session.user._id;

  if (!CapsuleId || !OwnerId) {
    return res.json({ code: 501, message: "Something went wrong." });
  }

  //check if already exists then skip
  var conditions_celebrity = {
    CreaterId: OwnerId,
    OwnerId: OwnerId,
    OriginatedFrom: new ObjectId(CapsuleId),
    "LaunchSettings.Audience": "CELEBRITY",
    "LaunchSettings.CapsuleFor": "Stream",
    "LaunchSettings.StreamType": "Group",
    IsDeleted: false,
  };

  var CapsuleData_celebrity = await Capsule.findOne(conditions_celebrity);
  CapsuleData_celebrity =
    typeof CapsuleData_celebrity == "object" ? CapsuleData_celebrity : null;

  if (CapsuleData_celebrity != null) {
    return res.json({
      code: 200,
      message: "Calebrity instance has already been configured successfully.",
      CapsuleData: CapsuleData_celebrity,
    });
  }

  var conditions = {
    _id: new ObjectId(CapsuleId),
    CreaterId: OwnerId,
    OwnerId: OwnerId,
    "LaunchSettings.Audience": "BUYERS",
    "LaunchSettings.CapsuleFor": "Stream",
    "LaunchSettings.StreamType": "Group",
  };

  var CapsuleData = await Capsule.findOne(conditions);
  var owner = await User.findOne({ _id: new ObjectId(OwnerId) });
  CapsuleData = typeof CapsuleData == "object" ? CapsuleData : null;
  owner = typeof owner == "object" ? owner : null;

  if (CapsuleData == null || owner == null) {
    return res.json({ code: 501, message: "Something went wrong." });
  }
  owner.UserEmail = owner.Email;
  owner.UserName = owner.Name;

  capsule__createNewInstance_Celebrity(CapsuleData, owner, req);
  setTimeout(function () {
    return res.json({
      code: 200,
      message: "Calebrity instance has been configured successfully.",
    });
  }, 3000);
};

function capsule__createNewInstance_Celebrity(CapsuleData, owner, req) {
  var __capsuleId = CapsuleData._id;

  //check to make sure who will be the creater for new instances
  var __CreaterId_ForNewInstances = null;

  CapsuleData.LaunchSettings = CapsuleData.LaunchSettings
    ? CapsuleData.LaunchSettings
    : {};
  CapsuleData.LaunchSettings.Audience = CapsuleData.LaunchSettings.Audience
    ? CapsuleData.LaunchSettings.Audience
    : false;

  var CapsuleForCase = CapsuleData.LaunchSettings.Audience;
  switch (CapsuleForCase) {
    case "CELEBRITY":
      __CreaterId_ForNewInstances = CapsuleData.CreaterId;
      break;
    case "ME":
      __CreaterId_ForNewInstances = CapsuleData.CreaterId;
      break;

    case "OTHERS":
      __CreaterId_ForNewInstances = CapsuleData.CreaterId;
      break;

    case "BUYERS":
      __CreaterId_ForNewInstances = CapsuleData.CreaterId;
      break;

    default:
      return; //return res.json({ code: 404, message: "Something went wrong." });
  }

  //check if the owner is register or not
  var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
  var shareWithName = owner.UserName ? owner.UserName.split(" ")[0] : "OWNER";
  var UniqueIdPerOwner = owner.UniqueIdPerOwner ? owner.UniqueIdPerOwner : null;

  if (shareWithEmail) {
    var conditions = {};
    (conditions.Email = new RegExp("^" + shareWithEmail + "$", "i")),
      (conditions.IsDeleted = false);

    var fields = {
      Email: true,
      Name: true,
      Gender: true,
    };

    User.find(conditions, fields, async function (err, UserData) {
      if (!err) {
        // //console.log("UserData = ", UserData);

        var data = {};
        data.Origin = "published";
        data.OriginatedFrom = __capsuleId;

        if (UniqueIdPerOwner != null) {
          data.UniqueIdPerOwner = UniqueIdPerOwner;
        }

        //data.CreaterId = req.session.user._id;
        data.CreaterId = __CreaterId_ForNewInstances;
        data.PurchasedBy = req.session.user._id; //started using this from SurpriseGift flow

        if (!UserData.length) {
          //Non-Registered user case
          data.OwnerId = req.session.user._id; //will update this ownerId at the time of user registeration.
          //if this is a surprise gift case then creater owner account if not present already and map Owner id here.
          var request_url =
            "https://www.scrpt.com/journal/createNewUserAccount_INTERNAL_API";
          let inObj = {
            Name: shareWithName,
            Email: shareWithEmail,
            NickName: shareWithName,
          };
          let response = await axios.post(request_url, inputObj);
          response.data = response.data ? response.data : {};
          response.data.code = response.data.code ? response.data.code : null;
          response.data.newUserId = response.data.newUserId
            ? response.data.newUserId
            : null;

          console.log(
            "------------ AXIOS ---- SurpriseGift - New User has been created ---------------",
            response.data.code
          );

          if (response.data.newUserId) {
            data.OwnerId = response.data.newUserId;
          }
        } else {
          data.OwnerId = UserData[0]._id;
        }

        data.OwnerEmail = shareWithEmail;
        data.Title = CapsuleData.Title;
        data.CoverArt = CapsuleData.CoverArt;

        data.IsPublished = true; //published by someone else....
        data.MetaData = CapsuleData.MetaData ? CapsuleData.MetaData : {};

        var nowDate = Date.now();
        data.CreatedOn = nowDate;
        data.ModifiedOn = nowDate;

        //Birthday Capsule Updates ...
        CapsuleData.LaunchSettings.CapsuleFor = CapsuleData.LaunchSettings
          .CapsuleFor
          ? CapsuleData.LaunchSettings.CapsuleFor
          : "";
        if (CapsuleData.LaunchSettings.CapsuleFor == "Birthday") {
          data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
          data.LaunchSettings.CapsuleFor = "Birthday";
        }
        if (CapsuleData.LaunchSettings.CapsuleFor == "Theme") {
          data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
          data.LaunchSettings.CapsuleFor = "Theme";
          data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.
        }

        if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
          CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings
            .StreamType
            ? CapsuleData.LaunchSettings.StreamType
            : null;

          data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
          data.LaunchSettings.CapsuleFor = "Stream";
          data.LaunchSettings.StreamType =
            CapsuleData.LaunchSettings.StreamType;
          data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.

          data.MonthFor = data.MonthFor ? data.MonthFor : "M12";
          data.Frequency = data.Frequency ? data.Frequency : "medium";
          data.EmailTemplate = CapsuleData.EmailTemplate
            ? CapsuleData.EmailTemplate
            : "PracticalThinker";
          data.IsStreamPaused = CapsuleData.IsStreamPaused
            ? CapsuleData.IsStreamPaused
            : 0;
          data.EmailSubject = CapsuleData.EmailSubject
            ? CapsuleData.EmailSubject
            : null;
          data.IsOnetimeStream = CapsuleData.IsOnetimeStream
            ? CapsuleData.IsOnetimeStream
            : false;
          data.IsOnlyPostImage = CapsuleData.IsOnlyPostImage
            ? CapsuleData.IsOnlyPostImage
            : false;
          data.IsSurpriseGift = CapsuleData.IsSurpriseGift
            ? CapsuleData.IsSurpriseGift
            : false;

          data.StreamFlow = CapsuleData.StreamFlow
            ? CapsuleData.StreamFlow
            : null;
          if (CapsuleData.LaunchSettings.StreamType == "Group") {
            data.StreamFlow = CapsuleData.StreamFlow
              ? CapsuleData.StreamFlow
              : "Birthday";
          }
        }
        data.LaunchSettings.Audience = "CELEBRITY";
        //// //console.log("data = ",data);
        Capsule(data).save(async function (err, result) {
          if (!err) {
            //pages under chapters
            var conditions = {
              CapsuleId: __capsuleId,
              //CreaterId : req.session.user._id,	//removing this check because this same function is used for Private published / purchase__myself and purchase__gift cases now.
              Status: 1,
              IsDeleted: 0,
            };
            var sortObj = {
              Order: 1,
              ModifiedOn: -1,
            };
            var fields = {
              _id: true,
            };

            var newCapsuleId = result._id;

            //update store capsule with CelebrityInstanceId
            await Capsule.updateOne(
              { _id: new ObjectId(__capsuleId) },
              { $set: { CelebrityInstanceId: new ObjectId(newCapsuleId) } }
            );

            Chapter.find(conditions, fields)
              .sort(sortObj)
              .exec(function (err, results) {
                if (!err) {
                  var fields = {
                    _id: true,
                    Title: true,
                    CoverArt: true,
                    Order: true,
                    LaunchSettings: true,
                    CoverArtFirstPage: true,
                    ChapterPlaylist: true,
                  };
                  for (var loop = 0; loop < results.length; loop++) {
                    var conditions = {};
                    conditions._id = results[loop]._id;
                    Chapter.findOne(conditions, fields, function (err, result) {
                      var __chapterId = result._id ? result._id : 0;
                      //delete result._id;
                      var data = {};
                      data.Origin = "published";
                      data.OriginatedFrom = result._id;
                      //data.CreaterId = req.session.user._id;
                      data.CreaterId = __CreaterId_ForNewInstances;

                      if (!UserData.length) {
                        //Non-Registered user case			- this will be modified when user will register into the platform.
                        data.OwnerId = req.session.user._id;
                      } else {
                        data.OwnerId = UserData[0]._id;
                      }

                      data.OwnerEmail = shareWithEmail;
                      data.CapsuleId = newCapsuleId;

                      data.Title = result.Title;
                      data.CoverArt = result.CoverArt;
                      data.Order = result.Order;
                      data.LaunchSettings = {};
                      data.LaunchSettings.NamingConvention =
                        result.LaunchSettings.NamingConvention; //Recommendation from creater
                      data.LaunchSettings.ShareMode =
                        result.LaunchSettings.ShareMode; //Recommendation from creater
                      data.CoverArtFirstPage = result.CoverArtFirstPage
                        ? result.CoverArtFirstPage
                        : "";
                      data.ChapterPlaylist = result.ChapterPlaylist
                        ? result.ChapterPlaylist
                        : [];

                      data.CreatedOn = nowDate;
                      data.ModifiedOn = nowDate;

                      if (CapsuleData.LaunchSettings.CapsuleFor == "Theme") {
                        data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.
                      }

                      // //console.log("-------", result);
                      //// //console.log("data = ",data);
                      Chapter(data).save(function (err, result) {
                        if (!err) {
                          //pages under chapters
                          var conditions = {
                            ChapterId: __chapterId,
                            //CreaterId : req.session.user._id, //removing this check because this same function is used for Private published / purchase__myself and purchase__gift cases now.
                            IsDasheditpage: false, //this is to prevent the double instances of the page issue
                            IsDeleted: 0,
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

                          //__checkNcreateChapterIntroPage(result, shareWithName, CapsuleData);

                          Page.find(conditions, fields)
                            .sort(sortObj)
                            .exec(function (err, results) {
                              if (!err) {
                                var fields = {
                                  _id: true,
                                  Title: true,
                                  TitleInvitees: true,
                                  PageType: true,
                                  Order: true,
                                  HeaderImage: true,
                                  BackgroundMusic: true,
                                  CommonParams: true,
                                  ViewportDesktopSections: true,
                                  ViewportTabletSections: true,
                                  ViewportMobileSections: true,
                                  SelectedMedia: true,
                                  SelectionCriteria: true,
                                  HeaderBlurValue: true,
                                  HeaderTransparencyValue: true,
                                  Labels: true,
                                  IsLabelAllowed: true,
                                  HeaderVideoLink: true,
                                  EmailEngineDataSets: true,
                                  VoiceOverLyricsSettings: true,
                                  VoiceOverFile: true,
                                  Themes: true,
                                };

                                if (
                                  CapsuleData.LaunchSettings.CapsuleFor ==
                                  "Stream"
                                ) {
                                  fields.Medias = true;
                                }
                                //console.log(" XXX -----------------------hERE 11111111 ---------------------- XXX", results.length);
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
                                    async function (err, result) {
                                      //console.log(" XXX -----------------------hERE---------------------- XXX");
                                      //delete result._id;
                                      var data = {};
                                      data.Origin = "published";
                                      data.OriginatedFrom = result._id;
                                      //data.CreaterId = req.session.user._id;
                                      data.CreaterId =
                                        __CreaterId_ForNewInstances;

                                      if (!UserData.length) {
                                        //Non-Registered user case
                                        data.OwnerId = req.session.user._id;
                                      } else {
                                        data.OwnerId = UserData[0]._id;
                                      }

                                      data.OwnerEmail = shareWithEmail;
                                      data.ChapterId = newChapterId
                                        ? newChapterId
                                        : "";
                                      data.Title = result.Title;
                                      data.TitleInvitees = result.TitleInvitees
                                        ? result.TitleInvitees
                                        : result.Title;
                                      data.PageType = result.PageType;
                                      data.Order = result.Order;
                                      data.HeaderImage = result.HeaderImage
                                        ? result.HeaderImage
                                        : "";
                                      data.BackgroundMusic =
                                        result.BackgroundMusic
                                          ? result.BackgroundMusic
                                          : "";
                                      data.HeaderBlurValue =
                                        result.HeaderBlurValue;
                                      data.HeaderTransparencyValue =
                                        result.HeaderTransparencyValue;

                                      data.SelectedMedia = result.SelectedMedia;
                                      data.SelectionCriteria =
                                        result.SelectionCriteria;
                                      data.Labels = result.Labels
                                        ? result.Labels
                                        : [];
                                      data.IsLabelAllowed =
                                        result.IsLabelAllowed
                                          ? result.IsLabelAllowed
                                          : false;
                                      data.HeaderVideoLink =
                                        result.HeaderVideoLink
                                          ? result.HeaderVideoLink
                                          : "";
                                      data.EmailEngineDataSets =
                                        result.EmailEngineDataSets
                                          ? result.EmailEngineDataSets
                                          : [];
                                      data.VoiceOverLyricsSettings =
                                        result.VoiceOverLyricsSettings
                                          ? result.VoiceOverLyricsSettings
                                          : [];
                                      data.VoiceOverFile = result.VoiceOverFile
                                        ? result.VoiceOverFile
                                        : "";
                                      data.Themes = result.Themes
                                        ? result.Themes
                                        : [];

                                      data.CreatedOn = nowDate;
                                      data.UpdatedOn = nowDate;

                                      if (
                                        CapsuleData.LaunchSettings.CapsuleFor ==
                                        "Stream"
                                      ) {
                                        //make a copy of Posts and transfer ownership.
                                        data.Medias = result.Medias
                                          ? result.Medias
                                          : [];
                                        for (
                                          var i = 0;
                                          i < data.Medias.length;
                                          i++
                                        ) {
                                          data.Medias[i].OriginatedFrom =
                                            data.Medias[i]._id;
                                          data.Medias[i].Origin = "Copy";
                                          data.Medias[i]._id = new ObjectId();
                                          data.Medias[i].OwnerId = data.OwnerId;
                                          data.Medias[i].PostedBy = ObjectId(
                                            data.OwnerId
                                          );

                                          var cond = {
                                            PageId: data.OriginatedFrom,
                                            PostId:
                                              data.Medias[i].OriginatedFrom,
                                            //IsPageStreamCase : 1
                                          };
                                          var f = {
                                            SelectedBlendImages: 1,
                                          };
                                          var SelectedBlendImages =
                                            await PageStream.find(cond, f);
                                          if (SelectedBlendImages.length) {
                                            data.Medias[i].SelectedBlendImages =
                                              SelectedBlendImages[0]
                                                .SelectedBlendImages
                                                ? SelectedBlendImages[0]
                                                    .SelectedBlendImages
                                                : [];
                                          }

                                          data.Medias[i].SelectedBlendImages =
                                            data.Medias[i].SelectedBlendImages
                                              ? data.Medias[i]
                                                  .SelectedBlendImages
                                              : [];
                                        }
                                        //make a copy of post and transfer ownership
                                      }

                                      if (data.PageType == "gallery") {
                                        Page(data).save(function (err, result) {
                                          if (!err) {
                                          }
                                        });
                                      }
                                    }
                                  );
                                }
                              }
                            });
                        }
                      });
                    });
                  }
                }
              });
          }
        });
      }
    }).catch(function (err) {
      console.error("Error in capsule__createNewInstance:", err);
    });
  }
}

var chapter__createNewInstance = function (
  __capsuleId,
  ChapterData,
  owner,
  req
) {
  // ////console.log("owner = ", owner);
  //check if the owner is register or not
  var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
  if (shareWithEmail) {
    var conditions = {};
    conditions.Email = shareWithEmail;
    conditions.IsDeleted = false;

    var fields = {
      Email: true,
    };

    User.find(conditions, fields, function (err, UserData) {
      if (!err) {
        // ////console.log("UserData = ", UserData);
        var data = {};
        data.Origin = "published";
        data.OriginatedFrom = ChapterData._id;

        data.CapsuleId = __capsuleId;
        data.CreaterId = req.session.user._id;

        if (!UserData.length) {
          //Non-Registered user case
          data.OwnerId = req.session.user._id; //will update this ownerId at the time of user registeration.
        } else {
          data.OwnerId = UserData[0]._id;
        }

        data.OwnerEmail = shareWithEmail;
        data.Title = ChapterData.Title;
        data.CoverArt = ChapterData.CoverArt;
        data.LaunchSettings = {};
        //data.LaunchSettings.MakingFor = ChapterData.LaunchSettings.MakingFor;
        data.LaunchSettings.NamingConvention =
          ChapterData.LaunchSettings.NamingConvention;
        data.LaunchSettings.ShareMode = ChapterData.LaunchSettings.ShareMode;

        var nowDate = Date.now();
        data.CreatedOn = nowDate;
        data.ModifiedOn = nowDate;

        //// ////console.log("data = ",data);
        Chapter(data).save(function (err, result) {
          if (!err) {
            //pages under chapters
            var conditions = {
              ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
              OwnerId: req.session.user._id,
              IsDeleted: 0,
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
                  };
                  for (var loop = 0; loop < results.length; loop++) {
                    var conditions = {};
                    conditions._id = results[loop]._id;
                    Page.findOne(conditions, fields, function (err, result) {
                      //delete result._id;
                      var data = {};
                      data.Origin = "published";
                      data.OriginatedFrom = result._id;
                      data.CreaterId = req.session.user._id;

                      if (!UserData.length) {
                        //Non-Registered user case
                        data.OwnerId = req.session.user._id;
                      } else {
                        data.OwnerId = UserData[0]._id;
                      }

                      data.OwnerEmail = shareWithEmail;
                      data.ChapterId = newChapterId ? newChapterId : "";
                      data.Title = result.Title;
                      data.PageType = result.PageType;
                      data.Order = result.Order;
                      data.HeaderImage = result.HeaderImage
                        ? result.HeaderImage
                        : "";
                      data.BackgroundMusic = result.BackgroundMusic
                        ? result.BackgroundMusic
                        : "";

                      data.CreatedOn = nowDate;
                      data.UpdatedOn = nowDate;

                      // ////console.log("-------", result);
                      Page(data).save(function (err, result) {
                        if (!err) {
                          // ////console.log("----new page instance created..", result);
                        } else {
                          // ////console.log(err);
                        }
                      });
                    });
                  }

                  // ////console.log("--------DONE------------");
                  /*
								var transporter = nodemailer.createTransport({
									service: 'Gmail',
									auth: {
										user: 'collabmedia.scrpt@gmail.com',
										pass: 'scrpt123_2014collabmedia#1909'
									}
								});
								*/
                  var transporter = nodemailer.createTransport(
                    process.EMAIL_ENGINE.info.smtpOptions
                  );
                  var to = shareWithEmail;

                  var mailOptions = {
                    //from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
                    from: process.EMAIL_ENGINE.info.senderLine,
                    to: to, // list of receivers
                    subject:
                      "Scrpt - " +
                      req.session.user.Name +
                      " has created a chapter for you!",
                    text: "http://203.100.79.94:8888/#/login",
                    html:
                      "Hi , <br/><br/> Scrpt - " +
                      req.session.user.Name +
                      " has created a chapter for you : '" +
                      data.Title +
                      "'. Login to access this chapter.<br/><br/>Sincerely,<br>The Scrpt team. ",
                  };

                  transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                      // ////console.log(error);
                      //res.json(err);
                    } else {
                      // ////console.log('Message sent to: ' + to + info.response);
                      //res.json({'msg':'done','code':'200'});
                    }
                  });
                } else {
                  // ////console.log("095944564-----------");
                }
              });
          } else {
            // //console.log("0959345485-----------");
          }
        });
      } else {
        // //console.log("0959485-----------");
      }
    });
  } else {
    // //console.log("09579-----------");
  }
};

/*________________________________________________________________________
   * @Date:      		25 September 2015
   * @Method :   		launch
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var saveAndLaunch = function (req, res) {
  // //console.log('server side saveSetting function');
  var condition = {};
  condition._id = req.headers.chapter_id ? req.headers.chapter_id : "0";

  var title = req.body.newTitle ? req.body.newTitle : "Untitled Chapter";
  var ShareMode = req.body.participation ? req.body.participation : "private";
  var NamingConvention = req.body.namingConvention
    ? req.body.namingConvention
    : "realnames";

  Chapter.update(
    condition,
    {
      $set: {
        Title: title,
        "LaunchSettings.ShareMode": ShareMode,
        "LaunchSettings.NamingConvention": NamingConvention,
      },
    },
    { multi: false },
    function (err, numAffected) {
      if (err) {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      } else {
        var conditions = {
          //CreaterId : req.session.user._id,
          _id: req.headers.chapter_id ? req.headers.chapter_id : 0,
          OwnerId: req.session.user._id,
          IsLaunched: 0,
          Status: 1,
          IsDeleted: 0,
        };

        var fields = {};
        // //console.log('===========================================');
        // //console.log(conditions);
        // //console.log('===========================================');

        Chapter.find(conditions, fields, function (err, results) {
          if (!err) {
            if (results.length) {
              var ChapterData = results[0];
              var MakingFor = ChapterData.LaunchSettings.MakingFor;
              var ShareMode = ChapterData.LaunchSettings.ShareMode;

              if (ChapterData.LaunchSettings.OthersData.length)
                MakingFor = "OTHERS";

              switch (MakingFor) {
                case "ME":
                  if (
                    ShareMode == "public" ||
                    ShareMode == "friend-solo" ||
                    ShareMode == "friend-group"
                  ) {
                    ShareMode = "invite";
                  }
                  switch (ShareMode) {
                    case "invite":
                      // //console.log("public / friend-solo / friend-group Case........");
                      var invitees = ChapterData.LaunchSettings.Invitees
                        ? ChapterData.LaunchSettings.Invitees
                        : [];
                      chapter__sendInvitations(ChapterData, invitees, req);
                      Chapter.update(
                        { _id: req.headers.chapter_id },
                        {
                          $set: {
                            IsLaunched: true,
                            "LaunchSettings.MakingFor": "ME",
                          },
                        },
                        { multi: false },
                        function (err, numAffected) {
                          if (err) {
                            var response = {
                              status: 501,
                              message: "Something went wrong.",
                            };
                            res.json(response);
                          } else {
                            var response = {
                              status: 200,
                              message:
                                "Chapter has been launched successfully.",
                              result: results,
                            };
                            res.json(response);
                          }
                        }
                      );
                      break;

                    case "private":
                      // //console.log("No need to do anything.. It's private area.");
                      Chapter.update(
                        { _id: req.headers.chapter_id },
                        {
                          $set: {
                            IsLaunched: true,
                            "LaunchSettings.MakingFor": "ME",
                          },
                        },
                        { multi: false },
                        function (err, numAffected) {
                          if (err) {
                            var response = {
                              status: 501,
                              message: "Something went wrong.",
                            };
                            res.json(response);
                          } else {
                            var response = {
                              status: 200,
                              message:
                                "Chapter has been launched successfully.",
                              result: results,
                            };
                            res.json(response);
                          }
                        }
                      );
                      break;

                    default:
                      // //console.log("Error on ShareMode = ", ShareMode);
                      var response = {
                        status: 501,
                        message: "Something went wrong.",
                      };
                      res.json(response);
                      return;
                  }
                  break;

                case "OTHERS":
                  // //console.log("--------------------------OTHERS CASE----------------------------");
                  //create a new instance of the chapter for each other user
                  var OtherUsers = ChapterData.LaunchSettings.OthersData
                    ? ChapterData.LaunchSettings.OthersData
                    : [];
                  if (OtherUsers.length) {
                    for (var loop = 0; loop < OtherUsers.length; loop++) {
                      var owner = OtherUsers[loop];
                      chapter__createNewInstance(ChapterData, owner, req);
                      //update the chapter's IsLaunched Key value.
                    }
                    Chapter.update(
                      { _id: req.headers.chapter_id },
                      {
                        $set: {
                          IsLaunched: true,
                          "LaunchSettings.MakingFor": "OTHERS",
                        },
                      },
                      { multi: false },
                      function (err, numAffected) {
                        if (err) {
                          var response = {
                            status: 501,
                            message: "Something went wrong.",
                          };
                          res.json(response);
                        } else {
                          var response = {
                            status: 200,
                            message: "Chapter has been launched successfully.",
                            result: results,
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
                  break;

                default:
                  // //console.log("ERROR on MakingFor = ", MakingFor);
                  var response = {
                    status: 501,
                    message: "Something went wrong.",
                  };
                  res.json(response);
                  return;
              }
            } else {
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          } else {
            // //console.log(err);
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          }
        });
      }
    }
  );
};

var capsuleLaunchEngine = function (__capsuleId, MakingFor, req, res) {
  // //console.log("------capsule----------LaunchEngine-------");
  switch (MakingFor) {
    case "ME":
      chapterLaunchEngine(__capsuleId, MakingFor, req, res);
      break;

    case "OTHERS":
      var order = {};
      var orderInit = {};

      var OrderInitiatedFrom = req.body.OrderInitiatedFrom
        ? req.body.OrderInitiatedFrom
        : null;
      var OrderCreatedById = req.session.user._id ? req.session.user._id : null;
      var OrderCreatedByEmail = req.session.user.Email
        ? req.session.user.Email
        : null;

      var TotalPayment = req.body.TotalPayment ? req.body.TotalPayment : null;
      var OrderOwners = req.body.owners ? req.body.owners : [];
      var UniqueIds = req.body.uniqueIds ? req.body.uniqueIds : [];

      var CapsuleId = req.body.capsule_id ? req.body.capsule_id : __capsuleId;
      //var CapsulePrice = req.body.capsulePrice ? req.body.capsulePrice : null;
      var CREATE_Others_Commission = process.REVENUE_MODEL_CONFIG
        .CREATE_Others_Commission
        ? parseFloat(
            process.REVENUE_MODEL_CONFIG.CREATE_Others_Commission
          ).toFixed(2)
        : null;

      var Owners = [];
      for (var i = 0; i < OrderOwners.length; i++) {
        // //console.log("LOOP = " + i);
        Owners[i] = {
          //OwnerId:OrderOwners[i]._id,
          OwnerName: OrderOwners[i].UserName ? OrderOwners[i].UserName : null,
          OwnerEmail: OrderOwners[i].UserEmail,
          UniqueIdPerOwner: UniqueIds[i],
        };
      }

      var totalPaymentPerCapsule = parseFloat(
        CREATE_Others_Commission * OrderOwners.length
      ).toFixed(2); //server side validation

      order.OrderInitiatedFrom = OrderInitiatedFrom;
      order.CreatedById = OrderCreatedById;
      order.CreatedByEmail = OrderCreatedByEmail;
      order.TransactionState = "Initiated";
      order.Status = true;
      order.UpdatedOn = Date.now();
      order.CartItems = [];
      order.CartItems.push({
        CapsuleId: CapsuleId,
        TotalPayment: totalPaymentPerCapsule,
        Price: 0,
        PlatformCommission: totalPaymentPerCapsule,
        Owners: Owners,
        CapsuleCreatedBy: req.session.user._id, //this will be helpful when we will get mySales data for the capsule Creator
      });
      // //console.log("order.CartItems = " + order.CartItems);

      order.TotalPayment = 0;
      order.TotalPlatformCommission = 0;
      for (var loop = 0; loop < order.CartItems.length; loop++) {
        order.TotalPayment += order.CartItems[loop].TotalPayment;
        order.TotalPlatformCommission +=
          order.CartItems[loop].PlatformCommission;
      }

      console.log("order", order);
      Order(order)
        .save()
        .then((result) => {
          var token = null;
          var email = null;

          req.body.token = req.body.token ? req.body.token : null;

          if (req.body.token == "trial") {
            //Trial Publish for test convinience
            getStripe().tokens.create(
              {
                card: {
                  number: "4242424242424242",
                  exp_month: 12,
                  exp_year: 2035,
                  cvc: "123",
                },
              },
              function (err, tokenObj) {
                if (err) {
                  console.error('❌ Stripe token creation failed:', err.message);
                  return res.status(500).json({
                    status: 500,
                    message: 'Payment processing failed',
                    error: err.message
                  });
                }
                console.log("-----------tokenObj---------", tokenObj);
                // asynchronously called
                token = tokenObj.id;
                email = req.session.user.Email;
                createCharges();
              }
            );
          } else {
            token = req.body.token ? req.body.token : null;
            email = req.body.tokenEmail
              ? req.body.tokenEmail
              : req.session.user.Email;
            createCharges();
          }

          function createCharges() {
            console.log("tokentokentokentokentokentoken-------------", token);
            getStripe().customers
              .create({
                source: token,
                description: email,
              })
              .then(function (customer) {
                console.log('✅ Stripe customer created:', customer.id);
                try {
                  return getStripe().charges.create({
                    amount: parseInt(order.TotalPayment * 100), // Amount in cents
                    currency: "usd",
                    customer: customer.id,
                  });
                } catch (e) {
                  var response = {
                    status: 200,
                    message: "Payement catch 1 successfully",
                    error: e,
                  };
                  res.json(response);
                }
              })
              .then(function (charge) {
                orderInit.PGatewayResult = charge;
                if (charge.paid && charge.failure_code == null) {
                  orderInit.TransactionState = "Completed";
                  var message = "Payment completed successfully";
                  var status = 200;

                  var conditions = {
                    _id: __capsuleId,
                  };
                  var fields = {};
                  Capsule.find(conditions, fields)
                    .then(async (results) => {
                      if (results.length) {
                        var CapsuleData = results[0];
                        //OthersData
                        // //console.log("CapsuleData.LaunchSettings == ", CapsuleData);
                        var OtherUsers = CapsuleData.LaunchSettings.OthersData
                          ? CapsuleData.LaunchSettings.OthersData
                          : [];

                        //coding error - need to fix
                        if (!OtherUsers.length)
                          var OtherUsers = CapsuleData.LaunchSettings.Invitees
                            ? CapsuleData.LaunchSettings.Invitees
                            : [];
                        //coding error - need to fix

                        if (OtherUsers.length) {
                          for (var loop = 0; loop < OtherUsers.length; loop++) {
                            var owner = OtherUsers[loop];
                            var UniqueIdPerOwner = UniqueIds[loop]
                              ? UniqueIds[loop]
                              : null;
                            owner.UniqueIdPerOwner = UniqueIdPerOwner;
                            // Use the modern function without await for now to avoid async issues
                            createCapsuleInstance(CapsuleData, owner, req).catch(err => {
                              console.error("Error creating capsule instance:", err);
                            });
                          }
                        } else {
                          var response = {
                            status: 501,
                            message: "No users found for capsule creation.",
                          };
                          console.log("125-------------", response);
                          res.json(response);
                          return;
                        }
                        Capsule.updateOne(
                          { _id: __capsuleId },
                          {
                            $set: {
                              IsPublished: true,
                              IsLaunched: true,
                              "LaunchSettings.Audience": "OTHERS",
                            },
                          }
                        )
                          .then((result) => {
                            Chapter.updateMany(
                              {
                                CapsuleId: __capsuleId,
                                Status: true,
                                IsDeleted: false,
                              },
                              {
                                $set: {
                                  IsLaunched: true,
                                  "LaunchSettings.MakingFor": "OTHERS",
                                },
                              }
                            )
                              .then((chapterResult) => {
                                var response = {
                                  status: 200,
                                  message:
                                    "Capsule has been published successfully.",
                                  result: results,
                                };
                                res.json(response);
                              })
                              .catch((err) => {
                                var response = {
                                  status: 501,
                                  message: "Something went wrong.",
                                };
                                console.log("123000-------------", response);
                                res.json(response);
                              });
                          })
                          .catch((err) => {
                            var response = {
                              status: 501,
                              message: "Something went wrong.",
                            };
                            console.log("123-------------", response);
                            res.json(response);
                          });
                      } else {
                        var response = {
                          status: 501,
                          message: err,
                        };
                        console.log("126-------------", response);
                        res.json(response);
                      }
                    })
                    .catch((err) => {
                      var response = {
                        status: 501,
                        message: err,
                      };
                      res.json(response);
                      console.log("127-------------", response);
                    });
                } else {
                  orderInit.TransactionState = "Failed";
                  var message = charge.failure_message
                    ? charge.failure_message
                    : null;
                  var status = charge.failure_code ? charge.failure_code : null;
                }

                //setTimeout(function(){
                Order.updateOne(
                  { _id: new mongoose.Types.ObjectId(result._id) },
                  { $set: orderInit }
                )
                  .then(function (result) {
                    if (result) {
                      var response = {
                        status: status,
                        message: message,
                        result: result,
                      };
                      console.log("response1", response);
                    } else {
                      console.log(
                        "11111111111111111111111111111----------------",
                        err
                      );
                      var response = {
                        status: status,
                        message: message,
                        result: err,
                      };
                      console.log("response2", response);
                    }
                  })
                  .catch(function (err) {
                    console.error("Error updating order:", err);
                  });
              })
              .catch(function(stripeError) {
                console.error('❌ Stripe Promise Chain Error:', stripeError.message);
                console.error('   Type:', stripeError.type);
                console.error('   Code:', stripeError.code);
                return res.status(500).json({
                  status: 500,
                  message: 'Payment processing failed',
                  error: stripeError.message,
                  stripeError: {
                    type: stripeError.type,
                    code: stripeError.code
                  }
                });
              });
          }
        })
        .catch((err) => {
          console.log(
            "0000000000000000000000000000000000----------------",
            err
          );
        });
      break;

    case "BUYERS":
      console.log("---------------PUBLIC / BUYERS CASE-----------");
      var finalSetData = {
        IsPublished: true,
        IsLaunched: true,
        ModifiedOn: Date.now(),
        "LaunchSettings.Audience": req.body.makingFor
          ? req.body.makingFor
          : "OTHERS",
      };
      if (req.body.token === "trial") {
        finalSetData.Price = 0;
        console.log(
          "Final Capsule Update: Setting Price=0 for trial publish. Capsule ID:",
          __capsuleId
        );
      } else {
        console.log(
          "Final Capsule Update: Paid flow; Price remains unchanged. Capsule ID:",
          __capsuleId
        );
      }
      Capsule.updateOne(
        { _id: __capsuleId },
        { $set: finalSetData }
      )
        .then((numAffected) => {
          console.log(
            "Final capsule update successful. Capsule ID:",
            __capsuleId
          );
          var chapterSetData = {
            IsLaunched: true,
            "LaunchSettings.MakingFor": finalSetData["LaunchSettings.Audience"]
          };
          
          Chapter.updateMany(
            { CapsuleId: __capsuleId, Status: true, IsDeleted: false },
            { $set: chapterSetData }
          )
            .then((numAffectedChapters) => {
              var response = {
                status: 200,
                message: "Capsule has been published successfully.",
              };
              res.json(response);
            })
            .catch((errChapter) => {
              console.error(
                "Error updating chapters after capsule publish:",
                errChapter
              );
              var response = {
                status: 501,
                message: "Capsule published, but failed to update chapters.",
              };
              res.json(response);
            });
        })
        .catch((err) => {
          console.error("Error in capsuleLaunchEngine:", err);
          var response = {
            status: 501,
            message: "Failed to publish capsule.",
            error: err.message
          };
          res.json(response);
        });
      break;

    case "SUBSCRIBERS":
      // //console.log("---------------SUBSCRIBERS CASE-----------");
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      // //console.log("128-------------", response)
      res.json(response);
      break;

    default:
  }
};

var chapterLaunchEngine = function (__capsuleId, MakingFor, req, res) {
  // //console.log("------chapterLaunchEngine-------");
  var conditions = {
    CapsuleId: __capsuleId,
    IsLaunched: 0, //IsLaunched = true means the batch invitations have been sent.
    Status: 1,
    IsDeleted: 0,
  };

  var fields = {};
  // //console.log('===========================================');
  // //console.log(conditions);
  // //console.log('===========================================');

  Chapter.find(conditions, fields, function (err, results) {
    if (!err) {
      if (results.length) {
        for (var loop = 0; loop < results.length; loop++) {
          var ChapterData = results[loop];

          //added on 24th JAN 2017 - Now Auto Name replace filter is available for all cases of publish
          MEcapsule__updatePageNamesAsPerFilterRule(ChapterData._id, req);

          //var MakingFor = ChapterData.LaunchSettings.MakingFor;
          var ShareMode = ChapterData.LaunchSettings.ShareMode;
          var __chapterId = ChapterData._id;

          if (
            ShareMode == "public" ||
            ShareMode == "friend-solo" ||
            ShareMode == "friend-group"
          ) {
            ShareMode = "invite";
          }
          switch (ShareMode) {
            case "invite":
              // //console.log("public / friend-solo / friend-group Case........");
              var invitees = ChapterData.LaunchSettings.Invitees
                ? ChapterData.LaunchSettings.Invitees
                : [];
              chapter__sendInvitations(ChapterData, invitees, req);
              Chapter.updateOne(
                { _id: __chapterId },
                {
                  $set: {
                    IsLaunched: true,
                    "LaunchSettings.MakingFor": "ME",
                    ModifiedOn: Date.now(),
                  },
                },
                { multi: false },
                function (err, numAffected) {
                  if (err) {
                    var response = {
                      status: 501,
                      message: "Something went wrong.",
                    };
                    // //console.log("129-------------", response)
                  } else {
                    var response = {
                      status: 200,
                      message: "Chapter has been launched successfully.",
                      result: results,
                    };
                    // //console.log(response);
                  }
                }
              );
              break;

            case "private":
              // //console.log("No need to do anything.. It's private area.");
              Chapter.updateOne(
                { _id: __chapterId },
                {
                  $set: {
                    IsLaunched: true,
                    "LaunchSettings.MakingFor": "ME",
                    ModifiedOn: Date.now(),
                  },
                },
                { multi: false },
                function (err, numAffected) {
                  if (err) {
                    var response = {
                      status: 501,
                      message: "Something went wrong.",
                    };
                    // //console.log("130-------------", response)
                  } else {
                    var response = {
                      status: 200,
                      message: "Chapter has been launched successfully.",
                      result: results,
                    };
                    // //console.log(response);
                  }
                }
              );
              break;

            default:
              // //console.log("Error on ShareMode = ", ShareMode);
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
            // //console.log("131-------------", response);
            //return;
          }

          // //console.log("loop = " + loop + " ---results.length - 1 = " + results.length - 1);

          if (loop == results.length - 1) {
            var setData = {};
            switch (MakingFor) {
              case "ME":
                setData = {
                  IsPublished: true,
                  IsLaunched: true,
                  ModifiedOn: Date.now(),
                };
                break;

              case "OTHERS":
                setData = {
                  IsPublished: true,
                  ModifiedOn: Date.now(),
                };
                break;

              case "BUYERS":
                setData = {
                  IsPublished: true,
                  ModifiedOn: Date.now(),
                };
                break;

              case "SUBSCRIBERS":
                setData = {
                  IsPublished: true,
                  ModifiedOn: Date.now(),
                };
                break;

              default:

              // //console.log("ERROR--------------9798875765764564544654");
            }

            // //console.log("setData = ", setData);
            Capsule.updateOne(
              { _id: __capsuleId },
              { $set: setData }
            )
              .then((numAffected) => {
                var response = {
                  status: 200,
                  message: "Capsule has been published successfully.",
                  result: results,
                };
                res.json(response);
              })
              .catch((err) => {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
                // //console.log("133-------------", response);
              });
          }
        }
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    } else {
      // //console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

const publishV2 = async (req, res) => {
  try {
    const __capsuleId = req.headers.capsule_id ? req.headers.capsule_id : "0";
    
    if (!__capsuleId || __capsuleId === "0") {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers."
      });
    }
    
    console.log("📢 Publishing capsule:", __capsuleId);
    
    // Fetch existing capsule to get its settings
    const capsule = await Capsule.findById(__capsuleId);
    
    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found."
      });
    }
    
    // Get makingFor from existing capsule settings (or allow override from body)
    const makingFor = req.body.makingFor || capsule.LaunchSettings?.Audience || "ME";
    
    console.log("📢 Publishing for audience:", makingFor);
    
    // If body contains settings, update them (optional - for backward compatibility)
    if (req.body.title || req.body.price !== undefined || req.body.makingFor) {
      const setObj = {};
      
      // Only update fields that are provided in the body
      if (req.body.title) setObj.Title = req.body.title;
      if (req.body.makingFor) setObj["LaunchSettings.Audience"] = req.body.makingFor;
      if (req.body.CapsuleFor) setObj["LaunchSettings.CapsuleFor"] = req.body.CapsuleFor;
      if (req.body.StreamType !== undefined) setObj["LaunchSettings.StreamType"] = req.body.StreamType || "";
      if (req.body.participation) setObj["LaunchSettings.ShareMode"] = req.body.participation;
      if (req.body.StreamFlow) setObj["StreamFlow"] = req.body.StreamFlow;
      if (req.body.OwnerAnswer !== undefined) setObj["OwnerAnswer"] = req.body.OwnerAnswer;
      if (req.body.IsOwnerPostsForMember !== undefined) setObj["IsOwnerPostsForMember"] = req.body.IsOwnerPostsForMember;
      if (req.body.IsPurchaseNeededForAllPosts !== undefined) setObj["IsPurchaseNeededForAllPosts"] = req.body.IsPurchaseNeededForAllPosts;
      if (req.body.Frequency) setObj["Frequency"] = req.body.Frequency;
      if (req.body.MonthFor) setObj["MonthFor"] = req.body.MonthFor;
      if (req.body.DiscountPrice !== undefined) setObj.DiscountPrice = parseFloat(req.body.DiscountPrice);
      
      // Handle price (don't override to 0 for BUYERS unless explicitly provided)
      if (req.body.price !== undefined) {
        const price = parseFloat(req.body.price);
        if (!(makingFor === "BUYERS" && price === 0)) {
          setObj.Price = price;
        }
      }
      
      // Handle OwnerBirthday
      if (req.body.LaunchSettings?.OwnerBirthday) {
        setObj["LaunchSettings.OwnerBirthday"] = req.body.LaunchSettings.OwnerBirthday;
      }
      
      // Handle OthersData
      if (req.body.LaunchSettings?.OthersData) {
        setObj["LaunchSettings.OthersData"] = req.body.LaunchSettings.OthersData;
      }
      
      if (Object.keys(setObj).length > 0) {
        setObj.ModifiedOn = Date.now();
        await Capsule.updateOne({ _id: __capsuleId }, { $set: setObj });
        console.log("📝 Updated capsule settings before publishing");
      }
    }
    
    // Now trigger the actual publishing/launch process
    // This is the MAIN purpose of this endpoint
    capsuleLaunchEngine(__capsuleId, makingFor, req, res);
    
  } catch (err) {
    console.error("❌ Error in publishV2:", err);
    res.json({
      status: 501,
      message: "Something went wrong.",
      error: err.message
    });
  }
};
/*________________________________________________________________________
   * @Date:      		21 October 2015
   * @Method :   		capsule__checkCompleteness
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var __getObjArrayIdxByKey = function (ObjArr, matchKey, matchVal) {
  var idx;
  for (var loop = 0; loop < ObjArr.length; loop++) {
    var data = ObjArr[loop];
    if (data.hasOwnProperty(matchKey)) {
      if (data[matchKey] == matchVal) {
        idx = loop;
        break;
      }
    }
  }
  return idx;
};

const capsule__checkCompleteness = async (req, res) => {
  try {
    const capsuleId = req.headers.capsule_id
    if (!capsuleId) {
      return res.json({
        status: 400,
        message: "Capsule id is required.",
      })
    }

    const capsule = await Capsule.findOne({ _id: capsuleId, Status: true, IsDeleted: false }).select("_id").lean()
    if (!capsule) {
      return res.json({
        status: 404,
        message: "Capsule not found or inactive.",
      })
    }

    const chapters = await Chapter.find({ CapsuleId: capsuleId, Status: 1, IsDeleted: 0 }).select("_id").lean()
    if (!chapters.length) {
      return res.json({
        status: 400,
        message:
          "Error: It seems like you have no chapter in this capsule. Please add at least one chapter and one page into the chapter and publish again.",
      })
    }

    const chapterIds = chapters.map((chapter) => chapter._id.toString())

    const pages = await Page.find({
      ChapterId: { $in: chapterIds },
      IsDeleted: 0,
      PageType: { $in: ["gallery", "content"] },
    })
      .select("ChapterId")
      .lean()

    const pageCountByChapter = new Map()
    for (const page of pages) {
      const chapterId = page.ChapterId
      pageCountByChapter.set(chapterId, (pageCountByChapter.get(chapterId) || 0) + 1)
    }

    const missingChapter = chapterIds.find((chapterId) => !pageCountByChapter.has(chapterId))
    if (missingChapter) {
      return res.json({
        status: 400,
        message:
          "Error: It seems like you have at least one chapter without a page. Please add at least one page into the empty chapter or delete the chapter and publish again.",
      })
    }

    return res.json({
      status: 200,
      message: "Capsule is complete to publish.",
    })
  } catch (error) {
    console.error("capsule__checkCompleteness error:", error)
    return res.json({
      status: 500,
      message: "Something went wrong.",
    })
  }
}

//Jack / Jill replacement.
var MEcapsule__updatePageNamesAsPerFilterRule = function (__chapterId, req) {
  var __chapterId = __chapterId ? __chapterId : "undefined";
  //// //console.log("owner = ",owner);

  //check if the owner is register or not
  var UserData = req.session.user ? req.session.user : {};
  if (UserData.Email) {
    //pages under chapters
    var conditions = {
      ChapterId: __chapterId,
      OwnerId: UserData._id,
      IsDeleted: 0,
      PageType: { $in: ["gallery", "content", "qaw-gallery"] },
    };
    var sortObj = {
      Order: 1,
      UpdatedOn: -1,
    };
    var fields = {
      _id: true,
      PageType: true,
      Title: true,
      ViewportDesktopSections: true,
      ViewportTabletSections: true,
      ViewportMobileSections: true,
    };

    Page.find(conditions, fields)
      .sort(sortObj)
      .exec(function (err, results) {
        if (!err) {
          var fields = {
            _id: true,
            Title: true,
            PageType: true,
            ViewportDesktopSections: true,
            ViewportTabletSections: true,
            ViewportMobileSections: true,
          };
          for (var loop = 0; loop < results.length; loop++) {
            var conditions = {};
            conditions._id = results[loop]._id;
            var PageType = results[loop].PageType;

            var data = {};
            data.Title = results[loop].Title;

            //AUTO NAME REPLACE FILTER
            if (PageType == "gallery" || PageType == "qaw-gallery") {
              var OwnerGender = UserData.Gender ? UserData.Gender : "male";
              var OwnerName = UserData.Name
                ? UserData.Name.split(" ")[0]
                : "OWNER";
              var str = data.Title;
              var res = str;
              if (OwnerGender == "male") {
                res = res.replace(/\bJack\b/g, OwnerName);
                res = res.replace(/\bJill\b/g, OwnerName);
                res = res.replace(/\bShe\b/g, "He");
                res = res.replace(/\bshe\b/g, "he");
                res = res.replace(/\bher\b/g, "his");
                res = res.replace(/\bHer\b/g, "His");
                res = res.replace(/\bherself\b/g, "himself");
                res = res.replace(/\bHerself\b/g, "Himself");
              } else if (OwnerGender == "female") {
                res = res.replace(/\bJack\b/g, OwnerName);
                res = res.replace(/\bJill\b/g, OwnerName);
                res = res.replace(/\bHe\b/g, "She");
                res = res.replace(/\bhe\b/g, "she");
                res = res.replace(/\bhis\b/g, "her");
                res = res.replace(/\bHis\b/g, "Her");
                res = res.replace(/\bhim\b/g, "her");
                res = res.replace(/\bHim\b/g, "Her");
                res = res.replace(/\bhimself\b/g, "herself");
                res = res.replace(/\bHimself\b/g, "Herself");
              } else {
                res = res.replace(/\bJack\b/g, OwnerName);
                res = res.replace(/\bJill\b/g, OwnerName);
                res = res.replace(/\bHe\b/g, "They");
                res = res.replace(/\bhe\b/g, "they");
                res = res.replace(/\bHe is\b/g, "They are");
                res = res.replace(/\bhe is\b/g, "they are");
                res = res.replace(/\bhis\b/g, "their");
                res = res.replace(/\bHis\b/g, "Their");
                res = res.replace(/\bhim\b/g, "them");
                res = res.replace(/\bHim\b/g, "Them");
                res = res.replace(/\bhimself\b/g, "themselves");
                res = res.replace(/\bHimself\b/g, "Themselves");

                res = res.replace(/\bShe\b/g, "They");
                res = res.replace(/\bshe\b/g, "they");
                res = res.replace(/\bShe is\b/g, "They are");
                res = res.replace(/\bshe is\b/g, "they are");
                res = res.replace(/\bher\b/g, "them");
                res = res.replace(/\bHer\b/g, "Their");
                res = res.replace(/\bherself\b/g, "himself");
                res = res.replace(/\bHerself\b/g, "Himself");
              }
              data.Title = res;
            } else if (PageType == "content") {
              var OwnerGender = UserData.Gender ? UserData.Gender : "male";
              var OwnerName = UserData.Name
                ? UserData.Name.split(" ")[0]
                : "OWNER";
              var str = data.Title;
              var res = str;
              if (OwnerGender == "male") {
                res = res.replace(/\bJack\b/g, OwnerName);
                res = res.replace(/\bJill\b/g, OwnerName);
                res = res.replace(/\bShe\b/g, "He");
                res = res.replace(/\bshe\b/g, "he");
                res = res.replace(/\bher\b/g, "his");
                res = res.replace(/\bHer\b/g, "His");
                res = res.replace(/\bherself\b/g, "himself");
                res = res.replace(/\bHerself\b/g, "Himself");
              } else if (OwnerGender == "female") {
                res = res.replace(/\bJack\b/g, OwnerName);
                res = res.replace(/\bJill\b/g, OwnerName);
                res = res.replace(/\bHe\b/g, "She");
                res = res.replace(/\bhe\b/g, "she");
                res = res.replace(/\bhis\b/g, "her");
                res = res.replace(/\bHis\b/g, "Her");
                res = res.replace(/\bhim\b/g, "her");
                res = res.replace(/\bHim\b/g, "Her");
                res = res.replace(/\bhimself\b/g, "herself");
                res = res.replace(/\bHimself\b/g, "Herself");
              } else {
                res = res.replace(/\bJack\b/g, OwnerName);
                res = res.replace(/\bJill\b/g, OwnerName);
                res = res.replace(/\bHe\b/g, "They");
                res = res.replace(/\bhe\b/g, "they");
                res = res.replace(/\bHe is\b/g, "They are");
                res = res.replace(/\bhe is\b/g, "they are");
                res = res.replace(/\bhis\b/g, "their");
                res = res.replace(/\bHis\b/g, "Their");
                res = res.replace(/\bhim\b/g, "them");
                res = res.replace(/\bHim\b/g, "Them");
                res = res.replace(/\bhimself\b/g, "themselves");
                res = res.replace(/\bHimself\b/g, "Themselves");

                res = res.replace(/\bShe\b/g, "They");
                res = res.replace(/\bshe\b/g, "they");
                res = res.replace(/\bShe is\b/g, "They are");
                res = res.replace(/\bshe is\b/g, "they are");
                res = res.replace(/\bher\b/g, "them");
                res = res.replace(/\bHer\b/g, "Their");
                res = res.replace(/\bherself\b/g, "himself");
                res = res.replace(/\bHerself\b/g, "Himself");
              }
              data.Title = res;

              //Now replace the question text if any check under all viewport Sections...
              data.ViewportDesktopSections = results[loop]
                .ViewportDesktopSections
                ? results[loop].ViewportDesktopSections
                : [];
              data.ViewportTabletSections = results[loop].ViewportTabletSections
                ? results[loop].ViewportTabletSections
                : [];
              data.ViewportMobileSections = results[loop].ViewportMobileSections
                ? results[loop].ViewportMobileSections
                : [];

              //1) for desktop viewport
              var ViewportDesktopSections = data.ViewportDesktopSections
                ? data.ViewportDesktopSections
                : {};
              ViewportDesktopSections.Widgets = data.ViewportDesktopSections
                .Widgets
                ? data.ViewportDesktopSections.Widgets
                : [];

              var ViewportTabletSections = data.ViewportTabletSections
                ? data.ViewportTabletSections
                : {};
              ViewportTabletSections.Widgets = data.ViewportTabletSections
                .Widgets
                ? data.ViewportTabletSections.Widgets
                : [];

              var ViewportMobileSections = data.ViewportMobileSections
                ? data.ViewportMobileSections
                : {};
              ViewportMobileSections.Widgets = data.ViewportMobileSections
                .Widgets
                ? data.ViewportMobileSections.Widgets
                : [];

              //check if we have QA widget anything
              for (
                var loop1 = 0;
                loop1 < ViewportDesktopSections.Widgets.length;
                loop1++
              ) {
                if (
                  ViewportDesktopSections.Widgets[loop1].Type == "questAnswer"
                ) {
                  var str = data.ViewportDesktopSections.Widgets[loop1].Data
                    ? data.ViewportDesktopSections.Widgets[loop1].Data
                    : "";
                  var res = str;
                  if (OwnerGender == "male") {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bShe\b/g, "He");
                    res = res.replace(/\bshe\b/g, "he");
                    res = res.replace(/\bher\b/g, "his");
                    res = res.replace(/\bHer\b/g, "His");
                    res = res.replace(/\bherself\b/g, "himself");
                    res = res.replace(/\bHerself\b/g, "Himself");
                  } else if (OwnerGender == "female") {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bHe\b/g, "She");
                    res = res.replace(/\bhe\b/g, "she");
                    res = res.replace(/\bhis\b/g, "her");
                    res = res.replace(/\bHis\b/g, "Her");
                    res = res.replace(/\bhim\b/g, "her");
                    res = res.replace(/\bHim\b/g, "Her");
                    res = res.replace(/\bhimself\b/g, "herself");
                    res = res.replace(/\bHimself\b/g, "Herself");
                  } else {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bHe\b/g, "They");
                    res = res.replace(/\bhe\b/g, "they");
                    res = res.replace(/\bHe is\b/g, "They are");
                    res = res.replace(/\bhe is\b/g, "they are");
                    res = res.replace(/\bhis\b/g, "their");
                    res = res.replace(/\bHis\b/g, "Their");
                    res = res.replace(/\bhim\b/g, "them");
                    res = res.replace(/\bHim\b/g, "Them");
                    res = res.replace(/\bhimself\b/g, "themselves");
                    res = res.replace(/\bHimself\b/g, "Themselves");

                    res = res.replace(/\bShe\b/g, "They");
                    res = res.replace(/\bshe\b/g, "they");
                    res = res.replace(/\bShe is\b/g, "They are");
                    res = res.replace(/\bshe is\b/g, "they are");
                    res = res.replace(/\bher\b/g, "them");
                    res = res.replace(/\bHer\b/g, "Their");
                    res = res.replace(/\bherself\b/g, "himself");
                    res = res.replace(/\bHerself\b/g, "Himself");
                  }
                  data.ViewportDesktopSections.Widgets[loop1].Data = res;
                }
              }

              //2) for tablet viewport
              for (
                var loop1 = 0;
                loop1 < ViewportTabletSections.Widgets.length;
                loop1++
              ) {
                if (
                  ViewportTabletSections.Widgets[loop1].Type == "questAnswer"
                ) {
                  var str = data.ViewportTabletSections.Widgets[loop1].Data
                    ? data.ViewportTabletSections.Widgets[loop1].Data
                    : "";
                  var res = str;
                  if (OwnerGender == "male") {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bShe\b/g, "He");
                    res = res.replace(/\bshe\b/g, "he");
                    res = res.replace(/\bher\b/g, "his");
                    res = res.replace(/\bHer\b/g, "His");
                    res = res.replace(/\bherself\b/g, "himself");
                    res = res.replace(/\bHerself\b/g, "Himself");
                  } else if (OwnerGender == "female") {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bHe\b/g, "She");
                    res = res.replace(/\bhe\b/g, "she");
                    res = res.replace(/\bhis\b/g, "her");
                    res = res.replace(/\bHis\b/g, "Her");
                    res = res.replace(/\bhim\b/g, "her");
                    res = res.replace(/\bHim\b/g, "Her");
                    res = res.replace(/\bhimself\b/g, "herself");
                    res = res.replace(/\bHimself\b/g, "Herself");
                  } else {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bHe\b/g, "They");
                    res = res.replace(/\bhe\b/g, "they");
                    res = res.replace(/\bHe is\b/g, "They are");
                    res = res.replace(/\bhe is\b/g, "they are");
                    res = res.replace(/\bhis\b/g, "their");
                    res = res.replace(/\bHis\b/g, "Their");
                    res = res.replace(/\bhim\b/g, "them");
                    res = res.replace(/\bHim\b/g, "Them");
                    res = res.replace(/\bhimself\b/g, "themselves");
                    res = res.replace(/\bHimself\b/g, "Themselves");

                    res = res.replace(/\bShe\b/g, "They");
                    res = res.replace(/\bshe\b/g, "they");
                    res = res.replace(/\bShe is\b/g, "They are");
                    res = res.replace(/\bshe is\b/g, "they are");
                    res = res.replace(/\bher\b/g, "them");
                    res = res.replace(/\bHer\b/g, "Their");
                    res = res.replace(/\bherself\b/g, "himself");
                    res = res.replace(/\bHerself\b/g, "Himself");
                  }
                  data.ViewportTabletSections.Widgets[loop1].Data = res;
                }
              }

              //3) for mobile viewport
              for (
                var loop1 = 0;
                loop1 < ViewportMobileSections.Widgets.length;
                loop1++
              ) {
                if (
                  ViewportMobileSections.Widgets[loop1].Type == "questAnswer"
                ) {
                  var str = data.ViewportMobileSections.Widgets[loop1].Data
                    ? data.ViewportMobileSections.Widgets[loop1].Data
                    : "";
                  var res = str;
                  if (OwnerGender == "male") {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bShe\b/g, "He");
                    res = res.replace(/\bshe\b/g, "he");
                    res = res.replace(/\bher\b/g, "his");
                    res = res.replace(/\bHer\b/g, "His");
                    res = res.replace(/\bherself\b/g, "himself");
                    res = res.replace(/\bHerself\b/g, "Himself");
                  } else if (OwnerGender == "female") {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bHe\b/g, "She");
                    res = res.replace(/\bhe\b/g, "she");
                    res = res.replace(/\bhis\b/g, "her");
                    res = res.replace(/\bHis\b/g, "Her");
                    res = res.replace(/\bhim\b/g, "her");
                    res = res.replace(/\bHim\b/g, "Her");
                    res = res.replace(/\bhimself\b/g, "herself");
                    res = res.replace(/\bHimself\b/g, "Herself");
                  } else {
                    res = res.replace(/\bJack\b/g, OwnerName);
                    res = res.replace(/\bJill\b/g, OwnerName);
                    res = res.replace(/\bHe\b/g, "They");
                    res = res.replace(/\bhe\b/g, "they");
                    res = res.replace(/\bHe is\b/g, "They are");
                    res = res.replace(/\bhe is\b/g, "they are");
                    res = res.replace(/\bhis\b/g, "their");
                    res = res.replace(/\bHis\b/g, "Their");
                    res = res.replace(/\bhim\b/g, "them");
                    res = res.replace(/\bHim\b/g, "Them");
                    res = res.replace(/\bhimself\b/g, "themselves");
                    res = res.replace(/\bHimself\b/g, "Themselves");

                    res = res.replace(/\bShe\b/g, "They");
                    res = res.replace(/\bshe\b/g, "they");
                    res = res.replace(/\bShe is\b/g, "They are");
                    res = res.replace(/\bshe is\b/g, "they are");
                    res = res.replace(/\bher\b/g, "them");
                    res = res.replace(/\bHer\b/g, "Their");
                    res = res.replace(/\bherself\b/g, "himself");
                    res = res.replace(/\bHerself\b/g, "Himself");
                  }
                  data.ViewportMobileSections.Widgets[loop1].Data = res;
                }
              }
            } else {
              //no case
            }

            Page.update(conditions, { $set: data }, function (err, result) {
              if (!err) {
                // //console.log("WE HAVE DONE SOME CHANGES...", result);
              } else {
                // //console.log("ERROR---------------", err);
              }
            });
          }
        } else {
          // //console.log("095944564-----------", err);
        }
      });
  } else {
    // //console.log("09579-----------", UserData);
  }
};

function __getStringAfterNameRuled(str, OwnerGender, OwnerName) {
  var res = str;
  if (OwnerGender == "male") {
    res = res.replace(/\bJack\b/g, OwnerName);
    res = res.replace(/\bJill\b/g, OwnerName);
    res = res.replace(/\bShe\b/g, "He");
    res = res.replace(/\bshe\b/g, "he");
    res = res.replace(/\bher\b/g, "his");
    res = res.replace(/\bHer\b/g, "His");
    res = res.replace(/\bherself\b/g, "himself");
    res = res.replace(/\bHerself\b/g, "Himself");
  } else if (OwnerGender == "female") {
    res = res.replace(/\bJack\b/g, OwnerName);
    res = res.replace(/\bJill\b/g, OwnerName);
    res = res.replace(/\bHe\b/g, "She");
    res = res.replace(/\bhe\b/g, "she");
    res = res.replace(/\bhis\b/g, "her");
    res = res.replace(/\bHis\b/g, "Her");
    res = res.replace(/\bhim\b/g, "her");
    res = res.replace(/\bHim\b/g, "Her");
    res = res.replace(/\bhimself\b/g, "herself");
    res = res.replace(/\bHimself\b/g, "Herself");
  } else {
    res = res.replace(/\bJack\b/g, OwnerName);
    res = res.replace(/\bJill\b/g, OwnerName);
    res = res.replace(/\bHe\b/g, "They");
    res = res.replace(/\bhe\b/g, "they");
    res = res.replace(/\bHe is\b/g, "They are");
    res = res.replace(/\bhe is\b/g, "they are");
    res = res.replace(/\bhis\b/g, "their");
    res = res.replace(/\bHis\b/g, "Their");
    res = res.replace(/\bhim\b/g, "them");
    res = res.replace(/\bHim\b/g, "Them");
    res = res.replace(/\bhimself\b/g, "themselves");
    res = res.replace(/\bHimself\b/g, "Themselves");

    res = res.replace(/\bShe\b/g, "They");
    res = res.replace(/\bshe\b/g, "they");
    res = res.replace(/\bShe is\b/g, "They are");
    res = res.replace(/\bshe is\b/g, "they are");
    res = res.replace(/\bher\b/g, "them");
    res = res.replace(/\bHer\b/g, "Their");
    res = res.replace(/\bherself\b/g, "himself");
    res = res.replace(/\bHerself\b/g, "Himself");
  }
  return res;
}
var buyNow = async function (req, res) {
  // buy your cart.
  console.log(
    "------------------------------ buyNow Called --------------------------------------------"
  );

  try {
    // Check for selective purchase - capsule IDs provided in request
    var selectedCapsuleIds =
      req.body.selectedCapsuleIds || req.body.capsuleIds || [];
    var isSelectivePurchase = selectedCapsuleIds.length > 0;

    console.log("Selective purchase mode:", isSelectivePurchase);
    console.log("Selected capsule IDs:", selectedCapsuleIds);

    // Get shopping cart details at server end (no fraud)
    var conditions = {
      CreatedByEmail: req.session.user.Email ? req.session.user.Email : null,
    };

    var rdm_credit = 0;

    const result = await Cart.findOne(conditions)
      .populate("CartItems.CapsuleId")
      .exec();

    var myCart = result ? result : {};
    myCart.CartItems = myCart.CartItems ? myCart.CartItems : [];

    console.log("Debug: Cart found:", !!result);
    console.log("Debug: Cart items count:", myCart.CartItems.length);
    console.log("Debug: Cart items:", myCart.CartItems);

    if (myCart.CartItems.length > 0) {
      var order = {};
      var orderInit = {};

      var OrderInitiatedFrom = "PGALLARY";
      var OrderCreatedById = req.session.user._id ? req.session.user._id : null;
      var OrderCreatedByEmail = req.session.user.Email
        ? req.session.user.Email
        : null;

      var cartItems = myCart.CartItems.length ? myCart.CartItems : [];

      // Filter cart items for selective purchase
      if (isSelectivePurchase) {
        console.log("Filtering cart items for selective purchase...");
        var filteredCartItems = [];
        var notFoundCapsuleIds = [];

        // Convert selectedCapsuleIds to strings for comparison
        var selectedIdsAsStrings = selectedCapsuleIds.map((id) => String(id));

        for (var i = 0; i < cartItems.length; i++) {
          var cartItemId = String(cartItems[i].CapsuleId._id);
          if (selectedIdsAsStrings.includes(cartItemId)) {
            filteredCartItems.push(cartItems[i]);
          }
        }

        // Check if all selected capsules were found
        for (var j = 0; j < selectedIdsAsStrings.length; j++) {
          var found = false;
          for (var k = 0; k < cartItems.length; k++) {
            if (
              String(cartItems[k].CapsuleId._id) === selectedIdsAsStrings[j]
            ) {
              found = true;
              break;
            }
          }
          if (!found) {
            notFoundCapsuleIds.push(selectedIdsAsStrings[j]);
          }
        }

        // Return error if some selected capsules are not in cart
        if (notFoundCapsuleIds.length > 0) {
          var response = {
            status: 400,
            message: "Some selected capsules are not in your cart.",
            notFoundCapsuleIds: notFoundCapsuleIds,
            availableCapsuleIds: cartItems.map((item) =>
              String(item.CapsuleId._id)
            ),
          };
          return res.json(response);
        }

        // Return error if no capsules found
        if (filteredCartItems.length === 0) {
          var response = {
            status: 400,
            message: "No valid capsules found for purchase.",
            selectedCapsuleIds: selectedCapsuleIds,
            availableCapsuleIds: cartItems.map((item) =>
              String(item.CapsuleId._id)
            ),
          };
          return res.json(response);
        }

        cartItems = filteredCartItems;
        console.log("Filtered cart items count:", cartItems.length);
      }

      var validCartItemsForOrder = [];
      var tempAllCapsuleIds_OnThisOrder = [];
      var cartItemFor = [];

      const subscriberInfo = {
        isSubscriber:
          req.session.user && req.session.user.IsSubscriber === true,
        streamIds: Array.isArray(req.session.user?.SubscriberStreamIds)
          ? req.session.user.SubscriberStreamIds.map((id) => String(id))
          : [],
      };
      if (subscriberInfo.isSubscriber) {
        console.log("[Subscription] Subscriber detected", {
          userId: req.session.user?._id,
          userEmail: req.session.user?.Email,
          totalSavedStreams: subscriberInfo.streamIds.length,
        });
      } else {
        console.log("[Subscription] User is not marked as a platform subscriber", {
          userId: req.session.user?._id,
          userEmail: req.session.user?.Email,
        });
      }
      let hasSubscriberCoveredItems = false;
      let hasPaidItems = false;
      const subscriberCoveredCapsules = [];

      // Iterate over cart items
      console.log(
        "Debug: Starting cart items processing, count:",
        cartItems.length
      );
      for (var loop = 0; loop < cartItems.length; loop++) {
        var cartItemsObj = cartItems[loop];
        cartItemsObj.Owners = cartItemsObj.Owners ? cartItemsObj.Owners : [];

        // If no owners specified, check request body or add current user as owner
        if (cartItemsObj.Owners.length === 0) {
          console.log("Debug: No owners found in cart item");

          // Check if owners are provided in request body
          if (req.body.owners && req.body.owners.length > 0) {
            console.log("Debug: Using owners from request body");
            cartItemsObj.Owners = req.body.owners;
          } else {
            console.log("Debug: Adding current user as owner");
            cartItemsObj.Owners = [
              {
                UserEmail: req.session.user.Email,
                UserName: req.session.user.Name || req.session.user.UserName,
                uniqueId: req.session.user._id.toString() + "_" + Date.now(),
              },
            ];
          }
        }

        console.log(
          "Debug: Processing cart item",
          loop,
          "CapsuleId:",
          cartItemsObj.CapsuleId._id
        );
        console.log("Debug: Cart item price:", cartItemsObj.CapsuleId.Price);
        console.log("Debug: Cart item owners:", cartItemsObj.Owners);
        console.log(
          "Debug: Cart item owners length:",
          cartItemsObj.Owners ? cartItemsObj.Owners.length : 0
        );

        // Use PurchaseFor from request body if available, otherwise from cart item
        var purchaseForValue = req.body.purchaseFor && req.body.purchaseFor[loop] 
          ? req.body.purchaseFor[loop] 
          : cartItemsObj.PurchaseFor;
        cartItemFor.push(purchaseForValue);

        var CartItem_owners = cartItemsObj.Owners.length
          ? cartItemsObj.Owners
          : [];
        var CartItem_capsuleId = cartItemsObj.CapsuleId._id;
        var baseCapsulePrice = parseFloat(
          cartItemsObj.CapsuleId.Price ? cartItemsObj.CapsuleId.Price : 0
        );
        var CartItem_capsulePrice = baseCapsulePrice.toFixed(2);

        var validCartItemsOwners = [];
        var tempAllUniqueIdsPerCart = [];

        console.log("Debug: Processing owners, count:", CartItem_owners.length);
        for (var loop1 = 0; loop1 < CartItem_owners.length; loop1++) {
          var tempObj = CartItem_owners[loop1];
          var neededFormatObj = {
            OwnerEmail: tempObj.UserEmail,
            OwnerName: tempObj.UserName ? tempObj.UserName : null,
            UniqueIdPerOwner: tempObj.uniqueId,
          };
          validCartItemsOwners.push(neededFormatObj);
          tempAllUniqueIdsPerCart.push(neededFormatObj.UniqueIdPerOwner);
        }

        var CartItem_totalOwners = validCartItemsOwners.length;
        var isSubscriberEligible =
          subscriberInfo.isSubscriber &&
          subscriberInfo.streamIds.includes(String(CartItem_capsuleId));

        var CartItem_totalPaymentPerCapsule = "0.00";
        var CartItem_totalCommissionPerCapsule = "0.00";

        if (isSubscriberEligible) {
          console.log(
            "[Subscription] Applying subscriber coverage",
            {
              userId: req.session.user?._id,
              userEmail: req.session.user?.Email,
              capsuleId: String(CartItem_capsuleId),
            }
          );
          console.log(
            "🪄 Subscriber benefit applied for capsule:",
            String(CartItem_capsuleId)
          );
          hasSubscriberCoveredItems = true;
          subscriberCoveredCapsules.push(String(CartItem_capsuleId));
          CartItem_capsulePrice = "0.00";
        } else {
          if (subscriberInfo.isSubscriber) {
            console.log("[Subscription] Capsule not covered by subscriber snapshot", {
              capsuleId: String(CartItem_capsuleId),
              userId: req.session.user?._id,
              userEmail: req.session.user?.Email,
            });
          }
          CartItem_totalPaymentPerCapsule = parseFloat(
            baseCapsulePrice * CartItem_totalOwners
          ).toFixed(2);
          CartItem_totalCommissionPerCapsule = parseFloat(
            (CartItem_totalPaymentPerCapsule *
              (process.REVENUE_MODEL_CONFIG
                ? process.REVENUE_MODEL_CONFIG.PerSale_Commission
                : 35)) /
              100
          ).toFixed(2);

          if (parseFloat(CartItem_totalPaymentPerCapsule) > 0) {
            hasPaidItems = true;
          }
        }

        console.log(
          "Debug: Final validation - Owners:",
          CartItem_totalOwners,
          "TotalPayment:",
          CartItem_totalPaymentPerCapsule,
          "Commission:",
          CartItem_totalCommissionPerCapsule
        );

        var CartItem_capsuleCreatorId = cartItemsObj.CapsuleId.CreaterId;
        console.log(
          "Debug: Cart item validation - Price:",
          CartItem_capsulePrice,
          "TotalPayment:",
          CartItem_totalPaymentPerCapsule,
          "Commission:",
          CartItem_totalCommissionPerCapsule
        );

        if (
          !isSubscriberEligible &&
          (baseCapsulePrice <= 0 ||
            CartItem_totalPaymentPerCapsule <= 0 ||
            CartItem_totalCommissionPerCapsule <= 0)
        ) {
          console.log("Debug: Cart item invalid - skipping");
          // Invalid case - ignore
        } else {
          console.log("Debug: Cart item valid - adding to order");
          var validCartItemsForOrderObj = {
            CapsuleId: CartItem_capsuleId,
            Price: CartItem_capsulePrice,
            TotalPayment: CartItem_totalPaymentPerCapsule,
            PlatformCommission: CartItem_totalCommissionPerCapsule,
            CapsuleCreatedBy: CartItem_capsuleCreatorId,
            Owners: validCartItemsOwners,
            UniqueIdPerOwnerArray: tempAllUniqueIdsPerCart,
            MonthFor: cartItemsObj.MonthFor ? cartItemsObj.MonthFor : "M12",
            Frequency: cartItemsObj.Frequency ? cartItemsObj.Frequency : "high",
            EmailTemplate: cartItemsObj.EmailTemplate
              ? cartItemsObj.EmailTemplate
              : "PracticalThinker",
            IsStreamPaused: cartItemsObj.IsStreamPaused
              ? cartItemsObj.IsStreamPaused
              : 0,
            IsSurpriseGift: cartItemsObj.IsSurpriseGift
              ? cartItemsObj.IsSurpriseGift
              : false,
            StreamFlow: cartItemsObj.CapsuleId.StreamFlow
              ? cartItemsObj.CapsuleId.StreamFlow
              : null,
          };

          validCartItemsForOrder.push(validCartItemsForOrderObj);
          tempAllCapsuleIds_OnThisOrder.push(CartItem_capsuleId);
        }
      }

      req.body.purchaseFor = cartItemFor;

      order.OrderInitiatedFrom = OrderInitiatedFrom;
      order.CreatedById = OrderCreatedById;
      order.CreatedByEmail = OrderCreatedByEmail;
      order.TransactionState = "Initiated";
      order.Status = true;
      order.UpdatedOn = Date.now();
      order.CartItems = validCartItemsForOrder;
      order.AllCapsuleIds = tempAllCapsuleIds_OnThisOrder;

      console.log(
        "Debug: validCartItemsForOrder length:",
        validCartItemsForOrder.length
      );
      console.log("Debug: order.CartItems length:", order.CartItems.length);
      console.log("Debug: cartItems length:", cartItems.length);
      console.log('🔄 Preparing to calculate totals...');

      order.TotalPayment = 0;
      order.TotalPlatformCommission = 0;

      console.log('💰 Calculating order totals...');
      if (order.CartItems.length > 0) {
        console.log('✅ Order has cart items, processing...');
        var userCreditAmount = req.session.user;

        if (
          userCreditAmount.CreditAmount != 0 &&
          userCreditAmount.IsCredit === true
        ) {
          order.TotalPayment = 0;
          for (var loop2 = 0; loop2 < order.CartItems.length; loop2++) {
            order.TotalPayment = (
              parseFloat(order.TotalPayment) +
              parseFloat(order.CartItems[loop2].TotalPayment)
            ).toFixed(2);
            order.TotalPlatformCommission = (
              parseFloat(order.CartItems[loop2].PlatformCommission) +
              parseFloat(order.CartItems[loop2].PlatformCommission)
            ).toFixed(2);
          }

          if (userCreditAmount.CreditAmount <= order.TotalPayment) {
            order.TotalPayment =
              order.TotalPayment - userCreditAmount.CreditAmount;
            rdm_credit = userCreditAmount.CreditAmount;
          } else {
            rdm_credit = order.TotalPayment;
            order.TotalPayment = 0;
          }
        } else {
          for (var loop3 = 0; loop3 < order.CartItems.length; loop3++) {
            order.TotalPayment = (
              parseFloat(order.TotalPayment) +
              parseFloat(order.CartItems[loop3].TotalPayment)
            ).toFixed(2);
            order.TotalPlatformCommission = (
              parseFloat(order.CartItems[loop3].PlatformCommission) +
              parseFloat(order.CartItems[loop3].PlatformCommission)
            ).toFixed(2);
          }
        }

        const subscriberCoversEntireOrder =
          hasSubscriberCoveredItems && !hasPaidItems;

        if (!subscriberInfo.isSubscriber) {
          console.log("[Checkout] Forcing zero-payment checkout for regular user (grace period)", {
            userId: req.session.user?._id,
            userEmail: req.session.user?.Email,
            cartItemCount: order.CartItems.length,
          });

          order.TotalPayment = "0.00";
          order.TotalPlatformCommission = "0.00";
          hasPaidItems = false;

          order.CartItems = order.CartItems.map((item) => {
            return {
              ...item,
              Price: "0.00",
              TotalPayment: "0.00",
              PlatformCommission: "0.00",
            };
          });

          req.body.token = "free";
          req.body.paymentMethod = req.body.paymentMethod || "grace_period_free";
        } else if (subscriberCoversEntireOrder) {
          console.log(
            "🪄 Subscriber coverage applies to entire order. Capsules:",
            subscriberCoveredCapsules
          );
          console.log(
            "[Subscription] Entire order covered by subscription",
            {
              userId: req.session.user?._id,
              userEmail: req.session.user?.Email,
              coveredCapsules: subscriberCoveredCapsules,
            }
          );
          order.TotalPayment = "0.00";
          order.TotalPlatformCommission = "0.00";
          req.body.token = req.body.token ? req.body.token : "free";
          req.body.paymentMethod = req.body.paymentMethod || "subscriber";
        }

        console.log('💾 Saving order to database...');
        const savedResult = await Order(order).save();
        console.log('✅ Order saved successfully, ID:', savedResult._id);

        var token = null;
        var email = null;

        req.body.token = req.body.token ? req.body.token : null;
        console.log('💳 Payment token received:', req.body.token);
        
        if (req.body.token === "free") {
          console.log('💰 Processing FREE payment...');
          var buy = {
            paid: null,
            failure_code: null,
          };
          var fromFree = "free";
          console.log(
            "---------------------- Calling savedOrder 1111111--------------"
          );
          savedOrder(
            buy,
            orderInit,
            fromFree,
            rdm_credit,
            savedResult,
            order,
            req,
            res,
            isSelectivePurchase
          );
        } else {
          console.log('💳 Processing STRIPE payment...');
          
          if (req.body.token === "trial") {
            console.log('🧪 TRIAL mode: Creating test token...');
            try {
              const tokenObj = await getStripe().tokens.create({
                card: {
                  number: "4242424242424242",
                  exp_month: 12,
                  exp_year: 2035,
                  cvc: "123",
                },
              });
              console.log('✅ Test token created:', tokenObj.id);
              token = tokenObj.id;
              email = req.session.user.Email;
              await createCharges();
            } catch (err) {
              var response = {
                status: 500,
                message: "Error creating trial token",
                error: err.message,
              };
              return res.json(response);
            }
          } else {
            console.log('💳 Using provided token (not trial)...');
            token = req.body.token ? req.body.token : null;
            email = req.body.tokenEmail
              ? req.body.tokenEmail
              : req.session.user.Email;
            console.log('   Token:', token);
            console.log('   Email:', email);
            await createCharges();
          }

          async function createCharges() {
            try {
              console.log('💰 Creating Stripe charge...');
              console.log('   Token:', token);
              console.log('   Email:', email);
              console.log('   Amount: $' + order.TotalPayment);
              
              const customer = await getStripe().customers.create({
                source: token,
                description: email,
              });
              console.log('✅ Stripe customer created:', customer.id);

              const charge = await getStripe().charges.create({
                amount: parseInt(order.TotalPayment * 100), // Amount in cents
                currency: "usd",
                customer: customer.id,
              });
              console.log('✅ Stripe charge completed:', charge.id, 'Status:', charge.status);

              console.log(
                "---------------------- Calling savedOrder --------------"
              );
              var fromstripe = "stripe";
              savedOrder(
                charge,
                orderInit,
                fromstripe,
                rdm_credit,
                savedResult,
                order,
                req,
                res,
                isSelectivePurchase
              );
            } catch (e) {
              console.error('❌ Payment processing error:', e.message);
              var response = {
                status: 500,
                message: "Payment processing failed",
                error: e.message,
              };
              res.json(response);
            }
          }
        }
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
          err: "Order.CartItem issue",
        };
        res.json(response);
      }
    } else {
      console.log("Debug: Cart is empty - no items to process");
      var response = {
        status: 400,
        message:
          "Your cart is empty. Please add items to your cart before purchasing.",
        err: "Cart.CartItem issue - Empty cart",
        cartItemsCount: myCart.CartItems.length,
      };
      res.json(response);
    }
  } catch (error) {
    console.error("Error in buyNow:", error);
    var response = {
      status: 500,
      message: "Something went wrong.",
      error: error.message,
    };
    res.json(response);
  }
};

async function capsule__createNewInstances_perCartItem(
  __capsuleId,
  cartItemOwners,
  cartItem,
  req
) {
  try {
    const conditions = { _id: __capsuleId };
    const CapsuleData = await Capsule.findOne(conditions).lean(false); // returns a mongoose doc, not plain object

    if (!CapsuleData) {
      return {
        status: 501,
        message: "Something went wrong.",
      };
    }

    // Ensure LaunchSettings exists
    CapsuleData.LaunchSettings = CapsuleData.LaunchSettings || {};
    CapsuleData.LaunchSettings.CapsuleFor =
      CapsuleData.LaunchSettings.CapsuleFor || null;

    // Stream case
    if (CapsuleData.LaunchSettings.CapsuleFor === "Stream") {
      CapsuleData.MonthFor = cartItem.MonthFor || "M12";
      CapsuleData.Frequency = cartItem.Frequency || "high";
      CapsuleData.EmailTemplate = cartItem.EmailTemplate || "PracticalThinker";
      CapsuleData.IsStreamPaused = cartItem.IsStreamPaused || 0;
    }

    // Stream + Group case
    if (
      CapsuleData.LaunchSettings.CapsuleFor === "Stream" &&
      CapsuleData.LaunchSettings.StreamType === "Group"
    ) {
      CapsuleData.IsSurpriseGift = cartItem.IsSurpriseGift || false;
      CapsuleData.StreamFlow = cartItem.StreamFlow || null;

      // take settings from whatever creator has allowed
      CapsuleData.MonthFor = CapsuleData.MonthFor || "M12";
      CapsuleData.Frequency = CapsuleData.Frequency || "high";
      CapsuleData.FrequencyInDays = CapsuleData.FrequencyInDays || "2";
      CapsuleData.EmailTemplate =
        CapsuleData.EmailTemplate || "PracticalThinker";
      CapsuleData.IsStreamPaused = CapsuleData.IsStreamPaused || 0;
    }

    // Process owners
    if (cartItemOwners.length) {
      for (let ctloop = 0; ctloop < cartItemOwners.length; ctloop++) {
        const owner = {
          UserName: cartItemOwners[ctloop].OwnerName || null,
          UserEmail: cartItemOwners[ctloop].OwnerEmail || null,
          UniqueIdPerOwner: cartItemOwners[ctloop].UniqueIdPerOwner || null,
        };

        await createCapsuleInstance(CapsuleData, owner, req, ctloop);
      }
    } else {
      return {
        status: 501,
        message: "Something went wrong.",
      };
    }

    // Success return
    return {
      status: 200,
      data: CapsuleData,
    };
  } catch (err) {
    console.error("Error in capsule__createNewInstances_perCartItem:", err);
    return {
      status: 500,
      message: "Internal server error",
      error: err.message,
    };
  }
}

var savedOrder = function (
  charge,
  orderInit,
  payFrom,
  rdm_credit,
  result,
  order,
  req,
  res,
  isSelectivePurchase
) {
  if (payFrom == "stripe") {
    orderInit.PGatewayResult = charge;
  }

  if ((charge.paid && charge.failure_code == null) || payFrom == "free") {
    orderInit.TransactionState = "Completed";
    var message = "Payment completed successfully";
    var status = 200;

    var totalOps = 0;
    // Process cart items sequentially to avoid race conditions
    (async function () {
      try {
        for (var loop = 0; loop < order.CartItems.length; loop++) {
          var cartItem = order.CartItems[loop];
          var __capsuleId = cartItem.CapsuleId;
          var cartItemOwners = cartItem.Owners ? cartItem.Owners : [];

          var result = await capsule__createNewInstances_perCartItem(
            __capsuleId,
            cartItemOwners,
            cartItem,
            req
          );
          console.log(
            `Processed cart item ${loop + 1}/${order.CartItems.length}:`,
            result
          );
        }

        // Clear cart after all items processed
        var conditions = {
          CreatedByEmail: req.session.user.Email
            ? req.session.user.Email
            : null,
        };
        await Cart.deleteMany(conditions);
        console.log("Cart cleared successfully");

        // Increment prices for purchased capsules/streams
        console.log("Starting price increment for purchased capsules...");
        await __increamentPriceOfOrderedCapsules(order.CartItems);

        var response = {
          status: 200,
          message: "Your order has been completed successfully.",
          purchaseType: isSelectivePurchase ? "selective" : "all_cart_items",
          purchasedCapsuleIds: order.AllCapsuleIds || [],
          totalItems: order.CartItems ? order.CartItems.length : 0,
        };
        res.json(response);
      } catch (error) {
        console.error("Error processing cart items:", error);
        var response = {
          status: 500,
          message: "Error processing order",
          error: error.message,
        };
        res.json(response);
      }
    })();
  } else {
    orderInit.TransactionState = "Failed";
    var message = charge.failure_message ? charge.failure_message : null;
    var status = charge.failure_code ? charge.failure_code : null;
  }

  if (
    orderInit.TransactionState == "Completed" &&
    req.session.user.IsCredit == false
  ) {
    console.log(
      "result._id----------------------------------------------------",
      req.session.user._id
    );
    User.updateOne(
      { _id: new mongoose.Types.ObjectId(req.session.user._id) },
      {
        $set: { IsCredit: true },
      }
    )
      .then(function (creditUpdate) {
        if (creditUpdate) {
          console.log(
            "creditUpdate++++++++++++++++++++++++++++++1212121212121+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",
            creditUpdate
          );
          var response = {
            status: 200,
            result: creditUpdate,
          };
          // Check if user was referred
          Referral.findOne({
            ReferredToId: new mongoose.Types.ObjectId(req.session.user._id),
            status: false,
          })
            .then(function (referralInfo) {
              console.log("Referral-----====-----=====", referralInfo);
              if (referralInfo) {
                // Calculate referrer credit: 50% of purchase amount after Stripe fees
                // Stripe fee structure: 2.9% + $0.30 per transaction
                var purchaseAmount = parseFloat(order.TotalPayment);
                var stripeFeePercentage = 0.029; // 2.9%
                var stripeFeeFixed = 0.30; // $0.30
                var stripeFee = (purchaseAmount * stripeFeePercentage) + stripeFeeFixed;
                var amountAfterStripeFee = purchaseAmount - stripeFee;
                var referrerCredit = parseFloat((amountAfterStripeFee * 0.5).toFixed(2)); // 50% of net amount
                
                console.log("💰 Referral Credit Calculation:");
                console.log("   Purchase Amount: $" + purchaseAmount);
                console.log("   Stripe Fee: $" + stripeFee.toFixed(2));
                console.log("   Amount After Fee: $" + amountAfterStripeFee.toFixed(2));
                console.log("   Referrer Credit (50%): $" + referrerCredit);
                
                var ReferralData = referralInfo;
                
                // Only give credit to the referrer (person who shared the link)
                // Buyer gets NO discount
                User.updateOne(
                  {
                    _id: new mongoose.Types.ObjectId(ReferralData.ReferredById),
                  },
                  {
                    $inc: {
                      CreditAmount: referrerCredit,
                    },
                  }
                )
                  .then(function (referradByCredit) {
                    console.log(
                      "++++++++++++++++++++++++++++++++++++++",
                      referradByCredit
                    );
                    if (referradByCredit) {
                      // Update referral status to true
                      Referral.updateOne(
                        { _id: ReferralData._id },
                        { $set: { status: true } }
                      )
                        .then(function (referralStatusUpdate) {
                          console.log(
                            "✅ Referral status updated to true:",
                            referralStatusUpdate
                          );
                        })
                        .catch(function (err) {
                          console.error("❌ Error updating referral status:", err);
                        });

                      // Create transaction record for referrer credit
                      var transaction = new Transaction();
                      transaction.TransectionId = ReferralData._id;
                      transaction.TransectionType = "Credit";
                      transaction.Amount = referrerCredit;
                      
                      // Convert callback to promise
                      transaction.save()
                        .then(function (updateCrTransectionData) {
                          console.log(
                            "✅ Transaction saved successfully:",
                            updateCrTransectionData
                          );
                        })
                        .catch(function (err) {
                          console.error("❌ Error saving transaction:", err);
                        });
                      
                      var response = {
                        status: 200,
                        result: referradByCredit,
                        message: "Referrer credited with $" + referrerCredit
                      };
                    } else {
                      var response = {
                        status: 501,
                        result: "Error updating referrer credit",
                      };
                    }
                  })
                  .catch(function (err) {
                    console.error(
                      "Error updating referral credit:",
                      err
                    );
                  });
              } else {
                // No referral found - this is fine, user wasn't referred
                console.log("ℹ️ No active referral found for user (user was not referred or already used)");
                var response = {
                  status: 200,
                  message: "No referral to process",
                };
              }
            })
            .catch(function (err) {
              console.error("Error checking referral:", err);
            });
        }
      })
      .catch(function (err) {
        console.error("Error updating IsCredit status:", err);
      });
  } else {
    // Handle subsequent purchases where user already has credit enabled
    if (
      orderInit.TransactionState == "Completed" &&
      req.session.user.IsCredit == true &&
      req.session.user.CreditAmount > 5
    ) {
      var newCreditAmount = req.session.user.CreditAmount - rdm_credit;
      User.updateOne(
        { _id: new mongoose.Types.ObjectId(req.session.user._id) },
        {
          $set: { CreditAmount: newCreditAmount },
        }
      )
        .then(function (byuserCreditUpdate) {
          if (byuserCreditUpdate) {
            var response = {
              status: 200,
              result: byuserCreditUpdate,
            };
          } else {
            var response = {
              status: 501,
              result: err,
            };
          }
        })
        .catch(function (err) {
          console.error("Error updating user credit amount:", err);
        });
    } else {
      if (
        orderInit.TransactionState == "Completed" &&
        req.session.user.IsCredit == true
      ) {
        Referral.findOneAndUpdate(
          {
            ReferredToId: new mongoose.Types.ObjectId(req.session.user._id),
            status: false,
          },
          {
            $set: { status: true },
          }
        )
          .then(function (referralUpdateStatus) {
            if (referralUpdateStatus) {
              var newCreditAmount = req.session.user.CreditAmount - rdm_credit;
              User.updateOne(
                { _id: new mongoose.Types.ObjectId(req.session.user._id) },
                {
                  $set: { CreditAmount: newCreditAmount },
                }
              )
                .then(function (userCreditUpdate) {
                  if (userCreditUpdate) {
                    var response = {
                      status: 200,
                      result: userCreditUpdate,
                    };
                  } else {
                    var response = {
                      status: 501,
                      result: err,
                    };
                  }
                })
                .catch(function (err) {
                  console.error("Error updating user credit amount:", err);
                });
            } else {
              var response = {
                status: 501,
                result: err,
              };
            }
          })
          .catch(function (err) {
            console.error("Error updating referral status:", err);
          });
      }
    }
  }

  if (rdm_credit > 0) {
    // If Debit
    var transaction = new Transaction();
    transaction.TransectionId = result._id;
    transaction.TransectionType = "Debit";
    transaction.Amount = rdm_credit;
    transaction.save(function (err, updateTransectionData) {
      if (err) {
        console.log("err");
      } else {
        console.log("success---------", updateTransectionData);
      }
    });
  }

  Order.updateOne(
    { _id: new mongoose.Types.ObjectId(result._id) },
    { $set: orderInit }
  )
    .then(async function (result) {
      if (result) {
        console.log("sdssss***************ssssss");
        var response = {
          status: status,
          message: message,
          result: result,
        };
        //res.json(response);
      } else {
        var response = {
          status: status,
          message: message,
          result: err,
        };
        //res.json(response);
      }
      console.log("sdssss******999999999999999999999999999999*********ssssss");
    })
    .catch(function (err) {
      console.error("Error updating order:", err);
    });
};

exports.savedOrder = savedOrder;

//Capsules In the making Apis
exports.getChapters = getChapters;
exports.find = find;
exports.saveAndLaunch = saveAndLaunch;
exports.publish = publishV2; //publish;

exports.capsule__checkCompleteness = capsule__checkCompleteness;

exports.buyNow = buyNow;
exports.createCelebrityInstance = createCelebrityInstance;
exports.__streamPagePostNow = __streamPagePostNow;
