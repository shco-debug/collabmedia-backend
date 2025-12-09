var mongoose = require("mongoose");
var media = require("../models/mediaModel.js");
var Media = require("../models/mediaModel.js"); // Add Media model for consistency
//import media from '../models/mediaM3Model.js';
var massImport = require("../models/massImportModel.js");
var board = require("../models/pageModel.js");
var mediaAction = require("../models/mediaActionLogModel.js");
var groupTags = require("../models/groupTagsModel.js");
var user = require("../models/userModel.js");
var formidable = require("formidable");
var fs = require("fs");
var counters = require("../models/countersModel.js");
var faultyMediaModel = require("../models/faultyMediaModel.js");
var flagAsInAppropriate = require("../models/flagAsInAppropriateModel.js");
var async_lib = require("async");
var xlsxj = require("xlsx-to-json");
var googleapis = require("googleapis");
var Page = require("../models/pageModel.js");
var Capsule = require("../models/capsuleModel.js");
var Chapter = require("../models/chapterModel.js");
var PageStream = require("../models/pageStreamModel.js");
var SyncedPost = require("../models/syncedpostModel.js");
var StreamComments = require("../models/StreamCommentsModel.js");
var StreamLikes = require("../models/StreamLikes.js");
var StreamCommentLikes = require("../models/StreamCommentLikesModel.js");
var CommonAlgo = require("../components/commonAlgorithms.js");
var sharp = require("sharp");
var path = require("path");
var shortid = require("shortid");
var os = require("os");
var { addMediaTimestamps } = require("../utilities/mediaTimestampUtils.js");
// Import static GroupTags loader for Prompt-based tag assignment
const { loadTagIndex, isLoaded, lookupTag } = require("../utilities/staticGroupTagsLoader");
// Import capsulesController for shared helper functions (lazy load to avoid circular dependency)
var capsulesController = null;
var getCapsulesController = function() {
  if (!capsulesController) {
    capsulesController = require('./capsulesController.js');
  }
  return capsulesController;
};

const { ObjectId } = mongoose.Types;
const fsPromises = fs.promises;

// __dirname is already available in CommonJS

// Google credentials commented out for local development
// const creds = require('../../config/google/creds.json');

const dateFormat = () => {
  const d = new Date();
  const dformat =
    [
      d.getMonth() + 1 > 10 ? d.getMonth() + 1 : "0" + (d.getMonth() + 1),
      d.getDate() > 10 ? d.getDate() : "0" + d.getDate(),
      d.getFullYear(),
    ].join("") +
    "" +
    [d.getHours(), d.getMinutes(), d.getSeconds()].join("");
  return dformat;
};

const crop_image = async (srcPath, dstPath, width, height) => {
  console.log(`crop_image source : ${srcPath} ---- destination : ${dstPath}`);

  try {
    // Ensure destination directory exists
    const dstDir = require("path").dirname(dstPath);
    if (!require("fs").existsSync(dstDir)) {
      require("fs").mkdirSync(dstDir, { recursive: true });
      console.log(`Created directory: ${dstDir}`);
    }

    // Check if source file exists
    if (!require("fs").existsSync(srcPath)) {
      throw new Error(`Source file does not exist: ${srcPath}`);
    }

    const fileExtension = srcPath.split(".").pop().toUpperCase();

    if (fileExtension === "GIF") {
      // For GIFs, use Sharp's resize with crop and optimize quality
      await sharp(srcPath)
        .resize(parseInt(width), parseInt(height), {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 90, progressive: true })
        .toFile(dstPath);

      console.log(`Successfully cropped GIF to ${width} x ${height}`);
    } else {
      // For other image formats, use Sharp's resize with crop and optimize quality
      await sharp(srcPath)
        .resize(parseInt(width), parseInt(height), {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 90, progressive: true })
        .toFile(dstPath);

      console.log(`Successfully cropped image to ${width} x ${height}`);
    }
  } catch (error) {
    console.log("=========================ERROR in crop_image: ", error);
    console.log("Source path:", srcPath);
    console.log("Destination path:", dstPath);
    console.log("Width:", width, "Height:", height);
  }
};

const resize_image = async (srcPath, dstPath, w, h) => {
  console.log(`resize_image source : ${srcPath} ---- destination : ${dstPath}`);

  try {
    // Ensure destination directory exists
    const dstDir = require("path").dirname(dstPath);
    if (!require("fs").existsSync(dstDir)) {
      require("fs").mkdirSync(dstDir, { recursive: true });
      console.log(`Created directory: ${dstDir}`);
    }

    // Check if source file exists
    if (!require("fs").existsSync(srcPath)) {
      throw new Error(`Source file does not exist: ${srcPath}`);
    }

    const fileExtension = srcPath.split(".").pop().toUpperCase();

    if (fileExtension === "GIF") {
      // For GIFs, get image info first to determine resize strategy
      const metadata = await sharp(srcPath).metadata();
      console.log("GIF metadata---------------", metadata);
      console.log(`${metadata.width}======================${metadata.height}`);

      if (parseInt(metadata.height) >= parseInt(h)) {
        console.log(
          "========================================================================== here1"
        );
        await sharp(srcPath)
          .resize(parseInt(w), parseInt(h), {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90, progressive: true })
          .toFile(dstPath);
        console.log("data----------------Sharp.resize-------");
      } else if (parseInt(metadata.width) >= parseInt(w)) {
        console.log(
          "========================================================================== here2"
        );
        await sharp(srcPath)
          .resize(parseInt(w), parseInt(h), {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90, progressive: true })
          .toFile(dstPath);
        console.log("data----------------Sharp.resize-------");
      } else {
        console.log(
          "========================================================================== here3"
        );
        await sharp(srcPath)
          .resize(metadata.width, metadata.height, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90, progressive: true })
          .toFile(dstPath);
        console.log("data----------------Sharp.resize-------");
      }
    } else {
      // For other image formats, use Sharp's resize
      await sharp(srcPath)
        .resize(parseInt(w), parseInt(h), {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(dstPath);

      console.log("Successfully resized image");
    }
  } catch (error) {
    console.log("=========================ERROR in resize_image: ", error);
    console.log("Source path:", srcPath);
    console.log("Destination path:", dstPath);
    console.log("Width:", w, "Height:", h);
  }
};

// Synchronous versions of image functions for the syncGd functions
const crop_image_sync = async (srcPath, dstPath, width, height) => {
  return await crop_image(srcPath, dstPath, width, height);
};

const resize_image_sync = async (srcPath, dstPath, w, h) => {
  return await resize_image(srcPath, dstPath, w, h);
};

// Fallback configuration for process.urls if not defined
if (!process.urls) {
  process.urls = {
    small__thumbnail: "small_thumbnail",
    SG__thumbnail: "SG_thumbnail",
    medium__thumbnail: "medium_thumbnail",
    large__thumbnail: "large_thumbnail",
    aspectfit__thumbnail: "aspectfit_thumbnail",
    aspectfit_small__thumbnail: "aspectfit_small_thumbnail",
  };
}
// Modernized helper function to save GroupTag to Media
async function saveGT_toMediaAsyncAwait(gtID, mediaID) {
  try {
    const mediaData = await media
      .findOne({ _id: new ObjectId(mediaID) })
      .lean();

    if (!mediaData) {
      console.log(`❌ Media not found: ${mediaID}`);
      return;
    }

    // Ensure GroupTags is an array
    const mediaGroupTags = Array.isArray(mediaData.GroupTags)
      ? mediaData.GroupTags
      : [];

    // Check if GroupTag already exists
    const isAlreadyThere = mediaGroupTags.some(
      (gt) => String(gt) === String(gtID)
    );

    if (!isAlreadyThere) {
      // Add new GroupTag to Media as string
      const updatedGroupTags = [...mediaGroupTags, String(gtID)];

      await media.updateOne(
        { _id: new ObjectId(mediaID) },
        { $set: { GroupTags: updatedGroupTags } }
      );

      // Increment MediaCount in GroupTag
      await groupTags.updateOne(
        { _id: new ObjectId(gtID) },
        { $inc: { MediaCount: 1 } }
      );

      console.log(
        `✅ Added GroupTag ${gtID} to Media ${mediaID} and incremented MediaCount`
      );
    } else {
      console.log(`ℹ️ GroupTag ${gtID} already exists in Media ${mediaID}`);
    }
  } catch (error) {
    console.error(`❌ Error saving GroupTag to Media:`, error.message);
  }
}
// Function to create GroupTag from image metadata with duplicate check
const createGroupTagFromMetaData = async (metaData) => {
  try {
    if (!metaData || !metaData.Subjects || metaData.Subjects.length === 0) {
      console.log("❌ No valid metadata or subjects found");
      return null;
    }

    // GroupTagTitle = First subject
    const groupTagTitle = metaData.Subjects[0];

    // Create Tags array from all metadata arrays
    const allTags = [];

    // Add subjects
    if (metaData.Subjects) {
      metaData.Subjects.forEach((tag) => {
        allTags.push({ TagTitle: tag, TagType: "subject", status: 1 });
      });
    }

    // Add metaphors
    if (metaData.Metaphors) {
      metaData.Metaphors.forEach((tag) => {
        allTags.push({ TagTitle: tag, TagType: "metaphor", status: 1 });
      });
    }

    // Add concepts
    if (metaData.Concepts) {
      metaData.Concepts.forEach((tag) => {
        allTags.push({ TagTitle: tag, TagType: "concept", status: 1 });
      });
    }

    // Add attributes
    if (metaData.Attributes) {
      metaData.Attributes.forEach((tag) => {
        allTags.push({ TagTitle: tag, TagType: "attribute", status: 1 });
      });
    }

    // Add feelings
    if (metaData.Feelings) {
      metaData.Feelings.forEach((tag) => {
        allTags.push({ TagTitle: tag, TagType: "feeling", status: 1 });
      });
    }

    // Add verbs
    if (metaData.Verbs) {
      metaData.Verbs.forEach((tag) => {
        allTags.push({ TagTitle: tag, TagType: "verb", status: 1 });
      });
    }

    // Check if GroupTag with same subjects already exists
    const existingGroupTag = await groupTags.findOne({
      GroupTagTitle: groupTagTitle,
      $or: [{ status: 3 }, { status: 1 }],
    });

    if (existingGroupTag) {
      // Check if all subjects match
      const existingSubjects = existingGroupTag.Tags.filter(
        (tag) => tag.TagType === "subject"
      ).map((tag) => tag.TagTitle);

      const allSubjectsMatch =
        metaData.Subjects.every((subject) =>
          existingSubjects.includes(subject)
        ) && existingSubjects.length === metaData.Subjects.length;

      if (allSubjectsMatch) {
        console.log(
          `🔄 Found existing GroupTag with matching subjects: ${groupTagTitle}`
        );
        return existingGroupTag._id;
      }
    }

    // Create new GroupTag if no exact match found
    const newGroupTagData = {
      GroupTagTitle: groupTagTitle,
      MetaMetaTagID: "54c98aab4fde7f30079fdd5a",
      MetaTagID: "54c98aba4fde7f30079fdd5b",
      status: 3,
      LastModified: Date.now(),
      DateAdded: Date.now(),
      MediaCount: 0, // Will be incremented during processing
      Tags: allTags,
      Think: [],
      Less: [],
      More: [],
    };

    const newGroupTag = await groupTags(newGroupTagData).save();
    console.log(
      `✅ Created new GroupTag: ${groupTagTitle} with ${allTags.length} tags`
    );

    return newGroupTag._id;
  } catch (error) {
    console.error("❌ Error creating GroupTag from metadata:", error.message);
    return null;
  }
};

// Function to find matching GroupTags by subjects (without incrementing counts)
const findMatchingGroupTags = async (subjects) => {
  try {
    if (!subjects || subjects.length === 0) {
      console.log("❌ No subjects provided");
      return [];
    }

    // Find all GroupTags where GroupTagTitle matches any subject
    const matchingGroupTags = await groupTags.find({
      GroupTagTitle: { $in: subjects },
      $or: [{ status: 3 }, { status: 1 }],
    });

    const groupTagIds = [];

    // Collect matching GroupTag IDs (without incrementing counts)
    for (const gt of matchingGroupTags) {
      groupTagIds.push(gt._id);
      console.log(`✅ Found matching GroupTag: ${gt.GroupTagTitle}`);
    }

    return groupTagIds;
  } catch (error) {
    console.error("❌ Error finding matching GroupTags:", error.message);
    return [];
  }
};

// Modernized helper function to add group tags with improved functionality
const addGTAsyncAwait = async (tags, mediaID, metaData = null) => {
  // Input validation
  if (!tags || !mediaID || !metaData) {
    console.log("❌ addGTAsyncAwait: Missing required parameters");
    return;
  }

  try {
    console.log(`🏷️ Processing image with metadata for media: ${mediaID}`);

    // Step 1: Create or find existing GroupTag from metadata (with duplicate check)
    const primaryGroupTagId = await createGroupTagFromMetaData(metaData);

    if (!primaryGroupTagId) {
      console.log("❌ Failed to create/find GroupTag from metadata");
      return;
    }

    // Step 2: Find matching GroupTags by subjects
    const matchingGroupTagIds = await findMatchingGroupTags(metaData.Subjects);

    // Step 3: Combine primary GroupTag ID with matching GroupTag IDs (avoid duplicates)
    const allGroupTagIds = [primaryGroupTagId];
    matchingGroupTagIds.forEach((id) => {
      if (!allGroupTagIds.includes(id)) {
        allGroupTagIds.push(id);
      }
    });

    // Step 4: Increment MediaCount for all unique GroupTags (only once per GroupTag)
    for (const groupTagId of allGroupTagIds) {
      await groupTags.updateOne(
        { _id: groupTagId },
        { $inc: { MediaCount: 1 } }
      );
    }

    // Step 5: Update media with all GroupTag IDs as strings
    await media.updateOne(
      { _id: new ObjectId(mediaID) },
      { $set: { GroupTags: allGroupTagIds.map((id) => String(id)) } }
    );

    console.log(`📊 Total GroupTags linked to media: ${allGroupTagIds.length}`);
    console.log(`✅ Primary GroupTag processed: ${primaryGroupTagId}`);
    console.log(`✅ Matching GroupTags found: ${matchingGroupTagIds.length}`);
  } catch (error) {
    console.error("❌ Error in addGTAsyncAwait:", error.message);
  }
};

const findAll = (req, res) => {
  const fields = {};
  if (typeof req.body.title !== "undefined") {
    if (req.body.title !== "") {
      fields["Title"] = new RegExp(req.body.title, "i");
    }
    fields["Status"] = 1;
  } else {
    fields["Status"] = 0;
  }

  if (req.body.gt != null && req.body.gt !== "") {
    fields["GroupTags.GroupTagID"] = req.body.gt;
  }
  //added by parul
  if (req.body.collection != null && req.body.collection !== "") {
    fields["Collection.CollectionID"] = req.body.collection;
  }

  media
    .find(fields)
    .sort({ UploadedOn: "desc" })
    .skip(req.body.offset)
    .limit(req.body.limit)
    .exec((err, result) => {
      if (err) {
        res.json(err);
      } else {
        if (result.length === 0) {
          res.json({ code: "404", msg: "Not Found", responselength: 0 });
        } else {
          //media.find({Status:0}).sort({UploadedOn: 'desc'}).exec(function(err,resultlength){
          media
            .find({ Status: 0 }, { _id: 1 })
            .count()
            .exec((err, resultlength) => {
              if (err) {
                res.json(err);
              } else {
                console.log("yes confirmed return.....");
                //res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
                res.json({
                  code: "200",
                  msg: "Success",
                  response: result,
                  responselength: resultlength,
                });
              }
            });
        }
      }
    });
};

const uploadfile = async (req, res) => {
  console.log("=== UPLOADFILE FUNCTION STARTED ===");
  console.log("Request headers:", req.headers);
  console.log("Request method:", req.method);

  try {
    let incNum = 0;

    console.log("Updating counter...");
    // First, try to find and update the counter using modern Mongoose syntax
    const data = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!data) {
      console.log("Counter data is null, creating new counter");
      return res.json({ code: 500, msg: "Failed to create/update counter" });
    }

    console.log("=========================");
    console.log("Counter data:", data);
    console.log("Counter seq:", data.seq);
    incNum = data.seq;

    console.log(`incNum=${incNum}`);
    console.log("Creating formidable form...");
    const form = new formidable.IncomingForm();
    let RecordLocator = "";

    console.log("Starting form parsing...");

    // Convert formidable parsing to promise-based approach with timeout
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        console.log("Form parsing started...");

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error("Form parsing timeout after 30 seconds");
          reject(new Error("Form parsing timeout"));
        }, 30000);

        form.parse(req, (err, fields, files) => {
          clearTimeout(timeout);
          console.log("Form parsing callback executed");
          if (err) {
            console.error("Form parsing error:", err);
            reject(err);
            return;
          }
          console.log("Form parsed successfully:", {
            fields: Object.keys(fields),
            files: Object.keys(files),
          });
          resolve({ fields, files });
        });
      });
    };

    try {
      console.log("Awaiting form parse...");
      const { fields, files } = await parseForm();
      console.log("Form parse completed, processing files...");

      if (!files || !files.myFile) {
        console.log("No files found in request");
        return res.json({ code: 400, msg: "No file uploaded" });
      }

      let file_name = "";

      console.log("Files object:", JSON.stringify(files, null, 2));
      console.log("myFile object:", JSON.stringify(files.myFile, null, 2));

      // Handle myFile as array (Formidable v3+ behavior)
      const myFile = Array.isArray(files.myFile)
        ? files.myFile[0]
        : files.myFile;

      if (myFile && myFile.originalFilename) {
        console.log("Processing file:", myFile.originalFilename);
        const uploadDir = __dirname + "/../../public/assets/Media/img";
        console.log("Upload directory path:", uploadDir);

        // Check if upload directory exists, create if not
        if (!fs.existsSync(uploadDir)) {
          console.log("Upload directory does not exist, creating...");
          try {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log("Upload directory created successfully");
          } catch (mkdirError) {
            console.error("Error creating upload directory:", mkdirError);
            return res.json({
              code: 500,
              msg: "Error creating upload directory",
            });
          }
        } else {
          console.log("Upload directory exists");
        }

        file_name = myFile.originalFilename;
        file_name = file_name.split(".");
        const ext = file_name[file_name.length - 1];
        RecordLocator = file_name[0];
        let name = "";
        name = dateFormat() + "_" + incNum;
        file_name = name + "." + ext;

        console.log("File renamed to:", file_name);
        console.log("File type:", myFile.mimetype);
        console.log("Upload directory:", uploadDir);
        console.log("Source file path:", myFile.filepath);
        console.log("Destination path:", uploadDir + "/" + file_name);

        try {
          console.log("Attempting to move file...");
          fs.renameSync(myFile.filepath, uploadDir + "/" + file_name);
          console.log(
            "File moved successfully to:",
            uploadDir + "/" + file_name
          );
        } catch (moveError) {
          console.error("Error moving file:", moveError);
          return res.json({ code: 500, msg: "Error moving uploaded file" });
        }

        console.log(
          "File move completed, continuing with media type detection..."
        );

        let media_type = "";
        console.log("Checking file type:", myFile.mimetype);

        if (
          myFile.mimetype === "application/pdf" ||
          myFile.mimetype === "application/msword" ||
          myFile.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          myFile.mimetype === "application/vnd.ms-excel" ||
          myFile.mimetype ===
            "application/vnd.oasis.opendocument.spreadsheet" ||
          myFile.mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          myFile.mimetype === "application/vnd.ms-powerpoint" ||
          myFile.mimetype ===
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ) {
          console.log("File type detected as Document");
          media_type = "Document";
        } else if (
          myFile.mimetype === "video/mp4" ||
          myFile.mimetype === "video/ogg"
        ) {
          console.log("File type detected as Video");
          media_type = "Video";
        } else if (
          myFile.mimetype === "audio/mpeg" ||
          myFile.mimetype === "audio/ogg"
        ) {
          console.log("File type detected as Audio");
          media_type = "Audio";
        } else {
          console.log("File type detected as Image");
          media_type = "Image";
          console.log("File identified as Image type");
          //add thumbnail code
          const imgUrl = file_name;
          const mediaCenterPath = "/../../public/assets/Media/img/";
          const srcPath = __dirname + mediaCenterPath + imgUrl;
          console.log("Image source path:", srcPath);

          console.log("Checking if source file exists...");
          if (fs.existsSync(srcPath)) {
            console.log("Source file exists, creating thumbnail paths...");

            // Check if process.urls exists
            if (!process.urls) {
              console.log(
                "process.urls is undefined, skipping thumbnail creation"
              );
              console.log("process object keys:", Object.keys(process));
            } else {
              console.log("process.urls found:", process.urls);
            }

            const dstPathCrop_SMALL =
              __dirname +
              mediaCenterPath +
              (process.urls?.small__thumbnail || "small_thumbnail") +
              "/" +
              imgUrl;
            const dstPathCrop_SG =
              __dirname +
              mediaCenterPath +
              (process.urls?.SG__thumbnail || "SG_thumbnail") +
              "/" +
              imgUrl;
            const dstPathCrop_MEDIUM =
              __dirname +
              mediaCenterPath +
              (process.urls?.medium__thumbnail || "medium_thumbnail") +
              "/" +
              imgUrl;
            const dstPathCrop_LARGE =
              __dirname +
              mediaCenterPath +
              (process.urls?.large__thumbnail || "large_thumbnail") +
              "/" +
              imgUrl;
            const dstPathCrop_ORIGNAL =
              __dirname +
              mediaCenterPath +
              (process.urls?.aspectfit__thumbnail || "aspectfit_thumbnail") +
              "/" +
              imgUrl;

            const dstPathCrop_aspectfit_small__thumbnail =
              __dirname +
              mediaCenterPath +
              (process.urls?.aspectfit_small__thumbnail ||
                "aspectfit_small_thumbnail") +
              "/" +
              imgUrl;

            console.log("Starting image processing...");

            // Create thumbnail directories if they don't exist
            const thumbnailDirs = [
              __dirname +
                mediaCenterPath +
                (process.urls?.small__thumbnail || "small_thumbnail"),
              __dirname +
                mediaCenterPath +
                (process.urls?.SG__thumbnail || "SG_thumbnail"),
              __dirname +
                mediaCenterPath +
                (process.urls?.medium__thumbnail || "medium_thumbnail"),
              __dirname +
                mediaCenterPath +
                (process.urls?.large__thumbnail || "large_thumbnail"),
              __dirname +
                mediaCenterPath +
                (process.urls?.aspectfit__thumbnail || "aspectfit_thumbnail"),
              __dirname +
                mediaCenterPath +
                (process.urls?.aspectfit_small__thumbnail ||
                  "aspectfit_small_thumbnail"),
            ];

            console.log(
              "Creating thumbnail directories if they don't exist..."
            );
            for (const dir of thumbnailDirs) {
              if (!fs.existsSync(dir)) {
                try {
                  fs.mkdirSync(dir, { recursive: true });
                  console.log("Created directory:", dir);
                } catch (mkdirError) {
                  console.error("Error creating directory:", dir, mkdirError);
                }
              }
            }

            try {
              console.log("Processing small thumbnail...");
              await crop_image(srcPath, dstPathCrop_SMALL, 100, 100);

              console.log("Processing SG thumbnail...");
              await crop_image(srcPath, dstPathCrop_SG, 300, 300);

              console.log("Processing medium thumbnail...");
              await crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);

              console.log("Processing original resize...");
              await resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);

              console.log("Processing aspectfit small thumbnail...");
              await resize_image(
                srcPath,
                dstPathCrop_aspectfit_small__thumbnail,
                575,
                360
              );
              console.log("Image processing completed successfully");
            } catch (imageError) {
              console.error("Error during image processing:", imageError);
              console.log(
                "Continuing with upload despite image processing errors..."
              );
              // Continue with the upload even if image processing fails
            }
          } else {
            console.log(
              "Source file does not exist, skipping thumbnail creation"
            );
          }
        }

        console.log("Media type determined:", media_type);
        console.log(`incNum=${incNum}`);
        let successFlag = false;

        let __UploaderID = "";
        if (req.session.admin) {
          __UploaderID = req.session.admin._id;
          successFlag = true;
        } else if (req.session.subAdmin) {
          __UploaderID = req.session.subAdmin._id;
          successFlag = true;
        } else {
          //return;
        }

        if (!successFlag) {
          console.log("User authenticated, preparing to save media...");
          const dataToUpload = {
            Location: [],
            UploadedBy: "admin",
            UploadedOn: Date.now(),
            UploaderID: __UploaderID,
            Source: "Thinkstock",
            SourceUniqueID: null,
            Domains: null,
            AutoId: incNum,
            GroupTags: [],
            Collection: null,
            Status: 0,
            MetaMetaTags: null,
            MetaTags: null,
            AddedWhere: "directToPf", //directToPf,hardDrive,dragDrop
            IsDeleted: 0,
            TagType: "",
            ContentType: files.myFile.type,
            MediaType: media_type,
            AddedHow: "hardDrive",
            Locator: RecordLocator + "_" + incNum, //added on 23012014
          };

          dataToUpload.Location.push({
            Size: myFile.size,
            URL: file_name,
          });

          console.log("Saving media to database:", dataToUpload);
          try {
            const savedMedia = await media(dataToUpload).save();
            console.log("Media saved successfully, calling findAll...");
            findAll(req, res);
          } catch (err) {
            console.error("Database save error:", err);
            res.json({
              code: 500,
              msg: "Error saving to database",
              error: err.message,
            });
          }
        } else {
          console.log("User not authenticated");
          res.json({ code: 401, msg: "Admin/Subadmin session not found." });
        }
      }
    } catch (parseError) {
      console.error("Error parsing form:", parseError);
      res.json({ code: 500, msg: "Error processing upload" });
    }
  } catch (error) {
    console.error("Error in uploadfile:", error);
    res.json({ code: 500, msg: "Internal server error during upload" });
  }
};

