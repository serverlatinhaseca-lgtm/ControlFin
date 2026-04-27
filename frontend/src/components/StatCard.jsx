import React from "react";

export default function StatCard({ title, value, description, icon: Icon, tone = "default" }) {
  const toneClass = {
    default: "text-[color:var(--primary)]",
    success: "text-[color:var(--success)]",
    warning: "text-[color:var(--warning)]",
    danger: "text-[color:var(--danger)]"
  }[tone];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">{title}</p>
          <strong className="mt-3 block text-2xl font-black text-[color:var(--text)]">{value}</strong>
          {description ? <p className="mt-2 text-sm text-[color:var(--muted)]">{description}</p> : null}
        </div>
        {Icon ? (
          <div className={`rounded-2xl bg-[color:var(--surface-2)] p-3 ${toneClass}`}>
            <Icon size={24} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
