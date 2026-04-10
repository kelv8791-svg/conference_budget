import React, { useState } from 'react';
import { CATEGORY_COLORS } from '../store';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function InventoryManager({ inventory, setInventory, role }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ id: '', cat: 'BUTCHERY', name: '', unit: 'PCS', price: 0, stock: 0 });
  
  // Search and Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  
  const isStore = role === "storekeeper";
  const spacing = isStore ? "0.4rem 0.6rem" : "0.75rem 1rem";
  const fontSize = isStore ? "0.8rem" : "0.875rem";

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = () => {
    setInventory(inventory.map(i => i.id === editingId ? editForm : i));
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if(window.confirm("Delete this item?")) {
      setInventory(inventory.filter(i => i.id !== id));
    }
  };

  const CATEGORY_PREFIXES = {
    'BUTCHERY': 'B',
    'FRUITS': 'F',
    'VEGETABLES': 'V',
    'SUPERMARKET': 'SM',
    'SUPPLEMENTARIES': 'S'
  };

  const getNextId = (category) => {
    const prefix = CATEGORY_PREFIXES[category] || 'ID';
    const catItems = inventory.filter(i => i.cat === category);
    
    // Extract numeric part of IDs (e.g., "B05" -> 5)
    let maxNum = 0;
    catItems.forEach(i => {
      const match = i.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    // Format with prefix and leading zero for single digits
    const numStr = nextNum < 10 ? `0${nextNum}` : String(nextNum);
    return `${prefix}${numStr}`;
  };

  const handleSaveAdd = () => {
    if(!addForm.name || !addForm.id) return alert("ID and Name are required");
    // Check for duplicate ID
    if(inventory.find(i => i.id === addForm.id)) {
      return alert(`Error: Item with ID ${addForm.id} already exists. Please use a unique ID.`);
    }
    setInventory([...inventory, addForm]);
    setIsAdding(false);
  };

  const startAdding = () => {
    const initialCat = activeTab !== 'ALL' && activeTab !== 'OTHERS' ? activeTab : 'BUTCHERY';
    setAddForm({ id: getNextId(initialCat), cat: initialCat, name: '', unit: 'PCS', price: 0, stock: 0 });
    setIsAdding(true);
  };

  const handleCategoryChange = (newCat) => {
    setAddForm({ ...addForm, cat: newCat, id: getNextId(newCat) });
  };

  // Search and Filtering Logic
  const filteredInventory = inventory.filter(item => {
    const searchLow = searchTerm.toLowerCase().trim();
    if (!searchLow) return activeTab === "ALL" || item.cat === activeTab;
    
    const matchesSearch = item.name.toLowerCase().includes(searchLow) || 
                         item.id.toLowerCase() === searchLow || // Exact ID match
                         item.id.toLowerCase().includes(searchLow);
    const matchesTab = activeTab === "ALL" || item.cat === activeTab;
    return matchesSearch && matchesTab;
  });

  // 3. Dynamic Categories list (standard + any others present in data)
  const standardCats = Object.keys(CATEGORY_COLORS);
  const dataCats = Array.from(new Set(inventory.map(i => i.cat)));
  const otherCats = dataCats.filter(c => !standardCats.includes(c));
  
  const allNavCategories = ["ALL", ...standardCats];
  if (otherCats.length > 0) allNavCategories.push("OTHERS");

  return (
    <div className="fade-in">
      {/* FULL TOP STICKY HEADER */}
      <div className="no-print" style={{ 
        position: "sticky", 
        top: 0, 
        zIndex: 50, 
        background: "rgba(255, 255, 255, 0.98)", 
        backdropFilter: "blur(12px)",
        paddingBottom: "1.25rem",
        paddingTop: "0.5rem",
        borderBottom: "1px solid var(--border-light)",
        marginBottom: "1.5rem",
        marginLeft: "-0.5rem",
        marginRight: "-0.5rem",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Title and Add Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: isStore ? "1.5rem" : "1.75rem", fontWeight: 800 }}>📦 Master Inventory</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem", fontSize: isStore ? "0.8rem" : "1rem" }}>{isStore ? "Quick-access stock management for store operations." : "Search, filter, and manage your central stock database."}</p>
          </div>
          {!isAdding && (
            <button className="btn btn-primary" onClick={startAdding} style={{ padding: isStore ? "0.5rem 1rem" : "0.75rem 1.25rem", borderRadius: "0.75rem", fontSize: isStore ? "0.8rem" : "1rem" }}>
              <Plus size={isStore ? 16 : 18} /> Add New Item
            </button>
          )}
        </div>

        {/* Navigation & Search Area */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2rem", flexWrap: "wrap", marginBottom: isAdding ? "1.25rem" : 0 }}>
          
          {/* Tabs Navigation */}
          <div style={{ display: "flex", gap: "0.35rem", background: "var(--bg-body)", padding: "0.4rem", borderRadius: "0.75rem", flexWrap: "wrap" }}>
            {allNavCategories.map(cat => {
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  style={{
                    padding: isStore ? "0.3rem 0.6rem" : "0.4rem 0.75rem", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: isStore ? "0.65rem" : "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    background: isActive ? "white" : "transparent",
                    color: isActive ? "var(--primary-color)" : "var(--text-secondary)",
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
            <input 
              className="input-field" 
              placeholder="Search items by name or ID..." 
              style={{ paddingLeft: "2.5rem", borderRadius: "0.75rem", marginBottom: 0 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
              <Edit2 size={16} style={{ opacity: 0.5 }} />
            </div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* PERSISTENT ADD FORM (Within Sticky Header) */}
        {isAdding && (
          <div style={{ 
            background: "var(--primary-light)", 
            padding: "1rem", 
            borderRadius: "0.75rem", 
            border: "1px solid var(--primary-color)", 
            marginTop: "0.5rem",
            display: "grid",
            gridTemplateColumns: "100px 180px 1fr 100px 100px 100px 110px",
            gap: "0.5rem",
            alignItems: "end",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Auto ID</label>
              <input className="input-field" placeholder="ID" value={addForm.id} readOnly style={{ marginBottom: 0, background: "rgba(255,255,255,0.5)", border: "1px dashed var(--primary-color)" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Category</label>
              <select className="input-field" value={addForm.cat} onChange={(e) => handleCategoryChange(e.target.value)} style={{ marginBottom: 0 }}>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Item Name</label>
              <input className="input-field" placeholder="Name" value={addForm.name} onChange={(e) => setAddForm({...addForm, name: e.target.value})} style={{ marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Unit</label>
              <input className="input-field" placeholder="Unit" value={addForm.unit} onChange={(e) => setAddForm({...addForm, unit: e.target.value})} style={{ marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Base Price</label>
              <input type="number" className="input-field" placeholder="Price" value={addForm.price} onChange={(e) => setAddForm({...addForm, price: Number(e.target.value)})} style={{ marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary-color)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Stock</label>
              <input type="number" className="input-field" placeholder="Stock" value={addForm.stock} onChange={(e) => setAddForm({...addForm, stock: Number(e.target.value)})} style={{ marginBottom: 0 }} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-success" onClick={handleSaveAdd} style={{ padding: "0.6rem 1rem", flex: 1 }}><Save size={16}/></button>
              <button className="btn btn-secondary" onClick={() => setIsAdding(false)} style={{ padding: "0.6rem 1rem", flex: 1 }}><X size={16}/></button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "visible" }}>
        <div className="table-wrapper" style={{ border: "none", borderRadius: 0, margin: 0, overflow: "visible" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: isAdding ? "245px" : "165px", zIndex: 40, background: "white", transition: "top 0.2s" }}>
              <tr style={{ fontSize: isStore ? "0.75rem" : "0.875rem" }}>
                <th style={{ width: "90px", borderBottom: "2px solid var(--border-light)", padding: spacing }}>ID</th>
                <th style={{ borderBottom: "2px solid var(--border-light)", padding: spacing }}>Category</th>
                <th style={{ borderBottom: "2px solid var(--border-light)", padding: spacing }}>Item Name</th>
                <th style={{ borderBottom: "2px solid var(--border-light)", padding: spacing }}>Unit</th>
                <th style={{ borderBottom: "2px solid var(--border-light)", padding: spacing }}>Base Price</th>
                <th style={{ borderBottom: "2px solid var(--border-light)", padding: spacing }}>Stock</th>
                <th style={{ textAlign: "right", borderBottom: "2px solid var(--border-light)", padding: spacing }} className="no-print">Actions</th>
              </tr>
            </thead>


            <tbody>


              {/* Render items by category groups */}
              {(activeTab === "ALL" ? [...standardCats, "OTHERS"] : [activeTab]).map(category => {
                const itemsInCat = category === "OTHERS" 
                  ? filteredInventory.filter(i => !standardCats.includes(i.cat))
                  : filteredInventory.filter(i => i.cat === category);
                
                if (itemsInCat.length === 0) return null;

                const catConfig = CATEGORY_COLORS[category] || { color: "#64748b", bg: "#f1f5f9" };

                return (
                  <React.Fragment key={category}>
                    {activeTab === "ALL" && (
                      <tr style={{ background: "var(--bg-body)" }}>
                        <td colSpan="6" style={{ padding: "0.75rem 1.5rem", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-light)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: catConfig.color }} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                              {category}
                            </span>
                            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)", opacity: 0.6 }}>
                              ({itemsInCat.length} items)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {itemsInCat.map(item => {
                      const isEditing = editingId === item.id;
                      const catStyle = CATEGORY_COLORS[item.cat] || { color: "#64748b", bg: "#f1f5f9" };
                      
                      if (isEditing) {
                        return (
                          <tr key={item.id} style={{ background: "#F8FAFC" }} className="no-print">
                            <td>{item.id}</td>
                            <td>
                              <select className="input-field" value={editForm.cat} onChange={(e) => setEditForm({...editForm, cat: e.target.value})}>
                                {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td><input className="input-field" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></td>
                            <td><input className="input-field" value={editForm.unit} onChange={(e) => setEditForm({...editForm, unit: e.target.value})} /></td>
                            <td><input type="number" className="input-field" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})} /></td>
                            <td><input type="number" className="input-field" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})} /></td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                <button className="btn btn-success" onClick={handleSaveEdit}><Save size={16}/></button>
                                <button className="btn btn-secondary" onClick={() => setEditingId(null)}><X size={16}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item.id} style={{ fontSize: fontSize }}>
                          <td style={{ fontWeight: 600, color: "var(--text-secondary)", padding: spacing }}>#{item.id}</td>
                          <td style={{ padding: spacing }}><span className="badge" style={{ background: catStyle.bg, color: catStyle.color, fontSize: isStore ? "0.65rem" : "0.75rem" }}>{item.cat}</span></td>
                          <td style={{ fontWeight: 600, padding: spacing }}>{item.name}</td>
                          <td style={{ padding: spacing }}>{item.unit}</td>
                          <td style={{ fontWeight: 500, padding: spacing }}>KES {item.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td style={{ fontWeight: 700, color: item.stock <= 0 ? "#DC2626" : item.stock < 10 ? "#D97706" : "#059669", padding: spacing }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              {item.stock <= 0 ? "❌ Out" : item.stock < 10 ? "⚠️ Low" : "✅ In"}
                              <span>{item.stock} {item.unit}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", padding: spacing }} className="no-print">
                            <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                              <button className="btn btn-secondary" style={{ padding: isStore ? "0.2rem 0.4rem" : "0.35rem 0.5rem" }} onClick={() => handleEditClick(item)}><Edit2 size={isStore ? 12 : 14}/></button>
                              <button className="btn btn-danger" style={{ padding: isStore ? "0.2rem 0.4rem" : "0.35rem 0.5rem" }} onClick={() => handleDelete(item.id)}><Trash2 size={isStore ? 12 : 14}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredInventory.length === 0 && <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>No items matching your search or filter.</div>}
        </div>
      </div>
    </div>
  );
}
