/**
 * Assign GroupTags to Media based on Prompt field
 * 
 * This script:
 * 1. Takes Media documents
 * 2. Gets Prompt field (comma-separated keywords)
 * 3. For each word in Prompt:
 *    - Find GroupTags where GroupTagTitle DIRECTLY matches (not Tags array)
 * 4. Store GroupTags array with only { GroupTagID, GroupTagTitle }
 * 
 * Usage:
 *   node server/scripts/assignPromptGroupTags.js --limit=1          # First 1 media
 *   node server/scripts/assignPromptGroupTags.js --limit=20         # First 20 media
 *   node server/scripts/assignPromptGroupTags.js --media-id=abc123  # Specific media
 *   node server/scripts/assignPromptGroupTags.js --dry-run          # Preview only
 *   node server/scripts/assignPromptGroupTags.js --all              # All media (careful!)
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
const SOURCE = getArg('source'); // Optional: filter by Source

// Validate arguments
if (!LIMIT && !MEDIA_ID && !PROCESS_ALL) {
  console.log(`
======================================================================
🏷️  Assign GroupTags to Media from Prompt Field
======================================================================

This script assigns GroupTags by matching each word in the Prompt field
against GroupTagTitle in the static index (NOT Tags array).

Usage:
  node server/scripts/assignPromptGroupTags.js --limit=1          # First 1 media
  node server/scripts/assignPromptGroupTags.js --limit=20         # First 20 media
  node server/scripts/assignPromptGroupTags.js --media-id=abc123  # Specific media
  node server/scripts/assignPromptGroupTags.js --dry-run          # Preview only
  node server/scripts/assignPromptGroupTags.js --admin-only       # Only admin uploads
  node server/scripts/assignPromptGroupTags.js --source=UnsplashImage_Tool
  node server/scripts/assignPromptGroupTags.js --all              # All media

Options:
  --limit=N       Process only N documents
  --media-id=ID   Process specific media document
  --dry-run       Preview changes without saving
  --admin-only    Only process UploadedBy: "admin"
  --source=X      Only process specific Source
  --all           Process all documents (requires explicit flag)

Example:
  node server/scripts/assignPromptGroupTags.js --limit=1 --dry-run
`);
  process.exit(0);
}

async function main() {
  console.log(`
======================================================================
🏷️  Assign GroupTags to Media from Prompt Field
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
  if (SOURCE) {
    console.log(`📊 Filter: Source = "${SOURCE}"`);
  }
  
  try {
    // Step 1: Load static tag index
    console.log(`\n📂 Step 1: Loading static tag index...`);
    await loadTagIndex();
    const stats = getStats();
    if (stats.loaded) {
      console.log(`   ✅ Loaded ${stats.uniqueTags?.toLocaleString() || 'N/A'} unique tags`);
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
    
    // Must have Prompt field
    query['Prompt'] = { $exists: true, $ne: '', $ne: null };
    
    if (MEDIA_ID) {
      query._id = MEDIA_ID;
    } else {
      query.IsDeleted = { $ne: 1 };
    }
    
    if (ADMIN_ONLY) {
      query.UploadedBy = "admin";
    }
    
    if (SOURCE) {
      query.Source = SOURCE;
    }
    
    // Get count
    const totalCount = await mediaCollection.countDocuments(query);
    console.log(`   📊 Found ${totalCount.toLocaleString()} media documents with Prompt`);
    
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
    let noPrompt = 0;
    let totalTagsAssigned = 0;
    const startTime = Date.now();
    
    // Process each document
    for await (const media of cursor) {
      processed++;
      
      const mediaId = media._id;
      const prompt = media.Prompt || '';
      
      if (!prompt || prompt.trim() === '') {
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
      
      console.log(`\n   ─────────────────────────────────────────`);
      console.log(`   📸 Processing Media: ${mediaId}`);
      console.log(`   📝 Prompt words: ${promptWords.length} words`);
      console.log(`   🏷️  Sample: [${promptWords.slice(0, 5).join(', ')}${promptWords.length > 5 ? ', ...' : ''}]`);
      
      // Build GroupTags array - only EXACT GroupTagTitle matches (case-insensitive)
      const groupTagsMap = new Map(); // Use map to avoid duplicates
      let matchedCount = 0;
      let notFoundCount = 0;
      
      for (const word of promptWords) {
        if (!word) continue;
        
        // Look up the word in static index
        const matches = lookupTag(word);
        
        if (matches && matches.length > 0) {
          // Filter for ONLY EXACT GroupTagTitle matches (case-insensitive)
          // tagType === "gt" means it's a GroupTagTitle match
          // AND groupTagTitle must exactly match the word (no compound words like "light-hearted")
          const gtMatches = matches.filter(m => 
            m.tagType === 'gt' && 
            m.groupTagTitle.toLowerCase().trim() === word.toLowerCase().trim()
          );
          
          if (gtMatches.length > 0) {
            matchedCount++;
            
            for (const match of gtMatches) {
              // Use GroupTagID as key to avoid duplicates
              if (!groupTagsMap.has(match.groupTagId)) {
                groupTagsMap.set(match.groupTagId, {
                  GroupTagID: match.groupTagId,
                  GroupTagTitle: match.groupTagTitle
                });
              }
            }
          } else {
            // Word exists in index but no exact GroupTagTitle match
            notFoundCount++;
          }
        } else {
          notFoundCount++;
        }
      }
      
      const groupTagsArray = Array.from(groupTagsMap.values());
      console.log(`   ✅ GroupTagTitle matches: ${matchedCount}/${promptWords.length} words`);
      console.log(`   📊 Unique GroupTags: ${groupTagsArray.length}`);
      
      if (notFoundCount > 0) {
        console.log(`   ⚠️ Words without GroupTagTitle match: ${notFoundCount}`);
      }
      
      // Show sample of what will be stored
      if (groupTagsArray.length > 0) {
        console.log(`   📋 Sample GroupTags:`);
        const sample = groupTagsArray.slice(0, 5);
        for (const entry of sample) {
          console.log(`      - "${entry.GroupTagTitle}" (${entry.GroupTagID})`);
        }
        if (groupTagsArray.length > 5) {
          console.log(`      ... and ${groupTagsArray.length - 5} more`);
        }
      }
      
      // Update the document
      if (!DRY_RUN && groupTagsArray.length > 0) {
        const result = await mediaCollection.updateOne(
          { _id: mediaId },
          { $set: { GroupTags: groupTagsArray } }
        );
        
        if (result.modifiedCount > 0 || result.matchedCount > 0) {
          updated++;
          totalTagsAssigned += groupTagsArray.length;
          console.log(`   💾 SAVED: ${groupTagsArray.length} GroupTags`);
        } else {
          console.log(`   ⚠️ Update result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
        }
      } else if (DRY_RUN) {
        console.log(`   📋 DRY RUN: Would save ${groupTagsArray.length} GroupTags`);
        totalTagsAssigned += groupTagsArray.length;
        if (groupTagsArray.length > 0) updated++;
      } else if (groupTagsArray.length === 0) {
        skipped++;
        console.log(`   ⏭️ Skipped: No GroupTagTitle matches found`);
      }
      
      // Progress
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      if (processed % 100 === 0 || processed === limit) {
        console.log(`   ⏱️ Progress: ${processed}/${limit || totalCount} | Rate: ${rate.toFixed(1)}/s`);
      }
    }
    
    // Summary
    const duration = (Date.now() - startTime) / 1000;
    console.log(`
======================================================================
📊 SUMMARY
======================================================================
   Media processed:        ${processed}
   Media updated:          ${updated}
   Media skipped:          ${skipped} (no GroupTagTitle matches)
   Media no prompt:        ${noPrompt}
   Total tags assigned:    ${totalTagsAssigned}
   Average tags/media:     ${updated > 0 ? (totalTagsAssigned / updated).toFixed(1) : 0}
   Duration:               ${duration.toFixed(2)}s
   Rate:                   ${(processed / duration).toFixed(1)} media/s
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