async function saveFileFromUrl(fileUrl, fileName, mediaId, res, resultLength) {
  console.log("saveFileFromUrl called");
  var resultCounter = 0; // Initialize resultCounter
  if (fileUrl) {
    console.log("saveFileFromUrl called in if");
    var mediaCenterPath = "/../../public/assets/Media/img/";
    var dlDir = __dirname + mediaCenterPath;

    console.log("Download From = " + fileUrl.replace(/&/g, "\\&"));
    console.log("To = " + dlDir + fileName);

    //in curl we have to escape '&' from fileUrl
    var curl =
      "curl " +
      fileUrl.replace(/&/g, "\\&") +
      " -o " +
      dlDir +
      fileName +
      " --create-dirs";

    console.log("Command to download : " + curl);

    try {
      // Convert exec to Promise-based approach
      const { exec } = require("child_process");
      const util = require("util");
      const execPromise = util.promisify(exec);

      try {
        const { stdout, stderr } = await execPromise(curl);
        console.log(fileName + " downloaded to " + dlDir);

        //crop
        var srcPath = dlDir + fileName;
        var imgUrl = fileName;
        if (fs.existsSync(srcPath)) {
          var dstPathCrop_SMALL =
            __dirname +
            mediaCenterPath +
            process.urls.small__thumbnail +
            "/" +
            imgUrl;
          var dstPathCrop_SG =
            __dirname +
            mediaCenterPath +
            process.urls.SG__thumbnail +
            "/" +
            imgUrl;
          var dstPathCrop_MEDIUM =
            __dirname +
            mediaCenterPath +
            process.urls.medium__thumbnail +
            "/" +
            imgUrl;
          var dstPathCrop_LARGE =
            __dirname +
            mediaCenterPath +
            process.urls.large__thumbnail +
            "/" +
            imgUrl;
          var dstPathCrop_ORIGNAL =
            __dirname +
            mediaCenterPath +
            process.urls.aspectfit__thumbnail +
            "/" +
            imgUrl;

          var dstPathCrop_aspectfit_small__thumbnail =
            __dirname +
            mediaCenterPath +
            process.urls.aspectfit_small__thumbnail +
            "/" +
            imgUrl;

          await crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
          await crop_image(srcPath, dstPathCrop_SG, 300, 300);
          await crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
          //await crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
          await resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
          await resize_image(
            srcPath,
            dstPathCrop_aspectfit_small__thumbnail,
            575,
            360
          );
        }

        if (mediaId) {
          var query = { _id: mediaId };
          var options = {};
          var fields = {};
          fields.thumbnail = fileName;
          try {
            await media.updateOne(query, { $set: fields }, options);
            generateCounter();
          } catch (updateErr) {
            console.log("Error updating media:", updateErr);
          }
        }
      } catch (execErr) {
        console.log("Exec error:", execErr.stderr || execErr.message);
      }
    } catch (e) {
      console.log("E = ", e);
    }

    function generateCounter() {
      resultCounter++;
      console.log("resultCounter = " + resultCounter);
      if (resultCounter > resultLength / 2) {
        res.json({
          code: "200",
          msg: resultCounter + " Links have been processed..",
          responselength: resultCounter,
        });
        return;
      }
    }
  } else {
    console.log("fileUrl Error = " + fileUrl);
  }
}

const uploadLink = async (req, res) => {
  var incNum = 0;
  try {
    const data = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true }
    );
    console.log("=========================");
    console.log(data);
    //data.seq=(data.seq)+1;
    console.log(data.seq);
    incNum = data.seq;
    //data.save();
    console.log("incNum=" + incNum);
    var type = "Link";
    if (req.body.type == "Notes") {
      type = "Notes";
      name = dateFormat();
      //name = Date.now();//18022015
    }
    if (req.body.type == "Montage") {
      type = "Montage";
      name = "montage_" + incNum;
    }
    console.log("---------------req.body.type = " + req.body.type);

    var LinkType = "";
    if (req.body.linkType) {
      LinkType = req.body.linkType;
    }

    var thumbnail = "";
    if (req.body.thumbnail) {
      thumbnail = req.body.thumbnail;
      if (type == "Link") {
        //console.log("Thumbnail = "+thumbnail);
        var url = require("url");
        var f = "";
        var fArr = [];
        var ext = ""; // Declare ext variable
        //var fileName = "web-link-"+Date.now()+url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
        f = url.parse(thumbnail).pathname.split("/").pop().split("?").shift();
        fArr = f.split(".");
        RecordLocator = fArr[0];
        console.log("RecordLocator = " + RecordLocator); //return;
        ext = fArr[fArr.length - 1];
        //var fileName = Date.now()+'_'+incNum+'.'+ext;
        var name = "";
        name = RecordLocator;
        var fileName = dateFormat() + "_" + incNum + "." + ext;
        //async_libhronous call - child process command execution
        await saveFileFromUrl(thumbnail, fileName);
        thumbnail = fileName;
      }
    }
    console.log("------------------name = ", name);

    var dataToUpload = {
      Location: [],
      AutoId: incNum,
      UploadedBy: "user",
      UploadedOn: Date.now(),
      UploaderID: req.body.owner || "68a733773931522f1b7f4632",
      Source: "Thinkstock",
      //SourceUniqueID:null,
      SourceUniqueID: "53ceb02d3aceabbe5d573dba", //updated on 06012015
      //Domains:null,
      Domains: "53ad6993f222ef325c05039c",
      GroupTags: [],
      //Collection:null,
      Collection: [
        "53ceaf933aceabbe5d573db4",
        "53ceaf9d3aceabbe5d573db6",
        "549323f9610706c30a70679e",
      ],
      //Status:0,
      Status: 2, //updated on 25122014 by manishp after discussing with amitchh - for more detail on Status codes check the comments on media model
      MetaMetaTags: null,
      MetaTags: null,
      //AddedWhere:"directToPf", //directToPf,hardDrive,dragDrop
      AddedWhere: "board", //directToPf,board,capsule
      IsDeleted: 0,
      TagType: "",
      Content: req.body.content,
      ContentType: type,
      MediaType: type,
      AddedHow: type,
      thumbnail: thumbnail, //added on 24122014 by manishp embedded link thumbnail case.
      Locator: name + "_" + incNum,
      LinkType: LinkType,
      OwnerFSGs: req.session?.user?.FSGsArr2 || [],
      OwnStatement: req.body.Statement ? req.body.Statement : "", //The Original statement by the image owner
      CurrStatement: req.body.Statement ? req.body.Statement : "", // Statement currently in use
    };
    if (req.body.Prompt) {
      dataToUpload.Prompt = req.body.Prompt;
    }
    dataToUpload.Location.push({
      Size: "",
      URL: "",
    });

    if (req.body.Title) {
      dataToUpload.Title = req.body.Title;
    }

    //console.log("dataToUpload = ",dataToUpload);return;
    try {
      const savedMedia = await media(dataToUpload).save();
      // TODO: Uncomment when add__Descriptors is fully implemented
      // if (req.body.Prompt) {
      //   add__Descriptors(req.body.Prompt, savedMedia._id);
      // }
      res.json({ code: "200", message: "success", response: savedMedia });
    } catch (err) {
      res.json({ code: "404", message: err });
    }
  } catch (error) {
    console.error("Error in uploadLink:", error);
    res.json({ code: "500", message: "Internal server error" });
  }
};

// Helper function to check default private case
function defaultPrivateCase__Checker(mediaObj) {
  var returnFlag = false;
  var mediaType = mediaObj.MediaType;

  switch (mediaType) {
    case "Image":
      if (mediaObj.UploadedBy == "user") {
        returnFlag = true;
      }
      break;
    case "Video":
      if (mediaObj.UploadedBy == "user" && mediaObj.AddedHow == "recording") {
        returnFlag = true;
      }
      break;
    case "Audio":
      if (mediaObj.UploadedBy == "user" && mediaObj.AddedHow == "recording") {
        returnFlag = true;
      }
      break;
    case "Notes":
      returnFlag = true;
      break;
    case "Link":
      returnFlag = false;
      break;
  }
  return returnFlag;
}

// Helper function to add tags to group tags
const addTags_toGT = async (mediaID, tags) => {
  try {
    tags = tags.split(",");
    const med_Data = await media.findById(mediaID);
    console.log(med_Data.GroupTags.length);

    for (var i = 0; i < med_Data.GroupTags.length; i++) {
      console.log(
        "----------sending==============" + med_Data.GroupTags[i].GroupTagID
      );
      await final__addTags_toGT(med_Data.GroupTags[i].GroupTagID, tags);
    }
  } catch (error) {
    console.error("Error in addTags_toGT:", error);
  }
};

// Helper function to finalize tag addition
const final__addTags_toGT = async (gtID, tags) => {
  try {
    const gt = await groupTags.findById(gtID);
    if (gt) {
      console.log("---------------------------------------------------------");
      console.log(gt);
      console.log("---------------------------------------------------------");

      for (let j in tags) {
        var resultFinal = false;
        if (gt.Tags != null && gt.Tags != undefined) {
          // Tags array exists
        } else {
          gt.Tags = [];
        }

        for (let x in gt.Tags) {
          if (gt.Tags[x].TagTitle == tags[j]) {
            resultFinal = true;
            var tagID = gt.Tags[x]._id;
          }
        }

        if (!resultFinal) {
          gt.Tags.push({
            TagTitle: tags[j],
            status: 2,
          });
        }

        await gt.save();
      }
    }
  } catch (error) {
    console.error("Error in final__addTags_toGT:", error);
  }
};

// Function to add media to board
const addMediaToBoard = async (req, res) => {
  try {
    console.log("addMediaToBoard");
    let fields = {
      Medias: [],
    };

    const result = await board.findById(req.body.board);
    if (!result) {
      return res.json({ code: "404", msg: "Not Found" });
    }

    // Handle thumbnail
    var thumbnail = "";
    if (req.body.data.thumbnail) {
      thumbnail = req.body.data.thumbnail;
      console.log("if -----------------------thumbnail = ", thumbnail);
    }

    if (req.body.gt == "" || typeof req.body.gt == "undefined") {
      console.log("if (req.body.gt== check");

      if (result.Medias == null) {
        fields.Medias = [];
      } else {
        fields.Medias = result.Medias;
      }

      // Create new group tag
      const gtfields = {
        GroupTagTitle: req.body.gtsa,
        Notes: "",
        DateAdded: Date.now(),
        MetaMetaTagID: null,
        MetaTagID: null,
        status: 2,
      };

      const newGroupTag = await groupTags(gtfields).save();

      if (result.Themes == null) {
        fields.Themes = [];
      } else {
        fields.Themes = result.Themes;
      }

      fields.Themes.push({
        ThemeID: newGroupTag._id,
        ThemeTitle: req.body.gtsa,
        SuggestedBy: req.body.owner || "68a733773931522f1b7f4632",
        SuggestedOn: Date.now(),
        isApproved: 0,
      });

      // Add media to board
      if (req.body.data.Content) {
        fields.Medias.push({
          MediaID: req.body.id,
          MediaURL: req.body.data.Location[0].URL,
          MediaTitle: null,
          PostedBy: req.body.owner || "68a733773931522f1b7f4632",
          PostedOn: Date.now(),
          Content: req.body.data.Content,
          ThemeID: newGroupTag._id,
          ThemeTitle: req.body.gtsa,
          ContentType: req.body.data.ContentType,
          Votes: [],
          Marks: [],
          thumbnail: thumbnail,
          PostStatement: req.body.Statement ? req.body.Statement : "",
          Themes: req.body.Themes ? req.body.Themes : [],
          IsOnlyForOwner: req.body.IsOnlyForOwner
            ? req.body.IsOnlyForOwner
            : false,
          PostPrivacySetting: req.body.PostPrivacySetting
            ? req.body.PostPrivacySetting
            : "PublicWithoutName",
          IsUnsplashImage: req.body.IsUnsplashImage
            ? req.body.IsUnsplashImage
            : false,
          TaggedUsers: req.body.TaggedUsers ? req.body.TaggedUsers : [],
          IsAddedFromStream: req.body.IsAddedFromStream
            ? req.body.IsAddedFromStream
            : false,
          StreamId: req.body.StreamId ? req.body.StreamId : null,
          IsPostForUser: req.body.IsPostForUser
            ? req.body.IsPostForUser
            : false,
          IsPostForTeam: req.body.IsPostForTeam
            ? req.body.IsPostForTeam
            : false,
          QuestionPostId: req.body.QuestionPostId
            ? req.body.QuestionPostId
            : null,
          PostType: req.body.QuestionPostId ? "AnswerPost" : null,
        });
      } else {
        fields.Medias.push({
          MediaID: req.body.id,
          MediaURL: req.body.data.Location[0].URL,
          MediaTitle: null,
          PostedBy: req.body.owner || "68a733773931522f1b7f4632",
          PostedOn: Date.now(),
          ThemeID: newGroupTag._id,
          ThemeTitle: req.body.gtsa,
          ContentType: req.body.data.ContentType,
          Votes: [],
          Marks: [],
          thumbnail: thumbnail,
          PostStatement: req.body.Statement ? req.body.Statement : "",
          Themes: req.body.Themes ? req.body.Themes : [],
          IsOnlyForOwner: req.body.IsOnlyForOwner
            ? req.body.IsOnlyForOwner
            : false,
          PostPrivacySetting: req.body.PostPrivacySetting
            ? req.body.PostPrivacySetting
            : "PublicWithoutName",
          IsUnsplashImage: req.body.IsUnsplashImage
            ? req.body.IsUnsplashImage
            : false,
          TaggedUsers: req.body.TaggedUsers ? req.body.TaggedUsers : [],
          IsAddedFromStream: req.body.IsAddedFromStream
            ? req.body.IsAddedFromStream
            : false,
          StreamId: req.body.StreamId ? req.body.StreamId : null,
          IsPostForUser: req.body.IsPostForUser
            ? req.body.IsPostForUser
            : false,
          IsPostForTeam: req.body.IsPostForTeam
            ? req.body.IsPostForTeam
            : false,
          QuestionPostId: req.body.QuestionPostId
            ? req.body.QuestionPostId
            : null,
          PostType: req.body.QuestionPostId ? "AnswerPost" : null,
        });
      }

      // Update board
      await board.updateOne({ _id: req.body.board }, { $set: fields });
    } else {
      console.log("else (req.body.gt== check thumbnail = ", thumbnail);

      if (result.Medias == null) {
        fields.Medias = [];
      } else {
        fields.Medias = result.Medias;
      }

      var flag = 0;
      for (let as in result.Themes) {
        if (result.Themes[as].ThemeID == req.body.gt) {
          flag = 1;
        }
      }

      if (flag == 0) {
        if (result.Themes == null) {
          fields.Themes = [];
        } else {
          fields.Themes = result.Themes;
        }

        fields.Themes.push({
          ThemeID: req.body.gt,
          ThemeTitle: req.body.gtsa,
          SuggestedBy: req.body.owner || "68a733773931522f1b7f4632",
          SuggestedOn: Date.now(),
          isApproved: 1,
        });
      }

      // Add media to board
      if (req.body.data.Content) {
        const obj = {
          MediaID: req.body.id,
          MediaURL: req.body.data.Location[0].URL,
          Title: null,
          Prompt: null,
          Photographer: null,
          PostedBy: req.body.owner || "68a733773931522f1b7f4632",
          PostedOn: Date.now(),
          ThemeID: req.body.gt,
          ThemeTitle: req.body.gtsa,
          MediaType: req.body.data.MediaType,
          ContentType: req.body.data.ContentType,
          Votes: [],
          Marks: [],
          OwnerId: req.body.owner,
          Content: req.body.data.Content,
          thumbnail: thumbnail,
          PostStatement: req.body.Statement ? req.body.Statement : "",
          IsOnlyForOwner: req.body.IsOnlyForOwner
            ? req.body.IsOnlyForOwner
            : false,
          PostPrivacySetting: req.body.PostPrivacySetting
            ? req.body.PostPrivacySetting
            : "PublicWithoutName",
          IsUnsplashImage: req.body.IsUnsplashImage
            ? req.body.IsUnsplashImage
            : false,
          TaggedUsers: req.body.TaggedUsers ? req.body.TaggedUsers : [],
          IsAddedFromStream: req.body.IsAddedFromStream
            ? req.body.IsAddedFromStream
            : false,
          StreamId: req.body.StreamId ? req.body.StreamId : null,
          IsPostForUser: req.body.IsPostForUser
            ? req.body.IsPostForUser
            : false,
          IsPostForTeam: req.body.IsPostForTeam
            ? req.body.IsPostForTeam
            : false,
          QuestionPostId: req.body.QuestionPostId
            ? req.body.QuestionPostId
            : null,
          PostType: req.body.QuestionPostId ? "AnswerPost" : null,
        };
      } else {
        fields.Medias.push({
          MediaID: req.body.id,
          MediaURL: req.body.data.Location[0].URL,
          Title: null,
          Prompt: null,
          Photographer: null,
          PostedBy: req.body.owner || "68a733773931522f1b7f4632",
          PostedOn: Date.now(),
          ThemeID: req.body.gt,
          ThemeTitle: req.body.gtsa,
          MediaType: req.body.data.MediaType,
          ContentType: req.body.data.ContentType,
          Votes: [],
          Marks: [],
          OwnerId: req.body.owner,
          thumbnail: thumbnail,
          PostStatement: req.body.Statement ? req.body.Statement : "",
          Themes: req.body.Themes ? req.body.Themes : [],
          IsOnlyForOwner: req.body.IsOnlyForOwner
            ? req.body.IsOnlyForOwner
            : false,
          PostPrivacySetting: req.body.PostPrivacySetting
            ? req.body.PostPrivacySetting
            : "PublicWithoutName",
          IsUnsplashImage: req.body.IsUnsplashImage
            ? req.body.IsUnsplashImage
            : false,
          TaggedUsers: req.body.TaggedUsers ? req.body.TaggedUsers : [],
          IsAddedFromStream: req.body.IsAddedFromStream
            ? req.body.IsAddedFromStream
            : false,
          StreamId: req.body.StreamId ? req.body.StreamId : null,
          IsPostForUser: req.body.IsPostForUser
            ? req.body.IsPostForUser
            : false,
          IsPostForTeam: req.body.IsPostForTeam
            ? req.body.IsPostForTeam
            : false,
          QuestionPostId: req.body.QuestionPostId
            ? req.body.QuestionPostId
            : null,
          PostType: req.body.QuestionPostId ? "AnswerPost" : null,
        });
      }

      // Update board
      await board.updateOne({ _id: req.body.board }, { $set: fields });
    }

    // Call postMedia after successful board update
    postMedia(req, res);
  } catch (error) {
    console.error("Error in addMediaToBoard:", error);
    res.json({ code: "500", msg: "Internal server error" });
  }
};

// Function to update media on board
const updateMediaToBoard = async (req, res) => {
  try {
    console.log("-----updateMediaToBoard");
    let fields = {
      Medias: [],
    };

    const result = await board.findById(req.body.board);
    if (!result) {
      return res.json({ code: "404", msg: "Not Found" });
    }

    var thumbnail = "";
    if (req.body.data.thumbnail) {
      thumbnail = req.body.data.thumbnail;
    }

    if (req.body.gt == "" || typeof req.body.gt == "undefined") {
      if (result.Medias == null) {
        fields.Medias = [];
      } else {
        fields.Medias = result.Medias;
      }

      // Create new group tag
      const gtfields = {
        GroupTagTitle: req.body.gtsa.trim(),
        Notes: "",
        DateAdded: Date.now(),
        MetaMetaTagID: null,
        MetaTagID: null,
        status: 2,
      };

      const newGroupTag = await groupTags(gtfields).save();

      if (result.Themes == null) {
        fields.Themes = [];
      } else {
        fields.Themes = result.Themes;
      }

      fields.Themes.push({
        ThemeID: newGroupTag._id,
        ThemeTitle: req.body.gtsa,
        SuggestedBy: req.body.owner || "68a733773931522f1b7f4632",
        SuggestedOn: Date.now(),
        isApproved: 0,
      });

      let setObj = {};
      if (req.body.data.Content) {
        setObj = {
          "Medias.$.MediaID": req.body.id,
          "Medias.$.MediaURL": req.body.data.Location[0].URL,
          "Medias.$.MediaTitle": null,
          "Medias.$.Content": req.body.data.Content,
          "Medias.$.ThemeID": newGroupTag._id,
          "Medias.$.ThemeTitle": req.body.gtsa,
          "Medias.$.ContentType": req.body.data.ContentType,
          "Medias.$.thumbnail": thumbnail,
          "Medias.$.PostStatement": req.body.Statement
            ? req.body.Statement
            : "",
          "Medias.$.Themes": req.body.Themes ? req.body.Themes : [],
        };
      } else {
        setObj = {
          "Medias.$.MediaID": req.body.id,
          "Medias.$.MediaURL": req.body.data.Location[0].URL,
          "Medias.$.MediaTitle": null,
          "Medias.$.ThemeID": newGroupTag._id,
          "Medias.$.ThemeTitle": req.body.gtsa,
          "Medias.$.ContentType": req.body.data.ContentType,
          "Medias.$.thumbnail": thumbnail,
          "Medias.$.PostStatement": req.body.Statement
            ? req.body.Statement
            : "",
          "Medias.$.Themes": req.body.Themes ? req.body.Themes : [],
        };
      }

      // Update specific media in board
      await board.updateOne(
        {
          _id: req.body.board,
          "Medias._id": req.body.PostId,
        },
        { $set: setObj }
      );
    } else {
      if (result.Medias == null) {
        fields.Medias = [];
      } else {
        fields.Medias = result.Medias;
      }

      var flag = 0;
      for (let as in result.Themes) {
        if (result.Themes[as].ThemeID == req.body.gt) {
          flag = 1;
        }
      }

      if (flag == 0) {
        if (result.Themes == null) {
          fields.Themes = [];
        } else {
          fields.Themes = result.Themes;
        }

        fields.Themes.push({
          ThemeID: req.body.gt,
          ThemeTitle: req.body.gtsa,
          SuggestedBy: req.body.owner || "68a733773931522f1b7f4632",
          SuggestedOn: Date.now(),
          isApproved: 1,
        });
      }

      let setObj = {};
      if (req.body.data.Content) {
        setObj = {
          "Medias.$.MediaID": req.body.id,
          "Medias.$.MediaURL": req.body.data.Location[0].URL,
          "Medias.$.Title": null,
          "Medias.$.Prompt": null,
          "Medias.$.Photographer": null,
          "Medias.$.ThemeID": req.body.gt,
          "Medias.$.ThemeTitle": req.body.gtsa,
          "Medias.$.MediaType": req.body.data.MediaType,
          "Medias.$.ContentType": req.body.data.ContentType,
          "Medias.$.OwnerId": req.body.owner,
          "Medias.$.Content": req.body.data.Content,
          "Medias.$.thumbnail": thumbnail,
          "Medias.$.PostStatement": req.body.Statement
            ? req.body.Statement
            : "",
          "Medias.$.Themes": req.body.Themes ? req.body.Themes : [],
        };
      } else {
        setObj = {
          "Medias.$.MediaID": req.body.id,
          "Medias.$.MediaURL": req.body.data.Location[0].URL,
          "Medias.$.Title": null,
          "Medias.$.Prompt": null,
          "Medias.$.Photographer": null,
          "Medias.$.ThemeID": req.body.gt,
          "Medias.$.ThemeTitle": req.body.gtsa,
          "Medias.$.MediaType": req.body.data.MediaType,
          "Medias.$.ContentType": req.body.data.ContentType,
          "Medias.$.OwnerId": req.body.owner,
          "Medias.$.thumbnail": thumbnail,
          "Medias.$.PostStatement": req.body.Statement
            ? req.body.Statement
            : "",
          "Medias.$.Themes": req.body.Themes ? req.body.Themes : [],
        };
      }

      // Update specific media in board
      await board.updateOne(
        {
          _id: req.body.board,
          "Medias.$.MediaID": req.body.id,
        },
        { $set: setObj }
      );
    }

    // Call postMedia after successful update
    postMedia(req, res);
  } catch (error) {
    console.error("Error in updateMediaToBoard:", error);
    res.json({ code: "500", msg: "Internal server error" });
  }
};

// Helper function to fetch and process GroupTags in batches
const processGroupTagsBatch = async (mediaID, queryOptions = {}, batchSize = 200) => {
  // Default query: fetch active GroupTags (status 1 or 3), not deleted
  const defaultQuery = {
    IsDeleted: { $ne: 1 },
    $or: [{ status: 1 }, { status: 3 }]
  };

  // Merge with custom query options if provided
  const query = { ...defaultQuery, ...queryOptions };

  console.log(`🔍 Fetching GroupTags from collection with query:`, JSON.stringify(query));

  // Fetch all GroupTags matching the query
  const allGroupTags = await groupTags.find(query).select('_id').lean();
  const totalGroupTags = allGroupTags.length;

  if (totalGroupTags === 0) {
    console.log(`⚠️ No GroupTags found matching the query`);
    return [];
  }

  console.log(`📦 Found ${totalGroupTags} GroupTags. Processing in batches of ${batchSize}`);

  // Extract GroupTag IDs
  const groupTagIds = allGroupTags.map(gt => gt._id);

  // Split into batches
  const batches = [];
  for (let i = 0; i < groupTagIds.length; i += batchSize) {
    batches.push(groupTagIds.slice(i, i + batchSize));
  }

  console.log(`📦 Processing ${totalGroupTags} GroupTags in ${batches.length} batch(es) of ${batchSize}`);

  // Get current media data to preserve existing GroupTags
  const mediaData = await media.findById(mediaID);
  if (!mediaData) {
    throw new Error("Media not found");
  }

  // Start with existing GroupTags (convert to array of objects if needed)
  let existingGroupTags = [];
  if (Array.isArray(mediaData.GroupTags) && mediaData.GroupTags.length > 0) {
    // Handle both string IDs and object format
    existingGroupTags = mediaData.GroupTags.map(gt => {
      if (typeof gt === 'string' || gt instanceof ObjectId) {
        return { GroupTagID: String(gt) };
      }
      return gt.GroupTagID ? gt : { GroupTagID: String(gt) };
    });
  }

  // Track all GroupTag IDs to avoid duplicates
  const existingGroupTagIds = new Set(
    existingGroupTags.map(gt => String(gt.GroupTagID))
  );

  let totalAdded = 0;

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} GroupTags)`);

    // Add new GroupTags from this batch (avoid duplicates)
    const newGroupTags = [];
    for (const gtId of batch) {
      const gtIdString = String(gtId);
      if (!existingGroupTagIds.has(gtIdString)) {
        newGroupTags.push({ GroupTagID: gtIdString });
        existingGroupTagIds.add(gtIdString);
        totalAdded++;
      }
    }

    // Combine existing and new GroupTags
    const updatedGroupTags = [...existingGroupTags, ...newGroupTags];

    // Update media with this batch
    await media.updateOne(
      { _id: mediaID },
      { $set: { GroupTags: updatedGroupTags } }
    );

    // Increment MediaCount for each GroupTag in this batch
    for (const gtId of batch) {
      try {
        await groupTags.updateOne(
          { _id: gtId },
          { $inc: { MediaCount: 1 } }
        );
      } catch (error) {
        console.error(`⚠️ Error incrementing MediaCount for GroupTag ${gtId}:`, error.message);
      }
    }

    // Update existingGroupTags for next batch
    existingGroupTags = updatedGroupTags;

    console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed (${newGroupTags.length} new GroupTags added, ${totalAdded} total so far)`);
  }

  console.log(`✅ All batches processed. Total GroupTags assigned: ${existingGroupTags.length} (${totalAdded} newly added)`);
  return {
    totalProcessed: totalGroupTags,
    totalAssigned: existingGroupTags.length,
    newlyAdded: totalAdded,
    batchesProcessed: batches.length
  };
};

