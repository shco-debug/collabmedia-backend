# Get Stream Likes - Postman Test Cases

**Endpoint:** `POST {{baseUrl}}/journal/getStreamLikes`

**Filter Priority:** `hexcode > PostId > PageId > StreamId`

---

## Single Filter Cases

### 1. Stream Only - All likes in stream
```json
{
  "StreamId": "68ffa3829490caab686c17a2"
}
```

### 2. Page Only - All likes in a page
```json
{
  "PageId": "67abc123def456789"
}
```

### 3. Post Only - All versions of a post
```json
{
  "PostId": "68fc0fc9446b78142c1a5dcc"
}
```

### 4. Hexcode Only - Specific version across all posts
```json
{
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

---

## Two Filter Combinations

### 5. Stream + Page
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "PageId": "67abc123def456789"
}
```

### 6. Stream + Post
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "PostId": "68fc0fc9446b78142c1a5dcc"
}
```

### 7. Stream + Hexcode
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

### 8. Page + Post
```json
{
  "PageId": "67abc123def456789",
  "PostId": "68fc0fc9446b78142c1a5dcc"
}
```

### 9. Page + Hexcode
```json
{
  "PageId": "67abc123def456789",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

### 10. Post + Hexcode (MOST SPECIFIC)
```json
{
  "PostId": "68fc0fc9446b78142c1a5dcc",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

---

## Three Filter Combinations

### 11. Stream + Page + Post
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "PageId": "67abc123def456789",
  "PostId": "68fc0fc9446b78142c1a5dcc"
}
```

### 12. Stream + Page + Hexcode
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "PageId": "67abc123def456789",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

### 13. Stream + Post + Hexcode
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "PostId": "68fc0fc9446b78142c1a5dcc",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

### 14. Page + Post + Hexcode
```json
{
  "PageId": "67abc123def456789",
  "PostId": "68fc0fc9446b78142c1a5dcc",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

---

## All Filters (Maximum Specificity)

### 15. Stream + Page + Post + Hexcode
```json
{
  "StreamId": "68ffa3829490caab686c17a2",
  "PageId": "67abc123def456789",
  "PostId": "68fc0fc9446b78142c1a5dcc",
  "hexcode": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

---

## Parameter Aliases (Alternative Names)

### 16. Using SocialPageId instead of StreamId
```json
{
  "SocialPageId": "68ffa3829490caab686c17a2"
}
```

### 17. Using SocialPostId instead of PostId
```json
{
  "SocialPostId": "68fc0fc9446b78142c1a5dcc"
}
```

### 18. Using hexcode_blendedImage instead of hexcode
```json
{
  "hexcode_blendedImage": "/streamposts/a7fabaa38eead61a1b38ec2c0cc8300b.png"
}
```

---

## Error Cases

### 19. Empty Body (Should Fail)
```json
{}
```
**Expected:** Error - "Please provide at least one filter"

### 20. Invalid ID Format (Should Handle Gracefully)
```json
{
  "StreamId": "invalid-id"
}
```
**Expected:** Should handle invalid ObjectId format

---

## Quick Reference

| Filter | Purpose | Returns |
|--------|---------|---------|
| `StreamId` | Entire stream | All likes from all posts in stream |
| `PageId` | Single page | All likes from all posts in page |
| `PostId` | Single post | All likes for post (all versions) |
| `hexcode` | Post version | All likes for specific hexcode version |

**Note:** Replace example IDs with actual IDs from your database!

