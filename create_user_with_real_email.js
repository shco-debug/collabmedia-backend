const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import models
const User = require('./server/models/userModel.js');
const SyncedPost = require('./server/models/syncedpostModel.js');

async function createUserAndTestCron() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        
        // Connect to MongoDB
        const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collabmedia';
        await mongoose.connect(dbURI);
        console.log('✅ Connected to MongoDB');

        const testEmail = 'naumannauman.yousaf.consoledot@gmail.com';
        console.log('📧 Using email:', testEmail);

        // Check if user already exists
        let user = await User.findOne({ Email: testEmail });
        
        if (!user) {
            // Create test user
            const testUser = {
                Name: "Nauman Yousaf",
                Email: testEmail,
                UserName: testEmail,
                Password: "hashed_password_here",
                ProfilePic: "/assets/users/default.png",
                IsRegistered: true,
                Status: true,
                IsDeleted: false,
                CreatedOn: new Date(),
                ModifiedOn: new Date(),
                UnsubscribedStreams: [] // Empty array means not unsubscribed from any streams
            };

            console.log('📝 Creating user...');
            user = await User.create(testUser);
            console.log('✅ User created successfully!');
        } else {
            console.log('✅ User already exists!');
        }
        
        console.log('👤 User ID:', user._id);
        console.log('👤 Email:', user.Email);
        console.log('👤 Name:', user.Name);

        // Update the existing SyncedPost record to use this email
        const syncedPost = await SyncedPost.findOne({
            ReceiverEmails: "test@example.com"
        });

        if (syncedPost) {
            console.log('📝 Updating SyncedPost to use real email...');
            syncedPost.ReceiverEmails = [testEmail];
            syncedPost.PostStatement = `Test post for ${user.Name} - Email delivery verification`;
            await syncedPost.save();
            console.log('✅ SyncedPost updated successfully!');
            console.log('🆔 SyncedPost ID:', syncedPost._id);
        } else {
            console.log('❌ No SyncedPost record found to update');
        }

        // Now test the cron job logic
        console.log('\n🔔 Testing cron job logic...');
        
        const conditions = {
            "IsDeleted": false,
            "Status": true,
            "EmailEngineDataSets.Delivered": false
        };
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        conditions["EmailEngineDataSets.DateOfDelivery"] = {$gte: todayStart, $lte: todayEnd};

        const syncedPostsResults = await SyncedPost.aggregate([
            { $match: conditions },
            { $unwind: "$EmailEngineDataSets" },
            { $match: { "EmailEngineDataSets.DateOfDelivery": {$gte: todayStart, $lte: todayEnd}, "EmailEngineDataSets.Delivered": false } }
        ]).allowDiskUse(true);

        console.log("📊 Cron job found:", syncedPostsResults.length, "records");

        if (syncedPostsResults.length > 0) {
            const dataRecord = syncedPostsResults[0];
            console.log('\n--- Processing Record ---');
            console.log(`📧 Recipient Emails: ${dataRecord.ReceiverEmails}`);
            console.log(`📅 Delivery Date: ${dataRecord.EmailEngineDataSets.DateOfDelivery}`);
            console.log(`📝 Post Statement: ${dataRecord.PostStatement}`);
            
            // Find users for the recipient emails
            const UserData = await User.find({
                Email: { $in: dataRecord.ReceiverEmails },
                IsDeleted: 0,
                Status: 1
            });
            
            console.log(`👥 Found ${UserData.length} active users for recipients`);
            
            if (UserData.length > 0) {
                const recipient = UserData[0];
                console.log(`✅ Email would be sent to: ${recipient.Email}`);
                console.log(`👤 Recipient Name: ${recipient.Name}`);
                console.log(`📧 Ready for email delivery!`);
                
                // Check unsubscription status
                const userUnsubscribedStreams = recipient.UnsubscribedStreams || [];
                const isUnsubscribed = userUnsubscribedStreams.indexOf(String(dataRecord.CapsuleId)) >= 0;
                
                if (!isUnsubscribed) {
                    console.log('✅ User is NOT unsubscribed from this stream');
                    console.log('📧 Email delivery is READY!');
                } else {
                    console.log('❌ User is unsubscribed from this stream');
                }
            }
        }

        console.log('\n🎉 Setup complete! Your cron job should now work properly.');
        console.log('📧 Next step: Run the actual cron job to send the email');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the function
createUserAndTestCron();

