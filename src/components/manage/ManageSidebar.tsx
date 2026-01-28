import { NavLink, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, deleteDoc, doc, getDocs, limit, query, writeBatch } from "firebase/firestore";
import { useManage2 } from "../../store/manage2Store";

async function deleteCollectionInBatches(colPath: string, batchSize = 450) {
  while (true) {
    const colRef = collection(db, colPath);
    const snap = await getDocs(query(colRef, limit(batchSize)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteManageDeep(manageId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");

  await deleteCollectionInBatches(`users/${uid}/manages/${manageId}/tasks`);
  await deleteCollectionInBatches(`users/${uid}/manages/${manageId}/sections`);
  await deleteDoc(doc(db, "users", uid, "manages", manageId));
}

export default function ManageSidebar() {
  const nav = useNavigate();
  const { manageId, manageName, clearManage } = useManage2();
  const isTabletOrLess = window.matchMedia("(max-width: 1024px)").matches;
  
  return (
    <aside
      className="glass manageSidebar"
      style={{
        padding: isTabletOrLess ? 12 : 16,
        position: "sticky",        // ✅ 모바일도 sticky 유지 추천
        top: isTabletOrLess ? 12 : 18,
        height: isTabletOrLess ? "auto" : "calc(100vh - 36px)",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {/* 헤더 */}
      <div className="sideHeader" style={{ padding: "6px 6px 14px" }}>
        <div
          className="sideTitle"
          title={manageName ?? ""}
          style={{
            fontWeight: 1000,
            fontSize: 16,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {manageName ?? "Manage"}
        </div>

        <div className="sideHeaderActions" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <button
            className="iconBtn"
            title="변경"
            onClick={() => {
              clearManage();
              nav("/m", { replace: true });
            }}
          >
            변경
          </button>

          <span className="sideDot" style={{ color: "rgba(15,23,42,.25)" }}>
            ·
          </span>

          <button
            className="iconBtn"
            title="삭제"
            onClick={async () => {
              if (!manageId) return;
              const ok = window.confirm(`"${manageName}" Manage를 삭제할까요?\n(섹션/할 일도 함께 삭제됩니다)`);
              if (!ok) return;

              await deleteManageDeep(manageId);
              clearManage();
              nav("/m", { replace: true });
            }}
            style={{ color: "rgba(239,68,68,.9)" }}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="sideNav" style={{ display: "grid", gap: 8, padding: 6 }}>
        <NavLink to="/m/dashboard" className={({ isActive }) => `sideLink ${isActive ? "active" : ""}`}>
          대시보드
        </NavLink>
        <NavLink to="/m/tasks" className={({ isActive }) => `sideLink ${isActive ? "active" : ""}`}>
          할 일
        </NavLink>
        <NavLink to="/m/calendar" className={({ isActive }) => `sideLink ${isActive ? "active" : ""}`}>
          캘린더
        </NavLink>
      </nav>

      <div className="sideDivider" style={{ marginTop: 14, height: 1, background: "rgba(148,163,184,.18)" }} />
      <div
        className="sideHint"
        style={{ marginTop: 12, color: "rgba(15,23,42,.45)", fontWeight: 800, fontSize: 12, padding: "0 6px" }}
      >
        선택한 Planner 기준으로 저장됩니다
      </div>
    </aside>
  );
}
