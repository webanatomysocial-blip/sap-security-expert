import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../utils/getCroppedImg";

export default function ProfilePictureCropModal({ imageSrc, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)",
        zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e293b" }}>
          Adjust your photo
        </div>

        <div style={{ position: "relative", width: "100%", height: 340, background: "#0f172a" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div style={{ padding: "16px 20px" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#e85d2f", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            {saving ? "Saving…" : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
