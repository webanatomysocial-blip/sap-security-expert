import React, { useEffect, useState } from "react";
// next-disabled: import "./Toast.css";
const Toast = ({ id, message, type, removeToast, duration }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  // Handle Close
  const handleClose = () => {
    setIsRemoving(true);
    setTimeout(() => {
      removeToast(id);
    }, 300); // Match animation duration
  };

  // Auto-dismiss logic
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id]);

  return (
    <div
      className={`toast toast-${type} ${isRemoving ? "removing" : ""}`}
      role="alert"
    >
      <div className="toast-icon">
        {type === "success" && <i className="bi bi-check-circle-fill"></i>}
        {type === "error" && <i className="bi bi-x-circle-fill"></i>}
        {type === "warning" && (
          <i className="bi bi-exclamation-triangle-fill"></i>
        )}
        {type === "info" && <i className="bi bi-exclamation-circle-fill"></i>}
      </div>
      <div className="toast-content">{message}</div>
      <button className="toast-close" onClick={handleClose} aria-label="Close">
        <i className="bi bi-x"></i>
      </button>
    </div>
  );
};

export default Toast;
