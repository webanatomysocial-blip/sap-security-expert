import React, { useState, useEffect } from "react";
// next-disabled: import "../../css/AdminDashboard.css";
import useScrollLock from "../../hooks/useScrollLock";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getAnnouncements, saveAnnouncement } from "../../services/api";
import api from "../../services/api";
import { downloadCSV } from "../../services/exportUtils";

import AnnouncementList from "./announcements/AnnouncementList";
import AnnouncementModal from "./announcements/AnnouncementModal";

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  useScrollLock(isModalOpen);
  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 19).replace("T", " "),
    link: "",
    status: "active",
    comments: 0,
    publish_date: "",
  });

  const fetchAnnouncementsData = async () => {
    try {
      const res = await getAnnouncements(true);
      if (res.data) setAnnouncements(res.data);
    } catch (error) {
      addToast("Failed to fetch announcements", "error");
    }
  };

  useEffect(() => {
    fetchAnnouncementsData();
  }, []);

  const handleOpenModal = (announcement = null) => {
    if (announcement) {
      setEditingId(announcement.id);
      setFormData(announcement);
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        link: "",
        status: "active",
        comments: 0,
        publish_date: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 19).replace("T", " ");
      const payload = { ...formData, date: formattedDate };
      if (editingId) payload.id = editingId;
      const res = await saveAnnouncement(payload);
      if (res.data.status === "success") {
        fetchAnnouncementsData();
        handleCloseModal();
        addToast(
          editingId
            ? "Announcement updated successfully"
            : "Announcement created successfully",
          "success",
        );
      } else {
        addToast("Failed to save.", "error");
      }
    } catch (error) {
      addToast("Error saving announcement", "error");
    }
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Announcement?",
      message: "Are you sure?",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await api.delete(`/admin/announcements?id=${id}`);
          if (res.data.status === "success") {
            fetchAnnouncementsData();
            addToast("Announcement deleted successfully", "success");
          }
        } catch (error) {
          addToast("Error deleting announcement", "error");
        }
      },
    });
  };

  const handleReview = async (id, action) => {
    try {
      const res = await api.post(`/admin/announcements/${id}/review`, {
        action,
      });
      if (res.data.status === "success") {
        fetchAnnouncementsData();
        addToast(`Announcement ${action}ed successfully`, "success");
      } else {
        addToast(res.data.message || "Action failed", "error");
      }
    } catch (error) {
      addToast(`Error ${action}ing announcement`, "error");
    }
  };

  const formatDateLabel = (dateString) => {
    if (!dateString) return "No Date";
    const d = new Date(
      dateString.includes(" ")
        ? dateString.replace(" ", "T") + "Z"
        : dateString + "T00:00:00Z",
    );
    return isNaN(d.getTime())
      ? dateString
      : d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
  };

  const handleExport = () => {
    const headers = [
      { label: "Title", key: "title" },
      { label: "Status", key: "status" },
      { label: "Date", key: "date" },
    ];
    downloadCSV(announcements, headers, "announcements_list");
  };

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Announcements</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleExport} className="btn-filter" title="Export to CSV">
            <i className="bi bi-download"></i> Export
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-lg"></i> New Announcement
          </button>
        </div>
      </div>

      <AnnouncementList
        announcements={announcements}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        onReview={handleReview}
        formatDate={formatDateLabel}
      />

      <AnnouncementModal
        isOpen={isModalOpen}
        editingId={editingId}
        formData={formData}
        handleChange={handleChange}
        handleClose={handleCloseModal}
        handleSubmit={handleSubmit}
      />
    </div>
  );
};

export default AdminAnnouncements;
