import { NavLink, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";

import { useManage2 } from "../store/manage2Store";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  writeBatch,
} from "firebase/firestore";
import "../../styles/mobile.css";

/** 하위 컬렉션 batch 삭제 */
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

/** Planner(Manage) + 하위 데이터 삭제 */
async function deletePlannerDeep(manageId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");

  await deleteCollectionInBatches(`users/${uid}/manages/${manageId}/tasks`);
  await deleteCollectionInBatches(`users/${uid}/manages/${manageId}/sections`);
  await deleteDoc(doc(db, "users", uid, "manages", manageId));
}

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  color: isActive ? "#111" : "#555",
  background: isActive ? "#eef2ff" : "transparent",
  fontWeight: isActive ? 800 : 700,
});

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();

  const { manageId, manageName, clearManage } = useManage2();

  const [userName, setUserName] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setLoggedIn(!!u);
      setUserName(u?.displayName ?? u?.email ?? "");
    });
    return () => unsub();
  }, []);

  // ✅ 선택 없이 /m/dashboard 같은 곳 들어오면 /m으로 보내기
  const isGate = loc.pathname === "/m";
  const isManageArea = loc.pathname.startsWith("/m");

  if (isManageArea && !isGate && !manageId) {
    return <Navigate to="/m" replace />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        {/* Planner 헤더 */}
        <div style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>현재 Planner</div>
              <div
                title={manageName ?? ""}
                style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.2, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {manageName ?? "선택되지 않음"}
              </div>
            </div>

            <button className="btn" style={{ height: 34, borderRadius: 10, padding: "0 10px" }} onClick={() => nav("/m")}>
              변경
            </button>
          </div>

          <button
            className="btn"
            disabled={!manageId}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,.25)",
              background: "rgba(239,68,68,.08)",
              color: "rgba(239,68,68,.95)",
              fontWeight: 900,
            }}
            onClick={async () => {
              if (!manageId) return;
              const ok = window.confirm(`"${manageName}" Planner를 삭제할까요?\n(섹션/할 일도 함께 삭제됩니다)`);
              if (!ok) return;

              await deletePlannerDeep(manageId);
              clearManage();
              nav("/m", { replace: true });
            }}
          >
            Planner 삭제
          </button>
        </div>

        {/* ✅ 메뉴: /m이고 planner 선택된 경우만 보여주기 */}
        {!isGate && manageId && (
          <nav className="nav" style={{ marginTop: 12 }}>
            <div className="navSectionTitle">Planner</div>
            <NavLink to="/m/dashboard" style={linkStyle}>대시보드</NavLink>
            <NavLink to="/m/tasks" style={linkStyle}>할 일</NavLink>
            <NavLink to="/m/calendar" style={linkStyle}>캘린더</NavLink>
          </nav>
        )}

        {/* 로그인 카드 */}
        <div className="sidebar-footer auth-float">
          {loggedIn ? (
            <div style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{userName || "사용자"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>로그인됨</div>
                </div>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#22c55e", flex: "0 0 auto" }} />
              </div>

              <button className="btn" style={{ width: "100%", height: 40, borderRadius: 12, marginTop: 2 }} onClick={() => signOut(auth)}>
                로그아웃
              </button>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>로그인이 필요합니다</div>
              <button
                className="btn"
                style={{ width: "100%", height: 40, borderRadius: 12 }}
                onClick={async () => {
                  const provider = new GoogleAuthProvider();
                  await signInWithPopup(auth, provider);
                }}
              >
                Google 로그인
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Planner</div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
