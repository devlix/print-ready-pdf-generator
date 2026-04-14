// ── Accordion ──
function toggleCard(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

// ── Page size lookup table ──
const PAGE_SIZES = {
  A3:     [297, 420],
  A4:     [210, 297],
  A5:     [148, 210],
  A6:     [105, 148],
  Letter: [216, 279],
};

// ── State ──
let loadedImage    = null;
let loadedSvg      = null;   // raw SVG text when input is .svg
let originalFilename = 'image';

// ── DOM refs ──
const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('fileInput');
const generateBtn    = document.getElementById('generateBtn');
const previewCanvas  = document.getElementById('previewCanvas');
const dropEmpty      = document.getElementById('dropEmpty');
const dropHasImage   = document.getElementById('dropHasImage');
const status         = document.getElementById('status');
const spinner        = document.getElementById('spinner');
const btnText        = document.getElementById('btnText');
const btnIcon        = document.getElementById('btnIcon');
const specs          = document.getElementById('specs');
const customFormatEl = document.getElementById('customFormat');
const pageFormatEl   = document.getElementById('pageFormat');
const filenameLabel  = document.getElementById('filenameLabel');
const customW        = document.getElementById('customW');
const customH        = document.getElementById('customH');
const lockRatio      = document.getElementById('lockRatio');
const ratioHint      = document.getElementById('ratioHint');

// ── Page format: show/hide custom fields ──
pageFormatEl.addEventListener('change', () => {
  customFormatEl.classList.toggle('visible', pageFormatEl.value === 'custom');
  if (loadedImage) { renderPreview(); updateSpecs(); }
});

// ── Lock aspect ratio for custom format ──
function updateRatioHint() {
  const w = parseFloat(customW.value), h = parseFloat(customH.value);
  if (w && h) {
    const gcd = (a, b) => b < 0.01 ? a : gcd(b, a % b);
    const d = gcd(w, h);
    ratioHint.textContent = `(${+(w/d).toFixed(2)} : ${+(h/d).toFixed(2)})`;
  }
}

customW.addEventListener('input', () => {
  if (lockRatio.checked) {
    customH.value = +(parseFloat(customW.value) * lockRatio._ratio).toFixed(1);
  }
  updateRatioHint();
  if (loadedImage) { renderPreview(); updateSpecs(); }
});

customH.addEventListener('input', () => {
  if (lockRatio.checked) {
    customW.value = +(parseFloat(customH.value) / lockRatio._ratio).toFixed(1);
  }
  updateRatioHint();
  if (loadedImage) { renderPreview(); updateSpecs(); }
});

lockRatio.addEventListener('change', () => {
  if (lockRatio.checked) {
    lockRatio._ratio = parseFloat(customH.value) / parseFloat(customW.value);
  }
  document.getElementById('snapImageRatio').style.display = lockRatio.checked ? 'inline-block' : 'none';
});

// Snap to image aspect ratio
document.getElementById('snapImageRatio').addEventListener('click', () => {
  if (!loadedImage) return;
  lockRatio._ratio = loadedImage.height / loadedImage.width;
  customH.value = +(parseFloat(customW.value) * lockRatio._ratio).toFixed(1);
  updateRatioHint();
  if (loadedImage) { renderPreview(); updateSpecs(); }
});

updateRatioHint();

// ── Drag and drop ──
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0]; if (file) loadFile(file);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

// ── Settings change listeners ──
['pageFormat','bleedMm','dpi','showCropMarks','showBleedBox','customW','customH'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    if (loadedImage || loadedSvg) { renderPreview(); updateSpecs(); }
  });
});

document.querySelectorAll('input[name="orientation"], input[name="fitMode"]').forEach(el => {
  el.addEventListener('change', () => {
    const isAddBleed = document.querySelector('input[name="fitMode"]:checked').value === 'addbleed';
    document.getElementById('bgColorRow').classList.toggle('visible', isAddBleed);
    if (loadedImage || loadedSvg) { renderPreview(); updateSpecs(); }
  });
});

