# KisanSahay — Production Deployment Guide (Vercel & Netlify)

This guide covers deploying the KisanSahay web application to cloud hosting platforms (**Vercel** and **Netlify**) with **HTTPS enforcement**. HTTPS is strictly required for Progressive Web Apps (Service Workers), Trusted Web Activities (TWA), Web Push Notifications, and Geolocation APIs.

---

## 1. Deploying to Vercel (Recommended)

Vercel provides native edge routing, automatic SSL/TLS certificates, zero-configuration continuous deployments from GitHub, and seamless support for our `vercel.json` configuration.

### Method A: Deploy via GitHub Integration (Continuous Deployment)

1. Commit and push your latest code to GitHub:
   ```bash
   git push origin veersingh/feature
   ```
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New...** > **Project**.
4. Import the `KisanSahay` repository.
5. In Project Settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: Leave blank (static web app + serverless API)
   - **Output Directory**: Leave blank (Vercel uses `vercel.json` routing)
6. Click **Deploy**.
7. Once deployed, Vercel assigns an HTTPS URL such as `https://kisansahay.vercel.app`.

### Method B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Verification on Vercel
After deployment:
- Open `https://<YOUR_PROJECT>.vercel.app/manifest.json` in your browser to verify manifest headers.
- Open `https://<YOUR_PROJECT>.vercel.app/.well-known/assetlinks.json` to verify digital asset links return `200 OK` with `Content-Type: application/json`.
- Open DevTools > **Application** > **Service Workers** to verify `sw.js` is active and running.

---

## 2. Deploying to Netlify (Alternative)

Netlify is another excellent hosting choice offering instant HTTPS, branch deploys, and asset caching.

### Step 1: Add `_redirects` and `_headers` for Netlify

If deploying to Netlify, ensure `public/_redirects` contains:
```text
/api/*  /.netlify/functions/server/:splat  200
/*      /index.html                       200
```

And `public/_headers` contains:
```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Referrer-Policy: strict-origin-when-cross-origin

/.well-known/assetlinks.json
  Content-Type: application/json
  Access-Control-Allow-Origin: *

/manifest.json
  Content-Type: application/manifest+json

/sw.js
  Cache-Control: public, max-age=0, must-revalidate
  Service-Worker-Allowed: /
```

### Step 2: Deploy via Netlify Dashboard

1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** > **Import an existing project**.
3. Connect your GitHub repository.
4. Set **Publish directory** to `public`.
5. Click **Deploy KisanSahay**.

---

## 3. Connecting a Custom Domain (e.g., `kisansahay.in` or `kisansahay.org`)

1. In Vercel or Netlify, go to **Project Settings** > **Domains**.
2. Enter your custom domain (e.g., `kisansahay.in`).
3. Add the suggested DNS records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):
   - **A Record**: `@` $\rightarrow$ `76.76.21.21` (for Vercel)
   - **CNAME Record**: `www` $\rightarrow$ `cname.vercel-dns.com`
4. The SSL certificate will be automatically provisioned within 5–15 minutes.
5. Update `twa/twa-manifest.json` with your custom domain if changed from `kisansahay.vercel.app`.

---

## 4. Testing PWA Installability on Live URL

Once deployed over HTTPS:
1. **Google Chrome (Desktop & Android)**:
   - Visit your deployed URL.
   - Look for the **"⬇️ Install App"** button in the top navigation bar or the browser install icon in the URL bar.
   - Click to test install prompt.
2. **Safari on iOS (iPhone & iPad)**:
   - Open your site in Safari.
   - Tap the **Share** button ($\uparrow\square$) at the bottom.
   - Tap **"Add to Home Screen"**.
   - Verify the custom wheat/seedling icon appears on the iOS home screen.
3. **Lighthouse PWA Audit**:
   - Open Chrome DevTools > **Lighthouse**.
   - Select **Progressive Web App** category.
   - Run audit to confirm:
     - Installable: Pass
     - PWA Optimized: Pass
     - Service worker registered: Pass
     - Manifest contains icons, start_url, theme_color: Pass
