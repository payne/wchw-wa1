# Security Review Summary

**Review Date:** 2026-06-17
**Repository:** wchw-wa1 (public GitHub repository)

## Findings

| Item | Status | Notes |
|------|--------|-------|
| Firebase API Key | Safe | Web API keys are **public by design** - security is via Firestore rules |
| OAuth Client Secret | Not committed | CLI prompts user to enter via `lsr setup`, stored locally in `~/.wchw/` |
| .env files | None found | Properly excluded via .gitignore |
| Private keys | None found | |
| Hardcoded passwords | None found | |

## Why Firebase Web API Keys Are Safe to Commit

Firebase Web API keys are **not secrets**. They are designed to be included in client-side JavaScript code and are safe to commit to public repositories.

**How Firebase security works:**
1. **API keys identify your project** - they tell Firebase which project you're connecting to
2. **They are NOT authentication credentials** - they don't grant access to data
3. **Security is enforced by Firestore Security Rules** - these rules determine who can read/write data
4. **Authentication is handled separately** - users must sign in with Google OAuth

This is documented by Google/Firebase as the standard security model for web applications.

## Files Reviewed

- `src/environments/environment.ts` - Contains Firebase config (API key, project ID, etc.)
- `cli/config.ts` - Contains placeholder values only, real credentials stored locally
- `cli/auth.ts` - Handles OAuth flow, no hardcoded secrets
- `scripts/firestore-backup.sh` - Reads tokens at runtime from Firebase CLI
- `scripts/firestore-create-admin-config.sh` - Reads tokens at runtime from Firebase CLI
- `scripts/firestore-delete-all.sh` - Uses Firebase CLI, no credentials needed
- `.gitignore` - Properly excludes sensitive files

## Firestore Security Rules

The application uses security rules in `firestore.rules` that:
- Require authentication for all operations
- Restrict users to only access their own profile data
- Allow authenticated users to read/create signal reports

## Optional Hardening Recommendations

1. **Restrict API Key by Domain**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your API key and add HTTP referrer restrictions
   - Restrict to: `wchw1-f9f49.web.app/*` and `localhost:*` (for development)

2. **Enable Firebase App Check**
   - Provides additional protection against abuse
   - Verifies requests come from your legitimate app
   - See: https://firebase.google.com/docs/app-check

3. **Monitor Usage**
   - Regularly check Firebase Console for unusual activity
   - Set up billing alerts in Google Cloud Console

## CLI Tool Security

The `lsr` CLI tool stores credentials securely:
- OAuth credentials stored in `~/.wchw/credentials.json` with 600 permissions
- Refresh tokens stored in `~/.wchw/config.json`
- No credentials are hardcoded in the source code
- Users must run `lsr setup` to configure their own OAuth credentials

## Scripts Security Review (2026-06-17)

All shell scripts in `scripts/` have been reviewed for secrets:

| Script | Status | Notes |
|--------|--------|-------|
| `firestore-backup.sh` | ✅ Safe | Reads access tokens from Firebase CLI at runtime |
| `firestore-create-admin-config.sh` | ✅ Safe | Reads access tokens from Firebase CLI at runtime |
| `firestore-delete-all.sh` | ✅ Safe | Uses Firebase CLI commands, no credentials |

**Key points:**
- No hardcoded secrets, API keys, or tokens in any scripts
- All authentication tokens are obtained at runtime from `~/.config/configstore/firebase-tools.json`
- Scripts require user to be logged in via `firebase login`
- Redundant `.js` and `.mjs` script versions were removed to avoid duplication

## Conclusion

This repository is safe for public hosting. All sensitive credentials are either:
- Designed to be public (Firebase Web API keys)
- Stored locally on users' machines (OAuth credentials, tokens)
- Excluded via .gitignore
