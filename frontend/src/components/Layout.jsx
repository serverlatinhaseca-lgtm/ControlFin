import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Layout() {
  const { user } = useAuth();
  const sidebarMode = user?.sidebar_mode === "floating" ? "floating" : "fixed";

  return (
    <div className={`app-bg app-shell app-layout app-layout-${sidebarMode}`}>
      <Sidebar mode={sidebarMode} />
      <div className={`main-shell layout-content main-${sidebarMode}`}>
        <Header />
        <main className="layout-main mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
