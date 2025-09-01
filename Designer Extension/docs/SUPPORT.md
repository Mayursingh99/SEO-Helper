# SEO Helper – Support

## Getting Started
1. Install the app in your Webflow workspace.
2. Launch it from the Designer Apps panel.
3. The app will auto-target the open site and load its pages.

## Requirements
- App scopes: `sites:read`, `pages:read`, `pages:write`
- A deployed Cloudflare Worker proxy
  - Set `SITE_TOKEN` with the scopes above
  - Use the Worker URL as `BACKEND_URL` in the extension `.env`

## Editing SEO
- Use the dropdown to select a page
- Edit Meta Title (≤ 60 chars) and Meta Description (≤ 155 chars)
- Click Save. Edits are applied via Webflow Data API

## Troubleshooting
- "BACKEND_URL is not set": add it to `Designer Extension/.env` and rebuild
- CORS or 401s: confirm `SITE_TOKEN` scopes and Worker deployment
- Designer only error on localhost: this is normal; the dev preview falls back to demo data

## Contact
For help, reply in your app listing or email the developer contact on file.
