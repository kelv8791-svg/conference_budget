import React, { useState } from 'react';
import { Lock, Delete, X, Circle } from 'lucide-react';

const STORE_PIN = "8421"; 

export default function PinGate({ onSuccess }) {
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      setTimeout(() => {
        if (next === STORE_PIN) {
          onSuccess();
        } else {
          setShake(true);
          setError(true);
          setTimeout(() => { setEntered(""); setShake(false); }, 700);
        }
      }, 200);
    }
  };

  const handleDelete = () => {
    setEntered(prev => prev.slice(0, -1));
    setError(false);
  };

  const digits = ["1","2","3","4","5","6","7","8","9","C","0","⌫"];

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-body)", padding: "1rem"
    }}>
      <div className="fade-in card" style={{
        textAlign: "center", padding: "2.5rem 2rem", maxWidth: 340, width: "100%",
        animation: shake ? "shakeX 0.5s ease" : undefined,
        boxShadow: "var(--shadow-lg)", borderRadius: "1.5rem"
      }}>
        <style>{`
          @keyframes shakeX {
            0%, 100% { transform: translateX(0); }
            10%, 50%, 90% { transform: translateX(-8px); }
            30%, 70% { transform: translateX(8px); }
          }
          /* Protect this specific grid from global media query overrides */
          .numpad-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.75rem !important;
          }
        `}</style>

        <div style={{
          width: 56, height: 56, borderRadius: "1.25rem", background: "var(--primary-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem", color: "var(--primary-color)"
        }}>
          <Lock size={28} />
        </div>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>Storekeeper Access</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.75rem", fontSize: "0.85rem", fontWeight: 500 }}>
          Enter your 4-digit PIN to continue
        </p>

        {/* PIN Indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "2rem" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: "50%",
              background: i < entered.length ? (error ? "var(--danger-color)" : "var(--primary-color)") : "var(--border-light)",
              transform: i === entered.length - 1 ? "scale(1.2)" : "scale(1)",
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }} />
          ))}
        </div>

        {error && (
          <p style={{ color: "var(--danger-color)", fontWeight: 700, fontSize: "0.75rem", marginBottom: "1rem" }}>
            Incorrect PIN. Please try again.
          </p>
        )}

        {/* Numpad */}
        <div className="numpad-grid">
          {digits.map((d, i) => {
            const isDelete = d === "⌫";
            const isClear = d === "C";
            return (
              <button
                key={i}
                onClick={() => {
                   if (isDelete) handleDelete();
                   else if (isClear) setEntered("");
                   else handleDigit(d);
                }}
                style={{
                  height: 64, border: "1.5px solid var(--border-light)", borderRadius: "1rem",
                  fontSize: (isDelete || isClear) ? "1.1rem" : "1.5rem", fontWeight: 700,
                  background: isDelete ? "var(--danger-light)" : (isClear ? "#F1F5F9" : "white"),
                  color: isDelete ? "var(--danger-color)" : "var(--text-primary)",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.background = isDelete ? "var(--danger-color)" : "var(--primary-light)"; 
                  e.currentTarget.style.color = isDelete ? "white" : "var(--primary-color)";
                  e.currentTarget.style.borderColor = isDelete ? "var(--danger-color)" : "var(--primary-color)";
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = isDelete ? "var(--danger-light)" : (isClear ? "#F1F5F9" : "white"); 
                  e.currentTarget.style.color = isDelete ? "var(--danger-color)" : "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-light)";
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
