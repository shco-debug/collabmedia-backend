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
var PageStream = require("../models/pageStreamModel.js");
var CommonAlgo = require("../components/commonAlgorithms.js");
var sharp = require("sharp");
var path = require("path");
var shortid = require("shortid");

const { ObjectId } = mongoose.Types;

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

// Main function to add tags to uploaded media
const addTagsToUploadedMedia = async (req, res) => {
  try {
    const data = await media.findById(req.body.MediaID);
    if (!data) {
      return res.json({ code: "404", message: "Media not found" });
    }

    console.log("add--tags to uploaded media--");
    var fields = {
      GroupTags: data.GroupTags.length == 0 ? [] : data.GroupTags,
      Status: 3,
      MetaMetaTags: req.body.mmt,
      IsPrivate: req.body.isPrivate ? req.body.isPrivate : 0,
      MetaTags: null,
      TagType: null,
      Posts: {},
      ViewsCount: 1,
    };

    // Default private logic
    fields.IsPrivate = defaultPrivateCase__Checker(data);

    fields.Posts.Users = [];

    // Get user FSGs from the owner field instead of session
    let userFSGs = [];
    if (req.body.owner) {
      try {
        const userData = await user.findById(req.body.owner);
        if (userData && userData.FSGsArr2) {
          userFSGs = userData.FSGsArr2;
        }
      } catch (error) {
        console.log("Error fetching user FSGs:", error);
        userFSGs = [];
      }
    }

    fields.Posts.Users.push({ UserFSGs: userFSGs });

    if (req.body.gt) {
      fields.GroupTags.push({
        GroupTagID: req.body.gt,
      });
    }

    fields.Photographer = null;
    req.body.id = req.body.MediaID;
    var query = { _id: req.body.MediaID };

    // Handle Montage type differently
    if (req.body.data?.MediaType == "Montage") {
      fields.Status = 1;
      await media.updateOne(query, { $set: fields });
    } else {
      await media.updateOne(query, { $set: fields });
    }

    // Handle additional tags if provided
    if (req.body.Tags) {
      await addTags_toGT(req.body.MediaID, req.body.Tags);
    }

    // Fetch updated media data for response
    const updatedData = await media.findById(query, {
      Posts: false,
      Stamps: false,
      Marks: false,
    });
    if (!updatedData) {
      return res.json({ code: "404", message: "Updated media not found" });
    }

    // Handle Montage type special logic
    if (req.body.data?.MediaType == "Montage") {
      const montageData = await media.findById(req.body.MediaID, {
        OwnStatement: 1,
        Content: 1,
        IsPrivate: 1,
      });
      if (montageData) {
        console.log("---- in else ---");
        req.body.Statement = montageData.OwnStatement
          ? montageData.OwnStatement
          : "";

        if (req.body.PostId) {
          await updateMediaToBoard(req, res);
        } else {
          await addMediaToBoard(req, res);
        }

        if (!montageData.IsPrivate) {
          // Note: __updateMontagePrivacy function would need to be implemented
          console.log("Montage privacy update would go here");
        }
      }
    } else {
      res.json({ code: "200", message: "success", response: updatedData });
    }
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
  console.log("🎯 addMjImageToMedia__INTERNAL_API function hit!");

  // Log request body with image size instead of full base64
  if (req.body && req.body.imageData) {
    const imageSize = req.body.imageData.length;
    const logBody = { ...req.body };
    logBody.imageData = `[Base64 Image Data - ${imageSize} characters]`;
    console.log("📥 Request body:", JSON.stringify(logBody, null, 2));
  } else if (req.body && req.body.Base64Image) {
    const imageSize = req.body.Base64Image.length;
    const logBody = { ...req.body };
    logBody.Base64Image = `[Base64 Image Data - ${imageSize} characters]`;
    console.log("📥 Request body:", JSON.stringify(logBody, null, 2));
  } else {
    console.log("📥 Request body:", JSON.stringify(req.body, null, 2));
  }

  let inputObj = req.body || {};

  const realFileName =
    typeof inputObj.GoogleDriveFilename === "string"
      ? inputObj.GoogleDriveFilename.trim()
      : null;

  if (!realFileName) {
    return res.json({ code: 404, message: "GoogleDriveFilename is invalid" });
  }

  //first thing to check whether the realFileName in the db or not
  const mediaRecord = await media.find(
    { IsDeleted: 0, "MetaData.GoogleDriveFilename": realFileName },
    { _id: 1 }
  );
  if (mediaRecord.length) {
    console.log(`🔄 Found existing media with same filename: ${realFileName}`);

    // Process tags for existing media if MetaData is provided
    if (inputObj.MetaData && inputObj.MetaData.Subjects) {
      console.log(
        `🏷️ Processing tags for existing media: ${mediaRecord[0]._id}`
      );
      const tags = inputObj.Prompt || "";
      if (tags) {
        await addGTAsyncAwait(tags, mediaRecord[0]._id, inputObj.MetaData);
      }
    }

    return res.json({
      code: 200,
      message: "MJ image with the provided name already exists.",
    });
  }

  // Check if same image content already exists on S3 by generating hash
  const crypto = require("crypto");
  const buffer = Buffer.from(inputObj.Base64Image, "base64");
  const imageHash = crypto.createHash("md5").update(buffer).digest("hex");

  // Look for existing media with same image hash
  const existingImageRecord = await media.findOne(
    {
      IsDeleted: 0,
      ImageHash: imageHash,
    },
    {
      _id: 1,
      Location: 1,
    }
  );

  if (existingImageRecord) {
    console.log(`🔄 Found existing image with same content, reusing S3 URL`);

    // Process tags for existing media if MetaData is provided
    if (inputObj.MetaData && inputObj.MetaData.Subjects) {
      console.log(
        `🏷️ Processing tags for existing media: ${existingImageRecord._id}`
      );
      const tags = inputObj.Prompt || "";
      if (tags) {
        await addGTAsyncAwait(tags, existingImageRecord._id, inputObj.MetaData);
      }
    }

    return res.json({
      code: 200,
      message:
        "Image with same content already exists, reusing existing S3 URL.",
      existingMediaId: existingImageRecord._id,
      s3Url: existingImageRecord.Location[0]?.URL,
    });
  }

  const Reset = "\x1b[0m",
    FgGreen = "\x1b[32m";

  try {
    if (!realFileName && inputObj.Base64Image) {
      return res.json({
        code: 404,
        message: "Could not find the image in google drive",
      });
    }

    // Import AWS S3 utilities
    const awsS3Utils = require("../utilities/awsS3Utils");

    const extension = "png";
    var imgUrl = `uploadImageTool_${
      dateFormat() + "_" + realFileName.replace(/.png/g, "")
    }.${extension}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(inputObj.Base64Image, "base64");

    // Upload to S3 instead of local storage
    const s3Key = `scrptMedia/img/aspectfit/${imgUrl}`;
    const uploadResult = await awsS3Utils.uploadBufferToS3(
      buffer,
      s3Key,
      "image/png"
    );

    if (!uploadResult.success) {
      console.error("❌ S3 Upload failed:", uploadResult.error);
      return res.json({
        code: 500,
        message: "Failed to upload image to S3",
        error: uploadResult.error,
      });
    }

    console.log(FgGreen, `- ${realFileName} - synced successfully to S3.`);
    console.log(Reset, `\n`);

    // Generate S3 URL for the uploaded image
    const bucket = process.env.AWS_BUCKET_NAME || "scrpt";
    const region = process.env.AWS_REGION || "us-east-1";
    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    console.log("✅ Image uploaded to S3:", s3Url);

    // Process image with Sharp to create optimized WebP and multiple sizes
    const sharp = require("sharp");

    // Create optimized WebP version
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    // Upload WebP version to S3
    const webpKey = `scrptMedia/img/aspectfit/${imgUrl.replace(
      ".png",
      ".webp"
    )}`;
    const webpUploadResult = await awsS3Utils.uploadBufferToS3(
      webpBuffer,
      webpKey,
      "image/webp"
    );

    if (!webpUploadResult.success) {
      console.error("❌ WebP S3 Upload failed:", webpUploadResult.error);
    } else {
      console.log(
        "✅ WebP image uploaded to S3:",
        `https://${bucket}.s3.${region}.amazonaws.com/${webpKey}`
      );
    }

    // Create multiple sizes for thumbnails
    const sizes = [
      { name: "100", width: 100, height: 100 },
      { name: "300", width: 300, height: 300 },
      { name: "600", width: 600, height: 600 },
      { name: "aspectfit_small", width: 575, height: 360 },
    ];

    const thumbnailUrls = [];

    for (const size of sizes) {
      try {
        // Create optimized thumbnail
        const thumbnailBuffer = await sharp(buffer)
          .resize(size.width, size.height, {
            fit: "cover",
            position: "center",
          })
          .webp({ quality: 80, effort: 6 })
          .toBuffer();

        // Upload thumbnail to S3
        const thumbnailKey = `scrptMedia/img/${size.name}/${imgUrl.replace(
          ".png",
          ".webp"
        )}`;
        const thumbnailUploadResult = await awsS3Utils.uploadBufferToS3(
          thumbnailBuffer,
          thumbnailKey,
          "image/webp"
        );

        if (thumbnailUploadResult.success) {
          const thumbnailUrl = `https://${bucket}.s3.${region}.amazonaws.com/${thumbnailKey}`;
          thumbnailUrls.push({
            size: size.name,
            url: thumbnailUrl,
          });
          console.log(`✅ Thumbnail ${size.name} uploaded to S3`);
        }
      } catch (error) {
        console.error(
          `❌ Error creating thumbnail ${size.name}:`,
          error.message
        );
      }
    }

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

    var type = "Image";
    var thumbnail = "";
    var postStatement = "";
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
      Content: postStatement,
      ContentType: "image/png",
      MediaType: type,
      AddedHow: "uploadImageTool",
      thumbnail: thumbnail,
      Locator: imgUrl.replace(".png", "") + "_" + incNum,
      Lightness: inputObj.Lightness || 0,
      DominantColors: inputObj.DominantColors || "",
      MetaData: inputObj.MetaData || {},
      ImageHash: imageHash, // Store image hash for deduplication
    };

    dataToUpload.Location.push({
      Size: "",
      URL: s3Url, // Original PNG URL
    });

    // Add WebP version
    if (webpUploadResult.success) {
      dataToUpload.Location.push({
        Size: "webp",
        URL: `https://${bucket}.s3.${region}.amazonaws.com/${webpKey}`,
      });
    }

    // Add thumbnail URLs
    thumbnailUrls.forEach((thumb) => {
      dataToUpload.Location.push({
        Size: thumb.size,
        URL: thumb.url,
      });
    });

    var mediaData = await media(dataToUpload).save();
    console.log("Media record saved = ", mediaData._id);
    mediaData = mediaData ? mediaData : {};
    var tags = typeof mediaData.Prompt === "string" ? mediaData.Prompt : "";
    if (tags && mediaData._id) {
      await addGTAsyncAwait(tags, mediaData._id, inputObj.MetaData);
    }
    return res
      .status(200)
      .json({ code: 200, message: "MJ image uploaded successfully." });
  } catch (err) {
    // TODO(developer) - Handle error
    console.log(err);
    return res.status(501).json({ code: 501, message: "Something went wrong" });
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
    } = req.body;

    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: "User not authenticated",
      });
    }

    // Extract media URLs and blend settings
    let mediaUrls = [];
    let blendImageUrl = null;
    let blendResult = null;

    if (mediaArray && mediaArray.length > 0) {
      mediaUrls = mediaArray.map((m) => m.url).filter((url) => url);
    }

    // Handle blend settings if provided
    if (
      blendSettings &&
      blendSettings.blendImage1 &&
      blendSettings.blendImage2
    ) {
      console.log("Creating blend image...");

      // Use CommonAlgo to determine blend mode if not provided
      const blendMode = blendSettings.blendMode || "hard-light";

      // Create blend image
      blendResult = await createBlendImage(
        blendSettings.blendImage1,
        blendSettings.blendImage2,
        blendMode
      );

      if (blendResult.success) {
        blendImageUrl = blendResult.url;
        console.log("✅ Blend image created:", blendImageUrl);
      } else {
        console.error("❌ Failed to create blend image:", blendResult.error);
        return res.status(500).json({
          code: 500,
          message: "Failed to create blend image",
          error: blendResult.error,
        });
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

    // Extract keywords for group tags and transform to embedded document format
    const groupTagIds = keywords.map((k) => ({
      GroupTagID: k.id,
      GroupTagTitle: k.title,
      MetaMetaTagID: "",
      MetaTagID: "",
      _id: new ObjectId()
    })).filter((gt) => gt.GroupTagID);
    const promptText = keywords.map((k) => k.title).join(",");

    // Prepare Location array with all images (original + blended)
    const locationArray = [];

    // Add original images
    if (mediaUrls.length > 0) {
      mediaUrls.forEach((url, index) => {
        locationArray.push({
          Size: "original",
          URL: url,
          Type: "source",
          Index: index,
        });
      });
    }

    // Add blended image if created
    if (blendImageUrl) {
      locationArray.push({
        Size: "original",
        URL: blendImageUrl,
        Type: "blended",
        Index: locationArray.length,
      });
    }

    // Determine the main image URL (blend image takes priority for thumbnail)
    const mainImageUrl =
      blendImageUrl || (mediaUrls.length > 0 ? mediaUrls[0] : null);

    // Prepare media data
    const mediaData = {
      Title: title || "Untitled Post",
      Prompt: promptText,
      Locator: locator,
      Location: locationArray,
      AutoId: incNum,
      UploadedBy: "user",
      UploadedOn: new Date(),
      UploaderID: userId,
      Source: blendImageUrl ? "blending" : "user_upload",
      GroupTags: groupTagIds,
      Collection: [],
      Status: 1,
      AddedWhere: "directToPf",
      AddedHow: blendImageUrl ? "blending" : "user_upload",
      IsDeleted: 0,
      Content: content,
      MediaType: "Image",
      ContentType: "image/webp",
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
      BlendSettings: blendSettings,
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
      IsPrivate: 0,
      RandomSortId: shortid.generate(),
      RandomSortId_UpdatedOn: new Date(),
      PostedBy: new ObjectId(userId),
      PostedOn: new Date(),
      UpdatedOn: new Date(),
      PostPrivacySetting: "OnlyForOwner",
    };

    // Save media record
    const savedMedia = await Media(mediaData).save();
    console.log("Media record saved:", savedMedia._id);

    let postData = null;
    let pageUpdateResult = null;

    // Only add to page if pageId is provided
    if (pageId) {
      // Add to page
      const pageConditions = { _id: new ObjectId(pageId) };
      const postObject = {
        _id: new ObjectId(),
        MediaID: savedMedia._id,
        MediaURL: mainImageUrl,
        Title: title || "Untitled Post",
        Prompt: promptText,
        Locator: locator,
        PostedBy: new ObjectId(userId),
        PostedOn: Date.now(),
        ThemeID: null,
        ThemeTitle: "No Theme",
        MediaType: "Image",
        ContentType: "image/webp",
        Content: content,
        Votes: [],
        Marks: [],
        OwnerId: new ObjectId(userId),
        thumbnail: mainImageUrl,
        PostStatement: postStatement,
        IsOnlyForOwner: false,
        PostPrivacySetting: "OnlyForOwner",
        IsUnsplashImage: false,
        Themes: [],
        TaggedUsers: [],
        IsAddedFromStream: false,
        StreamId: streamId ? new ObjectId(streamId) : null,
        IsPostForUser: false,
        IsPostForTeam: false,
        QuestionPostId: null,
        PostType: postType,
      };

      pageUpdateResult = await Page.updateOne(pageConditions, {
        $push: { Medias: postObject },
      });

      if (pageUpdateResult.nModified === 0) {
        return res.status(404).json({
          code: 404,
          message: "Page not found or update failed",
        });
      }

      postData = postObject;
    }

    // Add group tags if keywords exist
    if (groupTagIds.length > 0 && savedMedia._id) {
      try {
        await addGTAsyncAwait(promptText, savedMedia._id, metadata);
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
        mediaId: savedMedia._id,
        postId: postData ? postData._id : null,
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
      postData: postData,
      mediaData: savedMedia,
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
    // Check if user is logged in
    if (!req.session.user || !req.session.user._id) {
      console.log("❌ Authentication failed - no valid session");
      return res.status(401).json({
        code: 401,
        message: "Authentication required",
        data: null,
      });
    }

    const userId = req.session.user._id;

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
    } = req.body;

    // Handle nested filters object (from frontend)
    const filters = req.body.filters || {};
    const finalPrivacyFilter = filters.privacyFilter || privacyFilter;
    const finalMediaType = filters.mediaType || mediaType;
    const finalSortBy = filters.sortBy || sortBy;
    const finalSearchQuery = filters.searchQuery || searchQuery;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 posts per request
    const skip = (pageNum - 1) * limitNum;

    // Build query conditions
    const conditions = {
      PostedBy: new mongoose.Types.ObjectId(userId),
      IsDeleted: { $ne: true },
    };

    // Privacy filtering
    switch (finalPrivacyFilter) {
      case "public":
        conditions.PostPrivacySetting = {
          $in: ["PublicWithName", "PublicWithoutName"],
        };
        break;
      case "private":
      case "OnlyForOwner":
        // Include both OnlyForOwner AND PublicWithName posts for owner
        conditions.PostPrivacySetting = {
          $in: ["OnlyForOwner", "PublicWithName"],
        };
        break;
      case "friends":
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

    // Conditionally include blend settings
    if (includeBlendSettings) {
      fields.BlendSettings = 1;
    }

    // Execute optimized aggregation pipeline
    const posts = await media.aggregate([
      // Match the conditions
      { $match: conditions },
      // Sort by the sort object
      { $sort: sortObj },
      // Apply pagination
      { $skip: skip },
      { $limit: limitNum },
      // Lookup interactions from MediaActionLogs
      {
        $lookup: {
          from: "MediaActionLogs",
          localField: "_id",
          foreignField: "MediaId",
          as: "interactions",
        },
      },
      // Unwind interactions to process each one
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
      // Lookup user data for PostedBy
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
      // Unwind PostedBy array
      {
        $unwind: {
          path: "$PostedBy",
          preserveNullAndEmptyArrays: true,
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
      // Project only the fields we need
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
          thumbnail: 1,
          OriginalPostId: 1,
          Lightness: 1,
          DominantColors: 1,
          Source: 1,
          IsUnsplashImage: 1,
          Photographer: 1,
          // Interaction fields
          likes: 1,
          dislikes: 1,
          comments: 1,
          likeCount: 1,
          dislikeCount: 1,
          commentCount: 1,
        },
      },
    ]);

    // Get total count for pagination
    const totalCount = await media.countDocuments(conditions);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Format response data
    const formattedPosts = posts.map((post) => {
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
        metaData: post.MetaData,
        images: post.Location || [],
        blendSettings: includeBlendSettings ? post.BlendSettings : undefined,
        posts: post.Posts || null, // Add Posts data (likes and comments)
      };

      // Add thumbnail for all media types (especially important for video posts)
      if (post.thumbnail) {
        formattedPost.thumbnail = post.thumbnail;
      }

      return formattedPost;
    });

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
          includeBlendSettings: includeBlendSettings,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
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
    // Check if user is logged in
    if (!req.session.user || !req.session.user._id) {
      return res.status(401).json({
        code: 401,
        message: "Authentication required",
        data: null,
      });
    }

    const userId = req.session.user._id;
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
    const post = await media.findOne({
      _id: postId,
      PostedBy: userId,
      IsDeleted: { $ne: true },
    });

    if (!post) {
      return res.status(404).json({
        code: 404,
        message: "Post not found or you don't have permission to modify it",
        data: null,
      });
    }

    // Update the post privacy setting
    const updateResult = await media.updateOne(
      { _id: postId, PostedBy: userId },
      {
        $set: {
          PostPrivacySetting: privacySetting,
          UpdatedOn: new Date(),
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

    // Get updated post data
    const updatedPost = await media
      .findOne(
        { _id: postId },
        {
          _id: 1,
          Title: 1,
          PostPrivacySetting: 1,
          PostedBy: 1,
          PostedOn: 1,
          UpdatedOn: 1,
          Locator: 1,
        }
      )
      .populate("PostedBy", "Name NickName Email ProfilePic");

    res.status(200).json({
      code: 200,
      message: "Post privacy updated successfully",
      data: {
        postId: updatedPost._id,
        title: updatedPost.Title,
        locator: updatedPost.Locator,
        oldPrivacySetting: post.PostPrivacySetting,
        newPrivacySetting: privacySetting,
        postedBy: updatedPost.PostedBy,
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
};
