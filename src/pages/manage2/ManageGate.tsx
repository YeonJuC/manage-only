import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp,deleteDoc, doc, limit, writeBatch, updateDoc} from "firebase/firestore";

import { auth, db } from "../../firebase";
import { useManage2 } from "../../store/manage2Store";

type ManageRow = {
  id: string;
  name: string;
};

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

async function deletePlannerDeep(plannerId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");

  await deleteCollectionInBatches(`users/${uid}/manages/${plannerId}/tasks`);
  await deleteCollectionInBatches(`users/${uid}/manages/${plannerId}/sections`);
  await deleteDoc(doc(db, "users", uid, "manages", plannerId));
}

export default function ManageGate() {
  const nav = useNavigate();
  const [vw, setVw] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isTablet = vw <= 1024;
  const isPhone = vw <= 640;

  const { setManage } = useManage2();

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ManageRow[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");

  const openEdit = (m: ManageRow) => {
    setEditId(m.id);
    setEditValue(m.name);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("로그인이 필요합니다.");

      await updateDoc(doc(db, "users", uid, "manages", editId), {
        name: trimmed,
        updatedAt: serverTimestamp(),
      });

      // ✅ 현재 선택된 planner 이름도 같이 반영(선택된 게 이거면)
      // manage2Store에 getter가 없어서 여기선 list만 갱신. 대시보드로 들어가면 최신값 사용됨.
      await load();
      setEditOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "수정 실패");
    }
  };

  const removePlanner = async (m: ManageRow) => {
    const ok = window.confirm(`"${m.name}" Planner를 삭제할까요?\n(할 일/섹션도 함께 삭제됩니다)`);
    if (!ok) return;

    try {
      await deletePlannerDeep(m.id);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "삭제 실패");
    }
  };


  // 로그인 상태
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [loginModal, setLoginModal] = useState(true); // 처음엔 무조건 뜨게

  const load = async () => {
    setErr("");
    setLoading(true);

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setList([]);
        setErr("로그인이 필요합니다.");
        return;
      }

      const q = query(collection(db, "users", uid, "manages"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const rows: ManageRow[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, name: String(data?.name ?? "Untitled") };
      });

      setList(rows);
    } catch (e: any) {
      setErr(e?.message ?? "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 로그인 상태 구독
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const ok = !!u;
      setLoggedIn(ok);
      setUserName(u?.displayName ?? u?.email ?? "");
      setLoginModal(!ok);

      if (ok) load();
      else {
        setList([]);
        setLoading(false);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async () => {
    setErr("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged가 모달 닫고 load까지 호출
    } catch (e: any) {
      setErr(e?.message ?? "로그인 실패");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setLoginModal(false);
      setList([]);
      setName("");
    } catch (e: any) {
      setErr(e?.message ?? "로그아웃 실패");
    }
  };

  const onSelect = (m: ManageRow) => {
    if (!loggedIn) {
      setLoginModal(true);
      return;
    }
    setManage(m.id, m.name);
    nav("/m/dashboard");
  };

  const onCreate = async () => {
    if (!loggedIn) {
      setLoginModal(true);
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) return;

    setErr("");
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setErr("로그인이 필요합니다.");
        return;
      }

      const ref = await addDoc(collection(db, "users", uid, "manages"), {
        name: trimmed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setManage(ref.id, trimmed);
      setName("");
      nav("/m/dashboard", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "생성 실패");
    }
  };

  const canUse = loggedIn;
  const listCountText = useMemo(() => (loggedIn ? `${list.length}개` : "0개"), [loggedIn, list.length]);

  // ===== 스타일 (glass / iOS-ish) =====
  const wrapStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: isPhone ? 14 : isTablet ? 18 : 24,
    background:
      "radial-gradient(1200px 800px at 20% 20%, rgba(56,189,248,.22), transparent 60%)," +
      "radial-gradient(1000px 700px at 80% 20%, rgba(167,139,250,.18), transparent 55%)," +
      "radial-gradient(1200px 800px at 60% 90%, rgba(34,197,94,.12), transparent 55%)," +
      "linear-gradient(180deg, #f6f8ff 0%, #f4f7ff 40%, #f8fbff 100%)",
  };


  const cardStyle: React.CSSProperties = {
    width: isPhone ? "100%" : "min(920px, 96vw)",
    borderRadius: isPhone ? 22 : 30,
    padding: isPhone ? "22px 18px" : isTablet ? "30px 26px" : "40px 44px",
    background: "rgba(255,255,255,.58)",
    border: "1px solid rgba(255,255,255,.65)",
    boxShadow: "0 40px 120px rgba(15,23,42,.18)",
    backdropFilter: "blur(22px)",
    position: "relative",
    overflow: "hidden",
  };


  const cardGlowTop: React.CSSProperties = {
    position: "absolute",
    inset: "-40% -20% auto -20%",
    height: 260,
    background:
      "radial-gradient(closest-side, rgba(59,130,246,.22), transparent 60%)," +
      "radial-gradient(closest-side, rgba(167,139,250,.18), transparent 60%)",
    filter: "blur(4px)",
    pointerEvents: "none",
  };

  const cardGlowBottom: React.CSSProperties = {
    position: "absolute",
    inset: "auto -30% -50% -30%",
    height: 360,
    background:
      "radial-gradient(closest-side, rgba(34,197,94,.12), transparent 60%)," +
      "radial-gradient(closest-side, rgba(56,189,248,.16), transparent 60%)",
    filter: "blur(6px)",
    pointerEvents: "none",
  };

  const titleStyle: React.CSSProperties = {
    margin: isPhone ? "12px 0 6px" : "18px 0 8px",
    fontSize: isPhone ? 30 : isTablet ? 38 : 46,
    letterSpacing: -1.2,
    fontWeight: 1000,
    color: "rgba(15,23,42,.92)",
    lineHeight: 1.1,
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: 18,
    padding: isPhone ? 12 : 16,
    background: "rgba(255,255,255,.70)",
    border: "1px solid rgba(255,255,255,.70)",
    boxShadow: "0 14px 42px rgba(15,23,42,.10)",
    backdropFilter: "blur(10px)",
  };


  const btnStyle = (primary?: boolean): React.CSSProperties => ({
    height: isPhone ? 46 : 50,
    padding: isPhone ? "0 14px" : "0 18px",
    borderRadius: isPhone ? 12 : 14,
    border: primary ? "1px solid rgba(37,99,235,.34)" : "1px solid rgba(148,163,184,.32)",
    background: primary
      ? "linear-gradient(180deg, rgba(59,130,246,.98), rgba(37,99,235,.98))"
      : "rgba(255,255,255,.72)",
    color: primary ? "white" : "rgba(15,23,42,.92)",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: primary ? "0 14px 34px rgba(37,99,235,.26)" : "0 10px 26px rgba(15,23,42,.08)",
    transition: "transform .12s ease, box-shadow .12s ease",
    whiteSpace: "nowrap",
    fontSize: isPhone ? 14 : 15,
  });

  const miniBtnStyle: React.CSSProperties = {
    ...btnStyle(false),
    height: isPhone ? 38 : 42,
    padding: isPhone ? "0 12px" : "0 14px",
    borderRadius: 999,
    fontWeight: 900,
  };


  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderRadius: 999,
    background: "rgba(37,99,235,.10)",
    border: "1px solid rgba(37,99,235,.16)",
    fontWeight: 1000,
    color: "rgba(37,99,235,.92)",
    fontSize: 12,
  };

  // ====== UI ======
  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={cardGlowTop} />
        <div style={cardGlowBottom} />

        {/* 헤더 */}
        <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: isPhone ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isPhone ? "flex-start" : "end",
              gap: isPhone ? 10 : 12,
            }}
          >
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={chipStyle}>Planner</span>
              <span style={{ color: "rgba(15,23,42,.40)", fontWeight: 800, fontSize: 12 }}>운영 / 일정 / 할 일</span>
            </div>

            <h1 style={titleStyle}>내 Planner 선택</h1>
            <p style={{ margin: "12px 0", color: "rgba(15,23,42,.52)", fontWeight: 800 }}>
              Planner를 만들고 선택하면, 효율적으로 일정 관리를 할 수 있습니다
            </p>
          </div>

          <button
            onClick={() => {
              if (!loggedIn) setLoginModal(true);
              else load();
            }}
            title="새로고침"
            style={{
              ...miniBtnStyle,
              padding: "0 10px",
              minWidth: 40,
              color: "rgba(15,23,42,.35)",
              background: "transparent",
              border: "1px solid rgba(148,163,184,.18)",
              boxShadow: "none",
              fontSize: 14,
              alignSelf: isPhone ? "flex-end" : undefined,
            }}
          >
            ↻
          </button>
        </div>

        {/* 에러 */}
        {err && (
          <div
            style={{
              position: "relative",
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              background: "rgba(239,68,68,.10)",
              border: "1px solid rgba(239,68,68,.18)",
              color: "rgba(239,68,68,.95)",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        )}

        {/* 우측 상단 로그인 상태 */}
        {loggedIn && (
          <div
            style={{
              position: isPhone ? "relative" : "absolute",
              top: isPhone ? undefined : 25,
              right: isPhone ? undefined : 30,
              marginTop: isPhone ? 10 : 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              textAlign: "right",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 14, color: "rgba(15,23,42,.70)" }}>
              <span style={{ fontWeight: 1100, color: "rgba(15,23,42,.92)" }}>{userName || "사용자"}</span>
              님 환영합니다
            </div>

            <button
              onClick={logout}
              style={{
                border: "1px solid rgba(239,68,68,.35)",
                background: "rgba(239,68,68,.08)",
                color: "rgba(239,68,68,.9)",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        )}

        {/* ✅ 로그인 안내 (로그인 안했을 때만) */}
        {!loggedIn && (
          <div style={{ ...sectionStyle, marginTop: 14, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 1100, marginBottom: 4 }}>로그인이 필요해요</div>
                <div style={{ color: "rgba(15,23,42,.60)", fontWeight: 800, fontSize: 13 }}>
                  로그인 후 Planner를 생성/선택할 수 있습니다.
                </div>
              </div>
              <button style={btnStyle(true)} onClick={() => setLoginModal(true)}>
                로그인
              </button>
            </div>
          </div>
        )}

        {editOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
            onMouseDown={() => setEditOpen(false)}
          >
            <div
              style={{
                width: "min(520px, 94vw)",
                borderRadius: 22,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(255,255,255,0.62)",
                boxShadow: "0 40px 110px rgba(0,0,0,.22)",
                backdropFilter: "blur(22px)",
                padding: 18,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 1100, fontSize: 16 }}>수정</div>
                <button style={{ ...btnStyle(false), height: 38, borderRadius: 999 }} onClick={() => setEditOpen(false)}>
                  닫기
                </button>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Planner 새 이름"
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,.35)",
                    padding: "0 14px",
                    outline: "none",
                    background: "rgba(255,255,255,.82)",
                    fontWeight: 800,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditOpen(false);
                  }}
                  autoFocus
                />
                <button style={btnStyle(true)} onClick={saveEdit} disabled={!editValue.trim()}>
                  저장
                </button>
              </div>
            </div>
          </div>
        )}


        {/* 새 Manage 만들기 */}
        <div style={{ ...sectionStyle, marginTop: 14, position: "relative", opacity: canUse ? 1 : 0.55 }}>
          <div style={{ fontWeight: 1100, marginBottom: 10 }}>나만의 Planner 만들기</div>
          <div
            style={{
              display: "flex",
              flexDirection: isPhone ? "column" : "row",
              alignItems: "stretch",
              gap: isPhone ? 10 : 0,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(148,163,184,.35)",
              background: "rgba(255,255,255,.86)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex) AI ⋅ BigData 아카데미 운영"
              disabled={!canUse}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate();
              }}
              style={{
                flex: 1,
                height: 52,
                padding: "0 16px",
                border: "none",
                outline: "none",
                background: "transparent",
                fontWeight: 800,
              }}
            />

            <button
              onClick={onCreate}
              disabled={!canUse || !name.trim()}
              style={{
                height: 52,
                padding: "0 22px",
                border: "none",
                background: "linear-gradient(180deg, #3b82f6, #2563eb)",
                color: "white",
                fontWeight: 1000,
                cursor: canUse ? "pointer" : "not-allowed",
                boxShadow: "inset 1px 0 0 rgba(255,255,255,.25)",
                whiteSpace: "nowrap",
                width: isPhone ? "100%" : 88,
              }}
            >
              생성
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div style={{ ...sectionStyle, marginTop: 14, position: "relative", opacity: canUse ? 1 : 0.55 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 1100 }}>내 Planner 한눈에 보기</div>
            <div style={{ color: "rgba(15,23,42,.45)", fontWeight: 1000, fontSize: 12 }}>{listCountText}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {!loggedIn ? (
              <div style={{ color: "rgba(15,23,42,.60)", fontWeight: 800 }}>로그인하면 Planner 목록이 보여요.</div>
            ) : loading ? (
              <div style={{ color: "rgba(15,23,42,.60)", fontWeight: 800 }}>불러오는 중...</div>
            ) : list.length === 0 ? (
              <div style={{ color: "rgba(15,23,42,.60)", fontWeight: 800 }}>
                아직 생성된 Planner가 없습니다. 상단에서 생성할 수 있어요.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(148,163,184,.18)",
                      background: "rgba(255,255,255,.70)",
                      boxShadow: "0 14px 40px rgba(15,23,42,.10)",
                      backdropFilter: "blur(14px)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 14,
                    }}
                  >
                    {/* ✅ 카드 클릭 = 선택 */}
                    <button
                      onClick={() => onSelect(m)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 1100,
                          fontSize: 15,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "rgba(15,23,42,.92)",
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(15,23,42,.45)", marginTop: 4, fontWeight: 800 }}>
                        {m.id}
                      </div>
                    </button>

                    {/* ✅ 액션 아이콘만 (박스/구분선 X) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* ✏️ 수정 */}
                      <button
                        title="수정"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(m);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 4,
                          cursor: "pointer",
                          fontSize: 18,
                          outline: "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(37,99,235,.95)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,23,42,.55)")}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.9)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        onFocus={(e) => (e.currentTarget.style.outline = "none")}
                      >
                        ✎
                      </button>

                      {/* 🗑 삭제 */}
                      <button
                        title="삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePlanner(m);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 4,
                          cursor: "pointer",
                          fontSize: 18,
                          outline: "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(239,68,68,.95)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(239,68,68,.55)")}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.9)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        onFocus={(e) => (e.currentTarget.style.outline = "none")}
                      >
                        🗑
                      </button>
                    </div>

                  </div>
                ))}


              </div>
            )}
          </div>
        </div>
      </div>

      {/* 로그인 모달 */}
      {loginModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onMouseDown={() => setLoginModal(false)}
        >
          <div
            style={{
              width: "min(520px, 94vw)",
              borderRadius: 22,
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.62)",
              boxShadow: "0 40px 110px rgba(0,0,0,.22)",
              backdropFilter: "blur(22px)",
              padding: 18,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 1100, fontSize: 16 }}>로그인이 필요해요</div>
              <button style={{ ...btnStyle(false), height: 38, borderRadius: 999 }} onClick={() => setLoginModal(false)}>
                닫기
              </button>
            </div>

            <div style={{ marginTop: 10, color: "rgba(15,23,42,.62)", fontWeight: 800 }}>
              Google 로그인 후 Planner를 생성/선택할 수 있습니다.
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button style={btnStyle(true)} onClick={login}>
                Google로 로그인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
