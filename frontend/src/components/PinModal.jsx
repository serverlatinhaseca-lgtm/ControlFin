import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, X } from "lucide-react";

export default function PinModal({ open, user, loading, error, onClose, onConfirm }) {
  const inputRef = useRef(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setShowPin(false);
      window.setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 80);
    }
  }, [open, user?.id]);

  if (!open || !user) {
    return null;
  }

  function handleClose() {
    if (loading) {
      return;
    }

    setPin("");
    setShowPin(false);
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!pin) {
      return;
    }

    await onConfirm(pin);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--primary)]">ControlFin</p>
            <h2 className="mt-2 text-2xl font-black text-[color:var(--text)]">Insira seu PIN</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{user.name}</p>
          </div>
          <button type="button" className="rounded-2xl border border-[color:var(--border)] p-2 text-[color:var(--muted)] hover:text-[color:var(--text)]" onClick={handleClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[color:var(--muted)]">PIN</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3 text-[color:var(--muted)]" size={18} />
              <input
                ref={inputRef}
                className="input pl-10 pr-12 text-center text-lg font-black tracking-[0.35em]"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
                autoComplete="new-password"
                inputMode="numeric"
                maxLength={8}
                placeholder="PIN"
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 rounded-xl p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
                onClick={() => setShowPin((currentValue) => !currentValue)}
                aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? <div className="rounded-2xl border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 p-3 text-sm font-bold text-[color:var(--danger)]">{error}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !pin}>
              {loading ? "Confirmando" : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
