import { Outlet, Navigate, useLocation } from "react-router-dom";
import ManageSidebar from "../../components/manage/ManageSidebar";
import { useManage2 } from "../../store/manage2Store";
import "./manageLayout.css";

export default function ManageLayout() {
  const { manageId } = useManage2();
  const loc = useLocation();

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
