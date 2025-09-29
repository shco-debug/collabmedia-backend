const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/collabmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define schemas
const groupTagSchema = new mongoose.Schema({
  GroupTagID: {type: String, ref: 'groupTags'},
  GroupTagTitle: {type: String}, // Add this field for fast search
  MetaMetaTagID: {type: String, ref: 'groupTags'},
  MetaTagID: {type: String, ref: 'groupTags'},
});

const mediaSchema = new mongoose.Schema({
  Location: [{
    Size: {type: String},
    URL: {type: String}
  }],
  UploadedBy: {type: String},
  UploadedOn: {type: Date, default: Date.now},
  UploaderID: {type: String},
  Notes: {type: String},
  Source: {type: String},
  SourceUniqueID: {type: mongoose.Schema.Types.ObjectId, ref: 'Sources'},
  MetaMetaTags: {type: mongoose.Schema.Types.ObjectId, ref: 'metaMetaTags'},
  MetaTags: {type: String},
  Domains: {type: mongoose.Schema.Types.ObjectId, ref: 'Domains'},
  GroupTags: [groupTagSchema], // Updated schema with GroupTagTitle
  Collection: [{type: String, ref: 'Collections'}],
  Prompt: {type: String},
  Title: {type: String},
  Locator: {type: String, unique: true},
  Status: {type: Number, default: 0},
  AddedWhere: {type: String},
  TagType: {type: String},
  AddedHow: {type: String},
  IsDeleted: {type: Number},
  Content: {type: String},
  MediaType: {type: String},
  IsUnsplashImage: {type: Boolean, default: false},
  IsSpeechToTextDone: {type: Boolean, default: false},
  UnsplashPhotoId: {type: String},
  ContentType: {type: String},
  ViewsCount: {type: Number},
  Views: {type: Object},
  Selects: {type: Object},
  Posts: {type: Object},
  Marks: {type: Object},
  Stamps: {type: Object},
  UserScore: {type: Number},
  OwnerFSGs: {type: Object},
  thumbnail: {type: String},
  WebThumbnail: {type: String},
  IsPrivate: {type: Number, default: 0},
  AutoId: {type: Number, unique: true},
  Photographer: {type: String},
  LinkType: {type: String},
  OwnStatement: {type: String},
  CurrStatement: {type: String},
  Statements: [{
    Statement: {type: String},
    DateAdded: {type: Date, default: Date.now},
    AddedBy: {type: String}
  }],
  InAppropFlagCount: {type: Number, default: 0},
  RandomSortId: {type: String, default: require('shortid').generate, index: true},
  RandomSortId_UpdatedOn: {type: String, default: Date.now},
  StyleKeyword: {type: String},
  Lightness: {type: String, default: "0"},
  DominantColors: {type: String, default: ""},
  MetaData: {type: Object},
  BlendSettings: {type: Object},
  PostedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null},
  PostedOn: {type: Date, default: null},
  UpdatedOn: {type: Date, default: null},
  Origin: {type: String, enum: ["Move", "Copy"], default: null},
  OriginatedFrom: {type: mongoose.Schema.Types.ObjectId, default: null},
  OriginalPostId: {type: mongoose.Schema.Types.ObjectId, default: null},
  PostPrivacySetting: {type: String, enum: ["PublicWithName", "PublicWithoutName", "OnlyForOwner", "InvitedFriends"], default: null},
  PostType: {type: String, enum: [null, "AdPost", "BroadcastPost", "KeyPost", "GeneralPost", "Post", "QuestionPost", "AnswerPost", "InfoPost", "InfoPostOwner"], default: "Post"},
  KeyPostType: {type: String, enum: ["Comment", "Post", "Recording", "CommentFromFriend"], default: "Comment"},
  IsPreLaunchPost: {type: Boolean, default: false},
  IsPrivateQuestionPost: {type: Boolean, default: false},
  IsOnetimeStream: {type: Boolean, default: false}
}, {shardKey: {_id: 1}}, {collection: 'media'});

