var Capsule = require("./../models/capsuleModel.js");
var Chapter = require("./../models/chapterModel.js");
var Page = require("./../models/pageModel.js");
var PageStream = require("./../models/pageStreamModel.js");
var User = require("./../models/userModel.js");
var EmailTemplate = require("./../models/emailTemplateModel.js");
var Referral = require("./../models/referralModel.js");
var Cart = require("./../models/cartModel.js");
var Order = require("./../models/orderModel.js");
const mongoose = require("mongoose");
const axios = require("axios");
const nodemailer = require("nodemailer");

// Import __streamPagePostNow function from ordersController_ASYNC.js (lazy loading to avoid circular dependency)
let __streamPagePostNow = null;
const getStreamPagePostNow = () => {
  if (!__streamPagePostNow) {
    const ordersController = require("./ordersController_ASYNC");
    __streamPagePostNow = ordersController.__streamPagePostNow;
  }
  return __streamPagePostNow;
};

// Custom Error Classes
class CapsuleInstanceError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "CapsuleInstanceError";
    this.code = code;
    this.details = details;
  }
}

// Configuration
const CONFIG = {
  EMAIL: {
    TEMPLATES: {
      PUBLISHED_FOR_OTHERS: "Published__ForOthers",
      PURCHASED_FOR_GIFT: "Purchased__ForGift",
      PURCHASED_FOR_GIFT_STREAM: "Purchased__ForGift__Stream",
      PURCHASED_FOR_GIFT_GROUP_STREAM: "Purchased__ForGift__GroupStream",
      PURCHASED_FOR_SURPRISE_GIFT: "Purchased__ForSurpriseGift__GroupStream",
      PURCHASED_FOR_MYSELF: "Purchased__ForMyself",
      PURCHASED_FOR_MYSELF_STREAM: "Purchased__ForMyself__Stream",
      PURCHASED_FOR_MYSELF_GROUP_STREAM: "Purchased__ForMyself__GroupStream",
    },
    DELAY: 3000,
    RETRY_ATTEMPTS: 3,
  },
  STREAM: {
    DEFAULT_MONTH_FOR: "M12",
    DEFAULT_FREQUENCY: "medium",
    DEFAULT_EMAIL_TEMPLATE: "PracticalThinker",
    BIRTHDAY_CALCULATION_DAYS: 2,
  },
  EXTERNAL_API: {
    CREATE_USER_URL:
      "https://www.scrpt.com/journal/createNewUserAccount_INTERNAL_API",
  },
};

/**
 * Text Personalization Module - Exact match to original
 */
class TextPersonalizer {
  static personalizeText(text, gender, name) {
    if (!text || typeof text !== "string") return text;

    let result = text;

    // Replace Jack/Jill with actual name
    result = result.replace(/\bJack\b/g, name);
    result = result.replace(/\bJill\b/g, name);

    switch (gender.toLowerCase()) {
      case "male":
        result = this.replacePronouns(result, {
          She: "He",
          she: "he",
          her: "his",
          Her: "His",
          herself: "himself",
          Herself: "Himself",
        });
        break;

      case "female":
        result = this.replacePronouns(result, {
          He: "She",
          he: "she",
          his: "her",
          His: "Her",
          him: "her",
          Him: "Her",
          himself: "herself",
          Himself: "Herself",
        });
        break;

      default: // neutral/other
        result = this.replacePronouns(result, {
          He: "They",
          he: "they",
          "He is": "They are",
          "he is": "they are",
          his: "their",
          His: "Their",
          him: "them",
          Him: "Them",
          himself: "themselves",
          Himself: "Themselves",
          She: "They",
          she: "they",
          "She is": "They are",
          "she is": "they are",
          her: "them",
          Her: "Their",
          herself: "himself",
          Herself: "Himself",
        });
        break;
    }

    return result;
  }

