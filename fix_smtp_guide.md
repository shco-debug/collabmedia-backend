# SMTP Configuration Fix Guide

## Current Issue
Both Office 365 and Gmail SMTP configurations are failing with authentication errors.

## Error Analysis
- **Office 365**: `535 5.7.139 Authentication unsuccessful, the user credentials were incorrect`
- **Gmail**: `535-5.7.8 Username and Password not accepted`

## Solutions

### Option 1: Fix Office 365 SMTP (Recommended)

#### Step 1: Create App Password
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Sign in with `hello@scrpt.com`
3. Go to "Security" → "Advanced security options"
4. Click "Create a new app password"
5. Name it "Scrpt SMTP" and generate password
6. Copy the generated password (16 characters)

#### Step 2: Update Configuration
Replace the password in `config/env/development.js`:

```javascript
process.EMAIL_ENGINE = {
    info : {
        smtpOptions : {
            auth : {
                user: "hello@scrpt.com",
                pass: "YOUR_NEW_APP_PASSWORD_HERE" // Replace with app password
            },
            host: "smtp.office365.com",
            port: 587,
            secure: false,
            secureConnection: false,
            requireTLS: true,
            tls: true
        },
        senderLine : "Scrpt <hello@scrpt.com>"
    }
};
```

### Option 2: Fix Gmail SMTP (Alternative)

#### Step 1: Enable App Passwords
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in with `collabmedia.scrpt@gmail.com`
3. Enable 2-Step Verification if not already enabled
4. Go to "App passwords"
5. Generate new app password for "Mail"
6. Copy the generated password

#### Step 2: Update Configuration
Replace the password in `server/controllers/components/emailComponent.js`:

```javascript
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'collabmedia.scrpt@gmail.com',
        pass: 'YOUR_NEW_APP_PASSWORD_HERE' // Replace with app password
    }
});
```

### Option 3: Use Environment Variables (Most Secure)

#### Step 1: Create .env file
```bash
# Add to .env file
SMTP_USER=hello@scrpt.com
SMTP_PASS=your_app_password_here
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
```

#### Step 2: Update Configuration
```javascript
process.EMAIL_ENGINE = {
    info : {
        smtpOptions : {
            auth : {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: false,
            secureConnection: false,
            requireTLS: true,
            tls: true
        },
        senderLine : "Scrpt <hello@scrpt.com>"
    }
};
```

## Testing After Fix

1. Update the test email address in `test_smtp.js`:
   ```javascript
   to: "your-actual-email@gmail.com", // Replace with your real email
   ```

2. Run the test:
   ```bash
   node test_smtp.js
   ```

3. Check your email inbox (and spam folder)

## Common Issues & Solutions

### Issue: "Less secure app access"
- **Solution**: Use App Passwords instead of regular passwords

### Issue: "Authentication unsuccessful"
- **Solution**: Verify email address and app password are correct

### Issue: "Connection timeout"
- **Solution**: Check firewall settings, try different ports (25, 587, 465)

### Issue: "TLS/SSL errors"
- **Solution**: Set `secure: false` and `requireTLS: true` for port 587

## Security Best Practices

1. **Never commit passwords to git**
2. **Use environment variables for sensitive data**
3. **Use App Passwords instead of regular passwords**
4. **Regularly rotate app passwords**
5. **Monitor email sending logs**

## Next Steps

1. Choose one of the solutions above
2. Update the configuration
3. Test with the provided test script
4. Verify emails are received
5. Update your application to use the working configuration
