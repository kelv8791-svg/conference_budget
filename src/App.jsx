import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import InventoryManager from "./components/InventoryManager";
import BudgetBuilder from "./components/BudgetBuilder";
import IssuesTracker from "./components/IssuesTracker";
import PinGate from "./components/PinGate";
import PastBudgets from "./components/PastBudgets";
import { supabase } from "./supabaseClient";
import { DEFAULT_INVENTORY } from "./store";
import { ChefHat, Store, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const DATA_ROW_ID = '00000000-0000-0000-0000-000000000001';



const ROLES = [
  { key: "chef", label: "Head Chef", icon: ChefHat, color: "#D97706", desc: "Budget · Consumption · Requisitions" },
  { key: "storekeeper", label: "Storekeeper", icon: Store, color: "#059669", desc: "Inventory · Daily Issues" }
];

function Login({ onLogin }) {
  const [hov, setHov] = useState(null);
  
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-body)", position: "relative", overflow: "hidden" }}>
      {/* Decorative background blurs */}
      <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "40vw", height: "40vw", background: "var(--primary-color)", opacity: 0.05, filter: "blur(100px)", borderRadius: "50%" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "40vw", height: "40vw", background: "var(--success-color)", opacity: 0.05, filter: "blur(100px)", borderRadius: "50%" }} />
      
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", zIndex: 1 }}>
        <div className="fade-in" style={{ width: "100%", maxWidth: 900 }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <img src="/logo.jpg" alt="Epashikino Resort & Spa" style={{ height: "140px", objectFit: "contain", marginBottom: "0.5rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "1.25rem", fontWeight: 500 }}>Conference & Accommodation Budget Control System</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {ROLES.map(r => {
              const Icon = r.icon;
              const isHov = hov === r.key;
              return (
                <div 
                  key={r.key} onClick={() => onLogin(r.key)}
                  onMouseEnter={() => setHov(r.key)} onMouseLeave={() => setHov(null)}
                  className="card"
                  style={{
                    background: isHov ? r.color : "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(12px)",
                    color: isHov ? "white" : "var(--text-primary)",
                    border: `2px solid ${isHov ? r.color : "white"}`,
                    cursor: "pointer", 
                    transform: isHov ? "translateY(-6px)" : "none",
                    boxShadow: isHov ? "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" : "var(--shadow-md)"
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "1rem", background: isHov ? "rgba(255,255,255,0.2)" : "var(--bg-body)", color: isHov ? "white" : r.color, marginBottom: "1.25rem", transition: "all 0.3s" }}>
                    <Icon size={28} />
                  </div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>{r.label}</h3>
                  <p style={{ fontSize: "0.875rem", color: isHov ? "rgba(255,255,255,0.9)" : "var(--text-secondary)", fontWeight: 500, lineHeight: 1.5 }}>{r.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [section, setSection] = useState("summary");
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [preloadId, setPreloadId] = useState("");
  const [isClone, setIsClone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // App State - Unified to prevent race conditions
  const [appData, setAppData] = useState({
    inventory: DEFAULT_INVENTORY,
    budgets: {},
    issues: {}
  });

  // Keep a ref to the latest state to avoid stale closures in sync logic
  const dataRef = React.useRef(appData);
  useEffect(() => { dataRef.current = appData; }, [appData]);

  // Sync with Supabase on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await supabase
          .from('conference_data')
          .select('*')
          .eq('id', DATA_ROW_ID)
          .single();
        
        if (data) {
          // Deduplicate inventory by ID to ensure data integrity
          const rawInv = data.inventory || DEFAULT_INVENTORY;
          const cleanInv = Array.from(new Map(rawInv.map(item => [item.id, item])).values());
          
          setAppData({
            inventory: cleanInv,
            budgets: data.budget || {},
            issues: data.issues || {}
          });
          setIsOnline(true);
        } else {
          // No row found, seeding with defaults
          setAppData({
            inventory: DEFAULT_INVENTORY,
            budgets: {},
            issues: {}
          });
          setIsOnline(true);
        }
      } catch (err) {
        setErrorMsg(err.message || "Network error. Check your Supabase credentials.");
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('conference-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conference_data', 
        filter: `id=eq.${DATA_ROW_ID}` 
      }, 
        (payload) => {
          if (payload.new && payload.commit_timestamp !== dataRef.current.lastCommit) {
            setAppData({
              inventory: payload.new.inventory || DEFAULT_INVENTORY,
              budgets: payload.new.budget || {},
              issues: payload.new.issues || {}
            });
            setIsOnline(true);
          }
        }
      )
      .subscribe((status) => {
        setIsOnline(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Helper to push all state to Supabase - Refactored to prevent race conditions
  const persist = async (updates) => {
    setSyncing(true);
    
    // Use functional update to ensure we always have the latest state
    setAppData(prev => {
      const nextData = { ...prev, ...updates };
      
      // Perform the async Supabase call with the calculated nextData
      const performUpsert = async () => {
        const { error } = await supabase
          .from('conference_data')
          .upsert({ 
            id: DATA_ROW_ID, 
            inventory: nextData.inventory, 
            budget: nextData.budgets, 
            issues: nextData.issues,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error("Persist Error:", error);
          setErrorMsg(error.message || "Failed to save changes.");
          setIsOnline(false);
        } else {
          setIsOnline(true);
          setErrorMsg(null);
        }
        setSyncing(false);
      };

      performUpsert();
      return nextData;
    });
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-body)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="fade-in" style={{ width: 40, height: 40, border: "4px solid var(--primary-light)", borderTopColor: "var(--primary-color)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Connecting to Cloud Sync...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!role) {
    return <Login onLogin={(r) => { 
      setRole(r); setPinUnlocked(false);
      setSection(r === "storekeeper" ? "inventory" : "budget"); 
    }} />;
  }

  if (role === "storekeeper" && !pinUnlocked) {
    return <PinGate onSuccess={() => setPinUnlocked(true)} />;
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ display: "flex", background: "var(--bg-body)", minHeight: "100vh", position: "relative" }}>
      <Sidebar 
        role={role} 
        active={section} 
        onNav={setSection} 
        onLogout={() => { setRole(null); setSection(null); setPinUnlocked(false); }} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOnline={isOnline}
        syncing={syncing}
        errorMsg={errorMsg}
      />
      <div className="app-content" style={{ 
        flex: 1, 
        padding: "1.25rem 1.5rem", 
        overflowY: "auto", 
        height: "100vh",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        {section === "inventory" && <InventoryManager inventory={appData.inventory} setInventory={(val) => persist({ inventory: val })} role={role} />}
        {section === "budget" && (
          <BudgetBuilder 
            inventory={appData.inventory} 
            budgets={appData.budgets} 
            setBudgets={(val) => persist({ budgets: val })} 
            preloadId={preloadId}
            onClearPreload={() => { setPreloadId(""); setIsClone(false); }}
            isClone={isClone}
            setSection={setSection}
          />
        )}
        {section === "issues" && (
          <IssuesTracker 
            inventory={appData.inventory} 
            setInventory={(val) => persist({ inventory: val })} 
            budgets={appData.budgets} 
            issues={appData.issues} 
            setIssues={(val) => persist({ issues: val })} 
            role={role}
          />
        )}
        {section === "past_budgets" && (
          <PastBudgets 
            inventory={appData.inventory}
            budgets={appData.budgets} 
            setBudgets={(val) => persist({ budgets: val })}
            onEdit={(id) => { setPreloadId(id); setIsClone(false); setSection("budget"); }}
            onOpen={(id) => { setPreloadId(id); setIsClone(false); setSection("budget"); }}
            onClone={(id) => { setPreloadId(id); setIsClone(true); setSection("budget"); }}
          />
        )}
        {section === "summary" && <ExecutiveDashboard appData={appData} />}
      </div>
    </div>
  );
}

function ExecutiveDashboard({ appData }) {
  const { inventory, budgets } = appData;
  
  const totalRevenue = Object.values(budgets).reduce((sum, b) => sum + (Number(b.totalWorkshopAmount) || 0), 0);
  const totalFoodCost = Object.values(budgets).reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);
  const totalStockValue = inventory.reduce((sum, i) => sum + ((Number(i.stock) || 0) * (Number(i.price) || 0)), 0);
  
  const completedBudgets = Object.values(budgets).filter(b => b.status === "Completed").length;
  const activeBudgets = Object.values(budgets).filter(b => !["Completed", "Cancelled"].includes(b.status || "Draft")).length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>📊 Executive Dashboard</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>High-level financial summaries and operational health metrics.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card" style={{ borderLeft: "4px solid var(--primary-color)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Revenue</p>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem" }}>KES {totalRevenue.toLocaleString()}</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>From all registered workshop events</p>
        </div>
        <div className="card" style={{ borderLeft: "4px solid var(--success-color)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Budgeted Food Cost</p>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem" }}>KES {totalFoodCost.toLocaleString()}</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>Cumulative across all budgets</p>
        </div>
        <div className="card" style={{ borderLeft: "4px solid var(--primary-color)", background: "var(--primary-light)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Stock Value</p>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem", color: "var(--primary-hover)" }}>KES {totalStockValue.toLocaleString()}</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>Value of all items in Master Inventory</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: "1rem" }}>System Health</h4>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Active Events</span>
            <span style={{ fontWeight: 700 }}>{activeBudgets}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border-light)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Completed Events</span>
            <span style={{ fontWeight: 700 }}>{completedBudgets}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0" }}>
            <span style={{ color: "var(--text-secondary)" }}>Inventory Size</span>
            <span style={{ fontWeight: 700 }}>{inventory.length} Items</span>
          </div>
        </div>
      </div>
    </div>
  );
}
