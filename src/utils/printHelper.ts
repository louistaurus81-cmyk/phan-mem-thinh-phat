/**
 * Dedicated Silent / Iframe Print Utility
 * Eliminates document.body.innerHTML replacement and window.location.reload()
 * Preserves complete application state, form inputs, and active UI context.
 */

export interface PrintOptions {
  title?: string;
  customCss?: string;
  pageMargin?: string;
}

/**
 * Print an existing HTML element by ID inside an isolated, hidden iframe
 */
export function printElementViaIframe(elementId: string, options?: PrintOptions): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[printHelper] Print target element #${elementId} not found in DOM.`);
    return false;
  }
  return printHtmlViaIframe(element.innerHTML, options);
}

/**
 * Print arbitrary HTML markup inside an isolated, hidden iframe
 */
export function printHtmlViaIframe(htmlContent: string, options?: PrintOptions): boolean {
  try {
    // Remove previous print iframe if still present
    const oldIframe = document.getElementById('tp-silent-print-iframe');
    if (oldIframe && oldIframe.parentNode) {
      oldIframe.parentNode.removeChild(oldIframe);
    }

    // Create a hidden, isolated iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'tp-silent-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      console.error('[printHelper] Cannot access iframe document.');
      iframe.remove();
      return false;
    }

    // Clone all stylesheets and style tags from the parent document
    let styleTags = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(tag => {
      styleTags += tag.outerHTML + '\n';
    });

    const pageMargin = options?.pageMargin || '5mm';
    const defaultPrintStyles = `
      @page {
        margin: ${pageMargin};
        size: auto;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
      }
      html, body {
        margin: 0;
        padding: 4px;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options?.title || 'Thịnh Phát Print'}</title>
          ${styleTags}
          <style>
            ${defaultPrintStyles}
            ${options?.customCss || ''}
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print after resources and fonts have had time to render
    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('[printHelper] Error executing print command in iframe:', err);
      } finally {
        // Auto remove iframe safely from DOM without affecting parent page
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1200);
      }
    };

    // Wait for all images inside the iframe to load before printing
    const images = Array.from(doc.images);
    if (images.length > 0) {
      let loaded = 0;
      const total = images.length;
      const onDone = () => {
        loaded++;
        if (loaded >= total) {
          setTimeout(triggerPrint, 150);
        }
      };

      images.forEach(img => {
        if (img.complete) {
          loaded++;
        } else {
          img.addEventListener('load', onDone);
          img.addEventListener('error', onDone);
        }
      });

      if (loaded >= total) {
        setTimeout(triggerPrint, 150);
      }
    } else {
      setTimeout(triggerPrint, 150);
    }

    return true;
  } catch (err) {
    console.error('[printHelper] Fatal error in printHtmlViaIframe:', err);
    return false;
  }
}

/**
 * Dedicated barcode label printer helper
 */
export function printLabel(data: {
  productName: string;
  price: number;
  skuOrBarcode: string;
  storeName?: string;
  imei?: string;
}): boolean {
  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price);
  
  const labelHtml = `
    <div style="width: 50mm; height: 30mm; padding: 2mm; box-sizing: border-box; text-align: center; border: 1px dashed #ccc; margin: auto; display: flex; flex-direction: column; justify-content: space-between;">
      <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
        ${data.storeName || 'CỬA HÀNG THỊNH PHÁT'}
      </div>
      <div style="font-size: 10px; font-weight: bold; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
        ${data.productName}
      </div>
      <div style="font-size: 12px; font-weight: 900; color: #000;">
        ${formattedPrice}
      </div>
      <div style="font-family: monospace; font-size: 9px; font-weight: bold; letter-spacing: 1px;">
        ${data.imei ? `IMEI: ${data.imei}` : `MÃ: ${data.skuOrBarcode}`}
      </div>
    </div>
  `;

  return printHtmlViaIframe(labelHtml, {
    title: `Tem nhãn - ${data.productName}`,
    pageMargin: '0mm',
    customCss: `
      @page { size: 50mm 30mm; margin: 0; }
      body { margin: 0; padding: 0; }
    `
  });
}
