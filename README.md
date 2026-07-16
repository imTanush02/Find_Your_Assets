# Find Your Assets 🔍

**A sleek After Effects extension for searching, previewing, and importing millions of stock images & videos — plus Pinterest video downloading and AI background removal — all without leaving AE.**

Built with React, Vite, and TailwindCSS. Runs as a native CEP panel inside Adobe After Effects.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Multi-Source Search** | Search **Pexels**, **Pixabay**, and **Unsplash** for images & videos in one unified interface |
| 📥 **1-Click Import** | Preview any asset, then import it directly into your AE project panel |
| 🎬 **Video Search** | Browse and import stock videos from Pexels and Pixabay |
| 📌 **Pinterest Video Downloader** | Paste any Pinterest pin URL → fetch video metadata → choose quality → import into AE |
| ✂️ **AI Background Removal** | Remove backgrounds from images using Remove.bg — works on search results and local files |
| 🖼️ **Image Preview** | Full-size preview modal with download, import, and remove-BG actions |
| 🎨 **Dark UI** | Designed to blend seamlessly with After Effects' native interface |
| ♾️ **Infinite Scroll** | Paginated results with "Load More" for endless browsing |

---

## ⚡ Quick Setup

> Takes about 5 minutes. All API keys are free.

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [Git](https://git-scm.com/)
- Adobe After Effects 2020 or later

### Step 1 — Enable Developer Mode

This extension is unsigned, so CEP developer mode must be enabled.

<details>
<summary><b>Windows</b></summary>

1. Press `Win + R`, type `regedit`, press Enter
2. Navigate to `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
   - AE 2024+ → `CSXS.11`
   - AE 2023 → `CSXS.10`
   - AE 2022 → `CSXS.9`
3. Right-click → **New → String Value** → Name it `PlayerDebugMode`
4. Double-click → Set value to `1`

</details>

<details>
<summary><b>macOS</b></summary>

Open Terminal and run:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```
Change `.11` to match your AE version.

</details>

### Step 2 — Clone & Install

```bash
# Windows — clone into the CEP extensions folder:
cd "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions"
git clone https://github.com/imTanush02/Find_Your_Assets.git

# macOS:
cd "/Library/Application Support/Adobe/CEP/extensions"
git clone https://github.com/imTanush02/Find_Your_Assets.git
```

Then install dependencies:

```bash
cd Find_Your_Assets
npm install
```

### Step 3 — Get API Keys (Free)

| Service | Sign Up | What You Need |
|---------|---------|---------------|
| **Pexels** | [pexels.com/api](https://www.pexels.com/api/) | Sign up → Copy API key |
| **Pixabay** | [pixabay.com/api/docs](https://pixabay.com/api/docs/) | Sign up → Copy API key |
| **Unsplash** | [unsplash.com/developers](https://unsplash.com/developers) | Create app → Copy "Access Key" |
| **Remove.bg** *(optional)* | [remove.bg/api](https://www.remove.bg/api) | Sign up → Generate API key |

> **Note:** Pinterest video downloading doesn't require any API key — it scrapes public pin pages directly.

### Step 4 — Configure `.env`

```bash
cp .env.example .env        # macOS/Linux
copy .env.example .env      # Windows
```

Open `.env` and paste your keys:

```env
VITE_UNSPLASH_ACCESS_KEY=your_key_here
VITE_PIXABAY_API_KEY=your_key_here
VITE_PEXELS_API_KEY=your_key_here
VITE_REMOVEBG_API_KEY=your_key_here
```

### Step 5 — Build & Launch

```bash
npm run build
```

Open After Effects → **Window → Extensions → Find_Your_Assets** 🎉

---

## 📌 Pinterest Video Downloader

Download videos from Pinterest directly into your After Effects project:

1. Click the **📌 Pinterest** button in the header
2. Paste a Pinterest video pin URL (e.g. `https://www.pinterest.com/pin/123456789/` or a `pin.it/...` short link)
3. Click **Fetch** — the extension scrapes the page and extracts video data
4. Choose your preferred quality (720p, 1080p, etc.)
5. Click **Import** — the video downloads and imports into your AE project

> Works with public video pins only. No API key or login required.

---

## ✂️ Background Removal

Two ways to remove backgrounds:

- **From search results** — Click any image → Preview → "Remove BG" button
- **From local files** — Click the ✂️ **Remove BG** button in the header → drag & drop or browse for an image

Both methods use [Remove.bg](https://www.remove.bg/) and auto-import the transparent PNG into your AE project.

---

## 🛠️ Development

```bash
# Start dev server with hot reload
npm run dev

# Production build
npm run build
```

During development, open AE and the extension will connect to Vite's dev server with Hot Module Replacement.

---

## 📁 Project Structure

```
Find_Your_Assets/
├── src/
│   ├── components/        # React UI components
│   │   ├── Header.jsx           # Toolbar with Pinterest, Remove BG, Settings buttons
│   │   ├── SearchBar.jsx        # Search input
│   │   ├── SourceSelector.jsx   # Pexels / Unsplash / Pixabay tabs
│   │   ├── ImageGrid.jsx        # Results grid with lazy loading
│   │   ├── ImageCard.jsx        # Individual result card
│   │   ├── PreviewModal.jsx     # Full-size preview with actions
│   │   ├── PinterestModal.jsx   # Pinterest video downloader modal
│   │   ├── LocalRemoveBgModal.jsx # Drag-and-drop BG removal
│   │   └── SettingsModal.jsx    # API key configuration
│   ├── services/          # API & business logic
│   │   ├── pinterest.js         # Pinterest page scraper
│   │   ├── pexels.js            # Pexels API client
│   │   ├── pixabay.js           # Pixabay API client
│   │   ├── unsplash.js          # Unsplash API client
│   │   ├── importer.js          # Download + import into AE
│   │   ├── http.js              # Shared HTTP utilities
│   │   └── cep.js               # CEP environment detection
│   ├── context/           # React context providers
│   ├── hooks/             # Custom hooks (useSearch, useToast)
│   └── App.jsx            # Root component
├── host/                  # ExtendScript (AE scripting layer)
├── CSXS/                  # CEP manifest
├── dist/                  # Production build output
└── .env                   # API keys (not committed)
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension doesn't appear in AE | Verify `PlayerDebugMode` is set to `1` in Registry/defaults. Restart AE. |
| Images not loading | Double-check API keys in `.env`. Make sure they're valid. |
| Pinterest says "No video found" | The pin might be an image, not a video. Only video pins have downloadable videos. |
| Pinterest says "Could not read page data" | Pinterest may have rate-limited the request. Wait a moment and try again. |
| `ETIMEDOUT` errors | Network/firewall issue. Try a different network or VPN. |
| `npm install` fails | Ensure Node.js v16+ is installed (`node -v` to check). |

---

## 📦 Tech Stack

- **UI** — React 18, Vite 5, Tailwind CSS 3
- **Adobe Integration** — CSInterface.js, CEP, ExtendScript
- **APIs** — Pexels, Pixabay, Unsplash, Remove.bg
- **Pinterest** — Direct HTML scraping via Node.js (no external dependencies)

---

## 📄 License

MIT License

---

Made by [Tanush](https://github.com/imTanush02)