const groupTagsSchema = new mongoose.Schema({
  GroupTagTitle: {type: String, required: true},
  Notes: {type: String},
  MetaMetaTagID: {type: mongoose.Schema.Types.ObjectId, ref: 'metaMetaTags'},
  MetaTagID: {type: String},
  More: [{
    GroupTagId: {type: String},
    GroupTagName: {type: String}
  }],
  Less: [{
    GroupTagId: {type: String},
    GroupTagName: {type: String}
  }],
  Think: [{
    GroupTagId: {type: String},
    GroupTagName: {type: String}
  }],
  Tags: [{
    TagTitle: {type: String, required: true},
    TagType: {type: String},
    DateAdded: {type: Date, default: Date.now},
    LastModified: {type: Date, default: Date.now},
    gtTitle: {type: String},
    gtId: {type: String},
    status: {type: Number}
  }],
  DateAdded: {type: Date, default: Date.now},
  LastModified: {type: Date, default: Date.now},
  MediaCount: {type: Number, default: 0},
  PostMediaCount: {type: Number, default: 0},
  SuggestedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
  status: {type: Number},
  AddedFrom: {type: String, default: null},
  IsExistsOnExcel: {type: Boolean, default: false}
}, {collection: 'groupTags'});

// Create models
const Media = mongoose.model('Media', mediaSchema);
const GroupTags = mongoose.model('GroupTags', groupTagsSchema);

async function updateMediaGroupTags() {
  try {
    console.log('🚀 Starting GroupTags update process...');
    
    // Get all media documents that have GroupTags
    const mediaWithGroupTags = await Media.find({
      GroupTags: { $exists: true, $ne: [] }
    }).select('_id GroupTags');
    
    console.log(`📊 Found ${mediaWithGroupTags.length} media documents with GroupTags`);
    
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each media document
    for (const media of mediaWithGroupTags) {
      try {
        console.log(`\n🔄 Processing media ${media._id}...`);
        
        let hasUpdates = false;
        const updatedGroupTags = [];
        
        // Process each GroupTag in the media document
        for (const groupTag of media.GroupTags) {
          if (groupTag.GroupTagID && !groupTag.GroupTagTitle) {
            console.log(`  🔍 Looking up GroupTagTitle for GroupTagID: ${groupTag.GroupTagID}`);
            
            // Find the corresponding GroupTag document
            const groupTagDoc = await GroupTags.findById(groupTag.GroupTagID);
            
            if (groupTagDoc) {
              console.log(`  ✅ Found GroupTagTitle: "${groupTagDoc.GroupTagTitle}"`);
              
              // Add GroupTagTitle to the GroupTag
              updatedGroupTags.push({
                ...groupTag.toObject(),
                GroupTagTitle: groupTagDoc.GroupTagTitle
              });
              
              hasUpdates = true;
            } else {
              console.log(`  ⚠️ GroupTag not found for ID: ${groupTag.GroupTagID}`);
              updatedGroupTags.push(groupTag.toObject());
            }
          } else {
            // Keep existing GroupTag as is
            updatedGroupTags.push(groupTag.toObject());
          }
        }
        
        // Update the media document if there were changes
        if (hasUpdates) {
          await Media.updateOne(
            { _id: media._id },
            { $set: { GroupTags: updatedGroupTags } }
          );
          
          console.log(`  ✅ Updated media ${media._id} with GroupTagTitles`);
          updatedCount++;
        } else {
          console.log(`  ℹ️ No updates needed for media ${media._id}`);
        }
        
        processedCount++;
        
        // Progress indicator
        if (processedCount % 10 === 0) {
          console.log(`📈 Progress: ${processedCount}/${mediaWithGroupTags.length} processed`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing media ${media._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Update process completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Total media processed: ${processedCount}`);
    console.log(`  - Media updated: ${updatedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    // Test the update by running a sample query
    console.log('\n🧪 Testing the update...');
    
    const testMedia = await Media.findOne({
      'GroupTags.GroupTagTitle': { $exists: true }
    }).select('_id GroupTags');
    
    if (testMedia) {
      console.log('✅ Test successful! Found media with GroupTagTitle:');
      console.log(JSON.stringify(testMedia.GroupTags, null, 2));
    } else {
      console.log('⚠️ No media found with GroupTagTitle - update may not have worked');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the update
updateMediaGroupTags();