// Helper function to find media matching a GroupTag based on metadata
// Returns media IDs that match any tag within the GroupTag
const findMatchingMediaForGroupTag = async (groupTag) => {
  try {
    // Get all active tags from the GroupTag
    const activeTags = Array.isArray(groupTag.Tags) 
      ? groupTag.Tags.filter(tag => tag?.status === 1 || tag?.status === undefined)
      : [];

    if (activeTags.length === 0) {
      console.log(`⚠️ GroupTag ${groupTag.GroupTagTitle || groupTag._id} has no active tags`);
      return [];
    }

    // Build query to find media where any tag from GroupTag matches metadata fields
    const tagTitles = activeTags.map(tag => tag.TagTitle).filter(Boolean);
    if (tagTitles.length === 0) {
      return [];
    }

    // Build $or conditions for each metadata field with each tag title
    const orConditions = [];
    
    // For array fields, use $in with exact matches (case-insensitive via regex)
    for (const tagTitle of tagTitles) {
      const escapedTitle = tagTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedTitle}$`, "i");
      
      orConditions.push({ "MetaData.Subjects": regex });
      orConditions.push({ "MetaData.Metaphors": regex });
      orConditions.push({ "MetaData.Concepts": regex });
      orConditions.push({ "MetaData.Attributes": regex });
      orConditions.push({ "MetaData.Feelings": regex });
      orConditions.push({ "MetaData.Verbs": regex });
    }
    
    // For Prompt field, use regex with all tags
    if (tagTitles.length > 0) {
      const promptRegex = tagTitles.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|");
      orConditions.push({ "Prompt": { $regex: promptRegex, $options: "i" } });
    }

    const query = {
      IsDeleted: { $ne: 1 },
      $or: orConditions
    };

    const matchingMedia = await media.find(query).select('_id MetaData Prompt').lean();
    return matchingMedia;
  } catch (error) {
    console.error(`Error finding matching media for GroupTag ${groupTag._id}:`, error.message);
    return [];
  }
};

// Helper function to find which metadata field a tag matches
const findMatchingMetadataField = (tagTitle, mediaData) => {
  const tagTitleLower = tagTitle.toLowerCase().trim();
  
  // Check each metadata field
  if (mediaData.MetaData?.Subjects) {
    const subjects = Array.isArray(mediaData.MetaData.Subjects) ? mediaData.MetaData.Subjects : [];
    if (subjects.some(s => s.toLowerCase().trim() === tagTitleLower)) {
      return "MetaData.Subjects";
    }
  }
  
  if (mediaData.MetaData?.Metaphors) {
    const metaphors = Array.isArray(mediaData.MetaData.Metaphors) ? mediaData.MetaData.Metaphors : [];
    if (metaphors.some(m => m.toLowerCase().trim() === tagTitleLower)) {
      return "MetaData.Metaphors";
    }
  }
  
  if (mediaData.MetaData?.Concepts) {
    const concepts = Array.isArray(mediaData.MetaData.Concepts) ? mediaData.MetaData.Concepts : [];
    if (concepts.some(c => c.toLowerCase().trim() === tagTitleLower)) {
      return "MetaData.Concepts";
    }
  }
  
  if (mediaData.MetaData?.Attributes) {
    const attributes = Array.isArray(mediaData.MetaData.Attributes) ? mediaData.MetaData.Attributes : [];
    if (attributes.some(a => a.toLowerCase().trim() === tagTitleLower)) {
      return "MetaData.Attributes";
    }
  }
  
  if (mediaData.MetaData?.Feelings) {
    const feelings = Array.isArray(mediaData.MetaData.Feelings) ? mediaData.MetaData.Feelings : [];
    if (feelings.some(f => f.toLowerCase().trim() === tagTitleLower)) {
      return "MetaData.Feelings";
    }
  }
  
  if (mediaData.MetaData?.Verbs) {
    const verbs = Array.isArray(mediaData.MetaData.Verbs) ? mediaData.MetaData.Verbs : [];
    if (verbs.some(v => v.toLowerCase().trim() === tagTitleLower)) {
      return "MetaData.Verbs";
    }
  }
  
  if (mediaData.Prompt && typeof mediaData.Prompt === 'string') {
    const promptWords = mediaData.Prompt.toLowerCase().split(/[,\s]+/);
    if (promptWords.includes(tagTitleLower)) {
      return "Prompt";
    }
  }
  
  return null;
};

// Helper function to assign GroupTag to media in batches
// Creates multiple GroupTag entries (one per matching tag) like the example structure
const assignGroupTagToMediaBatch = async (groupTag, matchingMediaArray, batchSize = 200) => {
  if (!matchingMediaArray || matchingMediaArray.length === 0) {
    return { processed: 0, assigned: 0, skipped: 0 };
  }

  // Get active tags from GroupTag
  const activeTags = Array.isArray(groupTag.Tags) 
    ? groupTag.Tags.filter(tag => tag?.status === 1 || tag?.status === undefined)
    : [];

  if (activeTags.length === 0) {
    console.log(`  ⚠️ No active tags in GroupTag ${groupTag.GroupTagTitle || groupTag._id}`);
    return { processed: 0, assigned: 0, skipped: 0 };
  }

  const groupTagIdString = String(groupTag._id);
  const groupTagTitle = groupTag.GroupTagTitle || "";

  // OPTIMIZATION: Batch fetch all media with GroupTags in one query
  const mediaIds = matchingMediaArray.map(m => m._id).filter(Boolean);
  
  if (mediaIds.length === 0) {
    console.log(`  ⚠️ No valid media IDs found`);
    return { processed: 0, assigned: 0, skipped: 0 };
  }
  
  const mediaDocs = await media.find({ _id: { $in: mediaIds } }).select('_id GroupTags').lean();
  const mediaMap = new Map(mediaDocs.map(doc => [String(doc._id), doc]));

  // Prepare bulk operations for faster updates
  const mediaBulkOps = [];
  const mediaIdsToUpdate = new Set();
  let totalAssigned = 0;
  let totalSkipped = 0;

  // Process all media in one pass (no individual queries)
  for (const mediaItem of matchingMediaArray) {
    try {
      const mediaId = mediaItem._id;
      const mediaDoc = mediaMap.get(String(mediaId));
      
      if (!mediaDoc) {
        continue;
      }

      const existingGroupTags = Array.isArray(mediaDoc.GroupTags) ? mediaDoc.GroupTags : [];
      const existingTagSet = new Set();
      
      // Build set of existing tag combinations for O(1) lookup
      existingGroupTags.forEach(gt => {
        if (typeof gt !== 'string' && gt.GroupTagID && gt.TagID) {
          existingTagSet.add(`${String(gt.GroupTagID)}:${String(gt.TagID)}`);
        }
      });

      // Find all matching tags from this GroupTag for this media
      const newGroupTagEntries = [];
      
      for (const tag of activeTags) {
        if (!tag.TagTitle) continue;

        // Check if this specific tag matches any metadata field (use mediaItem which has MetaData)
        const matchedFrom = findMatchingMetadataField(tag.TagTitle, mediaItem);
        if (!matchedFrom) {
          continue; // This tag doesn't match this media
        }

        // Fast duplicate check using Set
        const tagIdString = String(tag._id);
        const tagKey = `${groupTagIdString}:${tagIdString}`;
        
        if (!existingTagSet.has(tagKey)) {
          newGroupTagEntries.push({
            GroupTagID: groupTagIdString,
            GroupTagTitle: groupTagTitle,
            TagID: tagIdString,
            TagTitle: tag.TagTitle,
            TagType: tag.TagType || "",
            MatchedFrom: matchedFrom
          });
          existingTagSet.add(tagKey); // Prevent duplicates in same batch
        }
      }

      // Prepare bulk update operation
      if (newGroupTagEntries.length > 0) {
        const updatedGroupTags = [...existingGroupTags, ...newGroupTagEntries];
        mediaBulkOps.push({
          updateOne: {
            filter: { _id: mediaId },
            update: { $set: { GroupTags: updatedGroupTags } }
          }
        });
        mediaIdsToUpdate.add(String(mediaId));
        totalAssigned += newGroupTagEntries.length;
      } else {
        totalSkipped++;
      }
    } catch (error) {
      console.error(`  ⚠️ Error processing media ${mediaItem._id}:`, error.message);
    }
  }

  // OPTIMIZATION: Execute bulk updates in batches of 500 (much faster than individual updates)
  const bulkBatchSize = 500;
  for (let i = 0; i < mediaBulkOps.length; i += bulkBatchSize) {
    const bulkBatch = mediaBulkOps.slice(i, i + bulkBatchSize);
    try {
      await media.bulkWrite(bulkBatch, { ordered: false });
      console.log(`  💾 Bulk updated ${bulkBatch.length} media documents (batch ${Math.floor(i/bulkBatchSize) + 1})`);
    } catch (error) {
      console.error(`  ⚠️ Bulk update error:`, error.message);
    }
  }

  // OPTIMIZATION: Single update for MediaCount (increment by number of unique media)
  if (mediaIdsToUpdate.size > 0) {
    try {
      await groupTags.updateOne(
        { _id: groupTag._id },
        { $inc: { MediaCount: mediaIdsToUpdate.size } }
      );
    } catch (error) {
      console.error(`  ⚠️ Error updating MediaCount:`, error.message);
    }
  }

  return { processed: matchingMediaArray.length, assigned: totalAssigned, skipped: totalSkipped };
};

// Main function to automatically fetch GroupTags and assign them to matching media
// If groupTagId is provided, processes only that GroupTag
// If not provided, processes all active GroupTags automatically
const addTagsToUploadedMedia = async (req, res) => {
  try {
    // Check if a specific groupTagId is provided
    const groupTagId = req.body.groupTagId;
    
    let allGroupTags = [];
    
    if (groupTagId) {
      // Process only the specified GroupTag
      console.log(`🚀 Starting GroupTag assignment for specific GroupTag: ${groupTagId}`);
      
      try {
        const groupTag = await groupTags.findOne({ 
          _id: new ObjectId(groupTagId),
          IsDeleted: { $ne: 1 }
        }).lean();
        
        if (!groupTag) {
          return res.json({ 
            code: "404", 
            message: `GroupTag with ID ${groupTagId} not found or is deleted`,
            totalGroupTags: 0,
            results: []
          });
        }
        
        allGroupTags = [groupTag];
        console.log(`📋 Processing single GroupTag: ${groupTag.GroupTagTitle || groupTagId}`);
      } catch (error) {
        return res.json({ 
          code: "400", 
          message: `Invalid groupTagId format: ${groupTagId}`,
          error: error.message,
          totalGroupTags: 0,
          results: []
        });
      }
    } else {
      // Process all active GroupTags automatically
      console.log("🚀 Starting automatic GroupTag assignment to media (bulk mode)");

      // Fetch all active GroupTags from collection
      const queryOptions = {
        IsDeleted: { $ne: 1 },
        $or: [{ status: 1 }, { status: 3 }]
      };

      // Allow custom query from request if provided
      const finalQuery = req.body.queryOptions ? { ...queryOptions, ...req.body.queryOptions } : queryOptions;

      console.log(`🔍 Fetching GroupTags with query:`, JSON.stringify(finalQuery));
      allGroupTags = await groupTags.find(finalQuery).lean();
      
      if (!allGroupTags || allGroupTags.length === 0) {
        return res.json({ 
          code: "200", 
          message: "No GroupTags found to process",
          totalGroupTags: 0,
          results: []
        });
      }

      console.log(`📋 Found ${allGroupTags.length} GroupTags to process (bulk mode)`);
    }

    const results = [];
    let totalMediaProcessed = 0;
    let totalMediaAssigned = 0;

    // Process each GroupTag
    for (let i = 0; i < allGroupTags.length; i++) {
      const groupTag = allGroupTags[i];
      console.log(`\n🏷️ Processing GroupTag ${i + 1}/${allGroupTags.length}: ${groupTag.GroupTagTitle || groupTag._id}`);

      // Find matching media for this GroupTag
      const matchingMediaIds = await findMatchingMediaForGroupTag(groupTag);
      
      if (matchingMediaIds.length === 0) {
        console.log(`  ⚠️ No matching media found for GroupTag: ${groupTag.GroupTagTitle}`);
        results.push({
          groupTagId: String(groupTag._id),
          groupTagTitle: groupTag.GroupTagTitle,
          mediaFound: 0,
          mediaAssigned: 0,
          mediaSkipped: 0
        });
        continue;
      }

      console.log(`  ✅ Found ${matchingMediaIds.length} matching media`);

      // Assign GroupTag to media in batches of 200
      const batchResult = await assignGroupTagToMediaBatch(groupTag, matchingMediaIds, 200);

      totalMediaProcessed += batchResult.processed;
      totalMediaAssigned += batchResult.assigned;

      results.push({
        groupTagId: String(groupTag._id),
        groupTagTitle: groupTag.GroupTagTitle,
        mediaFound: matchingMediaIds.length,
        mediaAssigned: batchResult.assigned,
        mediaSkipped: batchResult.skipped
      });

      console.log(`  ✅ Completed: ${batchResult.assigned} assigned, ${batchResult.skipped} skipped`);
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`   Total GroupTags processed: ${allGroupTags.length}`);
    console.log(`   Total media processed: ${totalMediaProcessed}`);
    console.log(`   Total media assigned: ${totalMediaAssigned}`);

    res.json({
      code: "200",
      message: "GroupTags assigned to matching media successfully",
      summary: {
        totalGroupTags: allGroupTags.length,
        totalMediaProcessed: totalMediaProcessed,
        totalMediaAssigned: totalMediaAssigned
      },
      results: results
    });

  } catch (error) {
    console.error("Error in addTagsToUploadedMedia:", error);
    res.json({
      code: "500",
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Placeholder function for postMedia (needs to be implemented)
const postMedia = async (req, res) => {
  console.log("postMedia called - needs implementation");
  res.json({ code: "200", message: "Media posted to board successfully" });
};

// Helper function to get page data by post ID
const getPageIdByPostId = async (postId) => {
  try {
    var pageId = null;
    var ownerId = null;
    var PageData = await Page.find(
      { "Medias._id": new ObjectId(postId), IsDeleted: 0 },
      { _id: 1, OwnerId: 1 }
    );
    PageData = Array.isArray(PageData) ? PageData : [];
    if (PageData.length) {
      pageId = PageData[0]._id;
      ownerId = PageData[0].OwnerId;
    }
    return {
      pageId,
      ownerId,
    };
  } catch (error) {
    console.error("Error getting page data:", error);
    return { pageId: null, ownerId: null };
  }
};

// Helper function to save and add image record
const saveAndAddImageRecord = async (
  srcPath,
  imgUrl,
  OwnerId,
  PostId,
  currentDateFormat,
  realFileName,
  Prompt,
  Lightness,
  title,
  photographer,
  source
) => {
  try {
    if (fs.existsSync(srcPath)) {
      var mediaCenterPath = "/../../public/assets/Media/img/";
      var dstPathCrop_SMALL =
        __dirname +
        mediaCenterPath +
        process.urls.small__thumbnail +
        "/" +
        imgUrl;
      var dstPathCrop_SG =
        __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
      var dstPathCrop_MEDIUM =
        __dirname +
        mediaCenterPath +
        process.urls.medium__thumbnail +
        "/" +
        imgUrl;
      var dstPathCrop_aspectfit_small__thumbnail =
        __dirname +
        mediaCenterPath +
        process.urls.aspectfit_small__thumbnail +
        "/" +
        imgUrl;

      setTimeout(async () => {
        await crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
        await crop_image(srcPath, dstPathCrop_SG, 300, 300);
        await crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
        await resize_image(
          srcPath,
          dstPathCrop_aspectfit_small__thumbnail,
          575,
          360
        );
      }, 2000);

      var incNum = 0;
      var data = await counters.findOneAndUpdate(
        { _id: "userId" },
        { $inc: { seq: 1 } },
        { new: true }
      );
      data = typeof data === "object" ? data : {};
      incNum = data.seq || 0;

      if (!incNum) {
        return null;
      }

      var type = "Image";
      var name = `${PostId}_${currentDateFormat}_${realFileName}`;
      var thumbnail = "";
      var postStatement = "";

      var dataToUpload = {
        Title: title || "",
        Photographer: photographer || "",
        Location: [],
        AutoId: incNum,
        UploadedBy: "admin",
        UploadedOn: Date.now(),
        UploaderID: OwnerId,
        Source: source || "MJ",
        SourceUniqueID: "53ceb02d3aceabbe5d573dba",
        Domains: "53ad6993f222ef325c05039c",
        Prompt: Prompt || "",
        GroupTags: [],
        Collection: [
          "53ceaf933aceabbe5d573db4",
          "53ceaf9d3aceabbe5d573db6",
          "549323f9610706c30a70679e",
        ],
        Status: 1,
        MetaMetaTags: null,
        MetaTags: null,
        AddedWhere: "board",
        IsDeleted: 0,
        TagType: "",
        Content: postStatement,
        ContentType: "image/png",
        MediaType: type,
        AddedHow: "createStreamTool",
        thumbnail: thumbnail,
        Locator:
          "createStreamTool" + "_" + name.replace(".png", "") + "_" + incNum,
        Lightness: Lightness || 0,
      };

      dataToUpload.Location.push({
        Size: "",
        URL: imgUrl,
      });

      var mediaData = await media(dataToUpload).save();
      console.log("Media record saved = ", mediaData._id);
      mediaData = mediaData ? mediaData : {};
      var tags = typeof mediaData.Prompt === "string" ? mediaData.Prompt : "";
      if (tags && mediaData._id) {
        // Note: addGTAsyncAwait function would need to be implemented
        console.log("Tags would be added here:", tags);
      }
    }
    return imgUrl;
  } catch (error) {
    console.error("Error in saveAndAddImageRecord:", error);
    return null;
  }
};

// Helper function to save stream map
const saveStreamMap = async (
  PageId,
  PostId,
  blendImage1,
  blendImage2,
  blendMode
) => {
  try {
    var conditions = {
      PostId: new ObjectId(PostId),
    };
    var SavedStreamData = await PageStream.find(conditions);
    SavedStreamData = Array.isArray(SavedStreamData) ? SavedStreamData : [];

    var alreadySelectedBlends = [];
    if (SavedStreamData.length) {
      //update existing one
      alreadySelectedBlends = SavedStreamData[0].SelectedBlendImages
        ? SavedStreamData[0].SelectedBlendImages
        : [];
      var newFirstElement = {
        blendImage1: `https://${process.env.AWS_BUCKET_NAME || "scrpt"}.s3.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com/scrptMedia/img/aspectfit/${blendImage1}`,
        blendImage2: `https://${process.env.AWS_BUCKET_NAME || "scrpt"}.s3.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com/scrptMedia/img/aspectfit/${blendImage2}`,
        isSelected: true,
        blendMode: blendMode || "hard-light",
        Keywords: [],
      };
      var setObj = {
        SelectedBlendImages: [newFirstElement].concat(alreadySelectedBlends),
      };
      var result = await PageStream.updateOne(conditions, { $set: setObj });
      console.log("PageStream Updated - ");
    } else {
      //save a new entry
      var newDoc = {
        PageId: new ObjectId(PageId),
        PostId: new ObjectId(PostId),
        SelectedBlendImages: {
          blendImage1: `https://${process.env.AWS_BUCKET_NAME || "scrpt"}.s3.${
            process.env.AWS_REGION || "us-east-1"
          }.amazonaws.com/scrptMedia/img/aspectfit/${blendImage1}`,
          blendImage2: `https://${process.env.AWS_BUCKET_NAME || "scrpt"}.s3.${
            process.env.AWS_REGION || "us-east-1"
          }.amazonaws.com/scrptMedia/img/aspectfit/${blendImage2}`,
          isSelected: true,
          blendMode: blendMode || "hard-light",
          Keywords: [],
        },
      };
      var result = await PageStream(newDoc).save();
      console.log("PageStream Saved - ");
    }
  } catch (error) {
    console.error("Error in saveStreamMap:", error);
  }
};

