import React, { useState } from 'react';
import { 
  LayoutDashboard, PackageSearch, FileText, ClipboardList, 
  LogOut, Users, Menu, X, ChevronLeft, ChevronRight, 
  Wifi, WifiOff, RefreshCw, History
} from 'lucide-react';

export default function Sidebar({
  role, active, onNav, onLogout, isCollapsed, onToggleCollapse,
  isOnline, syncing, errorMsg, lowStockCount, onRefresh
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getNavItems = () => {
    switch(role) {
      case "chef": return [
        { id: "summary", icon: LayoutDashboard, label: "Executive Dashboard" },
        { id: "inventory", icon: PackageSearch, label: "Master Inventory" },
        { id: "budget", icon: FileText, label: "Budget Builder" },
        { id: "issues", icon: ClipboardList, label: "Consumption Track" },
        { id: "past_budgets", icon: History, label: "Past Budgets" }
      ];
      case "storekeeper": return [
        { id: "summary", icon: LayoutDashboard, label: "Executive Dashboard" },
        { id: "inventory", icon: PackageSearch, label: "Master Inventory" },
        { id: "issues", icon: ClipboardList, label: "Daily Issues" },
        { id: "past_budgets", icon: History, label: "Past Budgets" }
      ];
      default: return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      <button 
        className="mobile-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed", top: "1rem", left: "1rem", zIndex: 1100,
          background: "var(--primary-color)", color: "white",
          border: "none", borderRadius: "0.5rem", padding: "0.5rem",
          display: "none", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-md)", cursor: "pointer"
        }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="no-print"
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",
            zIndex: 999, backdropFilter: "blur(4px)"
          }}
        />
      )}

      <div 
        style={{ 
          width: isCollapsed ? 80 : 230, 
          background: "#fff", 
          borderRight: "1px solid var(--border-light)", 
          display: "flex", 
          flexDirection: "column", 
          minHeight: "100vh", 
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative"
        }} 
        className={`sidebar no-print ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      >
        
        {/* Collapse Toggle Button (Desktop Only) */}
        <button 
          onClick={onToggleCollapse}
          className="no-mobile"
          style={{
            position: "absolute", right: -12, top: 32, width: 24, height: 24,
            background: "white", border: "1px solid var(--border-light)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "var(--shadow-sm)", zIndex: 10,
            color: "var(--text-secondary)"
          }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div style={{ padding: isCollapsed ? "1rem" : "1.5rem", borderBottom: "1px solid var(--border-light)", textAlign: "center", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isCollapsed ? (
            <div className="brand-mark">E</div>
          ) : (
            <div className="sidebar-brand sidebar-brand-text">
              <strong>EPASHIKINO</strong>
              <span>OPERATIONS</span>
            </div>
          )}
        </div>
        
        <div className="sidebar-navigation" style={{ padding: isCollapsed ? "1rem 0.5rem" : "0.9rem 0.85rem" }}>
          {!isCollapsed && (
            <p className="menu-header" style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.05em", marginBottom: "0.75rem", paddingLeft: "0.5rem" }}>Main Menu</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    onNav(item.id);
                    setIsOpen(false);
                  }}
                  title={isCollapsed ? item.label : ""}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", 
                    gap: isCollapsed ? "0" : "0.75rem", width: "100%", 
                    padding: isCollapsed ? "0.75rem" : "0.65rem 1rem", 
                    borderRadius: "0.5rem", border: "none", cursor: "pointer",
                    fontWeight: isActive ? 600 : 500,
                    position: "relative"
                  }}
                >
                  <Icon size={isCollapsed ? 20 : 18} />
                  {!isCollapsed && <span className="sidebar-label" style={{ fontSize: "0.875rem", flex: 1 }}>{item.label}</span>}
                  {item.id === "inventory" && lowStockCount > 0 && (
                    <span style={{ 
                      background: "var(--danger-color)", color: "white", 
                      borderRadius: "50%", minWidth: "18px", height: "18px", 
                      display: "flex", alignItems: "center", justifyContent: "center", 
                      fontSize: "0.65rem", fontWeight: 700, padding: "0 4px"
                    }}>
                      {lowStockCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div style={{ marginTop: "auto", padding: isCollapsed ? "1rem 0.5rem" : "1.25rem", borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Cloud Status */}
          <div 
            onClick={() => errorMsg && alert(`Connection Details: \n${errorMsg}`)}
            style={{ 
              display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", 
              gap: "0.75rem", padding: isCollapsed ? "0" : "0.5rem 0.75rem", 
              borderRadius: "0.5rem", background: isOnline ? "var(--success-light)" : "var(--danger-light)",
              cursor: errorMsg ? "help" : "default"
            }}
          >
            {isOnline ? (
              <Wifi size={16} color="var(--success-color)" />
            ) : (
              <WifiOff size={16} color="var(--danger-color)" />
            )}
            
            {!isCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  fontSize: "0.7rem", fontWeight: 800, 
                  color: isOnline ? "var(--success-color)" : "var(--danger-color)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {syncing ? "Syncing..." : (isOnline ? "Cloud Connected" : "Offline")}
                </p>
              </div>
            )}
            
            {!isCollapsed && !syncing && (
              <button
                onClick={onRefresh}
                title="Refresh Data"
                style={{
                  background: "none", border: "none", padding: "0.25rem",
                  cursor: "pointer", color: "var(--text-secondary)", opacity: 0.7, marginLeft: "auto"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--primary-color)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <button
            onClick={onLogout}
            title={isCollapsed ? "Switch Role" : ""}
            style={{
              display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start",
              gap: isCollapsed ? "0" : "0.75rem", width: "100%", 
              padding: isCollapsed ? "0.75rem" : "0.65rem 1rem",
              borderRadius: "0.5rem", border: "none", cursor: "pointer",
              background: "#F1F5F9", color: "var(--text-secondary)", fontWeight: 600, transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--danger-light)"; e.currentTarget.style.color = "var(--danger-color)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <LogOut size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span className="sidebar-label" style={{ fontSize: "0.875rem" }}>Switch Role</span>}
          </button>
        </div>
      </div>
    </>
  );
}