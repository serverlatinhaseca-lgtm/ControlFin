import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading({ message = "Carregando", fullScreen = false }) {
  const content = (
    <div className="flex items-center justify-center gap-3 text-[color:var(--muted)]">
      <Loader2 className="animate-spin" size={22} />
      <span className="font-semibold">{message}</span>
    </div>
  );

  if (fullScreen) {
    return <div className="app-bg flex min-h-screen items-center justify-center">{content}</div>;
  }

  return <div className="card p-6">{content}</div>;
}
