# SEO Helper – Marketplace Submission Guide

## App Summary
SEO Helper is a **Hybrid App** (Designer Extension + Data API) that audits and edits page SEO (meta title and description) directly inside Webflow Designer.

## Architecture
- **Designer Extension**: React-based UI for SEO management
- **Data API Backend**: Node.js/Express server handling OAuth and Webflow API calls
- **Authentication**: OAuth 2.0 flow for automatic site access

## Key Features
- SEO Overview dashboard with completion metrics and progress indicators
- Page list with status chips: complete / partial / missing
- Inline editing with character count guidance (title 60, description 155)
- Automatic OAuth authorization - no manual token input required
- Real-time SEO updates via Webflow Data API v2

## App Type & Permissions
- **Hybrid App**: Designer Extension + Data API enabled
- **Required Scopes**: sites:read, pages:read, pages:write
- **Permissions**: Automatically requested during OAuth flow

## Production Deployment Requirements

### Backend Deployment (Required)
1. Deploy the `Data Client` folder to Heroku/Railway/Render
2. Set environment variables:
   - `OAUTH_CLIENT_ID`: Your Webflow OAuth client ID
   - `OAUTH_CLIENT_SECRET`: Your Webflow OAuth client secret
   - `OAUTH_REDIRECT_URI`: https://your-backend-domain.com/callback
   - `SESSION_SECRET`: Random secret for session management
   - `NODE_ENV`: production

### Frontend Configuration
1. Update `BACKEND_URL` in Designer Extension environment to point to your deployed backend
2. Build the extension: `npm run build`
3. Upload `bundle.zip` to Webflow app settings

## How Reviewers Can Test
1. Install the app on any Webflow site
2. Launch the app from Designer - OAuth popup will appear automatically
3. Authorize the app to access the site
4. View SEO Overview dashboard with site metrics
5. Edit page SEO metadata and save changes
6. Verify changes are reflected in the site's Pages panel

## Bundle Information
- **Size**: ~435KB (optimized with code splitting)
- **Performance**: Lazy loading and vendor chunk optimization
- **Compliance**: No localhost references, production-ready URLs

## Security & Privacy
- OAuth 2.0 authentication (no manual token handling)
- Session-based token storage
- CORS configured for secure cross-origin requests
- No sensitive data stored in frontend bundle

## Accessibility & UX
- Minimum text size 16px throughout
- Keyboard accessible controls
- High-contrast status indicators
- Clear error messages and loading states

## Screenshots Required (1280×846)
1. **OAuth Authorization**: Popup showing Webflow authorization
2. **Dashboard**: SEO Overview with metrics and progress bars
3. **Page List**: Pages with status chips (complete/partial/missing)
4. **Edit Form**: SEO editing interface with character counts
5. **Success State**: Confirmation after saving changes

## Contact Information
For review questions or technical support, please contact via the submission thread.

## Technical Notes
- Backend handles all Webflow API communication
- Frontend is a pure React SPA with Material-UI
- OAuth flow is automatic and seamless
- No manual configuration required from users
