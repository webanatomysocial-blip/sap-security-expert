import React, { useEffect, useRef, useState } from "react";
// next-disabled: import "./ConfirmationModal.css";
import useScrollLock from "../../hooks/useScrollLock";

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger,
  showInput,
  inputPlaceholder,
  inputType = "text",
  initialValue = "",
  onConfirm,
  onCancel,
}) => {
  useScrollLock(true); // Always lock when mounted
  const modalRef = useRef(null);
  const [inputValue, setInputValue] = useState(initialValue);

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) setInputValue(initialValue);
  }, [isOpen, initialValue]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  // Trap focus or specific accessibility features could go here if needed

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ maxWidth: "500px" }} // Slightly smaller default for confirmations
      >
        <div className="modal-header">
          <h3 id="modal-title">{title}</h3>
        </div>

        <div className="modal-body">
          <p>{message}</p>
          {showInput && (
            <input
              type={inputType}
              className="form-control"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              style={{ marginTop: "16px" }}
            />
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-cancel"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
          <button
            className={`btn-confirm ${isDanger ? "danger" : ""}`}
            onClick={() => onConfirm(inputValue)}
            style={
              isDanger
                ? { backgroundColor: "#ef4444", borderColor: "#ef4444" }
                : {}
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
