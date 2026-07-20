import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { downloadFile, issueDownloadToken } from "../services/api";

const EXT_META = {
  pdf:  { icon: "bi-file-earmark-pdf-fill",         color: "#dc2626", bg: "#fef2f2" },
  zip:  { icon: "bi-file-earmark-zip-fill",          color: "#d97706", bg: "#fffbeb" },
  docx: { icon: "bi-file-earmark-word-fill",         color: "#2563eb", bg: "#eff6ff" },
  doc:  { icon: "bi-file-earmark-word-fill",         color: "#2563eb", bg: "#eff6ff" },
  xlsx: { icon: "bi-file-earmark-excel-fill",        color: "#16a34a", bg: "#f0fdf4" },
  xls:  { icon: "bi-file-earmark-excel-fill",        color: "#16a34a", bg: "#f0fdf4" },
  pptx: { icon: "bi-file-earmark-ppt-fill",          color: "#ea580c", bg: "#fff7ed" },
  ppt:  { icon: "bi-file-earmark-ppt-fill",          color: "#ea580c", bg: "#fff7ed" },
  csv:  { icon: "bi-file-earmark-spreadsheet-fill",  color: "#0891b2", bg: "#ecfeff" },
  txt:  { icon: "bi-file-earmark-text-fill",         color: "#7c3aed", bg: "#f5f3ff" },
};
const DEFAULT_META = { icon: "bi-file-earmark-fill", color: "#64748b", bg: "#f8fafc" };

