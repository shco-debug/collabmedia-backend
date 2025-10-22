# ✅ Email Verification - Local Development Configuration

## 🔧 What Was Changed

Updated the backend to use **localhost:3000** for email verification links during local development.

---

## 📝 Changes Made

### **File:** `config/env/development.js` (Lines 17-26)

**Before:**
```javascript
process.AppAccessProtocal = process.env.APP_PROTOCOL || 'https://';
process.AppBaseURL = process.env.APP_BASE_URL || 'www.scrpt.com';
process.HOST_URL = process.AppAccessProtocal + process.AppBaseURL;
```

**After:**
```javascript
// FOR LOCAL DEVELOPMENT: Using localhost:3000 for email verification links
process.AppAccessProtocal = process.env.APP_PROTOCOL || 'http://';
process.AppBaseURL = process.env.APP_BASE_URL || 'localhost:3000';
process.HOST_URL = process.AppAccessProtocal + process.AppBaseURL;

// FOR PRODUCTION: Uncomment this and comment above
// process.AppAccessProtocal = process.env.APP_PROTOCOL || 'https://';
// process.AppBaseURL = process.env.APP_BASE_URL || 'www.scrpt.com';
// process.HOST_URL = process.AppAccessProtocal + process.AppBaseURL;
```

---

## 🎯 What This Does

### **Email Links Now Point To:**
```
http://localhost:3000/confirm-email/{token}
```

### **Instead Of:**
```
https://www.scrpt.com/confirm-email/{token}
```

---

## ⚠️ **IMPORTANT: Restart Backend Server!**

This change won't take effect until you restart the backend:

```bash
cd collabmedia-backend

# Stop the server (Ctrl+C)
# Then restart:
npm start
```

**Or if using PM2:**
```bash
pm2 restart collabmedia-backend
```

---

## 🧪 How to Test

### **1. Restart Backend** (see above)

### **2. Register New Account:**
```
http://localhost:3000/auth/signup
```
- Use your **real email address**
- Complete registration

### **3. Check Email:**
- Look for email from the platform
- Subject: "Welcome to CollabMedia - Please Confirm Your Email"

### **4. Verify Link:**
The email should now contain:
```
http://localhost:3000/confirm-email/{token}
```

### **5. Click the Link:**
- Opens in your browser
- Shows verification page at localhost:3000
- Token gets verified
- Auto-redirects to login

### **6. Login:**
- Use your new credentials
- Should work! ✅

---

## 📧 Email Template

The email sent to users contains:

**Button Link:**
```html
<a href="http://localhost:3000/confirm-email/{token}">Confirm Email Address</a>
```

**Plain Text Link:**
```
http://localhost:3000/confirm-email/{token}
```

---

## 🔄 Switching Between Environments

### **For Local Development (Current):**
```javascript
// Uncomment this:
process.AppAccessProtocal = process.env.APP_PROTOCOL || 'http://';
process.AppBaseURL = process.env.APP_BASE_URL || 'localhost:3000';
process.HOST_URL = process.AppAccessProtocal + process.AppBaseURL;
```

### **For Production:**
```javascript
// Comment local config and uncomment this:
process.AppAccessProtocal = process.env.APP_PROTOCOL || 'https://';
process.AppBaseURL = process.env.APP_BASE_URL || 'www.scrpt.com';
process.HOST_URL = process.AppAccessProtocal + process.AppBaseURL;
```

### **Or Use Environment Variables:**
```bash
# In .env file or environment
APP_PROTOCOL=http://
APP_BASE_URL=localhost:3000
```

---

## 📊 Complete Flow Now Works

```
1. User registers at localhost:3000/auth/signup
   ↓
2. Backend sends email with link:
   http://localhost:3000/confirm-email/{token}
   ↓
3. User clicks link → Opens in browser
   ↓
4. Verification page at localhost:3000
   ↓
5. Token verified by backend
   ↓
6. Success! Redirects to login
   ↓
7. User logs in
   ↓
8. Access dashboard! ✅
```

---

## ✅ Verification Checklist

After restarting backend:

- [ ] Backend restarted
- [ ] Register with real email
- [ ] Receive email
- [ ] Email contains localhost:3000 link
- [ ] Click link opens verification page
- [ ] Token verified successfully
- [ ] Redirects to login
- [ ] Can login with new account

---

## 🐛 Troubleshooting

### **Still getting www.scrpt.com in emails?**

**Problem:** Backend not restarted after config change

**Solution:** Restart backend server:
```bash
cd collabmedia-backend
# Ctrl+C to stop
npm start
```

### **Not receiving emails?**

**Check:**
1. SMTP configuration in backend
2. Email service is running
3. Check spam folder
4. Verify email address is real

### **Token verification fails?**

**Check:**
1. Token in URL is complete and correct
2. Backend is running on port 3002
3. Frontend is running on port 3000
4. CORS is configured properly

---

## 🔐 Security Note

### **Development vs Production:**

**Development (localhost):**
- Uses `http://` (no SSL)
- Points to `localhost:3000`
- Suitable for testing only

**Production (www.scrpt.com):**
- Uses `https://` (SSL required)
- Points to production domain
- Secure for real users

**Remember to switch back before deploying to production!**

---

## 📝 Quick Reference

### **Current Configuration:**
- **Protocol:** `http://`
- **Domain:** `localhost:3000`
- **Full URL:** `http://localhost:3000`
- **Verification Link:** `http://localhost:3000/confirm-email/{token}`

### **Environment Variable Override:**
You can also set in `.env` file:
```env
APP_PROTOCOL=http://
APP_BASE_URL=localhost:3000
```

---

## 🎉 You're Ready!

Now emails will contain localhost links for easy local testing!

**Next Steps:**
1. ✅ Restart backend server
2. ✅ Register with real email
3. ✅ Check email for localhost link
4. ✅ Click link and verify
5. ✅ Login and enjoy!

**Don't forget to restart the backend!** 🔄






