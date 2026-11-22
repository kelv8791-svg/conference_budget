import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import InventoryManager from "./components/InventoryManager";
import BudgetBuilder from "./components/BudgetBuilder";
import IssuesTracker from "./components/IssuesTracker";
import PastBudgets from "./components/PastBudgets";
import { supabase } from "./supabaseClient";
import { DEFAULT_INVENTORY, cleanAndMergeInventory } from "./store";
import { ChefHat, Store } from 'lucide-react';

const DATA_ROW_ID = '00000000-0000-0000-0000-000000000001';

function safeParseJSON(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return val;
}

const ROLES = [
  { key: "chef", label: "Head Chef", icon: ChefHat, color: "#D97706", desc: "Budget · Consumption · Requisitions" },
  { key: "storekeeper", label: "Storekeeper", icon: Store, color: "#059669", desc: "Inventory · Daily Issues" }
];

function Login({ onLoginError }) {
  const [hov, setHov] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) onLoginError(error.message);
    setSigningIn(false);
  };
  
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
            <form onSubmit={handleSignIn} className="card" style={{ gridColumn: "1 / -1", maxWidth: 520, width: "100%", justifySelf: "center" }}>
              <h3 style={{ marginBottom: "1rem", fontWeight: 800 }}>Sign in</h3>
              <input
                className="input-field"
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button className="btn btn-primary" type="submit" disabled={signingIn} style={{ width: "100%" }}>
                {signingIn ? "Signing in..." : "Continue"}
              </button>
            </form>
            {ROLES.map(r => {
              const Icon = r.icon;
              const isHov = hov === r.key;
              return (
                <div 
                  key={r.key}
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
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [section, setSection] = useState("summary");
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
    issues: {},
    lastCommit: null,
    revision: 0
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async (session) => {
      if (!session?.user) {
        if (active) {
          setRole(null);
          setAuthLoading(false);
          setAuthError(null);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!active) return;
      if (error || !data) {
        setRole(null);
        setAuthError("This account does not have an assigned application role.");
      } else {
        setRole(data.role);
        setSection(data.role === "storekeeper" ? "inventory" : "budget");
        setAuthError(null);
      }
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthLoading(true);
      loadProfile(session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Keep a ref to the latest state to avoid stale closures in sync logic
  const dataRef = React.useRef(appData);
  useEffect(() => { dataRef.current = appData; }, [appData]);

  // Sync with Supabase on mount
  useEffect(() => {
    if (!role) {
      setLoading(false);
      return undefined;
    }

    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('conference_data')
          .select('*')
          .eq('id', DATA_ROW_ID)
          .single();

        if (error) throw error;
        
        if (data) {
          const rawInv = safeParseJSON(data.inventory, []);
          const rawBudgets = safeParseJSON(data.budget, {});
          const rawIssues = safeParseJSON(data.issues, {});

          const cleanInv = cleanAndMergeInventory(rawInv);
          
          const refreshed = {
            inventory: cleanInv,
            budgets: typeof rawBudgets === 'object' && !Array.isArray(rawBudgets) ? rawBudgets : {},
            issues: typeof rawIssues === 'object' && !Array.isArray(rawIssues) ? rawIssues : {},
            lastCommit: data.updated_at,
            revision: Number(data.revision) || 0
          };
          dataRef.current = refreshed;
          setAppData(refreshed);
          setIsOnline(true);
        } else {
          setAppData({
            inventory: [],
            budgets: {},
            issues: {},
            lastCommit: null,
            revision: 0
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
          if (payload.new && (
            payload.new.revision !== dataRef.current.revision ||
            payload.new.updated_at !== dataRef.current.lastCommit
          )) {
            const incomingInv = safeParseJSON(payload.new.inventory, dataRef.current.inventory);
            const incomingBudgets = safeParseJSON(payload.new.budget, dataRef.current.budgets);
            const incomingIssues = safeParseJSON(payload.new.issues, dataRef.current.issues);

            const cleanInv = cleanAndMergeInventory(incomingInv);

            setAppData({
              inventory: cleanInv,
              budgets: typeof incomingBudgets === 'object' && !Array.isArray(incomingBudgets) ? incomingBudgets : dataRef.current.budgets,
              issues: typeof incomingIssues === 'object' && !Array.isArray(incomingIssues) ? incomingIssues : dataRef.current.issues,
              lastCommit: payload.new.updated_at,
              revision: Number(payload.new.revision) || 0
            });
            setIsOnline(true);
          }
        }
      )
      .subscribe((status) => {
        setIsOnline(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [role]);

  // Helper to push all state to Supabase - Supports functional updates & atomic merging
  const persist = async (updates) => {
    setSyncing(true);

    const nextBudgets = typeof updates.budgets === 'function' 
      ? updates.budgets(dataRef.current.budgets) 
      : (updates.budgets ?? dataRef.current.budgets);

    const nextInventory = typeof updates.inventory === 'function' 
      ? updates.inventory(dataRef.current.inventory) 
      : (updates.inventory ?? dataRef.current.inventory);

    const nextIssues = typeof updates.issues === 'function' 
      ? updates.issues(dataRef.current.issues) 
      : (updates.issues ?? dataRef.current.issues);

    const cleanInv = cleanAndMergeInventory(nextInventory);

    const finalData = {
      inventory: cleanInv,
      budgets: typeof nextBudgets === 'object' && !Array.isArray(nextBudgets) ? nextBudgets : {},
      issues: typeof nextIssues === 'object' && !Array.isArray(nextIssues) ? nextIssues : {},
      revision: dataRef.current.revision
    };

    // Update ref immediately to prevent race conditions and ignore self-echoes
    dataRef.current = finalData;
    setAppData(finalData);

    try {
      const { data, error } = await supabase.rpc('save_conference_state', {
        p_expected_revision: dataRef.current.revision,
        p_inventory: finalData.inventory,
        p_budget: finalData.budgets,
        p_issues: finalData.issues
      });
      
      if (error) {
        console.error("Persist Error:", error);
        setErrorMsg(error.message || "Failed to save changes.");
        setIsOnline(false);
        await refreshData();
      } else {
        dataRef.current.revision = Number(data?.revision) || dataRef.current.revision + 1;
        dataRef.current.lastCommit = data?.updated_at || dataRef.current.lastCommit;
        setAppData(prev => ({
          ...prev,
          lastCommit: data?.updated_at || prev.lastCommit,
          revision: Number(data?.revision) || prev.revision + 1
        }));
        setIsOnline(true);
        setErrorMsg(null);
      }
    } catch (e) {
      console.error("Unexpected Persist Error:", e);
      setErrorMsg("Network error during save.");
      setIsOnline(false);
    } finally {
      setSyncing(false);
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Manual refresh function for sync recovery
  const refreshData = async () => {
    try {
      const { data, error } = await supabase
        .from('conference_data')
        .select('*')
        .eq('id', DATA_ROW_ID)
        .single();
      if (error) throw error;

      if (data) {
        const rawInv = safeParseJSON(data.inventory, []);
        const rawBudgets = safeParseJSON(data.budget, {});
        const rawIssues = safeParseJSON(data.issues, {});
        const cleanInv = cleanAndMergeInventory(rawInv);

        setAppData({
          inventory: cleanInv,
          budgets: typeof rawBudgets === 'object' && !Array.isArray(rawBudgets) ? rawBudgets : {},
          issues: typeof rawIssues === 'object' && !Array.isArray(rawIssues) ? rawIssues : {},
          lastCommit: data.updated_at,
          revision: Number(data.revision) || 0
        });
        setIsOnline(true);
        setErrorMsg(null);
      }
    } catch (err) {
      setErrorMsg(err.message || "Refresh failed. Check connection.");
      setIsOnline(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-body)" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Checking secure access...</p>
      </div>
    );
  }

  if (loading && role) {
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
    return (
      <>
        {authError && (
          <div style={{ position: "fixed", zIndex: 1200, top: "1rem", left: "50%", transform: "translateX(-50%)", background: "var(--danger-light)", color: "var(--danger-color)", padding: "0.75rem 1rem", borderRadius: "0.75rem", fontWeight: 700 }}>
            {authError}
          </div>
        )}
        <Login onLoginError={(message) => setAuthError(message)} />
      </>
    );
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ display: "flex", background: "var(--bg-body)", minHeight: "100vh", position: "relative" }}>
<Sidebar
        role={role}
        active={section}
        onNav={setSection}
        onLogout={async () => { await supabase.auth.signOut(); setRole(null); setSection(null); }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOnline={isOnline}
        syncing={syncing}
        errorMsg={errorMsg}
        lowStockCount={appData.inventory.filter(i => i.stock < 10).length}
        onRefresh={refreshData}
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
  
  const budgetList = Object.values(budgets).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalRevenue = budgetList.reduce((sum, b) => sum + (Number(b.totalWorkshopAmount) || 0), 0);
  const totalFoodCost = budgetList.reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);
  const totalStockValue = inventory.reduce((sum, i) => sum + ((Number(i.stock) || 0) * (Number(i.price) || 0)), 0);
  
  const completedBudgets = budgetList.filter(b => b.status === "Completed" || b.status?.includes("Returned"));
  const actualRevenue = completedBudgets.reduce((sum, b) => sum + (Number(b.totalWorkshopAmount) || 0), 0);
  const actualFoodCost = completedBudgets.reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);

  const lowStockItems = inventory.filter(i => i.stock < 10);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>📊 Executive Dashboard</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>High-level financial summaries and operational health metrics.</p>
        </div>
        {lowStockItems.length > 0 && (
          <div style={{ background: "var(--danger-light)", color: "var(--danger-color)", padding: "0.5rem 1rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem", animation: "pulse 2s infinite" }}>
            <Store size={18} />
            {lowStockItems.length} items low on stock
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card" style={{ borderLeft: "4px solid var(--primary-color)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Revenue (All)</p>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem" }}>KES {totalRevenue.toLocaleString()}</h3>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "1rem" }}>
             <div>
               <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>PROJECTED</p>
               <p style={{ fontWeight: 700, color: "var(--primary-color)" }}>KES {(totalRevenue - actualRevenue).toLocaleString()}</p>
             </div>
             <div>
               <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>REALIZED</p>
               <p style={{ fontWeight: 700, color: "var(--success-color)" }}>KES {actualRevenue.toLocaleString()}</p>
             </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--success-color)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Budgeted Food Cost</p>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem" }}>KES {totalFoodCost.toLocaleString()}</h3>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "1rem" }}>
             <div>
               <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>PENDING</p>
               <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>KES {(totalFoodCost - actualFoodCost).toLocaleString()}</p>
             </div>
             <div>
               <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>FINALIZED</p>
               <p style={{ fontWeight: 700, color: "var(--success-color)" }}>KES {actualFoodCost.toLocaleString()}</p>
             </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--primary-color)", background: "linear-gradient(135deg, var(--primary-light) 0%, #fff 100%)" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Stock Value</p>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem", color: "var(--primary-hover)" }}>KES {totalStockValue.toLocaleString()}</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>Value of {inventory.length} items in Master Inventory</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontWeight: 800 }}>Recent Budgets</h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total: {budgetList.length}</span>
          </div>
          <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Revenue</th>
                  <th style={{ textAlign: "right" }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {budgetList.slice(0, 5).map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.orgName || b.name}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: b.status === "Completed" ? "var(--success-light)" : b.status === "Draft" ? "var(--bg-body)" : "var(--primary-light)",
                        color: b.status === "Completed" ? "var(--success-color)" : b.status === "Draft" ? "var(--text-secondary)" : "var(--primary-color)"
                      }}>
                        {b.status || "Draft"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>KES {Number(b.totalWorkshopAmount).toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>KES {Number(b.totalCost).toLocaleString()}</td>
                  </tr>
                ))}
                {budgetList.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>No budgets recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: "1.25rem" }}>Inventory Health</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem", background: "var(--bg-body)", borderRadius: "0.75rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Low Stock Items</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 800, color: lowStockItems.length > 0 ? "var(--danger-color)" : "var(--success-color)" }}>{lowStockItems.length}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Critical (0)</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 800 }}>{inventory.filter(i => i.stock <= 0).length}</p>
              </div>
            </div>
            
            <div style={{ marginTop: "0.5rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem" }}>Top Low Stock Items</p>
              {lowStockItems.slice(0, 4).map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontWeight: 700, color: item.stock <= 0 ? "var(--danger-color)" : "var(--warning-color)" }}>{item.stock} {item.unit}</span>
                </div>
              ))}
              {lowStockItems.length === 0 && <p style={{ fontSize: "0.875rem", color: "var(--success-color)", textAlign: "center", padding: "1rem" }}>✅ All stock levels healthy</p>}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