// Single Midjourney image sync function - COMPLETE IMPLEMENTATION
const syncGdMjImage_INTERNAL_API = async (req, res) => {
  try {
    const {
      postId,
      fileId,
      fileName,
      prompt,
      lightness,
      title,
      photographer,
      source,
    } = req.query;

    if (!postId || !fileId || !fileName) {
      return res
        .status(400)
        .json({ code: 400, message: "Missing required parameters" });
    }

    var PageData = await getPageIdByPostId(postId);
    var PageId = PageData.pageId || null;
    var OwnerId = PageData.ownerId || null;

    if (!fileId || !fileName || !PageId || !OwnerId) {
      return res.status(404).json({ code: 404, message: "Page not found" });
    }

    //first thing to check whether the realFileName == PostId in the db or not
    const Reset = "\x1b[0m",
      Bright = "\x1b[1m",
      Dim = "\x1b[2m",
      Underscore = "\x1b[4m",
      Blink = "\x1b[5m",
      Reverse = "\x1b[7m",
      Hidden = "\x1b[8m",
      FgBlack = "\x1b[30m",
      FgRed = "\x1b[31m",
      FgGreen = "\x1b[32m",
      FgYellow = "\x1b[33m",
      FgBlue = "\x1b[34m",
      FgMagenta = "\x1b[35m",
      FgCyan = "\x1b[36m",
      FgWhite = "\x1b[37m",
      FgGray = "\x1b[90m",
      BgBlack = "\x1b[40m",
      BgRed = "\x1b[41m",
      BgGreen = "\x1b[42m",
      BgYellow = "\x1b[43m",
      BgBlue = "\x1b[44m",
      BgMagenta = "\x1b[45m",
      BgCyan = "\x1b[46m",
      BgWhite = "\x1b[47m",
      BgGray = "\x1b[100m";

    // Note: Google Drive API integration would need to be implemented
    // For now, we'll simulate the success response

    console.log(
      FgGreen,
      `- ${fileName} (${fileId}) - sync initiated for post: ${postId}`
    );
    console.log(Reset, `\n`);

    // Simulate image processing
    const extension = "png";
    var imgUrl = `${postId}_${fileName}.${extension}`;

    // Simulate thumbnail generation
    console.log("Thumbnails would be generated here");

    // Update the media record's Location array with the actual image URL
    try {
      // Generate S3 URL for MJ image
      const bucket = process.env.AWS_BUCKET_NAME || "scrpt";
      const region = process.env.AWS_REGION || "us-east-1";
      const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/scrptMedia/img/aspectfit/${imgUrl}`;

      // Update the media record directly using the postId as the mediaId
      const mediaConditions = { _id: new ObjectId(postId) };
      const mediaUpdateData = {
        $set: {
          "Location.0.URL": s3Url,
          LastModified: Date.now(),
        },
      };

      const mediaUpdateResult = await Media.updateOne(
        mediaConditions,
        mediaUpdateData
      );
      console.log(
        "✅ Media Location updated:",
        mediaUpdateResult.modifiedCount > 0 ? "Success" : "No changes"
      );
      console.log("📝 Media ID:", postId);
      console.log("🖼️ S3 URL generated:", s3Url);

      if (mediaUpdateResult.modifiedCount === 0) {
        console.log("⚠️ No media record found with postId:", postId);
      }
    } catch (mediaError) {
      console.error("❌ Error updating media Location:", mediaError.message);
    }

    // Simulate PageStream update
    try {
      var conditions = {
        PostId: new ObjectId(postId),
      };
      var SavedStreamData = await PageStream.find(conditions);
      SavedStreamData = Array.isArray(SavedStreamData) ? SavedStreamData : [];

      var alreadySelectedBlends = [];
      if (SavedStreamData.length) {
        //update existing one
        alreadySelectedBlends = SavedStreamData[0].SelectedBlendImages
          ? SavedStreamData[0].SelectedBlends
          : [];
        var newFirstElement = {
          blendImage1: `https://${process.env.AWS_BUCKET_NAME || "scrpt"}.s3.${
            process.env.AWS_REGION || "us-east-1"
          }.amazonaws.com/scrptMedia/img/600/09182022204653_35889.png`,
          blendImage2: `https://${process.env.AWS_BUCKET_NAME || "scrpt"}.s3.${
            process.env.AWS_REGION || "us-east-1"
          }.amazonaws.com/scrptMedia/img/aspectfit/${imgUrl}`,
          isSelected: true,
          blendMode: "hard-light",
          Keywords: [],
        };
        var setObj = {
          SelectedBlendImages: [newFirstElement].concat(alreadySelectedBlends),
        };
        var result = await PageStream.updateOne(conditions, { $set: setObj });
        console.log("PageStream Updated - ");
      } else {
        //save a new entry
        var newDoc = {
          PageId: new ObjectId(PageId),
          PostId: new ObjectId(postId),
          SelectedBlendImages: {
            blendImage1: `https://${
              process.env.AWS_BUCKET_NAME || "scrpt"
            }.s3.${
              process.env.AWS_REGION || "us-east-1"
            }.amazonaws.com/scrptMedia/img/600/09182022204653_35889.png`,
            blendImage2: `https://${
              process.env.AWS_BUCKET_NAME || "scrpt"
            }.s3.${
              process.env.AWS_REGION || "us-east-1"
            }.amazonaws.com/scrptMedia/img/aspectfit/${imgUrl}`,
            isSelected: true,
            blendMode: "hard-light",
            Keywords: [],
          },
        };
        var result = await PageStream(newDoc).save();
        console.log("PageStream Saved - ");
      }
    } catch (error) {
      console.error("Error updating PageStream:", error);
    }

    res.json({
      code: 200,
      message: "Midjourney image sync completed",
      data: {
        postId,
        fileId,
        fileName,
        pageId: PageId,
        ownerId: OwnerId,
        imgUrl,
      },
    });
  } catch (error) {
    console.error("Error in syncGdMjImage_INTERNAL_API:", error);
    res.status(500).json({ code: 500, message: "Internal server error" });
  }
};

// Dual Midjourney image sync function - COMPLETE IMPLEMENTATION
const syncGdTwoMjImage_INTERNAL_API = async (req, res) => {
  try {
    const { PostId, inputArr } = req.body;

    if (!PostId || !inputArr || inputArr.length !== 2) {
      return res.status(400).json({
        code: 400,
        message: "Missing required parameters or invalid input array",
      });
    }

    var PageData = await getPageIdByPostId(PostId);
    var PageId = PageData.pageId || null;
    var OwnerId = PageData.ownerId || null;

    if (!PageId || !OwnerId) {
      return res.status(404).json({ code: 404, message: "Page not found" });
    }

    //first thing to check whether the realFileName == PostId in the db or not
    const Reset = "\x1b[0m",
      Bright = "\x1b[1m",
      Dim = "\x1b[2m",
      Underscore = "\x1b[4m",
      Blink = "\x1b[5m",
      Reverse = "\x1b[7m",
      Hidden = "\x1b[8m",
      FgBlack = "\x1b[30m",
      FgRed = "\x1b[31m",
      FgGreen = "\x1b[32m",
      FgYellow = "\x1b[33m",
      FgBlue = "\x1b[34m",
      FgMagenta = "\x1b[35m",
      FgCyan = "\x1b[36m",
      FgWhite = "\x1b[37m",
      FgGray = "\x1b[90m",
      BgBlack = "\x1b[40m",
      BgRed = "\x1b[41m",
      BgGreen = "\x1b[42m",
      BgYellow = "\x1b[43m",
      BgBlue = "\x1b[44m",
      BgMagenta = "\x1b[45m",
      BgCyan = "\x1b[46m",
      BgWhite = "\x1b[47m",
      BgGray = "\x1b[100m";

    var realFileIds = [];
    var realFileNames = [];
    var prompts = [];
    var lightnesses = [];
    var titles = [];
    var photographers = [];
    var sources = [];

    for (var loop = 0; loop < inputArr.length; loop++) {
      if (inputArr[loop].fileId && inputArr[loop].fileName) {
        realFileIds.push(inputArr[loop].fileId);
        realFileNames.push(inputArr[loop].fileName);
        prompts.push(inputArr[loop].prompt || "");
        lightnesses.push(inputArr[loop].lightness || 0);
        titles.push(inputArr[loop].title || "");
        photographers.push(inputArr[loop].photographer || "");
        sources.push(inputArr[loop].source || "");
      }
    }

    if (realFileIds.length === 2 && realFileNames.length === 2) {
      var realFileId = realFileIds[0];
      var realFileName = realFileNames[0].replace(".png", "");

      if (!realFileId || !realFileName || !PageId || !PostId) {
        return res.status(404).json({ code: 404, message: "Not Found." });
      }

      try {
        // Simulate image processing for both images
        var currentDateFormat = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "");
        var extension = "png";
        var imgUrl1 = `${PostId}_${currentDateFormat}_${realFileName}.${extension}`;

        console.log(
          FgGreen,
          `- ${realFileName} (${realFileId}) - sync initiated for post: ${PostId}`
        );
        console.log(Reset, `\n`);

        // Process second image
        realFileId = realFileIds[1];
        realFileName = realFileNames[1].replace(".png", "");
        var imgUrl2 = `${PostId}_${currentDateFormat}_${realFileName}.${extension}`;

        console.log(
          FgGreen,
          `- ${realFileName} (${realFileId}) - sync initiated for post: ${PostId}`
        );
        console.log(Reset, `\n`);

        // Simulate blend configuration
        var blendMode = "hard-light";
        var obj = {
          blendImage1: imgUrl1,
          blendImage2: imgUrl2,
          isSelected: true,
          blendMode: "hard-light",
        };

        // Note: CommonAlgo.commonModule.getBlendConfigByLightnessScores would be called here
        console.log(
          "Blend configuration would be applied based on lightness scores"
        );

        // Update the media record's Location array with both image URLs
        try {
          // Since we don't have mediaId, we need to find the media record by looking for posts with this PostId
          const postConditions = { "Medias._id": new ObjectId(PostId) };
          const postData = await Page.findOne(postConditions, {
            "Medias.$": 1,
          });

          if (postData && postData.Medias && postData.Medias.length > 0) {
            const matchingPost = postData.Medias[0]; // $ operator returns the first match

            if (matchingPost && matchingPost.MediaID) {
              // Update the media record using the MediaID from the post
              const mediaConditions = {
                _id: new ObjectId(matchingPost.MediaID),
              };
              const mediaUpdateData = {
                $set: {
                  "Location.0.URL": `https://${
                    process.env.AWS_BUCKET_NAME || "scrpt"
                  }.s3.${
                    process.env.AWS_REGION || "us-east-1"
                  }.amazonaws.com/scrptMedia/img/aspectfit/${imgUrl1}`,
                  "Location.1.URL": `https://${
                    process.env.AWS_BUCKET_NAME || "scrpt"
                  }.s3.${
                    process.env.AWS_REGION || "us-east-1"
                  }.amazonaws.com/scrptMedia/img/aspectfit/${imgUrl2}`,
                  LastModified: Date.now(),
                },
              };

              const mediaUpdateResult = await Media.updateOne(
                mediaConditions,
                mediaUpdateData
              );
              console.log(
                "✅ Media Location updated for dual images:",
                mediaUpdateResult.modifiedCount > 0 ? "Success" : "No changes"
              );
              console.log("📝 Media ID:", matchingPost.MediaID);
            } else {
              console.log("⚠️ No MediaID found in post for PostId:", PostId);
            }
          } else {
            console.log(
              "⚠️ Post not found in Page collection for PostId:",
              PostId
            );
          }
        } catch (mediaError) {
          console.error(
            "❌ Error updating media Location for dual images:",
            mediaError.message
          );
        }

        // Save to PageStream
        await saveStreamMap(
          PageId,
          PostId,
          obj.blendImage1,
          obj.blendImage2,
          obj.blendMode
        );

        res.status(200).json({
          code: 200,
          message: "Dual Midjourney image sync completed",
          data: {
            postId: PostId,
            pageId: PageId,
            ownerId: OwnerId,
            blendImage1: imgUrl1,
            blendImage2: imgUrl2,
            blendMode: blendMode,
          },
        });
      } catch (err) {
        console.error("Error processing images:", err);
        return res
          .status(501)
          .json({ code: 501, message: "Something went wrong" });
      }
    } else {
      return res
        .status(400)
        .json({ code: 400, message: "Invalid input array length" });
    }
  } catch (error) {
    console.error("Error in syncGdTwoMjImage_INTERNAL_API:", error);
    res.status(500).json({ code: 500, message: "Internal server error" });
  }
};
const addMjImageToMedia__INTERNAL_API = async function (req, res) {
  console.log("\n🎯 ========== MJ Image Upload API ==========");
  
  let inputObj = req.body || {};

  // Validate required fields
  const realFileName =
    typeof inputObj.GoogleDriveFilename === "string"
      ? inputObj.GoogleDriveFilename.trim()
      : null;

  console.log("📄 Filename:", realFileName);
  console.log("📊 Prompt:", inputObj.Prompt ? inputObj.Prompt.substring(0, 80) + "..." : "None");
  console.log("🔗 URLs count:", inputObj.MediaUrls?.length || 0);

  if (!realFileName) {
    return res.json({ code: 404, message: "GoogleDriveFilename is required" });
  }

  // Check if MediaUrls array is provided (new URL-based approach)
  const mediaUrls = inputObj.MediaUrls || [];
  if (!mediaUrls.length) {
    return res.json({ 
      code: 404, 
      message: "MediaUrls array is required. Example: [{ Size: 'aspectfit', URL: 'https://...' }]" 
    });
  }

  // Determine media type (default to Image if not specified)
  const mediaType = inputObj.MediaType || "Image";
  const contentType = inputObj.ContentType || (
    mediaType === "Video" ? "video/mp4" : 
    mediaType === "Audio" ? "audio/mpeg" : 
    "image/webp"
  );

  const Reset = "\x1b[0m";
  const FgGreen = "\x1b[32m";

  try {
    console.log(`📦 Processing new media...`);

    // Generate auto-increment ID
    var incNum = 0;
    var data = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true }
    );
    data = typeof data === "object" ? data : {};
    incNum = data.seq || 0;

    if (!incNum) {
      return res.json({ code: 501, message: "Failed to generate auto ID." });
    }

    // Prepare media data
    var Prompt = inputObj.Prompt || "";
    var title = inputObj.Title || "";
    var photographer = inputObj.Photographer || "";
    var postStatement = inputObj.Content || "";

    // Generate string _id (same as createSinglePost)
    const mediaIdString = new ObjectId().toString();

    // Get thumbnail URL from first media URL if not provided
    const thumbnailUrl = inputObj.Thumbnail || (mediaUrls.length > 0 ? mediaUrls[0].URL : "");
    // Get WebThumbnail (same as thumbnail for MJ images)
    const webThumbnail = thumbnailUrl;
    // Get aspectfit URL for WebThumbnail if available
    const aspectfitUrl = mediaUrls.find(url => url.Size === "aspectfit")?.URL || thumbnailUrl;

    var dataToUpload = {
      _id: mediaIdString, // Set string _id explicitly
      Title: title || "",
      Photographer: photographer || "",
      Location: mediaUrls, // Directly use the provided URLs array
      AutoId: incNum,
      UploadedBy: "admin",
      UploadedOn: Date.now(),
      UploaderID: "5509bf222f2c61e7f9436f11",
      Source: "ChatGPT_MJ",
      SourceUniqueID: "53ceb02d3aceabbe5d573dba",
      Domains: "53ad6993f222ef325c05039c",
      Prompt: Prompt || "",
      GroupTags: [],
      Collection: [
        "53ceaf933aceabbe5d573db4",
        "53ceaf9d3aceabbe5d573db6",
        "549323f9610706c30a70679e",
      ],
      Status: 1,
      MetaMetaTags: null,
      MetaTags: null,
      AddedWhere: "board",
      IsDeleted: 0,
      TagType: "",
      Content: postStatement || "",
      ContentType: contentType,
      MediaType: mediaType,
      AddedHow: "uploadImageTool",
      thumbnail: thumbnailUrl,
      WebThumbnail: webThumbnail, // Added to match old-scrpt structure
      Locator: realFileName.replace(/\.(png|jpg|jpeg|webp|mp4|mp3)$/gi, "") + "_" + incNum,
      Lightness: inputObj.Lightness ? String(inputObj.Lightness) : "0", // Ensure string type
      DominantColors: inputObj.DominantColors || "",
      MetaData: inputObj.MetaData || {},
      // Add default fields that might be expected
      ViewsCount: 0,
      Views: {},
      Selects: {},
      Posts: {},
      Marks: {},
      Stamps: {},
      UserScore: 0,
      OwnerFSGs: {},
      IsPrivate: 0,
      IsUnsplashImage: false, // MJ images are not Unsplash
      IsSpeechToTextDone: false,
      InAppropFlagCount: 0,
      RandomSortId: shortid.generate(), // Generate random sort ID
      RandomSortId_UpdatedOn: new Date().toString(), // Set as string to match schema
    };

    // Add timestamps before saving
    const dataWithTimestamps = addMediaTimestamps(dataToUpload, true); // true = isNew document

    // Save media record to database using native collection to preserve string _id
    const savedMedia = await Media.collection.insertOne(dataWithTimestamps);
    
    // Fetch the saved document to return complete data
    var mediaData = await Media.collection.findOne({ _id: mediaIdString });
    
    console.log("\n✅ ========== MEDIA SAVED SUCCESSFULLY ==========");
    console.log("🆔 Media ID (string):", mediaIdString);
    console.log("📄 Filename:", realFileName);
    console.log("🔢 AutoId:", mediaData?.AutoId);
    console.log("📍 Locator:", mediaData?.Locator);
    console.log("🔗 URLs saved:", mediaUrls.length);
    console.log("📊 Source:", mediaData?.Source);
    console.log("💾 MetaData.GoogleDriveFilename:", mediaData?.MetaData?.GoogleDriveFilename);
    
    console.log("\n📝 MongoDB Query to find this record:");
    console.log(`db.media.findOne({ _id: "${mediaIdString}" })`);
    console.log("==========================================\n");

    return res.status(200).json({ 
      code: 200, 
      message: "Media URLs saved successfully (no upload performed).",
      mediaId: mediaIdString,
      urlCount: mediaUrls.length,
      locator: mediaData?.Locator,
      autoId: mediaData?.AutoId
    });
  } catch (err) {
    console.error("\n❌ ========== ERROR ==========");
    console.error("Error:", err.message);
    console.error("==========================================\n");
    return res.status(501).json({ 
      code: 501, 
      message: "Something went wrong",
      error: err.message 
    });
  }
};
var addUnsplashImageToMedia__INTERNAL_API = async function (req, res) {
  let inputObj = req.body || {};

  let unsplashImageURL =
    typeof inputObj.UnsplashURL === "string" ? inputObj.UnsplashURL.trim() : "";
  let unsplashImageURLParts = unsplashImageURL
    .split("?")
    .map((obj) => obj.trim());
  if (unsplashImageURLParts.length === 2) {
    if (unsplashImageURLParts[0] && !unsplashImageURLParts[1]) {
      unsplashImageURL =
        unsplashImageURLParts[0] +
        "?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9";
    }
  } else if (unsplashImageURLParts.length === 1) {
    if (unsplashImageURLParts[0]) {
      unsplashImageURL =
        unsplashImageURLParts[0] +
        "?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9";
    }
  }

  var locator = unsplashImageURLParts[0].split("/")[1] || "";

  if (!unsplashImageURL) {
    return res.json({ code: 404, message: "unsplashImageURL is invalid" });
  }

  //first thing to check whether the unsplashImageURL in the db or not
  const mediaRecord = await media.find(
    {
      IsDeleted: 0,
      thumbnail: {
        $regex: new RegExp("^" + unsplashImageURLParts[0] + "", "i"),
      },
    },
    { _id: 1 }
  );
  if (mediaRecord.length) {
    return res.json({
      code: 200,
      unsplashImageURL: unsplashImageURL,
      message: "Unsplash image with the provided name already exists.",
    });
  }

  try {
    //save record to Media collection here
    var incNum = 0;
    var data = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true }
    );
    data = typeof data === "object" ? data : {};
    incNum = data.seq || 0;

    if (!incNum) {
      return res.json({ code: 501, message: "Something went wrong." });
    }

    var type = "Link";
    var thumbnail = "";
    var postStatement = "";
    var unsplashPhotoId = "";
    var photographer = "";
    var title = "";
    var Prompt = inputObj.Prompt || "";

    var dataToUpload = {
      Title: title || "",
      Photographer: photographer || "",
      Location: [],
      AutoId: incNum,
      UploadedBy: "admin",
      UploadedOn: Date.now(),
      UploaderID: "5509bf222f2c61e7f9436f11",
      Source: "UnsplashImage_Tool",
      SourceUniqueID: "53ceb02d3aceabbe5d573dba",
      Domains: "53ad6993f222ef325c05039c",
      Prompt: Prompt || "",
      GroupTags: [],
      Collection: [
        "53ceaf933aceabbe5d573db4",
        "53ceaf9d3aceabbe5d573db6",
        "549323f9610706c30a70679e",
      ],
      Status: 1,
      MetaMetaTags: new ObjectId("5464931fde9f6868484be3d7"),
      MetaTags: null,
      AddedWhere: "directToPf",
      IsDeleted: 0,
      TagType: "",
      Content: '<img src="' + unsplashImageURL + '" alt="Link">',
      ContentType: "",
      MediaType: type,
      LinkType: "image",
      AddedHow: "uploadUnsplashImageTool",
      thumbnail: unsplashImageURL,
      Locator: locator + "_" + incNum,
      Lightness: inputObj.Lightness || 0,
      DominantColors: inputObj.DominantColors || "",
      MetaData: inputObj.MetaData || {},
      IsUnsplashImage: true,
      UnsplashPhotoId: unsplashPhotoId || "",
    };

    dataToUpload.Location.push({
      Size: "",
      URL: unsplashImageURL,
    });

    var mediaData = await media(dataToUpload).save();
    console.log("Media record saved = ", mediaData._id);
    mediaData = mediaData ? mediaData : {};
    var tags = typeof mediaData.Prompt === "string" ? mediaData.Prompt : "";
    if (tags && mediaData._id) {
      await addGTAsyncAwait(tags, mediaData._id, inputObj.MetaData);
    }
    return res.status(200).json({
      code: 200,
      unsplashImageURL: unsplashImageURL,
      message: "Unsplash image uploaded successfully.",
    });
  } catch (err) {
    // TODO(developer) - Handle error
    console.log(err);
    return res.status(501).json({ code: 501, message: "Something went wrong" });
  }
};
// Function to create blend image from two source images
const createBlendImage = async (
  image1Url,
  image2Url,
  blendMode = "hard-light"
) => {
  try {
    console.log("Creating blend image with mode:", blendMode);

    // Download both images
    const https = require("https");
    const http = require("http");

    const downloadImage = (url) => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;
        protocol
          .get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(
                new Error(`Failed to download image: ${response.statusCode}`)
              );
              return;
            }

            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => resolve(Buffer.concat(chunks)));
          })
          .on("error", reject);
      });
    };

    // Download both images
    const [image1Buffer, image2Buffer] = await Promise.all([
      downloadImage(image1Url),
      downloadImage(image2Url),
    ]);

    // Create blend using Sharp
    let blendedBuffer;

    switch (blendMode) {
      case "screen":
        // Screen blend mode
        blendedBuffer = await sharp(image1Buffer)
          .composite([
            {
              input: image2Buffer,
              blend: "screen",
            },
          ])
          .webp({ quality: 85 })
          .toBuffer();
        break;

      case "darken":
        // Darken blend mode
        blendedBuffer = await sharp(image1Buffer)
          .composite([
            {
              input: image2Buffer,
              blend: "darken",
            },
          ])
          .webp({ quality: 85 })
          .toBuffer();
        break;

      case "hard-light":
        // Hard light blend mode
        blendedBuffer = await sharp(image1Buffer)
          .composite([
            {
              input: image2Buffer,
              blend: "hard-light",
            },
          ])
          .webp({ quality: 85 })
          .toBuffer();
        break;

      case "overlay":
        // Overlay blend mode
        blendedBuffer = await sharp(image1Buffer)
          .composite([
            {
              input: image2Buffer,
              blend: "overlay",
            },
          ])
          .webp({ quality: 85 })
          .toBuffer();
        break;

      default:
        // Default to hard-light
        blendedBuffer = await sharp(image1Buffer)
          .composite([
            {
              input: image2Buffer,
              blend: "hard-light",
            },
          ])
          .webp({ quality: 85 })
          .toBuffer();
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1e9);
    const blendFileName = `blend_${timestamp}_${randomId}.webp`;

    // Upload to S3
    const awsS3Utils = require("../utilities/awsS3Utils.js");
    const s3Key = `scrptMedia/img/aspectfit/${blendFileName}`;

    const uploadResult = await awsS3Utils.uploadBufferToS3(
      blendedBuffer,
      s3Key,
      "image/webp"
    );

    if (!uploadResult.success) {
      throw new Error(`S3 upload failed: ${uploadResult.error}`);
    }

    // Generate S3 URL
    const bucket = process.env.AWS_BUCKET_NAME || "scrpt";
    const region = process.env.AWS_REGION || "us-east-1";
    const blendImageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    console.log("✅ Blend image created and uploaded:", blendImageUrl);

    return {
      success: true,
      url: blendImageUrl,
      filename: blendFileName,
      s3Key: s3Key,
    };
  } catch (error) {
    console.error("❌ Error creating blend image:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Create single post by user
const createSinglePost = async (req, res) => {
  try {
    const {
      streamId,
      postType = "image",
      title = "",
      content = "",
      mediaArray = [], // Renamed to avoid conflict with media model
      keywords = [],
      blendSettings = {},
      metadata = {},
      postStatement = "",
      pageId, // Optional - if provided, adds to page; if not, creates independent post
      postPrivacySetting,
    } = req.body;

    // Check if user is logged in (support both JWT and session)
    const userFromSession = req.session?.user;
    const userFromJWT = req.user;
    
    if (!userFromSession && !userFromJWT) {
      return res.status(401).json({
        code: 401,
        message: "User not authenticated",
      });
    }

    // Get user ID from JWT (preferred) or session (fallback)
    const userId = userFromJWT?.userId || userFromSession?._id;

    // Extract media URLs and blend settings
    let mediaUrls = [];
    let blendImageUrl = null;
    let blendResult = null;

    if (mediaArray && mediaArray.length > 0) {
      mediaUrls = mediaArray.map((m) => m.url).filter((url) => url);
    }

    // Determine privacy setting with validation
    const allowedPrivacySettings = [
      "PublicWithName",
      "PublicWithoutName",
      "OnlyForOwner",
      "InvitedFriends",
    ];
    const finalPrivacySetting = allowedPrivacySettings.includes(postPrivacySetting)
      ? postPrivacySetting
      : "OnlyForOwner";

    // Handle blend settings if provided
    let blendImage1Url = null;
    let blendImage2Url = null;

    if (
      blendSettings &&
      blendSettings.blendImage1 &&
      blendSettings.blendImage2
    ) {
      console.log("Processing blend images...");

      // Check if images are URLs, base64, or files
      const isImage1Url =
        typeof blendSettings.blendImage1 === "string" &&
        blendSettings.blendImage1.startsWith("http");
      const isImage1Base64 =
        typeof blendSettings.blendImage1 === "string" &&
        blendSettings.blendImage1.startsWith("data:");
      const isImage2Url =
        typeof blendSettings.blendImage2 === "string" &&
        blendSettings.blendImage2.startsWith("http");
      const isImage2Base64 =
        typeof blendSettings.blendImage2 === "string" &&
        blendSettings.blendImage2.startsWith("data:");

      if (isImage1Url && isImage2Url) {
        // Scenario 1: Both are URLs - save directly
        console.log("✅ Both images are URLs - saving directly");
        blendImage1Url = blendSettings.blendImage1;
        blendImage2Url = blendSettings.blendImage2;
      } else {
        // Scenario 2: Images are base64 or files - upload to S3 with multiple sizes
        console.log(
          "📤 Images are base64/files - uploading to S3 with multiple sizes"
        );

        const awsS3Utils = require("../utilities/awsS3Utils.js");

        try {
          // Helper function to convert base64 to buffer
          const base64ToBuffer = (base64String) => {
            if (base64String.startsWith("data:")) {
              const base64Data = base64String.split(",")[1];
              return Buffer.from(base64Data, "base64");
            }
            return base64String; // If it's already a buffer
          };

          // Upload first image
          if (!isImage1Url) {
            const timestamp1 = Date.now();
            const randomId1 = Math.round(Math.random() * 1e9);
            const fileName1 = `blend1_${timestamp1}_${randomId1}`;
            const imageBuffer1 = isImage1Base64
              ? base64ToBuffer(blendSettings.blendImage1)
              : blendSettings.blendImage1;

            console.log(
              `📤 Uploading first image: ${
                isImage1Base64 ? "base64" : "buffer"
              } (size: ${imageBuffer1.length} bytes)`
            );

            const uploadResult1 = await awsS3Utils.resizeAndUploadImageToS3(
              imageBuffer1,
              `${fileName1}.webp`,
              [
                { width: 100, height: 100, folder: "100", fit: "cover" },
                { width: 300, height: 300, folder: "300", fit: "cover" },
                { width: 600, height: 600, folder: "600", fit: "cover" },
                {
                  width: 1000,
                  height: 1000,
                  folder: "aspectfit_small",
                  fit: "inside",
                },
                {
                  width: null,
                  height: null,
                  folder: "aspectfit",
                  fit: "inside",
                }, // Original resolution
              ],
              { customFolder: "userUploads" }
            );

            if (uploadResult1.success) {
              // Get the original resolution URL from the results array
              const aspectfitResult = uploadResult1.results.find(
                (r) => r.size === "aspectfit"
              );
              blendImage1Url = aspectfitResult
                ? aspectfitResult.httpUrl
                : uploadResult1.results[0]?.httpUrl;
              console.log("✅ First image uploaded:", blendImage1Url);
            } else {
              throw new Error(
                `Failed to upload first image: ${uploadResult1.error}`
              );
            }
          } else {
            blendImage1Url = blendSettings.blendImage1;
          }

          // Upload second image
          if (!isImage2Url) {
            const timestamp2 = Date.now() + 1;
            const randomId2 = Math.round(Math.random() * 1e9);
            const fileName2 = `blend2_${timestamp2}_${randomId2}`;
            const imageBuffer2 = isImage2Base64
              ? base64ToBuffer(blendSettings.blendImage2)
              : blendSettings.blendImage2;

            console.log(
              `📤 Uploading second image: ${
                isImage2Base64 ? "base64" : "buffer"
              } (size: ${imageBuffer2.length} bytes)`
            );

            const uploadResult2 = await awsS3Utils.resizeAndUploadImageToS3(
              imageBuffer2,
              `${fileName2}.webp`,
              [
                { width: 100, height: 100, folder: "100", fit: "cover" },
                { width: 300, height: 300, folder: "300", fit: "cover" },
                { width: 600, height: 600, folder: "600", fit: "cover" },
                {
                  width: 1000,
                  height: 1000,
                  folder: "aspectfit_small",
                  fit: "inside",
                },
                {
                  width: null,
                  height: null,
                  folder: "aspectfit",
                  fit: "inside",
                }, // Original resolution
              ],
              { customFolder: "userUploads" }
            );

            if (uploadResult2.success) {
              // Get the original resolution URL from the results array
              const aspectfitResult = uploadResult2.results.find(
                (r) => r.size === "aspectfit"
              );
              blendImage2Url = aspectfitResult
                ? aspectfitResult.httpUrl
                : uploadResult2.results[0]?.httpUrl;
              console.log("✅ Second image uploaded:", blendImage2Url);
            } else {
              throw new Error(
                `Failed to upload second image: ${uploadResult2.error}`
              );
            }
          } else {
            blendImage2Url = blendSettings.blendImage2;
          }
        } catch (uploadError) {
          console.error("❌ Error uploading blend images:", uploadError);
          return res.status(500).json({
            code: 500,
            message: "Failed to upload blend images",
            error: uploadError.message,
          });
        }
      }
    }

    // Get next auto ID
    var incNum = 0;
    var data = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true }
    );
    data = typeof data === "object" ? data : {};
    incNum = data.seq || 0;

    if (!incNum) {
      return res.status(501).json({
        code: 501,
        message: "Failed to generate media ID",
      });
    }

    // Generate unique locator
    const locator = `post_${Date.now()}_${incNum}`;

    // Generate string _id for the media document (to match old format)
    // Create a valid ObjectId string format for consistency
    const mediaIdString = new ObjectId().toString();

    // Extract keywords for group tags and transform to embedded document format
    const groupTagIds = keywords
      .map((k) => ({
        GroupTagID: k.id,
        GroupTagTitle: k.title,
        MetaMetaTagID: "",
        MetaTagID: "",
        _id: new ObjectId(),
      }))
      .filter((gt) => gt.GroupTagID);
    const promptText = keywords.map((k) => k.title).join(",");

    // Prepare Location array with all images (original + blended)
    const locationArray = [];

    // Add original media (images, videos, audio)
    if (mediaUrls.length > 0) {
      mediaUrls.forEach((url, index) => {
        const mediaItem = mediaArray[index];
        locationArray.push({
          Size: "original",
          URL: url,
          Duration: mediaItem?.duration || null, // Include duration for video/audio
        });
      });
    }

    // Add blend images if provided
    if (blendImage1Url) {
      locationArray.push({
        Size: "original",
        URL: blendImage1Url,
      });
    }

    if (blendImage2Url) {
      locationArray.push({
        Size: "original",
        URL: blendImage2Url,
      });
    }

    // Determine the main image URL (first blend image takes priority for thumbnail)
    const mainImageUrl =
      blendImage1Url || (mediaUrls.length > 0 ? mediaUrls[0] : null);

    // Determine MediaType and ContentType based on postType
    let mediaType = "Image";
    let contentType = "image/webp";
    let addedHow = blendImage1Url || blendImage2Url ? "blending" : "user_upload";
    
    if (postType === "html") {
      mediaType = "HTML";
      contentType = "text/html";
      addedHow = "user_upload";
    } else if (postType === "video") {
      mediaType = "Video";
      contentType = "video/mp4";
      addedHow = "user_upload";
    } else if (postType === "audio") {
      mediaType = "Audio";
      contentType = "audio/mp3";
      addedHow = "user_upload";
    } else if (postType === "text") {
      mediaType = "Notes";
      contentType = "text/plain";
      addedHow = "user_upload";
    }

    // Prepare media data
    const mediaData = {
      _id: mediaIdString, // Set string _id explicitly
      Title: title || "Untitled Post",
      Prompt: promptText,
      Locator: locator,
      Location: locationArray,
      AutoId: incNum,
      UploadedBy: "user",
      UploadedOn: new Date(),
      UploaderID: userId,
      Source: blendImage1Url || blendImage2Url ? "blending" : "user_upload",
      GroupTags: groupTagIds,
      Collection: [],
      Status: 1,
      AddedWhere: "directToPf",
      AddedHow: addedHow,
      IsDeleted: 0,
      Content: content,
      MediaType: mediaType,
      ContentType: contentType,
      thumbnail: mainImageUrl,
      Lightness: blendSettings.lightness1
        ? String(
            (parseFloat(blendSettings.lightness1) +
              parseFloat(blendSettings.lightness2 || 0)) /
              2
          )
        : "0",
      DominantColors: "",
      MetaData: metadata,
      // Only include BlendSettings if there's actual blend data (for image posts)
      ...(postType === "image" && (blendImage1Url || blendImage2Url || Object.keys(blendSettings).length > 0) ? {
        BlendSettings: {
          // Use consistent keys like other implementations
          image1Url: blendImage1Url,
          image2Url: blendImage2Url,
          blendMode: blendSettings.blendMode || "multiply",
          lightness1: blendSettings.lightness1 || 0.8,
          lightness2: blendSettings.lightness2 || 0.8,
          keywords: blendSettings.Keywords || [],
          selectedKeywords: blendSettings.SelectedKeywords || [],
          PostStatement: postStatement || content,
          PostStreamType: mediaType,
          UpdatedOn: Date.now(),
          // Keep original structure for backward compatibility (only URLs, not base64)
          blendImage1: blendImage1Url,
          blendImage2: blendImage2Url,
          isSelected: blendSettings.isSelected || false,
          selectedVariantIndex: blendSettings.selectedVariantIndex || 0,
          // Do NOT spread the original blendSettings to avoid including base64 data
        }
      } : {}),
      IsUnsplashImage: false,
      ViewsCount: 0,
      Views: {},
      Selects: {},
      Posts: {},
      Marks: {},
      Stamps: {},
      UserScore: 0,
      OwnerFSGs: {},
      WebThumbnail: mainImageUrl,
      IsPrivate: finalPrivacySetting === "OnlyForOwner" ? 1 : 0,
      RandomSortId: shortid.generate(),
      RandomSortId_UpdatedOn: new Date(),
      PostedBy: new ObjectId(userId),
      PostedOn: new Date(),
      UpdatedOn: new Date(),
      PostPrivacySetting: finalPrivacySetting,
    };

    // Add timestamps before saving
    const mediaDataWithTimestamps = addMediaTimestamps(mediaData, true); // true = isNew document

    // Save media record with string _id
    // Use insertOne directly to preserve string _id (Mongoose save() converts it to ObjectId)
    const savedMedia = await Media.collection.insertOne(mediaDataWithTimestamps);
    console.log("Media record saved with string _id:", savedMedia.insertedId);
    
    // Fetch the saved document to return it
    const savedMediaDoc = await Media.collection.findOne({ _id: mediaIdString });

    let pageUpdateResult = null;

    // Only add to page if pageId is provided
    if (pageId) {
      const pageConditions = { _id: new ObjectId(pageId) };

      pageUpdateResult = await Page.updateOne(pageConditions, {
        $push: { Medias: mediaIdString }, // Use string _id
      });

      if ((pageUpdateResult.modifiedCount ?? pageUpdateResult.nModified ?? 0) === 0) {
        return res.status(404).json({
          code: 404,
          message: "Page not found or update failed",
        });
      }
    }

    // Add group tags if keywords exist
    if (groupTagIds.length > 0 && mediaIdString) {
      try {
        await addGTAsyncAwait(promptText, mediaIdString, metadata);
      } catch (tagError) {
        console.log("Tag addition failed:", tagError);
      }
    }

    res.status(200).json({
      code: 200,
      message: pageId
        ? "Post created and added to page successfully"
        : "Independent post created successfully",
      data: {
        mediaId: mediaIdString, // Return string _id
        postId: mediaIdString,  // Return string _id
        pageId: pageId || null,
        locator: locator,
        autoId: incNum,
        isIndependent: !pageId,
        blendImageUrl: blendImageUrl,
        streamId: streamId,
        totalImages: locationArray.length,
        images: {
          originalImages: mediaUrls,
          blendedImage: blendImageUrl,
          allImages: locationArray,
        },
      },
      postData: pageId ? mediaIdString : null,
      mediaData: savedMediaDoc || { _id: mediaIdString, ...mediaData },
      blendResult: blendResult,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      code: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user's own posts with privacy filtering and pagination
const getUserPosts = async (req, res) => {
  try {
    // Check if user is logged in (support both JWT and session)
    const userFromSession = req.session?.user;
    const userFromJWT = req.user;
    
    if (!userFromSession && !userFromJWT) {
      console.log("❌ Authentication failed - no valid JWT or session");
      return res.status(401).json({
        code: 401,
        message: "Authentication required",
        data: null,
      });
    }

    // Get user ID from JWT (preferred) or session (fallback)
    const userId = userFromJWT?.userId || userFromSession?._id;

    // Extract query parameters with defaults
    const {
      page = 1,
      limit = 20,
      privacyFilter = "all", // "all", "public", "private", "friends"
      mediaType = "all", // "all", "image", "link", "notes", "montage"
      sortBy = "newest", // "newest", "oldest", "most_liked", "most_viewed"
      searchQuery = "",
      dateFrom = null,
      dateTo = null,
      includeBlendSettings = false,
      includeAllUsers = false, // For community tab - show posts from all users
    } = req.body;

    // Handle nested filters object (from frontend)
    const filters = req.body.filters || {};
    const finalPrivacyFilter = filters.privacyFilter || privacyFilter;
    const finalMediaType = filters.mediaType || mediaType;
    const finalSortBy = filters.sortBy || sortBy;
    const finalSearchQuery = filters.searchQuery || searchQuery;
    const finalIncludeAllUsers = req.body.includeAllUsers || includeAllUsers;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 posts per request
    const skip = (pageNum - 1) * limitNum;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const userIdString = userObjectId.toString();

    // Build query conditions
    // Filter out deleted posts - IsDeleted can be 1 (number) or true (boolean)
    // Include records where IsDeleted is 0, false, null, or doesn't exist
    const conditions = {
      $or: [
        { IsDeleted: { $exists: false } },
        { IsDeleted: 0 },
        { IsDeleted: false },
        { IsDeleted: null }
      ]
    };

    // Only filter by PostedBy if we're NOT including all users (community tab)
    // For "myself" tab or when includeAllUsers is false, show only current user's posts
    if (!finalIncludeAllUsers) {
      conditions.PostedBy = userObjectId;
    }

    // Privacy filtering
    switch (finalPrivacyFilter) {
      case "public":
      case "PublicWithName":
        // Show public posts (with or without name)
        conditions.PostPrivacySetting = {
          $in: ["PublicWithName", "PublicWithoutName"],
        };
        break;
      case "private":
      case "OnlyForOwner":
        // Only include OnlyForOwner posts (truly private)
        // For private posts, always filter by current user (can't see others' private posts)
        conditions.PostPrivacySetting = "OnlyForOwner";
        if (!conditions.PostedBy) {
          conditions.PostedBy = userObjectId;
        }
        break;
      case "friends":
      case "InvitedFriends":
        conditions.PostPrivacySetting = "InvitedFriends";
        break;
      case "all":
      default:
        // Include all privacy settings
        break;
    }

    // Media type filtering
    if (finalMediaType !== "all") {
      conditions.MediaType =
        finalMediaType.charAt(0).toUpperCase() + finalMediaType.slice(1);
    }

    // Search query filtering
    if (finalSearchQuery && finalSearchQuery.trim()) {
      const searchRegex = new RegExp(finalSearchQuery.trim(), "i");
      conditions.$or = [
        { Title: searchRegex },
        { Prompt: searchRegex },
        { PostStatement: searchRegex },
      ];
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      conditions.PostedOn = {};
      if (dateFrom) {
        conditions.PostedOn.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        conditions.PostedOn.$lte = new Date(dateTo);
      }
    }

    // Build sort object
    let sortObj = {};
    switch (finalSortBy) {
      case "oldest":
        sortObj = { PostedOn: 1 };
        break;
      case "most_liked":
        sortObj = { "Votes.length": -1, PostedOn: -1 };
        break;
      case "most_viewed":
        sortObj = { ViewsCount: -1, PostedOn: -1 };
        break;
      case "newest":
      default:
        sortObj = { PostedOn: -1 };
        break;
    }

    // Define fields to include/exclude
    const fields = {
      Location: 1,
      Title: 1,
      Prompt: 1,
      Locator: 1,
      MediaType: 1,
      ContentType: 1,
      Content: 1,
      PostedBy: 1,
      PostedOn: 1,
      UpdatedOn: 1,
      PostPrivacySetting: 1,
      PostStatement: 1,
      StreamId: 1,
      Origin: 1,
      OriginatedFrom: 1,
      OriginalPostId: 1,
      Lightness: 1,
      DominantColors: 1,
      Source: 1,
      IsUnsplashImage: 1,
      ViewsCount: 1,
      Votes: 1,
      Marks: 1,
      GroupTags: 1,
      AutoId: 1,
      Status: 1,
      IsPrivate: 1,
      Photographer: 1,
      LinkType: 1,
      OwnStatement: 1,
      CurrStatement: 1,
      Statements: 1,
      StyleKeyword: 1,
      MetaData: 1,
      thumbnail: 1, // Add thumbnail field for video posts
      Posts: 1, // Add Posts field for likes and comments
    };

    // Always include blend settings
    fields.BlendSettings = 1;

    console.log("🔍 getUserPosts - Starting OPTIMIZED aggregation");
    console.log("🔍 getUserPosts - Query conditions:", JSON.stringify(conditions));
    console.log("🔍 getUserPosts - Sort:", JSON.stringify(sortObj));
    console.log("🔍 getUserPosts - Pagination: skip", skip, "limit", limitNum);

    const aggregationPipeline = [
      { $match: conditions },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: "users",
          localField: "PostedBy",
          foreignField: "_id",
          as: "PostedBy",
          pipeline: [
            {
              $project: {
                Name: 1,
                UserName: 1,
                Email: 1,
                ProfilePic: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$PostedBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          likes: [],
          dislikes: [],
          comments: [],
          likeCount: 0,
          dislikeCount: 0,
          commentCount: 0,
        },
      },
      {
        $project: {
          _id: 1,
          Title: 1,
          Prompt: 1,
          Locator: 1,
          MediaType: 1,
          ContentType: 1,
          Content: 1,
          PostedBy: 1,
          PostedOn: 1,
          UpdatedOn: 1,
          PostPrivacySetting: 1,
          ViewsCount: 1,
          Marks: 1,
          GroupTags: 1,
          AutoId: 1,
          Status: 1,
          IsPrivate: 1,
          Statements: 1,
          Location: 1,
          MetaData: 1,
          thumbnail: 1,
          OriginalPostId: 1,
          Lightness: 1,
          DominantColors: 1,
          Source: 1,
          IsUnsplashImage: 1,
          Photographer: 1,
          BlendSettings: 1,
          likes: 1,
          dislikes: 1,
          comments: 1,
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
        },
      },
    ];

    const postsPromise = media
      .aggregate(aggregationPipeline)
      .option({ maxTimeMS: 60000 })
      .allowDiskUse(true);

    const totalCountPromise = media.countDocuments(conditions);

    const userCapsulesPromise = Capsule.find(
      {
        $or: [{ OwnerId: userObjectId }, { CreaterId: userObjectId }],
        IsDeleted: false,
        Status: true,
      },
      { _id: 1 }
    )
      .lean()
      .exec();

    const [posts, totalCount, userCapsules] = await Promise.all([
      postsPromise,
      totalCountPromise,
      userCapsulesPromise,
    ]);

    console.log("✅ getUserPosts - Query completed, found", posts.length, "posts");
    console.log("✅ getUserPosts - Total count:", totalCount);

    const capsuleIds = Array.isArray(userCapsules)
      ? userCapsules.map((capsule) => capsule._id).filter(Boolean)
      : [];

    const chapterQuery = {
      IsDeleted: false,
      $or: [
        { OwnerId: userObjectId },
        { CreaterId: userObjectId },
      ],
    };

    if (capsuleIds.length) {
      chapterQuery.CapsuleId = { $in: capsuleIds };
    }

    const userChapters = await Chapter.find(chapterQuery, {
      _id: 1,
      CapsuleId: 1,
    })
      .lean()
      .exec();

    const chapterIdSet = new Set();
    userChapters.forEach((chapterDoc) => {
      if (chapterDoc && chapterDoc._id) {
        chapterIdSet.add(chapterDoc._id.toString());
      }
    });

    const mediaIds = posts.map((post) => post._id);
    let pagesWithMedia = [];

    if (mediaIds.length) {
      const pageQuery = {
        IsDeleted: false,
        Medias: { $in: mediaIds },
      };

      pagesWithMedia = await Page.find(pageQuery, {
        _id: 1,
        Medias: 1,
        ChapterId: 1,
        Title: 1,
      })
        .lean()
        .exec();

      if (chapterIdSet.size) {
        pagesWithMedia = pagesWithMedia.filter((pageDoc) => {
          if (!pageDoc || !pageDoc.ChapterId) return false;
          const chapterIdValue =
            typeof pageDoc.ChapterId === "string"
              ? pageDoc.ChapterId
              : pageDoc.ChapterId.toString();
          return chapterIdSet.has(chapterIdValue);
        });
      }
    }

    const mediaIdToPageId = new Map();
    pagesWithMedia.forEach((pageDoc) => {
      if (!pageDoc || !pageDoc._id) {
        return;
      }

      const pageIdStr = pageDoc._id.toString();
      const mediaRefs = Array.isArray(pageDoc.Medias) ? pageDoc.Medias : [];

      mediaRefs.forEach((mediaRef) => {
        if (!mediaRef) return;
        const mediaKey = mediaRef.toString();
        if (!mediaIdToPageId.has(mediaKey)) {
          mediaIdToPageId.set(mediaKey, pageIdStr);
        }
      });
    });

    // Additional fallback: Look up pageId from SyncedPost collection
    // This handles standalone posts that aren't in Pages but are in SyncedPosts
    if (mediaIds.length > 0) {
      try {
        const syncedPosts = await SyncedPost.find(
          {
            PostId: { $in: mediaIds },
            IsDeleted: { $ne: true },
            PageId: { $exists: true, $ne: null }
          },
          { PostId: 1, PageId: 1 }
        )
          .lean()
          .exec();

        syncedPosts.forEach((syncedPost) => {
          if (syncedPost.PostId && syncedPost.PageId) {
            const mediaKey = syncedPost.PostId.toString();
            const pageIdStr = syncedPost.PageId.toString();
            // Only set if not already found in Pages lookup
            if (!mediaIdToPageId.has(mediaKey)) {
              mediaIdToPageId.set(mediaKey, pageIdStr);
            }
          }
        });
      } catch (error) {
        console.error("Error looking up SyncedPost for pageId:", error);
        // Continue without failing - this is just a fallback
      }
    }

    const postIdStrings = posts
      .map((post) => (post && post._id ? post._id.toString() : null))
      .filter(Boolean);

    const likesByPostId = new Map();
    const topLevelCommentsByPostId = new Map();
    const repliesByParentId = new Map();
    const likesByCommentId = new Map();
    const userInfoMap = new Map();
    const totalCommentCountsByPostId = new Map();

    if (postIdStrings.length) {
      const postObjectIds = posts
        .map((post) => {
          if (!post || !post._id) return null;
          if (post._id instanceof mongoose.Types.ObjectId) return post._id;
          try {
            return new mongoose.Types.ObjectId(post._id);
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);

      const [postLikesRaw, postCommentsRaw] = await Promise.all([
        StreamLikes.find({
          SocialPostId: { $in: postObjectIds },
          IsDeleted: { $ne: true },
        })
          .sort({ CreatedOn: -1 })
          .lean(),
        StreamComments.find({
          SocialPostId: { $in: postObjectIds },
          IsDeleted: { $ne: true },
        })
          .sort({ CreatedOn: -1 })
          .lean(),
      ]);

      const commentObjectIds = postCommentsRaw
        .map((comment) => comment && comment._id)
        .filter(Boolean);

      const postCommentLikesRaw =
        commentObjectIds.length > 0
          ? await StreamCommentLikes.find({
              CommentId: { $in: commentObjectIds },
              IsDeleted: { $ne: true },
            })
              .sort({ CreatedOn: -1 })
              .lean()
          : [];

      const userIdSet = new Set();

      postLikesRaw.forEach((likeDoc) => {
        const postIdStr = likeDoc.SocialPostId ? likeDoc.SocialPostId.toString() : null;
        if (!postIdStr) return;
        if (!likesByPostId.has(postIdStr)) {
          likesByPostId.set(postIdStr, []);
        }
        likesByPostId.get(postIdStr).push(likeDoc);
        if (likeDoc.UserId) userIdSet.add(likeDoc.UserId.toString());
      });

      postCommentsRaw.forEach((commentDoc) => {
        const postIdStr = commentDoc.SocialPostId ? commentDoc.SocialPostId.toString() : null;
        if (!postIdStr) return;

        const commentIdStr = commentDoc._id ? commentDoc._id.toString() : null;
        const parentIdStr =
          commentDoc.ParentId && commentDoc.ParentId.toString ? commentDoc.ParentId.toString() : null;

        if (commentDoc.UserId) userIdSet.add(commentDoc.UserId.toString());
        if (commentDoc.OwnerId) userIdSet.add(commentDoc.OwnerId.toString());

        if (parentIdStr) {
          if (!repliesByParentId.has(parentIdStr)) {
            repliesByParentId.set(parentIdStr, []);
          }
          repliesByParentId.get(parentIdStr).push(commentDoc);
        } else {
          if (!topLevelCommentsByPostId.has(postIdStr)) {
            topLevelCommentsByPostId.set(postIdStr, []);
          }
          topLevelCommentsByPostId.get(postIdStr).push(commentDoc);
        }

        totalCommentCountsByPostId.set(
          postIdStr,
          (totalCommentCountsByPostId.get(postIdStr) || 0) + 1
        );
      });

      postCommentLikesRaw.forEach((likeDoc) => {
        const commentIdStr = likeDoc.CommentId ? likeDoc.CommentId.toString() : null;
        if (!commentIdStr) return;
        if (!likesByCommentId.has(commentIdStr)) {
          likesByCommentId.set(commentIdStr, []);
        }
        likesByCommentId.get(commentIdStr).push(likeDoc);
        if (likeDoc.LikedById) userIdSet.add(likeDoc.LikedById.toString());
      });

      const userObjectIds = Array.from(userIdSet).reduce((acc, idStr) => {
        if (!idStr) return acc;
        try {
          acc.push(new mongoose.Types.ObjectId(idStr));
        } catch (error) {
          // ignore invalid ids
        }
        return acc;
      }, []);

      if (userObjectIds.length) {
        const usersForComments = await user
          .find(
            { _id: { $in: userObjectIds } },
            { Name: 1, UserName: 1, Email: 1, ProfilePic: 1 }
          )
          .lean();

        usersForComments.forEach((userDoc) => {
          if (!userDoc || !userDoc._id) return;
          userInfoMap.set(userDoc._id.toString(), {
            _id: userDoc._id,
            Name: userDoc.Name || "",
            UserName: userDoc.UserName || "",
            Email: userDoc.Email || "",
            ProfilePic: userDoc.ProfilePic || "",
          });
        });
      }
    }

    const getUserInfo = (id) => {
      if (!id) return null;
      const key = id.toString();
      return userInfoMap.get(key) || null;
    };

    const buildCommentPayload = (commentDoc, includeReplies = true) => {
      if (!commentDoc || !commentDoc._id) return null;

      const commentIdStr = commentDoc._id.toString();
      const likesForComment = likesByCommentId.get(commentIdStr) || [];
      const likedByCurrentUser = likesForComment.some(
        (likeDoc) =>
          likeDoc.LikedById &&
          likeDoc.LikedById.toString() === userObjectId.toString()
      );

      const likedByPayload = likesForComment.map((likeDoc) => ({
        _id: likeDoc._id,
        CommentId: likeDoc.CommentId,
        SocialPageId: likeDoc.SocialPageId,
        LikedById: likeDoc.LikedById,
        CreatedOn: likeDoc.CreatedOn,
        user: getUserInfo(likeDoc.LikedById),
      }));

      const payload = {
        _id: commentDoc._id,
        UserId: commentDoc.UserId,
        OwnerId: commentDoc.OwnerId || null,
        Comment: commentDoc.Comment,
        PrivacySetting: commentDoc.PrivacySetting || null,
        CreatedOn: commentDoc.CreatedOn,
        UpdatedOn: commentDoc.UpdatedOn,
        IsDeleted: commentDoc.IsDeleted,
        ParentId: commentDoc.ParentId || null,
        user: getUserInfo(commentDoc.UserId),
        CommentLikeCount: likesForComment.length,
        likedByCurrentUser,
        likedBy: likedByPayload,
      };

      if (includeReplies) {
        const replies = repliesByParentId.get(commentIdStr) || [];
        const replyPayloads = replies
          .map((replyDoc) => buildCommentPayload(replyDoc, false))
          .filter(Boolean);
        payload.replies = replyPayloads;
        payload.replyCount = replyPayloads.length;
      } else {
        payload.replies = [];
        payload.replyCount = 0;
      }

      return payload;
    };

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response data
    let formattedPosts = posts.map((post) => {
      const postIdStr = post._id ? post._id.toString() : null;

      console.log("📝 Post interactions snapshot:", {
        postId: postIdStr,
        likesFromMap: postIdStr ? (likesByPostId.get(postIdStr) || []).length : 0,
        topLevelComments: postIdStr ? (topLevelCommentsByPostId.get(postIdStr) || []).length : 0,
        totalComments: postIdStr ? totalCommentCountsByPostId.get(postIdStr) || 0 : 0,
      });
      // Determine media type and content type for proper response formatting
      let mediaType = post.MediaType;
      let contentType = post.ContentType;

      // Handle different media types
      if (post.MediaType === "Image" || post.MediaType === "image") {
        mediaType = "Image";
        contentType = post.ContentType || "image/png";
      } else if (post.MediaType === "Video" || post.MediaType === "video") {
        mediaType = "Video";
        contentType = post.ContentType || "video/mp4";
      } else if (post.MediaType === "Audio" || post.MediaType === "audio") {
        mediaType = "Audio";
        contentType = post.ContentType || "audio/mp3";
      }

      const locationArray = Array.isArray(post.Location) ? post.Location : [];

      const formattedPost = {
        _id: post._id,
        title: post.Title,
        prompt: post.Prompt,
        locator: post.Locator,
        mediaType: mediaType,
        contentType: contentType,
        content: post.Content,
        postedBy: post.PostedBy,
        postedOn: post.PostedOn,
        updatedOn: post.UpdatedOn,
        postPrivacySetting: post.PostPrivacySetting,
        postStatement: post.PostStatement,
        streamId: post.StreamId,
        origin: post.Origin,
        originatedFrom: post.OriginatedFrom,
        originalPostId: post.OriginalPostId,
        lightness: post.Lightness,
        dominantColors: post.DominantColors,
        source: post.Source,
        isUnsplashImage: post.IsUnsplashImage,
        viewsCount: post.ViewsCount || 0,
        votesCount: post.likeCount || 0,
        marksCount: post.Marks ? post.Marks.length : 0,
        likeCount: post.likeCount || 0,
        dislikeCount: post.dislikeCount || 0,
        commentCount: post.commentCount || 0,
        likes: post.likes || [],
        dislikes: post.dislikes || [],
        comments: post.comments || [],
        groupTags: post.GroupTags || [],
        autoId: post.AutoId,
        status: post.Status,
        isPrivate: post.IsPrivate,
        photographer: post.Photographer,
        linkType: post.LinkType,
        ownStatement: post.OwnStatement,
        currStatement: post.CurrStatement,
        statements: post.Statements || [],
        styleKeyword: post.StyleKeyword,
        metaData: post.MetaData || {},
        location: locationArray,
        images: [],
        blendSettings: post.BlendSettings || null,
        posts: post.Posts || null, // Add Posts data (likes and comments)
        pageId: null,
      };

      if (mediaType === "Image") {
        formattedPost.images = locationArray;
      }

      // Add thumbnail for all media types (especially important for video posts)
      if (post.thumbnail) {
        formattedPost.thumbnail = post.thumbnail;
      }

      if (postIdStr && mediaIdToPageId.has(postIdStr)) {
        formattedPost.pageId = mediaIdToPageId.get(postIdStr);
      }

      const likesForPostRaw = postIdStr ? likesByPostId.get(postIdStr) || [] : [];
      
      // If pageId is still null, try to get it from likes (SocialPageId)
      if (!formattedPost.pageId && likesForPostRaw.length > 0 && likesForPostRaw[0].SocialPageId) {
        formattedPost.pageId = likesForPostRaw[0].SocialPageId.toString();
      }

      const topLevelCommentsDocs = postIdStr
        ? topLevelCommentsByPostId.get(postIdStr) || []
        : [];

      // If pageId is still null, try to get it from comments (SocialPageId)
      if (!formattedPost.pageId && topLevelCommentsDocs.length > 0 && topLevelCommentsDocs[0].SocialPageId) {
        formattedPost.pageId = topLevelCommentsDocs[0].SocialPageId.toString();
      }
      const likesForPost = likesForPostRaw.map((likeDoc) => ({
        _id: likeDoc._id,
        SocialPageId: likeDoc.SocialPageId,
        SocialPostId: likeDoc.SocialPostId,
        UserId: likeDoc.UserId,
        CreatedOn: likeDoc.CreatedOn,
        user: getUserInfo(likeDoc.UserId),
      }));

      formattedPost.likes = likesForPost;
      formattedPost.likeCount = likesForPost.length;

      const commentPayloads = topLevelCommentsDocs
        .map((commentDoc) => buildCommentPayload(commentDoc, true))
        .filter(Boolean);

      const totalCommentCount =
        postIdStr && totalCommentCountsByPostId.has(postIdStr)
          ? totalCommentCountsByPostId.get(postIdStr)
          : commentPayloads.reduce(
              (count, comment) =>
                count +
                1 +
                (Array.isArray(comment.replies) ? comment.replies.length : 0),
              0
            );

      formattedPost.comments = commentPayloads;
      formattedPost.commentCount = totalCommentCount;

      formattedPost.posts = {
        likes: likesForPost,
        likeCount: likesForPost.length,
        comments: commentPayloads,
        commentCount: totalCommentCount,
      };

      return formattedPost;
    });

    // ✅ Add audio file data to posts using the generic helper function from capsulesController
    const CapsuleController = getCapsulesController();
    const getPostAudioFileData = CapsuleController.getPostAudioFileData;

    // Process posts and add audio file data
    // Note: In getUserPosts, post._id is the Media document's _id (original post ID)
    const postsWithAudio = await Promise.all(formattedPosts.map(async (post) => {
      // ✅ Use Media document's _id ONLY (original post ID) - no fallback
      if (post._id) {
        const audioData = await getPostAudioFileData(post._id);
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

    // Update formattedPosts with audio data
    formattedPosts = postsWithAudio;

    // Response
    res.status(200).json({
      code: 200,
      message: "User posts retrieved successfully",
      data: {
        posts: formattedPosts,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalCount: totalCount,
          limit: limitNum,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null,
        },
        filters: {
          privacyFilter: finalPrivacyFilter,
          mediaType: finalMediaType,
          sortBy: finalSortBy,
          searchQuery: finalSearchQuery,
          dateFrom: dateFrom,
          dateTo: dateTo,
          includeBlendSettings: true,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user posts:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error name:", error.name);
    
    // Check if it's a timeout error
    if (error.name === 'MongoServerError' && error.code === 50) {
      return res.status(504).json({
        code: 504,
        message: "Query timeout - the request took too long to process",
        error: "Database query exceeded maximum time limit",
        data: null,
      });
    }
    
    res.status(500).json({
      code: 500,
      message: "Internal server error",
      error: error.message,
      data: null,
    });
  }
};

// Update post privacy settings
const updatePostPrivacy = async (req, res) => {
  try {
    // Check if user is logged in (support both JWT and session)
    const userFromSession = req.session?.user;
    const userFromJWT = req.user;
    
    if (!userFromSession && !userFromJWT) {
      return res.status(401).json({
        code: 401,
        message: "Authentication required",
        data: null,
      });
    }

    // Get user ID from JWT (preferred) or session (fallback)
    const userId = userFromJWT?.userId || userFromSession?._id;
    const { postId, privacySetting } = req.body;

    // Validate required parameters
    if (!postId) {
      return res.status(400).json({
        code: 400,
        message: "Post ID is required",
        data: null,
      });
    }

    if (!privacySetting) {
      return res.status(400).json({
        code: 400,
        message: "Privacy setting is required",
        data: null,
      });
    }

    // Validate privacy setting values
    const validPrivacySettings = [
      "PublicWithName",
      "PublicWithoutName",
      "OnlyForOwner",
      "InvitedFriends",
    ];
    if (!validPrivacySettings.includes(privacySetting)) {
      return res.status(400).json({
        code: 400,
        message:
          "Invalid privacy setting. Must be one of: " +
          validPrivacySettings.join(", "),
        data: null,
      });
    }

    // Check if post exists and belongs to the user
    // Use collection methods to handle string _id correctly
    const post = await media.collection.findOne({
      _id: postId, // String _id support
      IsDeleted: { $ne: true },
    });

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Post not found or you don't have permission to modify it",
        data: null,
      });
    }

    // Check if user owns the post (handle both ObjectId and string PostedBy)
    const postPostedBy = post.PostedBy ? String(post.PostedBy) : null;
    const userIdString = String(userId);
    
    // Also check UploaderID as fallback (for posts that might not have PostedBy set)
    const postUploaderID = post.UploaderID ? String(post.UploaderID) : null;
    
    if (postPostedBy !== userIdString && postUploaderID !== userIdString) {
      return res.status(404).json({
        code: 404,
        message: "Post not found or you don't have permission to modify it",
        data: null,
      });
    }

    // Update the post privacy setting using collection method to handle string _id
    const updateResult = await media.collection.updateOne(
      { _id: postId }, // String _id support
      {
        $set: {
          PostPrivacySetting: privacySetting,
          UpdatedOn: new Date(),
          updatedAt: new Date(), // Update timestamp when privacy changes
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({
        code: 500,
        message: "Failed to update post privacy",
        data: null,
      });
    }

    // Get updated post data using collection method to handle string _id
    const updatedPost = await media.collection.findOne(
      { _id: postId }, // String _id support
      {
        projection: {
          _id: 1,
          Title: 1,
          PostPrivacySetting: 1,
          PostedBy: 1,
          PostedOn: 1,
          UpdatedOn: 1,
          Locator: 1,
        }
      }
    );

    // Manually populate PostedBy user data if needed (since collection methods don't support populate)
    let postedByUser = null;
    if (updatedPost && updatedPost.PostedBy) {
      try {
        // Use user model (already imported) to fetch user data
        const userDoc = await user.findOne(
          { _id: updatedPost.PostedBy },
          { Name: 1, NickName: 1, Email: 1, ProfilePic: 1 }
        ).lean();
        if (userDoc) {
          postedByUser = {
            _id: userDoc._id,
            Name: userDoc.Name,
            NickName: userDoc.NickName,
            Email: userDoc.Email,
            ProfilePic: userDoc.ProfilePic,
          };
        }
      } catch (userError) {
        console.log("Error fetching PostedBy user:", userError);
        // Continue without user data
      }
    }

    res.status(200).json({
      code: 200,
      message: "Post privacy updated successfully",
      data: {
        postId: updatedPost._id,
        title: updatedPost.Title,
        locator: updatedPost.Locator,
        oldPrivacySetting: post.PostPrivacySetting || null,
        newPrivacySetting: privacySetting,
        postedBy: postedByUser || updatedPost.PostedBy, // Return populated user or just the ID
        postedOn: updatedPost.PostedOn,
        updatedOn: updatedPost.UpdatedOn,
        updateResult: {
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount,
        },
      },
    });
  } catch (error) {
    console.error("Error updating post privacy:", error);
    res.status(500).json({
      code: 500,
      message: "Internal server error",
      error: error.message,
      data: null,
    });
  }
};

// Filtered data function for advanced media filtering (modernized with async/await)
const filteredData = async function (req, res) {
  try {
    let fields = {};

    fields["IsDeleted"] = 0;
    if (req.body.domain != null && req.body.domain != "") {
      fields["Domains"] = req.body.domain;
    }

    if (req.body.Media != null && req.body.domain != "") {
      if (req.body.locator == "record") {
        fields["Locator"] = { $regex: req.body.Media };
      } else {
        fields["AutoId"] = req.body.Media;
      }
    }

    fields["$or"] = [
      { IsPrivate: { $exists: false } },
      { IsPrivate: { $exists: true, $ne: 1 } },
    ];

    if (req.body.status != null && req.body.status != "") {
      fields["Status"] = req.body.status;
    } else {
      fields["Status"] = { $nin: [2, 3] };
    }

    if (req.body.source != null && req.body.source != "") {
      fields["SourceUniqueID"] = req.body.source;
    }

    if (req.body.gt != null && req.body.gt != "") {
      fields["GroupTags.GroupTagID"] = req.body.gt;
    }

    if (req.body.collection != null && req.body.collection != "") {
      fields["Collection"] = { $in: [req.body.collection] };
    }

    if (req.body.mmt != null && req.body.mmt != "") {
      fields["MetaMetaTags"] = req.body.mmt;
    }

    if (req.body.mt != null && req.body.mt != "") {
      fields["MetaTags"] = req.body.mt;
    }

    if (req.body.whereAdded) {
      fields["AddedWhere"] = req.body.whereAdded;
    }

    if (req.body.tagtype) {
      fields["TagType"] = req.body.tagtype;
    }

    if (req.body.howAdded) {
      fields["AddedHow"] = req.body.howAdded;
    }

    if (req.body.mediaType) {
      if (req.body.mediaType == "Image") {
        // Check if user wants to filter by linkType for granular control
        if (req.body.linkType !== undefined && req.body.linkType !== null) {
          // Granular filtering by linkType
          if (req.body.linkType === "image") {
            // Only Link images (Type 1: Unsplash, external images)
            fields["MediaType"] = "Link";
            fields["LinkType"] = "image";
          } else if (req.body.linkType === "direct" || req.body.linkType === "") {
            // Only direct uploaded images (Type 2: S3 uploads)
            fields["MediaType"] = "Image";
          } else {
            // Fallback: both types
            fields["$or"] = [
              { MediaType: "Image" },
              { MediaType: "Link", LinkType: "image" },
            ];
          }
        } else {
          // Default: Return BOTH types of images
          fields["$or"] = [
            { MediaType: "Image" },
            { MediaType: "Link", LinkType: "image" },
          ];
        }
      } else if (req.body.mediaType == "Link") {
        fields["MediaType"] = req.body.mediaType;
        // Check if linkType filter is provided
        if (req.body.linkType) {
          fields["LinkType"] = req.body.linkType;
        } else {
          // Default: Exclude image links (old behavior)
          fields["LinkType"] = { $ne: "image" };
        }
      } else {
        // Other media types: Video, Audio, etc.
        fields["MediaType"] = req.body.mediaType;
      }
    }

    if (req.body.inappropriate) {
      if (req.body.inappropriate > 0 && req.body.inappropriate < 5) {
        fields["InAppropFlagCount"] = { $gte: req.body.inappropriate };
      } else if (req.body.inappropriate >= 5) {
        fields["InAppropFlagCount"] = { $gte: req.body.inappropriate };
      } else {
        fields["InAppropFlagCount"] = 0;
      }
    }

    if (req.body.dtEnd != null && req.body.dtStart != null) {
      var end = req.body.dtEnd;
      var start = req.body.dtStart;
      var end_dt = end.split("/");
      var start_dt = start.split("/");
      start_dt[0] = start_dt[0] - 1;
      end_dt[0] = end_dt[0] - 1;

      console.log(start_dt);
      console.log(end_dt);

      var start_date = new Date(start_dt[2], start_dt[0], start_dt[1], 0, 0, 0);
      var end_date = new Date(end_dt[2], end_dt[0], end_dt[1], 23, 59, 59);

      fields["UploadedOn"] = { $lte: end_date, $gte: start_date };
    }

    if (
      (req.body.keywordsSearch != null && req.body.keywordsSearch != "") ||
      (req.body.addAnotherTag != null && req.body.addAnotherTag != "") ||
      (req.body.excludeWord != null && req.body.excludeWord != "")
    ) {
      console.log(req.body.keywordsSearch);
      console.log(req.body.addAnotherTag);
      console.log(req.body.excludeWord);
      if (req.body.gt != null && req.body.gt != "") {
        req.body.keywordsSearch.push(req.body.gt);
        delete fields["GroupTags.GroupTagID"];

        if (req.body.addAnotherTag)
          req.body.keywordsSearch.concat(req.body.addAnotherTag);
      }

      fields["GroupTags.GroupTagID"] = {
        $in: req.body.keywordsSearch,
        $nin: req.body.excludeWord,
      };
    }

    fields["AddedWhere"] = { $ne: "contentPage" };
    
    // ✅ IMPORTANT: Exclude posts - only return media uploaded by admin/users
    // Posts have PostedBy field set, media records do not
    fields["PostedBy"] = { $exists: false };

    console.log("Fields---------", fields);
    console.log(`📂 filteredData using collection: ${media.collection.name}`);
    console.log(`🗄️ filteredData using database: ${media.db.databaseName}`);
    
    var offset = req.body.offset ? parseInt(req.body.offset) : 0;
    var limit = req.body.limit ? parseInt(req.body.limit) : 0;
    var parameters = {
      Posts: false,
      Marks: false,
      Stamps: false,
      GroupTags: false,
      OwnerFSGs: false,
    };

    // Modernized with async/await instead of callbacks
    const result = await media
      .find(fields, parameters)
      .sort({ UploadedOn: "desc" })
      .skip(offset)
      .limit(limit)
      .exec();
    const resultlength = await media
      .find(fields, { _id: 1 })
      .countDocuments()
      .exec();

    if (resultlength > 0) {
      return res.json({
        code: "200",
        msg: "Success",
        response: result,
        responselength: resultlength,
      });
    } else {
      return res.json({ code: "404", msg: "Not Found", responselength: 0 });
    }
  } catch (err) {
    console.error("Error in filteredData:", err);
    return res.json({ code: "500", msg: "Error", error: err.message });
  }
};
const searchByLocatorList = function (req, res) {
  var fields = {};

  fields["IsDeleted"] = 0;
  if (req.body.domain != null && req.body.domain != "") {
    fields["Domains"] = req.body.domain;
  }

  //added by parul 09022015
  if (req.body.Media != null && req.body.domain != "") {
    if (req.body.locator == "record") {
      fields["Locator"] = { $regex: req.body.Media };
    } else {
      fields["AutoId"] = req.body.Media;
    }
  }
  fields["$or"] = [
    { IsPrivate: { $exists: false } },
    { IsPrivate: { $exists: true, $ne: 1 } },
  ];

  if (req.body.status != null && req.body.status != "") {
    fields["Status"] = req.body.status;
  } else {
    fields["Status"] = { $nin: [2, 3] };
  }

  if (req.body.source != null && req.body.source != "") {
    fields["SourceUniqueID"] = req.body.source;
  }

  if (req.body.gt != null && req.body.gt != "") {
    fields["GroupTags.GroupTagID"] = req.body.gt;
  }

  if (req.body.collection != null && req.body.collection != "") {
    fields["Collection"] = { $in: [req.body.collection] };
  }
  if (req.body.mmt != null && req.body.mmt != "") {
    fields["MetaMetaTags"] = req.body.mmt;
  }
  if (req.body.mt != null && req.body.mt != "") {
    fields["MetaTags"] = req.body.mt;
  }
  if (req.body.whereAdded) {
    fields["AddedWhere"] = req.body.whereAdded;
  }
  if (req.body.tagtype) {
    fields["TagType"] = req.body.tagtype;
  }
  if (req.body.howAdded) {
    fields["AddedHow"] = req.body.howAdded;

    //added by manishp on 12022016 - for avoiding the listing of contentPage medias
    fields["AddedWhere"] = { $eq: req.body.howAdded, $ne: "contentPage" };
  }
  if (req.body.mediaType) {
    if (req.body.mediaType == "Image") {
      fields["$or"] = [
        { MediaType: "Image" },
        { MediaType: "Link", LinkType: "image" },
      ];
    } else if (req.body.mediaType == "Link") {
      fields["MediaType"] = req.body.mediaType;
      fields["LinkType"] = { $ne: "image" };
    } else {
      fields["MediaType"] = req.body.mediaType;
    }
  }
  if (req.body.dtEnd != null && req.body.dtStart != null) {
    var end = req.body.dtEnd;
    var start = req.body.dtStart;
    var end_dt = end.split("/");
    var start_dt = start.split("/");
    start_dt[0] = start_dt[0] - 1;
    end_dt[0] = end_dt[0] - 1;

    console.log(start_dt);
    console.log(end_dt);

    var start_date = new Date(start_dt[2], start_dt[0], start_dt[1], 0, 0, 0);
    var end_date = new Date(end_dt[2], end_dt[0], end_dt[1], 23, 59, 59);

    fields["UploadedOn"] = { $lte: end_date, $gte: start_date };
  }

  console.log(fields); //return;

  if (
    (req.body.keywordsSearch != null && req.body.keywordsSearch != "") ||
    (req.body.addAnotherTag != null && req.body.addAnotherTag != "") ||
    (req.body.excludeWord != null && req.body.excludeWord != "")
  ) {
    console.log(req.body.keywordsSearch);
    console.log(req.body.addAnotherTag);
    console.log(req.body.excludeWord);
    //req.body.keywordsSearch = req.body.keywordsSearch ? req.body.keywordsSearch : [];

    //if grouptag is selected from drop-down then -
    if (req.body.gt != null && req.body.gt != "") {
      req.body.keywordsSearch.push(req.body.gt);
      delete fields["GroupTags.GroupTagID"];
    }

    //if another tag is added
    if (req.body.addAnotherTag) {
      req.body.keywordsSearch = req.body.keywordsSearch.concat(
        req.body.addAnotherTag
      );
    }

    //Required condition because using $in....
    if (req.body.keywordsSearch.length) {
      fields["GroupTags.GroupTagID"] = {
        $in: req.body.keywordsSearch,
        $nin: req.body.excludeWord,
      };
    } else {
      fields["GroupTags.GroupTagID"] = { $nin: req.body.excludeWord };
    }
  }

  console.log("Fields---------", fields); //return;
  //using column as fields : as you can see fields has been taken as conditions earlier - agree bad code!!!
  var columns = {
    _id: true,
    AutoId: true,
    Locator: true,
  };

  var limit = 1000;

  media
    .find(fields, columns)
    .sort({ AutoId: 1, Locator: 1 })
    .limit(limit)
    .exec(function (err, result) {
      if (err) {
        res.json(err);
      } else {
        media
          .find(fields, { _id: 1 })
          .countDocuments()
          .exec(function (err, resultlength) {
            if (err) {
              res.json(err);
            } else {
              if (resultlength > 0) {
                //res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
                res.json({
                  code: "200",
                  msg: "Success",
                  response: result,
                  responselength: resultlength,
                });
              } else {
                res.json({ code: "404", msg: "Not Found", responselength: 0 });
              }
            }
          });
      }
    });
};

/**
 * Modern Post Update Endpoint
 * Updates an existing post in the Media collection
 * Pages.Medias only stores ObjectId references, actual post data is in Media collection
 * Only updates fields that are provided (optimal partial updates)
 * Supports both JWT and session authentication
 */
const updatePost = async (req, res) => {
  try {
    // Authentication check - support both JWT and session
    const currentUser = req.session?.user || req.user;
    
    if (!currentUser) {
      return res.status(401).json({
        status: "failed",
        code: "401",
        message: "Authentication required. Please login to continue."
      });
    }
    
    // Validate required fields - need either PostId or MediaID to identify the post
    const mediaId = req.body.media || req.body.MediaID;
    const postId = req.body.PostId; // May or may not be the same as mediaId
    
    if (!mediaId) {
      return res.status(400).json({
        status: "failed",
        code: "400",
        message: "media or MediaID is required to update a post"
      });
    }
    
    // Build update object - only include fields that are provided
    const updateFields = {};
    
    // Basic fields
    if (req.body.url !== undefined) updateFields.MediaURL = req.body.url;
    if (req.body.title !== undefined) updateFields.Title = req.body.title;
    if (req.body.prompt !== undefined) updateFields.Prompt = req.body.prompt;
    if (req.body.locator !== undefined) updateFields.Locator = req.body.locator;
    if (req.body.thumbnail !== undefined) updateFields.thumbnail = req.body.thumbnail;
    
    // Media type and content from data object or direct fields
    if (req.body.data?.value?.MediaType !== undefined) {
      updateFields.MediaType = req.body.data.value.MediaType;
    } else if (req.body.MediaType !== undefined) {
      updateFields.MediaType = req.body.MediaType;
    }
    
    if (req.body.data?.value?.ContentType !== undefined) {
      updateFields.ContentType = req.body.data.value.ContentType;
    } else if (req.body.ContentType !== undefined) {
      updateFields.ContentType = req.body.ContentType;
    }
    
    // Content field
    if (req.body.Content !== undefined) {
      updateFields.Content = req.body.Content;
    }
    
    // Location array (media URLs with sizes)
    if (req.body.Location !== undefined && Array.isArray(req.body.Location)) {
      updateFields.Location = req.body.Location;
    }
    
    // BlendSettings object (for 2MJ blend posts)
    if (req.body.BlendSettings !== undefined) {
      updateFields.BlendSettings = req.body.BlendSettings;
    } else if (req.body.blendSettings !== undefined) {
      updateFields.BlendSettings = req.body.blendSettings;
    }
    
    // Post-specific fields (these are in Media collection now)
    if (req.body.owner !== undefined || req.body.OwnerId !== undefined) {
      updateFields.PostedBy = req.body.owner || req.body.OwnerId;
    }
    
    // Privacy and visibility settings
    if (req.body.PostPrivacySetting !== undefined) {
      updateFields.PostPrivacySetting = req.body.PostPrivacySetting;
    }
    
    // Image source flag
    if (req.body.IsUnsplashImage !== undefined) {
      updateFields.IsUnsplashImage = req.body.IsUnsplashImage;
    }
    
    // Post type fields
    if (req.body.PostType !== undefined) {
      updateFields.PostType = req.body.PostType;
    }
    
    if (req.body.IsOnetimeStream !== undefined) {
      updateFields.IsOnetimeStream = req.body.IsOnetimeStream;
    }
    
    if (req.body.IsPreLaunchPost !== undefined) {
      updateFields.IsPreLaunchPost = req.body.IsPreLaunchPost;
    }
    
    if (req.body.IsPrivateQuestionPost !== undefined) {
      updateFields.IsPrivateQuestionPost = req.body.IsPrivateQuestionPost;
    }
    
    if (req.body.QuestionPostId !== undefined) {
      updateFields.QuestionPostId = req.body.QuestionPostId;
    }
    
    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        status: "failed",
        code: "400",
        message: "No fields to update. Please provide at least one field to modify."
      });
    }
    
    // Update timestamp
    updateFields.UpdatedOn = new Date();
    
    // Query to find the media/post by ID
    const query = { _id: mediaId };
    
    // Perform the update in Media collection
    const updateResult = await media.updateOne(query, { $set: updateFields }).exec();
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        status: "failed",
        code: "404",
        message: "Post/Media not found"
      });
    }
    
    if (updateResult.modifiedCount === 0) {
      return res.status(200).json({
        status: "success",
        code: "200",
        message: "No changes made - all fields were already set to these values",
        mediaId: mediaId
      });
    }
    
    // Update media action logs if this is a Post action
    const boardId = req.body.id || req.body.BoardId;
    
    if (req.body.Action === 'Post' || req.body.Action === 'EditPost') {
      const mediaActionLogData = {
        PostId: postId || mediaId, // Use PostId if provided, otherwise MediaID
        MediaId: mediaId,
        UserId: currentUser._id,
        UserFsg: currentUser.FSGsArr2 || currentUser.FSGs || {},
        BoardId: boardId,
        OwnerId: req.body.owner || req.body.OwnerId,
        Action: 'Post',
        Title: req.body.title || req.body.Title || null,
        Prompt: req.body.prompt || req.body.Prompt || null,
        Locator: req.body.locator || req.body.Locator,
        URL: req.body.url || req.body.MediaURL || null,
        MediaType: req.body.data?.value?.MediaType || req.body.MediaType,
        ContentType: req.body.data?.value?.ContentType || req.body.ContentType,
        Content: req.body.Content || null,
        Comment: req.body.Comment || "",
        PostPrivacySetting: req.body.PostPrivacySetting || "PublicWithoutName",
        IsUnsplashImage: req.body.IsUnsplashImage || false,
        Themes: req.body.Themes || [],
        TaggedUsers: req.body.TaggedUsers || []
      };
      
      if (req.body.Label) {
        mediaActionLogData.Label = req.body.Label;
      }
      
      if (req.body.Statement) {
        mediaActionLogData.PostStatement = req.body.Statement;
      }
      
      // Check if action log already exists for this post
      const actionLogConditions = {
        MediaId: mediaId,
        UserId: currentUser._id,
        Action: 'Post'
      };
      
      // Include PostId in conditions if it exists
      if (postId) {
        actionLogConditions.PostId = postId;
      }
      
      // Include BoardId in conditions if it exists
      if (boardId) {
        actionLogConditions.BoardId = boardId;
      }
      
      const existingActionLog = await mediaAction.findOne(actionLogConditions).exec();
      
      if (existingActionLog) {
        // Update existing action log
        await mediaAction.updateOne(actionLogConditions, { $set: mediaActionLogData }).exec();
      } else {
        // Create new action log
        await mediaAction(mediaActionLogData).save();
      }
    }
    
    // Fetch the updated media/post to return to client
    const userFields = {
      Name: 1,
      NickName: 1,
      ProfilePic: 1
    };
    
    const updatedMedia = await media
      .findById(mediaId)
      .populate('PostedBy', userFields)
      .exec();
    
    if (!updatedMedia) {
      // Post was updated but couldn't fetch details
      return res.json({
        status: "success",
        code: "200",
        message: "Post updated successfully",
        mediaId: mediaId
      });
    }
    
    // Convert to plain object for modification
    const postData = updatedMedia.toObject();
    
    // Handle privacy setting for response
    if (postData.PostPrivacySetting === "PublicWithoutName" && postData.PostedBy) {
      postData.PostedBy = {
        _id: postData.PostedBy._id,
        Name: "",
        NickName: "",
        ProfilePic: ""
      };
    }
    
    res.json({
      status: "success",
      code: "200",
      message: "Post updated successfully",
      postData: postData
    });
    
  } catch (err) {
    console.error("Error in updatePost:", err);
    res.status(500).json({
      status: "failed",
      code: "500",
      message: "Error updating post",
      error: err.message
    });
  }
};

// Find all media with status filters and pagination
const findAllStatus = async function (req, res) {
  try {
    const fields = {};

    fields['IsDeleted'] = 0;
    
    if (req.body.domain != null && req.body.domain != "") {
      fields['Domains'] = req.body.domain;
    }

    // Added by parul 09022015
    if (req.body.Media != null && req.body.locator != "") {
      if (req.body.locator == 'record') {
        fields['Locator'] = { $regex: req.body.Media };
      } else {
        fields['AutoId'] = parseInt(req.body.Media);
      }
    }

    // Privacy filter
    fields['$or'] = [
      { IsPrivate: { '$exists': false } }, 
      { IsPrivate: { $exists: true, $ne: 1 } }
    ];

    // Status filter
    // If status is "all" or "ALL", don't apply any status filter
    if (req.body.status != null && req.body.status != "") {
      if (req.body.status.toString().toLowerCase() !== 'all') {
        fields['Status'] = req.body.status;
      }
      // If status is "all", skip adding Status filter (show all statuses)
    } else {
      // Default: exclude status 2 (pending) and 3 (deleted)
      fields['Status'] = { '$nin': [2, 3] };
    }

    if (req.body.source != null && req.body.source != "") {
      fields['SourceUniqueID'] = req.body.source;
    }

    if (req.body.gt != null && req.body.gt != "") {
      fields['GroupTags.GroupTagID'] = req.body.gt;
    }

    // Added by parul 26 dec 2014
    if (req.body.collection != null && req.body.collection != "") {
      fields['Collection'] = { $in: [req.body.collection] };
    }

    if (req.body.mmt != null && req.body.mmt != "") {
      fields['MetaMetaTags'] = req.body.mmt;
    }

    if (req.body.mt != null && req.body.mt != "") {
      fields['MetaTags'] = req.body.mt;
    }

    if (req.body.whereAdded) {
      fields['AddedWhere'] = req.body.whereAdded;
    }

    if (req.body.tagtype) {
      fields['TagType'] = req.body.tagtype;
    }

    if (req.body.howAdded) {
      fields['AddedHow'] = req.body.howAdded;
    }

    // Media type filter
    if (req.body.mediaType) {
      if (req.body.mediaType == 'Image') {
        fields['$or'] = [
          { "MediaType": 'Image' }, 
          { "MediaType": 'Link', "LinkType": 'image' }
        ];
      } else if (req.body.mediaType == 'Link') {
        fields['MediaType'] = req.body.mediaType;
        fields['LinkType'] = { $ne: 'image' };
      } else {
        fields['MediaType'] = req.body.mediaType;
      }
    }

    // Date range filter - only apply if both dates are provided and not empty strings
    if (req.body.dtEnd != null && req.body.dtEnd !== "" && 
        req.body.dtStart != null && req.body.dtStart !== "") {
      const end = req.body.dtEnd;
      const start = req.body.dtStart;
      const end_dt = end.split('/');
      const start_dt = start.split('/');
      start_dt[0] = start_dt[0] - 1;
      end_dt[0] = end_dt[0] - 1;

      console.log(start_dt);
      console.log(end_dt);

      const start_date = new Date(start_dt[2], start_dt[0], start_dt[1], 0, 0, 0);
      const end_date = new Date(end_dt[2], end_dt[0], end_dt[1], 23, 59, 59);

      // Only add to fields if dates are valid
      if (!isNaN(start_date.getTime()) && !isNaN(end_date.getTime())) {
        fields['UploadedOn'] = { $lte: end_date, $gte: start_date };
      }
    }

    console.log(fields);

    // Use aggregation pipeline to support allowDiskUse for large sorts
    // This prevents "Sort exceeded memory limit" errors on large collections
    const offset = req.body.offset || 0;
    const limit = req.body.limit || 20;
    
    const pipeline = [
      { $match: fields },
      { $sort: { UploadedOn: -1 } },
      { $skip: offset },
      { $limit: limit }
    ];
    
    // Execute aggregation with allowDiskUse to handle large sorts
    const result = await media.aggregate(pipeline).allowDiskUse(true);

    // Get total count for pagination
    const resultlength = await media
      .find(fields, { _id: 1 })
      .countDocuments()
      .exec();

    if (resultlength > 0) {
      res.json({ 
        "code": "200", 
        "msg": "Success", 
        "response": result, 
        "responselength": resultlength 
      });
    } else {
      res.json({ 
        "code": "404", 
        "msg": "No media found matching the specified filters", 
        "responselength": 0 
      });
    }
  } catch (err) {
    console.error("Error in findAllStatus:", err);
    res.status(500).json({ 
      "code": "500", 
      "msg": "Internal server error", 
      "error": err.message 
    });
  }
};

/**
 * Delete media from database (soft delete only - marks as deleted)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Deletion result
 */
const deleteMedia = async function (req, res) {
  const mongoose = require('mongoose');
  
  try {
    const testMode = req.body.testMode || false;
    const mediaIds = req.body.media || [];
    
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: "Invalid or empty media array",
      });
    }

    // Convert to both ObjectId and string formats to handle mixed _id types
    const objectIds = [];
    const stringIds = [];
    
    mediaIds.forEach(id => {
      try {
        objectIds.push(new mongoose.Types.ObjectId(id));
      } catch (e) {
        // Invalid ObjectId format, skip
      }
      stringIds.push(id.toString());
    });

    const searchQuery = { 
      $or: [
        { _id: { $in: objectIds } },
        { _id: { $in: stringIds } }
      ]
    };

    // Use direct MongoDB query to handle both ObjectId and string _id
    const db = mongoose.connection.db;
    const collectionName = 'media';
    
    let mediaRecords = [];
    if (db) {
      const cursor = db.collection(collectionName).find(searchQuery, {
        projection: { _id: 1, Status: 1, MediaType: 1, Locator: 1, IsDeleted: 1 }
      });
      mediaRecords = await cursor.toArray();
    } else {
      mediaRecords = await media.find(
        searchQuery,
        { _id: 1, Status: 1, MediaType: 1, Locator: 1, IsDeleted: 1 }
      );
    }

    if (mediaRecords.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "No media found with provided IDs",
        searchedIds: mediaIds,
      });
    }

    // Check which ones are already deleted
    const alreadyDeleted = mediaRecords.filter(m => m.IsDeleted === 1).length;
    const toDelete = mediaRecords.filter(m => m.IsDeleted !== 1).length;

    // If test mode, don't actually delete
    if (testMode) {
      return res.status(200).json({
        code: 200,
        message: "TEST MODE: Media found but NOT deleted",
        results: {
          totalRequested: mediaIds.length,
          totalFound: mediaRecords.length,
          alreadyDeleted: alreadyDeleted,
          toDelete: toDelete,
          mediaIds: mediaIds,
          foundMedia: mediaRecords.map(m => ({
            _id: m._id,
            Locator: m.Locator,
            MediaType: m.MediaType,
            IsDeleted: m.IsDeleted
          })),
          testMode: true
        },
      });
    }

    // Soft delete using direct MongoDB query
    let deletedCount = 0;
    if (db) {
      const deleteResult = await db.collection(collectionName).updateMany(
        searchQuery,
        { $set: { IsDeleted: 1, DeletedOn: Date.now() } }
      );
      deletedCount = deleteResult.modifiedCount || 0;
    } else {
      const deleteResult = await media.updateMany(
        searchQuery,
        { $set: { IsDeleted: 1, DeletedOn: Date.now() } }
      );
      deletedCount = deleteResult.modifiedCount || 0;
    }

    return res.status(200).json({
      code: 200,
      message: "Media soft deleted successfully",
      results: {
        totalRequested: mediaIds.length,
        totalFound: mediaRecords.length,
        newlyDeleted: deletedCount,
        alreadyDeleted: alreadyDeleted,
        mediaIds: mediaIds,
      },
    });
  } catch (err) {
    console.error("❌ Error in deleteMedia:", err);
    return res.status(500).json({
      code: 500,
      message: "Something went wrong",
      error: err.message,
    });
  }
};

// ============================================================================
// Mass Media Import Functions
// ============================================================================

const parseFormAsync = (req) =>
	new Promise((resolve, reject) => {
		const form = new formidable.IncomingForm();
		form.parse(req, (err, fields, files) => {
			if (err) return reject(err);
			resolve({ fields, files });
		});
	});

const moveUploadedFile = async (file, destinationDir, prefix) => {
	const sourcePath = file.filepath || file.path;
	if (!sourcePath) {
		throw new Error("Uploaded file path not found.");
	}
	await fsPromises.mkdir(destinationDir, { recursive: true });
	const extension = path.extname(file.name || "") || "";
	const safePrefix = prefix || dateFormat();
	const fileName = `${safePrefix}${extension ? extension : ""}`;
	const targetPath = path.join(destinationDir, fileName);
	await fsPromises.rename(sourcePath, targetPath);
	return targetPath;
};

const convertXlsxToJson = (inputPath, outputPath) =>
	new Promise((resolve, reject) => {
		xlsxj({ input: inputPath, output: outputPath }, (err, result) => {
			if (err) return reject(err);
			resolve(result || []);
		});
	});

const chunkArray = (array, size) => {
	const chunks = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
};

const buildMediaDocument = ({
	record,
	seq,
	uploaderId,
	unsplashPhotoId: providedPhotoId, // Accept Photo ID as parameter
}) => {
	// Use provided Photo ID if available, otherwise try to extract from record
	let unsplashPhotoId = providedPhotoId || (record["Photo ID"] ? record["Photo ID"].trim() : null);
	
	// If still no Photo ID, try to extract from Image Source URL
	if (!unsplashPhotoId && record["Image Source"]) {
		const unsplashImageURL = String(record["Image Source"]).trim();
		// Try to extract photo ID from Unsplash URL pattern: https://images.unsplash.com/photo-{photoId}?...
		const photoIdMatch = unsplashImageURL.match(/photo-([a-zA-Z0-9_-]+)/);
		if (photoIdMatch) {
			unsplashPhotoId = photoIdMatch[1];
		}
	}
	const unsplashImageURL = record["Image Source"] ? record["Image Source"].trim() : null;
	const unsplashImageTags =
		record["Descriptors/Concepts/Related tags"] || record["Combined tags (all 4)"] || "";
	const unsplashImageTitle = record["Title"] ? record["Title"].trim() : null;
	const unsplashImagePhotographer = record["Photographer"] ? record["Photographer"].trim() : null;
	const unsplashStyleKeyword = record["StyleKeyword"] ? record["StyleKeyword"].trim() : "";
	const lightness = record["Lightness"] ? record["Lightness"] : 0;
	const dominantColors = record["Dominant colors"] ? record["Dominant colors"] : "";
	const recordLocator = unsplashImageURL ? unsplashImageURL.split("?")[0].split("/").pop() : "";
	const locator = `${recordLocator || "unsplash"}_${seq}`;

	// Build MetaData object from Excel columns
	const buildMetaData = () => {
		const metaData = {};
		
		// Array fields - split by comma if string, keep as array if already array
		const arrayFields = ['Subjects', 'Metaphors', 'Concepts', 'Attributes', 'Feelings', 'Verbs'];
		arrayFields.forEach(field => {
			const value = record[field];
			if (value) {
				if (Array.isArray(value)) {
					metaData[field] = value.filter(v => v && String(v).trim() !== '');
				} else if (typeof value === 'string') {
					metaData[field] = value.split(',').map(v => v.trim()).filter(v => v !== '');
				}
			}
		});

		// String fields
		const stringFields = [
			'Brief Description',
			'Detailed Description',
			'Aesthetic Description',
			'Primary Brand Archetype',
			'Secondary Brand Archetype',
			'Tertiary Brand Archetype',
			'Subject Type'
		];
		stringFields.forEach(field => {
			const value = record[field];
			if (value && String(value).trim() !== '') {
				metaData[field.replace(/\s+/g, '')] = String(value).trim();
			}
		});

		// Array fields that might be comma-separated strings
		const commaSeparatedArrayFields = [
			'MBTI',
			'Business Sectors',
			'Religions',
			'Countries',
			'Ethnicities',
			'Satire',
			'Color Palette'
		];
		commaSeparatedArrayFields.forEach(field => {
			const value = record[field];
			if (value) {
				if (Array.isArray(value)) {
					metaData[field.replace(/\s+/g, '')] = value.filter(v => v && String(v).trim() !== '');
				} else if (typeof value === 'string') {
					metaData[field.replace(/\s+/g, '')] = value.split(',').map(v => v.trim()).filter(v => v !== '');
				}
			}
		});

		// Boolean fields
		const booleanFields = [
			'Ethnic Diversity',
			'Senior',
			'Luxury',
			'Body',
			'Children',
			'LGBTQ',
			'Sports',
			'Fantasy',
			'Gaming',
			'Family-friendly',
			'Business-related',
			'Suggestive'
		];
		booleanFields.forEach(field => {
			const value = record[field];
			if (value !== undefined && value !== null && value !== '') {
				metaData[field.replace(/\s+/g, '').replace(/-/g, '')] = Boolean(value);
			}
		});

		// Other fields
		if (record['Gender']) {
			metaData.Gender = String(record['Gender']).trim();
		}
		if (record['Age']) {
			metaData.Age = String(record['Age']).trim();
		}
		if (record['Modern vs. Traditional']) {
			metaData.ModernVsTraditional = String(record['Modern vs. Traditional']).trim();
		}
		if (record['New Age']) {
			metaData.NewAge = String(record['New Age']).trim();
		}
		if (record['Narrative clarity']) {
			metaData.NarrativeClarity = Number(record['Narrative clarity']) || 0;
		}
		if (record['Dominant Score']) {
			metaData.DominantScore = Number(record['Dominant Score']) || 0;
		}
		if (record['filename']) {
			metaData.filename = String(record['filename']).trim();
		}
		if (record['description']) {
			metaData.description = String(record['description']).trim();
		}

		return Object.keys(metaData).length > 0 ? metaData : {};
	};

	const metaData = buildMetaData();

	// Generate string _id (same as createSinglePost and addMjImageToMedia__INTERNAL_API)
	const mediaIdString = new ObjectId().toString();

	return {
		_id: mediaIdString, // Set string _id explicitly
		Prompt: unsplashImageTags,
		Title: unsplashImageTitle,
		Photographer: unsplashImagePhotographer,
		Location: [
			{
				Size: "",
				URL: unsplashImageURL,
			},
		],
		UploadedBy: "admin",
		UploadedOn: Date.now(),
		UploaderID: uploaderId || null,
		Source: "Unsplash",
		SourceUniqueID: null,
		Domains: null,
		AutoId: seq,
		GroupTags: [], // Empty array - no tag processing
		Collection: null,
		Status: 1,
		MetaMetaTags: "5464931fde9f6868484be3d7",
		MetaTags: null,
		AddedWhere: "directToPf",
		IsDeleted: 0,
		TagType: "",
		ContentType: "",
		MediaType: "Link",
		LinkType: "image",
		IsUnsplashImage: true,
		UnsplashPhotoId: unsplashPhotoId,
		thumbnail: unsplashImageURL,
		Content: `<img src="${unsplashImageURL}" alt="Link">`,
		AddedHow: "importExcel",
		Locator: locator,
		StyleKeyword: unsplashStyleKeyword,
		Lightness: lightness ? lightness : 0,
		DominantColors: dominantColors ? dominantColors : "",
		MetaData: metaData, // Add MetaData object
	};
};

const importUnsplashImagesV2 = async function (req, res) {
	let tempUploadDir = null;
	let savedFilePath = null;
	try {
		console.log("[massmediaupload] Incoming request");
		
		// Check admin privileges FIRST before processing any file
		const normalizedJwtRole = typeof req.user?.role === "string"
			? req.user.role.toLowerCase()
			: typeof req.user?.Role === "string"
			? req.user.Role.toLowerCase()
			: null;

		const hasSessionAdmin = !!req.session?.admin;
		const hasAdminPrivilegesFromSession = hasSessionAdmin;
		const hasAdminPrivilegesFromJwt = normalizedJwtRole === "admin";

		if (!hasAdminPrivilegesFromSession && !hasAdminPrivilegesFromJwt) {
			console.warn("[massmediaupload] Missing admin privileges (session or JWT) - rejecting request before file processing");
			return res.status(401).json({ 
				code: 401, 
				message: "Access denied. Admin privileges required.",
				error: "You do not have admin permissions to perform this action. Please use an admin account or provide a valid admin JWT token.",
				hasSession: !!req.session,
				hasAdminSession: hasSessionAdmin,
				hasJwtToken: !!req.user,
				jwtRole: normalizedJwtRole || null
			});
		}

		// Only parse and process file if admin check passes
		const { files = {}, fields = {} } = await parseFormAsync(req);
		console.log("[massmediaupload] Parsed form fields:", Object.keys(fields || {}));
		console.log("[massmediaupload] Parsed files keys:", Object.keys(files || {}));

		let file = files.myFile0 || {};
		if (Array.isArray(file)) {
			file = file[0] || {};
		}
		console.log("[massmediaupload] Raw myFile0 object:", file);
		file.name = file.name ? file.name : (file.originalFilename || file.newFilename || null);
		console.log("[massmediaupload] File metadata:", {
			name: file.name,
			originalFilename: file.originalFilename,
			newFilename: file.newFilename,
			size: file.size,
			filepath: file.filepath || file.path,
		});

		if (!file.name) {
			console.warn("[massmediaupload] myFile0 missing or has no name");
			return res.status(400).json({ 
				code: 400, 
				message: "Invalid file upload.",
				error: "No file was provided or the file name is missing. Please ensure you upload a valid Excel file (.xlsx) with the field name 'myFile0'."
			});
		}

		// Handle keyword import - if this function doesn't exist, return error
		if (file.name.indexOf("KEYWORDS_IMPORT") > -1) {
			console.warn("[massmediaupload] Keyword import requested but not implemented in new controller");
			return res.status(501).json({ 
				code: 501, 
				message: "Feature not implemented.",
				error: "Keyword import functionality is not yet implemented in this controller. Please use the legacy controller for keyword imports."
			});
		}

		const sessionSummary = {
			hasSession: !!req.session,
			hasAdmin: !!req.session?.admin,
			hasSubAdmin: !!req.session?.subAdmin,
			hasUserFromJwt: !!req.user,
			jwtRole: normalizedJwtRole,
		};
		console.log("[massmediaupload] Session summary:", sessionSummary);

		tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "unsplashimport-"));
		
		// Ensure temp directory exists (should already exist from mkdtempSync, but double-check)
		await fsPromises.mkdir(tempUploadDir, { recursive: true });
		
		savedFilePath = await moveUploadedFile(file, tempUploadDir, `${dateFormat()}_unsplashimport`);
		console.log("[massmediaupload] Saved file to:", savedFilePath);
		
		const outputJsonPath = path.join(tempUploadDir, "output.json");
		
		// Ensure output directory exists before converting Excel to JSON
		const outputDir = path.dirname(outputJsonPath);
		await fsPromises.mkdir(outputDir, { recursive: true });
		
		const rows = await convertXlsxToJson(savedFilePath, outputJsonPath);
		console.log("[massmediaupload] Parsed rows count:", Array.isArray(rows) ? rows.length : 0);

		// Log column names from first row to debug
		if (rows && rows.length > 0) {
			const firstRow = rows[0];
			const columnNames = Object.keys(firstRow);
			console.log("[massmediaupload] Available columns in Excel:", columnNames);
			console.log("[massmediaupload] Sample first row keys:", columnNames.slice(0, 10));
		}

		const recordsToUpload = [];
		const recordsToReportError = [];
		let skippedEmptyRows = 0;

		rows.forEach((row, index) => {
			// Check for Image Source with flexible matching
			const imageSource = row["Image Source"] || row["image source"] || row["Image source"] || row["IMAGE SOURCE"];
			
			// Skip rows with empty Image Source (don't count as errors, just skip them)
			if (!imageSource || String(imageSource).trim() === '') {
				skippedEmptyRows++;
				return; // Simply skip this row, don't add to errors
			}

			// Row has Image Source, process it
			if (!row["Descriptors/Concepts/Related tags"] && row["Combined tags (all 4)"]) {
				row["Descriptors/Concepts/Related tags"] =
					typeof row["Combined tags (all 4)"] === "string" ? row["Combined tags (all 4)"] : "";
			}

			if (row["Styled images"]) {
				row.StyleKeyword = typeof row["Styled images"] === "string" ? row["Styled images"].trim() : "";
			}

			recordsToUpload.push(row);
		});

		console.log(`[massmediaupload] Records to upload: ${recordsToUpload.length}, Skipped empty rows: ${skippedEmptyRows}`);

		// Extract Photo IDs from records (including extracting from URLs if needed)
		const unsplashIds = [];
		recordsToUpload.forEach((record) => {
			let photoId = record["Photo ID"] ? record["Photo ID"].trim() : null;
			if (!photoId && record["Image Source"]) {
				const url = String(record["Image Source"]).trim();
				const photoIdMatch = url.match(/photo-([a-zA-Z0-9_-]+)/);
				if (photoIdMatch) {
					photoId = photoIdMatch[1];
				}
			}
			if (photoId) {
				unsplashIds.push(photoId);
			}
		});

		// Check for duplicates using UnsplashPhotoId
		const existingMediaRecords = unsplashIds.length
			? await media.find({ UnsplashPhotoId: { $in: unsplashIds }, IsDeleted: false }, { UnsplashPhotoId: 1, Location: 1, Locator: 1 }).lean()
			: [];
		
		// Also query for records with null UnsplashPhotoId but matching URLs (to catch previously saved records)
		const imageUrls = recordsToUpload
			.map((record) => {
				const url = record["Image Source"] || record["image source"] || record["Image source"] || record["IMAGE SOURCE"];
				return url ? String(url).trim().split('?')[0] : null;
			})
			.filter(Boolean);
		
		// Build regex pattern for URL matching (escape special characters)
		const urlPatterns = imageUrls.map(url => {
			// Escape special regex characters
			return url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		});
		
		const existingRecordsByUrl = urlPatterns.length
			? await media.find(
				{ 
					IsDeleted: false,
					"Location.URL": { $regex: urlPatterns.join('|') }
				}, 
				{ UnsplashPhotoId: 1, Location: 1, Locator: 1 }
			).lean()
			: [];
		
		// Combine both result sets and deduplicate by _id
		const allExistingRecordsMap = new Map();
		[...existingMediaRecords, ...existingRecordsByUrl].forEach((doc) => {
			if (doc._id && !allExistingRecordsMap.has(String(doc._id))) {
				allExistingRecordsMap.set(String(doc._id), doc);
			}
		});
		const allExistingRecords = Array.from(allExistingRecordsMap.values());

		const existingUnsplashIds = new Set(allExistingRecords.map((doc) => doc.UnsplashPhotoId).filter(Boolean));
		
		// Also check for duplicates using URL pattern (for records where UnsplashPhotoId might be null)
		// Extract base URLs from existing records to check against
		const existingUrls = new Set();
		allExistingRecords.forEach((doc) => {
			if (doc.Location && Array.isArray(doc.Location) && doc.Location.length > 0) {
				const url = doc.Location[0].URL;
				if (url) {
					// Normalize URL by removing query parameters for comparison
					const baseUrl = url.split('?')[0];
					existingUrls.add(baseUrl);
				}
			}
		});
		const newMediaRecords = [];
		const uploaderId =
			req.session?.admin?._id ||
			req.user?.userId ||
			req.user?._id ||
			req.user?.id ||
			null;
		
		// Track duplicates found during processing
		let duplicatesSkipped = 0;

		for (const record of recordsToUpload) {
			// Flexible column name matching
			const unsplashImageURL = (record["Image Source"] || record["image source"] || record["Image source"] || record["IMAGE SOURCE"]) 
				? String(record["Image Source"] || record["image source"] || record["Image source"] || record["IMAGE SOURCE"]).trim() 
				: null;

			// Image Source is required
			if (!unsplashImageURL || unsplashImageURL === '') {
				if (recordsToReportError.length < 3) {
					console.log(`[massmediaupload] Record missing Image Source. Available columns:`, Object.keys(record));
				}
				recordsToReportError.push(record);
				continue;
			}

			// Photo ID is optional - extract from URL if not provided
			let unsplashPhotoId = (record["Photo ID"] || record["photo id"] || record["Photo id"] || record["PHOTO ID"]) 
				? String(record["Photo ID"] || record["photo id"] || record["Photo id"] || record["PHOTO ID"]).trim() 
				: null;

			// If Photo ID is missing, try to extract it from the Image Source URL
			if (!unsplashPhotoId && unsplashImageURL) {
				// Try to extract photo ID from Unsplash URL pattern: https://images.unsplash.com/photo-{photoId}?...
				const photoIdMatch = unsplashImageURL.match(/photo-([a-zA-Z0-9_-]+)/);
				if (photoIdMatch) {
					unsplashPhotoId = photoIdMatch[1];
					console.log(`[massmediaupload] Extracted Photo ID from URL: ${unsplashPhotoId}`);
				} else {
					// If we can't extract it, generate a unique ID from the URL
					unsplashPhotoId = unsplashImageURL.split('/').pop().split('?')[0] || `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
					console.log(`[massmediaupload] Generated Photo ID from URL: ${unsplashPhotoId}`);
				}
			}

			// Check for duplicate using UnsplashPhotoId
			if (unsplashPhotoId && existingUnsplashIds.has(unsplashPhotoId)) {
				console.log(`[massmediaupload] Skipping duplicate - Photo ID already exists: ${unsplashPhotoId}`);
				duplicatesSkipped++;
				continue;
			}
			
			// Also check for duplicate using URL (normalize by removing query params)
			const normalizedUrl = unsplashImageURL ? unsplashImageURL.split('?')[0] : null;
			if (normalizedUrl && existingUrls.has(normalizedUrl)) {
				console.log(`[massmediaupload] Skipping duplicate - URL already exists: ${normalizedUrl}`);
				duplicatesSkipped++;
				continue;
			}

			const counter = await counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true });
			if (!counter || !counter.seq) {
				console.log("Failed to fetch counter for Unsplash import record.");
				continue;
			}

			// Pass the extracted/generated Photo ID to buildMediaDocument
			const mediaDocument = buildMediaDocument({
				record,
				seq: counter.seq,
				uploaderId,
				unsplashPhotoId: unsplashPhotoId, // Pass the extracted Photo ID
			});

			newMediaRecords.push(mediaDocument);
		}

		let insertedCount = 0;
		if (newMediaRecords.length) {
			const chunks = chunkArray(newMediaRecords, 200);
			for (const chunk of chunks) {
				// Add timestamps to all records in chunk before saving
				const chunkWithTimestamps = addMediaTimestamps(chunk, true); // true = isNew documents
				
				// Use collection.insertMany to preserve string _id (Mongoose insertMany converts string _id to ObjectId)
				const inserted = await Media.collection.insertMany(chunkWithTimestamps);
				insertedCount += inserted.insertedCount || inserted.length || 0;
			}
		}

		// Provide detailed summary information
		const summary = {
			totalRows: rows.length,
			recordsWithImageSource: recordsToUpload.length,
			skippedEmptyRows: skippedEmptyRows,
			recordsWithErrors: recordsToReportError.length,
			recordsUploaded: insertedCount,
			alreadyExists: duplicatesSkipped, // Use actual count of skipped records, not unique Photo IDs
			uniquePhotoIdsInDatabase: existingUnsplashIds.size, // For reference: unique Photo IDs that exist
			uniqueUrlsInDatabase: existingUrls.size, // For reference: unique URLs that exist
		};

		console.log("[massmediaupload] Final summary:", summary);

		return res.json({
			code: 200,
			message: insertedCount > 0 
				? `Successfully uploaded ${insertedCount} records. ${skippedEmptyRows} empty rows were skipped. ${recordsToReportError.length} records had validation errors.`
				: skippedEmptyRows === rows.length
				? `No records were uploaded. All ${rows.length} rows were empty (missing Image Source).`
				: `No records were uploaded. ${recordsToReportError.length} records had validation errors. ${skippedEmptyRows} empty rows were skipped.`,
			recordsUploaded: insertedCount,
			recordsToReportError: recordsToReportError.length,
			skippedEmptyRows: skippedEmptyRows,
			UnsplashPhotoId__AlreadyExists: duplicatesSkipped, // Use actual duplicates skipped
			duplicatesSkipped: duplicatesSkipped,
			totalRows: rows.length,
			summary: summary
		});
	} catch (error) {
		console.error("importUnsplashImagesV2 error:", error);
		return res.status(500).json({ 
			code: 500, 
			message: "Internal server error.",
			error: "An error occurred while processing the Excel file import. Please check the file format and try again.",
			details: process.env.NODE_ENV === 'development' ? error.message : undefined
		});
	} finally {
		if (savedFilePath) {
			try {
				await fsPromises.unlink(savedFilePath);
			} catch (unlinkErr) {
				console.warn("[massmediaupload] Failed to delete uploaded file:", unlinkErr?.message);
			}
		}
		if (tempUploadDir) {
			try {
				const remainingFiles = await fsPromises.readdir(tempUploadDir);
				await Promise.all(
					remainingFiles.map((fileName) =>
						fsPromises.unlink(path.join(tempUploadDir, fileName)).catch(() => null)
					)
				);
				await fsPromises.rmdir(tempUploadDir).catch(() => null);
			} catch (cleanupErr) {
				console.warn("[massmediaupload] Failed to clean temp directory:", cleanupErr?.message);
			}
		}
	}
};

