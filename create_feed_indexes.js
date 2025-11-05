/**
 * Create database indexes for getUserMixedFeedPosts optimization
 * 
 * Run this script ONCE after deploying to production:
 * node create_feed_indexes.js
 * 
 * NOTE: Only run when the collections exist (after app has created them)
 */

const mongoose = require('mongoose');

const indexes = [
  // 1. Syncedposts indexes
  {
    collection: 'Syncedposts',
    indexes: [
      { keys: { CapsuleId: 1, IsDeleted: 1, Status: 1 }, name: 'capsule_active' },
      { keys: { PostId: 1, IsDeleted: 1, Status: 1 }, name: 'post_active' },
      { keys: { 'EmailEngineDataSets.Delivered': 1 }, name: 'delivered_status' },
      { keys: { CreatedOn: -1 }, name: 'created_desc' },
    ]
  },
  // 2. StreamLikes indexes
  {
    collection: 'StreamLikes',
    indexes: [
      { keys: { UserId: 1, IsDeleted: 1 }, name: 'user_active' },
      { keys: { SocialPostId: 1, IsDeleted: 1 }, name: 'post_active' },
      { keys: { SocialPostId: 1, UserId: 1, IsDeleted: 1 }, name: 'post_user_active' },
    ]
  },
  // 3. StreamComments indexes
  {
    collection: 'StreamComments',
    indexes: [
      { keys: { UserId: 1, IsDeleted: 1 }, name: 'user_active' },
      { keys: { SocialPostId: 1, IsDeleted: 1 }, name: 'post_active' },
      { keys: { SocialPostId: 1, UserId: 1, IsDeleted: 1 }, name: 'post_user_active' },
    ]
  },
  // 4. StreamCommentLikes indexes
  {
    collection: 'StreamCommentLikes',
    indexes: [
      { keys: { LikedById: 1, IsDeleted: 1 }, name: 'liker_active' },
      { keys: { CommentId: 1, IsDeleted: 1 }, name: 'comment_active' },
    ]
  },
  // 5. Capsules index (for owner lookup)
  {
    collection: 'Capsules',
    indexes: [
      { keys: { OwnerId: 1, IsDeleted: 1 }, name: 'owner_active' },
    ]
  }
];

async function createIndexes() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scrpt');
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const { collection, indexes: collIndexes } of indexes) {
      console.log(`\n📁 Collection: ${collection}`);
      
      // Check if collection exists
      const collections = await db.listCollections({ name: collection }).toArray();
      if (collections.length === 0) {
        console.log(`  ⚠️  Collection does not exist yet - skipping`);
        skipped += collIndexes.length;
        continue;
      }

      // Get existing indexes
      const existingIndexes = await db.collection(collection).indexes();
      const existingNames = existingIndexes.map(idx => idx.name);

      for (const { keys, name } of collIndexes) {
        try {
          if (existingNames.includes(name)) {
            console.log(`  ⏭️  ${name} - already exists`);
            skipped++;
          } else {
            await db.collection(collection).createIndex(keys, { name, background: true });
            console.log(`  ✅ ${name} - created`);
            created++;
          }
        } catch (error) {
          console.log(`  ❌ ${name} - failed: ${error.message}`);
          failed++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);

    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createIndexes();

