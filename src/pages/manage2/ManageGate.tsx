// src/pages/manage2/ManageGate.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
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
  const [listLoading, setListLoading] = useState(false);
  const [manages, setManages] = useState<ManageRow[]>([]);
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const didAutoOpen = useRef(false);

  // ✅ 한 단어 타이틀 (원하면 바꿔)
  const HERO_TITLE = "Manage Gate";

  // auth 관찰
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 로그인 후 manage 목록 실시간 로드(onSnapshot)
  useEffect(() => {
    setErr("");
    setManages([]);
    setListLoading(false);

    const uid = user?.uid;
    if (!uid) return;

    setListLoading(true);
    const q = query(collection(db, "users", uid, "manages"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setManages(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name ?? "(이름 없음)" })));
        setListLoading(false);
      },
      (e) => {
        setErr(e?.message ?? "플래너 목록을 불러오지 못했습니다.");
        setListLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // ✅ 로그인 + 목록 로드 완료 시, 최근 플래너 자동 진입(1회)
  useEffect(() => {
    if (didAutoOpen.current) return;
    if (loading) return;
    if (!user) return;
    if (listLoading) return;

    if (!manageId) {
      didAutoOpen.current = true;
      return;
    }

    const found = manages.find((m) => m.id === manageId);
    if (found) {
      setManage(found.id, found.name);
      didAutoOpen.current = true;
      nav("/m/dashboard");
      return;
    }

    clearManage();
    didAutoOpen.current = true;
  }, [loading, user, listLoading, manageId, manages, nav, setManage, clearManage]);

  const canCreate = useMemo(() => name.trim().length >= 1 && !!user?.uid, [name, user?.uid]);

  const welcomeName =
    (user?.displayName && user.displayName.trim()) ||
    (user?.email && user.email.split("@")[0]) ||
    "";

  const onCreate = async () => {
    setErr("");
    const uid = user?.uid;
    if (!uid) {
      setErr("로그인이 필요합니다.");
      return;
    }
    const n = name.trim();
    if (!n) return;

    try {
      const ref = await addDoc(collection(db, "users", uid, "manages"), {
        name: n,
        createdAt: serverTimestamp(),
      });

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
    if (!uid) {
      setErr("로그인이 필요합니다.");
      return;
    }
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

              {user && (
                <span className="manageGate-welcomeInline">
                  <b>{welcomeName}</b> 님 환영합니다
                </span>
              )}
            </div>

            <h1 className="manageGate-title">{HERO_TITLE}</h1>
            <p className="manageGate-hint">
              최근 플래너를 바로 열거나, 새 플래너를 만들어 시작하세요.
            </p>
          </div>

          <div className="manageGate-topActions">
            {loading ? (
              <button className="manageGate-btn" disabled>
                로딩 중…
              </button>
            ) : user ? (
              <>
                <button
                  className="manageGate-btn manageGate-btnPrimary"
                  onClick={() => {
                    if (manageId && manageName) nav("/m/dashboard");
                  }}
                  disabled={!manageId}
                  title={manageId ? `최근 선택: ${manageName ?? ""}` : "최근 선택된 플래너가 없습니다"}
                >
                  최근 플래너 열기
                </button>

                <button
                  className="manageGate-btn manageGate-btnGhost"
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
                  const provider = new GoogleAuthProvider();
                  try {
                    await signInWithPopup(auth, provider);
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

        <div className="manageGate-section">
          {err && <div className="manageGate-error">{err}</div>}

          <div className="manageGate-rowBetween" style={{ marginBottom: 14 }}>
            <div>
              <div className="manageGate-welcomeTitle">내 Planner 목록</div>
              <div className="manageGate-welcomeDesc">
                {user ? "플래너를 만들거나 선택하세요." : "로그인하면 플래너를 생성/선택할 수 있어요."}
              </div>
            </div>

            {!!user && !!manageId && (
              <div className="manageGate-pillOk" title={manageName ?? ""}>
                최근: {manageName ?? "(이름 없음)"}
              </div>
            )}
          </div>

          <div className="manageGate-inputRow">
            <input
              className="manageGate-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user ? "새 Planner 이름" : "로그인 후 생성 가능"}
              disabled={!user}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) onCreate();
              }}
            />
            <button className="manageGate-btn manageGate-btnPrimary" onClick={onCreate} disabled={!canCreate}>
              만들기
            </button>
          </div>

          {!user ? (
            <div style={{ marginTop: 14, color: "rgba(15,23,42,.55)", fontWeight: 850 }}>
              로그인하면 목록이 보입니다.
            </div>
          ) : listLoading ? (
            <div className="manageGate-list" aria-busy="true" style={{ marginTop: 12 }}>
              {[0, 1, 2].map((k) => (
                <div key={k} className="manageGate-item" style={{ cursor: "default" }}>
                  <div style={{ height: 14, width: "58%", borderRadius: 10, background: "rgba(15,23,42,.10)" }} />
                  <div style={{ marginTop: 10, height: 12, width: "42%", borderRadius: 10, background: "rgba(15,23,42,.07)" }} />
                </div>
              ))}
            </div>
          ) : manages.length === 0 ? (
            <div style={{ marginTop: 14, color: "rgba(15,23,42,.55)", fontWeight: 850 }}>
              아직 만든 Planner가 없습니다. 위에서 생성하세요.
            </div>
          ) : (
            <div className="manageGate-list">
              {manages.map((m) => (
                <div key={m.id} className="manageGate-item" onClick={() => onOpen(m)} role="button" tabIndex={0}>
                  <div className="manageGate-rowBetween">
                    <div>
                      <div className="manageGate-itemTitle">{m.name}</div>
                      <div className="manageGate-itemSub">id: {m.id}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="manageGate-btn manageGate-btnMini"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(m);
                        }}
                      >
                        열기
                      </button>

                      <button
                        className="manageGate-btn manageGate-btnMini manageGate-btnDanger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(m);
                        }}
                        disabled={busyId === m.id}
                        title="삭제"
                      >
                        {busyId === m.id ? "삭제 중…" : "삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
