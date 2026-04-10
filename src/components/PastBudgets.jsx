import React, { useState } from 'react';
import { CATEGORY_COLORS } from '../store';
import { FileDown, Printer, Trash2, Edit, ExternalLink, Mail, Search, Copy } from 'lucide-react';
import { generateBudgetPDF } from '../utils/pdfExport';

export default function PastBudgets({ inventory, budgets, setBudgets, onEdit, onOpen, onClone }) {
  const [historySearch, setHistorySearch] = useState("");

  const filteredHistory = Object.values(budgets).filter(b => 
    b.orgName?.toLowerCase().includes(historySearch.toLowerCase()) || 
    b.name?.toLowerCase().includes(historySearch.toLowerCase())
  ).sort((a,b) => new Date(b.date) - new Date(a.date));

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this budget record? This cannot be undone.")) {
      const newBudgets = { ...budgets };
      delete newBudgets[id];
      setBudgets(newBudgets);
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

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800 }}>📂 Past Budgets & Records</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>Historical analysis, reporting, and budget reclamation.</p>
        </div>
      </div>

      <div className="card" style={{ background: "rgba(255, 237, 213, 0.4)", border: "1px solid #FED7AA", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "1rem" }}>
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
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 600 }}>
             Showing {filteredHistory.length} records
          </div>
        </div>
        
        <div className="table-wrapper" style={{ background: "white", boxShadow: "var(--shadow-sm)" }}>
          <table style={{ fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#FFF7ED" }}>
                <th style={{ padding: "1rem" }}>Date Saved</th>
                <th>Organization</th>
                <th>PAX / Days</th>
                <th>Revenue Target</th>
                <th>Actual Est.</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(b => {
                const currentTotalCost = (b.items || []).reduce((acc, item) => {
                  const invItem = inventory.find(i => i.id === item.id);
                  const price = invItem ? invItem.price : (item.price || 0);
                  return acc + (Number(item.budgetQty || 0) * Number(price));
                }, 0);

                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #FFEDD5" }}>
                    <td style={{ color: "var(--text-secondary)", fontWeight: 500, padding: "1rem" }}>{new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ fontWeight: 700, color: "#9A3412" }}>{b.orgName || "Unnamed Group"}</td>
                    <td style={{ fontWeight: 600 }}>{b.pax} Pax / {b.days || 1} Days</td>
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
    </div>
  );
}
