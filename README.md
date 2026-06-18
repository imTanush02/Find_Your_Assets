# Find Your Assets 🔍 — After Effects Extension

A modern, fast, and beautiful Adobe After Effects extension built with React, Vite, and TailwindCSS. Search millions of high-quality images directly from **Unsplash**, **Pixabay**, and **Pexels**, and import them seamlessly into your After Effects projects with a single click.

It also features **1-Click AI Background Removal** powered by Remove.bg! ✂️

---

## ⚡ Quick Setup (For Friends!)

> Just follow these steps and you'll be up and running in 5 minutes.

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or above) — download and install if you don't have it.
- [Git](https://git-scm.com/) — to clone the repo.
- Adobe After Effects (2020 or later).

### Step 1: Enable Developer Mode

Since this extension is unsigned, you need to enable Developer Mode first.

**Windows:**
1. Press `Win + R`, type `regedit`, press Enter.
2. Navigate to `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
   - AE 2024+ → `CSXS.11`
   - AE 2023 → `CSXS.10`
   - AE 2022 → `CSXS.9`
3. Right-click → New → String Value → Name it `PlayerDebugMode`.
4. Double-click it → Set value to `1`.

**macOS:**
1. Open Terminal.
2. Run: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
   - Change `.11` based on your AE version.

### Step 2: Clone & Install

Open your terminal/command prompt and run:

```bash
# Clone into the Adobe CEP extensions folder

# Windows:
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

### Step 3: Get Your API Keys (Free!)

You need API keys for the image search to work. All are **free**:

| Service | Sign Up Link | What You Need |
|---------|-------------|--------------|
| **Unsplash** | [unsplash.com/developers](https://unsplash.com/developers) | Create an app → Copy "Access Key" |
| **Pixabay** | [pixabay.com/api/docs](https://pixabay.com/api/docs/) | Sign up → Copy your API key |
| **Pexels** | [pexels.com/api](https://www.pexels.com/api/) | Sign up → Copy your API key |
| **Remove.bg** *(optional)* | [remove.bg/api](https://www.remove.bg/api) | Sign up → Generate API key |

### Step 4: Create Your `.env` File

Copy the example file and fill in your keys:

```bash
# In the Find_Your_Assets folder:
cp .env.example .env
```

Or on **Windows** (Command Prompt):
```cmd
copy .env.example .env
```

Now open `.env` in any text editor and paste your API keys:

```env
VITE_UNSPLASH_ACCESS_KEY=paste_your_unsplash_key_here
VITE_PIXABAY_API_KEY=paste_your_pixabay_key_here
VITE_PEXELS_API_KEY=paste_your_pexels_key_here
VITE_REMOVEBG_API_KEY=paste_your_removebg_key_here
```

### Step 5: Build & Launch

```bash
npm run build
```

Now open After Effects → **Window → Extensions → Find_Your_Assets** 🎉

---

## ✨ Features

- 🔍 **Multi-Source Search** — Search Unsplash, Pixabay, and Pexels all in one place.
- 📥 **Direct AE Import** — Click to preview, then import directly into your After Effects project.
- ✂️ **AI Background Removal** — Remove backgrounds with one click using Remove.bg.
- 🎨 **Modern Dark UI** — Beautiful dark mode designed for After Effects, with smooth animations.
- ♾️ **Infinite Scroll** — Keep scrolling to load more results automatically.

---

## 🛠️ Development Setup

Want to modify the code? Here's how:

1. Follow Steps 1-4 above.
2. Start the dev server instead of building:
   ```bash
   npm run dev
   ```
3. Open After Effects. Changes in `src/` will auto-update via Hot Module Replacement!

To create a production build:
```bash
npm run build
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension doesn't show in AE | Make sure `PlayerDebugMode` is set to `1` in Registry. Restart AE. |
| `ETIMEDOUT` on Remove BG | Your ISP/network might be blocking the API. Try using a VPN. |
| Images not loading | Check your API keys in `.env`. Make sure they're correct. |
| `npm install` fails | Make sure Node.js is installed. Run `node -v` to check. |

---

## 📁 Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS v3
- **Adobe Integration**: CSInterface.js, Adobe CEP
- **APIs**: Unsplash, Pixabay, Pexels, Remove.bg

## 📄 License

MIT License
