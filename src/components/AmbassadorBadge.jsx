import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * AmbassadorBadge — canvas-composited badge.
 *
 * The base PNG has "USA - 2026" baked in. We draw the base onto a <canvas>
 * and then paint a dark pill + globe + dynamic "COUNTRY - YEAR" text directly
 * on top of it. This means:
 *   • Right-click → Save / drag-and-drop → always has the correct country.
 *   • The HTML overlay pill on top gives crisp vector rendering on screen.
 *   • The lightbox works exactly as before.
 */

/* ── pill geometry constants (% of badge size, perfectly mapped to the base image) ──
 * In the 958x958 base PNG, the original pill spans:
 *   x: 188 to 770 (w = 582) -> left: 19.624%, width: 60.752%
 *   y: 708 to 813 (h = 105) -> top: 73.904%, height: 10.960%
 *   corner radius = 24px -> 22.86% of pill height
 */
const PILL = {
  left:        188 / 958, // ~0.19624
  top:         708 / 958, // ~0.73904
  width:       582 / 958, // ~0.60752
  height:      105 / 958, // ~0.10960
  radiusRatio: 24 / 105,  // ~0.22857 (corner radius relative to pill height)
};

/** Helper to draw a rounded rectangle on Canvas 2D context */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y,          x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x,         y + height, radius);
    ctx.arcTo(x,         y + height, x,         y,          radius);
    ctx.arcTo(x,         y,          x + width, y,          radius);
  }
}

