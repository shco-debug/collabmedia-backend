/**
 * Cron Job: Assign GroupTags to Media based on Metadata
 * 
 * This script:
 * 1. Loads the static tag index (with word-based matching)
 * 2. Fetches Media documents with metadata
 * 3. For each metadata value (Subjects, Metaphors, Verbs, Feelings, Adjectives)
 * 4. Looks up in static index to find ALL matching GroupTags (including word-based matches)
 * 5. Assigns GroupTags entries to the Media document
 * 
 * Usage: 
 *   node --max-old-space-size=4096 server/scripts/assignGroupTagsToMedia.js
 * 
 * Options:
 *   --dry-run     : Preview only, don't update database
 *   --limit=N     : Process only N media documents
 *   --all         : Process all media (including those with existing GroupTags)
 *   --batch=N     : Batch size for bulk updates (default: 100)
 *   --media-id=X  : Process only a specific media document by ID
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collabmedia';

// Import the static tag loader
const { 
  loadTagIndex, 
  lookupTag,
  isLoaded
} = require('../utilities/staticGroupTagsLoader');

// Import Media model
const Media = require('../models/mediaModel');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const processAll = args.includes('--all');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const batchArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 100;
const mediaIdArg = args.find(a => a.startsWith('--media-id='));
const specificMediaId = mediaIdArg ? mediaIdArg.split('=')[1] : null;
const adminOnly = args.includes('--admin-only');
const sourceArg = args.find(a => a.startsWith('--source='));
const sourceFilter = sourceArg ? sourceArg.split('=')[1].split(',') : null;

// Metadata fields to process
const METADATA_FIELDS = [
  { field: 'Subjects', path: 'MetaData.Subjects' },
  { field: 'Metaphors', path: 'MetaData.Metaphors' },
  { field: 'Verbs', path: 'MetaData.Verbs' },
  { field: 'Feelings', path: 'MetaData.Feelings' },
  { field: 'Adjectives', path: 'MetaData.Adjectives' },
  { field: 'Attributes', path: 'MetaData.Attributes' },
  { field: 'Synonyms', path: 'MetaData.Synonyms' },
  { field: 'Concepts', path: 'MetaData.Concepts' }
];

/**
 * Build GroupTag entries for a media document based on its metadata
 * @param {Object} mediaDoc - The media document with MetaData
 * @returns {Array} Array of GroupTag entries to assign
 */
function buildGroupTagsForMedia(mediaDoc) {
  const newGroupTags = [];
  const seenKeys = new Set(); // Prevent duplicates

  // Get existing GroupTags (if any) and add to seen set
  const existingGroupTags = Array.isArray(mediaDoc.GroupTags) ? mediaDoc.GroupTags : [];
  for (const existing of existingGroupTags) {
    if (existing.GroupTagID && existing.TagID) {
      const key = `${existing.GroupTagID}:${existing.TagID}`;
      seenKeys.add(key);
      newGroupTags.push(existing);
    }
  }

  let newEntriesCount = 0;

  // Process each metadata field
  for (const { field, path: fieldPath } of METADATA_FIELDS) {
    const values = mediaDoc.MetaData?.[field];
    if (!Array.isArray(values)) continue;

    for (const value of values) {
      if (!value || typeof value !== 'string') continue;

      const trimmedValue = value.trim().toLowerCase();
      if (!trimmedValue) continue;

      // Lookup in static index (includes word-based matches)
      const matches = lookupTag(trimmedValue);

      for (const match of matches) {
        const key = `${match.groupTagId}:${match.tagId}`;
        
        // Skip if already exists
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        // Create GroupTag entry
        newGroupTags.push({
          GroupTagID: match.groupTagId,
          GroupTagTitle: match.groupTagTitle,
          TagID: match.tagId,
          TagTitle: match.tagTitle,
          TagType: match.tagType,
          MatchedFrom: fieldPath,
          MatchedValue: value.trim() // The original metadata value that matched
        });

        newEntriesCount++;
      }
    }
  }

  return {
    groupTags: newGroupTags,
    existingCount: existingGroupTags.length,
    newCount: newEntriesCount,
    totalCount: newGroupTags.length
  };
}

/**
 * Main function to assign GroupTags to media
 */
