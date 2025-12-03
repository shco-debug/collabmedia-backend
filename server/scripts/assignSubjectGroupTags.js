/**
 * Assign GroupTags to Media based on MetaData.Subjects ONLY
 * 
 * This script:
 * 1. Takes Media documents
 * 2. Gets MetaData.Subjects array
 * 3. For each subject word:
 *    a. Find GroupTags where GroupTagTitle matches
 *    b. Find GroupTags where any Tag.TagTitle matches
 * 4. Store minimal GroupTags array (only Subjects-based, ~10-30 items)
 * 
 * Usage:
 *   node server/scripts/assignSubjectGroupTags.js --limit=1          # First 1 media
 *   node server/scripts/assignSubjectGroupTags.js --limit=20         # First 20 media
 *   node server/scripts/assignSubjectGroupTags.js --media-id=abc123  # Specific media
 *   node server/scripts/assignSubjectGroupTags.js --dry-run          # Preview only
 *   node server/scripts/assignSubjectGroupTags.js --all              # All media (careful!)
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import the static tag loader
const { loadTagIndex, isLoaded, lookupTag, getStats } = require('../utilities/staticGroupTagsLoader');

// MongoDB connection string
const dbURI = process.env.MONGODB_URI || 
  "mongodb+srv://scrptoffice_db_user:hEllo%40911@collabmedia-scrpt.vnujj6f.mongodb.net/collabmedia?retryWrites=true&w=majority";

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const DRY_RUN = hasFlag('dry-run');
const LIMIT = getArg('limit') ? parseInt(getArg('limit')) : null;
const MEDIA_ID = getArg('media-id');
const PROCESS_ALL = hasFlag('all');
const ADMIN_ONLY = hasFlag('admin-only');

// Validate arguments
if (!LIMIT && !MEDIA_ID && !PROCESS_ALL) {
  console.log(`
======================================================================
🏷️  Assign Subject-Based GroupTags to Media
======================================================================

Usage:
  node server/scripts/assignSubjectGroupTags.js --limit=1          # First 1 media
  node server/scripts/assignSubjectGroupTags.js --limit=20         # First 20 media
  node server/scripts/assignSubjectGroupTags.js --media-id=abc123  # Specific media
  node server/scripts/assignSubjectGroupTags.js --dry-run          # Preview only
  node server/scripts/assignSubjectGroupTags.js --admin-only       # Only admin uploads
  node server/scripts/assignSubjectGroupTags.js --all              # All media

Options:
  --limit=N       Process only N documents
  --media-id=ID   Process specific media document
  --dry-run       Preview changes without saving
  --admin-only    Only process UploadedBy: "admin"
  --all           Process all documents (requires explicit flag)

Example:
  node server/scripts/assignSubjectGroupTags.js --limit=1 --dry-run
`);
  process.exit(0);
}

async function main() {
  console.log(`
======================================================================
🏷️  Assign Subject-Based GroupTags to Media
======================================================================`);
  
  if (DRY_RUN) {
    console.log(`📋 DRY RUN MODE - No changes will be saved`);
  }
  if (LIMIT) {
    console.log(`📊 Limit: Processing only ${LIMIT} documents`);
  }
  if (MEDIA_ID) {
    console.log(`📊 Processing specific media: ${MEDIA_ID}`);
  }
  if (ADMIN_ONLY) {
    console.log(`📊 Filter: UploadedBy = "admin"`);
  }
  
  try {
    // Step 1: Load static tag index
    console.log(`\n📂 Step 1: Loading static tag index...`);
    await loadTagIndex();
    const stats = getStats();
    if (stats.loaded) {
      console.log(`   ✅ Loaded ${stats.uniqueTags?.toLocaleString() || 'N/A'} unique tags, ${stats.totalMappings?.toLocaleString() || 'N/A'} mappings`);
    } else {
      console.log(`   ⚠️ Stats not available, but index is loaded`);
    }
    
    // Step 2: Connect to MongoDB
    console.log(`\n🔌 Step 2: Connecting to MongoDB...`);
    await mongoose.connect(dbURI);
    console.log(`   ✅ Connected to MongoDB`);
    
    const db = mongoose.connection.db;
    const mediaCollection = db.collection('media');
    
    // Step 3: Build query
    console.log(`\n🔍 Step 3: Finding media to process...`);
    
    let query = {};
    
    // Must have MetaData.Subjects
    query['MetaData.Subjects'] = { $exists: true, $ne: [] };
    
    if (MEDIA_ID) {
      query._id = MEDIA_ID;
    } else {
      query.IsDeleted = { $ne: 1 };
    }
    
    if (ADMIN_ONLY) {
      query.UploadedBy = "admin";
    }
    
    // Get count
    const totalCount = await mediaCollection.countDocuments(query);
    console.log(`   📊 Found ${totalCount.toLocaleString()} media documents with Subjects`);
    
    if (totalCount === 0) {
      console.log(`   ⚠️ No media documents found matching criteria`);
      await mongoose.disconnect();
      return;
    }
    
    // Step 4: Process media
    console.log(`\n🚀 Step 4: Processing media...`);
    
    const limit = LIMIT || (PROCESS_ALL ? 0 : 1);
    const cursor = mediaCollection.find(query);
    if (limit > 0) {
      cursor.limit(limit);
    }
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let totalTagsAssigned = 0;
    const startTime = Date.now();
    
    // Process each document
    for await (const media of cursor) {
      processed++;
      
      const mediaId = media._id;
      const subjects = media.MetaData?.Subjects || [];
      
      if (subjects.length === 0) {
        skipped++;
        continue;
      }
      
      console.log(`\n   ─────────────────────────────────────────`);
      console.log(`   📸 Processing Media: ${mediaId}`);
      console.log(`   📝 Title: ${media.Title || 'Untitled'}`);
      console.log(`   🏷️  Subjects: [${subjects.join(', ')}]`);
      
      // Build GroupTags array
      const groupTagsMap = new Map(); // Use map to avoid duplicates
      
      for (const subject of subjects) {
        const subjectLower = subject.toLowerCase().trim();
        if (!subjectLower) continue;
        
        // Look up the subject in static index
        const matches = lookupTag(subjectLower);
        
        if (matches && matches.length > 0) {
          console.log(`      🔍 "${subject}" → Found ${matches.length} GroupTag matches`);
          
          for (const match of matches) {
            // Create unique key to avoid duplicates
            const key = `${match.groupTagId}_${match.tagId || 'gt'}`;
            
            if (!groupTagsMap.has(key)) {
              const entry = {
                GroupTagID: match.groupTagId,
                GroupTagTitle: match.groupTagTitle,
                TagID: match.tagId || null,
                TagTitle: match.tagTitle || null,
                TagType: match.tagType || 'gt',
                MatchedFrom: subject
              };
              groupTagsMap.set(key, entry);
            }
          }
        } else {
          console.log(`      ⚠️ "${subject}" → No matches found`);
        }
      }
      
      const groupTagsArray = Array.from(groupTagsMap.values());
      console.log(`   ✅ Total GroupTags to assign: ${groupTagsArray.length}`);
      
      // Show sample of what will be stored
      if (groupTagsArray.length > 0) {
        console.log(`   📋 Sample entries:`);
        const sample = groupTagsArray.slice(0, 3);
        for (const entry of sample) {
          if (entry.TagID) {
            console.log(`      - GroupTag: "${entry.GroupTagTitle}" → Tag: "${entry.TagTitle}" (${entry.TagType})`);
          } else {
            console.log(`      - GroupTag: "${entry.GroupTagTitle}" (direct match)`);
          }
        }
        if (groupTagsArray.length > 3) {
          console.log(`      ... and ${groupTagsArray.length - 3} more`);
        }
      }
      
      // Update the document
      if (!DRY_RUN && groupTagsArray.length > 0) {
        // Debug: Check current state
        const beforeDoc = await mediaCollection.findOne({ _id: mediaId }, { projection: { GroupTags: 1 } });
        console.log(`   🔍 Before update: GroupTags length = ${beforeDoc?.GroupTags?.length || 0}`);
        
        const result = await mediaCollection.updateOne(
          { _id: mediaId },
          { $set: { GroupTags: groupTagsArray } }
        );
        
        console.log(`   📊 Update result: matched=${result.matchedCount}, modified=${result.modifiedCount}, acknowledged=${result.acknowledged}`);
        
        // Verify after update
        const afterDoc = await mediaCollection.findOne({ _id: mediaId }, { projection: { GroupTags: 1 } });
        console.log(`   🔍 After update: GroupTags length = ${afterDoc?.GroupTags?.length || 0}`);
        
        if (afterDoc?.GroupTags?.length > 0) {
          updated++;
          totalTagsAssigned += afterDoc.GroupTags.length;
          console.log(`   💾 SAVED: ${afterDoc.GroupTags.length} GroupTags`);
        } else {
          console.log(`   ⚠️ Update failed - GroupTags still empty!`);
        }
      } else if (DRY_RUN) {
        console.log(`   📋 DRY RUN: Would save ${groupTagsArray.length} GroupTags`);
        totalTagsAssigned += groupTagsArray.length;
        updated++;
      }
      
      // Progress
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      console.log(`   ⏱️ Progress: ${processed}/${limit || totalCount} | Rate: ${rate.toFixed(1)}/s`);
    }
    
    // Summary
    const duration = (Date.now() - startTime) / 1000;
    console.log(`
======================================================================
📊 SUMMARY
======================================================================
   Media processed:        ${processed}
   Media updated:          ${updated}
   Media skipped:          ${skipped}
   Total tags assigned:    ${totalTagsAssigned}
   Average tags/media:     ${updated > 0 ? (totalTagsAssigned / updated).toFixed(1) : 0}
   Duration:               ${duration.toFixed(2)}s
   ${DRY_RUN ? '⚠️ DRY RUN - No actual changes made' : ''}
======================================================================
`);
    
    // Disconnect
    await mongoose.disconnect();
    console.log(`🔌 Disconnected from MongoDB`);
    
  } catch (error) {
    console.error(`\n❌ Error:`, error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
main();

