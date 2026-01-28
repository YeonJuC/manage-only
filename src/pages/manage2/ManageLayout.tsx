import { Outlet, Navigate, useLocation } from "react-router-dom";
import ManageSidebar from "../../components/manage/ManageSidebar";
import { useManage2 } from "../../store/manage2Store";

export default function ManageLayout() {
  const { manageId } = useManage2();
  const loc = useLocation();

  const isTabletOrLess = window.matchMedia("(max-width: 1024px)").matches;

  if (!manageId && loc.pathname !== "/m") {
    return <Navigate to="/m" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: isTabletOrLess ? 12 : 18,
        display: "grid",
        gridTemplateColumns: isTabletOrLess ? "1fr" : "280px 1fr",
        gap: isTabletOrLess ? 12 : 18,
        alignItems: "start",
      }}
    >
      <ManageSidebar />

      <main
        className="glass"
        style={{
          padding: isTabletOrLess ? 16 : 22,
          paddingTop: isTabletOrLess ? 170 : 22, // ✅ 여기 핵심(겹침 방지)
          overflow: "hidden",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
