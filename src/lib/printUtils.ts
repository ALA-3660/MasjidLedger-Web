/**
 * MasjidLedger Production Isolated Print System
 * 
 * Provides strict document isolation during printing to prevent:
 * - Application chrome (Navbar, Sidebar, Floating buttons, Dashboard tabs)
 * - Modal backdrops, controls, buttons, toolbars
 * - Any background UI or text from bleeding into the printed document.
 */

export interface PrintOptions {
  title?: string;
  pageSize?: 'A4' | 'POS_80' | 'POS_58' | 'letter';
  pageOrientation?: 'portrait' | 'landscape';
  margin?: string;
  customStyles?: string;
  preserveColors?: boolean;
}

/**
 * Gather all styles from the current document including Tailwind CSS and font links.
 */
function gatherCurrentDocumentStyles(): string {
  let styleMarkup = '';

  // Copy font links and stylesheet links
  const links = document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]');
  links.forEach((link) => {
    styleMarkup += link.outerHTML + '\n';
  });

  // Copy inline style tags
  const styles = document.querySelectorAll('style');
  styles.forEach((style) => {
    styleMarkup += `<style>${style.innerHTML}</style>\n`;
  });

  return styleMarkup;
}

/**
 * Prints a specific DOM element in complete isolation using a temporary hidden iframe.
 * Falls back gracefully to zero-bleed parent isolation if iframe printing is restricted.
 */
export function printElement(
  target: HTMLElement | string,
  options: PrintOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      title = 'MasjidLedger Document',
      pageSize = 'A4',
      pageOrientation = 'portrait',
      margin = pageOrientation === 'landscape' ? '8mm 10mm' : '10mm 12mm',
      customStyles = '',
      preserveColors = true,
    } = options;

    const element =
      typeof target === 'string'
        ? (document.getElementById(target) || document.querySelector(target)) as HTMLElement | null
        : target;

    if (!element) {
      console.warn('[printElement] Target printable element not found:', target);
      resolve(false);
      return;
    }

    try {
      // Remove any existing print frame
      const oldFrame = document.getElementById('masjidledger-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'masjidledger-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      const headStyles = gatherCurrentDocumentStyles();
      const contentHtml = element.outerHTML;

      const pageRule =
        pageSize === 'A4'
          ? `@page { size: A4 ${pageOrientation} !important; margin: ${margin} !important; }`
          : pageSize === 'POS_80'
          ? `@page { size: 80mm auto !important; margin: 2mm 3mm !important; }`
          : pageSize === 'POS_58'
          ? `@page { size: 58mm auto !important; margin: 1mm 2mm !important; }`
          : `@page { size: auto !important; margin: ${margin} !important; }`;

      const printHtml = `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${headStyles}
  <style>
    ${pageRule}
    *, *::before, *::after {
      box-sizing: border-box !important;
      ${preserveColors ? '-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;' : ''}
    }
    html, body {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: 'Hind Siliguri', 'Tiro Bangla', 'Baloo Da 2', sans-serif !important;
    }
    /* Hide all screen buttons, controls, bars, and non-print items */
    .print\\:hidden,
    .no-print,
    .print-controls-bar,
    .print-hidden,
    button:not(.allow-print),
    .report-screen-ui {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
    }
    /* Remove modal fixed overlays, shadows, and scroll containers inside print */
    .fixed, .relative, .overflow-y-auto, .overflow-hidden {
      position: static !important;
      overflow: visible !important;
      max-height: none !important;
      height: auto !important;
    }
    .shadow-2xl, .shadow-xl, .shadow-lg, .shadow-md, .shadow-sm, .shadow-xs {
      box-shadow: none !important;
    }
    .rounded-2xl, .rounded-xl, .rounded-3xl {
      border-radius: 0 !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    .break-inside-avoid {
      page-break-inside: avoid !important;
    }
    ${customStyles}
  </style>
</head>
<body class="bg-white text-slate-900 font-sans print-ready">
  ${contentHtml}
</body>
</html>`;

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // Remove iframe after short delay
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              iframe.remove();
            }
            resolve(true);
          }, 1500);
        } catch (e) {
          console.error('[printElement] Error during iframe print invocation:', e);
          fallbackPrint(element, options);
          resolve(false);
        }
      };

      // Ensure images/fonts in iframe are loaded before printing
      if (iframe.contentWindow) {
        iframe.contentWindow.onload = () => {
          setTimeout(triggerPrint, 250);
        };
        // Safety timeout in case onload doesn't fire immediately
        setTimeout(triggerPrint, 600);
      } else {
        triggerPrint();
      }
    } catch (err) {
      console.warn('[printElement] Iframe isolation failed, falling back to body class print:', err);
      fallbackPrint(element, options);
      resolve(true);
    }
  });
}

/**
 * Fallback print mechanism that applies strict print isolation classes to the parent document.
 */
function fallbackPrint(element: HTMLElement, options: PrintOptions) {
  const previousTitle = document.title;
  if (options.title) {
    document.title = options.title;
  }

  document.body.classList.add('print-modal-active');
  element.classList.add('print-target-active');

  const cleanUp = () => {
    document.body.classList.remove('print-modal-active');
    element.classList.remove('print-target-active');
    document.title = previousTitle;
    window.removeEventListener('afterprint', cleanUp);
  };

  window.addEventListener('afterprint', cleanUp, { once: true });
  window.print();
  setTimeout(cleanUp, 2000);
}
