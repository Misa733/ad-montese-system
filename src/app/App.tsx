import { useEffect, useMemo, useState } from "react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth, type Permission } from "@/application/auth/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { BlockedPage, LoadErrorPage, LoadingScreen, NewPasswordPage, NotConfiguredPage, PendingApprovalPage } from "@/features/auth/AuthStatusPages";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { MembersPage } from "@/features/members/MembersPage";
import { ModulePage } from "@/features/modules/ModulePage";
import { PatrimonyPage } from "@/features/patrimony/PatrimonyPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { UsersPage } from "@/features/users/UsersPage";

export function App() {
  const { status, passwordRecovery } = useAuth();
  const [isDark, setIsDark] = useState(() => readTheme() === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("ad-montese.theme", isDark ? "dark" : "light");
    } catch {
      // Preferencia de tema e opcional.
    }
  }, [isDark]);

  const router = useMemo(
    () =>
      createBrowserRouter([
        { path: "/", element: <LoginPage /> },
        {
          path: "/app",
          element: <AppLayout isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: "areas", element: <ModulePage moduleName="Areas" /> },
            { path: "setores", element: <ModulePage moduleName="Setores" /> },
            { path: "membros", element: <MembersPage /> },
            { path: "dizimistas", element: <ModulePage moduleName="Dizimistas" /> },
            { path: "integracoes", element: <Guard permission="manageSettings"><IntegrationsPage /></Guard> },
            { path: "congregacoes", element: <ModulePage moduleName="Congregacoes" /> },
            { path: "secretaria", element: <ModulePage moduleName="Secretaria" /> },
            { path: "tesouraria", element: <ModulePage moduleName="Tesouraria" /> },
            { path: "patrimonio", element: <PatrimonyPage /> },
            { path: "eventos", element: <ModulePage moduleName="Eventos" /> },
            { path: "relatorios", element: <ModulePage moduleName="Relatorios" /> },
            { path: "dados", element: <ModulePage moduleName="Dados da Planilha" /> },
            { path: "usuarios", element: <Guard permission="manageUsers"><UsersPage /></Guard> },
            { path: "configuracoes", element: <Guard permission="manageSettings"><SettingsPage /></Guard> },
          ],
        },
        { path: "*", element: <Navigate to="/" replace /> },
      ]),
    [isDark],
  );

  if (passwordRecovery) return <NewPasswordPage />;
  if (status === "loading") return <LoadingScreen />;
  if (status === "notConfigured") return <NotConfiguredPage />;
  if (status === "pending") return <PendingApprovalPage />;
  if (status === "blocked") return <BlockedPage />;
  if (status === "error") return <LoadErrorPage />;

  return <RouterProvider router={router} />;
}

function Guard({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function readTheme() {
  try {
    return localStorage.getItem("ad-montese.theme");
  } catch {
    return null;
  }
}
