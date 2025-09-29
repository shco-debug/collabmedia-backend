var capsule__createNewInstance = function (
  CapsuleData,
  owner,
  req,
  index_value_email
) {
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
      res.json({ code: 404, message: "Something went wrong." });
  }

  //check to make sure who will be the creater for new instances

  console.log("owner = ", owner);

  //check if the owner is register or not
  var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
  var shareWithName = owner.UserName ? owner.UserName.split(" ")[0] : "OWNER";
  var UniqueIdPerOwner = owner.UniqueIdPerOwner ? owner.UniqueIdPerOwner : null;

  if (shareWithEmail) {
    shareWithEmail = shareWithEmail.replace(".", ".");
    var conditions = {};
    (conditions.Email = new RegExp("^" + shareWithEmail + "$", "i")),
      (conditions.IsDeleted = false);

    var fields = {
      Email: true,
      Name: true,
      Gender: true,
      Birthdate: true,
    };

    User.findOne(conditions, fields, async function (err, UserData) {
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
          let inputObj = {
            newUser: {
              Name: shareWithName,
              Email: shareWithEmail,
              NickName: shareWithName,
            },
          };
          let response = await axios.post(request_url, inputObj);
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
              var t = new Date();
              var ty = t.getFullYear();
              var tm = t.getMonth() + 1;
              var td = t.getDate();
              var todayDate = new Date(ty + "-" + tm + "-" + td);

              var today = todayDate.getTime();
              var after2Days = today + 2 * 24 * 60 * 60 * 1000;

              var ldate = new Date(after2Days);
              var y = ldate.getFullYear();
              var m = ldate.getMonth() + 1;
              var d = ldate.getDate();
              data.LaunchDate = m + "/" + d + "/" + y;
            }

            if (data.StreamFlow == "Birthday") {
              if (UserData.length) {
                UserData[0].Birthdate = UserData[0].Birthdate || "";
                var birthdateArr = UserData[0].Birthdate.split("/");
                if (birthdateArr.length === 3) {
                  var t = new Date();
                  var ty = t.getFullYear();
                  var tm = t.getMonth() + 1;
                  var td = t.getDate();
                  td = parseInt(td) < 10 ? "0" + td : td;
                  tm = parseInt(tm) < 10 ? "0" + tm : tm;
                  var todayDate = new Date(ty + "-" + tm + "-" + td);
                  var todayTS = todayDate.getTime();

                  var thisYearBdayStr =
                    ty + "-" + birthdateArr[0] + "-" + birthdateArr[1];
                  var thisYearBday = new Date(thisYearBdayStr);
                  var thisYearBdayTS = thisYearBday.getTime();

                  var lDate =
                    birthdateArr[0] + "/" + birthdateArr[1] + "/" + ty;
                  if (thisYearBdayTS < todayTS) {
                    thisYearBdayStr =
                      birthdateArr[0] + "/" + birthdateArr[1] + "/" + (ty + 1);
                    lDate = thisYearBdayStr;
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

        //// //console.log("data = ",data);
        Capsule(data).save(function (err, result) {
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

                                      //AUTO NAME REPLACE FILTER
                                      var OwnerGender = "male";
                                      var OwnerName = "OWNER";
                                      if (UserData.length) {
                                        //Non-Registered user case
                                        OwnerGender = UserData[0].Gender
                                          ? UserData[0].Gender
                                          : "male";
                                        OwnerName = UserData[0].Name
                                          ? UserData[0].Name.split(" ")[0]
                                          : "OWNER";
                                      } else {
                                        OwnerName = shareWithName
                                          ? shareWithName
                                          : "OWNER";
                                      }

                                      if (data.PageType == "gallery") {
                                        var str = data.Title;
                                        var res = str;
                                        if (OwnerGender == "male") {
                                          res = res.replace(
                                            /\bJack\b/g,
                                            OwnerName
                                          );
                                          res = res.replace(
                                            /\bJill\b/g,
                                            OwnerName
                                          );
                                          res = res.replace(/\bShe\b/g, "He");
                                          res = res.replace(/\bshe\b/g, "he");
                                          res = res.replace(/\bher\b/g, "his");
                                          res = res.replace(/\bHer\b/g, "His");
                                          res = res.replace(
                                            /\bherself\b/g,
                                            "himself"
                                          );
                                          res = res.replace(
                                            /\bHerself\b/g,
                                            "Himself"
                                          );
                                        } else if (OwnerGender == "female") {
                                          res = res.replace(
                                            /\bJack\b/g,
                                            OwnerName
                                          );
                                          res = res.replace(
                                            /\bJill\b/g,
                                            OwnerName
                                          );
                                          res = res.replace(/\bHe\b/g, "She");
                                          res = res.replace(/\bhe\b/g, "she");
                                          res = res.replace(/\bhis\b/g, "her");
                                          res = res.replace(/\bHis\b/g, "Her");
                                          res = res.replace(/\bhim\b/g, "her");
                                          res = res.replace(/\bHim\b/g, "Her");
                                          res = res.replace(
                                            /\bhimself\b/g,
                                            "herself"
                                          );
                                          res = res.replace(
                                            /\bHimself\b/g,
                                            "Herself"
                                          );
                                        } else {
                                          res = res.replace(
                                            /\bJack\b/g,
                                            OwnerName
                                          );
                                          res = res.replace(
                                            /\bJill\b/g,
                                            OwnerName
                                          );
                                          res = res.replace(/\bHe\b/g, "They");
                                          res = res.replace(/\bhe\b/g, "they");
                                          res = res.replace(
                                            /\bHe is\b/g,
                                            "They are"
                                          );
                                          res = res.replace(
                                            /\bhe is\b/g,
                                            "they are"
                                          );
                                          res = res.replace(
                                            /\bhis\b/g,
                                            "their"
                                          );
                                          res = res.replace(
                                            /\bHis\b/g,
                                            "Their"
                                          );
                                          res = res.replace(/\bhim\b/g, "them");
                                          res = res.replace(/\bHim\b/g, "Them");
                                          res = res.replace(
                                            /\bhimself\b/g,
                                            "themselves"
                                          );
                                          res = res.replace(
                                            /\bHimself\b/g,
                                            "Themselves"
                                          );

                                          res = res.replace(/\bShe\b/g, "They");
                                          res = res.replace(/\bshe\b/g, "they");
                                          res = res.replace(
                                            /\bShe is\b/g,
                                            "They are"
                                          );
                                          res = res.replace(
                                            /\bshe is\b/g,
                                            "they are"
                                          );
                                          res = res.replace(/\bher\b/g, "them");
                                          res = res.replace(
                                            /\bHer\b/g,
                                            "Their"
                                          );
                                          res = res.replace(
                                            /\bherself\b/g,
                                            "himself"
                                          );
                                          res = res.replace(
                                            /\bHerself\b/g,
                                            "Himself"
                                          );
                                        }
                                        data.Title = res;
                                      }

                                      //content page data keys were missing before - fixing on 12052016 with team
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
                                            ? data.ViewportDesktopSections
                                                .Widgets
                                            : [];

                                        for (
                                          var loop = 0;
                                          loop <
                                          data.ViewportDesktopSections.Widgets
                                            .length;
                                          loop++
                                        ) {
                                          var widObj =
                                            data.ViewportDesktopSections
                                              .Widgets[loop];
                                          widObj.Type = widObj.Type
                                            ? widObj.Type
                                            : "";
                                          if (widObj.Type == "questAnswer") {
                                            // If Widget is a QA Widget then ...
                                            var QuestString = data
                                              .ViewportDesktopSections.Widgets[
                                              loop
                                            ].Data
                                              ? data.ViewportDesktopSections
                                                  .Widgets[loop].Data
                                              : "";
                                            data.ViewportDesktopSections.Widgets[
                                              loop
                                            ].Data = __getStringAfterNameRuled(
                                              QuestString,
                                              OwnerGender,
                                              OwnerName
                                            );

                                            widObj.QAWidObj = widObj.QAWidObj
                                              ? widObj.QAWidObj
                                              : {};
                                            var HiddenBoardId = widObj.QAWidObj
                                              .PageId
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
                                          data.ViewportTabletSections.Widgets
                                            ? data.ViewportTabletSections
                                                .Widgets
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
                                            var QuestString = data
                                              .ViewportTabletSections.Widgets[
                                              loop
                                            ].Data
                                              ? data.ViewportTabletSections
                                                  .Widgets[loop].Data
                                              : "";
                                            data.ViewportTabletSections.Widgets[
                                              loop
                                            ].Data = __getStringAfterNameRuled(
                                              QuestString,
                                              OwnerGender,
                                              OwnerName
                                            );

                                            widObj.QAWidObj = widObj.QAWidObj
                                              ? widObj.QAWidObj
                                              : {};
                                            var HiddenBoardId = widObj.QAWidObj
                                              .PageId
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
                                          data.ViewportMobileSections.Widgets
                                            ? data.ViewportMobileSections
                                                .Widgets
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
                                            var QuestString = data
                                              .ViewportMobileSections.Widgets[
                                              loop
                                            ].Data
                                              ? data.ViewportMobileSections
                                                  .Widgets[loop].Data
                                              : "";
                                            data.ViewportMobileSections.Widgets[
                                              loop
                                            ].Data = __getStringAfterNameRuled(
                                              QuestString,
                                              OwnerGender,
                                              OwnerName
                                            );

                                            widObj.QAWidObj = widObj.QAWidObj
                                              ? widObj.QAWidObj
                                              : {};
                                            var HiddenBoardId = widObj.QAWidObj
                                              .PageId
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
                                        async_lib.series(
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
                                                        // //console.log("-------------results------------", results);
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
                                                              "published";

                                                            //// //console.log("WTF-----------------------",oldPageId);
                                                            delete newInstanceData._id;
                                                            //// //console.log("WTF-----------------------",oldPageId);

                                                            newInstanceData.CreatedOn =
                                                              Date.now();
                                                            newInstanceData.UpdatedOn =
                                                              Date.now();
                                                            //// //console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
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
                                                            //AUTO NAME REPLACE FILTER
                                                            //var OwnerGender = UserData.Gender ? UserData.Gender : "male";
                                                            //var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
                                                            var OwnerGender =
                                                              "male";
                                                            var OwnerName =
                                                              "OWNER";
                                                            if (
                                                              UserData.length
                                                            ) {
                                                              //Non-Registered user case
                                                              OwnerGender =
                                                                UserData[0]
                                                                  .Gender
                                                                  ? UserData[0]
                                                                      .Gender
                                                                  : "male";
                                                              OwnerName =
                                                                UserData[0].Name
                                                                  ? UserData[0].Name.split(
                                                                      " "
                                                                    )[0]
                                                                  : "OWNER";
                                                            } else {
                                                              OwnerName =
                                                                shareWithName
                                                                  ? shareWithName
                                                                  : "OWNER";
                                                            }

                                                            var str =
                                                              dataToSave.Title
                                                                ? dataToSave.Title
                                                                : "Untitled Page";
                                                            var resStr = str;
                                                            if (
                                                              OwnerGender ==
                                                              "male"
                                                            ) {
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bJack\b/g,
                                                                  OwnerName
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bJill\b/g,
                                                                  OwnerName
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bShe\b/g,
                                                                  "He"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bshe\b/g,
                                                                  "he"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bher\b/g,
                                                                  "his"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHer\b/g,
                                                                  "His"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bherself\b/g,
                                                                  "himself"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHerself\b/g,
                                                                  "Himself"
                                                                );
                                                            } else if (
                                                              OwnerGender ==
                                                              "female"
                                                            ) {
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bJack\b/g,
                                                                  OwnerName
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bJill\b/g,
                                                                  OwnerName
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHe\b/g,
                                                                  "She"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhe\b/g,
                                                                  "she"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhis\b/g,
                                                                  "her"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHis\b/g,
                                                                  "Her"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhim\b/g,
                                                                  "her"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHim\b/g,
                                                                  "Her"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhimself\b/g,
                                                                  "herself"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHimself\b/g,
                                                                  "Herself"
                                                                );
                                                            } else {
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bJack\b/g,
                                                                  OwnerName
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bJill\b/g,
                                                                  OwnerName
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHe\b/g,
                                                                  "They"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhe\b/g,
                                                                  "they"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHe is\b/g,
                                                                  "They are"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhe is\b/g,
                                                                  "they are"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhis\b/g,
                                                                  "their"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHis\b/g,
                                                                  "Their"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhim\b/g,
                                                                  "them"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHim\b/g,
                                                                  "Them"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bhimself\b/g,
                                                                  "themselves"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHimself\b/g,
                                                                  "Themselves"
                                                                );

                                                              resStr =
                                                                resStr.replace(
                                                                  /\bShe\b/g,
                                                                  "They"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bshe\b/g,
                                                                  "they"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bShe is\b/g,
                                                                  "They are"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bshe is\b/g,
                                                                  "they are"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bher\b/g,
                                                                  "them"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHer\b/g,
                                                                  "Their"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bherself\b/g,
                                                                  "himself"
                                                                );
                                                              resStr =
                                                                resStr.replace(
                                                                  /\bHerself\b/g,
                                                                  "Himself"
                                                                );
                                                            }
                                                            dataToSave.Title =
                                                              resStr;

                                                            var sourcePageId =
                                                              sourcePageId
                                                                ? sourcePageId
                                                                : "SOMETHING_WRONG";
                                                            //sourcePageId__DestinationPageId
                                                            if (
                                                              sourcePageId !=
                                                              "SOMETHING_WRONG"
                                                            ) {
                                                              Page(
                                                                dataToSave
                                                              ).save(function (
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
                                                                  // //console.log("DB ERROR : ", err);
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
                                                              });
                                                            } else {
                                                              return callback({
                                                                error:
                                                                  "sourcePageId = SOMETHING_WRONG",
                                                              });
                                                            }
                                                          }
                                                        } else {
                                                          callback(
                                                            null,
                                                            sourcePageId__DestinationPageId__Arr
                                                          );
                                                        }
                                                      } else {
                                                        // //console.log("DB ERROR : ", err);
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
                                              // //console.log("*************************************** results**************", results);
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
                                                // //console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ", finalObj.margedArrOfAllQAPageIds);
                                                // //console.log("*************************************** SourcePageId**************NewPageId ", SourcePageId + "------------------" + NewPageId);
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
                                                  var Viewport = recordArr2[2];
                                                  if (
                                                    SourcePageId_2 ==
                                                    SourcePageId
                                                  ) {
                                                    // //console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2 + " ====== " + SourcePageId);
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
                                              // //console.log("**************************************************DB ERROR :", err);
                                            }

                                            // //console.log("data = ", data);
                                            Page(data).save(function (
                                              err,
                                              result
                                            ) {
                                              if (!err) {
                                                // //console.log("----new page instance created..", result);
                                              } else {
                                                // //console.log(err);
                                              }
                                            });
                                          }
                                        );
                                      } else {
                                        //console.log("data = ", data);
                                        Page(data).save(async function (
                                          err,
                                          result
                                        ) {
                                          if (!err) {
                                            //console.log("----new page instance created..");
                                            CapsuleData.LaunchSettings.StreamType =
                                              CapsuleData.LaunchSettings
                                                .StreamType
                                                ? CapsuleData.LaunchSettings
                                                    .StreamType
                                                : null;
                                            if (
                                              CapsuleData.LaunchSettings
                                                .CapsuleFor == "Stream" &&
                                              CapsuleData.LaunchSettings
                                                .StreamType != "Group"
                                            ) {
                                              if (result.Medias.length) {
                                                //console.log("-----------------------HERE-----------------------   ", data.Medias.length);
                                                CapsuleData._id = newCapsuleId;
                                                console.log(
                                                  `calling __streamPagePostNow for ${shareWithEmail} capsule id = ${CapsuleData._id} total posts = ${data.Medias.length}`
                                                );
                                                await __streamPagePostNow(
                                                  result.Medias,
                                                  result,
                                                  shareWithEmail,
                                                  req,
                                                  CapsuleData
                                                );
                                              } else {
                                                //console.log("ZZZZZZZZZZZZZZZZZZZZZZz ------ ", data.Medias.length);
                                              }
                                            }
                                          } else {
                                            //console.log("YYYYYYYYYYYYYYYYYY-----------", err);
                                          }
                                        });
                                      }
                                    }
                                  );
                                }
                              } else {
                                // //console.log("095944564-----------");
                              }
                            });
                        } else {
                          // //console.log("0959345485-----------");
                        }
                      });
                    });
                  }

                  var emailFor = "Published__ForOthers";

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
                    return;
                  }

                  if (index_value_email >= 0) {
                    var mailto = req.body.purchaseFor[index_value_email];
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
                        return;
                      }
                    } else if (mailto == "Myself") {
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

                  var condition = {};
                  condition.name = emailFor;

                  EmailTemplate.find(
                    condition,
                    {},
                    async function (err, results) {
                      if (!err) {
                        if (results.length) {
                          setTimeout(async function () {
                            var RecipientName = shareWithName
                              ? shareWithName
                              : "";
                            User.find(
                              {
                                Email: new RegExp(
                                  "^" + shareWithEmail + "$",
                                  "i"
                                ),
                                IsDeleted: false,
                              },
                              {
                                Name: true,
                                AllFoldersId: true,
                                AllPagesId: true,
                              },
                              async function (err, userD) {
                                var _cId = "";
                                var _pId = "";
                                var _StreamUrl = "https://www.scrpt.com/login";

                                if (userD.length > 0) {
                                  var name = userD[0].Name
                                    ? userD[0].Name.split(" ")
                                    : [];
                                  RecipientName = name[0];

                                  _cId = userD[0].AllFoldersId
                                    ? userD[0].AllFoldersId
                                    : "";
                                  _pId = userD[0].AllPagesId
                                    ? userD[0].AllPagesId
                                    : "";
                                  _StreamUrl =
                                    "https://www.scrpt.com/streams/" +
                                    _cId +
                                    "/" +
                                    _pId +
                                    "?stream=" +
                                    newCapsuleId;
                                }

                                var publisherNameArr = req.session.user.Name
                                  ? req.session.user.Name.split(" ")
                                  : [];
                                var PublisherName = publisherNameArr[0];

                                var newHtml = results[0].description.replace(
                                  /{PublisherName}/g,
                                  PublisherName
                                );
                                newHtml = newHtml.replace(
                                  /{CapsuleName}/g,
                                  data.Title
                                );
                                newHtml = newHtml.replace(
                                  /{RecipientName}/g,
                                  RecipientName
                                );
                                newHtml = newHtml.replace(
                                  /{StreamUrl}/g,
                                  _StreamUrl
                                );
                                newHtml = newHtml.replace(
                                  /{IfNewUserStatement}/g,
                                  ""
                                );

                                var transporter = nodemailer.createTransport(
                                  process.EMAIL_ENGINE.info.smtpOptions
                                );
                                var to = shareWithEmail;
                                results[0].subject =
                                  typeof results[0].subject == "string"
                                    ? results[0].subject
                                    : "";
                                var subject = results[0].subject.replace(
                                  /{PublisherName}/g,
                                  PublisherName
                                );
                                subject = subject.replace(
                                  /{CapsuleName}/g,
                                  data.Title
                                );
                                subject =
                                  subject != ""
                                    ? subject
                                    : "Scrpt - " +
                                      PublisherName +
                                      " has published a capsule for you!";

                                var mailOptions = {
                                  //from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
                                  from: process.EMAIL_ENGINE.info.senderLine,
                                  to: to, // list of receivers
                                  subject: subject,
                                  text: process.HOST_URL + "/login",
                                  html: newHtml,
                                };

                                var info = await transporter.sendMail(
                                  mailOptions
                                );
                                info = info || {};
                                info.response = info.response
                                  ? info.response
                                  : {};
                                console.log(
                                  "capsule__createNewInstance---------Message sent: " +
                                    mailOptions.to +
                                    info.response
                                );
                              }
                            );
                          }, 3000);
                        }
                      }
                    }
                  );
                } else {
                  // ////console.log("3875634876-----------");
                }
              });
          } else {
            // ////console.log("--------jhdsgfiu0959485-----------");
          }
        });
      } else {
        // ////console.log("0959485-----------");
      }
    });
  } else {
    // ////console.log("09579-----------");
  }
};
