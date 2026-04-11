# Security Considerations and Hardening Steps

**The fundamental security model**

GitHub Pages serves static files only — no server, no database, no backend. This massively reduces the attack surface. There is no server to compromise, no credentials to steal, no database to inject into. The worst an attacker can do is attack *the browser* of someone using the tool.

---

**jsPDF**

The library is well-established and widely used (8M+ weekly npm downloads). It runs entirely client-side and only writes to a canvas and generates a Blob for download. It has no network calls, no file system access, no eval() of user content. The main historical concerns with jsPDF have been around font embedding and XSS via injected metadata — but since we control exactly what goes into `pdf.setProperties()` and the content is just a JPEG image, there's no vector there.

**Risk: Low.**

---

**The image drop / malicious file scenario**

This is the most interesting question. Let's think through it:

*Can a malicious image crash or exploit the tool?*

The image goes through this pipeline:
1. `FileReader.readAsDataURL()` — reads raw bytes
2. `new Image()` + `img.src = dataURL` — browser decodes it
3. `canvas.drawImage(img)` — browser renders it
4. `ctx.getImageData()` — reads pixel data

Steps 2 and 3 are handled entirely by the browser's native image decoder — the same code that renders every image on every website. If there were exploitable vulnerabilities there, it would be a browser zero-day, not a problem specific to our tool. Such vulnerabilities do occasionally exist but are patched very quickly by browser vendors and are extremely high-value targets for nation-state actors, not casual attacks on print tools.

*Can a "pixel bomb" or decompression bomb crash the browser?*

A very large image (say 20,000 × 20,000 pixels) could consume significant RAM when decoded and drawn to canvas. This could slow or crash the browser tab — but only for the person who dropped it. It can't escape the tab sandbox.

*Can a malicious filename cause damage?*

We use the filename here:
```js
originalFilename = file.name.replace(/\.[^/.]+$/, '');
```
And then inject it into `pdf.save(...)`. A filename like `../../etc/passwd` or `<script>alert(1)</script>` could theoretically be problematic. The `pdf.save()` call just triggers a browser download with that name — the browser sanitises download filenames and won't allow path traversal. The XSS risk via filename is also minimal since the filename is only used in the download dialog, not injected into the DOM.

**I'd still recommend one small hardening measure here — sanitise the filename:**
```js
originalFilename = file.name
  .replace(/\.[^/.]+$/, '')       // strip extension
  .replace(/[^a-zA-Z0-9_\-\s]/g, '_');  // replace special chars
```

*Can malicious EXIF data cause damage?*

We never read EXIF — we just draw the image to canvas and read pixels. EXIF is stripped entirely in this pipeline. No risk.

*Can the tool be used to exfiltrate data?*

Network is disabled in my sandbox, but on GitHub Pages the tool has full internet access. However, the tool makes zero outbound requests (except loading Google Fonts and jsPDF from CDN on startup). There's no fetch(), no XMLHttpRequest, no WebSocket in our code. A malicious image cannot trigger network requests — images don't execute code.

---

**Google Fonts and cdnjs — supply chain risk**

This is actually the most realistic threat vector. We load:
- `fonts.googleapis.com` — Google's CDN, very reliable
- `cdnjs.cloudflare.com/jspdf/2.5.1/jspdf.umd.min.js` — Cloudflare's CDN

If either CDN were compromised and served malicious JS, it would execute in your page with full access to everything the tool can do. This is the classic supply chain attack.

**Mitigations:**
- Pin the jsPDF version (we already do — `2.5.1`)
- Add **Subresource Integrity (SRI)** hashes to the script tag — the browser will refuse to load the file if it doesn't match the expected hash:

```html
<script 
  src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
  integrity="sha512-ACTUAL_HASH_HERE"
  crossorigin="anonymous">
</script>
```

I can generate the correct SRI hash and add it if you'd like.

Alternatively, **self-host jsPDF** — download it and put it in the repo alongside `script.js`. Then you're completely independent of external CDNs. Given the tool is already on GitHub Pages this is easy to do.

---

**Summary table**

| Vector | Risk | Recommendation |
|--------|------|---------------|
| Malicious image crashing browser | Very low | Nothing needed |
| Malicious image executing code | Essentially zero | Nothing needed |
| Decompression bomb slowing tab | Low | Nothing needed |
| Malicious filename | Very low | Sanitise filename (small fix) |
| CDN supply chain attack | Low-medium | Self-host jsPDF or add SRI hash |
| GitHub Pages itself being hacked | Very low | Nothing practical |
| EXIF data exploitation | Zero | Already stripped by canvas |

**Overall: the tool is inherently low-risk by design.** The two concrete improvements worth making are filename sanitisation (5 minutes) and self-hosting or SRI-hashing jsPDF (15 minutes).

Want me to implement both?