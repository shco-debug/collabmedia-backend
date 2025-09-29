// Script to create all required email templates for CollabMedia
// Run this script to insert all templates into your database

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collabmedia';
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the EmailTemplate model (same as in your project)
const emailTemplateSchema = new mongoose.Schema({
  name: { type: String },
  constants: { type: String },
  subject: { type: String },
  description: { type: String }
}, { collection: 'emailtemplates' });

const EmailTemplate = mongoose.model('emailtemplates', emailTemplateSchema);

// All required email templates with proper variables
const emailTemplates = [
  {
    name: "Signup__ConfirmYourEmailId",
    constants: "",
    subject: "Welcome to CollabMedia - Please Confirm Your Email",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Welcome to CollabMedia!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  <p>Thank you for registering with CollabMedia. Your account has been created successfully!</p>
                  
                  <p>To complete your registration and start using our platform, please confirm your email address by clicking the button below:</p>
                  
                  <div style="text-align: center;">
                      <a href="{ConfirmEmailid}" class="button">Confirm Email Address</a>
                  </div>
                  
                  <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">
                      {ConfirmEmailid}
                  </p>
                  
                  <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
                  
                  <p>If you didn't create this account, please ignore this email.</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Signup__Success",
    constants: "",
    subject: "Welcome to CollabMedia - Account Verified Successfully",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Verified - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Account Verified!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  <p>Congratulations! Your CollabMedia account has been successfully verified.</p>
                  
                  <p>You can now access all features of our platform and start creating amazing content.</p>
                  
                  <div style="text-align: center;">
                      <a href="https://www.scrpt.com/login" class="button">Login to Your Account</a>
                  </div>
                  
                  <p>Thank you for joining CollabMedia. We're excited to see what you'll create!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "ChangePassword__ResetLink",
    constants: "",
    subject: "Reset Your CollabMedia Password",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #FF6B6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  <p>We received a request to reset the password for your CollabMedia account.</p>
                  
                  <p>If you made this request, click the button below to reset your password:</p>
                  
                  <div style="text-align: center;">
                      <a href="{UrlString}" class="button">Reset My Password</a>
                  </div>
                  
                  <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">
                      {UrlString}
                  </p>
                  
                  <div class="warning">
                      <p><strong>⚠️ Important Security Information:</strong></p>
                      <ul>
                          <li>This link will expire in 24 hours for security reasons</li>
                          <li>If you didn't request this password reset, please ignore this email</li>
                          <li>Your password will not be changed until you click the link above</li>
                      </ul>
                  </div>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "ChangePassword__Success",
    constants: "",
    subject: "Password Changed Successfully - CollabMedia",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>✅ Password Changed Successfully</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="success">
                      <p><strong>Your password has been successfully changed!</strong></p>
                  </div>
                  
                  <p>Your CollabMedia account password was updated on {new Date().toLocaleDateString()}.</p>
                  
                  <p>You can now log in to your account using your new password:</p>
                  
                  <div style="text-align: center;">
                      <a href="https://www.scrpt.com/login" class="button">Login to Your Account</a>
                  </div>
                  
                  <p><strong>Security Reminder:</strong> If you didn't make this change, please contact our support team immediately.</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "NotificationEmail_StreamAction",
    constants: "",
    subject: "New Action in Your Stream - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Stream Action Notification - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .action-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📢 Stream Action Notification</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="action-box">
                      <p><strong>New Action:</strong> {Action}</p>
                      <p><strong>Stream:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>There's been a new action in your stream "{CapsuleName}". Check it out to stay updated with the latest content.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">View Stream</a>
                  </div>
                  
                  <p>Stay connected with your community and never miss important updates!</p>
                  
                  <p>Best regards,<br>{UserName} and The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>To unsubscribe from these notifications, <a href="https://www.scrpt.com/unsubscribe/{SubscriberId}">click here</a>.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Sync__Post",
    constants: "",
    subject: "New Post Shared - {SharedByUserName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Post Shared - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .post-box { background: #f3e5f5; border-left: 4px solid #9C27B0; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📝 New Post Shared</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="post-box">
                      <p><strong>Shared by:</strong> {SharedByUserName}</p>
                      <p><strong>Post:</strong> {PostStatement}</p>
                  </div>
                  
                  <p>{SharedByUserName} has shared a new post with you. Check it out to see what they've created!</p>
                  
                  <div style="text-align: center;">
                      <a href="{PostURL}" class="button">View Post</a>
                  </div>
                  
                  <p>Stay connected and discover amazing content from your network!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Surprise__Post",
    constants: "",
    subject: "Surprise Post from {SharedByUserName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Surprise Post - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .surprise-box { background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 15px 0; }
              .post-image { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Surprise Post!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="surprise-box">
                      <p><strong>Surprise from:</strong> {SharedByUserName}</p>
                      <p><strong>Post:</strong> {PostStatement}</p>
                      {PostImage1}
                      {PostImage2}
                      <p><strong>Blend Mode:</strong> {BlendMode}</p>
                  </div>
                  
                  <p>{SharedByUserName} has created a surprise post just for you! This special content was crafted with you in mind.</p>
                  
                  <div style="text-align: center;">
                      <a href="{PostURL}" class="button">View Surprise Post</a>
                  </div>
                  
                  <p>Published by {PublisherName}</p>
                  
                  <p>Enjoy this special content and stay connected!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "At__Post",
    constants: "",
    subject: "You were mentioned in a post by {SharedByUserName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You were mentioned - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #E91E63; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .mention-box { background: #fce4ec; border-left: 4px solid #E91E63; padding: 15px; margin: 15px 0; }
              .post-image { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>👋 You were mentioned!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="mention-box">
                      <p><strong>Mentioned by:</strong> {SharedByUserName}</p>
                      <p><strong>Post:</strong> {PostStatement}</p>
                      {PostImage}
                  </div>
                  
                  <p>{SharedByUserName} mentioned you in a post! Check out what they shared and join the conversation.</p>
                  
                  <div style="text-align: center;">
                      <a href="{PostURL}" class="button">View Post</a>
                  </div>
                  
                  <p>Stay engaged with your community and never miss when someone mentions you!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Share__Capsule",
    constants: "",
    subject: "Capsule shared by {SharedByUserName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Capsule Shared - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #607D8B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #607D8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .capsule-box { background: #eceff1; border-left: 4px solid #607D8B; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📦 Capsule Shared</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="capsule-box">
                      <p><strong>Shared by:</strong> {SharedByUserName}</p>
                      <p><strong>Capsule:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>{SharedByUserName} has shared a capsule with you. Explore this curated collection of content!</p>
                  
                  <div style="text-align: center;">
                      <a href="{CapsuleUrl}" class="button">View Capsule</a>
                  </div>
                  
                  <p>Discover amazing content and connect with like-minded people!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Share__Page",
    constants: "",
    subject: "Page shared by {SharedByUserName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Page Shared - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #795548; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #795548; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .page-box { background: #efebe9; border-left: 4px solid #795548; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📄 Page Shared</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="page-box">
                      <p><strong>Shared by:</strong> {SharedByUserName}</p>
                      <p><strong>Page:</strong> {PageName}</p>
                  </div>
                  
                  <p>{SharedByUserName} has shared a page with you. Check out this interesting content!</p>
                  
                  <div style="text-align: center;">
                      <a href="{PageUrl}" class="button">View Page</a>
                  </div>
                  
                  <p>Stay connected and discover amazing content from your network!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Share__Chapter",
    constants: "",
    subject: "Chapter shared by {SharedByUserName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chapter Shared - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #3F51B5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #3F51B5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .chapter-box { background: #e8eaf6; border-left: 4px solid #3F51B5; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📚 Chapter Shared</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="chapter-box">
                      <p><strong>Shared by:</strong> {SharedByUserName}</p>
                      <p><strong>Chapter:</strong> {ChapterName}</p>
                  </div>
                  
                  <p>{SharedByUserName} has shared a chapter with you. Dive into this engaging content!</p>
                  
                  <div style="text-align: center;">
                      <a href="{ChapterUrl}" class="button">View Chapter</a>
                  </div>
                  
                  <p>Explore new content and expand your knowledge!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Chapter__Invitation",
    constants: "",
    subject: "Chapter Invitation from {OwnerName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chapter Invitation - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #009688; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #009688; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .invitation-box { background: #e0f2f1; border-left: 4px solid #009688; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📖 Chapter Invitation</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="invitation-box">
                      <p><strong>Invited by:</strong> {OwnerName}</p>
                      <p><strong>Chapter:</strong> {ChapterName}</p>
                  </div>
                  
                  <p>{OwnerName} has invited you to join a chapter. This is a great opportunity to connect and learn together!</p>
                  
                  <div style="text-align: center;">
                      <a href="{ChapterViewURL}" class="button">Join Chapter</a>
                  </div>
                  
                  <p>Don't miss out on this exciting opportunity to be part of a learning community!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Chapter__invitation_BIRTHDAY",
    constants: "",
    subject: "Birthday Chapter Invitation from {OwnerName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Birthday Chapter Invitation - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .birthday-box { background: linear-gradient(135deg, #ffeaa7, #fab1a0); border-left: 4px solid #FF6B6B; padding: 15px; margin: 15px 0; border-radius: 5px; }
              .celebration { text-align: center; font-size: 24px; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎂 Birthday Chapter Invitation</h1>
              </div>
              <div class="content">
                  <div class="celebration">🎉 🎈 🎁</div>
                  
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="birthday-box">
                      <p><strong>Birthday Celebrant:</strong> {OwnerName}</p>
                      <p><strong>Birthday:</strong> {OwnerBirthday}</p>
                      <p><strong>Special Chapter:</strong> {ChapterName}</p>
                  </div>
                  
                  <p>🎉 It's {OwnerName}'s birthday on {OwnerBirthday}! They've created a special birthday chapter and invited you to join the celebration.</p>
                  
                  <div style="text-align: center;">
                      <a href="{ChapterViewURL}" class="button">Join Birthday Chapter</a>
                  </div>
                  
                  <p>Don't miss this special opportunity to celebrate and connect with the birthday community!</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForMyself",
    constants: "",
    subject: "Capsule Purchased Successfully - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Capsule Purchased - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .purchase-box { background: #e8f5e8; border-left: 4px solid #4CAF50; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>✅ Purchase Successful!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="purchase-box">
                      <p><strong>Publisher:</strong> {PublisherName}</p>
                      <p><strong>Capsule:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>Congratulations! You have successfully purchased the capsule "{CapsuleName}" for yourself.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Access Your Capsule</a>
                  </div>
                  
                  <p>You can now access all the content in this capsule and start your learning journey!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForMyself__Stream",
    constants: "",
    subject: "Stream Purchased Successfully - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Stream Purchased - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .stream-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📺 Stream Purchased!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="stream-box">
                      <p><strong>Publisher:</strong> {PublisherName}</p>
                      <p><strong>Stream:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>Great news! You have successfully purchased the stream "{CapsuleName}" for yourself.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Start Your Stream</a>
                  </div>
                  
                  <p>You will now receive regular updates and content from this stream. Get ready for an amazing learning experience!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForMyself__GroupStream",
    constants: "",
    subject: "Group Stream Purchased Successfully - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Group Stream Purchased - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .group-box { background: #f3e5f5; border-left: 4px solid #9C27B0; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>👥 Group Stream Purchased!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="group-box">
                      <p><strong>Publisher:</strong> {PublisherName}</p>
                      <p><strong>Group Stream:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>Excellent! You have successfully purchased the group stream "{CapsuleName}" for yourself.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Join Group Stream</a>
                  </div>
                  
                  <p>You are now part of this exclusive group stream. Connect with other members and enjoy collaborative learning!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForGift",
    constants: "",
    subject: "Gift Capsule Purchased - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gift Capsule Purchased - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .gift-box { background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎁 Gift Capsule Purchased!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="gift-box">
                      <p><strong>Gift from:</strong> {PublisherName}</p>
                      <p><strong>Capsule:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>What a wonderful surprise! {PublisherName} has purchased the capsule "{CapsuleName}" as a gift for you.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Open Your Gift</a>
                  </div>
                  
                  <p>You can now access this special gift capsule and start exploring the amazing content inside!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForGift__Stream",
    constants: "",
    subject: "Gift Stream Purchased - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gift Stream Purchased - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #E91E63; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .gift-stream-box { background: #fce4ec; border-left: 4px solid #E91E63; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎁 Gift Stream Purchased!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="gift-stream-box">
                      <p><strong>Gift from:</strong> {PublisherName}</p>
                      <p><strong>Stream:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>Amazing! {PublisherName} has purchased the stream "{CapsuleName}" as a gift for you.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Start Your Gift Stream</a>
                  </div>
                  
                  <p>You will now receive regular updates and content from this gift stream. Enjoy your personalized learning experience!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForGift__GroupStream",
    constants: "",
    subject: "Gift Group Stream Purchased - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gift Group Stream Purchased - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #607D8B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: #607D8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .gift-group-box { background: #eceff1; border-left: 4px solid #607D8B; padding: 15px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎁 Gift Group Stream Purchased!</h1>
              </div>
              <div class="content">
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="gift-group-box">
                      <p><strong>Gift from:</strong> {PublisherName}</p>
                      <p><strong>Group Stream:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>Fantastic! {PublisherName} has purchased the group stream "{CapsuleName}" as a gift for you.</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Join Gift Group Stream</a>
                  </div>
                  
                  <p>You are now part of this exclusive gift group stream. Connect with other members and enjoy collaborative learning!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  },
  {
    name: "Purchased__ForSurpriseGift__GroupStream",
    constants: "",
    subject: "Surprise Gift Group Stream - {CapsuleName}",
    description: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Surprise Gift Group Stream - CollabMedia</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .surprise-box { background: linear-gradient(135deg, #ffeaa7, #fab1a0); border-left: 4px solid #FF6B6B; padding: 15px; margin: 15px 0; border-radius: 5px; }
              .celebration { text-align: center; font-size: 24px; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Surprise Gift Group Stream!</h1>
              </div>
              <div class="content">
                  <div class="celebration">🎁 🎈 ✨</div>
                  
                  <h2>Hello {RecipientName}!</h2>
                  
                  <div class="surprise-box">
                      <p><strong>Surprise from:</strong> {PublisherName}</p>
                      <p><strong>Group Stream:</strong> {CapsuleName}</p>
                  </div>
                  
                  <p>🎉 Surprise! {PublisherName} has purchased the group stream "{CapsuleName}" as a surprise gift for you!</p>
                  
                  <div style="text-align: center;">
                      <a href="{StreamUrl}" class="button">Open Surprise Gift</a>
                  </div>
                  
                  <p>You are now part of this exclusive surprise group stream. Get ready for an amazing collaborative learning experience!</p>
                  
                  <p>{IfNewUserStatement}</p>
                  
                  <p>Best regards,<br>The CollabMedia Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated email. Please do not reply to this message.</p>
                  <p>&copy; 2024 CollabMedia. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `
  }
];

// Function to create all templates
async function createAllEmailTemplates() {
  try {
    console.log('🚀 Starting to create all email templates...\n');
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const template of emailTemplates) {
      try {
        // Check if template already exists
        const existingTemplate = await EmailTemplate.findOne({ name: template.name });
        
        if (existingTemplate) {
          console.log(`📝 Template "${template.name}" already exists. Updating...`);
          await EmailTemplate.updateOne(
            { name: template.name },
            { $set: template }
          );
          updatedCount++;
          console.log(`✅ Template "${template.name}" updated successfully!`);
        } else {
          console.log(`🆕 Creating new template "${template.name}"...`);
          const newTemplate = new EmailTemplate(template);
          await newTemplate.save();
          createdCount++;
          console.log(`✅ Template "${template.name}" created successfully!`);
        }
        
        // Verify the template
        const savedTemplate = await EmailTemplate.findOne({ name: template.name });
        console.log(`   📋 Subject: ${savedTemplate.subject}`);
        console.log(`   📏 Description length: ${savedTemplate.description.length} characters`);
        console.log('');
        
      } catch (error) {
        console.error(`❌ Error processing template "${template.name}":`, error.message);
        skippedCount++;
      }
    }
    
    console.log('🎉 Email template creation process completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Created: ${createdCount} templates`);
    console.log(`   🔄 Updated: ${updatedCount} templates`);
    console.log(`   ⏭️  Skipped: ${skippedCount} templates`);
    console.log(`   📝 Total processed: ${emailTemplates.length} templates`);
    
    // List all templates in database
    console.log('\n📋 All templates in database:');
    const allTemplates = await EmailTemplate.find({}, { name: 1, subject: 1 });
    allTemplates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name} - ${template.subject}`);
    });
    
    console.log('\n🎯 All email templates are ready to use!');
    
  } catch (error) {
    console.error('❌ Error creating email templates:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the script
createAllEmailTemplates();
