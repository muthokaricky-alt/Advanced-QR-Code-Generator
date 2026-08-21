# ⚡ Advanced QR Code Generator

A powerful, browser-based QR code generator with advanced features like custom colors, logo overlay, and bulk CSV generation. No server or internet connection required after the first load.

![QR Code Generator Demo](https://via.placeholder.com/800x400.png?text=QR+Code+Generator+Preview)

## ✨ Features

- **Instant Generation** – Works entirely in your browser
- **Custom Colors** – Choose any foreground and background color
- **Logo Overlay** – Upload your logo (PNG/JPG) with high error correction
- **Adjustable Size** – Slide to resize from 200px to 600px
- **Bulk Generation** – Upload a CSV file and download a ZIP of all QR codes
- **Export Options**:
  - **PNG** – High-resolution with logo & colors (great for printing)
  - **SVG** – Vector format for designers (scalable to any size)

## 🚀 How to Use

1. **Single QR Code:**
   - Enter any text or URL in the input field
   - Customize colors and size using the controls
   - Upload a logo if desired
   - Click "Download PNG" or "Download SVG"

2. **Bulk Generation (CSV):**
   - Create a CSV file with a column named `data`
   - Each row in this column becomes a separate QR code
   - Upload the CSV and click "Generate ZIP"
   - Download a folder containing all QR codes as PNGs

## 🛠️ Technologies Used

- **QRCode.js** – Core QR generation library
- **html2canvas** – Renders QR with logo for PNG export
- **JSZip** – Creates ZIP files for bulk downloads
- **FileSaver.js** – Handles file downloads
- **Pure HTML, CSS, JavaScript** – No frameworks or backend needed

## 📥 Installation

Since this is a static website, you don't need to install anything. Simply:

1. Download the `index.html` file
2. Open it in any modern browser (Chrome, Firefox, Safari, Edge)
3. That's it! All features work offline.

## 🧪 CSV Format Example

```csv
data
https://example.com
https://google.com
Your secret message
WiFi:T:WPA;S:MyNetwork;P:MyPassword;;