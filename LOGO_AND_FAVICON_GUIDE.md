# Logo and Favicon Modification Guide

## Current Setup

- **Logo files**: Located in `/public/images/`
  - `ChatBotCastsSm.png` (Small - used in header)
  - `ChatBotCastsMd.png` (Medium)
  - `ChatBotCastsLg.png` (Large)
  - `chatbotcastssm.webp` (WebP version)

- **Favicon files**: Located in `/public/`
  - `favicon.ico` (legacy, 48x48)
  - `favicon.svg` (SVG version, scalable)
  - `favicon-96x96.png` (PNG fallback)
  - `apple-touch-icon.png` (180x180, iOS)
  - `web-app-manifest-192x192.png` (PWA)
  - `web-app-manifest-512x512.png` (PWA)

- **Website theme colors**:
  - Primary: Purple (`oklch(0.5 0.3 280)`)
  - Accent: Orange/Red (`oklch(0.6 0.25 15)`)
  - Gradient: `from-indigo-500 to-purple-600`

## Steps to Modify Logo (Change Eyes to Light Red)

### Option 1: Using Image Editing Software (Recommended)

1. **Open the logo file** in an image editor (Photoshop, GIMP, Figma, Canva, etc.)
   - Start with `ChatBotCastsLg.png` for best quality

2. **Identify the robot eyes**:
   - The eyes are currently light blue/cyan
   - They appear as two circular shapes

3. **Change eye color to light red**:
   - Use color picker or selection tool to select the eye areas
   - Replace with light red color: `#FF6B6B` or `rgb(255, 107, 107)` or `#FF8A80`
   - Apply a subtle gradient if desired (lighter in center, slightly darker at edges)
   - Maintain the white highlight for depth

4. **Export all sizes**:
   - Export as PNG at different sizes:
     - Small: 32x32px → `ChatBotCastsSm.png`
     - Medium: 64x64px → `ChatBotCastsMd.png`
     - Large: 128x128px → `ChatBotCastsLg.png`
   - Also export as WebP: `chatbotcastssm.webp` (32x32px)

5. **Replace files** in `/public/images/` directory

### Option 2: Using Online Tools

1. Visit [Photopea](https://www.photopea.com/) (free online Photoshop alternative)
2. Upload `ChatBotCastsLg.png`
3. Use the Magic Wand or Lasso tool to select the eyes
4. Use Hue/Saturation adjustment to change blue to red
5. Export and save as described above

### Option 3: Using Command Line (ImageMagick)

If you have ImageMagick installed:

```bash
# Convert blue eyes to light red (adjust color values as needed)
convert ChatBotCastsLg.png -fuzz 20% -fill "#FF6B6B" -opaque "#00BFFF" ChatBotCastsLg_red.png
```

## Steps to Create/Update Favicon

### Method 1: From Logo (Recommended)

1. **Start with your modified logo** (`ChatBotCastsSm.png` or `ChatBotCastsLg.png`)

2. **Resize to favicon sizes**:
   - 16x16px (minimum)
   - 32x32px (standard)
   - 48x48px (optional)
   - 180x180px (Apple touch icon)

3. **Create favicon files**:

   **For PNG favicons:**
   - Standard: 96x96px → `favicon-96x96.png`
   - Apple icon: 180x180px → `apple-touch-icon.png`
   - PWA: 192x192px → `web-app-manifest-192x192.png`, 512x512px → `web-app-manifest-512x512.png`

   **For SVG favicon** (at `/public/favicon.svg`):
   - Can be updated to include robot logo if desired
   - SVG is scalable and works in all browsers

4. **Use online favicon generator** (easiest):
   - Visit [Favicon.io](https://favicon.io/favicon-converter/) or [RealFaviconGenerator](https://realfavicongenerator.net/)
   - Upload your 32x32px or larger logo
   - Download the generated favicon package
   - Replace files in `/public/` directory

### Method 2: Manual Creation

1. **Create favicon.ico** (48x48 or multi-size .ico)
2. **Create PNG versions**:
   - `favicon-96x96.png`
   - `apple-touch-icon.png` (180x180px)
   - `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png` (for PWA)
3. **Optional**: `favicon.svg` for modern browsers

### Method 3: Using Next.js Metadata (Already Configured)

The favicon is configured in `app/layout.tsx` and `public/site.webmanifest`. Replace the files in `/public/` and they'll be used automatically.

## Quick Reference: Light Red Color Codes

- Hex: `#FF6B6B`, `#FF8A80`, `#FF6B9D`
- RGB: `rgb(255, 107, 107)`, `rgb(255, 138, 128)`
- HSL: `hsl(0, 100%, 71%)`
- Tailwind: `red-400` or `red-500`

## Testing

After updating files:

1. **Clear browser cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. **Hard refresh** the page (Ctrl+F5 or Cmd+Shift+R)
3. **Check favicon** appears in browser tab
4. **Check logo** appears in header and footer
5. **Test in different browsers** (Chrome, Firefox, Safari, Edge)

## Notes

- The current logo uses WebP format for better compression
- Favicon files should be optimized for small file size
- SVG favicons are preferred for modern browsers (scalable)
- Apple touch icon should be 180x180px for iOS devices

