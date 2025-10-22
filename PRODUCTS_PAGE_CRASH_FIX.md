# Products Page Backend Crash Fix

## Issue
When navigating to the `/products` page, the backend was crashing due to session access errors in the API endpoints.

## Root Cause
The `ForSalesByMe` function in `capsulesController.js` was accessing `req.session.user._id` without first checking if the session existed. This caused a crash with error:
```
Cannot read property '_id' of undefined
```

## APIs Affected
1. **`POST /capsules`** with `qc=ForSalesByMe` - FIXED ✅
2. **`GET /capsules/getCart`** - Already had proper session validation ✅  
3. **`GET /capsules/getAllIds?qc=galleryCapsulesList`** - No session needed (public endpoint) ✅

## Fix Applied

### Before (Line 2193-2204)
```javascript
var ForSalesByMe = function (req, res) {
  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var conditions = {
    CreaterId: req.session.user._id, // ❌ CRASH HERE if session doesn't exist
    "LaunchSettings.Audience": "BUYERS",
    IsPublished: true,
    IsAllowedForSales: true,
    Status: true,
    IsDeleted: false,
  };
```

### After (Line 2193-2224)
```javascript
var ForSalesByMe = function (req, res) {
  // Safe session access for admin, subadmin, and regular users
  var myself = null;

  if (req.session && req.session.user) {
    myself = req.session.user;
  } else if (req.session && req.session.admin) {
    myself = req.session.admin;
  } else if (req.session && req.session.subadmin) {
    myself = req.session.subadmin;
  }

  if (!myself) {
    var response = {
      status: 401,
      message: "User session not found. Please login.",
      results: null,
    };
    return res.json(response);
  }

  var limit = req.body.perPage ? req.body.perPage : 0;
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

  var conditions = {
    CreaterId: myself._id, // ✅ SAFE - Only accessed after validation
    "LaunchSettings.Audience": "BUYERS",
    IsPublished: true,
    IsAllowedForSales: true,
    Status: true,
    IsDeleted: false,
  };
```

## Changes Made
1. ✅ Added session validation at the start of `ForSalesByMe` function
2. ✅ Checks for `req.session.user`, `req.session.admin`, and `req.session.subadmin`
3. ✅ Returns proper 401 error if no session found instead of crashing
4. ✅ Uses safe `myself._id` instead of direct `req.session.user._id`

## How It Works Now

### When Session Exists
```javascript
// User logged in → Returns their streams for sale
{
  status: 200,
  message: "Capsules listing",
  results: [/* user's capsules with Audience: BUYERS */]
}
```

### When Session Missing/Expired
```javascript
// No session → Returns 401 error gracefully (no crash)
{
  status: 401,
  message: "User session not found. Please login.",
  results: null
}
```

## Testing Steps

1. **Start Backend:**
   ```bash
   cd collabmedia-backend
   npm run dev
   ```

2. **Navigate to Products Page:**
   - Frontend: `http://localhost:3000/products`
   - Should load without backend crash

3. **Check Console:**
   - Backend should NOT crash
   - Frontend should show proper error or data
   - If not logged in: Should redirect to login or show error message

## Expected Behavior

### Not Logged In
- Backend returns 401 error
- Frontend should redirect to login page
- No backend crash

### Logged In
- Backend returns user's streams for sale
- Store tab shows published streams from all users
- Active tab shows current user's streams for sale
- Cart functionality works properly

## Additional Notes

### Session Management
The fix follows the same pattern used in other controller functions like:
- `findAllPaginated` (line 942)
- `publishedForMe` (line 1933)
- `getCart` (line 7837)

### Compatible With
- Regular users (`req.session.user`)
- Admin users (`req.session.admin`)
- SubAdmin users (`req.session.subadmin`)

## Prevention
To prevent similar issues in the future:
1. Always validate session exists before accessing `req.session.user._id`
2. Use safe session access pattern shown above
3. Return proper HTTP status codes (401 for unauthorized)
4. Never assume session data exists without validation

