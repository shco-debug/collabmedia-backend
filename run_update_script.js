#!/usr/bin/env node

/**
 * Script to update Media GroupTags with GroupTagTitle for fast search performance
 * 
 * Usage:
 * 1. Update the database connection string in update_media_grouptags.js
 * 2. Run: node run_update_script.js
 * 
 * This script will:
 * 1. Connect to MongoDB
 * 2. Find all media documents with GroupTags
 * 3. Look up GroupTagTitle from groupTags collection
 * 4. Update media documents with GroupTagTitle
 * 5. Test the update
 * 6. Close connection
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Media GroupTags Update Script...');
console.log('📝 This script will update all media documents to include GroupTagTitle for fast search');
console.log('');

// Check if update_media_grouptags.js exists
const updateScriptPath = path.join(__dirname, 'update_media_grouptags.js');

console.log('📋 Instructions:');
console.log('1. Make sure your MongoDB is running');
console.log('2. Update the database connection string in update_media_grouptags.js');
console.log('3. The script will process all media documents with GroupTags');
console.log('4. It will add GroupTagTitle to each GroupTag for fast search performance');
console.log('');

console.log('⚠️  IMPORTANT: Make a backup of your database before running this script!');
console.log('');

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('✅ Starting update process...');
    
    // Run the update script
    exec(`node "${updateScriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error running update script:', error);
        return;
      }
      
      if (stderr) {
        console.error('⚠️ Warnings:', stderr);
      }
      
      console.log('📊 Update script output:');
      console.log(stdout);
      
      console.log('🎉 Update process completed!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('1. Update your search logic to use GroupTagTitle instead of GroupTagID');
      console.log('2. Test the search functionality');
      console.log('3. Monitor performance improvements');
    });
    
  } else {
    console.log('❌ Update cancelled by user');
  }
  
  rl.close();
});
