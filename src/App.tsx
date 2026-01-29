// src/App.tsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Manage2Provider } from "./store/manage2Store";

import RequireAuth from "./app/RequireAuth";

import ManageGate from "./pages/manage2/ManageGate";
import ManageLayout from "./pages/manage2/ManageLayout";
import Dashboard from "./pages/manage2/Dashboard";
import Tasks from "./pages/manage2/Tasks";
import Calendar from "./pages/manage2/Calendar";
import ScrollToTop from "./app/ScrollToTop";

export default function App() {
  return (
    <Manage2Provider>
      <ScrollToTop />
      {/* <ScrollToTop containerSelector="#mainScroll" />  // 컨테이너 스크롤이면 이걸로 */}
      {/* ...Routes... */}
      <Routes>
        <Route path="/" element={<Navigate to="/m" replace />} />

        {/*
          ✅ 중요한 포인트
          - React Router v6에서 `/m/*`는 `/m`도 매칭될 수 있어요(별표가 빈 값도 허용).
          - 기존 구조는 `/m`에서 gate 대신 가드(/m/*)가 잡히면서 `/m`으로 리다이렉트가 반복되어
            "배경만 보이고 아무것도 안 나오는" 상태가 될 수 있습니다.
          - 해결: `/m`을 부모로 두고 index를 Gate로, 나머지(대시보드/할일/캘린더)는 자식 라우트로 분리.
        */}
        <Route path="/m" element={<Outlet />}>
          {/* Gate는 인증 없이도 보여야 하니 index로 분리 */}
          <Route index element={<ManageGate />} />

          {/* 실제 앱 화면만 로그인(RequireAuth) + 레이아웃(ManageLayout) 적용 */}
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
