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
    <Manage2Provider>
      <Routes>
        <Route path="/" element={<Navigate to="/m" replace />} />

        {/* ✅ Gate는 단독 */}
        <Route path="/m" element={<ManageGate />} />

        {/* ✅ 앱 영역만 보호 */}
        <Route
          path="/m/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Manage2Dashboard />} />
          <Route path="tasks" element={<Manage2Tasks />} />
          <Route path="calendar" element={<Manage2Calendar />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/m" replace />} />
      </Routes>
    </Manage2Provider>
  );
}
