# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for BookGen.

## 🚀 Quick Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Project name: `BookGen` (or your preferred name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"

### Step 2: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Navigate to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Click "Create"

2. **Fill Required Information**
   ```
   App name: BookGen
   User support email: your-email@example.com
   Developer contact information: your-email@example.com
   ```

3. **Add Scopes (Optional)**
   - Click "Add or Remove Scopes"
   - Add: `email`, `profile`, `openid`
   - Save and continue

4. **Add Test Users (Development)**
   - Add your email and any test user emails
   - Save and continue

### Step 3: Create OAuth Credentials

1. **Go to Credentials**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"

2. **Configure Application**
   ```
   Application type: Web application
   Name: BookGen Local Development
   ```

3. **Add Authorized URLs**
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   http://localhost:54321
   http://127.0.0.1:54321
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:54321/auth/v1/callback
   http://127.0.0.1:54321/auth/v1/callback
   ```

4. **Save and Download**
   - Click "Create"
   - Copy the Client ID and Client Secret
   - Download the JSON file (optional, for backup)

### Step 4: Update Environment Variables

1. **Update `.env.local`**
   ```env
   # Google OAuth Configuration
   GOOGLE_OAUTH_CLIENT_ID=your_actual_client_id_here
   GOOGLE_OAUTH_CLIENT_SECRET=your_actual_client_secret_here
   ```

2. **Copy to Active Environment**
   ```bash
   cp .env.local .env
   ```

### Step 5: Restart Supabase

```bash
# Stop Supabase
npm run supabase:stop

# Start Supabase (will pick up new environment variables)
npm run supabase:start

# Start your app
npm run dev
```

## 🧪 Testing Google OAuth

### Test the Integration

1. **Open Your App**
   - Go to http://localhost:5174
   - You should see the login page

2. **Try Google Sign-In**
   - Click the "Google" button
   - You should be redirected to Google's OAuth page
   - Sign in with your Google account
   - You should be redirected back to your app

3. **Verify in Supabase Studio**
   - Open http://127.0.0.1:54323
   - Go to "Authentication" → "Users"
   - You should see your Google user listed

## 🔧 Troubleshooting

### Common Issues

**"Error 400: redirect_uri_mismatch"**
- Check that your redirect URIs in Google Console match exactly
- Make sure you're using the correct port (54321 for Supabase)
- Verify the protocol (http vs https)

**"Error 403: access_blocked"**
- Your app is in testing mode
- Add your email to test users in OAuth consent screen
- Or publish your app (for production)

**"OAuth client not found"**
- Check your Client ID is correct
- Verify environment variables are loaded
- Restart Supabase after changing environment variables

**"Invalid client secret"**
- Verify your Client Secret is correct
- Check for extra spaces or characters
- Regenerate credentials if needed

### Debug Steps

1. **Check Environment Variables**
   ```bash
   # In your app directory
   echo $GOOGLE_OAUTH_CLIENT_ID
   echo $GOOGLE_OAUTH_CLIENT_SECRET
   ```

2. **Check Supabase Configuration**
   ```bash
   npx supabase status
   ```

3. **View Supabase Logs**
   ```bash
   npx supabase logs
   ```

4. **Check Browser Console**
   - Open Developer Tools
   - Look for OAuth-related errors
   - Check network requests

## 🔒 Security Notes

### Development vs Production

**Development (Current Setup):**
- Uses `http://localhost` URLs
- OAuth consent screen in "Testing" mode
- Only test users can sign in

**Production Setup:**
- Use `https://` URLs only
- Publish OAuth consent screen
- Add production domain to authorized origins

### Best Practices

1. **Keep Credentials Secure**
   - Never commit OAuth secrets to git
   - Use environment variables
   - Rotate credentials periodically

2. **Limit Scope**
   - Only request necessary permissions
   - Use minimal scopes (email, profile)

3. **Monitor Usage**
   - Check Google Cloud Console for usage
   - Set up billing alerts if needed

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google Cloud Console](https://console.cloud.google.com/)

## 🆘 Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Verify all URLs and credentials
3. Check Supabase logs: `npx supabase logs`
4. Test with a fresh browser session
5. Ensure OAuth consent screen is properly configured
