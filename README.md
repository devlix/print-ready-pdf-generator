# Print-Ready PDF Generator

A browser-based tool for converting images to print-ready PDFs with bleed and crop marks. No installation required — runs entirely in the browser.

**[Open the tool →](https://devlix.github.io/print-ready-pdf-generator/)**

---

## Features

- **Standard and custom page formats** — A3, A4, A5, A6, Letter, or any custom size in mm
- **Portrait and landscape orientation**
- **Three bleed methods:**
  - *Fit height* — image fills full page height, bleeds naturally past trim line
  - *Fit width* — image fills full page width, bleeds naturally past trim line
  - *Add bleed* — image confined to trim area, bleed zone padded with sampled or chosen background colour
- **Crop marks** — positioned correctly in the bleed zone with white halo for visibility on dark images
- **Trim line guide** — dashed overlay showing where the cut will happen (guide only, not required for print)
- **Lock aspect ratio** for custom formats, with snap-to-image ratio button
- **Live preview** — updates instantly as settings change
- **300 / 350 / 400 dpi** output
- Output filename matches the original image filename

---

## How to Use

1. Drop an image onto the upload area (JPG, PNG, TIFF, WebP)
2. Set your page format and orientation
3. Set bleed size (standard is 3mm)
4. Choose a bleed method
5. Click **Generate Print PDF**

The PDF will be saved to your default Downloads folder.

---

## Print Concepts

| Term | Meaning |
|------|---------|
| **Trim size** | Final size of the printed piece after cutting |
| **Bleed** | Extra image area beyond the trim line — ensures no white edges after cutting |
| **Crop marks** | Small lines in the bleed zone showing the cutter where to cut |
| **Trim line** | Guide line at the trim edge — for designer reference only, not required by the printer |

The only elements a printshop strictly needs are **crop marks** and **bleed content**. The trim line guide is a visual aid during setup.

---

## Running Locally

Download or clone the repository and open `index.html` in a browser — no server or build step required.

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
open index.html   # macOS
```

---

## Project Structure

```
├── index.html    — markup and layout
├── style.css     — Material Design 3 dark theme
└── script.js     — all application logic
```

---

## Built With

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [Material Design 3](https://m3.material.io/) — UI design system
- [Roboto Flex](https://fonts.google.com/specimen/Roboto+Flex) — Google variable font

---

## License

MIT
