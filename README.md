# Find Your Assets 🔍 — After Effects Extension

A modern, fast, and beautiful Adobe After Effects extension built with React, Vite, and TailwindCSS. It allows you to search millions of high-quality images directly from Unsplash and Pixabay, and import them seamlessly into your After Effects projects with a single click.

It also features **1-Click AI Background Removal** powered by Remove.bg!

![Extension Preview](https://via.placeholder.com/800x450?text=Find+Your+Assets+Preview) *(Replace this with a real screenshot!)*

## ✨ Features

- **Search APIs**: Instantly search free, high-resolution photos and transparent PNGs from Unsplash and Pixabay.
- **Direct AE Import**: Click to preview any image, and import it directly into your active After Effects project bin.
- **AI Background Removal (✂️)**: Send any image through Remove.bg and import the transparent cut-out directly into After Effects.
- **Modern UI**: Dark mode tailored for After Effects, built with Tailwind CSS, micro-animations, and smooth infinite scrolling.

---

## 🚀 Installation (For Regular Users)

Since this extension is currently unsigned, you will need to enable Developer Mode in After Effects before installing.

### Step 1: Enable Developer Mode (PlayerDebugMode)
**Windows:**
1. Open the Registry Editor (`regedit`).
2. Navigate to `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` (If you are on AE 2024+, use `CSXS.11`. For older versions, use `CSXS.10`, `CSXS.9`, etc).
3. Right-click > New > String Value. Name it `PlayerDebugMode`.
4. Double-click it and set the value to `1`.

**macOS:**
1. Open Terminal.
2. Run this command: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1` (Change `.11` based on your AE version).

### Step 2: Install the Extension
1. Download or clone this repository.
2. Copy the entire `Find_Your_Assets` folder to the Adobe CEP extensions folder:
   - **Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`
   - **macOS:** `/Library/Application Support/Adobe/CEP/extensions/`
3. Open After Effects.
4. Go to **Window > Extensions > Find_Your_Assets**.

---

## ⚙️ Setting Up Background Removal

To use the ✂️ Remove BG feature, you need a free API key:
1. Go to [Remove.bg](https://www.remove.bg/api) and create a free account.
2. Generate an API Key.
3. Open the extension in After Effects.
4. Click the **⚙️ Settings** icon in the top right corner.
5. Paste your API key and click Save.

*(Note: If you receive an `ETIMEDOUT` error when trying to remove a background, your ISP or network firewall might be blocking the API. Using a VPN like Turbo VPN will solve this.)*

---

## 🛠️ Development Setup (For Developers)

If you want to modify the source code:

1. Clone the repository into your CEP extensions folder.
2. Ensure you have [Node.js](https://nodejs.org/) installed.
3. Open the folder in your terminal and run:
   ```bash
   npm install
   ```
4. Start the development server (Vite with Hot Module Replacement):
   ```bash
   npm run dev
   ```
5. Open After Effects. Any changes you make in the `src/` folder will automatically update in the panel without needing to restart After Effects!

To build for production:
```bash
npm run build
```

## Tech Stack
- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS v3
- **Adobe Integration**: CSInterface.js, Adobe CEP Environment
- **APIs**: Unsplash, Pixabay, Remove.bg

## License
MIT License
