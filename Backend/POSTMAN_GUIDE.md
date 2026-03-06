# Postman Collection - Aoqolt Authentication API

## Files Included

1. **Aoqolt_Authentication_API.postman_collection.json** - Complete API collection
2. **Aoqolt_Development.postman_environment.json** - Development environment variables

## Import Instructions

### 1. Import Collection
- Open Postman
- Click **Import** (top left)
- Select `Aoqolt_Authentication_API.postman_collection.json`
- Click **Import**

### 2. Import Environment
- Click **Import** again
- Select `Aoqolt_Development.postman_environment.json`
- Click **Import**
- Select **Aoqolt Development** from the environment dropdown (top right)

## API Endpoints

### Authentication
- **POST** `/api/v1/auth/register/` - Register new user
- **POST** `/api/v1/auth/verify-otp/` - Verify OTP
- **POST** `/api/v1/auth/resend-otp/` - Resend OTP
- **POST** `/api/v1/auth/login/` - Login
- **POST** `/api/v1/auth/logout/` - Logout
- **POST** `/api/v1/auth/token/refresh/` - Refresh access token

### Password Management
- **POST** `/api/v1/auth/forgot-password/` - Request password reset
- **POST** `/api/v1/auth/reset-password/` - Reset password with OTP
- **POST** `/api/v1/auth/change-password/` - Change password (authenticated)

### Social Authentication
- **POST** `/api/v1/auth/social-login/` - Login with Google/Apple/Yahoo
- **POST** `/api/v1/auth/update-phone/` - Update phone number

## Environment Variables

The collection uses these variables (auto-saved by test scripts):

| Variable | Description |
|----------|-------------|
| `base_url` | API base URL (default: http://localhost:8000) |
| `access_token` | JWT access token (auto-saved on login) |
| `refresh_token` | JWT refresh token (auto-saved on login) |
| `user_id` | Registered user ID |
| `phone_number` | User's phone number |
| `otp_code` | OTP code for verification |
| `reset_otp_code` | OTP for password reset |

## Usage Flow

### 1. Register & Login Flow
1. **Register** - Creates account, sends OTP
   - Returns: `user_id`, `phone_number`, `otp_code` (saved automatically)
2. **Verify OTP** - Activates account
   - Returns: `access_token`, `refresh_token` (saved automatically)
3. **Login** - Use for subsequent logins
   - Returns: `access_token`, `refresh_token`

### 2. Password Reset Flow
1. **Forgot Password** - Request reset
   - Returns: `reset_otp_code` (saved automatically)
2. **Reset Password** - Change password with OTP

### 3. Social Auth Flow
1. **Social Login** - Login with OAuth provider
   - Returns: `access_token` and `refresh_token` immediately
   - ✅ **NO phone verification required** - social auth is sufficient
2. **Update Phone** (Optional) - Add phone for notifications/security

## Auto-Saved Variables

All requests include **Test Scripts** that automatically save tokens and IDs to environment variables. You don't need to copy/paste - just run the requests in order!

## Testing Tips

1. **Start Fresh**: Run `Register` → `Verify OTP` → `Login`
2. **Use Saved Tokens**: All authenticated requests use `{{access_token}}` automatically
3. **Token Expired?**: Use `Refresh Token` to get new access token
4. **Check Console**: View response data in Postman console (Ctrl+Alt+C)
5. **Environment Values**: View all saved variables in Environment quick look (eye icon, top right)

## Base URL Configuration

**Local Development**: `http://localhost:8000` (default)
**Production**: Update `base_url` in environment to your production domain

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

## Support

For issues or questions, refer to:
- [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
- [README.md](README.md) - Project setup guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

---

**Note**: OTP codes are returned in development mode for testing. In production, they're only sent via SMS.
