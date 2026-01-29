// src/app/RequireManage.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useManage2 } from "../store/manage2Store";

export default function RequireManage() {
  const { manageId, hydrated } = useManage2();

  if (!hydrated) {
    return <div style={{ padding: 40 }}>hydrating...</div>;
  }

  if (!manageId) return <Navigate to="/m" replace />;

  return <Outlet />;
}
