// src/app/RequireManage.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useManage2 } from "../store/manage2Store";

export default function RequireManage() {
  const { manageId, hydrated } = useManage2();

  if (!hydrated) return null;     // 복원 전엔 아무것도 하지 않기
  if (!manageId) return <Navigate to="/m" replace />;

  return <Outlet />;
}
