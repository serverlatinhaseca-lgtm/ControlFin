import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Loading from "./components/Loading.jsx";
import CustomerAssignment from "./components/CustomerAssignment.jsx";
import Login from "./pages/Login.jsx";
import UserSelector from "./pages/UserSelector.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import FinanceDashboard from "./pages/FinanceDashboard.jsx";
import CollectorAttendantDashboard from "./pages/CollectorAttendantDashboard.jsx";
import CollectionDirectorDashboard from "./pages/CollectionDirectorDashboard.jsx";
import GeneralDirectorDashboard from "./pages/GeneralDirectorDashboard.jsx";
import AttendantDashboard from "./pages/AttendantDashboard.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import ChargesPage from "./pages/ChargesPage.jsx";
import FinanceTasksPage from "./pages/FinanceTasksPage.jsx";
import RemindersPage from "./pages/RemindersPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import MyAccountPage from "./pages/MyAccountPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";

function AccessDenied() {
  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-[color:var(--text)]">Acesso negado</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Seu perfil nao possui permissao para acessar esta area.</p>
    </div>
  );
}

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pages = {
    ADMIN: <AdminDashboard />,
    DIRETOR_GERAL: <GeneralDirectorDashboard />,
    FINANCEIRO: <FinanceDashboard />,
    COBRADOR_ATENDENTE: <CollectorAttendantDashboard />,
    DIRETORA_COBRANCA: <CollectionDirectorDashboard />,
    ATENDENTE: <AttendantDashboard />
  };

  return pages[user.profile] || <AdminDashboard />;
}

function HomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const targets = {
    ADMIN: "/dashboard",
    DIRETOR_GERAL: "/dashboard",
    FINANCEIRO: "/financeiro",
    COBRADOR_ATENDENTE: "/dashboard",
    DIRETORA_COBRANCA: "/cobranca",
    ATENDENTE: "/atendimento"
  };

  return <Navigate to={targets[user.profile] || "/dashboard"} replace />;
}

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading fullScreen message="Carregando sessao" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && user?.profile !== "ADMIN" && !roles.includes(user?.profile)) {
    return <AccessDenied />;
  }

  return children;
}

function AssignmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text)]">Atribuicao de clientes</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Distribua clientes para o perfil Cobrador Atendente.</p>
      </div>
      <CustomerAssignment />
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen message="Inicializando ControlFin" />;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login mode="common" />} />
      <Route path="/admin-login" element={<Navigate to="/login" replace />} />
      <Route path="/selecionar-usuario" element={isAuthenticated ? <Navigate to="/" replace /> : <UserSelector />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="financeiro" element={<FinanceDashboard />} />
        <Route path="cobranca" element={<ChargesPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="atribuicao-clientes" element={<AssignmentPage />} />
        <Route path="atendimento" element={<AttendantDashboard />} />
        <Route path="recordatorios" element={<RemindersPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="minha-conta" element={<MyAccountPage />} />
        <Route path="financeiro/tarefas" element={<FinanceTasksPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
