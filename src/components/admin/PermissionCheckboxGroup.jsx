import {
  LuFileText,
  LuMegaphone,
  LuImage,
  LuMessageSquare,
  LuSearch,
  LuStar,
} from "react-icons/lu";

const PERMISSION_OPTIONS = [
  {
    key: "can_manage_blogs",
    label: "Manage Blogs",
    description: "Create and submit blog posts for approval",
    icon: LuFileText,
  },
  {
    key: "can_manage_ads",
    label: "Manage Ads",
    description: "Upload and manage advertisement banners",
    icon: LuImage,
  },
  {
    key: "can_manage_comments",
    label: "Manage Comments",
    description: "Moderate reader comments",
    icon: LuMessageSquare,
  },
  {
    key: "can_manage_announcements",
    label: "Manage Announcements",
    description: "Create and publish announcements",
    icon: LuMegaphone,
  },
  {
    key: "can_review_blogs",
    label: "Review Blogs",
    description: "Approve or reject contributor blog submissions",
    icon: LuSearch,
  },
  {
    key: "can_access_premium_articles",
    label: "Access All Premium Articles",
    description: "Allow reading paid/premium articles without a subscription",
    icon: LuStar,
  },
];

/**
 * PermissionCheckboxGroup
 * Props:
 *   value: { can_manage_blogs: bool, can_manage_ads: bool, ... }
 *   onChange: (key, checked) => void
 *   disabled?: bool
 */
const PermissionCheckboxGroup = ({
  value = {},
  onChange,
  disabled = false,
}) => {
  return (
    <div className="permission-group">
      {PERMISSION_OPTIONS.map(({ key, label, description, icon: Icon }) => (
        <label
          key={key}
          className={`permission-item ${value[key] ? "checked" : ""} ${disabled ? "disabled" : ""}`}
        >
          <input
            type="checkbox"
            checked={!!value[key]}
            onChange={(e) => !disabled && onChange(key, e.target.checked)}
            disabled={disabled}
          />
          <div className="permission-icon">
            <Icon />
          </div>
          <div className="permission-text">
            <span className="permission-label">{label}</span>
            <span className="permission-desc">{description}</span>
          </div>
        </label>
      ))}
    </div>
  );
};

export default PermissionCheckboxGroup;
