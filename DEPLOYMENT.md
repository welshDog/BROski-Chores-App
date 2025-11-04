# BROski Deployment Guide

This guide provides comprehensive instructions for deploying the BROski application to various environments, including production, staging, and development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Options](#deployment-options)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Netlify](#netlify)
  - [Self-Hosted](#self-hosted)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [CI/CD Configuration](#cicd-configuration)
- [Scaling](#scaling)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

Before deploying BROski, ensure you have the following:

- Node.js 18+ installed
- npm 9+ or pnpm 8+ or yarn 1.22+
- Git
- A Firebase project (for authentication and database)
- (Optional) A domain name

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# App Configuration
VITE_APP_ENV=production # or 'staging', 'development'
VITE_API_URL=https://api.broski.app/v1
VITE_WS_URL=wss://api.broski.app/v1/ws

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_OFFLINE_MODE=true
```

## Deployment Options

### Vercel (Recommended)

1. **Install Vercel CLI** (if deploying manually):

   ```bash
   npm install -g vercel
   ```

2. **Link your project** (if using Vercel CLI):

   ```bash
   vercel login
   vercel link
   ```

3. **Set up environment variables** in the Vercel dashboard:
   - Go to your project in the Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add all variables from your `.env.local` file

4. **Deploy**:

   ```bash
   vercel --prod
   ```

   Or push to your connected Git repository for automatic deployments

### Netlify

1. **Install Netlify CLI** (if deploying manually):

   ```bash
   npm install -g netlify-cli
   ```

2. **Link your project** (if using Netlify CLI):

   ```bash
   netlify login
   netlify init
   ```

3. **Set up environment variables** in the Netlify dashboard:
   - Go to Site settings > Build & deploy > Environment
   - Add all variables from your `.env.local` file

4. **Deploy**:

   ```bash
   netlify deploy --prod
   ```

   Or push to your connected Git repository for automatic deployments

### Self-Hosted

1. **Build the application**:

   ```bash
   npm install
   npm run build
   ```

2. **Install a web server** (e.g., Nginx, Apache, or serve with Node.js):

   **Using serve (Node.js)**:

   ```bash
   npm install -g serve
   serve -s dist -l 3000
   ```

   **Using Nginx**:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/broski-app/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Set up HTTPS** using Let's Encrypt:

   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Environment Configuration

### Development

1. Create a `.env.development` file with development-specific settings
2. Run the development server:

   ```bash
   npm run dev
   ```

### Staging

1. Create a `.env.staging` file with staging-specific settings
2. Deploy to your staging environment:

   ```bash
   npm run build -- --mode staging
   ```

### Production

1. Create a `.env.production` file with production settings
2. Build for production:

   ```bash
   npm run build
   ```

## Database Setup

BROski uses Firebase Firestore as its database. Follow these steps to set it up:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Firestore Database
4. Set up security rules (example rules are in `firestore.rules`)
5. Set up indexes as needed (you'll be prompted in the Firebase console)

## CI/CD Configuration

### GitHub Actions

Create a `.github/workflows/deploy.yml` file:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_APP_ENV: production
          # Add other environment variables here
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          vercel-args: '--prod'
```

## Scaling

### Frontend

- **CDN**: Use a CDN like Cloudflare or CloudFront to serve static assets
- **Caching**: Implement proper cache headers for static assets
- **Lazy Loading**: Code splitting is already configured in Vite

### Backend

- **Firebase Autoscaling**: Firestore automatically scales with your application
- **Functions**: Use Firebase Functions with appropriate memory and timeout settings

## Monitoring and Logging

### Frontend Error Tracking

1. **Sentry** (recommended):

   ```bash
   npm install --save @sentry/react @sentry/tracing
   ```

   Add to `main.jsx`:

   ```javascript
   import * as Sentry from "@sentry/react";
   import { BrowserTracing } from "@sentry/tracing";

   Sentry.init({
     dsn: "your-dsn-here",
     integrations: [new BrowserTracing()],
     tracesSampleRate: 1.0,
     environment: process.env.NODE_ENV,
   });
   ```

### Performance Monitoring

1. **Firebase Performance Monitoring**:
   - Enable in the Firebase Console
   - Add to your app initialization

2. **Lighthouse CI**:

   ```bash
   npm install -D @lhci/cli @lhci/server
   ```

   Add to `package.json`:

   ```json
   "scripts": {
     "lhci:server": "lhci server",
     "lhci:run": "lhci autorun"
   }
   ```

## Backup and Recovery

### Database Backups

1. **Firestore Export**:

   ```bash
   gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d) --project=your-project-id
   ```

2. **Automate Backups**:
   - Use Firebase Scheduled Functions to run regular exports
   - Set up retention policies on your storage bucket

### Application State

- Store user sessions and important state in Firestore
- Implement data validation to prevent data corruption

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure CORS is properly configured in your API
   - Check that all required headers are included

2. **Firebase Permissions**:
   - Verify your Firestore security rules
   - Check that your Firebase service account has the correct permissions

3. **Environment Variables**:
   - Ensure all required environment variables are set
   - Check for typos in variable names

### Getting Help

1. Check the [GitHub Issues](https://github.com/your-username/broski-app/issues)
2. Search the [Firebase Status Dashboard](https://status.firebase.google.com/)
3. Ask for help in our [Community Forum](https://community.broski.app/)

## Maintenance

### Updating Dependencies

1. **Check for updates**:

   ```bash
   npm outdated
   ```

2. **Update dependencies**:

   ```bash
   npm update
   ```

3. **Test thoroughly** after updates

### Security Updates

- Subscribe to security alerts for your dependencies
- Regularly update to the latest stable versions
- Monitor for security advisories

### Performance Optimization

1. **Bundle Analysis**:

   ```bash
   npm install -g source-map-explorer
   source-map-explorer dist/assets/*.js
   ```

2. **Lighthouse Audits**:
   - Run regular Lighthouse audits
   - Address performance, accessibility, and SEO issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
