import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const ActionMenu = ({ children, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const estimatedDropdownHeight = 180; // approximate height of the actions menu
      
      let topPos = `${rect.bottom + 8}px`;
      let bottomPos = 'auto';
      
      // If there's not enough space below, but space above, render drop-up
      if (viewportHeight - rect.bottom < estimatedDropdownHeight && rect.top > estimatedDropdownHeight) {
        topPos = 'auto';
        bottomPos = `${viewportHeight - rect.top + 8}px`;
      }

      setDropdownStyle({
        position: 'fixed',
        top: topPos,
        bottom: bottomPos,
        left: `${rect.right}px`,
        transform: 'translateX(-100%)',
        zIndex: 99999
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedMenuBtn = menuRef.current && menuRef.current.contains(event.target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (!clickedMenuBtn && !clickedDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    const handleScroll = () => setIsOpen(false);
    // Close on scroll to avoid floating fixed menu
    window.addEventListener("scroll", handleScroll, true); 

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  return (
    <div className="action-menu-container" ref={menuRef}>
      <button
        className="action-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="More Actions"
      >
        &#8942;
      </button>
      {isOpen && createPortal(
        <div 
          className="action-menu-dropdown" 
          onClick={() => setIsOpen(false)}
          ref={dropdownRef}
          style={{ ...dropdownStyle, margin: 0 }}
        >
          {items && items.length > 0 ? (
            items.map((item, idx) => {
              if (item.separator) return <div key={idx} className="action-menu-separator" />;
              return (
                <button
                  key={idx}
                  className={`action-menu-item ${item.danger ? 'danger' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    item.onClick && item.onClick();
                  }}
                >
                  {item.icon && <i className={`bi ${item.icon}`} style={{ marginRight: 6 }}></i>}
                  {item.label}
                </button>
              );
            })
          ) : children}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActionMenu;
