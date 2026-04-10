import React, { useState } from 'react';
import { CATEGORY_COLORS } from '../store';


export default function IssuesTracker({ inventory, setInventory, budgets, setBudgets, issues, setIssues, role }) {
  const [selectedBudgetId, setSelectedBudgetId] = useState(() => {
    // Only auto-select non-completed/non-cancelled budgets
    const activeIds = Object.keys(budgets).filter(id => 
      !['Completed', 'Cancelled', 'Completed (Surplus Returned)'].includes(budgets[id].status)
    );
    return activeIds[0] || "";
  });
  const [currentDay, setCurrentDay] = useState("Day 1");
  const [draftIssues, setDraftIssues] = useState({}); // Local edits for the currentDay
  const [lastSaved, setLastSaved] = useState(null);
  
  const activeBudget = budgets[selectedBudgetId] || null;
  const isConcluded = activeBudget?.status === "Completed" || activeBudget?.status === "Cancelled" || activeBudget?.status?.includes("Returned");
  
  const numDays = activeBudget ? (activeBudget.days || 7) : 7;
  const DAYS = Array.from({length: numDays}, (_, i) => `Day ${i+1}`);

  // Auto-detect current day and load existing issues into draft
  React.useEffect(() => {
    if (!activeBudget) return;

    // 1. Auto-set current day if not already set (only on budget change)
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(activeBudget.startDate);
    start.setHours(0,0,0,0);
    
    if (!isNaN(start.getTime())) {
      const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays >= 1 && diffDays <= numDays) {
        setCurrentDay(`Day ${diffDays}`);
      }
    }
  }, [selectedBudgetId, activeBudget, numDays]);

  React.useEffect(() => {
    if (!selectedBudgetId) return;
    // Load existing issues for the current day into draft
    const budgetIssues = issues[selectedBudgetId] || {};
    const newDraft = {};
    Object.keys(budgetIssues).forEach(itemId => {
      newDraft[itemId] = budgetIssues[itemId][currentDay] || 0;
    });
    setDraftIssues(newDraft);
    setLastSaved(null);
  }, [selectedBudgetId, currentDay, issues]);

  if (Object.keys(budgets).length === 0) {
    return (
      <div className="fade-in card" style={{ textAlign: "center", padding: "4rem", marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>No Budgets Found</h2>
        <p style={{ color: "var(--text-secondary)" }}>The Head Chef needs to create and save a budget first before tracking consumption.</p>
      </div>
    );
  }

  const handleIssueChange = (itemId, val) => {
    if (isConcluded) return;
    setDraftIssues(prev => ({
      ...prev,
      [itemId]: Number(val)
    }));
  };

  const handleSaveDay = () => {
    if (!selectedBudgetId) return;
    
    const newIssues = { ...issues };
    const oldBudgetIssues = issues[selectedBudgetId] || {};
    let newInventory = [...inventory];
    let shortages = [];
    
    if (!newIssues[selectedBudgetId]) newIssues[selectedBudgetId] = {};
    
    // 1. Calculate and apply stock diffs
    Object.keys(draftIssues).forEach(itemId => {
      const oldVal = (oldBudgetIssues[itemId] && oldBudgetIssues[itemId][currentDay]) || 0;
      const newVal = draftIssues[itemId] || 0;
      const diff = newVal - oldVal;

      if (diff !== 0) {
        newInventory = newInventory.map(invItem => {
          if (invItem.id === itemId) {
            const potentialStock = (invItem.stock || 0) - diff;
            if (potentialStock < 0) {
              shortages.push(`${invItem.name} (Shortage: ${Math.abs(potentialStock)} ${invItem.unit})`);
            }
            return { ...invItem, stock: potentialStock };
          }
          return invItem;
        });
      }
      
      if (!newIssues[selectedBudgetId][itemId]) newIssues[selectedBudgetId][itemId] = {};
      newIssues[selectedBudgetId][itemId][currentDay] = newVal;
    });

    if (shortages.length > 0) {
      if (!window.confirm(`Warning! Saving these figures will leave the following items below zero in the Master Inventory:\n\n${shortages.join('\n')}\n\nDo you want to proceed anyway?`)) {
        return;
      }
    }

    setInventory(newInventory);
    setIssues(newIssues);
    setLastSaved(new Date().toLocaleTimeString());
    // alert(`${currentDay} consumption saved successfully and store inventory has been updated.`);
  };

  const handleConcludeEvent = () => {
    if (window.confirm("Are you sure you want to CONCLUDE this event? \n\nThis will freeze daily inputs, mark the budget as 'Completed', and move it to history. You can then process any surplus returns to inventory.")) {
      setBudgets({
        ...budgets,
        [selectedBudgetId]: { ...activeBudget, status: "Completed" }
      });
      if (role === 'chef') {
        setSelectedBudgetId(""); // Clear tracker for chef
      }
    }
  };

  const handleProcessReturns = () => {
    // Collect all surplus items and prepare inventory updates
    const returns = [];
    let newInventory = [...inventory];
    let itemsUpdated = 0;

    activeBudget.items.forEach(item => {
      const itemIssues = (issues[selectedBudgetId] || {})[item.id] || {};
      const usedTotal = Object.values(itemIssues).reduce((a,b) => a + b, 0);
      const surplus = item.budgetQty - usedTotal;
      
      if (surplus > 0) {
        returns.push({ name: item.name, qty: surplus, unit: item.unit });
        // Update inventory stock
        newInventory = newInventory.map(invItem => 
          invItem.id === item.id 
            ? { ...invItem, stock: (invItem.stock || 0) + surplus }
            : invItem
        );
        itemsUpdated++;
      }
    });

    if (returns.length === 0) return alert("No surplus items found to return.");

    const returnMsg = returns.map(r => `• ${r.name}: ${r.qty} ${r.unit}`).join('\n');
    if (window.confirm(`Confirm returning these items to the Master Store? This will increment stock levels. \n\n${returnMsg}`)) {
      setInventory(newInventory);
      setBudgets({
        ...budgets,
        [selectedBudgetId]: { ...activeBudget, status: "Completed (Surplus Returned)" }
      });
      alert(`Success! ${itemsUpdated} items returned to stock and recorded.`);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>📋 Consumption Issues Tracker</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Track daily consumption and manage surplus stock returns.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {!isConcluded && activeBudget && (
            <>
              {lastSaved && <span style={{ fontSize: "0.75rem", color: "var(--success-color)", fontWeight: 600 }}>Saved at {lastSaved}</span>}
              <button 
                className="btn btn-primary" 
                onClick={handleSaveDay}
                style={{ background: "var(--primary-color)", color: "white" }}
              >
                💾 Save {currentDay} Figures
              </button>
              <div style={{ width: 1, height: 24, background: "var(--border-light)", margin: "0 0.5rem" }} />
              <button 
                className="btn btn-secondary" 
                onClick={handleConcludeEvent}
              >
                Conclude Event
              </button>
            </>
          )}
          {isConcluded && activeBudget?.status !== "Completed (Surplus Returned)" && (
             <button 
               className="btn btn-primary" 
               style={{ background: "var(--success-color)", borderColor: "transparent" }}
               onClick={handleProcessReturns}
             >
               Process Surplus Returns
             </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem", padding: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: "0 0 300px" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Active Event Budget</label>
            <select className="input-field" value={selectedBudgetId} onChange={e => { setSelectedBudgetId(e.target.value); setCurrentDay("Day 1"); }}>
              <option value="">{role === 'chef' ? "-- Select Active Budget --" : "-- Select Budget Record --"}</option>
              {Object.values(budgets)
                .filter(b => role === 'chef' ? !['Completed', 'Cancelled', 'Completed (Surplus Returned)'].includes(b.status) : true)
                .map(b => (
                  <option key={b.id} value={b.id}>
                    [{b.status || 'Active'}] {b.orgName || b.name}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Input Day</label>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {DAYS.map(d => (
                <button key={d} className={`btn ${currentDay === d ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem" }} onClick={() => setCurrentDay(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeBudget && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#F8FAFC", borderRadius: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Organization Info</p>
              <p style={{ fontWeight: 700 }}>{activeBudget.orgName || 'N/A'}</p>
              <p style={{ fontSize: "0.875rem" }}>Dates: {activeBudget.dates || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Event Details</p>
              <p style={{ fontWeight: 700 }}>{activeBudget.pax} PAX · {activeBudget.days} Days</p>
              <p style={{ fontSize: "0.875rem", color: "var(--primary-color)", fontWeight: 600 }}>Status: {activeBudget.status || "Active"}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Stock Summary</p>
              <p style={{ fontWeight: 800 }}>Items Issued: {activeBudget.items.length}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Actual Consumed: {Object.keys((issues[selectedBudgetId] || {})).length} Items</p>
            </div>
          </div>
        )}
      </div>

      {activeBudget && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrapper" style={{ border: "none", borderRadius: 0, margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Item Details</th>
                  <th style={{ textAlign: "center", width: 120 }}>Budgeted</th>
                  <th style={{ textAlign: "center", width: 120 }}>Previous Days</th>
                  <th style={{ textAlign: "center", width: 130 }}>{currentDay} Input</th>
                  <th style={{ textAlign: "center", width: 120 }}>Remaining</th>
                  <th style={{ textAlign: "right", width: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(CATEGORY_COLORS).map(cat => {
                  const catItems = activeBudget.items.filter(i => i.cat === cat);
                  if (catItems.length === 0) return null;
                  
                  return (
                    <React.Fragment key={cat}>
                      <tr style={{ background: "var(--bg-body)" }}>
                        <td colSpan={6} style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-light)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[cat].color }} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>{cat}</span>
                          </div>
                        </td>
                      </tr>
                      {catItems.map(item => {
                        const bQty = Number(item.budgetQty || 0);
                        const itemIssues = (issues[selectedBudgetId] || {})[item.id] || {};
                        
                        // Previous days = total accumulated minus the current day's saved value
                        const prevTotal = Object.entries(itemIssues)
                          .filter(([d]) => d !== currentDay)
                          .reduce((acc, [, v]) => acc + Number(v || 0), 0);
                        
                        const todayIssue = draftIssues[item.id] || 0;
                        const totalSoFar = prevTotal + todayIssue;
                        const variance = bQty - totalSoFar;
                        
                        let varColor = "var(--text-secondary)";
                        if (variance < 0) varColor = "var(--danger-color)";
                        else if (variance === 0 && bQty > 0) varColor = "var(--success-color)";
                        else if (variance > 0) varColor = "var(--primary-color)";

                        const isOverBudget = totalSoFar > bQty;

                        return (
                          <tr key={item.id} style={{ 
                            background: isOverBudget ? "var(--danger-light)" : "transparent", 
                            transition: "all 0.3s" 
                          }}>
                            <td style={{ paddingLeft: "1.5rem" }}>
                              <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>{item.name}</p>
                              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{item.unit}</p>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 600, color: "var(--text-primary)" }}>
                              {bQty}
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 600, color: "var(--text-secondary)" }}>
                              {prevTotal}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <input 
                                type="number" 
                                className="input-field" 
                                style={{ 
                                  width: "80px", textAlign: "center", margin: "0 auto", fontWeight: 700,
                                  borderColor: todayIssue > 0 ? "var(--primary-color)" : "var(--border-light)",
                                  background: todayIssue > 0 ? "var(--primary-light)" : "white"
                                }} 
                                value={todayIssue || ""}
                                onChange={(e) => handleIssueChange(item.id, e.target.value)}
                                placeholder="0"
                                disabled={isConcluded}
                              />
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: varColor }}>
                              {variance}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {isOverBudget ? (
                                <span className="badge" style={{ background: "var(--danger-light)", color: "var(--danger-color)" }}>Over</span>
                              ) : (
                                variance === 0 ? (
                                  <span className="badge" style={{ background: "var(--success-light)", color: "var(--success-color)" }}>Done</span>
                                ) : (
                                  <span className="badge" style={{ background: "var(--primary-light)", color: "var(--primary-color)" }}>Ok</span>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
