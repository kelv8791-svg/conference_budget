import React, { useState } from 'react';
import { CATEGORY_COLORS } from '../store';
import { FileDown, Printer, Trash2, Edit, ExternalLink, Mail, Search, Copy, Layers, X } from 'lucide-react';
import { generateBudgetPDF } from '../utils/pdfExport';
import { getBudgetDetails, isConcludedStatus } from '../utils/budgetUtils';

export default function PastBudgets({ inventory, budgets, setBudgets, onEdit, onOpen, onClone }) {
  const [historySearch, setHistorySearch] = useState("");
  const [absorbingId, setAbsorbingId] = useState(null);

  const filteredHistory = Object.values(budgets).filter(b => 
    b.orgName?.toLowerCase().includes(historySearch.toLowerCase()) || 
    b.name?.toLowerCase().includes(historySearch.toLowerCase())
  ).sort((a,b) => new Date(b.date) - new Date(a.date));

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this budget record? This cannot be undone.")) {
      setBudgets(prev => {
        const next = { ...(prev || {}) };
        delete next[id];
        return next;
      });
    }
  };

  const handleExportPDF = (budget, isEmail = false) => {
    // Enrich items with latest inventory data
    const enrichedItems = (budget.items || []).map(item => {
      const invItem = inventory.find(i => i.id === item.id);
      return {
        ...item,
        price: invItem ? invItem.price : item.price,
        name: invItem ? invItem.name : item.name,
        unit: invItem ? invItem.unit : item.unit,
        cat: invItem ? invItem.cat : item.cat
      };
    });

    const totalCost = enrichedItems.reduce((acc, curr) => acc + (Number(curr.budgetQty || 0) * Number(curr.price || 0)), 0);

    generateBudgetPDF({ ...budget, items: enrichedItems, totalCost }, { isEmail });
  };

  const handleAbsorb = (sourceId, targetId) => {
    const source = budgets[sourceId];
    const target = budgets[targetId];

    if (!source || !target) return;

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

    // Extract groups from source
    let sourceGroups = [];
    if (source.eventGroups) {
      sourceGroups = source.eventGroups.map(g => ({...g}));
    } else {
      sourceGroups = [{
        name: source.orgName,
        pax: source.pax,
        startDate: source.startDate,
        endDate: source.endDate,
        rate: source.conferenceRate || 0
      }];
      if (source.subGroups) {
        sourceGroups.push(...source.subGroups.map(sg => ({
          name: sg.orgName, pax: sg.pax, startDate: sg.startDate, endDate: sg.endDate, rate: sg.conferenceRate || 0
        })));
      }
    }

    // Extract groups from target
    let targetGroups = [];
    if (target.eventGroups) {
      targetGroups = [...target.eventGroups];
    } else {
      targetGroups = [{
        name: target.orgName,
        pax: target.pax,
        startDate: target.startDate,
        endDate: target.endDate,
        rate: target.conferenceRate || 0
      }];
      if (target.subGroups) {
        targetGroups.push(...target.subGroups.map(sg => ({
          name: sg.orgName, pax: sg.pax, startDate: sg.startDate, endDate: sg.endDate, rate: sg.conferenceRate || 0
        })));
      }
    }

    const updatedGroups = [...targetGroups, ...sourceGroups];
    const updatedOrgName = updatedGroups.map(g => g.name).filter(n => n).join(', ');
    
    const newRevenue = updatedGroups.reduce((acc, g) => {
      const gDays = calculateGroupDays(g.startDate, g.endDate);
      return acc + (Number(g.pax) || 0) * (Number(g.rate) || 0) * gDays;
    }, 0);

    setBudgets(prev => {
      const next = { ...(prev || {}) };
      const currentTarget = next[targetId] || target;
      next[targetId] = {
        ...currentTarget,
        orgName: updatedOrgName,
        eventGroups: updatedGroups,
        totalWorkshopAmount: newRevenue,
        targetFoodCost: newRevenue * 0.25
      };
      delete next[sourceId];
      return next;
    });
    setAbsorbingId(null);
    alert(`Successfully absorbed ${source.orgName} into ${target.orgName}!`);
  };

  return (
    <div className="fade-in past-budgets-page">
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Past Budgets & Records</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Historical analysis, reporting, and budget reclamation.</p>
        </div>
      </div>

      <div className="card past-budgets-card">
        <div className="past-budgets-toolbar">
          <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
            <input 
              className="input-field" 
              placeholder="Search by organization or budget name..." 
              value={historySearch} 
              onChange={e => setHistorySearch(e.target.value)} 
              style={{ paddingLeft: "2.5rem", marginBottom: 0 }}
            />
            <Search size={18} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", opacity: 0.5 }} />
          </div>
          <div className="past-record-count">
             Showing {filteredHistory.length} records
          </div>
        </div>
        
        <div className="table-wrapper past-budgets-table">
          <table>
            <thead>
              <tr style={{ background: "#FFF7ED" }}>
                <th style={{ padding: "1rem" }}>Date Saved</th>
                <th>Organization</th>
                <th>PAX / Days</th>
                <th>Revenue Target</th>
                <th title="Total cost based on current market prices">Actual Est. Cost</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(b => {
                const details = getBudgetDetails(b);
                const currentTotalCost = (b.items || []).reduce((acc, item) => {
                  const invItem = inventory.find(i => i.id === item.id);
                  const price = invItem ? invItem.price : (item.price || 0);
                  return acc + (Number(item.budgetQty || 0) * Number(price));
                }, 0);

                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #FFEDD5" }}>
                    <td style={{ color: "var(--text-secondary)", fontWeight: 500, padding: "1rem" }}>{new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 700, color: "#9A3412" }}>{b.orgName || "Unnamed Group"}</td>
                    <td style={{ fontWeight: 600 }}>
                      {details.totalPax} Pax / {details.days} Days
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--primary-color)" }}>KES {b.totalWorkshopAmount?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>KES {currentTotalCost.toLocaleString()}</td>
                    <td>
                      <span className="badge" style={{ 
                        fontSize: "0.7rem",
                        background: b.status?.includes('Completed') ? '#DCFCE7' : b.status === 'Cancelled' ? '#FEE2E2' : '#F1F5F9',
                        color: b.status?.includes('Completed') ? '#166534' : b.status === 'Cancelled' ? '#991B1B' : 'var(--text-primary)'
                      }}>
                        {b.status || 'Draft'}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                        <button className="btn btn-secondary" title="View Details" style={{ padding: "0.45rem" }} onClick={() => onOpen(b.id)}><ExternalLink size={14}/></button>
                        <button className="btn btn-secondary" title="Download PDF" style={{ padding: "0.45rem" }} onClick={() => handleExportPDF(b)}><FileDown size={14}/></button>
                        <button className="btn btn-secondary" title="Email as PDF" style={{ padding: "0.45rem" }} onClick={() => handleExportPDF(b, true)}><Mail size={14}/></button>
                        <button className="btn btn-primary" title="Clone to New Budget" style={{ padding: "0.45rem", background: b.status === 'Completed' ? 'var(--primary-color)' : 'var(--bg-body)', color: b.status === 'Completed' ? 'white' : 'var(--primary-color)', border: '1px solid var(--primary-color)' }} onClick={() => onClone(b.id)}><Copy size={14}/></button>
                        
                        {b.status === 'Completed' || b.status?.includes('Returned') ? (
                          <button className="btn btn-secondary" title="Completed - Cannot Edit" style={{ padding: "0.45rem", opacity: 0.4, cursor: "not-allowed" }} disabled><Edit size={14}/></button>
                        ) : (
                          <button className="btn btn-secondary" title="Edit Budget" style={{ padding: "0.45rem" }} onClick={() => onEdit(b.id)}><Edit size={14}/></button>
                        )}
                        
                        <button className="btn btn-danger" title="Delete Record" style={{ padding: "0.45rem" }} onClick={() => handleDelete(b.id)}><Trash2 size={14}/></button>

                        {details.totalPax < 10 && (
                          <button 
                            className="btn btn-secondary" 
                            title="Absorb into Large Group" 
                            style={{ padding: "0.45rem", background: "#EFF6FF", color: "#2563EB", border: "1px solid #DBEAFE" }} 
                            onClick={() => setAbsorbingId(b.id)}
                          >
                            <Layers size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                       <Search size={48} style={{ opacity: 0.1 }} />
                       <p>No historical records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Absorption Selection Overlay */}
      {absorbingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: "500px", background: "white", padding: "2rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
               <div>
                 <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1E293B" }}>Absorb Small Group</h3>
                 <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Merging: <span style={{ fontWeight: 700, color: "var(--primary-color)" }}>{budgets[absorbingId]?.orgName} ({getBudgetDetails(budgets[absorbingId]).totalPax} Pax)</span></p>
               </div>
               <button className="btn btn-secondary" style={{ padding: "0.5rem" }} onClick={() => setAbsorbingId(null)}><X size={20}/></button>
            </div>
            
            <p style={{ fontSize: "0.9rem", marginBottom: "1rem", fontWeight: 600 }}>Select the target budget to absorb this group:</p>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {Object.values(budgets)
                .filter(b => b.id !== absorbingId && getBudgetDetails(b).totalPax >= 10 && !isConcludedStatus(b.status))
                .sort((a,b) => new Date(b.date) - new Date(a.date))
                .map(target => (
                  <div 
                    key={target.id} 
                    onClick={() => {
                      if(window.confirm(`Confirm absorbing ${budgets[absorbingId].orgName} into ${target.orgName}?`)) {
                        handleAbsorb(absorbingId, target.id);
                      }
                    }}
                    style={{ 
                      padding: "1rem", 
                      border: "1px solid var(--border-light)", 
                      borderRadius: "0.75rem", 
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>{target.orgName}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>{getBudgetDetails(target).totalPax} Pax · {getBudgetDetails(target).startDate} to {getBudgetDetails(target).endDate}</p>
                      </div>
                      <Layers size={18} style={{ opacity: 0.3 }} />
                    </div>
                  </div>
                ))}
              {Object.values(budgets).filter(b => b.id !== absorbingId && getBudgetDetails(b).totalPax >= 10 && !isConcludedStatus(b.status)).length === 0 && (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>No eligible large groups found to absorb this budget.</p>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem" }}>
               <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAbsorbingId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
