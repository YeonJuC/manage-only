// src/app/RequireManage.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useManage2 } from "../store/manage2Store";

export default function RequireManage() {
  const { manageId } = useManage2();

  if (!manageId) {
    return <Navigate to="/m" replace />;
  }

  return <Outlet />;
}
