# MongoDB Commands for Mobile OTP Setup

Run these commands in **MongoDB Compass Shell** or **mongosh**.

## 1. Select Database

```javascript
use loanease
```

## 2. Create `mobile_otp_codes` Collection

```javascript
db.createCollection('mobile_otp_codes')
```

## 3. Create Indexes for `mobile_otp_codes`

```javascript
db.mobile_otp_codes.createIndex({ mobile: 1, expires_at: 1 })
db.mobile_otp_codes.createIndex({ otp_id: 1 }, { unique: true })
db.mobile_otp_codes.createIndex({ user_id: 1, created_at: -1 })
db.mobile_otp_codes.createIndex({ expires_at: 1 }, { expireAfterSeconds: 3600 })
```

## 4. Create `mobile_devices` Collection

```javascript
db.createCollection('mobile_devices')
```

## 5. Create Indexes for `mobile_devices`

```javascript
db.mobile_devices.createIndex({ user_id: 1 })
db.mobile_devices.createIndex({ device_id: 1 }, { unique: true })
db.mobile_devices.createIndex({ push_token: 1 }, { sparse: true })
```

## 6. Add `mobile` Field to Users

Copy phone to mobile field for users with Australian mobile numbers (04xxxxxxxx format):

```javascript
// For phones starting with 04 - convert to +614 format
db.users.updateMany(
  {
    phone: { $regex: /^04\d{8}$/ },
    mobile: { $exists: false }
  },
  [
    {
      $set: {
        mobile: { $concat: ["+61", { $substr: ["$phone", 1, 9] }] },
        mobile_verified: false
      }
    }
  ]
)

// For phones already in +614 format
db.users.updateMany(
  {
    phone: { $regex: /^\+614\d{8}$/ },
    mobile: { $exists: false }
  },
  [
    {
      $set: {
        mobile: "$phone",
        mobile_verified: false
      }
    }
  ]
)
```

## 7. Create Index on Users Mobile Field

```javascript
db.users.createIndex({ mobile: 1 }, { sparse: true })
```

## 8. Verify Setup

Check collections exist:
```javascript
db.getCollectionNames()
```

Check indexes:
```javascript
db.mobile_otp_codes.getIndexes()
db.mobile_devices.getIndexes()
db.users.getIndexes()
```

Check users with mobile field:
```javascript
db.users.countDocuments({ mobile: { $exists: true } })
```

---

## Sample Data Structure

### mobile_otp_codes document:
```javascript
{
  _id: "uuid-string",
  user_id: "user-uuid",
  mobile: "+61412345678",
  email: "user@example.com",
  otp: "998877",           // Hardcoded for testing
  otp_id: "uuid-string",
  attempts: 0,
  max_attempts: 3,
  expires_at: ISODate("2026-01-27T12:10:00Z"),  // 10 min from creation
  verified_at: null,
  created_at: ISODate("2026-01-27T12:00:00Z"),
  device_id: "device-identifier",
  ip_address: "192.168.1.1"
}
```

### mobile_devices document:
```javascript
{
  _id: "device-uuid",
  user_id: "user-uuid",
  device_id: "unique-device-id",
  device_name: "iPhone 15 Pro",
  device_os: "iOS 17.2",
  push_token: "fcm-token-here",
  biometric_enabled: true,
  last_active_at: ISODate("2026-01-27T12:00:00Z"),
  created_at: ISODate("2026-01-27T10:00:00Z"),
  updated_at: ISODate("2026-01-27T12:00:00Z")
}
```

---

## Testing

After setup, test the OTP flow:

1. **Request OTP**:
   - POST `/api/auth/mobile/request-otp`
   - Body: `{ "mobile": "0412345678" }`

2. **Verify OTP**:
   - POST `/api/auth/mobile/verify-otp`
   - Body: `{ "mobile": "0412345678", "otp": "998877", "otp_id": "from-step-1" }`

3. **Resend OTP**:
   - POST `/api/auth/mobile/resend-otp`
   - Body: `{ "mobile": "0412345678", "otp_id": "from-step-1" }`

**Note**: OTP is hardcoded as `998877` for testing. SMS/Email sending will be added later.