export default function DownloadBlock({ fileUrl, fileName, fileSize, credits, alreadyUnlocked = false }) {
  const { isLoggedIn, refreshCredits } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // idle | loading | unlocked | downloading | error
  const [state, setState] = useState(alreadyUnlocked ? "unlocked" : "idle");
  const [errMsg, setErrMsg] = useState("");

  // Sync if parent resolves alreadyUnlocked after initial render
  useEffect(() => {
    if (alreadyUnlocked) setState("unlocked");
  }, [alreadyUnlocked]);

  const ext = (fileName || "").split(".").pop().toLowerCase();
  const meta = EXT_META[ext] || DEFAULT_META;
  const creditsNum = parseInt(credits) || 0;
  const isFree = creditsNum === 0;

  const triggerStreamDownload = (token) => {
    setState("downloading");
    window.location.href = `/api/downloads/stream?token=${token}`;
    // After a moment the page is still mounted (browser handles the download
    // inline); reset to "unlocked" so the button is usable again.
    setTimeout(() => setState("unlocked"), 3000);
  };

  const handleDownload = async () => {
    if (!isLoggedIn) {
      navigate("/member/login", { state: { from: location.pathname + location.search } });
      return;
    }

    // Already unlocked — just get a fresh token, no credit deduction.
    if (state === "unlocked") {
      setState("loading");
      setErrMsg("");
      try {
        const { data } = await issueDownloadToken(fileUrl);
        triggerStreamDownload(data.token);
      } catch (err) {
        setState("unlocked");
        setErrMsg("Could not start download. Please try again.");
      }
      return;
    }

    setState("loading");
    setErrMsg("");
    try {
      const { data } = await downloadFile(fileUrl, creditsNum);
      refreshCredits();
      if (data.already_downloaded) setState("unlocked");
      triggerStreamDownload(data.token);
    } catch (err) {
      setState("error");
      console.error("[DownloadBlock] download error:", err?.response?.status, err?.response?.data, err?.message);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (!err?.response) {
        setErrMsg("Network error — check your connection and try again.");
      } else if (status === 401) {
        setErrMsg("Please log in as a member to download.");
      } else if (status === 402) {
        setErrMsg(msg || "Not enough credits.");
      } else if (status === 403) {
        setErrMsg("Session expired. Please refresh the page.");
      } else {
        setErrMsg(msg || "Download failed. Please try again.");
      }
    }
  };

  const isUnlocked = state === "unlocked" || state === "downloading";

  return (
    <div className="sap-dl-wrap">
      {/* Left: icon */}
      <div className="sap-dl-icon" style={{ background: meta.bg }}>
        <i className={`bi ${meta.icon}`} style={{ color: meta.color }}></i>
        <span className="sap-dl-ext" style={{ color: meta.color }}>{ext.toUpperCase()}</span>
      </div>

      {/* Middle: name + meta */}
      <div className="sap-dl-body">
        <span className="sap-dl-name">{fileName || "Download"}</span>
        <div className="sap-dl-meta-row">
          {fileSize && <span className="sap-dl-size">{fileSize}</span>}
          {isUnlocked ? (
            <span className="sap-dl-unlocked-badge">
              <i className="bi bi-unlock-fill"></i> Already unlocked
            </span>
          ) : !isFree ? (
            <span className="sap-dl-credit-badge">
              <i className="bi bi-coin"></i> {creditsNum} credit{creditsNum !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="sap-dl-free-badge">Free</span>
          )}
        </div>
      </div>

      {/* Right: action */}
      <div className="sap-dl-right">
        {state === "downloading" ? (
          <span className="sap-dl-ok">
            <i className="bi bi-arrow-down-circle-fill sap-dl-pulse"></i> Downloading…
          </span>
        ) : (
          <button
            className={`sap-dl-btn${isUnlocked ? " sap-dl-btn--redownload" : ""}`}
            onClick={handleDownload}
            disabled={state === "loading"}
          >
            {state === "loading" ? (
              <><i className="bi bi-hourglass-split sap-dl-pulse"></i> Processing…</>
            ) : isUnlocked ? (
              <><i className="bi bi-download"></i> Download again</>
            ) : !isLoggedIn ? (
              <><i className="bi bi-lock-fill"></i> Log in</>
            ) : (
              <><i className="bi bi-download"></i> Download</>
            )}
          </button>
        )}
        {state === "error" && (
          <p className="sap-dl-err"><i className="bi bi-exclamation-triangle-fill"></i> {errMsg}</p>
        )}
      </div>

      <style>{`
        .sap-dl-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 20px;
          margin: 24px 0;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          transition: box-shadow 0.18s, border-color 0.18s;
        }
        .sap-dl-wrap:hover { border-color: #cbd5e1; box-shadow: 0 4px 14px rgba(0,0,0,0.08); }

        .sap-dl-icon {
          flex-shrink: 0;
          width: 56px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }
        .sap-dl-icon i { font-size: 1.55rem; line-height: 1; }
        .sap-dl-ext { font-size: 0.58rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }

        .sap-dl-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        .sap-dl-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
        .sap-dl-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sap-dl-size { font-size: 0.775rem; color: #94a3b8; }
        .sap-dl-credit-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #fefce8;
          color: #854d0e;
          border: 1px solid #fde68a;
          border-radius: 50px;
          padding: 2px 9px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .sap-dl-free-badge {
          display: inline-flex;
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          border-radius: 50px;
          padding: 2px 9px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .sap-dl-unlocked-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 50px;
          padding: 2px 9px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .sap-dl-btn--redownload {
          background: #1d4ed8 !important;
        }
        .sap-dl-btn--redownload:hover:not(:disabled) {
          background: #1e40af !important;
        }

        .sap-dl-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

        .sap-dl-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #0f172a;
          color: #fff;
          border: none;
          border-radius: 9px;
          padding: 9px 18px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, transform 0.1s;
          letter-spacing: 0.01em;
        }
        .sap-dl-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-1px); }
        .sap-dl-btn:active:not(:disabled) { transform: translateY(0); }
        .sap-dl-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        @keyframes sap-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .sap-dl-pulse { animation: sap-pulse 1s ease-in-out infinite; }

        .sap-dl-ok {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #16a34a;
          font-weight: 700;
          font-size: 0.875rem;
        }
        .sap-dl-ok i { font-size: 1.05rem; }

        .sap-dl-err {
          font-size: 0.75rem;
          color: #dc2626;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          max-width: 200px;
          text-align: right;
        }

        @media (max-width: 540px) {
          .sap-dl-wrap { flex-wrap: wrap; gap: 12px; padding: 14px 16px; }
          .sap-dl-right { width: 100%; align-items: stretch; }
          .sap-dl-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
