import React, { useState, useEffect } from 'react';
import { CATEGORY_COLORS } from '../store';
import { FileDown, Printer, Save, Plus, Trash2, Edit } from 'lucide-react';
import { generateBudgetPDF } from '../utils/pdfExport';

export default function BudgetBuilder({ inventory, budgets, setBudgets, preloadId, onClearPreload, isClone, setSection }) {
  const [editingBudgetId, setEditingBudgetId] = useState("");
  
  // Form State
  const [orgName, setOrgName] = useState("");
  const [groupType, setGroupType] = useState("Conference");
  const [eventGroups, setEventGroups] = useState([
    { name: "", pax: 12, startDate: "", endDate: "", rate: 3500 }
  ]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const budgetName = orgName ? `${orgName} ${groupType} Budget` : `${groupType} Budget`;
  
  // Dynamic lookup: ensure items always use latest price/data from Master Inventory
  const enrichedItems = selectedItems.map(item => {
    const invItem = inventory.find(i => i.id === item.id);
    return { 
      ...item, 
      price: invItem ? invItem.price : item.price,
      name: invItem ? invItem.name : item.name,
      unit: invItem ? invItem.unit : item.unit,
      cat: invItem ? invItem.cat : item.cat
    };
  });
  const isCompleted = budgets[editingBudgetId]?.status === "Completed" || budgets[editingBudgetId]?.status?.includes("Returned");
  const calculateGroupDays = (start, end) => {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = e - s;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    }
    return 1;
  };

  const getOverallDates = () => {
    const starts = eventGroups.map(g => g.startDate).filter(d => d);
    const ends = eventGroups.map(g => g.endDate).filter(d => d);
    if (starts.length === 0 || ends.length === 0) return "N/A";
    const minStart = starts.sort()[0];
    const maxEnd = ends.sort().reverse()[0];
    return `${minStart} to ${maxEnd}`;
  };

  const displayDates = getOverallDates();

  const syncGroupsWithOrgName = (nameString) => {
    const names = nameString.split(',').map(s => s.trim());
    setEventGroups(prev => {
      let next = [...prev];
      if (names.length > next.length) {
        for (let i = next.length; i < names.length; i++) {
          next.push({ name: names[i], pax: 8, startDate: "", endDate: "", rate: 3500 });
        }
      } else if (names.length < next.length) {
        next = next.slice(0, names.length);
      }
      return next.map((g, i) => ({ ...g, name: names[i] || "" }));
    });
  };

  const updateGroup = (idx, field, val) => {
    const next = [...eventGroups];
    next[idx] = { ...next[idx], [field]: val };
    setEventGroups(next);
  };

  const loadBudget = (id) => {
    if (!id) {
      setEditingBudgetId("");
      setOrgName("");
      setEventGroups([{ name: "", pax: 12, startDate: "", endDate: "", rate: 3500 }]);
      setSelectedItems([]);
      return;
    }
    const b = budgets[id];
    setEditingBudgetId(id);
    setOrgName(b.orgName || "");
    setGroupType(b.groupType || "Conference");

    // Migration logic for old budget format
    if (b.eventGroups) {
      setEventGroups(b.eventGroups);
    } else {
      const initialGroup = {
        name: (b.orgName || "").split(',')[0].trim(),
        pax: b.pax || 0,
        startDate: b.startDate || "",
        endDate: b.endDate || "",
        rate: b.conferenceRate || 0
      };
      const others = (b.subGroups || []).map(sg => ({
        name: sg.orgName, pax: sg.pax, startDate: sg.startDate, endDate: sg.endDate, rate: sg.conferenceRate || 0
      }));
      setEventGroups([initialGroup, ...others]);
    }

    setSelectedItems(b.items || []);
  };

  useEffect(() => {
    if (preloadId && budgets[preloadId]) {
      const b = budgets[preloadId];
      
      // Batch updates to minimize renders and satisfy linting
      const loadData = () => {
        if (isClone) {
          setEditingBudgetId("");
          setOrgName(`${b.orgName} (Copy)`);
          setGroupType(b.groupType || "Conference");
          
          if (b.eventGroups) {
            setEventGroups(b.eventGroups.map(g => ({...g})));
          } else {
            setEventGroups([{ name: "", pax: b.pax || 0, startDate: "", endDate: "", rate: b.conferenceRate || 0 }]);
          }
          
          setSelectedItems(b.items.map(item => ({...item})));
        } else {
          setEditingBudgetId(preloadId);
          setOrgName(b.orgName || "");
          setGroupType(b.groupType || "Conference");
          
          if (b.eventGroups) {
            setEventGroups(b.eventGroups);
          } else {
            const initialGroup = { 
              name: (b.orgName || "").split(',')[0].trim(), 
              pax: b.pax || 0, 
              startDate: b.startDate || "", 
              endDate: b.endDate || "", 
              rate: b.conferenceRate || 0 
            };
            const others = (b.subGroups || []).map(sg => ({
              name: sg.orgName, pax: sg.pax, startDate: sg.startDate, endDate: sg.endDate, rate: sg.conferenceRate || 0
            }));
            setEventGroups([initialGroup, ...others]);
          }
          
          setSelectedItems(b.items || []);
        }
        onClearPreload();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      loadData();
    }
  }, [preloadId, budgets, isClone, onClearPreload]);

  const handleAddItem = (item) => {
    if(!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, { ...item, budgetQty: 0 }]);
    }
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const updateQty = (id, val) => {
    setSelectedItems(selectedItems.map(i => i.id === id ? { ...i, budgetQty: Number(val) } : i));
  };

  const currentCost = enrichedItems.reduce((acc, curr) => acc + (Number(curr.budgetQty || 0) * Number(curr.price || 0)), 0);
  
  const totalWorkshopAmount = eventGroups.reduce((acc, g) => {
    const gDays = calculateGroupDays(g.startDate, g.endDate);
    return acc + (Number(g.pax) || 0) * (Number(g.rate) || 0) * gDays;
  }, 0);

  const totalPax = eventGroups.reduce((acc, g) => acc + (Number(g.pax) || 0), 0);
  const targetFoodCost = totalWorkshopAmount * 0.25;
  const foodCostVariance = targetFoodCost - currentCost;

  const handleSave = () => {
    const isCompleted = budgets[editingBudgetId]?.status === "Completed" || budgets[editingBudgetId]?.status?.includes("Returned");
    
    if (isCompleted) {
      return alert("This budget is COMPLETED and locked. Please use the 'Clone' feature from the Past Budgets section to create a new budget based on this one.");
    }

    if (selectedItems.length === 0) return alert("Please add items to the budget first.");
    
    const hasValidDates = eventGroups.every(g => g.startDate && g.endDate);
    if (!hasValidDates) return alert("Please select both start and end dates for all groups.");
    
    // Enrich items with LATEST metadata (price, name, unit) before saving
    const itemsToSave = selectedItems.map(item => {
      const invItem = inventory.find(i => i.id === item.id);
      return {
        ...item,
        name: invItem ? invItem.name : item.name,
        price: invItem ? invItem.price : item.price,
        unit: invItem ? invItem.unit : item.unit,
        cat: invItem ? invItem.cat : item.cat
      };
    });

    const targetId = editingBudgetId || Date.now().toString();

    setBudgets(prevBudgets => ({ 
      ...(prevBudgets || {}), 
      [targetId]: { 
        id: targetId, orgName, groupType, name: budgetName, 
        eventGroups, // Save the new groups array
        totalWorkshopAmount, targetFoodCost, totalCost: currentCost, items: itemsToSave, date: new Date().toISOString(),
        status: (prevBudgets && prevBudgets[targetId]?.status) || budgets[targetId]?.status || "Draft"
      } 
    }));
    alert(`Budget ${editingBudgetId ? 'Updated' : 'Saved'} Successfully!`);
    if (!editingBudgetId) setEditingBudgetId(targetId);
  };

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    generateBudgetPDF({
      orgName, 
      groupType, 
      budgetName, 
      totalPax,
      displayDates, 
      eventGroups,
      totalWorkshopAmount, 
      targetFoodCost, 
      totalCost: currentCost, 
      items: enrichedItems
    });
  };

  const availItems = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedItems.find(s => s.id === i.id));

  return (
    <div className="fade-in print-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }} className="no-print">
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>📝 Budget Builder</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Create, edit, and track event budgets with historical referencing.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {editingBudgetId && <button className="btn btn-secondary" onClick={() => loadBudget("")}><Plus size={16}/> New</button>}
          <button className="btn btn-secondary" onClick={handlePrint}><Printer size={16}/> Print</button>
          <button className="btn btn-primary" style={{ background: "var(--success-color)", borderColor: "transparent", padding: "0.5rem 1rem", fontSize: "0.8rem" }} onClick={handleExportPDF}><FileDown size={14}/> PDF</button>
          <button className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }} onClick={handleSave}><Save size={14}/> {editingBudgetId ? "Update" : "Save"}</button>
          
          {editingBudgetId && budgets[editingBudgetId] && (
            <button 
              className="btn btn-secondary" 
              style={{ background: "#F1F5F9", color: "var(--primary-color)", fontWeight: 700, border: "1px solid var(--primary-color)" }}
              onClick={() => {
                setSection("issues");
              }}
            >
              {budgets[editingBudgetId]?.status === "Completed" || budgets[editingBudgetId]?.status?.includes("Returned") ? "👁️ View Consumption" : "🚀 Track Consumption"}
            </button>
          )}
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: "1rem", background: "#FFF7ED", border: "1px solid #FFEDD5", padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#9A3412" }}>Event Metrics & Details</h3>
          {editingBudgetId && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {isCompleted && <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--danger-color)", background: "var(--danger-light)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}>🔒 LOCKED FOR EDITS</span>}
              <select 
                className="input-field" 
                style={{ width: 140, marginBottom: 0, fontSize: '0.75rem', height: "32px", padding: "0 0.5rem", opacity: isCompleted ? 0.6 : 1 }} 
                value={budgets[editingBudgetId]?.status || "Draft"}
                disabled={isCompleted}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setBudgets(prev => ({
                    ...prev,
                    [editingBudgetId]: { ...prev[editingBudgetId], status: newStatus }
                  }));
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Completed Early">Completed Early (Surplus)</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          )}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem", opacity: isCompleted ? 0.6 : 1, pointerEvents: isCompleted ? "none" : "auto" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Organization Name(s) <span style={{ color: "var(--primary-color)", fontWeight: 800 }}>(Separate with comma for multiple groups)</span></label>
            <input 
              className="input-field" 
              style={{ height: "32px", fontSize: "0.85rem" }} 
              placeholder="e.g. KRA, ODPC" 
              value={orgName} 
              onChange={e => {
                setOrgName(e.target.value);
                syncGroupsWithOrgName(e.target.value);
              }} 
              disabled={isCompleted} 
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Group Type</label>
            <input 
              list="group-types"
              className="input-field" 
              style={{ height: "32px", fontSize: "0.85rem" }} 
              value={groupType} 
              onChange={e => setGroupType(e.target.value)} 
              disabled={isCompleted}
              placeholder="Select or type..."
            />
            <datalist id="group-types">
              <option value="Conference" />
              <option value="Day Conference" />
              <option value="Day Conference & B.B Accommodation" />
              <option value="Day Conference & H.B Accommodation" />
              <option value="Half Day Conference" />
              <option value="Team Building" />
              <option value="Team Building & B.B Accommodation" />
              <option value="Team Building & H.B Accommodation" />
              <option value="Group Accommodation" />
            </datalist>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Auto-Generated Name</label>
            <input className="input-field" style={{ height: "32px", fontSize: "0.85rem", background: "rgba(255,255,255,0.5)", color: "var(--text-secondary)", cursor: "not-allowed" }} value={budgetName} readOnly />
          </div>
        </div>

        <div style={{ maxHeight: "300px", overflowY: "auto", marginTop: "0.5rem" }}>
          {eventGroups.map((group, idx) => (
            <div key={idx} style={{ 
              display: "grid", 
              gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr 0.8fr", 
              gap: "0.75rem", 
              marginBottom: "0.75rem", 
              padding: "0.75rem", 
              background: "white", 
              borderRadius: "0.5rem", 
              border: "1px solid #FED7AA",
              opacity: isCompleted ? 0.6 : 1, 
              pointerEvents: isCompleted ? "none" : "auto" 
            }}>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.25rem", color: "#9A3412", textTransform: "uppercase" }}>Group {idx + 1}: {group.name || 'Unnamed'}</label>
                <div style={{ height: "32px", fontSize: "0.85rem", display: "flex", alignItems: "center", fontWeight: 700, color: "var(--primary-color)" }}>{group.name || "Enter name above"}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Start Date</label>
                <input type="date" className="input-field" style={{ height: "32px", fontSize: "0.85rem", marginBottom: 0 }} value={group.startDate} onChange={e => updateGroup(idx, 'startDate', e.target.value)} disabled={isCompleted} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>End Date</label>
                <input type="date" className="input-field" style={{ height: "32px", fontSize: "0.85rem", marginBottom: 0 }} value={group.endDate} onChange={e => updateGroup(idx, 'endDate', e.target.value)} disabled={isCompleted} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>PAX</label>
                <input type="number" className="input-field" style={{ height: "32px", fontSize: "0.85rem", marginBottom: 0 }} value={group.pax} onChange={e => updateGroup(idx, 'pax', Number(e.target.value))} disabled={isCompleted} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Rate (KES)</label>
                <input type="number" className="input-field" style={{ height: "32px", fontSize: "0.85rem", marginBottom: 0 }} value={group.rate} onChange={e => updateGroup(idx, 'rate', Number(e.target.value))} disabled={isCompleted} />
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #FED7AA", paddingTop: "0.75rem" }}>
           <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <p style={{ fontSize: "0.75rem", color: "#9A3412", fontWeight: 800 }}>Total Event PAX: {totalPax}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Overall Dates: {displayDates}</p>
           </div>
           <div style={{ display: "flex", gap: "1rem" }}>
             <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Revenue Target</span>
                <p style={{ fontWeight: 800, color: "var(--primary-color)", fontSize: "0.9rem" }}>KES {totalWorkshopAmount.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
             </div>
             <div style={{ textAlign: "right", paddingLeft: "1rem", borderLeft: "1px solid #FED7AA" }}>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }} title="Sum of (Budget Qty * Market Price)">Actual Estimated Cost</span>
                <p style={{ fontWeight: 800, color: foodCostVariance < 0 ? "var(--danger-color)" : "var(--success-color)", fontSize: "0.9rem" }}>KES {currentCost.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
             </div>
             <div style={{ textAlign: "right", paddingLeft: "1rem", borderLeft: "1px solid #FED7AA" }}>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Food Allowance (25%)</span>
                <p style={{ fontWeight: 800, color: "var(--primary-color)", fontSize: "0.9rem" }}>KES {targetFoodCost.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
             </div>
           </div>
        </div>
      </div>



      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }} className="no-print">
        <div className="card" style={{ maxHeight: "60vh", overflowY: "auto", padding: "1rem", background: "rgba(120, 113, 108, 0.05)", border: "1px solid rgba(120, 113, 108, 0.1)", opacity: isCompleted ? 0.5 : 1, pointerEvents: isCompleted ? "none" : "auto" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem", color: "#57534E" }}>Master Inventory</h3>
          <input className="input-field" placeholder="Search items to add..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginBottom: "1rem" }} disabled={isCompleted} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Object.keys(CATEGORY_COLORS).map(cat => {
              const itemsInCat = availItems.filter(i => i.cat === cat);
              if (itemsInCat.length === 0) return null;
              return (
                <div key={cat}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.5rem", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[cat].color }} />
                    {cat}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {itemsInCat.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid var(--border-light)", borderRadius: "0.5rem", background: "#F8FAFC" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>KES {item.price} · {item.unit}</p>
                        </div>
                        <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }} onClick={() => handleAddItem(item)}><Plus size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", background: "rgba(0, 0, 0, 0.03)", border: "1px solid rgba(0, 0, 0, 0.08)" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-light)", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1F2937" }}>Budget Items</h3>
            <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Estimated Total ({totalWorkshopAmount > 0 ? ((currentCost / totalWorkshopAmount) * 100).toFixed(1) : 0}%)</span>
                <p style={{ fontWeight: 800, color: foodCostVariance < 0 ? "#DC2626" : "var(--success-color)", fontSize: '1.2rem' }}>KES {currentCost.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
            </div>
          </div>

          <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Base Price</th>
                  <th style={{ width: 120 }}>Estimated Qty</th>
                  <th>Total</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(enrichedItems.reduce((acc, item) => {
                  if (!acc[item.cat]) acc[item.cat] = [];
                  acc[item.cat].push(item);
                  return acc;
                }, {})).map(([cat, items]) => {
                  const catTotal = items.reduce((sum, i) => sum + (i.price * i.budgetQty), 0);
                  return (
                    <React.Fragment key={cat}>
                      <tr style={{ background: "var(--bg-body)" }}>
                        <td colSpan={5} style={{ padding: "0.5rem 1rem", fontWeight: 800, fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          📁 {cat}
                        </td>
                      </tr>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td style={{ paddingLeft: "2rem" }}>
                            <p style={{ fontWeight: 600 }}>{item.name}</p>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>KES {item.price.toLocaleString()}</span>
                            </div>
                          </td>
                          <td><input type="number" className="input-field" value={item.budgetQty} onChange={(e) => updateQty(item.id, e.target.value)} disabled={isCompleted} /></td>
                          <td style={{ fontWeight: 600 }}>KES {(item.price * item.budgetQty).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          <td style={{ textAlign: "right" }}>
                            {!isCompleted && <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem" }} onClick={() => handleRemoveItem(item.id)}><Trash2 size={16}/></button>}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                        <td colSpan={3} style={{ textAlign: "right", padding: "0.5rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>{cat} SUBTOTAL:</td>
                        <td style={{ padding: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}>KES {catTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                        <td></td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        .no-print::-webkit-scrollbar {
          width: 6px;
        }
        .no-print::-webkit-scrollbar-track {
          background: transparent;
        }
        .no-print::-webkit-scrollbar-thumb {
          background: #FED7AA;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