async function assignGroupTagsToMedia() {
  console.log('='.repeat(70));
  console.log('🏷️  Assign GroupTags to Media - Cron Job');
  console.log('='.repeat(70));
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
  }
  if (limit) {
    console.log(`📊 Limit: Processing only ${limit} documents`);
  }
  if (specificMediaId) {
    console.log(`📊 Processing specific media: ${specificMediaId}`);
  }
  if (processAll) {
    console.log('📊 Processing ALL media (including those with existing GroupTags)');
  }
  if (adminOnly) {
    console.log('📊 Filter: UploadedBy = "admin"');
  }
  if (sourceFilter) {
    console.log(`📊 Filter: Source in [${sourceFilter.join(', ')}]`);
  }
  console.log(`📊 Batch size: ${batchSize}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Step 1: Load the static tag index
    console.log('📂 Step 1: Loading static tag index...');
    await loadTagIndex();
    
    if (!isLoaded()) {
      throw new Error('Failed to load tag index');
    }
    console.log('');

    // Step 2: Connect to MongoDB
    console.log('🔌 Step 2: Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Step 3: Build query for media to process
    console.log('🔍 Step 3: Finding media to process...');
    
    let query = {};

    // If specific media ID is provided, don't filter by IsDeleted
    if (specificMediaId) {
      query._id = specificMediaId;  // Use STRING _id directly (Media uses string IDs)
    } else {
      // Only filter non-deleted for bulk processing
      query.IsDeleted = { $ne: 1 };
      // Must have MetaData with at least one of our target fields
      query.$or = METADATA_FIELDS.map(f => ({
        [f.path]: { $exists: true, $ne: [], $type: 'array' }
      }));

      // If not processing all, only get media with empty/missing GroupTags
      if (!processAll) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { GroupTags: { $exists: false } },
            { GroupTags: [] },
            { GroupTags: null }
          ]
        });
      }

      // Filter by UploadedBy = "admin"
      if (adminOnly) {
        query.UploadedBy = "admin";
      }

      // Filter by Source
      if (sourceFilter && sourceFilter.length > 0) {
        query.Source = { $in: sourceFilter };
      }
    }

    // Debug: Log the query being used
    console.log('🔍 Query:', JSON.stringify(query, null, 2));
    
    // Count total using native collection (Media uses STRING _id)
    const collection = mongoose.connection.db.collection('media');
    const totalCount = await collection.countDocuments(query);
    console.log(`📊 Found ${totalCount.toLocaleString()} media documents to process`);
    
    if (totalCount === 0) {
      console.log('✅ No media to process. Exiting.');
      await mongoose.disconnect();
      return;
    }

    // Step 4: Process media in batches
    console.log('');
    console.log('🚀 Step 4: Processing media...');
    console.log('');
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let totalTagsAssigned = 0;
    let errors = 0;

    // Build native MongoDB cursor (reusing collection from count step)
    let nativeCursor = collection.find(query)
      .project({ _id: 1, MetaData: 1, GroupTags: 1, UploadedBy: 1, Source: 1 });
    
    if (limit) {
      nativeCursor = nativeCursor.limit(limit);
    }

    for await (const mediaDoc of nativeCursor) {
      try {
        processed++;
        
        // Debug: Log first few documents
        if (processed <= 3) {
          console.log(`   🔍 Doc ${processed}: ID=${mediaDoc._id} (type: ${typeof mediaDoc._id}), UploadedBy=${mediaDoc.UploadedBy}, Source=${mediaDoc.Source}`);
        }

        // Build GroupTags for this media
        const result = buildGroupTagsForMedia(mediaDoc);

        // Only update if we added new tags
        if (result.newCount > 0) {
          if (!isDryRun) {
            // Use native driver with STRING _id
            try {
              const updateResult = await collection.updateOne(
                { _id: mediaDoc._id },  // _id is STRING from native driver
                { $set: { GroupTags: result.groupTags } }
              );
              
              if (updateResult.modifiedCount > 0) {
                if (updated < 3) {
                  console.log(`   ✅ Updated media ${mediaDoc._id} with ${result.newCount} tags`);
                }
              } else {
                console.log(`   ⚠️ No match for media ${mediaDoc._id}`);
              }
            } catch (updateError) {
              console.error(`   ❌ Update error for ${mediaDoc._id}: ${updateError.message}`);
              errors++;
            }
          }
          updated++;
          totalTagsAssigned += result.newCount;
        } else {
          skipped++;
        }

        // Progress logging
        if (processed % 100 === 0 || processed === totalCount || processed === (limit || totalCount)) {
          const pct = ((processed / (limit || totalCount)) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (processed / ((Date.now() - startTime) / 1000)).toFixed(1);
          console.log(`   📝 Processed: ${processed.toLocaleString()} (${pct}%) | Updated: ${updated.toLocaleString()} | Tags: ${totalTagsAssigned.toLocaleString()} | Rate: ${rate}/s | Time: ${elapsed}s`);
        }
      } catch (docError) {
        errors++;
        console.error(`   ❌ Error processing media ${mediaDoc._id}: ${docError.message}`);
      }
    }

    // Direct updates are done in the loop, no need for bulkWrite

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log('='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Media processed:        ${processed.toLocaleString()}`);
    console.log(`   Media updated:          ${updated.toLocaleString()}`);
    console.log(`   Media skipped:          ${skipped.toLocaleString()} (no new tags found)`);
    console.log(`   Errors:                 ${errors.toLocaleString()}`);
    console.log(`   Total tags assigned:    ${totalTagsAssigned.toLocaleString()}`);
    console.log(`   Duration:               ${duration}s`);
    console.log(`   Average rate:           ${(processed / parseFloat(duration)).toFixed(1)} media/s`);
    
    if (isDryRun) {
      console.log('');
      console.log('⚠️  DRY RUN - No changes were made to the database');
      console.log('   Run without --dry-run to apply changes');
    }

    console.log('='.repeat(70));

    return {
      processed,
      updated,
      skipped,
      errors,
      totalTagsAssigned,
      duration: parseFloat(duration)
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

/**
 * Export for use as a module (e.g., from cron job controller)
 */
module.exports = {
  assignGroupTagsToMedia,
  buildGroupTagsForMedia
};

// Run if called directly
if (require.main === module) {
  assignGroupTagsToMedia().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