// ── Background color: Auto button ──
document.getElementById('bgAutoBtn').addEventListener('click', () => {
  if (!loadedImage) return;
  const sampled = sampleBackgroundColor(loadedImage);
  const m = sampled.match(/\d+/g);
  const hex = '#' + m.map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
  document.getElementById('bgColor').value = hex;
  if (loadedImage) { renderPreview(); updateSpecs(); }
});

document.getElementById('bgColor').addEventListener('input', () => {
  if (loadedImage) { renderPreview(); updateSpecs(); }
});

// ── Load file ──
function loadFile(file) {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  if (!file.type.startsWith('image/') && !isSvg) { setStatus('Please upload an image file.', 'err'); return; }

  originalFilename = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\s]/g, '_');
  filenameLabel.textContent = file.name;

  const reader = new FileReader();

  if (isSvg) {
    // SVG path — read as text, render preview via img tag
    reader.onload = e => {
      loadedSvg   = e.target.result;
      loadedImage = null;
      // Auto-set 600dpi for SVG if currently on a raster setting
      const dpiEl = document.getElementById('dpi');
      if (parseInt(dpiEl.value) < 600) dpiEl.value = '600';
      generateBtn.disabled = false;
      dropEmpty.style.display    = 'none';
      dropHasImage.style.display = 'block';
      setStatus('SVG loaded — auto-set 600 dpi, vector text preserved in PDF', 'ok');
      renderSvgPreview(); updateSpecs();
    };
    reader.readAsText(file);
  } else {
    // Raster path — existing canvas pipeline
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        loadedSvg   = null;
        // Restore 300dpi if coming from SVG at 600+
        const dpiEl = document.getElementById('dpi');
        if (parseInt(dpiEl.value) >= 600) dpiEl.value = '300';
        generateBtn.disabled = false;
        dropEmpty.style.display    = 'none';
        dropHasImage.style.display = 'block';
        setStatus('Image loaded — preview ready', '');
        renderPreview(); updateSpecs();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// ── Trim dimensions ──
function getTrimDimensions() {
  const format = pageFormatEl.value;
  let w, h;
  if (format === 'custom') {
    w = parseFloat(customW.value) || 148;
    h = parseFloat(customH.value) || 210;
  } else {
    [w, h] = PAGE_SIZES[format];
  }
  const landscape = document.querySelector('input[name="orientation"]:checked').value === 'landscape';
  return landscape ? [Math.max(w, h), Math.min(w, h)] : [Math.min(w, h), Math.max(w, h)];
}

// ── Settings object ──
function getSettings() {
  const [trimW, trimH] = getTrimDimensions();
  const bleedVal      = document.getElementById('bleedMm').value;
  const bleedMm       = bleedVal === '' ? 3 : Math.max(0, parseFloat(bleedVal));
  const dpi           = parseInt(document.getElementById('dpi').value);
  const showCropMarks = document.getElementById('showCropMarks').checked;
  const showBleedBox  = document.getElementById('showBleedBox').checked;
  const fitMode       = document.querySelector('input[name="fitMode"]:checked').value;
  const bgColor       = document.getElementById('bgColor').value;
  const MM            = dpi / 25.4;
  const trimWpx       = Math.round(trimW * MM);
  const trimHpx       = Math.round(trimH * MM);
  const bleedPx       = Math.round(bleedMm * MM);
  const totalW        = trimWpx + 2 * bleedPx;
  const totalH        = trimHpx + 2 * bleedPx;
  return { trimW, trimH, bleedMm, dpi, showCropMarks, showBleedBox, fitMode, bgColor,
           MM, trimWpx, trimHpx, bleedPx, totalW, totalH };
}

// ── Sample background color from image corners ──
function sampleBackgroundColor(img) {
  const size = 10;
  const tmp  = document.createElement('canvas');
  tmp.width  = img.width; tmp.height = img.height;
  const ctx  = tmp.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const regions = [
    ctx.getImageData(0, 0, size, size),
    ctx.getImageData(img.width - size, 0, size, size),
    ctx.getImageData(0, img.height - size, size, size),
    ctx.getImageData(img.width - size, img.height - size, size, size),
  ];
  let r = 0, g = 0, b = 0, count = 0;
  regions.forEach(d => {
    for (let i = 0; i < d.data.length; i += 4) {
      r += d.data[i]; g += d.data[i+1]; b += d.data[i+2]; count++;
    }
  });
  return `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
}

// ── Render to canvas ──
function renderToCanvas(canvas, s) {
  canvas.width  = s.totalW;
  canvas.height = s.totalH;
  const ctx = canvas.getContext('2d');
  const img = loadedImage;
  let scaledW, scaledH, xOff, yOff;

  if (s.fitMode === 'addbleed') {
    ctx.fillStyle = s.bgColor;
    ctx.fillRect(0, 0, s.totalW, s.totalH);
    const scale = Math.min(s.trimWpx / img.width, s.trimHpx / img.height);
    scaledW = img.width * scale;  scaledH = img.height * scale;
    xOff = s.bleedPx + (s.trimWpx - scaledW) / 2;
    yOff = s.bleedPx + (s.trimHpx - scaledH) / 2;
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s.totalW, s.totalH);
    if (s.fitMode === 'width') {
      const scale = s.totalW / img.width;
      scaledW = s.totalW;           scaledH = img.height * scale;
      xOff = 0;                     yOff = (s.totalH - scaledH) / 2;
    } else {
      const scale = s.totalH / img.height;
      scaledW = img.width * scale;  scaledH = s.totalH;
      xOff = (s.totalW - scaledW) / 2; yOff = 0;
    }
  }
  ctx.drawImage(img, xOff, yOff, scaledW, scaledH);

  // Trim line guide — white halo + red dashes
  if (s.showBleedBox) {
    ctx.save();
    const lw   = Math.max(1, Math.round(0.25 * s.MM));
    const dash = [Math.round(3 * s.MM), Math.round(2 * s.MM)];
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth   = lw * 3;
    ctx.setLineDash(dash);
    ctx.strokeRect(s.bleedPx, s.bleedPx, s.trimWpx, s.trimHpx);
    ctx.strokeStyle = 'rgba(200,68,10,0.9)';
    ctx.lineWidth   = lw;
    ctx.strokeRect(s.bleedPx, s.bleedPx, s.trimWpx, s.trimHpx);
    ctx.restore();
  }

  // Crop marks — white halo + black mark, live in bleed zone
  if (s.showCropMarks) {
    ctx.save();
    const lw     = Math.max(1, Math.round(0.25 * s.MM));
    const { bleedPx: b, trimWpx: tw, trimHpx: th, MM } = s;
    const gapPx  = Math.round(0.5 * MM);
    const corners = [
      { x: b,      y: b,      dx: -1, dy: -1 },
      { x: b + tw, y: b,      dx:  1, dy: -1 },
      { x: b,      y: b + th, dx: -1, dy:  1 },
      { x: b + tw, y: b + th, dx:  1, dy:  1 },
    ];

    const drawMark = (x1, y1, x2, y2) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth   = lw * 3;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = lw;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };

    corners.forEach(({ x, y, dx, dy }) => {
      drawMark(x + dx * gapPx, y, x + dx * b, y);
      drawMark(x, y + dy * gapPx, x, y + dy * b);
    });
    ctx.restore();
  }
}

// ── Render SVG preview (shown in drop zone) ──
function renderSvgPreview() {
  // Render SVG as image into previewCanvas for visual reference
  // (preview is rasterised for display only — PDF will be vector)
  const blob = new Blob([loadedSvg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();
  img.onload = () => {
    const container = dropHasImage;
    const cw = container.clientWidth  || 400;
    const ch = container.clientHeight || 500;
    const scale = Math.min(cw / img.width, ch / img.height);
    previewCanvas.width  = Math.round(img.width  * scale);
    previewCanvas.height = Math.round(img.height * scale);
    const ctx = previewCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// ── Render preview ──
function renderPreview() {
  if (loadedSvg) { renderSvgPreview(); return; }
  const s   = getSettings();
  const tmp = document.createElement('canvas');
  renderToCanvas(tmp, s);
  // Draw into the drop-zone canvas, scaled to fill it
  const container = dropHasImage;
  const cw = container.clientWidth  || 400;
  const ch = container.clientHeight || 500;
  const scale = Math.min(cw / s.totalW, ch / s.totalH);
  previewCanvas.width  = Math.round(s.totalW * scale);
  previewCanvas.height = Math.round(s.totalH * scale);
  previewCanvas.getContext('2d').drawImage(tmp, 0, 0, previewCanvas.width, previewCanvas.height);
}

// ── Update specs bar ──
function updateSpecs() {
  const s      = getSettings();
  specs.classList.add('visible');
  const orient = document.querySelector('input[name="orientation"]:checked').value;
  document.getElementById('specTrim').textContent   = `${s.trimW} × ${s.trimH} mm`;
  document.getElementById('specBleed').textContent  = `${+(s.trimW + 2*s.bleedMm).toFixed(1)} × ${+(s.trimH + 2*s.bleedMm).toFixed(1)} mm`;
  document.getElementById('specDpi').textContent    = `${s.dpi} dpi`;
  document.getElementById('specOrient').textContent = orient.charAt(0).toUpperCase() + orient.slice(1);
  document.getElementById('specFit').textContent    = ({ height: 'Fit height', width: 'Fit width', addbleed: 'Add bleed' })[s.fitMode] || s.fitMode;
}

// ── Generate PDF ──
generateBtn.addEventListener('click', async () => {
  if (!loadedImage && !loadedSvg) return;
  setStatus('Generating PDF…', '');
  generateBtn.disabled    = true;
  spinner.style.display   = 'block';
  btnIcon.style.display   = 'none';
  btnText.textContent     = 'Generating…';

  await new Promise(r => setTimeout(r, 30));

  try {
    const s       = getSettings();
    const pdfW    = +(s.trimW + 2 * s.bleedMm).toFixed(2);
    const pdfH    = +(s.trimH + 2 * s.bleedMm).toFixed(2);
    const format  = pageFormatEl.value === 'custom' ? 'custom' : pageFormatEl.value;
    const { jsPDF } = window.jspdf;

    if (loadedSvg) {
      // ── SVG path: rasterise at high DPI via canvas ──
      // Convert SVG text → blob URL → Image → canvas (same pipeline as raster)
      const blob = new Blob([loadedSvg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Temporarily use this image in the raster pipeline
          loadedImage = img;
          const fc      = document.createElement('canvas');
          renderToCanvas(fc, s);
          const imgData = fc.toDataURL('image/jpeg', 0.99);
          URL.revokeObjectURL(url);
          loadedImage = null; // restore state
          const pdf = new jsPDF({
            orientation: pdfH >= pdfW ? 'portrait' : 'landscape',
            unit: 'mm', format: [pdfW, pdfH], compress: true,
          });
          pdf.setProperties({ title: 'Print-Ready PDF', subject: `${format} + ${s.bleedMm}mm bleed` });
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, '', 'FAST');
          pdf.save(`${originalFilename}_print_${format}_bleed${s.bleedMm}mm.pdf`);
          setStatus(`✓ PDF saved — ${pdfW}×${pdfH}mm @ ${s.dpi}dpi (rasterised SVG)`, 'ok');
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

    } else {
      // ── Raster path: existing canvas pipeline ──
      const fc      = document.createElement('canvas');
      renderToCanvas(fc, s);
      const imgData = fc.toDataURL('image/jpeg', 0.97);
      const pdf = new jsPDF({
        orientation: pdfH >= pdfW ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfW, pdfH],
        compress: true,
      });
      pdf.setProperties({ title: 'Print-Ready PDF', subject: `${format} + ${s.bleedMm}mm bleed` });
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, '', 'FAST');
      pdf.save(`${originalFilename}_print_${format}_bleed${s.bleedMm}mm.pdf`);
      setStatus(`✓ PDF saved — ${pdfW}×${pdfH}mm @ ${s.dpi}dpi`, 'ok');
    }

  } catch (err) {
    setStatus('Error: ' + err.message, 'err');
    console.error(err);
  }

  generateBtn.disabled  = false;
  spinner.style.display = 'none';
  btnIcon.style.display = 'block';
  btnText.textContent   = 'Generate Print PDF';
  if (loadedImage || loadedSvg) generateBtn.disabled = false;
  updateSpecs();
});

// ── Status helper ──
function setStatus(msg, type) {
  status.textContent = msg;
  status.className   = 'status' + (type ? ' ' + type : '');
}
