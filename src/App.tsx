// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Manage2Provider } from "./store/manage2Store";

import RequireManage from "./app/RequireManage";
import ManageGate from "./pages/manage2/ManageGate";
import ManageLayout from "./pages/manage2/ManageLayout";
import Dashboard from "./pages/manage2/Dashboard";
import Tasks from "./pages/manage2/Tasks";
import Calendar from "./pages/manage2/Calendar";

export default function App() {
  return (
    <Manage2Provider>
      <Routes>
        <Route path="/m" element={<ManageGate />} />

        {/* ✅ 가드 라우트 */}
        <Route element={<RequireManage />}>
          <Route path="/m/*" element={<ManageLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/m" replace />} />
        <Route path="*" element={<Navigate to="/m" replace />} />
      </Routes>
    </Manage2Provider>
  );
}