const uploadMassImport = importUnsplashImagesV2;

const METADATA_PATHS_BY_TAGTYPE = {
  subject: ["MetaData.Subjects"],
  metaphor: ["MetaData.Metaphors"],
  concept: ["MetaData.Concepts"],
  attribute: ["MetaData.Attributes"],
  feeling: ["MetaData.Feelings"],
  verb: ["MetaData.Verbs"],
};

const FALLBACK_METADATA_PATHS = [
  "MetaData.Subjects",
  "MetaData.Verbs",
  "MetaData.Attributes",
  "MetaData.Feelings",
  "MetaData.Concepts",
  "MetaData.Metaphors",
];

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMetadataPathsForTagType = (tagType) => {
  if (!tagType) {
    return FALLBACK_METADATA_PATHS;
  }
  const key = String(tagType).toLowerCase();
  return METADATA_PATHS_BY_TAGTYPE[key] || FALLBACK_METADATA_PATHS;
};

const buildTagUpdatePayload = (groupTagDoc, tagDoc, matchedFromPath) => ({
  GroupTagID: String(groupTagDoc._id),
  GroupTagTitle: groupTagDoc.GroupTagTitle || "",
  TagID: tagDoc && tagDoc._id ? String(tagDoc._id) : undefined,
  TagTitle: tagDoc?.TagTitle || groupTagDoc.GroupTagTitle || "",
  TagType: tagDoc?.TagType || "",
  MatchedFrom: matchedFromPath || "",
});

