import React, { useState } from 'react';
import { 
  LayoutDashboard, PackageSearch, FileText, ClipboardList, 
  LogOut, Menu, X,
  Wifi, WifiOff, RefreshCw, History
} from 'lucide-react';

export default function Sidebar({
  role, active, onNav, onLogout,
  isOnline, syncing, errorMsg, lowStockCount, onRefresh,
  isCollapsed, onToggleCollapse
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
        className="sidebar-collapse-toggle no-mobile"
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{ left: isCollapsed ? 64 : 220 }}
      >
        {isCollapsed ? "›" : "‹"}
      </button>
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
          width: isCollapsed ? 76 : 232,
          background: "#fff", 
          borderRight: "1px solid var(--border-light)", 
          display: "flex", 
          flexDirection: "column", 
          minHeight: "100vh", 
          position: "relative"
        }} 
        className={`sidebar no-print ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand sidebar-brand-text">
            <strong>EPASHIKINO</strong>
            <span>OPERATIONS</span>
          </div>
          <div className="sidebar-role">
            {role === "chef" ? "Head Chef" : "Storekeeper"}
          </div>
        </div>
        
        <div className="sidebar-navigation" style={{ padding: "0.9rem 0.75rem" }}>
          <p className="menu-header" style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.05em", marginBottom: "0.75rem", paddingLeft: "0.5rem" }}>Main Menu</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => {
                    onNav(item.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "flex-start", 
                    gap: "0.75rem", width: "100%", 
                    padding: "0.65rem 0.75rem", 
                    borderRadius: "0.5rem", border: "none", cursor: "pointer",
                    fontWeight: isActive ? 600 : 500,
                    position: "relative"
                  }}
                >
                  <Icon size={18} />
                  <span className="sidebar-label" style={{ fontSize: "0.875rem", flex: 1 }}>{item.label}</span>
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
        
        <div className="sidebar-footer" style={{ marginTop: "auto", padding: "10px 12px", borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Cloud Status */}
          <div 
            onClick={() => errorMsg && alert(`Connection Details: \n${errorMsg}`)}
            style={{ 
              display: "flex", alignItems: "center", justifyContent: "flex-start", 
              gap: "0.75rem", padding: "0.5rem 0.75rem", 
              borderRadius: "0.5rem", background: isOnline ? "var(--success-light)" : "var(--danger-light)",
              cursor: errorMsg ? "help" : "default"
            }}
          >
            {isOnline ? (
              <Wifi size={16} color="var(--success-color)" />
            ) : (
              <WifiOff size={16} color="var(--danger-color)" />
            )}
            
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  fontSize: "0.7rem", fontWeight: 800, 
                  color: isOnline ? "var(--success-color)" : "var(--danger-color)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {syncing ? "Syncing..." : (isOnline ? "Cloud Connected" : "Offline")}
                </p>
              </div>
            
            {!syncing && (
              <button
                onClick={onRefresh}
                title="Refresh Data"
                style={{
                  background: "none", border: "none", padding: "0.25rem",
                  cursor: "pointer", color: "var(--text-secondary)", opacity: 0.7, marginLeft: "auto"
                }}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <button
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", justifyContent: "flex-start",
              gap: "0.75rem", width: "100%", 
              padding: "0.65rem 0.75rem",
              borderRadius: "0.5rem", border: "none", cursor: "pointer",
              background: "transparent", color: "var(--text-primary)", fontWeight: 600, transition: "all 0.2s"
            }}
          >
            <LogOut size={18} />
            <span className="sidebar-label" style={{ fontSize: "0.875rem" }}>Switch Role</span>
          </button>
        </div>
      </div>
    </>
  );
}