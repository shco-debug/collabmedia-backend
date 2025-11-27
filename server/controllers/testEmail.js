/**
 * Email Diagnostic Test Endpoint
 * Use this to test email sending in production
 * GET /media/testEmail?to=your@email.com
 */

const nodemailer = require('nodemailer');

module.exports = async function testEmail(req, res) {
  try {
    const testEmail = req.query.to || 'nauman.yousaf.consoledot@gmail.com';
    
    console.log('🧪 Testing email configuration...');
    console.log('   To:', testEmail);
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    
    // Check SMTP configuration
    if (!process.EMAIL_ENGINE || !process.EMAIL_ENGINE.info || !process.EMAIL_ENGINE.info.smtpOptions) {
      return res.json({
        success: false,
        error: 'SMTP configuration missing',
        details: {
          hasEmailEngine: !!process.EMAIL_ENGINE,
          hasInfo: !!process.EMAIL_ENGINE?.info,
          hasSmtpOptions: !!process.EMAIL_ENGINE?.info?.smtpOptions,
          env: process.env.NODE_ENV
        }
      });
    }
    
    console.log('✅ SMTP configuration found:', {
      host: process.EMAIL_ENGINE.info.smtpOptions.host,
      port: process.EMAIL_ENGINE.info.smtpOptions.port,
      secure: process.EMAIL_ENGINE.info.smtpOptions.secure,
      user: process.EMAIL_ENGINE.info.smtpOptions.auth?.user || 'NOT SET',
      senderLine: process.EMAIL_ENGINE.info.senderLine
    });
    
    // Create transporter
    const transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
    
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      return res.json({
        success: false,
        error: 'SMTP verification failed',
        message: verifyError.message,
        stack: verifyError.stack
      });
    }
    
    // Send test email
    console.log('📧 Sending test email...');
    const mailOptions = {
      from: process.EMAIL_ENGINE.info.senderLine,
      to: testEmail,
      subject: '🧪 Test Email from CollabMedia Backend',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from your CollabMedia backend.</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>SMTP Host:</strong> ${process.EMAIL_ENGINE.info.smtpOptions.host}</p>
      `,
      text: `Test Email from CollabMedia Backend - Environment: ${process.env.NODE_ENV || 'unknown'}`
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      response: info.response,
      to: testEmail,
      smtp: {
        host: process.EMAIL_ENGINE.info.smtpOptions.host,
        port: process.EMAIL_ENGINE.info.smtpOptions.port
      }
    });
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('   Stack:', error.stack);
    
    res.json({
      success: false,
      error: error.message,
      stack: error.stack,
      smtpConfig: {
        exists: !!process.EMAIL_ENGINE?.info?.smtpOptions,
        host: process.EMAIL_ENGINE?.info?.smtpOptions?.host,
        port: process.EMAIL_ENGINE?.info?.smtpOptions?.port
      }
    });
  }
};