  static replacePronouns(text, replacements) {
    let result = text;
    for (const [from, to] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${from}\\b`, "g");
      result = result.replace(regex, to);
    }
    return result;
  }
}

/**
 * Main Function - Exact replica with modern mechanisms
 */
const createCapsuleInstance = async (
  CapsuleData,
  owner,
  req,
  index_value_email = -1
) => {
  const startTime = Date.now();
  const session = await mongoose.startSession();

  try {
    const __capsuleId = CapsuleData._id;

    console.log("Starting capsule instance creation", {
      capsuleId: __capsuleId,
      ownerEmail: owner.UserEmail,
      emailIndex: index_value_email,
    });

    // Check to make sure who will be the creator for new instances
    let __CreaterId_ForNewInstances = null;

    CapsuleData.LaunchSettings = CapsuleData.LaunchSettings
      ? CapsuleData.LaunchSettings
      : {};
    CapsuleData.LaunchSettings.Audience = CapsuleData.LaunchSettings.Audience
      ? CapsuleData.LaunchSettings.Audience
      : false;

    const CapsuleForCase = CapsuleData.LaunchSettings.Audience;
    switch (CapsuleForCase) {
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
        // Original behavior: res.json({ code: 404, message: "Something went wrong." });
        throw new CapsuleInstanceError("Something went wrong.", 404);
    }

    // Check if the owner is registered or not
    let shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
    const shareWithName = owner.UserName
      ? owner.UserName.split(" ")[0]
      : "OWNER";
    const UniqueIdPerOwner = owner.UniqueIdPerOwner
      ? owner.UniqueIdPerOwner
      : null;

    let result;
    await session.withTransaction(async () => {
      if (shareWithEmail) {
        shareWithEmail = shareWithEmail.replace(".", ".");
        const conditions = {
          Email: new RegExp("^" + shareWithEmail + "$", "i"),
          IsDeleted: false,
        };

        const fields = {
          Email: true,
          Name: true,
          Gender: true,
          Birthdate: true,
        };

        const UserData = await User.find(conditions, fields);

        if (UserData) {
          const data = {};
          data.Origin = "published";
          data.OriginatedFrom = __capsuleId;

          if (UniqueIdPerOwner != null) {
            data.UniqueIdPerOwner = UniqueIdPerOwner;
          }

          data.CreaterId = __CreaterId_ForNewInstances;
          data.PurchasedBy = req.session.user._id; // started using this from SurpriseGift flow

          if (!UserData.length) {
            // Non-Registered user case
            data.OwnerId = req.session.user._id; // will update this ownerId at the time of user registration
            // if this is a surprise gift case then create owner account if not present already and map Owner id here
            const request_url =
              "https://www.scrpt.com/journal/createNewUserAccount_INTERNAL_API";
            const inputObj = {
              newUser: {
                Name: shareWithName,
                Email: shareWithEmail,
                NickName: shareWithName,
              },
            };

            const response = await axios.post(request_url, inputObj);
            console.log("response ---- ", response);

            response.data = response.data ? response.data : {};
            response.data.code = response.data.code ? response.data.code : null;
            response.data.newUserId = response.data.newUserId
              ? response.data.newUserId
              : null;

            console.log(
              "------------ AXIOS ---- BuyNow - New User has been created ---------------",
              response.data.code,
              response.data.newUserId
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

          data.IsPublished = true; // published by someone else
          data.MetaData = CapsuleData.MetaData ? CapsuleData.MetaData : {};

          const nowDate = Date.now();
          data.CreatedOn = nowDate;
          data.ModifiedOn = nowDate;

          // Birthday Capsule Updates
          CapsuleData.LaunchSettings.CapsuleFor = CapsuleData.LaunchSettings
            .CapsuleFor
            ? CapsuleData.LaunchSettings.CapsuleFor
            : "";

          if (CapsuleData.LaunchSettings.CapsuleFor == "Birthday") {
            data.LaunchSettings = data.LaunchSettings
              ? data.LaunchSettings
              : {};
            data.LaunchSettings.CapsuleFor = "Birthday";
          }

          if (CapsuleData.LaunchSettings.CapsuleFor == "Theme") {
            data.LaunchSettings = data.LaunchSettings
              ? data.LaunchSettings
              : {};
            data.LaunchSettings.CapsuleFor = "Theme";
            data.IsLaunched = true; // Tree capsules are by default in launched state so that Owner can instantly invite all the users
          }

          if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
            CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings
              .StreamType
              ? CapsuleData.LaunchSettings.StreamType
              : null;

            data.LaunchSettings = data.LaunchSettings
              ? data.LaunchSettings
              : {};
            data.LaunchSettings.CapsuleFor = "Stream";
            data.LaunchSettings.StreamType =
              CapsuleData.LaunchSettings.StreamType;
            data.IsLaunched = true; // Tree capsules are by default in launched state so that Owner can instantly invite all the users

            data.MonthFor = CapsuleData.MonthFor ? CapsuleData.MonthFor : "M12";
            data.Frequency = CapsuleData.Frequency
              ? CapsuleData.Frequency
              : "medium";
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
            data.OwnerAnswer = CapsuleData.OwnerAnswer
              ? CapsuleData.OwnerAnswer
              : false;

            data.StreamFlow = CapsuleData.StreamFlow
              ? CapsuleData.StreamFlow
              : null;

            if (CapsuleData.LaunchSettings.StreamType == "Group") {
              data.StreamFlow = CapsuleData.StreamFlow
                ? CapsuleData.StreamFlow
                : "Birthday";
              data.LaunchDate = null;

              if (data.StreamFlow != "Birthday") {
                const t = new Date();
                const ty = t.getFullYear();
                const tm = t.getMonth() + 1;
                const td = t.getDate();
                const todayDate = new Date(ty + "-" + tm + "-" + td);

                const today = todayDate.getTime();
                const after2Days = today + 2 * 24 * 60 * 60 * 1000;

                const ldate = new Date(after2Days);
                const y = ldate.getFullYear();
                const m = ldate.getMonth() + 1;
                const d = ldate.getDate();
                data.LaunchDate = m + "/" + d + "/" + y;
              }

              if (data.StreamFlow == "Birthday") {
                if (UserData.length) {
                  UserData[0].Birthdate = UserData[0].Birthdate || "";
                  const birthdateArr = UserData[0].Birthdate.split("/");
                  if (birthdateArr.length === 3) {
                    const t = new Date();
                    const ty = t.getFullYear();
                    const tm = t.getMonth() + 1;
                    const td = t.getDate();
                    const tdFormatted = parseInt(td) < 10 ? "0" + td : td;
                    const tmFormatted = parseInt(tm) < 10 ? "0" + tm : tm;
                    const todayDate = new Date(
                      ty + "-" + tmFormatted + "-" + tdFormatted
                    );
                    const todayTS = todayDate.getTime();

                    const thisYearBdayStr =
                      ty + "-" + birthdateArr[0] + "-" + birthdateArr[1];
                    const thisYearBday = new Date(thisYearBdayStr);
                    const thisYearBdayTS = thisYearBday.getTime();

                    let lDate =
                      birthdateArr[0] + "/" + birthdateArr[1] + "/" + ty;
                    if (thisYearBdayTS < todayTS) {
                      const nextYearBdayStr =
                        birthdateArr[0] +
                        "/" +
                        birthdateArr[1] +
                        "/" +
                        (ty + 1);
                      lDate = nextYearBdayStr;
                    }
                    data.LaunchDate = lDate;
                  }
                }
              }
            }

            data.IsOwnerPostsForMember = CapsuleData.IsOwnerPostsForMember
              ? CapsuleData.IsOwnerPostsForMember
              : false;
            data.IsPurchaseNeededForAllPosts =
              CapsuleData.IsPurchaseNeededForAllPosts
                ? CapsuleData.IsPurchaseNeededForAllPosts
                : false;
          }

          // Create capsule instance
          const newCapsule = await Capsule.create(data);
          const newCapsuleId = newCapsule._id;

          // Process chapters
          const chapterConditions = {
            CapsuleId: __capsuleId,
            Status: 1,
            IsDeleted: 0,
          };

          const chapterSortObj = {
            Order: 1,
            ModifiedOn: -1,
          };
          const chapterFields = {
            _id: true,
          };

          const chapters = await Chapter.find(
            chapterConditions,
            chapterFields
          ).sort(chapterSortObj);

          // Array to collect new chapter IDs
          const newChapterIds = [];

          for (const chapter of chapters) {
            const chapterDetailFields = {
              _id: true,
              Title: true,
              CoverArt: true,
              Order: true,
              LaunchSettings: true,
              CoverArtFirstPage: true,
              ChapterPlaylist: true,
            };

            const chapterDetail = await Chapter.findOne(
              { _id: chapter._id },
              chapterDetailFields
            );
            const __chapterId = chapterDetail._id ? chapterDetail._id : 0;

            const chapterData = {};
            chapterData.Origin = "published";
            chapterData.OriginatedFrom = chapterDetail._id;
            chapterData.CreaterId = __CreaterId_ForNewInstances;

            if (!UserData.length) {
              chapterData.OwnerId = req.session.user._id;
            } else {
              chapterData.OwnerId = UserData[0]._id;
            }

            chapterData.OwnerEmail = shareWithEmail;
            chapterData.CapsuleId = newCapsuleId;
            chapterData.Title = chapterDetail.Title;
            chapterData.CoverArt = chapterDetail.CoverArt;
            chapterData.Order = chapterDetail.Order;
            chapterData.LaunchSettings = {};
            chapterData.LaunchSettings.NamingConvention =
              chapterDetail.LaunchSettings.NamingConvention;
            chapterData.LaunchSettings.ShareMode =
              chapterDetail.LaunchSettings.ShareMode;
            chapterData.CoverArtFirstPage = chapterDetail.CoverArtFirstPage
              ? chapterDetail.CoverArtFirstPage
              : "";
            chapterData.ChapterPlaylist = chapterDetail.ChapterPlaylist
              ? chapterDetail.ChapterPlaylist
              : [];

            chapterData.CreatedOn = nowDate;
            chapterData.ModifiedOn = nowDate;

            if (CapsuleData.LaunchSettings.CapsuleFor == "Theme") {
              chapterData.IsLaunched = true; // Tree capsules are by default in launched state so that Owner can instantly invite all the users
            }

            const newChapter = await Chapter.create(chapterData);
            const newChapterId = newChapter._id;

            // Add new chapter ID to array for capsule update
            newChapterIds.push(newChapterId);

            // Array to collect new page IDs for this chapter
            const newPageIds = [];

            // Process pages
            const pageConditions = {
              ChapterId: __chapterId,
              IsDasheditpage: false, // this is to prevent the double instances of the page issue
              IsDeleted: 0,
              PageType: { $in: ["gallery", "content", "qaw-gallery"] },
            };

            const pageSortObj = {
              Order: 1,
              UpdatedOn: -1,
            };
            const pageFields = {
              _id: true,
            };

            const pages = await Page.find(pageConditions, pageFields).sort(
              pageSortObj
            );

            for (const page of pages) {
              const pageDetailFields = {
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

              if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
                pageDetailFields.Medias = true;
              }

              const pageDetail = await Page.findOne(
                { _id: page._id },
                pageDetailFields
              );

              const pageData = {};
              pageData.Origin = "published";
              pageData.OriginatedFrom = pageDetail._id;
              pageData.CreaterId = __CreaterId_ForNewInstances;

              if (!UserData.length) {
                pageData.OwnerId = req.session.user._id;
              } else {
                pageData.OwnerId = UserData[0]._id;
              }

              pageData.OwnerEmail = shareWithEmail;
              pageData.ChapterId = newChapterId ? newChapterId : "";
              pageData.Title = pageDetail.Title;
              pageData.TitleInvitees = pageDetail.TitleInvitees
                ? pageDetail.TitleInvitees
                : pageDetail.Title;
              pageData.PageType = pageDetail.PageType;
              pageData.Order = pageDetail.Order;
              pageData.HeaderImage = pageDetail.HeaderImage
                ? pageDetail.HeaderImage
                : "";
              pageData.BackgroundMusic = pageDetail.BackgroundMusic
                ? pageDetail.BackgroundMusic
                : "";
              pageData.HeaderBlurValue = pageDetail.HeaderBlurValue;
              pageData.HeaderTransparencyValue =
                pageDetail.HeaderTransparencyValue;

              pageData.SelectedMedia = pageDetail.SelectedMedia;
              pageData.SelectionCriteria = pageDetail.SelectionCriteria;
              pageData.Labels = pageDetail.Labels ? pageDetail.Labels : [];
              pageData.IsLabelAllowed = pageDetail.IsLabelAllowed
                ? pageDetail.IsLabelAllowed
                : false;
              pageData.HeaderVideoLink = pageDetail.HeaderVideoLink
                ? pageDetail.HeaderVideoLink
                : "";
              pageData.EmailEngineDataSets = pageDetail.EmailEngineDataSets
                ? pageDetail.EmailEngineDataSets
                : [];
              pageData.VoiceOverLyricsSettings =
                pageDetail.VoiceOverLyricsSettings
                  ? pageDetail.VoiceOverLyricsSettings
                  : [];
              pageData.VoiceOverFile = pageDetail.VoiceOverFile
                ? pageDetail.VoiceOverFile
                : "";
              pageData.Themes = pageDetail.Themes ? pageDetail.Themes : [];

              pageData.CreatedOn = nowDate;
              pageData.UpdatedOn = nowDate;

              if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
                // Make a copy of Posts and transfer ownership
                pageData.Medias = pageDetail.Medias ? pageDetail.Medias : [];
                for (let i = 0; i < pageData.Medias.length; i++) {
                  pageData.Medias[i].OriginatedFrom = pageData.Medias[i]._id;
                  pageData.Medias[i].Origin = "Copy";
                  pageData.Medias[i]._id = new mongoose.Types.ObjectId();
                  pageData.Medias[i].OwnerId = pageData.OwnerId;
                  pageData.Medias[i].PostedBy = pageData.OwnerId;

                  const cond = {
                    PageId: pageData.OriginatedFrom,
                    PostId: pageData.Medias[i].OriginatedFrom,
                  };
                  const f = {
                    SelectedBlendImages: 1,
                  };
                  const SelectedBlendImages = await PageStream.find(cond, f);
                  if (SelectedBlendImages.length) {
                    pageData.Medias[i].SelectedBlendImages =
                      SelectedBlendImages[0].SelectedBlendImages
                        ? SelectedBlendImages[0].SelectedBlendImages
                        : [];
                  }

                  pageData.Medias[i].SelectedBlendImages = pageData.Medias[i]
                    .SelectedBlendImages
                    ? pageData.Medias[i].SelectedBlendImages
                    : [];
                }
                // Make a copy of post and transfer ownership
              }

              // AUTO NAME REPLACE FILTER
              let OwnerGender = "male";
              let OwnerName = "OWNER";
              if (UserData.length) {
                OwnerGender = UserData[0].Gender ? UserData[0].Gender : "male";
                OwnerName = UserData[0].Name
                  ? UserData[0].Name.split(" ")[0]
                  : "OWNER";
              } else {
                OwnerName = shareWithName ? shareWithName : "OWNER";
              }

              if (pageData.PageType == "gallery") {
                pageData.Title = TextPersonalizer.personalizeText(
                  pageData.Title,
                  OwnerGender,
                  OwnerName
                );
              }

              // Content page data keys were missing before - fixing on 12052016 with team
              let Desktop__allHiddenBoardId_Arr = [];
              let Tablet__allHiddenBoardId_Arr = [];
              let Mobile__allHiddenBoardId_Arr = [];

              let allHiddenBoardId_Arr = [];

              let Desktop__allHiddenBoardId__index_Arr = [];
              let Tablet__allHiddenBoardId__index_Arr = [];
              let Mobile__allHiddenBoardId__index_Arr = [];

              let margedArrOfAllQAPageIds = [];
              let UNIQUE__margedArrOfAllQAPageIds = [];

              let sourcePageId__DestinationPageId__Arr = [];

              if (pageData.PageType == "content") {
                pageData.CommonParams = pageDetail.CommonParams
                  ? pageDetail.CommonParams
                  : {};
                pageData.ViewportDesktopSections =
                  pageDetail.ViewportDesktopSections
                    ? pageDetail.ViewportDesktopSections
                    : {};
                pageData.ViewportTabletSections =
                  pageDetail.ViewportTabletSections
                    ? pageDetail.ViewportTabletSections
                    : {};
                pageData.ViewportMobileSections =
                  pageDetail.ViewportMobileSections
                    ? pageDetail.ViewportMobileSections
                    : {};

                // Desktop viewport filter
                pageData.ViewportDesktopSections.Widgets = pageData
                  .ViewportDesktopSections.Widgets
                  ? pageData.ViewportDesktopSections.Widgets
                  : [];

                for (
                  let loop = 0;
                  loop < pageData.ViewportDesktopSections.Widgets.length;
                  loop++
                ) {
                  const widObj = pageData.ViewportDesktopSections.Widgets[loop];
                  widObj.Type = widObj.Type ? widObj.Type : "";
                  if (widObj.Type == "questAnswer") {
                    // If Widget is a QA Widget then ...
                    const QuestString = pageData.ViewportDesktopSections
                      .Widgets[loop].Data
                      ? pageData.ViewportDesktopSections.Widgets[loop].Data
                      : "";
                    pageData.ViewportDesktopSections.Widgets[loop].Data =
                      TextPersonalizer.personalizeText(
                        QuestString,
                        OwnerGender,
                        OwnerName
                      );

                    widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
                    const HiddenBoardId = widObj.QAWidObj.PageId
                      ? widObj.QAWidObj.PageId
                      : "SOMETHING__WRONG";
                    if (HiddenBoardId != "SOMETHING__WRONG") {
                      Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
                      Desktop__allHiddenBoardId__index_Arr.push(
                        HiddenBoardId + "__" + loop + "__" + "DESKTOP"
                      );
                    }
                  }
                }

                // Tablet viewport filter
                pageData.ViewportTabletSections.Widgets = pageData
                  .ViewportTabletSections.Widgets
                  ? pageData.ViewportTabletSections.Widgets
                  : [];

                for (
                  let loop = 0;
                  loop < pageData.ViewportTabletSections.Widgets.length;
                  loop++
                ) {
                  const widObj = pageData.ViewportTabletSections.Widgets[loop];
                  if (widObj.Type == "questAnswer") {
                    // If Widget is a QA Widget then ...
                    const QuestString = pageData.ViewportTabletSections.Widgets[
                      loop
                    ].Data
                      ? pageData.ViewportTabletSections.Widgets[loop].Data
                      : "";
                    pageData.ViewportTabletSections.Widgets[loop].Data =
                      TextPersonalizer.personalizeText(
                        QuestString,
                        OwnerGender,
                        OwnerName
                      );

                    widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
                    const HiddenBoardId = widObj.QAWidObj.PageId
                      ? widObj.QAWidObj.PageId
                      : "SOMETHING_WRONG";
                    if (HiddenBoardId != "SOMETHING__WRONG") {
                      Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
                      Tablet__allHiddenBoardId__index_Arr.push(
                        HiddenBoardId + "__" + loop + "__" + "TABLET"
                      );
                    }
                  }
                }

                // Mobile viewport filter
                pageData.ViewportMobileSections.Widgets = pageData
                  .ViewportMobileSections.Widgets
                  ? pageData.ViewportMobileSections.Widgets
                  : [];

                for (
                  let loop = 0;
                  loop < pageData.ViewportMobileSections.Widgets.length;
                  loop++
                ) {
                  const widObj = pageData.ViewportMobileSections.Widgets[loop];
                  if (widObj.Type == "questAnswer") {
                    // If Widget is a QA Widget then ...
                    const QuestString = pageData.ViewportMobileSections.Widgets[
                      loop
                    ].Data
                      ? pageData.ViewportMobileSections.Widgets[loop].Data
                      : "";
                    pageData.ViewportMobileSections.Widgets[loop].Data =
                      TextPersonalizer.personalizeText(
                        QuestString,
                        OwnerGender,
                        OwnerName
                      );

                    widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
                    const HiddenBoardId = widObj.QAWidObj.PageId
                      ? widObj.QAWidObj.PageId
                      : "SOMETHING__WRONG";
                    if (HiddenBoardId != "SOMETHING__WRONG") {
                      Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
                      Mobile__allHiddenBoardId__index_Arr.push(
                        HiddenBoardId + "__" + loop + "__" + "MOBILE"
                      );
                    }
                  }
                }

                margedArrOfAllQAPageIds =
                  Desktop__allHiddenBoardId__index_Arr.concat(
                    Tablet__allHiddenBoardId__index_Arr
                  );
                margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(
                  Mobile__allHiddenBoardId__index_Arr
                );

                allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(
                  Tablet__allHiddenBoardId_Arr
                );
                allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(
                  Mobile__allHiddenBoardId_Arr
                );

                const UNIQUE__allHiddenBoardId_Arr = [
                  ...new Set(allHiddenBoardId_Arr),
                ];

                // Just for testing...
                const finalObj = {
                  Desktop__allHiddenBoardId__index_Arr:
                    Desktop__allHiddenBoardId__index_Arr,
                  Tablet__allHiddenBoardId__index_Arr:
                    Tablet__allHiddenBoardId__index_Arr,
                  Mobile__allHiddenBoardId__index_Arr:
                    Mobile__allHiddenBoardId__index_Arr,
                  margedArrOfAllQAPageIds: margedArrOfAllQAPageIds,
                  UNIQUE__allHiddenBoardId_Arr: UNIQUE__allHiddenBoardId_Arr,
                };

                // Now create new instances of the unique hidden boards and update the PageId on corresponding entries...
                if (finalObj.UNIQUE__allHiddenBoardId_Arr.length) {
                  const conditions = {
                    _id: { $in: finalObj.UNIQUE__allHiddenBoardId_Arr },
                  };
                  const fields = {
                    Medias: false,
                  };

                  const hiddenBoards = await Page.find(
                    conditions,
                    fields
                  ).lean();
                  const results = hiddenBoards ? hiddenBoards : [];
                  const totalOps = results.length ? results.length : 0;

                  if (totalOps) {
                    for (let loop = 0; loop < totalOps; loop++) {
                      const oldPageId = results[loop]._id;
                      const newInstanceData = results[loop];
                      newInstanceData.OriginatedFrom = oldPageId;
                      newInstanceData.Origin = "published";

                      delete newInstanceData._id;

                      newInstanceData.CreatedOn = Date.now();
                      newInstanceData.UpdatedOn = Date.now();

                      // Apply gender-based text replacement to title
                      const str = newInstanceData.Title
                        ? newInstanceData.Title
                        : "Untitled Page";
                      newInstanceData.Title = TextPersonalizer.personalizeText(
                        str,
                        OwnerGender,
                        OwnerName
                      );

                      const sourcePageId = sourcePageId
                        ? sourcePageId
                        : "SOMETHING_WRONG";
                      if (sourcePageId != "SOMETHING_WRONG") {
                        const newHiddenBoard = await Page.create(
                          newInstanceData
                        );
                        const sourcePageId__DestinationPageId =
                          oldPageId + "__" + newHiddenBoard._id;
                        sourcePageId__DestinationPageId__Arr.push(
                          sourcePageId__DestinationPageId
                        );
                      }
                    }
                  }

                  // Update widget references with new hidden board IDs
                  for (
                    let loop = 0;
                    loop < sourcePageId__DestinationPageId__Arr.length;
                    loop++
                  ) {
                    const recordArr =
                      sourcePageId__DestinationPageId__Arr[loop].split("__");
                    const SourcePageId = recordArr[0];
                    const NewPageId = recordArr[1];

                    for (
                      let loop2 = 0;
                      loop2 < finalObj.margedArrOfAllQAPageIds.length;
                      loop2++
                    ) {
                      const recordArr2 =
                        finalObj.margedArrOfAllQAPageIds[loop2].split("__");
                      const SourcePageId_2 = recordArr2[0];
                      const WidgetIndex = recordArr2[1];
                      const Viewport = recordArr2[2];

                      if (SourcePageId_2 == SourcePageId) {
                        switch (Viewport) {
                          case "DESKTOP":
                            pageData.ViewportDesktopSections.Widgets[
                              WidgetIndex
                            ].QAWidObj = pageData.ViewportDesktopSections
                              .Widgets[WidgetIndex].QAWidObj
                              ? pageData.ViewportDesktopSections.Widgets[
                                  WidgetIndex
                                ].QAWidObj
                              : {};
                            pageData.ViewportDesktopSections.Widgets[
                              WidgetIndex
                            ].QAWidObj.PageId = NewPageId;
                            break;
                          case "TABLET":
                            pageData.ViewportTabletSections.Widgets[
                              WidgetIndex
                            ].QAWidObj = pageData.ViewportTabletSections
                              .Widgets[WidgetIndex].QAWidObj
                              ? pageData.ViewportTabletSections.Widgets[
                                  WidgetIndex
                                ].QAWidObj
                              : {};
                            pageData.ViewportTabletSections.Widgets[
                              WidgetIndex
                            ].QAWidObj.PageId = NewPageId;
                            break;
                          case "MOBILE":
                            pageData.ViewportMobileSections.Widgets[
                              WidgetIndex
                            ].QAWidObj = pageData.ViewportMobileSections
                              .Widgets[WidgetIndex].QAWidObj
                              ? pageData.ViewportMobileSections.Widgets[
                                  WidgetIndex
                                ].QAWidObj
                              : {};
                            pageData.ViewportMobileSections.Widgets[
                              WidgetIndex
                            ].QAWidObj.PageId = NewPageId;
                            break;
                        }
                      }
                    }
                  }
                }
              }

              const newPage = await Page.create(pageData);

              // Add new page ID to array for chapter update
              newPageIds.push(newPage._id);

              // Process stream posts if applicable
              if (
                CapsuleData.LaunchSettings.CapsuleFor == "Stream" &&
                CapsuleData.LaunchSettings.StreamType != "Group"
              ) {
                if (newPage.Medias && newPage.Medias.length) {
                  CapsuleData._id = newCapsuleId;
                  const streamPagePostNow = getStreamPagePostNow();
                  await streamPagePostNow(
                    newPage.Medias,
                    newPage,
                    shareWithEmail,
                    req,
                    CapsuleData
                  );
                }
              }
            }

            // Update chapter with new page IDs
            if (newPageIds.length > 0) {
              await Chapter.findByIdAndUpdate(
                newChapterId,
                { $set: { pages: newPageIds } },
                { new: true }
              );
            }
          }

          // Update capsule with new chapter IDs
          if (newChapterIds.length > 0) {
            await Capsule.findByIdAndUpdate(
              newCapsuleId,
              { $set: { Chapters: newChapterIds } },
              { new: true }
            );
          }

          // Email notification logic
          let emailFor = "Published__ForOthers";

          if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
            emailFor = "Purchased__ForGift__Stream";
          }

          CapsuleData.IsSurpriseGift = CapsuleData.IsSurpriseGift
            ? CapsuleData.IsSurpriseGift
            : false;
          if (
            CapsuleData.LaunchSettings.CapsuleFor == "Stream" &&
            CapsuleData.LaunchSettings.StreamType == "Group" &&
            !CapsuleData.IsSurpriseGift
          ) {
            emailFor = "Purchased__ForGift__GroupStream";
          }

          if (
            CapsuleData.LaunchSettings.CapsuleFor == "Stream" &&
            CapsuleData.LaunchSettings.StreamType == "Group" &&
            CapsuleData.IsSurpriseGift
          ) {
            emailFor = "Purchased__ForSurpriseGift__GroupStream";
            console.log(
              "This is a surprise gift so returning without sending instant email."
            );
            result = {
              success: true,
              capsuleId: newCapsuleId,
              isSurpriseGift: true,
            };
            return result;
          }

          if (index_value_email >= 0) {
            const mailto = req.body.purchaseFor[index_value_email];
            if (mailto == "Gift") {
              emailFor = "Purchased__ForGift";
              if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
                emailFor = "Purchased__ForGift__Stream";
              }

              CapsuleData.IsSurpriseGift = CapsuleData.IsSurpriseGift
                ? CapsuleData.IsSurpriseGift
                : false;
              if (
                CapsuleData.LaunchSettings.CapsuleFor == "Stream" &&
                CapsuleData.LaunchSettings.StreamType == "Group" &&
                !CapsuleData.IsSurpriseGift
              ) {
                emailFor = "Purchased__ForGift__GroupStream";
              }

              if (
                CapsuleData.LaunchSettings.CapsuleFor == "Stream" &&
                CapsuleData.LaunchSettings.StreamType == "Group" &&
                CapsuleData.IsSurpriseGift
              ) {
                emailFor = "Purchased__ForSurpriseGift__GroupStream";
                console.log(
                  "This is a surprise gift so returning without sending instant email."
                );
                result = {
                  success: true,
                  capsuleId: newCapsuleId,
                  isSurpriseGift: true,
                };
                return result;
              }
            } else if (mailto == "Myself" || mailto == "ME") {
              emailFor = "Purchased__ForMyself";
              if (CapsuleData.LaunchSettings.CapsuleFor == "Stream") {
                emailFor = "Purchased__ForMyself__Stream";
              }

              if (
                CapsuleData.LaunchSettings.CapsuleFor == "Stream" &&
                CapsuleData.LaunchSettings.StreamType == "Group"
              ) {
                emailFor = "Purchased__ForMyself__GroupStream";
              }
            }
          }

          const condition = {};
          condition.name = emailFor;

          if (emailFor) {
            EmailTemplate.find(condition, {})
              .then(async function (results) {
                if (results.length) {
                  setTimeout(async function () {
                    let RecipientName = shareWithName ? shareWithName : "";
                    const userD = await User.find(
                      {
                        Email: new RegExp("^" + shareWithEmail + "$", "i"),
                        IsDeleted: false,
                      },
                      {
                        Name: true,
                        AllFoldersId: true,
                        AllPagesId: true,
                      }
                    );

                    let _cId = "";
                    let _pId = "";
                    let _StreamUrl = "https://www.scrpt.com/login";

                    if (userD.length > 0) {
                      const name = userD[0].Name ? userD[0].Name.split(" ") : [];
                      RecipientName = name[0];

                      _cId = userD[0].AllFoldersId ? userD[0].AllFoldersId : "";
                      _pId = userD[0].AllPagesId ? userD[0].AllPagesId : "";
                      _StreamUrl =
                        "https://www.scrpt.com/streams/" +
                        _cId +
                        "/" +
                        _pId +
                        "?stream=" +
                        newCapsuleId;
                    }

                    const publisherNameArr = req.session.user.Name
                      ? req.session.user.Name.split(" ")
                      : [];
                    const PublisherName = publisherNameArr[0];

                    let newHtml = results[0].description.replace(
                      /{PublisherName}/g,
                      PublisherName
                    );
                    newHtml = newHtml.replace(/{CapsuleName}/g, data.Title);
                    newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
                    newHtml = newHtml.replace(/{StreamUrl}/g, _StreamUrl);
                    newHtml = newHtml.replace(/{IfNewUserStatement}/g, ""); // we need to make this dynamic

                    const transporter = nodemailer.createTransport(
                      process.EMAIL_ENGINE.info.smtpOptions
                    );
                    const to = shareWithEmail;
                    results[0].subject =
                      typeof results[0].subject == "string"
                        ? results[0].subject
                        : "";
                    let subject = results[0].subject.replace(
                      /{PublisherName}/g,
                      PublisherName
                    );
                    subject = subject.replace(/{CapsuleName}/g, data.Title);
                    subject =
                      subject != ""
                        ? subject
                        : "Scrpt - " +
                          PublisherName +
                          " has published a capsule for you!";

                    const mailOptions = {
                      from: process.EMAIL_ENGINE.info.senderLine,
                      to: to,
                      subject: subject,
                      text: process.HOST_URL + "/login",
                      html: newHtml,
                    };

                    let info = await transporter.sendMail(mailOptions);
                    info = info || {};
                    info.response = info.response ? info.response : {};
                    console.log(
                      "capsule__createNewInstance---------Message sent: " +
                        mailOptions.to +
                        info.response
                    );
                  }, 3000);
                }
              })
              .catch(function (err) {
                console.error("Error finding email template:", err);
              });
          }

          result = { success: true, capsuleId: newCapsuleId };
        } else {
          // ////console.log("--------jhdsgfiu0959485-----------");
        }
      } else {
        // ////console.log("0959485-----------");
      }
    });

    console.log("Capsule instance creation completed", {
      capsuleId: __capsuleId,
      ownerEmail: owner.UserEmail,
      duration: Date.now() - startTime,
      success: result.success,
    });

    return result;
  } catch (error) {
    console.error("Capsule instance creation failed", {
      error: error.message,
      stack: error.stack,
      capsuleId: CapsuleData?._id,
      ownerEmail: owner?.UserEmail,
      duration: Date.now() - startTime,
    });

    throw error;
  } finally {
    await session.endSession();
  }
};



module.exports = {
  createCapsuleInstance,
  TextPersonalizer,
  CapsuleInstanceError,
};
