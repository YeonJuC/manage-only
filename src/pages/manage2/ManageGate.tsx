import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../../firebase";
import { useManage2 } from "../../store/manage2Store";

type ManageRow = { id: string; name: string };

async function deleteCollectionInBatches(path: string, batchSize = 450) {
  while (true) {
    const colRef = collection(db, path);
    const snap = await getDocs(query(colRef, limit(batchSize)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deletePlannerDeep(uid: string, plannerId: string) {
  await deleteCollectionInBatches(`users/${uid}/manages/${plannerId}/tasks`);
  await deleteCollectionInBatches(`users/${uid}/manages/${plannerId}/sections`);
  await deleteDoc(doc(db, "users", uid, "manages", plannerId));
}

export default function ManageGate() {
  const nav = useNavigate();
  const { setManage, clearManage, manageId, manageName } = useManage2();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [manages, setManages] = useState<ManageRow[]>([]);
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      setErr("");
      setManages([]);
      const uid = user?.uid;
      if (!uid) return;
      try {
        const q = query(collection(db, "users", uid, "manages"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setManages(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name ?? "(이름 없음)" })));
      } catch (e: any) {
        setErr(e?.message ?? "플래너 목록을 불러오지 못했습니다.");
      }
    })();
  }, [user?.uid]);

  const canCreate = useMemo(() => name.trim().length >= 1 && !!user?.uid, [name, user?.uid]);

  const onCreate = async () => {
    setErr("");
    const uid = user?.uid;
    if (!uid) return setErr("로그인이 필요합니다.");

    const n = name.trim();
    if (!n) return;

    try {
      const ref = await addDoc(collection(db, "users", uid, "manages"), { name: n, createdAt: serverTimestamp() });
      setManage(ref.id, n);
      setName("");
      nav("/m/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "플래너 생성에 실패했습니다.");
    }
  };

  const onOpen = (m: ManageRow) => {
    setManage(m.id, m.name);
    nav("/m/dashboard");
  };

  const onDelete = async (m: ManageRow) => {
    setErr("");
    const uid = user?.uid;
    if (!uid) return setErr("로그인이 필요합니다.");
    if (!confirm(`"${m.name}" 플래너를 삭제할까요? (복구 불가)`)) return;

    setBusyId(m.id);
    try {
      await deletePlannerDeep(uid, m.id);
      if (manageId === m.id) clearManage();
      setManages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e: any) {
      setErr(e?.message ?? "삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="manageGate-wrap">
      <div className="manageGate-card">
        <div className="manageGate-header">
          <div>
            <div className="manageGate-badgeRow">
              <span className="manageGate-chip">Planner</span>
              <span className="manageGate-subchip">/m</span>
            </div>
            <h1 className="manageGate-title">Manage Gate</h1>
            <p className="manageGate-desc">플래너를 만들거나 선택하면 대시보드/할일/캘린더로 들어갈 수 있어요.</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {loading ? (
              <button className="manageGate-btn" disabled>로딩 중…</button>
            ) : user ? (
              <>
                <button
                  className="manageGate-btn"
                  onClick={() => manageId && nav("/m/dashboard")}
                  disabled={!manageId}
                  title={manageId ? `최근 선택: ${manageName ?? ""}` : "최근 선택된 플래너가 없습니다"}
                >
                  최근 플래너 열기
                </button>
                <button
                  className="manageGate-btn"
                  onClick={async () => {
                    clearManage();
                    await signOut(auth);
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                className="manageGate-btn manageGate-btnPrimary"
                onClick={async () => {
                  setErr("");
                  try {
                    await signInWithPopup(auth, new GoogleAuthProvider());
                  } catch (e: any) {
                    setErr(e?.message ?? "로그인에 실패했습니다.");
                  }
                }}
              >
                Google로 로그인
              </button>
            )}
          </div>
        </div>

        <div className="manageGate-section" style={{ position: "relative", zIndex: 1 }}>
          {err && (
            <div style={{
              marginBottom: 12, padding: "10px 12px", borderRadius: 14,
              border: "1px solid rgba(239,68,68,.20)", background: "rgba(239,68,68,.06)",
              color: "rgba(185,28,28,.95)", fontWeight: 850,
            }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user ? "새 플래너 이름" : "로그인 후 생성 가능"}
              disabled={!user}
              style={{
                flex: "1 1 260px", height: 44, borderRadius: 14,
                border: "1px solid rgba(148,163,184,.35)", padding: "0 12px",
                fontWeight: 850, background: "rgba(255,255,255,.72)",
              }}
              onKeyDown={(e) => e.key === "Enter" && canCreate && onCreate()}
            />
            <button className="manageGate-btn manageGate-btnPrimary" onClick={onCreate} disabled={!canCreate}>
              새 Planner 만들기
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            {!user ? (
              <div style={{ marginTop: 10, color: "rgba(15,23,42,.55)", fontWeight: 800 }}>
                로그인하면 플래너를 생성/선택할 수 있어요.
              </div>
            ) : manages.length === 0 ? (
              <div style={{ marginTop: 10, color: "rgba(15,23,42,.55)", fontWeight: 800 }}>
                아직 만든 Planner가 없습니다. 위에서 생성하세요.
              </div>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {manages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 12, padding: "12px 12px", borderRadius: 16,
                      background: "rgba(255,255,255,.60)", border: "1px solid rgba(148,163,184,.25)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontWeight: 950, color: "rgba(15,23,42,.90)" }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(15,23,42,.40)", fontWeight: 800 }}>id: {m.id}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="manageGate-btn" onClick={() => onOpen(m)}>열기</button>
                      <button className="manageGate-btn" onClick={() => onDelete(m)} disabled={busyId === m.id}>
                        {busyId === m.id ? "삭제 중…" : "삭제"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
