import { useEffect, useMemo, useState } from "react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { MembersPage } from "@/features/members/MembersPage";
import { ModulePage } from "@/features/modules/ModulePage";

export function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("ad-montese.theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ad-montese.theme", isDark ? "dark" : "light");
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
            { path: "integracoes", element: <IntegrationsPage /> },
            { path: "congregacoes", element: <ModulePage moduleName="Congregacoes" /> },
            { path: "secretaria", element: <ModulePage moduleName="Secretaria" /> },
            { path: "tesouraria", element: <ModulePage moduleName="Tesouraria" /> },
            { path: "patrimonio", element: <ModulePage moduleName="Patrimonio" /> },
            { path: "eventos", element: <ModulePage moduleName="Eventos" /> },
            { path: "relatorios", element: <ModulePage moduleName="Relatorios" /> },
            { path: "dados", element: <ModulePage moduleName="Dados da Planilha" /> },
            { path: "usuarios", element: <ModulePage moduleName="Usuarios" /> },
            { path: "configuracoes", element: <ModulePage moduleName="Configuracoes" /> },
          ],
        },
        { path: "*", element: <Navigate to="/" replace /> },
      ]),
    [isDark],
  );

  return <RouterProvider router={router} />;
}
