import { useEffect, useMemo, useRef, useState } from "react";

// Renders arbitrary HTML in a sandboxed iframe to prevent style/script leakage.
// - Disables scripts via sandbox (no allow-scripts)
// - Allows same-origin so we can auto-resize height
// - Forces links to open in a new tab
export const SafeHtml = ({ html, className, style }) => {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(0);

  // Build the iframe document using srcDoc
  const srcDoc = useMemo(() => {
    const safeHtml = typeof html === "string" ? html : "";
    // Minimal base styles to keep content readable without impacting app
    const baseCss = `
      :root { color-scheme: light dark; }
      html, body { margin: 0; padding: 0; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      img, video { max-width: 100%; height: auto; }
      a { word-break: break-word; }
    `;
    // We also adjust anchors post-load to ensure target/rel are set
    return `<!doctype html><html><head><meta charset="utf-8" /><style>${baseCss}</style></head><body><div class="__ep_email_root">${safeHtml}</div></body></html>`;
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const newHeight = Math.max(
          doc.documentElement?.scrollHeight || 0,
          doc.body?.scrollHeight || 0
        );
        if (newHeight && newHeight !== height) setHeight(newHeight);
      } catch (e) {
        console.error(e);
      }
    };

    const onLoad = () => {
      adjustHeight();
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        // Ensure all anchors open in a new tab
        doc.querySelectorAll("a").forEach((a) => {
          try {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
          } catch (e) {
            console.error(e);
          }
        });
        // Recalculate height when images load
        doc.querySelectorAll("img").forEach((img) => {
          img.addEventListener("load", adjustHeight);
        });
        // Observe DOM mutations to keep height in sync
        const observer = new MutationObserver(() => adjustHeight());
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: true });
        // Cleanup on next load/unmount
        iframe.__epCleanup = () => {
          try { observer.disconnect(); } catch (e) { console.error(e); }
          try {
            doc.querySelectorAll("img").forEach((img) => {
              img.removeEventListener("load", adjustHeight);
            });
          } catch (e) { console.error(e); }
        };
      } catch (e) {
        console.error(e);
      }
    };

    iframe.addEventListener("load", onLoad);
    // If already loaded (srcDoc updates can load synchronously), adjust height
    adjustHeight();

    return () => {
      try { iframe.removeEventListener("load", onLoad); } catch (e) { console.error(e); }
      try { if (iframe.__epCleanup) iframe.__epCleanup(); } catch (e) { console.error(e); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{ width: "100%", border: 0, display: "block", height: height || 0, ...style }}
      // Important: allow-same-origin so we can measure height; do NOT allow scripts
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      aria-label="Email content"
    />
  );
};
