import html2canvas from 'html2canvas';

function cropCanvas(src: HTMLCanvasElement, padding = 20): HTMLCanvasElement {
  const ctx = src.getContext('2d');
  if (!ctx) return src;

  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;

  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const isWhiteOrTransparent = a === 0 || (r > 250 && g > 250 && b > 250);
      if (!isWhiteOrTransparent) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) return src;

  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width, maxX + padding + 1) - cropX;
  const cropH = Math.min(height, maxY + padding + 1) - cropY;

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext('2d')!;
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, cropW, cropH);
  outCtx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return out;
}

function waitFrames(n: number): Promise<void> {
  return new Promise(resolve => {
    let count = 0;
    const tick = () => { if (++count >= n) resolve(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

export async function captureHtmlToPng(htmlString: string): Promise<Blob> {
  const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : htmlString;

  const container = document.createElement('div');
  // Use a large fixed height so content is never clipped. The cropCanvas step
  // will trim all the surplus whitespace back down to the actual content bounds.
  const CAPTURE_W = 900;
  const CAPTURE_H = 4000;

  container.style.cssText = [
    'position:absolute',
    'top:-20000px',
    'left:-10000px',
    `width:${CAPTURE_W}px`,
    `height:${CAPTURE_H}px`,
    'background:#ffffff',
    'color:#000000',
    'color-scheme:light',
    'overflow:hidden',
  ].join(';');
  container.innerHTML = bodyContent;
  document.body.appendChild(container);

  try {
    await waitFrames(4);

    const raw = await html2canvas(container, {
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: false,
      allowTaint: false,
      width: CAPTURE_W,
      height: CAPTURE_H,
      windowWidth: CAPTURE_W,
      windowHeight: CAPTURE_H,
    });

    const cropped = cropCanvas(raw);

    return await new Promise<Blob>((resolve, reject) => {
      cropped.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/png');
    });
  } finally {
    document.body.removeChild(container);
  }
}