/** Draw the composited badge onto `canvas`. */
function drawBadgeOnCanvas(canvas, baseImg, country, year) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");

  /* 1. Draw the base image */
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(baseImg, 0, 0, W, H);

  /* 2. Compute pill box in canvas pixels */
  const px = Math.round(PILL.left   * W);
  const py = Math.round(PILL.top    * H);
  const pw = Math.round(PILL.width  * W);
  const ph = Math.round(PILL.height * H);
  const r  = Math.round(ph * PILL.radiusRatio);

  /* 3. Paint dark navy pill background (completely covers the baked-in original gold pill) */
  const grad = ctx.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0,   "#14243b");
  grad.addColorStop(0.5, "#0d192a");
  grad.addColorStop(1,   "#08101d");

  ctx.beginPath();
  drawRoundedRect(ctx, px, py, pw, ph, r);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* 4. Elegant gold border around the pill */
  const borderGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
  borderGrad.addColorStop(0,   "#f6d365");
  borderGrad.addColorStop(0.5, "#dfb552");
  borderGrad.addColorStop(1,   "#b8860b");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth   = Math.max(1.5, Math.round(pw * 0.0055));
  ctx.stroke();

  /* 5. Globe icon, Separator, and "COUNTRY - YEAR" text — Center-aligned as a unified group */
  // Determine text font size first so we know text width for perfect centering
  let fSize = Math.max(8, Math.round(ph * 0.44));
  ctx.font = `900 ${fSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const textString = `${country} - ${year}`;

  const globeR   = ph * 0.26;
  const globeDia = globeR * 2;
  const gapGlobeSep = pw * 0.035;
  const sepW        = Math.max(1.2, pw * 0.005);
  const gapSepText  = pw * 0.035;
  const paddingSides = pw * 0.04;

  // Maximum allowed width for text so the entire group fits inside the pill
  const maxAllowedTextW = pw - paddingSides * 2 - (globeDia + gapGlobeSep + sepW + gapSepText);
  while (ctx.measureText(textString).width > maxAllowedTextW && fSize > 6) {
    fSize--;
    ctx.font = `900 ${fSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  }

  const measuredTextW = ctx.measureText(textString).width;
  const totalGroupW   = globeDia + gapGlobeSep + sepW + gapSepText + measuredTextW;

  // Center the whole group horizontally in the pill
  const groupStartX = px + (pw - totalGroupW) / 2;

  // Globe position
  const globeX = groupStartX + globeR;
  const globeY = py + ph / 2;

  ctx.save();
  ctx.strokeStyle = "#f6d365";
  ctx.lineWidth   = Math.max(0.6, globeR * 0.16);

  // outer circle
  ctx.beginPath();
  ctx.arc(globeX, globeY, globeR, 0, Math.PI * 2);
  ctx.stroke();

  // equator line
  ctx.beginPath();
  ctx.moveTo(globeX - globeR, globeY);
  ctx.lineTo(globeX + globeR, globeY);
  ctx.stroke();

  // longitude oval
  ctx.beginPath();
  ctx.ellipse(globeX, globeY, globeR * 0.55, globeR, 0, 0, Math.PI * 2);
  ctx.stroke();

  // latitude lines
  const latY1 = globeY - globeR * 0.42;
  const latY2 = globeY + globeR * 0.42;
  [latY1, latY2].forEach((ly) => {
    const hw = Math.sqrt(Math.max(0, globeR * globeR - (ly - globeY) ** 2));
    ctx.beginPath();
    ctx.moveTo(globeX - hw, ly);
    ctx.lineTo(globeX + hw, ly);
    ctx.stroke();
  });
  ctx.restore();

  /* 6. Gold vertical separator line */
  const sepX = groupStartX + globeDia + gapGlobeSep;
  ctx.save();
  const sepGrad = ctx.createLinearGradient(sepX, py + ph * 0.22, sepX, py + ph * 0.78);
  sepGrad.addColorStop(0, "#f6d365");
  sepGrad.addColorStop(1, "#b8860b");
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth   = sepW;
  ctx.beginPath();
  ctx.moveTo(sepX, py + ph * 0.22);
  ctx.lineTo(sepX, py + ph * 0.78);
  ctx.stroke();
  ctx.restore();

  /* 7. Centered "COUNTRY - YEAR" text */
  const textX = sepX + sepW + gapSepText;
  const textY = py + ph / 2 + 0.5;

  const textGrad = ctx.createLinearGradient(textX, textY - fSize / 2, textX, textY + fSize / 2);
  textGrad.addColorStop(0,   "#ffffff");
  textGrad.addColorStop(0.6, "#fff3d0");
  textGrad.addColorStop(1,   "#ffd875");
  ctx.fillStyle   = textGrad;
  ctx.textAlign   = "left";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${Math.max(0, fSize * 0.07)}px`;
  ctx.fillText(textString, textX, textY, maxAllowedTextW);
}

/** Trigger high-resolution 958x958 PNG download of the badge with dynamic country & year */
function downloadBadgeImage(country, year) {
  const displayCountry = String(country || "USA").trim().toUpperCase();
  const displayYear    = String(year    || "2026").trim();

  const offCanvas = document.createElement("canvas");
  offCanvas.width  = 958;
  offCanvas.height = 958;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "/assets/images/ambassador-badge-base.png";
  img.onload = () => {
    drawBadgeOnCanvas(offCanvas, img, displayCountry, displayYear);
    const link = document.createElement("a");
    link.download = `SAP-Security-Expert-Ambassador-${displayCountry}-${displayYear}.png`;
    link.href = offCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
}

const AmbassadorBadge = ({ country = "USA", year = "2026", size = 280, style, isLightbox = false, onClick }) => {
  const [isOpen,   setIsOpen]   = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const canvasRef  = useRef(null);
  const baseImgRef = useRef(null);   // cached Image object (shared across redraws)

  const displayCountry = String(country || "USA").trim().toUpperCase();
  const displayYear    = String(year    || "2026").trim();
  const numSize        = Number(size) || 280;
  const isSmall        = numSize < 200;
  const fullText       = `${displayCountry} - ${displayYear}`;

  /* Font size for the HTML overlay pill (screen display):
   * Scales font so the FULL country name, globe icon, and separator comfortably fit and center.
   */
  const charWidthFactor = 0.54;
  const pillAvailableTextRatio = isSmall ? 0.54 : 0.46;
  const maxFontForPill  = Math.max(3.5, Math.floor((pillAvailableTextRatio * numSize) / (charWidthFactor * Math.max(1, fullText.length))));
  const fontSize        = Math.min(maxFontForPill, Math.round(numSize * 0.046));

  /* ── Draw onto canvas whenever country/year/size changes ── */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = baseImgRef.current;
    if (!canvas || !img || !img.complete) return;
    drawBadgeOnCanvas(canvas, img, displayCountry, displayYear);
  }, [displayCountry, displayYear]);

  /* Load the base image once; redraw whenever props change.
   * We render the internal canvas at full master resolution (958×958)
   * so quality is ultra-sharp and crystal clear even when enlarged or saved.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Master resolution matching base image for maximum sharpness
    canvas.width  = 958;
    canvas.height = 958;

    if (!baseImgRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/assets/images/ambassador-badge-base.png";
      img.onload = () => {
        baseImgRef.current = img;
        setImgReady(true);
        drawBadgeOnCanvas(canvas, img, displayCountry, displayYear);
      };
    } else {
      drawBadgeOnCanvas(canvas, baseImgRef.current, displayCountry, displayYear);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Redraw when country/year changes (size change handled above) */
  useEffect(() => {
    if (imgReady) redraw();
  }, [displayCountry, displayYear, imgReady, redraw]);

  const handleClick = (e) => {
    if (onClick) { onClick(e); return; }
    if (!isLightbox) setIsOpen(true);
  };

  /* ESC + scroll lock for lightbox */
  useEffect(() => {
    if (!isOpen || isLightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, isLightbox]);

  return (
    <div
      className="ambassador-badge-wrapper"
      onClick={handleClick}
      title={isLightbox ? "" : "Click to enlarge & download badge"}
      style={{
        position: "relative",
        display: "inline-block",
        width: numSize,
        maxWidth: "100%",
        aspectRatio: "1 / 1",
        height: "auto",
        userSelect: "none",
        containerType: "inline-size",
        cursor: isLightbox ? "default" : "pointer",
        transition: "transform 0.2s ease, filter 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isLightbox) {
          e.currentTarget.style.transform = "scale(1.03)";
          e.currentTarget.style.filter    = "brightness(1.05)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLightbox) {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.filter    = "brightness(1)";
        }
      }}
    >
      {/* ── Canvas: the composited image (always has the correct dynamic country & year) ── */}
      <canvas
        ref={canvasRef}
        aria-label={`SAP Security Expert Country Ambassador - ${displayCountry} ${displayYear}`}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
        }}
      />

      {/* ── HTML overlay pill: crisp vector rendering on screen ──
          Positioned to match PILL constants perfectly so the base gold line is 100% covered.
          Center-aligned to ensure globe icon, separator, and text are harmoniously balanced.
          pointerEvents: none ensures native right-click / drag accesses the canvas underneath. */}
      {imgReady && (
        <div
          className="badge-country-pill-overlay"
          style={{
            position: "absolute",
            left:   `${PILL.left   * 100}%`,
            top:    `${PILL.top    * 100}%`,
            width:  `${PILL.width  * 100}%`,
            height: `${PILL.height * 100}%`,
            background: "linear-gradient(180deg, #14243b 0%, #0d192a 50%, #08101d 100%)",
            borderRadius: `calc(${PILL.height * 100}cqw * ${PILL.radiusRatio})`,
            border: `${Math.max(1, numSize * 0.0055)}px solid #dfb552`,
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            padding: "0 3.5%",
            justifyContent: "center",
            gap: isSmall ? "2%" : "3%",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.4)",
            pointerEvents: "none",   // pass clicks & right-clicks through to canvas
          }}
        >
          {/* Globe icon — always visible */}
          <svg
            viewBox="0 0 24 24"
            style={{
              height: "56%",
              width: "auto",
              flexShrink: 0,
            }}
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="#f6d365" strokeWidth="1.6" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="#f6d365" strokeWidth="1.3" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="#f6d365" strokeWidth="1.3" />
            <path d="M3.6 9h16.8M3.6 15h16.8" fill="none" stroke="#f6d365" strokeWidth="1.3" />
          </svg>

          {/* Separator line — always visible */}
          <div
            style={{
              height: "52%",
              width: Math.max(1, Math.round(numSize * 0.004)),
              background: "linear-gradient(to bottom, #f6d365, #b8860b)",
              flexShrink: 0,
            }}
          />

          {/* Country & Year text — center aligned */}
          <span
            style={{
              color: "#fffae0",
              background: "linear-gradient(to bottom, #ffffff 0%, #fff3d0 60%, #ffd875 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: isSmall ? `${fontSize}px` : `clamp(7px, 4.4cqw, ${fontSize}px)`,
              fontWeight: "900",
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: isSmall ? "0.01em" : "0.05em",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {displayCountry} - {displayYear}
          </span>
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      {isOpen && !isLightbox && createPortal(
        <div
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            cursor: "zoom-out",
            padding: 24,
            animation: "ambassador-badge-fade-in 0.15s ease-out",
          }}
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            aria-label="Close"
            style={{
              position: "fixed", top: 20, right: 20,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "50%",
              width: 42, height: 42,
              color: "#fff", fontSize: "1.6rem",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1, zIndex: 2,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          >
            &times;
          </button>

          {/* Badge container in modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
              cursor: "default",
              animation: "ambassador-badge-scale-in 0.2s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <AmbassadorBadge
              country={displayCountry}
              year={displayYear}
              size={Math.min(window.innerWidth - 80, window.innerHeight - 160, 480)}
              isLightbox={true}
            />

            {/* Direct Download Button */}
            <button
              onClick={() => downloadBadgeImage(displayCountry, displayYear)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #dfb552 0%, #f6d365 100%)",
                color: "#0f172a",
                fontWeight: "800",
                fontSize: "0.92rem",
                padding: "10px 24px",
                borderRadius: 30,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(223, 181, 82, 0.4)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(223, 181, 82, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(223, 181, 82, 0.4)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Badge ({displayCountry} - {displayYear})
            </button>
          </div>
          <style>{`
            @keyframes ambassador-badge-fade-in  { from { opacity: 0; }              to { opacity: 1; } }
            @keyframes ambassador-badge-scale-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
          `}</style>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AmbassadorBadge;
export { downloadBadgeImage };

