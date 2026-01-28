import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import AppShell from "./Appshell";

import { Manage2Provider } from "../store/manage2Store";
import ManageGate from "../pages/manage2/ManageGate";
import Manage2Dashboard from "../pages/manage2/Dashboard";
import Manage2Tasks from "../pages/manage2/Tasks";
import Manage2Calendar from "../pages/manage2/Calendar";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <RequireAuth>
            <Manage2Provider>
              <AppShell />
            </Manage2Provider>
          </RequireAuth>
        }
      >
        {/* 루트는 /m으로 */}
        <Route index element={<Navigate to="m" replace />} />

        {/* ✅ Manage 영역 */}
        <Route path="m">
          <Route index element={<ManageGate />} />
          <Route path="dashboard" element={<Manage2Dashboard />} />
          <Route path="tasks" element={<Manage2Tasks />} />
          <Route path="calendar" element={<Manage2Calendar />} />
        </Route>

        {/* 나머지는 /m */}
        <Route path="*" element={<Navigate to="m" replace />} />
      </Route>
    </Routes>
  );
}
