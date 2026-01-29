// src/pages/manage2/ManageLayout.tsx
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import ManageSidebar from "../../components/manage/ManageSidebar";
import { useManage2 } from "../../store/manage2Store";
import "./manageLayout.css";

export default function ManageLayout() {
  const { manageId } = useManage2();
  const loc = useLocation();

  // ✅ SPA 라우팅 시 스크롤 위치가 유지되는 문제 해결
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [loc.pathname]);

  if (!manageId && loc.pathname !== "/m") {
    return <Navigate to="/m" replace />;
  }

  return (
    <div className="manageLayout">
      <ManageSidebar />
      <main className="glass manageMain">
        <Outlet />
      </main>
    </div>
  );
}
