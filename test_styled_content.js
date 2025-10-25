require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('./server/models/mediaModel');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// Rich HTML content with various styles for testing - including STYLED TOOLTIPS!
const styledContent = `<span style="font-family: Gambarino-Regular; color: #FF6B35;" data-tooltip="This is a custom styled tooltip with Gambarino font!" data-tooltip-style="custom">Trace Fear Back to What You Value</span>\r\r\r\r\r\r\r\r\n<span style="color: #666666; font-style: italic;" data-tooltip="Instructions appear here" data-tooltip-style="info">&lt;Write the fear, then write the want&gt;</span>\r\r\r\r\r\r\r\r\n\r\r\r\r\r\r\r\r\n<span style="color: #2E86AB;" data-tooltip="Step 1: Get ready" data-tooltip-style="success">Take a pen.</span>\r\r\r\r\r\r\r\r\n<u style="color: #A23B72;" data-tooltip="Important: Write EVERYTHING down!" data-tooltip-style="warning">Write down the fear in full.</u>\r\r\r\r\r\r\r\r\n<strong style="color: #F18F01;" data-tooltip="This is the transformation moment 🌟" data-tooltip-style="gold">Then—beneath it—write what you hope.</strong>\r\r\r\r\r\r\r\r\n\r\r\r\r\r\r\r\r\n<span style="font-family: Gambarino-Regular; color: #C73E1D; text-decoration: underline;" data-tooltip="Pay attention to this insight!" data-tooltip-style="error">You'll see:</span> <em style="color: #6A994E;" data-tooltip="The truth reveals itself" data-tooltip-style="fancy">one is hiding behind the other.</em>\r\r\r\r\r\r\r\r\n<span style="font-weight: bold; color: #BC4B51; background-color: #FFF4E6; padding: 2px 8px;" data-tooltip="Core wisdom: Choose wisely 💡" data-tooltip-style="dark">And only one should be steering.</span>\r\r\r\r\r\r\r\r\n\r\r\r\r\r\r\r\r\n`;

const updatePost = async () => {
  await connectDB();

  try {
    // Replace this with your actual post ID
    // You can find it from your URL: http://localhost:3000/streams/68fb7850e3113ccaec68ce72/posts/68fc105c446b78142c1f37a7
    const postId = '68fc105c446b78142c1f37a7'; // ⚠️ UPDATE THIS WITH YOUR ACTUAL POST ID
    
    console.log(`🔍 Looking for post: ${postId}`);
    
    const media = await Media.findById(postId);
    
    if (!media) {
      console.log('❌ Post not found! Please update the postId variable with your actual post ID.');
      console.log('   You can find it in the URL of your post page.');
      process.exit(1);
    }
    
    console.log('📝 Current Content:', media.Content?.substring(0, 100) + '...');
    
    // Update the Content field with styled HTML
    media.Content = styledContent;
    
    await media.save();
    
    console.log('✅ Post updated successfully!');
    console.log('\n📋 New Content Preview:');
    console.log(styledContent);
    console.log('\n🎨 Styles included:');
    console.log('   ✓ Custom font (Gambarino-Regular)');
    console.log('   ✓ Multiple colors (orange, blue, purple, red, green)');
    console.log('   ✓ STYLED TOOLTIPS with custom designs:');
    console.log('     • Custom style - Orange gradient with Gambarino font');
    console.log('     • Info style - Blue gradient tooltip');
    console.log('     • Success style - Green gradient tooltip');
    console.log('     • Warning style - Orange/yellow gradient');
    console.log('     • Gold style - Premium gold gradient');
    console.log('     • Error style - Red gradient tooltip');
    console.log('     • Fancy style - Pink gradient with italic serif font');
    console.log('     • Dark style - Dark gradient with monospace font');
    console.log('   ✓ Underlines');
    console.log('   ✓ Bold text');
    console.log('   ✓ Italic text');
    console.log('   ✓ Background color with padding');
    console.log('   ✓ Dotted underlines on tooltip elements');
    console.log('\n🌐 Refresh your page and HOVER over the text to see beautiful styled tooltips!');
    
  } catch (error) {
    console.error('❌ Error updating post:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

updatePost();