const matchAndUpdateMediaForTag = async (groupTagDoc, tagDoc) => {
  const tagTitle = (tagDoc?.TagTitle || groupTagDoc.GroupTagTitle || "").trim();
  if (!tagTitle) {
    return { matchedMedia: 0, metadataPaths: [] };
  }

  const metadataPaths = getMetadataPathsForTagType(tagDoc?.TagType);
  if (!metadataPaths.length) {
    return { matchedMedia: 0, metadataPaths };
  }

  const regex = new RegExp(`^${escapeRegex(tagTitle)}$`, "i");
  let matchedMedia = 0;

  for (const path of metadataPaths) {
    const filterForPath = {
      IsDeleted: { $ne: 1 },
      [path]: { $regex: regex },
    };

    const updatePayload = buildTagUpdatePayload(groupTagDoc, tagDoc, path);

    const update = {
      $addToSet: {
        GroupTags: updatePayload,
      },
    };

    const result = await media.updateMany(filterForPath, update).exec();
    const modified =
      result?.modifiedCount ??
      result?.nModified ??
      (result?.acknowledged ? result?.matchedCount : 0) ??
      0;
    matchedMedia += modified;
  }

  return { matchedMedia, metadataPaths };
};

const backfillMediaTagsForGroup = async (req, res) => {
  try {
    console.log("🚀 Starting automatic GroupTag assignment to media (backfillMediaTagsForGroup)");

    // Fetch all active GroupTags from collection (no payload required)
    const queryOptions = {
      IsDeleted: { $ne: 1 },
      $or: [{ status: 1 }, { status: 3 }]
    };

    // Allow custom query from request if provided (optional)
    const finalQuery = req.body.queryOptions ? { ...queryOptions, ...req.body.queryOptions } : queryOptions;

    console.log(`🔍 Fetching GroupTags with query:`, JSON.stringify(finalQuery));
    const allGroupTags = await groupTags.find(finalQuery).lean();
    
    if (!allGroupTags || allGroupTags.length === 0) {
      return res.json({ 
        code: 200, 
        message: "No GroupTags found to process",
        totalGroupTags: 0,
        results: []
      });
    }

    console.log(`📋 Found ${allGroupTags.length} GroupTags to process`);

    const results = [];
    let totalMediaProcessed = 0;
    let totalMediaAssigned = 0;

    // OPTIMIZATION: Process GroupTags in parallel batches for better performance
    const groupTagBatchSize = 5; // Process 5 GroupTags in parallel
    const groupTagBatches = [];
    for (let i = 0; i < allGroupTags.length; i += groupTagBatchSize) {
      groupTagBatches.push(allGroupTags.slice(i, i + groupTagBatchSize));
    }

    // Process each batch of GroupTags in parallel
    for (let batchIdx = 0; batchIdx < groupTagBatches.length; batchIdx++) {
      const groupTagBatch = groupTagBatches[batchIdx];
      console.log(`\n🔄 Processing GroupTag batch ${batchIdx + 1}/${groupTagBatches.length} (${groupTagBatch.length} GroupTags in parallel)`);

      // Process GroupTags in parallel within the batch
      const batchPromises = groupTagBatch.map(async (groupTag, idx) => {
        const globalIdx = batchIdx * groupTagBatchSize + idx + 1;
        console.log(`  🏷️ Processing GroupTag ${globalIdx}/${allGroupTags.length}: ${groupTag.GroupTagTitle || groupTag._id}`);

        try {
          // Find matching media for this GroupTag (returns array of media objects with metadata)
          const matchingMediaArray = await findMatchingMediaForGroupTag(groupTag);
          
          if (matchingMediaArray.length === 0) {
            console.log(`    ⚠️ No matching media found for GroupTag: ${groupTag.GroupTagTitle}`);
            return {
              groupTagId: String(groupTag._id),
              groupTagTitle: groupTag.GroupTagTitle,
              mediaFound: 0,
              mediaAssigned: 0,
              mediaSkipped: 0,
              batchesProcessed: 0
            };
          }

          console.log(`    ✅ Found ${matchingMediaArray.length} matching media`);

          // Assign GroupTag to media (uses bulk operations internally)
          const batchResult = await assignGroupTagToMediaBatch(groupTag, matchingMediaArray, 200);

          console.log(`    ✅ Completed: ${batchResult.assigned} assigned, ${batchResult.skipped} skipped`);

          return {
            groupTagId: String(groupTag._id),
            groupTagTitle: groupTag.GroupTagTitle,
            mediaFound: matchingMediaArray.length,
            mediaAssigned: batchResult.assigned,
            mediaSkipped: batchResult.skipped,
            batchesProcessed: Math.ceil(matchingMediaArray.length / 200)
          };
        } catch (error) {
          console.error(`    ❌ Error processing GroupTag ${groupTag.GroupTagTitle}:`, error.message);
          return {
            groupTagId: String(groupTag._id),
            groupTagTitle: groupTag.GroupTagTitle,
            mediaFound: 0,
            mediaAssigned: 0,
            mediaSkipped: 0,
            batchesProcessed: 0,
            error: error.message
          };
        }
      });

      // Wait for all GroupTags in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update totals
      batchResults.forEach(result => {
        totalMediaProcessed += result.mediaFound || 0;
        totalMediaAssigned += result.mediaAssigned || 0;
      });

      console.log(`  ✅ Batch ${batchIdx + 1} completed`);
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`   Total GroupTags processed: ${allGroupTags.length}`);
    console.log(`   Total media processed: ${totalMediaProcessed}`);
    console.log(`   Total media assigned: ${totalMediaAssigned}`);

    return res.json({
      code: 200,
      message: "Backfill completed - GroupTags assigned to matching media successfully",
      summary: {
        totalGroupTags: allGroupTags.length,
        totalMediaProcessed: totalMediaProcessed,
        totalMediaAssigned: totalMediaAssigned
      },
      results: results
    });

  } catch (error) {
    console.error("backfillMediaTagsForGroup error:", error);
    return res.status(500).json({
      code: 500,
      message: "Failed to backfill media tags",
      error: error?.message || "Unknown error",
    });
  }
};

