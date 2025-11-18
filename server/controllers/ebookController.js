const ebookUtils = require('../utilities/ebookUtils');
const Media = require('../models/mediaModel');
const SyncedPost = require('../models/syncedpostModel');
const mongoose = require('mongoose');

/**
 * Helper function to get date incremented by number of days from created date
 * @param {Number} noOfDays - Number of days to add
 * @param {Number} createdOn - Timestamp of creation
 * @returns {Date} Incremented date
 */
function getDateIncrementedBy_CreatedOn(noOfDays, createdOn) {
  const date = new Date(createdOn);
  date.setDate(date.getDate() + noOfDays);
  return date;
}

/**
 * Create an e-book post for a stream
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Expected req.body:
 * - CapsuleId: Stream ID
 * - PageId: Page ID (optional, will create if not provided)
 * - ebookId: E-book ID from static data
 * - PostStatement: Optional text description
 * - Title: Post title (optional, defaults to e-book title)
 * - ReceiverEmails: Array of email addresses to send to
 * - EmailEngineDataSets: Array of email delivery schedules
 */
var createEbookPost = async function(req, res) {
  try {
    const CapsuleId = req.body.CapsuleId;
    const ebookId = req.body.ebookId;
    const PostStatement = req.body.PostStatement || '';
    const Title = req.body.Title || '';
    const ReceiverEmails = req.body.ReceiverEmails || [];
    const EmailEngineDataSets = req.body.EmailEngineDataSets || [];
    
    if (!CapsuleId || !ebookId) {
      return res.json({
        code: 400,
        message: "CapsuleId and ebookId are required"
      });
    }
    
    // Get e-book metadata from static data
    const ebookMetadata = ebookUtils.getEbookMetadata(ebookId);
    if (!ebookMetadata) {
      return res.json({
        code: 404,
        message: "E-book not found in static data"
      });
    }
    
    // Validate e-book file exists
    if (!ebookUtils.validateEbookExists(ebookMetadata.fileName)) {
      return res.json({
        code: 404,
        message: "E-book file not found in public folder"
      });
    }
    
    // Generate e-book URL
    const baseUrl = req.protocol + '://' + req.get('host');
    const ebookUrl = ebookUtils.generateEbookUrl(ebookMetadata.fileName, baseUrl);
    
    // Get user from session (with safety check)
    if (!req.session || !req.session.user || !req.session.user._id) {
      return res.json({
        code: 401,
        message: "User session not found. Please login to continue."
      });
    }
    const userId = req.session.user._id;
    
    // Create Media entry for the e-book post
    const mediaData = {
      MediaType: "Link", // Using Link type with LinkType: "E-book"
      LinkType: "E-book",
      Title: Title || ebookMetadata.title,
      Prompt: PostStatement || ebookMetadata.description || '',
      PostStatement: PostStatement || ebookMetadata.description || '',
      Location: [{
        Size: "original",
        URL: ebookUrl
      }],
      PostedBy: userId,
      PostedOn: new Date(),
      UpdatedOn: new Date(),
      UploadedBy: "user",
      StreamId: CapsuleId, // Link the e-book post to the stream/capsule
      IsAddedFromStream: true, // Mark that this post is from a stream
      MetaData: {
        ebookId: ebookId,
        ebookTitle: ebookMetadata.title,
        ebookAuthor: ebookMetadata.author || '',
        ebookDescription: ebookMetadata.description || '',
        ebookFileName: ebookMetadata.fileName,
        ebookFormat: ebookMetadata.format || 'pdf',
        ebookPages: ebookMetadata.pages || null,
        ebookIsbn: ebookMetadata.isbn || null
      },
      PostPrivacySetting: req.body.PostPrivacySetting || "PublicWithName",
      PostType: "Post"
    };
    
    const savedMedia = await Media(mediaData).save();
    
    // Get or create Page
    let PageId = req.body.PageId;
    if (!PageId) {
      // Create a page for this e-book post
      const Chapter = require('../models/chapterModel');
      const Page = require('../models/pageModel');
      
      // Get first chapter of the capsule
      const Capsule = require('../models/capsuleModel');
      const capsule = await Capsule.findById(CapsuleId);
      
      if (!capsule || !capsule.Chapters || capsule.Chapters.length === 0) {
        return res.json({
          code: 404,
          message: "Capsule has no chapters"
        });
      }
      
      const firstChapterId = capsule.Chapters[0];
      const chapter = await Chapter.findById(firstChapterId);
      
      if (!chapter) {
        return res.json({
          code: 404,
          message: "Chapter not found"
        });
      }
      
      // Create page
      const pageData = {
        CreaterId: userId,
        OwnerId: capsule.OwnerId,
        ChapterId: firstChapterId,
        Title: Title || ebookMetadata.title,
        PageType: "content",
        Order: chapter.pages ? chapter.pages.length : 0,
        Origin: "created",
        Medias: [savedMedia._id],
        CreatedOn: Date.now(),
        UpdatedOn: Date.now()
      };
      
      const savedPage = await Page(pageData).save();
      PageId = savedPage._id;
      
      // Add page to chapter
      if (!chapter.pages) {
        chapter.pages = [];
      }
      chapter.pages.push(PageId);
      await chapter.save();
    }
    
    // Create SyncedPost entry only if email delivery is needed
    // E-book posts are fetched via getCapsulePosts using Chapters → Pages → Media hierarchy
    const CreatedOn = Date.now();
    
    // Only create SyncedPost if email delivery is needed
    if (EmailEngineDataSets.length > 0 && ReceiverEmails.length > 0) {
      // Process EmailEngineDataSets similar to streamPost_withEmailSync_v2
      for (let i = 0; i < EmailEngineDataSets.length; i++) {
        const emailDataSet = EmailEngineDataSets[i];
        const NoOfDays = parseInt(emailDataSet.AfterDays) || 0;
        
        const syncedPostData = {
          PageId: PageId,
          PostId: savedMedia._id,
          PostImage: '', // E-books don't have images
          PostStatement: PostStatement || ebookMetadata.description || '',
          PostOwnerId: req.body.PostOwnerId || null,
          ReceiverEmails: ReceiverEmails,
          CapsuleId: CapsuleId,
          SyncedBy: userId,
          IsSurpriseCase: false,
          IsPageStreamCase: true,
          EmailTemplate: req.body.EmailTemplate || "PracticalThinker",
          Status: req.body.IsStreamPaused ? 0 : 1,
          CreatedOn: CreatedOn,
          EmailSubject: req.body.EmailSubject || null,
          IsOnetimeStream: req.body.IsOnetimeStream || false,
          IsOnlyPostImage: req.body.IsOnlyPostImage || false,
          EmailEngineDataSets: [{
            Delivered: false,
            DateOfDelivery: getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn),
            VisualUrls: [], // E-books don't have visual URLs
            TextAboveVisual: emailDataSet.TextAboveVisual || '',
            TextBelowVisual: emailDataSet.TextBelowVisual || '',
            SoundFileUrl: emailDataSet.SoundFileUrl || null,
            BlendMode: "hard-light",
            SelectedKeywords: emailDataSet.SelectedKeywords || [],
            AfterDays: NoOfDays,
            EbookUrl: ebookUrl, // Add e-book URL to email data
            EbookTitle: ebookMetadata.title
          }]
        };
        
        await SyncedPost(syncedPostData).save();
      }
    }
    // Note: E-book posts are stored in Media collection and can be fetched via getCapsulePosts
    // using the Chapters → Pages → Media hierarchy (no SyncedPost needed for basic display)
    
    return res.json({
      code: 200,
      message: "E-book post created successfully",
      result: {
        mediaId: savedMedia._id,
        pageId: PageId,
        ebookUrl: ebookUrl,
        ebookMetadata: ebookMetadata
      }
    });
    
  } catch (error) {
    console.error('Error creating e-book post:', error);
    return res.json({
      code: 500,
      message: "Error creating e-book post",
      error: error.message
    });
  }
};

module.exports = {
  createEbookPost
};

