# SEO Helper – Privacy Policy

Effective date: 2025-08-22

## Overview
SEO Helper is a Webflow Designer Extension that helps you audit and update page meta titles and descriptions. We take privacy seriously and only request the minimum scopes required to operate the app.

## Data We Access
- Site and Page metadata (read): page IDs, titles, slugs, and existing SEO fields
- Page SEO updates (write): new meta title and meta description values you submit

## Data We Do Not Collect
- No end‑user personal data
- No design canvases or assets
- No cookies or tracking scripts
- No sale of data

## Processing & Storage
- API calls are proxied via your Cloudflare Worker using a Site Token with scopes: `sites:read`, `pages:read`, `pages:write`
- We do not store data on our servers. Changes are applied directly to Webflow via the Data API

## Security
- Requests are sent over HTTPS
- Follow the principle of least privilege (only the scopes above)

## Your Controls
- You can remove the app at any time from your Webflow workspace
- Revoking the Site Token disables the Worker proxy

## Contact
For privacy questions, contact the developer via the App listing or the email on file.