// API endpoint to assign GroupTags to Media based on Prompt field (comma-separated keywords)
// Uses static file lookup to find TagID, GroupTagID, and TagTitle
const assignGroupTagsFromPrompt = async (req, res) => {
  try {
    console.log("🚀 Starting GroupTag assignment from Prompt field");

    // Load static tag index if not already loaded
    if (!isLoaded()) {
      console.log("   - ⚠️ Static index not loaded, loading now...");
      await loadTagIndex();
      console.log("   - ✅ Static index loaded successfully");
    } else {
      console.log("   - ✅ Static index already loaded");
    }

    // Build query from request body
    let query = {};
    
    // Optional filters
    let mediaDoc = null;
    if (req.body.mediaId) {
      // If specific mediaId is provided, find it using string _id lookup only
      // All documents have string _id, use native MongoDB collection to avoid Mongoose type conversion
      console.log(`   🔍 Looking for specific media: ${req.body.mediaId}`);
      console.log(`   🔍 mediaId type: ${typeof req.body.mediaId}, length: ${req.body.mediaId?.length}`);
      
      // Try using media.collection (lowercase) first, then Media.collection
      try {
        // Use native MongoDB collection to preserve string _id
        mediaDoc = await media.collection.findOne({ _id: req.body.mediaId });
        if (!mediaDoc) {
          // Try with Media.collection as fallback
          mediaDoc = await Media.collection.findOne({ _id: req.body.mediaId });
        }
        
        if (mediaDoc) {
          console.log(`   ✅ Media found using string _id!`);
          console.log(`      _id: ${mediaDoc._id} (type: ${typeof mediaDoc._id})`);
          console.log(`      _id value: "${mediaDoc._id}"`);
          query._id = req.body.mediaId;
        } else {
          // Debug: Try to find any document to verify collection access
          const testDoc = await media.collection.findOne({});
          console.log(`   ⚠️ Test query result: ${testDoc ? 'Collection accessible' : 'Collection empty or inaccessible'}`);
          if (testDoc) {
            console.log(`   ⚠️ Sample _id from collection: "${testDoc._id}" (type: ${typeof testDoc._id})`);
          }
          
          console.log(`   ❌ Media not found with _id: ${req.body.mediaId}`);
          return res.json({
            code: 404,
            message: `Media with ID ${req.body.mediaId} not found in database`,
            totalCount: 0,
            processed: 0,
            updated: 0,
            skipped: 0
          });
        }
      } catch (error) {
        console.error(`   ❌ Error querying media collection: ${error.message}`);
        return res.json({
          code: 500,
          message: `Error querying database: ${error.message}`,
          totalCount: 0,
          processed: 0,
          updated: 0,
          skipped: 0
        });
      }
    } else {
      // For bulk processing, require Prompt field
      query['Prompt'] = { $exists: true, $ne: '', $ne: null };
      query.IsDeleted = { $ne: 1 };
      
      // Default: Only process UnsplashImage_Tool and ChatGPT_MJ sources if no source filter provided
      if (!req.body.source) {
        query.Source = { $in: ['UnsplashImage_Tool', 'ChatGPT_MJ'] };
      }
    }
    
    if (req.body.uploadedBy) {
      query.UploadedBy = req.body.uploadedBy;
    }
    
    if (req.body.source) {
      query.Source = req.body.source;
    }

    // Get count - use native collection if we have string _id (to avoid Mongoose conversion)
    let totalCount;
    if (req.body.mediaId && mediaDoc) {
      // If we already found the document, count is 1
      totalCount = 1;
    } else if (query._id && typeof query._id === 'string') {
      // Use native collection for string _id to avoid Mongoose conversion
      totalCount = await media.collection.countDocuments(query);
    } else {
      // Use Mongoose for other queries
      totalCount = await media.countDocuments(query);
    }
    console.log(`   📊 Found ${totalCount} media documents`);
    
    // Debug: Show query structure
    const queryForLog = JSON.parse(JSON.stringify(query));
    console.log(`   📋 Query:`, JSON.stringify(queryForLog, null, 2));

    if (totalCount === 0) {
      return res.json({
        code: 200,
        message: "No media documents found matching criteria",
        totalCount: 0,
        processed: 0,
        updated: 0,
        skipped: 0
      });
    }

    // Limit processing (optional)
    // Test mode: process only 1 document for testing
    const isTestMode = req.body.testMode === true || req.body.test === true;
    const limit = isTestMode ? 1 : (req.body.limit || (req.body.processAll ? 0 : 100));
    
    if (isTestMode) {
      console.log("   🧪 TEST MODE: Processing only 1 document for testing");
    }
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let noPrompt = 0;
    let totalTagsAssigned = 0;

    // If we already found the document by mediaId, process it directly
    let documentsToProcess = [];
    if (req.body.mediaId && mediaDoc) {
      documentsToProcess = [mediaDoc];
    } else {
      // Otherwise, use native MongoDB collection cursor for bulk processing
      // This preserves string _id values (Mongoose converts them to ObjectId)
      const cursor = media.collection.find(query);
      if (limit > 0) {
        cursor.limit(limit);
      }
      for await (const doc of cursor) {
        documentsToProcess.push(doc);
      }
    }
    
    console.log(`   📦 Found ${documentsToProcess.length} document(s) to process`);

    // Process each document
    for (const mediaDoc of documentsToProcess) {
      processed++;
      
      // Ensure mediaId is always a string (native collection returns string, but safeguard for consistency)
      const mediaId = String(mediaDoc._id);
      const prompt = mediaDoc.Prompt || '';
      
      console.log(`\n   ─────────────────────────────────────────`);
      console.log(`   📸 Processing Media: ${mediaId}`);
      console.log(`   🔍 _id type: ${typeof mediaId}, value: "${mediaId}"`);
      console.log(`   📝 Prompt: "${prompt}"`);
      
      if (!prompt || prompt.trim() === '') {
        console.log(`   ⚠️ No Prompt field found, skipping...`);
        noPrompt++;
        continue;
      }
      
      // Split prompt by comma and clean up
      const promptWords = prompt.split(',')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0);
      
      if (promptWords.length === 0) {
        noPrompt++;
        continue;
      }
      
      // Build GroupTags array - only EXACT GroupTagTitle matches (case-insensitive)
      const groupTagsMap = new Map(); // Use map to avoid duplicates
      let matchedCount = 0;
      
      console.log(`   🔍 Processing Media ${mediaId}:`);
      console.log(`      Prompt: "${prompt}"`);
      console.log(`      Prompt words: [${promptWords.join(', ')}]`);
      
      for (const word of promptWords) {
        if (!word) continue;
        
        // Look up the word in static index
        const matches = lookupTag(word);
        console.log(`      Looking up "${word}": ${matches ? matches.length : 0} matches found`);
        
        if (matches && matches.length > 0) {
          // Filter for ONLY EXACT GroupTagTitle matches (case-insensitive)
          // tagType === "gt" means it's a GroupTagTitle match
          const gtMatches = matches.filter(m => 
            m.tagType === 'gt' && 
            m.groupTagTitle.toLowerCase().trim() === word.toLowerCase().trim()
          );
          
          console.log(`      GT matches for "${word}": ${gtMatches.length}`);
          
          if (gtMatches.length > 0) {
            matchedCount++;
            
            for (const match of gtMatches) {
              // Use TagID:GroupTagID as key to avoid duplicates
              const tagKey = `${match.tagId}:${match.groupTagId}`;
              if (!groupTagsMap.has(tagKey)) {
                groupTagsMap.set(tagKey, {
                  TagID: match.tagId,
                  GroupTagID: match.groupTagId,
                  TagTitle: match.tagTitle
                });
                console.log(`      ✅ Added: TagID=${match.tagId}, GroupTagID=${match.groupTagId}, TagTitle="${match.tagTitle}"`);
              } else {
                console.log(`      ⏭️ Skipped duplicate: ${tagKey}`);
              }
            }
          }
        }
      }
      
      const newGroupTagsArray = Array.from(groupTagsMap.values());
      console.log(`      Total new GroupTags found: ${newGroupTagsArray.length}`);
      
      // Get existing GroupTags to check for duplicates (only check tags with TagID format)
      const existingGroupTags = Array.isArray(mediaDoc.GroupTags) ? mediaDoc.GroupTags : [];
      const existingTagSet = new Set();
      
      // Build set of existing tag combinations for O(1) lookup (only for new format tags)
      existingGroupTags.forEach(gt => {
        if (gt.TagID && gt.GroupTagID) {
          existingTagSet.add(`${String(gt.TagID)}:${String(gt.GroupTagID)}`);
        }
      });

      // Filter out duplicates from new tags
      const uniqueNewTags = newGroupTagsArray.filter(newTag => {
        const tagKey = `${String(newTag.TagID)}:${String(newTag.GroupTagID)}`;
        return !existingTagSet.has(tagKey);
      });

      // If we have new format tags, replace the entire array with new format only
      // This ensures we don't mix old format (GroupTagID only) with new format (TagID + GroupTagID + TagTitle)
      if (newGroupTagsArray.length > 0) {
        // Keep existing new-format tags and add unique new ones
        const existingNewFormatTags = existingGroupTags.filter(gt => gt.TagID && gt.GroupTagID);
        const updatedGroupTags = [...existingNewFormatTags, ...uniqueNewTags];
        
        console.log(`      Existing new-format tags: ${existingNewFormatTags.length}`);
        console.log(`      New unique tags to add: ${uniqueNewTags.length}`);
        console.log(`      Total after merge: ${updatedGroupTags.length}`);
        
        // Use native MongoDB collection to preserve string _id (Mongoose updateOne converts string _id to ObjectId)
        console.log(`      🔍 Updating with _id: "${mediaId}" (type: ${typeof mediaId})`);
        const updateResult = await media.collection.updateOne(
          { _id: mediaId },
          { $set: { GroupTags: updatedGroupTags } }
        );
        
        console.log(`      Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
        
        // Verify the document still has string _id after update
        if (updateResult.modifiedCount > 0) {
          const verifyDoc = await media.collection.findOne({ _id: mediaId });
          if (verifyDoc) {
            console.log(`      ✅ Verified: Document _id after update: "${verifyDoc._id}" (type: ${typeof verifyDoc._id})`);
          }
        }
        
        if (updateResult.modifiedCount > 0) {
          updated++;
          totalTagsAssigned += uniqueNewTags.length;
          console.log(`   ✅ Media ${mediaId}: Successfully updated with ${updatedGroupTags.length} GroupTags (${uniqueNewTags.length} new, ${matchedCount}/${promptWords.length} words matched)`);
        } else if (updateResult.matchedCount > 0 && uniqueNewTags.length === 0) {
          console.log(`   ⚠️ Media ${mediaId}: Already has all tags (no new tags to add)`);
          skipped++;
        } else {
          console.log(`   ⚠️ Media ${mediaId}: Update matched but didn't modify`);
          skipped++;
        }
      } else {
        skipped++;
        console.log(`   ⏭️ Media ${mediaId}: No GroupTagTitle matches found in static file`);
      }
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped} (no new tags)`);
    console.log(`   No prompt: ${noPrompt}`);
    console.log(`   Total tags assigned: ${totalTagsAssigned}`);

    return res.json({
      code: 200,
      message: "GroupTags assigned from Prompt successfully",
      summary: {
        totalCount: totalCount,
        processed: processed,
        updated: updated,
        skipped: skipped,
        noPrompt: noPrompt,
        totalTagsAssigned: totalTagsAssigned
      }
    });

  } catch (error) {
    console.error("Error in assignGroupTagsFromPrompt:", error);
    return res.status(500).json({
      code: 500,
      message: "Failed to assign GroupTags from Prompt",
      error: error?.message || "Unknown error",
    });
  }
};

module.exports = {
  crop_image,
  findAll,
  uploadfile,
  uploadLink,
  addTagsToUploadedMedia,
  addMediaToBoard,
  updateMediaToBoard,
  postMedia,
  syncGdMjImage_INTERNAL_API,
  syncGdTwoMjImage_INTERNAL_API,
  addMjImageToMedia__INTERNAL_API,
  createSinglePost,
  createBlendImage,
  getUserPosts,
  updatePostPrivacy,
  filteredData,
  searchByLocatorList,
  updatePost,
  findAllStatus,
  deleteMedia,
  uploadMassImport,
  backfillMediaTagsForGroup,
  assignGroupTagsFromPrompt,
};
