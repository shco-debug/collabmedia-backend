var Capsule = require("./../models/capsuleModel.js");
var Chapter = require("./../models/chapterModel.js");
var Page = require("./../models/pageModel.js");
var User = require("./../models/userModel.js");
var Friend = require("./../models/friendsModel.js");

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

var async_lib = require("async");

var counters = require("./../models/countersModel.js");

var SyncedPost = require("./../models/syncedpostModel.js");
const axios = require("axios");
var PageStream = require("./../models/pageStreamModel.js");
var StreamMembers = require("./../models/StreamMembersModel.js");
var ObjectId = mongoose.Types.ObjectId;
const { htmlToText } = require("html-to-text");
var SyncedPostsMap = require("./../models/SyncedpostsMap.js");

function __getEmailEngineDataSetsBasedOnMonthAndKeyPost(CapsuleData) {
  var EmailEngineDataSets = [];

  var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : "M12";

  var afterDaysArr = process.StreamConfig[selectedMonths]["KeyPost"]
    ? process.StreamConfig[selectedMonths]["KeyPost"]
    : [];
  for (var i = 0; i < afterDaysArr.length; i++) {
    EmailEngineDataSets.push({
      TextAboveVisual: "",
      TextBelowVisual: "",
      AfterDays: afterDaysArr[i],
    });
  }

  return EmailEngineDataSets;
}

