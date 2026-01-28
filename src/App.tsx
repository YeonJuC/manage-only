import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Manage2Provider } from "./store/manage2Store";

import ManageGate from "./pages/manage2/ManageGate";
import ManageLayout from "./pages/manage2/ManageLayout";
import Dashboard from "./pages/manage2/Dashboard";
import Tasks from "./pages/manage2/Tasks";
import Calendar from "./pages/manage2/Calendar";

export default function App() {
  return (
    <BrowserRouter>
      <Manage2Provider>
        <Routes>
          {/* ✅ Gate는 Layout 밖 (사이드바 안 보임) */}
          <Route path="/m" element={<ManageGate />} />

          {/* ✅ 선택 후 들어가는 화면만 Layout 사용 (사이드바 보임) */}
          <Route path="/m/*" element={<ManageLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="*" element={<Navigate to="/m/dashboard" replace />} />
          </Route>

          {/* 루트는 Gate로 */}
          <Route path="/" element={<Navigate to="/m" replace />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/m" replace />} />
        </Routes>
      </Manage2Provider>
    </BrowserRouter>
  );
}
