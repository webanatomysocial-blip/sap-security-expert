import React, { useState } from "react";
import Image from "next/image";
// next-disabled: import "../css/Sidebar.css";
const Sidebar = () => {
  const [activeTab, setActiveTab] = useState("newest");

  const members = {
    newest: [
      {
        name: "John Doe",
        role: "SAP Consultant",
        avatar: "https://ui-avatars.com/api/?name=John+Doe&background=random",
      },
      {
        name: "Jane Smith",
        role: "Security Analyst",
        avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=random",
      },
      {
        name: "Mike Ross",
        role: "GRC Expert",
        avatar: "https://ui-avatars.com/api/?name=Mike+Ross&background=random",
      },
    ],
    active: [
      {
        name: "Alice Wong",
        role: "SAP Architect",
        avatar: "https://ui-avatars.com/api/?name=Alice+Wong&background=random",
      },
      {
        name: "Bob builder",
        role: "Engineer",
        avatar:
          "https://ui-avatars.com/api/?name=Bob+Builder&background=random",
      },
    ],
    top: [
      {
        name: "Sarah Connor",
        role: "Cyber Lead",
        avatar:
          "https://ui-avatars.com/api/?name=Sarah+Connor&background=random",
      },
    ],
  };

  return (
    <div className="sidebar-left">
      <div className="sidebar-section">
        <h3>Active Members</h3>
        <div className="sidebar-tabs">
          <button
            className={activeTab === "newest" ? "active" : ""}
            onClick={() => setActiveTab("newest")}
          >
            Newest
          </button>
          <button
            className={activeTab === "active" ? "active" : ""}
            onClick={() => setActiveTab("active")}
          >
            Active
          </button>
          <button
            className={activeTab === "top" ? "active" : ""}
            onClick={() => setActiveTab("top")}
          >
            Top
          </button>
        </div>
        <div className="members-list">
          {members[activeTab].map((member) => (
            <div key={member.name} className="member-item">
              <Image
                src={member.avatar}
                alt={member.name}
                className="member-avatar"
                width={36}
                height={36}
              />
              <div className="member-info">
                <div className="member-name">{member.name}</div>
                <div className="member-role">{member.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Popular Tags</h3>
        <div className="tags-cloud">
          <span className="tag">#SAPSecurity</span>
          <span className="tag">#GRC</span>
          <span className="tag">#Fiori</span>
          <span className="tag">#HANA</span>
          <span className="tag">#Auditing</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
