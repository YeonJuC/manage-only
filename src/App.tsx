// src/App.tsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Manage2Provider } from "./store/manage2Store";
import RequireAuth from "./app/RequireAuth";

import ManageGate from "./pages/manage2/ManageGate";
import ManageLayout from "./pages/manage2/ManageLayout";
import Dashboard from "./pages/manage2/Dashboard";
import Tasks from "./pages/manage2/Tasks";
import Calendar from "./pages/manage2/Calendar";

export default function App() {
  return (
    <Manage2Provider>
      <Routes>
        <Route path="/" element={<Navigate to="/m" replace />} />

        {/* ✅ /m을 부모로 두고, Gate는 index로 */}
        <Route path="/m" element={<Outlet />}>
          <Route index element={<ManageGate />} />

          {/* ✅ 실제 앱 화면만 로그인 + 레이아웃 */}
          <Route
            element={
              <RequireAuth>
                <ManageLayout />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/m" replace />} />
      </Routes>
    </Manage2Provider>
  );
}