async function AreSyncedPostsAlreadyThere(StreamId) {
  var firstTimeFlag = false;
  try {
    var alreadySavedRecords = await SyncedPost.find({
      CapsuleId: ObjectId(StreamId),
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
function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
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

function __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData) {
  console.log("__getEmailEngineDataSetsBasedOnMonthAndFreq ------------- ");
  var EmailEngineDataSets = [];

  var frequency = CapsuleData.Frequency ? CapsuleData.Frequency : "medium";
  var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : "M1";

  var afterDaysArr = process.StreamConfig[selectedMonths][frequency]
    ? process.StreamConfig[selectedMonths][frequency]
    : [];
  for (var i = 0; i < afterDaysArr.length; i++) {
    EmailEngineDataSets.push({
      TextAboveVisual: "",
      TextBelowVisual: "",
      AfterDays: afterDaysArr[i],
    });
  }

  return EmailEngineDataSets;
}

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
    for (var i = 0; i < neededConcatNo; i++) {
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
  for (var i = 0; i < loopLimit; i++) {
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
          if (
            postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 &&
            postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2
          ) {
            emailDataSet.VisualUrls[0] =
              postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
            emailDataSet.VisualUrls[1] =
              postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
          }

          emailDataSet.BlendMode = postObj.SelectedBlendImages[
            selectBlendImageCounter
          ].blendMode
            ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode
            : "hard-light";

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

function __getEmailEngineDataSetsFromSelectedBlendImages_NDays(
  currentPostObj,
  PagePosts,
  EmailEngineDataSets,
  CapsuleData,
  nDays
) {
  var postPerDay = nDays ? nDays : 1;
  postPerDay = Math.ceil(EmailEngineDataSets.length / PagePosts);
  var eeDataSets = [];
  for (var e = 0; e < EmailEngineDataSets.length; e++) {
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
      if (
        obj.PostType == "Post" ||
        (obj.PostType == "AnswerPost" && !obj.IsOnetimeStream)
      ) {
        return obj;
      }
    });
    //var PagePosts_WithoutGeneralPosts = PagePosts;
    if (PagePosts_WithoutGeneralPosts.length) {
      var neededConcatNo = parseInt(
        EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length
      );
      for (var mp = 0; mp < neededConcatNo; mp++) {
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
  for (var jt = 0; jt < loopLimit; jt++) {
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
          }

          emailDataSet.BlendMode = currentPostObj.SelectedBlendImages[
            selectBlendImageCounter
          ].blendMode
            ? currentPostObj.SelectedBlendImages[selectBlendImageCounter]
                .blendMode
            : "hard-light";

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

  return NewEmailEngineDataSets;
}
async function mapPostsAsPerSettings(
  CapsuleData,
  firstTimeFlag,
  First_SyncedPosts
) {
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
        CapsuleId: ObjectId(StreamId),
        IsDeleted: false,
      };
      var allSyncedPosts = await SyncedPost.find(conditions).sort({
        "EmailEngineDataSets.DateOfDelivery": 1,
      });

      //2) save SyncedPostsMap here
      var dataToSave = {
        CapsuleId: ObjectId(StreamId),
        SyncedPosts: allSyncedPosts,
      };
      await SyncedPostsMap(dataToSave).save();

      //3) fetch SyncedPostsMap
      var allSyncedPostsMap = await SyncedPostsMap.findOne({
        CapsuleId: ObjectId(StreamId),
        IsDeleted: false,
        //"SyncedPosts.EmailEngineDataSets.DateOfDelivery" : {$gte : todayEnd}
      });

      //4) delete old records
      var conditions = {
        CapsuleId: ObjectId(StreamId),
        IsDeleted: false,
      };
      await SyncedPost.remove(conditions);

      //5) getEmailSchedules based on frequency
      var CreatedOn = Date.now();
      var EmailEngineDataSets =
        __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData);

      //5) reMap email schedules based on email schedules and SyncedPostsMap
      for (var i = 0; i < EmailEngineDataSets.length; i++) {
        var NoOfDays = EmailEngineDataSets[i].AfterDays
          ? parseInt(EmailEngineDataSets[i].AfterDays)
          : 0;
        EmailEngineDataSets[i].DateOfDelivery =
          __StreamTYPE == "Group"
            ? getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn)
            : getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn, 5);

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
      returnVal = true;
    } else {
      //1) fetch SyncedPostsMap
      var allSyncedPostsMap = await SyncedPostsMap.aggregate([
        {
          $match: {
            CapsuleId: ObjectId(StreamId),
            IsDeleted: false,
            "SyncedPosts.EmailEngineDataSets.DateOfDelivery": { $gt: todayEnd },
          },
        },
        { $unwind: "$SyncedPosts" },
        {
          $match: {
            CapsuleId: ObjectId(StreamId),
            IsDeleted: false,
            "SyncedPosts.EmailEngineDataSets.DateOfDelivery": { $gt: todayEnd },
          },
        },
        {
          $sort: { "SyncedPosts.EmailEngineDataSets.DateOfDelivery": -1 },
        },
        {
          $group: {
            _id: "$CapsuleId",
            SyncedPosts: {
              $push: "$SyncedPosts",
            },
          },
        },
      ]);
      allSyncedPostsMap = allSyncedPostsMap.length ? allSyncedPostsMap[0] : {};
      //2) getEmailSchedules based on frequency
      var CreatedOn = First_SyncedPosts.CreatedOn
        ? new Date(String(First_SyncedPosts.CreatedOn))
        : new Date(String(CapsuleData.CreatedOn));
      var EmailEngineDataSets =
        __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData);

      //3) delete old records after currentDate
      var conditions = {
        CapsuleId: ObjectId(StreamId),
        IsDeleted: false,
        "EmailEngineDataSets.DateOfDelivery": { $gt: todayEnd },
      };
      await SyncedPost.remove(conditions);

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

        console.log(
          `${EmailEngineDataSets[i].DateOfDelivery} : (${EmailEngineDataSets[i].DateOfDelivery_Timestamp} >= ${datePlusOneTimestamp})`
        );
        if (
          EmailEngineDataSets[i].DateOfDelivery_Timestamp >=
          datePlusOneTimestamp
        ) {
          allSyncedPostsMap.SyncedPosts = allSyncedPostsMap.SyncedPosts || [];
          if (allSyncedPostsMap.SyncedPosts.length) {
            var tmpObj = allSyncedPostsMap.SyncedPosts.pop();
            tmpObj.EmailEngineDataSets[0].AfterDays =
              EmailEngineDataSets[i].AfterDays;
            tmpObj.EmailEngineDataSets[0].DateOfDelivery =
              EmailEngineDataSets[i].DateOfDelivery;
            await SyncedPost(tmpObj).save();
            console.log("--- SyncedPost.saved ---");
          }
        } else {
          console.log("--- In ELSE ---");
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
async function fetchKeywordsFromText(text) {
  var keywordResult = [];

  var response = {};
  var inputText = typeof text == "string" ? text.substr(0, 2000) : "";
  if (inputText) {
    inputText = inputText.replace(/'/g, "");
    inputText = inputText.replace(/"/g, "");
    var request_url =
      "http://yake.inesctec.pt/yake/v2/extract_keywords?content=" +
      encodeURI(inputText) +
      "&max_ngram_size=2&number_of_keywords=20&highlight=false";
    try {
      response = await axios.get(request_url);
    } catch (exp) {
      console.log("exp ================= ", exp);
    }
  }
  response = typeof response == "object" ? response : {};
  response.data = response.data ? response.data : {};
  var keywords = response.data.keywords ? response.data.keywords : [];
  for (let i = 0; i < keywords.length; i++) {
    if (keywords[i].ngram) {
      keywordResult.push(keywords[i].ngram);
      if (keywordResult.length == 2) {
        break;
      }
    }
  }

  return keywordResult;
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
async function getCelebrities(StreamId) {
  var membersArr = [];
  var result = await Capsule.findOne(
    { _id: ObjectId(StreamId), IsDeleted: false },
    { _id: 1, CelebrityInstanceId: 1 }
  );
  result = typeof result == "object" ? result : {};
  var CelebrityInstanceId = result.CelebrityInstanceId
    ? result.CelebrityInstanceId
    : null;

  if (!CelebrityInstanceId) {
    return {
      Celebrities: membersArr,
      CelebrityInstanceId: CelebrityInstanceId,
    };
  }
  var conditions = {
    StreamId: ObjectId(CelebrityInstanceId),
    IsDeleted: false,
  };

  var strm_result = await StreamMembers.find(conditions); //.populate('Members');
  strm_result = Array.isArray(strm_result) ? strm_result : [];
  strm_result = strm_result.length > 0 ? strm_result[0] : {};

  strm_result.Members = strm_result.Members ? strm_result.Members : [];
  strm_result.Members = Array.isArray(strm_result.Members)
    ? strm_result.Members
    : [];

  if (strm_result.Members.length) {
    var memberIds = [];
    for (var i = 0; i < strm_result.Members.length; i++) {
      memberIds.push(ObjectId(strm_result.Members[i]));
    }
    if (memberIds.length) {
      var conditions = {
        _id: {
          $in: memberIds,
        },
        IsDeleted: 0,
      };
      var fields = {
        Name: 1,
        Email: 1,
        ProfilePic: 1,
      };
      var membersResult = await User.find(conditions, fields);
      for (var i = 0; i < membersResult.length; i++) {
        membersArr.push({
          _id: membersResult[i]._id,
          Name: membersResult[i].Name,
          Email: membersResult[i].Email,
        });
      }
    }
  }
  return { Celebrities: membersArr, CelebrityInstanceId: CelebrityInstanceId };
}

async function getPagesByCapsuleId(CapsuleId) {
  var chapter = await Chapter.findOne({ CapsuleId: String(CapsuleId) });
  var page = await Page.findOne({ ChapterId: String(chapter._id) });
  return page;
}
async function __streamPagePostNow(
  PagePosts,
  PageData,
  req,
  CapsuleData,
  First_SyncedPosts
) {
  var firstTimeFlag = false;
  //await AreSyncedPostsAlreadyThere(CapsuleData._id);
  if (
    await mapPostsAsPerSettings(CapsuleData, firstTimeFlag, First_SyncedPosts)
  ) {
    console.log(
      "----------------- __streamPagePostNow SUCCESSFULLY COMPLETED for NORMAL Stream Case - BUY_NOW Case ----------------------------"
    );
  } else {
    console.log("__streamPagePostNow Final Step - Something went wrong");
  }
  return true;
  //PagePosts = PagePosts.reverse();
  var PagePosts2 = PagePosts.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return new Date(b.PostedOn) - new Date(a.PostedOn);
  });

  var PagePosts_keyposts = PagePosts2.filter(function (obj) {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (obj.PostType == "KeyPost") {
      return obj;
    }
  });

  var PagePosts2 = PagePosts2.filter(function (obj) {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (
      obj.PostType != "AdPost" &&
      obj.PostType != "BroadcastPost" &&
      obj.PostType != "KeyPost"
    ) {
      return obj;
    }
  });

  console.log(
    "----------------- __streamPagePostNow called ----------------------------"
  );
  var EmailEngineDataSets =
    __getEmailEngineDataSetsBasedOnMonthAndFreq(CapsuleData);
  if (!EmailEngineDataSets.length) {
    EmailEngineDataSets = null;
  }
  PageData.EmailEngineDataSets = PageData.EmailEngineDataSets
    ? PageData.EmailEngineDataSets
    : [];
  PageData.EmailEngineDataSets = EmailEngineDataSets
    ? EmailEngineDataSets
    : PageData.EmailEngineDataSets;

  for (var loop = 0; loop < PagePosts2.length; loop++) {
    var postObj = PagePosts2[loop];
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
      PostOwnerId: postObj.PostedBy,
      ReceiverEmails: req.session.user.Email ? [req.session.user.Email] : [],
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
      CreatedOn: First_SyncedPosts.CreatedOn
        ? First_SyncedPosts.CreatedOn
        : Date.now(),
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

    for (var i = 0; i < PageData.EmailEngineDataSets.length; i++) {
      var obj = PageData.EmailEngineDataSets[i];
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

    console.log(
      "------------ inputObj.EmailEngineDataSets.length = ",
      inputObj.EmailEngineDataSets.length
    );

    for (var i = 0; i < inputObj.EmailEngineDataSets.length; i++) {
      inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj
        .EmailEngineDataSets[i].TextAboveVisual
        ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
      inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj
        .EmailEngineDataSets[i].TextBelowVisual
        ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
    }

    //get the selected blend images of the post if there is any else use the default procedure.
    //inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages (postObj, PagePosts2, inputObj.EmailEngineDataSets, CapsuleData);
    inputObj.EmailEngineDataSets =
      __getEmailEngineDataSetsFromSelectedBlendImages_NDays(
        postObj,
        PagePosts2,
        inputObj.EmailEngineDataSets,
        CapsuleData,
        3
      );
    postObj.SelectedBlendImages = postObj.SelectedBlendImages
      ? postObj.SelectedBlendImages
      : [];

    if (inputObj.IsOnetimeStream || postObj.PostType == "GeneralPost") {
      if (
        inputObj.PageId &&
        inputObj.PostId &&
        inputObj.PostOwnerId &&
        inputObj.EmailEngineDataSets &&
        inputObj.ReceiverEmails.length
      ) {
        //now call the api.
        var request_url =
          "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
        //var request_url = 'https://www.scrpt.com/journal/streamPage';
        var response = await axios.post(request_url, inputObj);
        response = typeof response == "object" ? response : {};
        response.data = response.data ? response.data : {};
        response.data.code = response.data.code ? response.data.code : null;
        console.log(
          "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
          response.data.code
        );

        /*
                  axios.post(request_url, inputObj)
                      .then(response => {
                          response.data = response.data ? response.data : {};
                          response.data.code = response.data.code ? response.data.code : null;
                          console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
                      });
                  */
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
          //console.log('On right flow - https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase - ', inputObj.EmailEngineDataSets);
          //now call the api.
          var request_url =
            "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
          //var request_url = 'https://www.scrpt.com/journal/streamPage';
          var response = await axios.post(request_url, inputObj);
          response = typeof response == "object" ? response : {};
          response.data = response.data ? response.data : {};
          response.data.code = response.data.code ? response.data.code : null;
          console.log(
            "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
            response.data.code
          );

          /*
                      axios.post(request_url, inputObj)
                          .then(response => {
                              response.data = response.data ? response.data : {};
                              response.data.code = response.data.code ? response.data.code : null;
                              console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
                          });
                      */
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
          //now call the api.
          var request_url = "https://www.scrpt.com/journal/streamPage";

          var response = await axios.post(request_url, inputObj);
          response = typeof response == "object" ? response : {};
          response.data = response.data ? response.data : {};
          response.data.code = response.data.code ? response.data.code : null;
          console.log(
            "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
            response.data.code
          );

          /*
                      axios.post(request_url, inputObj)
                          .then(response => {
                              response.data = response.data ? response.data : {};
                              response.data.code = response.data.code ? response.data.code : null;
                              console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
                          });
                      */
        }
      }
    }
  }

  var EmailEngineDataSets_keyposts =
    __getEmailEngineDataSetsBasedOnMonthAndKeyPost(CapsuleData);
  if (!EmailEngineDataSets_keyposts.length) {
    EmailEngineDataSets_keyposts = null;
  }
  EmailEngineDataSets_keyposts = EmailEngineDataSets_keyposts
    ? EmailEngineDataSets_keyposts
    : [];

  PagePosts_keyposts = PagePosts_keyposts ? PagePosts_keyposts : [];
  for (var loop = 0; loop < PagePosts_keyposts.length; loop++) {
    var postObj = PagePosts_keyposts[loop];
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
      PostOwnerId: postObj.PostedBy,
      ReceiverEmails: req.session.user.Email ? [req.session.user.Email] : [],
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
      CreatedOn: First_SyncedPosts.CreatedOn
        ? First_SyncedPosts.CreatedOn
        : Date.now(),
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

    console.log(
      "------------ inputObj.EmailEngineDataSets.length = ",
      inputObj.EmailEngineDataSets.length
    );

    for (var i = 0; i < inputObj.EmailEngineDataSets.length; i++) {
      inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj
        .EmailEngineDataSets[i].TextAboveVisual
        ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
      inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj
        .EmailEngineDataSets[i].TextBelowVisual
        ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(
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
    postObj.SelectedBlendImages = postObj.SelectedBlendImages
      ? postObj.SelectedBlendImages
      : [];

    var KeyPost_case = true; //inputObj.IsOnetimeStream
    if (KeyPost_case) {
      if (
        inputObj.PageId &&
        inputObj.PostId &&
        inputObj.PostOwnerId &&
        inputObj.EmailEngineDataSets &&
        inputObj.ReceiverEmails.length
      ) {
        //now call the api.
        var request_url =
          "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
        //var request_url = 'https://www.scrpt.com/journal/streamPage';
        axios.post(request_url, inputObj).then((response) => {
          response.data = response.data ? response.data : {};
          response.data.code = response.data.code ? response.data.code : null;
          console.log(
            "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
            response.data.code
          );
        });
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
          //now call the api.
          var request_url =
            "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
          //var request_url = 'https://www.scrpt.com/journal/streamPage';
          axios.post(request_url, inputObj).then((response) => {
            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            console.log(
              "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
              response.data.code
            );
          });
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
          //now call the api.
          var request_url = "https://www.scrpt.com/journal/streamPage";
          axios.post(request_url, inputObj).then((response) => {
            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            console.log(
              "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
              response.data.code
            );
          });
        }
      }
    }
  }
}
async function __streamPagePostNow_GroupStream(
  PagePosts,
  PageData,
  req,
  CapsuleData,
  First_SyncedPosts
) {
  console.log(
    "----------------- __streamPagePostNow_GroupStream called ----------------------------"
  );

  //PagePosts = PagePosts.reverse();
  var PagePosts_sorted = PagePosts.sort(function (a, b) {
    return new Date(b.PostedOn) - new Date(a.PostedOn);
  });

  var PagePosts_keyposts = PagePosts_sorted.filter(function (obj) {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (obj.PostType == "KeyPost") {
      return obj;
    }
  });

  var PagePosts2 = PagePosts_sorted.filter(function (obj) {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (
      obj.PostType != "AdPost" &&
      obj.PostType != "BroadcastPost" &&
      obj.PostType != "KeyPost" &&
      obj.PostType != "InfoPost" &&
      obj.PostType != "InfoPostOwner"
    ) {
      return obj;
    }
  });
  console.log("PagePosts2.length ------------------- ", PagePosts2.length);
  var QuestionPostArr = PagePosts2.filter((obj) => {
    obj.PostType = obj.PostType ? obj.PostType : "Post";
    if (obj.PostType == "QuestionPost") {
      return obj;
    }
  });
  QuestionPostArr = Array.isArray(QuestionPostArr) ? QuestionPostArr : [];
  var QuestionPostIds = [];
  var rootQuestionPostIds = [];
  var AnsIsOneTimeOrNotMap = {};
  var privateAnswerMap = {};
  for (var i = 0; i < QuestionPostArr.length; i++) {
    AnsIsOneTimeOrNotMap[String(QuestionPostArr[i]._id)] = QuestionPostArr[i]
      .IsOnetimeStream
      ? QuestionPostArr[i].IsOnetimeStream
      : false;
    AnsIsOneTimeOrNotMap[String(QuestionPostArr[i].OriginatedFrom)] =
      QuestionPostArr[i].IsOnetimeStream
        ? QuestionPostArr[i].IsOnetimeStream
        : false;

    privateAnswerMap[String(QuestionPostArr[i]._id)] = QuestionPostArr[i]
      .IsPrivateQuestionPost
      ? QuestionPostArr[i].IsPrivateQuestionPost
      : false;
    privateAnswerMap[String(QuestionPostArr[i].OriginatedFrom)] =
      QuestionPostArr[i].IsPrivateQuestionPost
        ? QuestionPostArr[i].IsPrivateQuestionPost
        : false;

    QuestionPostIds.push(
      mongoose.Types.ObjectId(String(QuestionPostArr[i]._id))
    );
    rootQuestionPostIds.push(
      mongoose.Types.ObjectId(String(QuestionPostArr[i].OriginatedFrom))
    );
  }

  var condAnswerPosts = {
    $or: [{ "Medias.QuestionPostId": { $in: QuestionPostIds } }],
  };
  //get Celebrities
  var celebritiesResultObj = await getCelebrities(CapsuleData.OriginatedFrom);
  var CelebrityInstanceId = celebritiesResultObj.CelebrityInstanceId
    ? celebritiesResultObj.CelebrityInstanceId
    : null;
  var celebritiesResult = celebritiesResultObj.Celebrities
    ? celebritiesResultObj.Celebrities
    : [];
  //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! celebritiesResult ---------------- ", celebritiesResult);
  //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CelebrityInstanceId ---------------- ", CelebrityInstanceId);

  var celPostsMap = {};

  if (
    celebritiesResult.length &&
    rootQuestionPostIds.length &&
    CelebrityInstanceId
  ) {
    var celebrityIds = [];
    for (var ci = 0; ci < celebritiesResult.length; ci++) {
      celebrityIds.push(ObjectId(celebritiesResult[ci]._id));
    }

    var PageData_cel = await getPagesByCapsuleId(CelebrityInstanceId);
    PageData_cel.Medias = PageData_cel.Medias ? PageData_cel.Medias : [];

    console.log(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! PageData_cel.Medias.length ---------------- ",
      PageData_cel.Medias.length
    );
    var finalCelQuestionPostIds = [];
    for (var i = 0; i < PageData_cel.Medias.length; i++) {
      PageData_cel.Medias[i].PostType = PageData_cel.Medias[i].PostType
        ? PageData_cel.Medias[i].PostType
        : "Post";
      if (
        PageData_cel.Medias[i].PostType ==
        "QuestionPost" /* && celebrityIds.indexOf(PageData_cel.Medias[i].PostedBy) >= 0*/
      ) {
        finalCelQuestionPostIds.push(ObjectId(PageData_cel.Medias[i]._id));
        celPostsMap[PageData_cel.Medias[i]._id] =
          PageData_cel.Medias[i].OriginatedFrom;
      }
    }
    rootQuestionPostIds = finalCelQuestionPostIds;

    if (rootQuestionPostIds.length) {
      condAnswerPosts["$or"].push({
        "Medias.QuestionPostId": { $in: rootQuestionPostIds },
        "Medias.PostedBy": { $in: celebrityIds },
      });
    }
  }

  //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! QuestionPostIds ---------------- ", QuestionPostIds);
  //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! rootQuestionPostIds ---------------- ", rootQuestionPostIds);
  //console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! condAnswerPosts ---------------- ", condAnswerPosts);
  //console.log("PagePosts2.length ------------------- ", PagePosts2.length);
  var answerPosts1 = [];
  if (QuestionPostIds.length) {
    answerPosts1 = await Page.aggregate([
      { $match: condAnswerPosts },
      { $unwind: "$Medias" },
      { $match: condAnswerPosts },
      {
        $project: {
          _id: "$Medias._id",
          PostedOn: "$Medias.PostedOn",
          UpdatedOn: "$Medias.UpdatedOn",
          Votes: "$Medias.Votes",
          Marks: "$Medias.Marks",
          IsOnlyForOwner: "$Medias.IsOnlyForOwner",
          IsAdminApproved: "$Medias.IsAdminApproved",
          PostPrivacySetting: "$Medias.PostPrivacySetting",
          Themes: "$Medias.Themes",
          TaggedUsers: "$Medias.TaggedUsers",
          IsUnsplashImage: "$Medias.IsUnsplashImage",
          IsAddedFromStream: "$Medias.IsAddedFromStream",
          IsPostForUser: "$Medias.IsPostForUser",
          IsPostForTeam: "$Medias.IsPostForTeam",
          IsEditorPicked: "$Medias.IsEditorPicked",
          Lightness: "$Medias.Lightness",
          DominantColors: "$Medias.DominantColors",
          PostType: "$Medias.PostType",
          KeyPostType: "$Medias.KeyPostType",
          MediaID: "$Medias.MediaID",
          MediaURL: "$Medias.MediaURL",
          Title: "$Medias.Title",
          Prompt: "$Medias.Prompt",
          Locator: "$Medias.Locator",
          PostedBy: "$Medias.PostedBy",
          ThemeID: "$Medias.ThemeID",
          ThemeTitle: "$Medias.ThemeTitle",
          MediaType: "$Medias.MediaType",
          ContentType: "$Medias.ContentType",
          Content: "$Medias.Content",
          OwnerId: "$Medias.OwnerId",
          thumbnail: "$Medias.thumbnail",
          PostStatement: "$Medias.PostStatement",
          StreamId: "$Medias.StreamId",
          QuestionPostId: "$Medias.QuestionPostId",
          SurpriseSelectedWords: "$Medias.SurpriseSelectedWords",
        },
      },
      {
        $sort: { QuestionPostId: 1 },
      },
      {
        $group: {
          _id: "$QuestionPostId",
          AnswerPostArr: {
            $push: {
              _id: "$_id",
              PostedOn: "$PostedOn",
              UpdatedOn: "$UpdatedOn",
              Votes: "$Votes",
              Marks: "$Marks",
              IsOnlyForOwner: "$IsOnlyForOwner",
              IsAdminApproved: "$IsAdminApproved",
              PostPrivacySetting: "$PostPrivacySetting",
              Themes: "$Themes",
              TaggedUsers: "$TaggedUsers",
              IsUnsplashImage: "$IsUnsplashImage",
              IsAddedFromStream: "$IsAddedFromStream",
              IsPostForUser: "$IsPostForUser",
              IsPostForTeam: "$IsPostForTeam",
              IsEditorPicked: "$IsEditorPicked",
              Lightness: "$Lightness",
              DominantColors: "$DominantColors",
              PostType: "$PostType",
              KeyPostType: "$KeyPostType",
              MediaID: "$MediaID",
              MediaURL: "$MediaURL",
              Title: "$Title",
              Prompt: "$Prompt",
              Locator: "$Locator",
              PostedBy: "$PostedBy",
              ThemeID: "$ThemeID",
              ThemeTitle: "$ThemeTitle",
              MediaType: "$MediaType",
              ContentType: "$ContentType",
              Content: "$Content",
              OwnerId: "$OwnerId",
              thumbnail: "$thumbnail",
              PostStatement: "$PostStatement",
              StreamId: "$StreamId",
              QuestionPostId: "$QuestionPostId",
              SurpriseSelectedWords: "$SurpriseSelectedWords",
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }
  answerPosts1 = Array.isArray(answerPosts1) ? answerPosts1 : [];
  console.log(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1 answerPosts1.length ----------------- ",
    answerPosts1.length
  );
  var resultMap = [];
  /*
      var questionIdxArr = [];
      for(var d = 0; d < PagePosts2.length; d++) {
          var obj = PagePosts2[d];
          if(obj.PostType == 'QuestionPost') {
              questionIdxArr.push(obj._id);
          }
      }
  
      console.log("questionIdxArr == ", questionIdxArr);
  
      //var resultMap = [];
      for(var h = 0; h < questionIdxArr.length; h++) {
          var questionIdx = String(questionIdxArr[h]);
          for(var i = 0; i < answerPosts1.length; i++) {
              if(questionIdx === String(answerPosts1[i]._id)) {
                  answerPosts1[i].AnswerPostArr = answerPosts1[i].AnswerPostArr || [];
                  resultMap.push(shuffle(answerPosts1[i].AnswerPostArr));
                  break;
              }
          }
      }*/

  for (var i = 0; i < answerPosts1.length; i++) {
    answerPosts1[i].AnswerPostArr = answerPosts1[i].AnswerPostArr || [];
    resultMap.push(shuffle(answerPosts1[i].AnswerPostArr));
  }
  //console.log("resultMap == ", resultMap);

  var idxLengthMap = [];
  for (var j = 0; j < resultMap.length; j++) {
    idxLengthMap.push(resultMap[j].length);
  }

  console.log("idxLengthMap = ", idxLengthMap);

  let indx = idxLengthMap.indexOf(Math.max(...idxLengthMap));

  console.log("indx == ", indx);

  var loopLength = resultMap[indx] ? resultMap[indx].length : 0;

  var apostArr = [];
  for (var i = 0; i < loopLength; i++) {
    for (var j = 0; j < resultMap.length; j++) {
      if (resultMap[j][i]) {
        apostArr.push(resultMap[j][i]);
      }
    }
  }

  var answerPosts = [];
  var PostTakenFromMembersIds = [];
  var remainingAnsPosts = [];
  answerPosts = apostArr;

  /*
      //sorted apostArr by QuestionPostId
      for(var i = 0; i < apostArr.length; i++) {
          var answerPost = apostArr[i];
  
          if(PostTakenFromMembersIds.indexOf(answerPost.PostedBy) < 0) {
              answerPosts.push(answerPost);
              PostTakenFromMembersIds.push(answerPost.PostedBy);
              //continue;
          } else {
              remainingAnsPosts.push(answerPost);
          }
  
          if(i === (apostArr.length-1) && remainingAnsPosts.length) {
              //reset the process
              apostArr = remainingAnsPosts;
              i = 0;
              PostTakenFromMembersIds = [];
          }
      }
      */
  console.log(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1 answerPosts.length ----------------- ",
    answerPosts.length
  );

  var postsForOwner = [];
  var otherPostIdsAddedInQueue = [];
  for (var j = 0; j < answerPosts.length; j++) {
    for (var i = 0; i < PagePosts2.length; i++) {
      console.log(
        "PagePosts2[i].PostType ============ ",
        PagePosts2[i].PostType
      );
      if (PagePosts2[i].PostType == "QuestionPost") {
        answerPosts[j].QuestionPostId = answerPosts[j].QuestionPostId
          ? answerPosts[j].QuestionPostId
          : "";

        celPostsMap[answerPosts[j].QuestionPostId] = celPostsMap[
          answerPosts[j].QuestionPostId
        ]
          ? celPostsMap[answerPosts[j].QuestionPostId]
          : null;

        if (
          answerPosts[j].PostType == "AnswerPost" &&
          (String(answerPosts[j].QuestionPostId) == String(PagePosts2[i]._id) ||
            String(celPostsMap[answerPosts[j].QuestionPostId]) ==
              String(PagePosts2[i].OriginatedFrom))
        ) {
          var PostStatement_Qpost = PagePosts2[i].PostStatement
            ? PagePosts2[i].PostStatement
            : PagePosts2[i].Content;
          var PostStatement_Apost = answerPosts[j].PostStatement
            ? answerPosts[j].PostStatement
            : answerPosts[j].Content;
          PostStatement_Apost = PostStatement_Apost ? PostStatement_Apost : "";
          PostStatement_Qpost = htmlToText(PostStatement_Qpost, {
            wordwrap: null,
          });
          var PostStatement_Qpost_AfterInfoRemoval =
            PostStatement_Qpost.split("***")[0];
          var PostStatement_Final =
            PostStatement_Qpost_AfterInfoRemoval +
            (PostStatement_Apost ? "<br><br>" + PostStatement_Apost : "");

          answerPosts[j].PostStatement_Apost = PostStatement_Apost;
          answerPosts[j].PostStatement = PostStatement_Final;
          answerPosts[j].OriginatedFrom = answerPosts[j]._id;
          answerPosts[j].SurpriseSelectedWords = PagePosts2[i]
            .SurpriseSelectedWords
            ? PagePosts2[i].SurpriseSelectedWords
            : null;

          answerPosts[j].IsOnetimeStream = AnsIsOneTimeOrNotMap[
            String(answerPosts[j].QuestionPostId)
          ]
            ? AnsIsOneTimeOrNotMap[String(answerPosts[j].QuestionPostId)]
            : false;

          answerPosts[j].IsPrivateQuestionPost = privateAnswerMap[
            String(answerPosts[j].QuestionPostId)
          ]
            ? privateAnswerMap[String(answerPosts[j].QuestionPostId)]
            : false;

          //logic to get SelectedBlendImages for answerPosts
          var cond = {
            PostId: answerPosts[j]._id,
          };
          var f = {
            SelectedBlendImages: 1,
          };
          var SelectedBlendImages = await PageStream.find(cond, f);
          if (SelectedBlendImages.length) {
            answerPosts[j].SelectedBlendImages = SelectedBlendImages[0]
              .SelectedBlendImages
              ? SelectedBlendImages[0].SelectedBlendImages
              : [];
          }
          answerPosts[j].SelectedBlendImages = answerPosts[j]
            .SelectedBlendImages
            ? answerPosts[j].SelectedBlendImages
            : [];
          //logic to get SelectedBlendImages for answerPosts

          postsForOwner.push(answerPosts[j]);
          //break;
        } else {
          console.log(
            "############################################################# ELSE -------------- " +
              answerPosts[j].PostType +
              " -------------- " +
              String(answerPosts[j].QuestionPostId) +
              " ====== " +
              String(PagePosts2[i]._id)
          );
          continue;
        }
      } else {
        console.log(
          "ELSE ---------------- PagePosts2[i].PostType ============ ",
          PagePosts2[i].PostType
        );
        if (otherPostIdsAddedInQueue.indexOf(String(PagePosts2[i]._id)) < 0) {
          postsForOwner.push(PagePosts2[i]);
          otherPostIdsAddedInQueue.push(String(PagePosts2[i]._id));
        }
      }
    }
  }

  console.log(
    "FINAL $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4--------------postsForOwner.length ----------------- ",
    postsForOwner.length
  );
  PagePosts2 = postsForOwner;

  console.log(
    "----------------- __streamPagePostNow_GroupStream called 22222222222 ----------------------------"
  );
  var EmailEngineDataSets =
    __getEmailEngineDataSetsBasedOnMonthAndFreq_AllPosts(CapsuleData);
  console.log(
    "EmailEngineDataSets.length ----------- ",
    EmailEngineDataSets.length
  );
  if (!EmailEngineDataSets.length) {
    EmailEngineDataSets = null;
  }
  PageData.EmailEngineDataSets = PageData.EmailEngineDataSets
    ? PageData.EmailEngineDataSets
    : [];
  PageData.EmailEngineDataSets = EmailEngineDataSets
    ? EmailEngineDataSets
    : PageData.EmailEngineDataSets;
  console.log(
    ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>PagePosts2.length ----------- ",
    PagePosts2.length
  );
  //return;

  var afterDays = 0;

  for (var loop = 0; loop < PagePosts2.length; loop++) {
    var postObj = PagePosts2[loop];
    var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
    PostImage = PostImage ? PostImage : "";
    PostImage =
      PostImage.indexOf("unsplash") >= 0
        ? PostImage
        : "https://www.scrpt.com/assets/Media/img/300/" + PostImage;

    //var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : postObj.Content;
    //var PostStatement = postObj.PostStatement ? postObj.PostStatement : postObj.Content;
    var PostStatement = postObj.PostStatement
      ? postObj.PostStatement
      : postObj.MediaType == "Link"
      ? ""
      : postObj.Content;
    var PostStatement_Apost = postObj.PostStatement_Apost
      ? postObj.PostStatement_Apost
      : "";

    PostStatement = PostStatement ? PostStatement : "";
    /*PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
          PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
          PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
          PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
          PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
          PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
          PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');*/

    postObj.IsOnetimeStream = postObj.IsOnetimeStream
      ? postObj.IsOnetimeStream
      : false;

    if (
      postObj.MediaType != "Notes" &&
      (postObj.PostType == "QuestionPost" || postObj.PostType == "AnswerPost")
    ) {
      //CapsuleData.IsOnetimeStream = true;
      //CapsuleData.IsOnlyPostImage = true;
      postObj.IsOnetimeStream = postObj.IsOnetimeStream
        ? postObj.IsOnetimeStream
        : false;
    }

    if (
      postObj.MediaType == "Notes" &&
      (postObj.PostType == "QuestionPost" || postObj.PostType == "AnswerPost")
    ) {
      postObj.IsOnetimeStream = postObj.IsOnetimeStream
        ? postObj.IsOnetimeStream
        : false;
    }

    /*
          if(postObj.MediaType == 'Notes' && (postObj.PostType == 'QuestionPost' || postObj.PostType == 'AnswerPost')) {
              CapsuleData.IsOnetimeStream = false;
              CapsuleData.IsOnlyPostImage = false;
          }
  
          if(postObj.PostType == 'AnswerPost') {
              postObj.IsOnetimeStream = postObj.IsOnetimeStream ? postObj.IsOnetimeStream : false;
              CapsuleData.IsOnetimeStream = postObj.IsOnetimeStream ? postObj.IsOnetimeStream : false;
              CapsuleData.IsOnlyPostImage = postObj.IsOnetimeStream ? postObj.IsOnetimeStream : false;
          }*/

    First_SyncedPosts = First_SyncedPosts ? First_SyncedPosts : {};
    var datenow = new Date();

    req.session.user.Birthdate = req.session.user.Birthdate
      ? req.session.user.Birthdate
      : null;
    if (req.session.user.Birthdate) {
      var birthday = new Date(req.session.user.Birthdate);
      var bDate = birthday.getDate();
      var bMonth = birthday.getMonth();

      var datenowDate = datenow.getDate();
      var datenowMonth = datenow.getMonth();
      var datenowYear = datenow.getFullYear();
      if (bMonth == datenowMonth) {
        if (bDate >= datenowDate) {
          birthday.setFullYear(parseInt(datenowYear));
          datenow = birthday;
        } else {
          birthday.setFullYear(parseInt(datenowYear) + 1);
          datenow = birthday;
        }
      } else if (bMonth < datenowMonth) {
        birthday.setFullYear(parseInt(datenowYear) + 1);
        datenow = birthday;
      } else {
        datenow.setDate(bDate);
      }
    } else {
      console.log(
        "------------------------------------------------FLOW BREAKED----------------------------------------------------------------------"
      );
      break;
    }

    var text = PostStatement_Apost ? PostStatement_Apost : PostStatement;
    var inputObj = {
      CapsuleId: CapsuleData._id ? CapsuleData._id : null,
      PageId: PageData._id ? PageData._id : null,
      PostId: postObj._id,
      PostOwnerId: postObj.PostedBy,
      ReceiverEmails: [req.session.user.Email],
      PostImage: PostImage,
      PostStatement: PostStatement,
      IsSurpriseCase: true,
      IsPageStreamCase: true,
      EmailEngineDataSets: [],
      SurpriseSelectedWords:
        postObj.PostType == "AnswerPost"
          ? await fetchKeywordsFromText(text)
          : postObj.SurpriseSelectedWords
          ? postObj.SurpriseSelectedWords.split(",")
          : await fetchKeywordsFromText(text),
      SurpriseSelectedTags: [],
      SyncedBy: req.session.user._id,
      SyncedByName: req.session.user.Name,
      EmailTemplate: CapsuleData.EmailTemplate
        ? CapsuleData.EmailTemplate
        : "PracticalThinker",
      IsStreamPaused: CapsuleData.IsStreamPaused
        ? CapsuleData.IsStreamPaused
        : 0,
      //"CreatedOn" : First_SyncedPosts.CreatedOn ? First_SyncedPosts.CreatedOn : new Date(datenow.getTime() - (1 * 24 * 60 * 60 * 1000)),
      CreatedOn: First_SyncedPosts.CreatedOn
        ? First_SyncedPosts.CreatedOn
        : Date.now(),
      EmailSubject: CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
      //IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
      IsOnetimeStream: postObj.IsOnetimeStream
        ? postObj.IsOnetimeStream
        : false,
      IsOnlyPostImage: CapsuleData.IsOnlyPostImage
        ? CapsuleData.IsOnlyPostImage
        : false,
      StreamType: "Group",
      IsPrivateQuestionPost: postObj.IsPrivateQuestionPost
        ? postObj.IsPrivateQuestionPost
        : false,
    };

    inputObj.EmailEngineDataSets = [];

    var LabelId = postObj.Label ? String(postObj.Label) : null;

    for (var i = 0; i < PageData.EmailEngineDataSets.length; i++) {
      var obj = PageData.EmailEngineDataSets[i];
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

    console.log(
      "------------ inputObj.EmailEngineDataSets.length = ",
      inputObj.EmailEngineDataSets.length
    );

    for (var i = 0; i < inputObj.EmailEngineDataSets.length; i++) {
      inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj
        .EmailEngineDataSets[i].TextAboveVisual
        ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
      inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj
        .EmailEngineDataSets[i].TextBelowVisual
        ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
    }

    //get the selected blend images of the post if there is any else use the default procedure.
    if (postObj.PostType == "GeneralPost" || postObj.PostType == "KeyPost") {
      afterDays++;
      postObj.AfterDays = afterDays;
    }
    //inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages(postObj, PagePosts2, inputObj.EmailEngineDataSets, CapsuleData);
    inputObj.EmailEngineDataSets =
      __getEmailEngineDataSetsFromSelectedBlendImages_NDays(
        postObj,
        PagePosts2,
        inputObj.EmailEngineDataSets,
        CapsuleData,
        9
      );

    postObj.SelectedBlendImages = postObj.SelectedBlendImages
      ? postObj.SelectedBlendImages
      : [];

    console.log(
      "---->>>>>>>>>>>>>>>>>>>>>>>-------- inputObj.EmailEngineDataSets.length = ",
      inputObj.EmailEngineDataSets.length
    );
    //break;return;
    //console.log("inputObj -------------------------- ", inputObj);
    if (inputObj.IsOnetimeStream || postObj.PostType == "GeneralPost") {
      if (
        inputObj.PageId &&
        inputObj.PostId &&
        inputObj.PostOwnerId &&
        inputObj.EmailEngineDataSets &&
        inputObj.ReceiverEmails.length
      ) {
        try {
          //now call the api.
          var request_url =
            "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
          //var request_url = 'https://www.scrpt.com/journal/streamPage';
          var response = await axios.post(request_url, inputObj);
          response = typeof response == "object" ? response : {};
          response.data = response.data ? response.data : {};
          response.data.code = response.data.code ? response.data.code : null;
          console.log(
            "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
            response.data.code
          );
        } catch (caughtExp) {
          console.log("caughtExp = ", caughtExp);
        }
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
          try {
            //now call the api.
            var request_url =
              "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
            //var request_url = 'https://www.scrpt.com/journal/streamPage';
            var response = await axios.post(request_url, inputObj);
            response = typeof response == "object" ? response : {};
            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            console.log(
              "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
              response.data.code
            );
          } catch (caughtExp) {
            console.log("caughtExp = ", caughtExp);
          }
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
          try {
            //now call the api.
            var request_url = "https://www.scrpt.com/journal/streamPage";
            var response = await axios.post(request_url, inputObj);
            response = typeof response == "object" ? response : {};
            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            console.log(
              "------------ AXIOS (/journal/streamPage) ---- Post has been streamed successfully using api call ---------------",
              response.data.code
            );
          } catch (caughtExp) {
            console.log("caughtExp = ", caughtExp);
          }
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
  for (var loop = 0; loop < PagePosts_keyposts.length; loop++) {
    var postObj = PagePosts_keyposts[loop];
    var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
    PostImage = PostImage ? PostImage : "";
    PostImage =
      PostImage.indexOf("unsplash") >= 0
        ? PostImage
        : "https://www.scrpt.com/assets/Media/img/300/" + PostImage;

    var PostStatement =
      postObj.MediaType != "Notes"
        ? postObj.PostStatement
        : postObj.MediaType == "Link"
        ? ""
        : postObj.Content;

    PostStatement = PostStatement ? PostStatement : "";
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
      PostOwnerId: postObj.PostedBy,
      ReceiverEmails: shareWithEmail ? [shareWithEmail] : [],
      PostImage: PostImage,
      PostStatement: PostStatement,
      IsSurpriseCase: true,
      IsPageStreamCase: true,
      EmailEngineDataSets: [],
      SurpriseSelectedWords: postObj.SurpriseSelectedWords
        ? postObj.SurpriseSelectedWords.split(",")
        : await fetchKeywordsFromText(PostStatement),
      SurpriseSelectedTags: [],
      SyncedBy: req.session.user._id,
      SyncedByName: req.session.user.Name,
      EmailTemplate: CapsuleData.EmailTemplate
        ? CapsuleData.EmailTemplate
        : "PracticalThinker",
      IsStreamPaused: CapsuleData.IsStreamPaused
        ? CapsuleData.IsStreamPaused
        : 0,
      CreatedOn: First_SyncedPosts.CreatedOn
        ? First_SyncedPosts.CreatedOn
        : Date.now(),
      EmailSubject: CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
      IsOnetimeStream: CapsuleData.IsOnetimeStream
        ? CapsuleData.IsOnetimeStream
        : false,
      IsOnlyPostImage: CapsuleData.IsOnlyPostImage
        ? CapsuleData.IsOnlyPostImage
        : false,
      StreamType: "Group",
    };

    inputObj.EmailEngineDataSets = [];

    if (!inputObj.EmailEngineDataSets.length) {
      inputObj.EmailEngineDataSets = EmailEngineDataSets_keyposts
        ? EmailEngineDataSets_keyposts
        : [];
    }

    console.log(
      "------------ inputObj.EmailEngineDataSets.length = ",
      inputObj.EmailEngineDataSets.length
    );

    for (var i = 0; i < inputObj.EmailEngineDataSets.length; i++) {
      inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj
        .EmailEngineDataSets[i].TextAboveVisual
        ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(
            /\n/g,
            "<br />"
          )
        : "";
      inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj
        .EmailEngineDataSets[i].TextBelowVisual
        ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(
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
    postObj.SelectedBlendImages = postObj.SelectedBlendImages
      ? postObj.SelectedBlendImages
      : [];

    var KeyPost_case = true; //inputObj.IsOnetimeStream
    if (KeyPost_case) {
      if (
        inputObj.PageId &&
        inputObj.PostId &&
        inputObj.PostOwnerId &&
        inputObj.EmailEngineDataSets &&
        inputObj.ReceiverEmails.length
      ) {
        try {
          //now call the api.
          var request_url =
            "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
          //var request_url = 'https://www.scrpt.com/journal/streamPage';
          var response = await axios.post(request_url, inputObj);
          response = typeof response == "object" ? response : {};
          response.data = response.data ? response.data : {};
          response.data.code = response.data.code ? response.data.code : null;
          console.log(
            "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
            response.data.code
          );
        } catch (caughtExp) {
          console.log("caughtExp = ", caughtExp);
        }
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
          try {
            //now call the api.
            var request_url =
              "https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase";
            //var request_url = 'https://www.scrpt.com/journal/streamPage';
            var response = await axios.post(request_url, inputObj);
            response = typeof response == "object" ? response : {};
            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            console.log(
              "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
              response.data.code
            );
          } catch (caughtExp) {
            console.log("caughtExp = ", caughtExp);
          }
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
          try {
            //now call the api.
            var request_url = "https://www.scrpt.com/journal/streamPage";
            var response = await axios.post(request_url, inputObj);
            response = typeof response == "object" ? response : {};
            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            console.log(
              "------------ AXIOS ---- Post has been streamed successfully using api call ---------------",
              response.data.code
            );
          } catch (caughtExp) {
            console.log("caughtExp = ", caughtExp);
          }
        }
      }
    }
  }

  console.log("----- __streamPagePostNow_GroupStream COMPLETED -------- ");

  if (
    await mapPostsAsPerSettings(CapsuleData, firstTimeFlag, First_SyncedPosts)
  ) {
    console.log(
      "----------------- __streamPagePostNow_GroupStream SUCCESSFULLY COMPLETED for GROUP Stream Case - Launch Date launch Case ----------------------------"
    );
  } else {
    console.log(
      "__streamPagePostNow_GroupStream Final Step - Something went wrong"
    );
  }
}

var createPostsOnEventDay_INTERNAL_API = async function (req, res) {
  try {
    req.session = req.session ? req.session : {};
    req.session.user = req.body.SessionUser ? req.body.SessionUser : null;

    if (!req.session.user) {
      return;
    }
    console.log("check 1 - passed");
    var CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;

    if (!CapsuleId) {
      return;
    }
    console.log("check 2 - passed");
    var conditions = {
      _id: CapsuleId,
    };

    var doc = {
      $set: {
        MonthFor: req.body.MonthFor ? req.body.MonthFor : "M12",
        Frequency: "medium", //req.body.Frequency ? req.body.Frequency
        EmailTemplate: req.body.EmailTemplate
          ? req.body.EmailTemplate
          : "PracticalThinker",
        IsStreamPaused: req.body.IsStreamPaused ? true : false,
      },
    };

    if (typeof req.body.EmailSubject != "undefined") {
      doc.$set.EmailSubject = req.body.EmailSubject
        ? req.body.EmailSubject
        : "";
    }

    if (typeof req.body.IsOnetimeStream != "undefined") {
      doc.$set.IsOnetimeStream = req.body.IsOnetimeStream
        ? req.body.IsOnetimeStream
        : false;
    }

    if (typeof req.body.IsOnlyPostImage != "undefined") {
      doc.$set.IsOnlyPostImage = req.body.IsOnlyPostImage
        ? req.body.IsOnlyPostImage
        : false;
    }

    var CapsuleData_beforeUpdate = await Capsule.findOne(conditions);
    //await Capsule.update(conditions, doc);

    var CapsuleData = await Capsule.findOne(conditions);
    var PageData = await getPagesByCapsuleId(CapsuleId);
    PageData.Medias = PageData.Medias ? PageData.Medias : [];

    //soft delete old stream posts of this page and reset again as per the settings changes if Month or Frequency is changed else simply update the records.
    var conditions_sp = {
      CapsuleId: CapsuleData._id,
      PageId: PageData._id,
      IsDeleted: 0,
    };
    var First_SyncedPosts = await SyncedPost.findOne(conditions_sp).sort({
      _id: -1,
    });
    First_SyncedPosts = First_SyncedPosts ? First_SyncedPosts : {};

    First_SyncedPosts._id = First_SyncedPosts._id
      ? First_SyncedPosts._id
      : null;
    if (First_SyncedPosts._id) {
      //making sure that this does not hit by cron job on event day more than 1 time.
      return;
    }
    console.log("check 3 - passed");
    First_SyncedPosts.EmailTemplate = First_SyncedPosts.EmailTemplate
      ? First_SyncedPosts.EmailTemplate
      : "PracticalThinker";
    First_SyncedPosts.Status = First_SyncedPosts.Status
      ? First_SyncedPosts.Status
      : false;
    First_SyncedPosts.MonthFor = CapsuleData_beforeUpdate.MonthFor
      ? CapsuleData_beforeUpdate.MonthFor
      : "M12";
    First_SyncedPosts.Frequency = CapsuleData_beforeUpdate.Frequency
      ? CapsuleData_beforeUpdate.Frequency
      : "medium";

    var dataToUpdate = {
      Status: !doc.$set.IsStreamPaused,
      EmailTemplate: doc.$set.EmailTemplate
        ? doc.$set.EmailTemplate
        : "PracticalThinker",
    };

    if (typeof req.body.EmailSubject != "undefined") {
      dataToUpdate.EmailSubject = req.body.EmailSubject
        ? req.body.EmailSubject
        : "";
      First_SyncedPosts.EmailSubject = dataToUpdate.EmailSubject;
    }

    if (typeof req.body.IsOnetimeStream != "undefined") {
      dataToUpdate.IsOnetimeStream = req.body.IsOnetimeStream
        ? req.body.IsOnetimeStream
        : false;
      First_SyncedPosts.IsOnetimeStream = dataToUpdate.IsOnetimeStream;
    }

    if (typeof req.body.IsOnlyPostImage != "undefined") {
      dataToUpdate.IsOnlyPostImage = req.body.IsOnlyPostImage
        ? req.body.IsOnlyPostImage
        : false;
      First_SyncedPosts.IsOnlyPostImage = dataToUpdate.IsOnlyPostImage;
    }

    await SyncedPost.update(
      conditions_sp,
      { $set: dataToUpdate },
      { multi: true }
    );

    //if(doc.$set.MonthFor != First_SyncedPosts.MonthFor || doc.$set.Frequency != First_SyncedPosts.Frequency) {
    for (var i = 0; i < PageData.Medias.length; i++) {
      var cond = {
        PageId: PageData.OriginatedFrom,
        PostId: PageData.Medias[i].OriginatedFrom,
      };

      if (
        PageData.Medias[i].PostType == "AnswerPost" &&
        PageData.Medias[i].QuestionPostId
      ) {
        cond = {
          PostId: PageData.Medias[i]._id,
        };
      }

      var f = {
        SelectedBlendImages: 1,
      };
      var SelectedBlendImages = await PageStream.find(cond, f);
      if (SelectedBlendImages.length) {
        PageData.Medias[i].SelectedBlendImages = SelectedBlendImages[0]
          .SelectedBlendImages
          ? SelectedBlendImages[0].SelectedBlendImages
          : [];
      }

      PageData.Medias[i].SelectedBlendImages = PageData.Medias[i]
        .SelectedBlendImages
        ? PageData.Medias[i].SelectedBlendImages
        : [];
    }
    console.log("check 4 - passed");
    req.session.user.Birthdate = req.session.user.Birthdate
      ? req.session.user.Birthdate
      : null;
    if (
      CapsuleData.LaunchSettings.StreamType == "Group" &&
      !req.session.user.Birthdate
    ) {
      console.log(
        "-------------------------------------------HERE-------------------------",
        req.session.user.Birthdate
      );
    } else {
      console.log("check 5 - passed");
      var dataToUpdate2 = {
        IsDeleted: 1,
      };

      //await SyncedPost.update(conditions_sp, {$set : dataToUpdate2}, {multi : true});

      CapsuleData.LaunchSettings = CapsuleData.LaunchSettings
        ? CapsuleData.LaunchSettings
        : {};
      CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings
        .StreamType
        ? CapsuleData.LaunchSettings.StreamType
        : "";
      if (CapsuleData.LaunchSettings.StreamType != "Group") {
        __streamPagePostNow(
          PageData.Medias,
          PageData,
          req,
          CapsuleData,
          First_SyncedPosts
        );
      } else {
        console.log("check 6 - passed");
        CapsuleData.StreamFlow = CapsuleData.StreamFlow
          ? CapsuleData.StreamFlow
          : "Birthday";

        if (CapsuleData.StreamFlow == "Birthday") {
          //send announcement email to owner from here.
          var _OwnerName = req.session.user.Name
            ? req.session.user.Name.split(" ")[0]
            : "";
          var _OwnerEmail = req.session.user.Email;
          var _cId = req.session.user.AllFoldersId
            ? req.session.user.AllFoldersId
            : "";
          var _pId = req.session.user.AllPagesId
            ? req.session.user.AllPagesId
            : "";
          var _StreamUrl =
            "https://www.scrpt.com/streams/" +
            _cId +
            "/" +
            _pId +
            "?stream=" +
            CapsuleData._id;

          //__sendEventAnnouncementEmail(_OwnerEmail, _OwnerName, _StreamUrl);
        }

        __streamPagePostNow_GroupStream(
          PageData.Medias,
          PageData,
          req,
          CapsuleData,
          First_SyncedPosts
        );
      }
    }
    //}
  } catch (caughtError) {
    console.log("caughtError - ", caughtError);
  }
};
// Export all functions for use in other modules
exports.createPostsOnEventDay_INTERNAL_API = createPostsOnEventDay_INTERNAL_API;
exports.__streamPagePostNow_GroupStream = __streamPagePostNow_GroupStream;
exports.__streamPagePostNow = __streamPagePostNow;
exports.mapPostsAsPerSettings = mapPostsAsPerSettings;
exports.getCelebrities = getCelebrities;
exports.getPagesByCapsuleId = getPagesByCapsuleId;
exports.fetchKeywordsFromText = fetchKeywordsFromText;
exports.AreSyncedPostsAlreadyThere = AreSyncedPostsAlreadyThere;
