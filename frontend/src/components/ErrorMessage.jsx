import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorMessage({ message, onRetry }) {
  if (!message) {
    return null;
  }

  return (
    <div className="card flex flex-col gap-3 border-[color:var(--danger)] p-4 text-[color:var(--danger)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} />
        <span className="font-semibold">{message}</span>
      </div>
      {onRetry ? (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
