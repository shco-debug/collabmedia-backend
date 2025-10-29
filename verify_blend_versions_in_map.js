const mongoose = require('mongoose');
require('dotenv').config();

const CAPSULE_ID = '68ff6459d4625f0cb45c9e38';
const SAMPLE_POST_ID = '68fc1008446b78142c1c9e4f'; // The post you showed with 4 versions

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/scrpt';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
  console.log('✅ Connected to MongoDB\n');

  const SyncedpostsMap = mongoose.model('SyncedpostsMap', new mongoose.Schema({
    CapsuleId: mongoose.Schema.Types.ObjectId,
    SyncedPosts: Array,
    IsDeleted: Boolean
  }, { collection: 'SyncedpostsMap' }));

  console.log('🔍 Fetching SyncedpostsMap...\n');
  
  const map = await SyncedpostsMap.findOne({
    CapsuleId: new mongoose.Types.ObjectId(CAPSULE_ID),
    IsDeleted: false
  }).lean();

  if (!map || !map.SyncedPosts) {
    console.log('❌ No SyncedpostsMap found');
    process.exit(0);
  }

  console.log(`📦 Total entries in SyncedpostsMap: ${map.SyncedPosts.length}\n`);

  // Find all entries for the sample post
  const samplePostEntries = map.SyncedPosts.filter(post => 
    post.PostId && post.PostId.toString() === SAMPLE_POST_ID
  );

  console.log(`🎯 Found ${samplePostEntries.length} entries for PostId: ${SAMPLE_POST_ID}\n`);
  console.log('━'.repeat(100));

  if (samplePostEntries.length === 0) {
    console.log('No entries found for this PostId');
    process.exit(0);
  }

  // Display first 10 entries with their visual URLs
  console.log('\n📋 First 10 Entries - Checking if VisualUrls are DIFFERENT:\n');
  
  const displayCount = Math.min(10, samplePostEntries.length);
  const uniqueVisualCombinations = new Set();
  
  for (let i = 0; i < displayCount; i++) {
    const entry = samplePostEntries[i];
    const emailSet = entry.EmailEngineDataSets?.[0];
    
    if (emailSet && emailSet.VisualUrls && emailSet.VisualUrls.length === 2) {
      const visual1 = emailSet.VisualUrls[0];
      const visual2 = emailSet.VisualUrls[1];
      const blendMode = emailSet.BlendMode || 'N/A';
      const afterDays = emailSet.AfterDays || 'N/A';
      
      // Extract just the filename for readability
      const file1 = visual1.split('/').pop().substring(0, 30);
      const file2 = visual2.split('/').pop().substring(0, 30);
      
      // Track unique combinations
      const combo = `${visual1}|${visual2}`;
      uniqueVisualCombinations.add(combo);
      
      console.log(`Entry ${i + 1}:`);
      console.log(`  AfterDays: ${afterDays}`);
      console.log(`  BlendMode: ${blendMode}`);
      console.log(`  Visual 1:  ${file1}...`);
      console.log(`  Visual 2:  ${file2}...`);
      console.log('');
    } else {
      console.log(`Entry ${i + 1}: No VisualUrls found\n`);
    }
  }

  console.log('━'.repeat(100));
  console.log(`\n📊 Analysis of ALL ${samplePostEntries.length} entries:\n`);

  // Analyze ALL entries
  const allVisualCombos = new Map();
  const blendModes = {};
  
  samplePostEntries.forEach((entry, index) => {
    const emailSet = entry.EmailEngineDataSets?.[0];
    if (emailSet && emailSet.VisualUrls && emailSet.VisualUrls.length === 2) {
      const visual1 = emailSet.VisualUrls[0].split('/').pop();
      const visual2 = emailSet.VisualUrls[1].split('/').pop();
      const blendMode = emailSet.BlendMode || 'unknown';
      
      const combo = `${visual1} + ${visual2}`;
      allVisualCombos.set(combo, (allVisualCombos.get(combo) || 0) + 1);
      blendModes[blendMode] = (blendModes[blendMode] || 0) + 1;
    }
  });

  console.log(`   Unique Visual Combinations: ${allVisualCombos.size}`);
  console.log(`   Total Entries: ${samplePostEntries.length}\n`);

  if (allVisualCombos.size > 1) {
    console.log('   ✅ SUCCESS! Multiple different visual combinations found!');
    console.log('   ✅ This confirms the version array IS being used!\n');
  } else {
    console.log('   ❌ WARNING! All entries use the SAME visual combination!');
    console.log('   ❌ Version array might NOT be working correctly!\n');
  }

  console.log('   📸 Visual Combinations Found:\n');
  let comboIndex = 1;
  allVisualCombos.forEach((count, combo) => {
    const files = combo.split(' + ');
    console.log(`   Version ${comboIndex}:`);
    console.log(`      Image 1: ${files[0].substring(0, 40)}...`);
    console.log(`      Image 2: ${files[1].substring(0, 40)}...`);
    console.log(`      Used ${count} times`);
    console.log('');
    comboIndex++;
  });

  console.log('   🎨 Blend Modes Distribution:\n');
  Object.entries(blendModes).forEach(([mode, count]) => {
    console.log(`      ${mode}: ${count} times`);
  });

  // Check cycling pattern
  console.log('\n━'.repeat(100));
  console.log('\n🔄 Checking Cycling Pattern (first 12 entries):\n');
  
  const cycleCheck = Math.min(12, samplePostEntries.length);
  const pattern = [];
  
  for (let i = 0; i < cycleCheck; i++) {
    const entry = samplePostEntries[i];
    const emailSet = entry.EmailEngineDataSets?.[0];
    if (emailSet && emailSet.VisualUrls && emailSet.VisualUrls.length === 2) {
      const visual1 = emailSet.VisualUrls[0].split('/').pop().substring(0, 25);
      pattern.push(visual1);
      console.log(`   Entry ${i + 1}: ${visual1}...`);
    }
  }

  // Check if pattern repeats
  if (allVisualCombos.size > 1 && pattern.length >= allVisualCombos.size * 2) {
    const expectedCycleLength = allVisualCombos.size;
    let isCycling = true;
    
    for (let i = expectedCycleLength; i < pattern.length; i++) {
      if (pattern[i] !== pattern[i - expectedCycleLength]) {
        isCycling = false;
        break;
      }
    }
    
    if (isCycling) {
      console.log(`\n   ✅ Pattern CYCLES every ${expectedCycleLength} entries! (as expected)`);
    }
  }

  console.log('\n━'.repeat(100));
  console.log('\n💡 Conclusion:\n');
  console.log(`   Total unique visual combinations: ${allVisualCombos.size}`);
  console.log(`   Expected (from PageStream): 4 versions`);
  
  if (allVisualCombos.size === 4) {
    console.log(`   ✅ PERFECT MATCH! All 4 versions are being used correctly!`);
  } else if (allVisualCombos.size > 1) {
    console.log(`   ⚠️ Partial success - ${allVisualCombos.size} versions found`);
  } else {
    console.log(`   ❌ Issue detected - only 1 version being used`);
  }

  process.exit(0);
})
.catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

