// src/pages/manage2/Manage2Tasks.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { useManage2 } from "../../store/manage2Store";
import SectionColorPicker from "../../components/SectionColorPicker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  limit,
} from "firebase/firestore";
import "./Tasks.css";
import PageHeader from "../../components/manage/PageHeader";

/** ✅ 섹션에 color 추가 */
type Section = { id: string; name: string; order: number; color?: string };

type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  sectionId?: string;
  createdAt?: any;
  dueDate?: string | null;
};

const todayStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD

/** ✅ 예쁜 고정 팔레트 + 기본 색 */
const SECTION_COLORS = [
  "#2563EB",
  "#22C55E",
  "#A855F7",
  "#F97316",
  "#EF4444",
  "#14B8A6",
  "#EAB308",
  "#0EA5E9",
  "#F43F5E",
  "#64748B",
];
const DEFAULT_SECTION_COLOR = SECTION_COLORS[0];

// ---------------- iOS glass UI (lighter + more spacing) ----------------
const ui = {
  appBg: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 560px at 16% 6%, rgba(99,102,241,.14), transparent 62%)," +
      "radial-gradient(980px 560px at 78% 10%, rgba(56,189,248,.12), transparent 58%)," +
      "radial-gradient(980px 660px at 50% 96%, rgba(34,197,94,.08), transparent 60%)," +
      "linear-gradient(180deg, #f7f9ff 0%, #eef3ff 40%, #f8fafc 100%)",
  },

  page: {
    width: "100%",
    maxWidth: 1160,
    margin: "0 auto",
    padding: "22px 22px 56px",
    boxSizing: "border-box" as const,
  },

  progressWrap: {
    padding: "0 6px", // ✅ 메인 카드보다 살짝 안쪽
  },

  headerBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  headerChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(59,130,246,.22)",
    background: "rgba(59,130,246,.14)",
    color: "rgba(37,99,235,.95)",
    fontWeight: 950,
    fontSize: 14,
    lineHeight: 1,
  },

  headerCaption: {
    color: "rgba(11,18,32,.55)",
    fontWeight: 750,
    fontSize: 14,
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
  },

  title: {
    margin: 0,
    fontSize: 36,
    letterSpacing: -0.8,
    fontWeight: 950,
    color: "#0b1220",
  },

  sub: {
    margin: "8px 0 0",
    color: "rgba(11,18,32,.55)",
    fontWeight: 650,
    fontSize: 14,
  },

  btnGhost: (disabled = false) => ({
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.60)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    fontWeight: 900 as const,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    boxShadow: "0 10px 30px rgba(15,23,42,.08)",
  }),

  btnPrimary: (disabled = false) => ({
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(37,99,235,.18)",
    background: "rgba(37,99,235,.88)",
    color: "#fff",
    fontWeight: 950 as const,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    boxShadow: "0 14px 30px rgba(37,99,235,.18)",
  }),

  btnDanger: () => ({
    padding: "7px 10px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,.20)",
    background: "rgba(239,68,68,.10)",
    color: "rgba(185,28,28,.95)",
    fontWeight: 900 as const,
    fontSize: 13,
    cursor: "pointer",
  }),

  smallBtn: (variant: "ghost" | "danger" = "ghost") => {
    const base = {
      padding: "7px 10px",
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,.10)",
      background: "rgba(255,255,255,.55)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      fontWeight: 900 as const,
      fontSize: 13,
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    };
    if (variant === "danger")
      return {
        ...base,
        border: "1px solid rgba(239,68,68,.20)",
        background: "rgba(239,68,68,.10)",
        color: "#b91c1c",
      };
    return { ...base, color: "#0b1220" };
  },

  pagerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  pageInfo: { color: "rgba(11,18,32,.55)", fontWeight: 750, fontSize: 13 },
  pagerBtns: { display: "flex", gap: 10 },

  panelsGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
    alignItems: "start",
  },
  panelsGrid2: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
    alignItems: "start",
  },
  panelsGrid1: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 18,
    alignItems: "start",
  },

  panel: {
    background: "rgba(255,255,255,.46)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(15,23,42,.10)",
    borderRadius: 22,
    boxShadow: "0 26px 80px rgba(15,23,42,.14)",
    padding: 16,
    minHeight: 500,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },

  panelTop: { display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 12 },

  panelTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },

  panelTitle: { fontWeight: 950, fontSize: 16, color: "#0b1220" },

  statsRow: { display: "flex", gap: 8, flexWrap: "wrap" as const },
  chip: (tone: "neutral" | "good" | "bad" = "neutral") => {
    const base = {
      fontSize: 12,
      fontWeight: 900,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,.10)",
      background: "rgba(255,255,255,.45)",
      color: "rgba(11,18,32,.68)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
    } as const;
    if (tone === "good") return { ...base, border: "1px solid rgba(34,197,94,.18)", color: "rgba(21,128,61,.95)" };
    if (tone === "bad") return { ...base, border: "1px solid rgba(239,68,68,.18)", color: "rgba(185,28,28,.95)" };
    return base;
  },

  inputRow: { display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 14 },

  input: {
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,.10)",
    outline: "none",
    background: "rgba(255,255,255,.58)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  },

  list: {
    display: "grid",
    gap: 12,
    overflow: "auto" as const,
    paddingRight: 2,
    flex: 1,
    minHeight: 0,
  },

  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: "44px 14px",
    borderRadius: 20,
    border: "1px dashed rgba(15,23,42,.18)",
    background: "rgba(255,255,255,.35)",
    color: "rgba(11,18,32,.55)",
    fontWeight: 850,
  },

  taskCard: {
    background: "rgba(255,255,255,.52)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(15,23,42,.10)",
    borderRadius: 20,
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    boxShadow: "0 16px 40px rgba(15,23,42,.10)",
  },

  titleText: { fontWeight: 950, fontSize: 14.5, color: "#0b1220", wordBreak: "break-word" as const },

  badgeDate: {
    marginTop: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.40)",
    fontWeight: 900,
    color: "rgba(11,18,32,.65)",
    fontSize: 12,
    cursor: "pointer",
  },

  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    background: "rgba(254,242,242,.92)",
    border: "1px solid rgba(239,68,68,.22)",
    color: "#991b1b",
    fontWeight: 800,
  },

  // modal
  sectionModalBackdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(2,6,23,0.50)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 14,
  },
  modal: {
    width: "min(560px, 100%)",
    background: "rgba(255,255,255,.78)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderRadius: 20,
    border: "1px solid rgba(15,23,42,.10)",
    padding: 16,
    boxShadow: "0 30px 80px rgba(2,6,23,.30)",
  },

  /** ✅ 섹션 색 점 */
  colorDot: (color: string, active = false) => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: color,
    border: "2px solid rgba(255,255,255,.9)",
    boxShadow: active ? `0 0 0 4px ${color}33, 0 0 18px ${color}AA` : "0 6px 16px rgba(15,23,42,.15)",
    cursor: "pointer",
    transition: "all .18s ease",
  }),

  /** ✅ 색 피커 팝오버 */
  colorPopover: {
    position: "absolute" as const,
    zIndex: 30,
    top: "calc(100% + 8px)",
    left: 0,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,.10)",
    background: "rgba(255,255,255,.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 24px 70px rgba(15,23,42,.18)",
  },
};

export default function Manage2Tasks() {
  const { manageId } = useManage2();
  const nav = useNavigate();

  const [sections, setSections] = useState<Section[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [err, setErr] = useState("");

  // 3개 단위 “섹션+내용” 페이징
  const PAGE_SIZE = 3;
  const [page, setPage] = useState(0);

  // per-section draft
  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});
  const [draftDue, setDraftDue] = useState<Record<string, string>>({});

  // section modal
  const [sectionModal, setSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  /** ✅ 현재 색 바꾸는 섹션 id */
  const [colorOpenSectionId, setColorOpenSectionId] = useState<string | null>(null);
  const colorPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!manageId) nav("/", { replace: true });
  }, [manageId, nav]);

  /** ✅ 바깥 클릭하면 색 선택 팝오버 닫기 */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!colorOpenSectionId) return;
      const el = colorPopoverRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setColorOpenSectionId(null);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [colorOpenSectionId]);

  // sections subscribe + ensure default
  useEffect(() => {
    setErr("");
    if (!manageId) return;

    const u = auth.currentUser?.uid;
    if (!u) {
      setErr("로그인이 필요합니다.");
      return;
    }

    const secQ = query(collection(db, "users", u, "manages", manageId, "sections"), orderBy("order", "asc"));

    const unsub = onSnapshot(
      secQ,
      async (snap) => {
        const list: Section[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: String(data?.name ?? "섹션"),
            order: Number(data?.order ?? 0),
            color: data?.color ? String(data.color) : undefined,
          };
        });

        if (list.length === 0) {
          try {
            await addDoc(collection(db, "users", u, "manages", manageId, "sections"), {
              name: "할 일",
              order: 1,
              color: DEFAULT_SECTION_COLOR,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (e: any) {
            setErr(e?.message ?? "기본 섹션 생성 실패");
          }
          return;
        }

        setSections(list);

        // page clamp
        const maxPage = Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1);
        setPage((p) => Math.min(p, maxPage));

        // draft due init
        setDraftDue((prev) => {
          const next = { ...prev };
          list.forEach((s) => {
            if (!next[s.id]) next[s.id] = todayStr;
          });
          return next;
        });
      },
      (e) => setErr(e.message)
    );

    return () => unsub();
  }, [manageId]);

  // tasks subscribe
  useEffect(() => {
    setErr("");
    if (!manageId) return;

    const u = auth.currentUser?.uid;
    if (!u) {
      setErr("로그인이 필요합니다.");
      return;
    }

    const tasksCol = collection(db, "users", u, "manages", manageId, "tasks");
    const qTasks = query(tasksCol, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      qTasks,
      (snap) => {
        const rows: TaskRow[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: String(data?.title ?? ""),
            done: Boolean(data?.done),
            sectionId: data?.sectionId,
            dueDate: data?.dueDate ?? null,
            createdAt: data?.createdAt,
          };
        });
        setTasks(rows);
      },
      (e) => setErr(e.message)
    );

    return () => unsub();
  }, [manageId]);

  // migrate missing sectionId -> first
  useEffect(() => {
    const migrate = async () => {
      if (!manageId || sections.length === 0) return;
      const u = auth.currentUser?.uid;
      if (!u) return;

      const first = sections[0];
      const tasksCol = collection(db, "users", u, "manages", manageId, "tasks");
      const qMissing = query(tasksCol, where("sectionId", "==", null as any), limit(50));

      try {
        const snap = await getDocs(qMissing);
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { sectionId: first.id, updatedAt: serverTimestamp() }));
        await batch.commit();
      } catch {
        // pass
      }
    };
    migrate();
  }, [manageId, sections]);

  const totalPages = Math.max(1, Math.ceil(sections.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const visibleSections = useMemo(() => sections.slice(pageStart, pageStart + PAGE_SIZE), [sections, pageStart]);

  const overallTotal = tasks.length;
  const overallDone = tasks.reduce((a, t) => a + (t.done ? 1 : 0), 0);
  const overallPct = overallTotal === 0 ? 0 : Math.round((overallDone / overallTotal) * 100);

  const sectionStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number; todo: number }>();
    sections.forEach((s) => {
      const list = tasks.filter((t) => t.sectionId === s.id);
      const total = list.length;
      const done = list.reduce((a, t) => a + (t.done ? 1 : 0), 0);
      map.set(s.id, { total, done, todo: total - done });
    });
    return map;
  }, [sections, tasks]);

  const addTaskToSection = async (sectionId: string) => {
    const trimmed = (draftTitle[sectionId] ?? "").trim();
    if (!trimmed) return;

    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      const due = draftDue[sectionId] || todayStr;

      await addDoc(collection(db, "users", u, "manages", manageId, "tasks"), {
        title: trimmed,
        done: false,
        sectionId,
        dueDate: due || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setDraftTitle((prev) => ({ ...prev, [sectionId]: "" }));
      setDraftDue((prev) => ({ ...prev, [sectionId]: todayStr }));
    } catch (e: any) {
      setErr(e?.message ?? "추가 실패");
    }
  };

  const toggleDone = async (t: TaskRow) => {
    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      await updateDoc(doc(db, "users", u, "manages", manageId, "tasks", t.id), {
        done: !t.done,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message ?? "변경 실패");
    }
  };

  const removeTask = async (id: string) => {
    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      await deleteDoc(doc(db, "users", u, "manages", manageId, "tasks", id));
    } catch (e: any) {
      setErr(e?.message ?? "삭제 실패");
    }
  };

  const renameTask = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      await updateDoc(doc(db, "users", u, "manages", manageId, "tasks", id), {
        title: trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message ?? "수정 실패");
    }
  };

  const updateTaskDueDate = async (id: string, dueDate: string | null) => {
    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      await updateDoc(doc(db, "users", u, "manages", manageId, "tasks", id), {
        dueDate: dueDate || null,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message ?? "날짜 수정 실패");
    }
  };

  /** ✅ 섹션 색 변경 저장 */
  const updateSectionColor = async (sectionId: string, color: string) => {
    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      await updateDoc(doc(db, "users", u, "manages", manageId, "sections", sectionId), {
        color,
        updatedAt: serverTimestamp(),
      });

      setColorOpenSectionId(null);
    } catch (e: any) {
      setErr(e?.message ?? "색 변경 실패");
    }
  };

  // modal actions
  const addSection = async () => {
    const nm = newSectionName.trim();
    if (!nm) return;

    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      const nextOrder = sections.length ? Math.max(...sections.map((s) => s.order)) + 1 : 1;
      await addDoc(collection(db, "users", u, "manages", manageId, "sections"), {
        name: nm,
        order: nextOrder,
        color: DEFAULT_SECTION_COLOR,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewSectionName("");
      const nextTotalPages = Math.ceil((sections.length + 1) / PAGE_SIZE);
      setPage(Math.max(0, nextTotalPages - 1));
    } catch (e: any) {
      setErr(e?.message ?? "섹션 추가 실패");
    }
  };

  const moveSection = async (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      const a = sections[idx];
      const b = sections[targetIdx];

      const batch = writeBatch(db);
      batch.update(doc(db, "users", u, "manages", manageId, "sections", a.id), { order: b.order, updatedAt: serverTimestamp() });
      batch.update(doc(db, "users", u, "manages", manageId, "sections", b.id), { order: a.order, updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (e: any) {
      setErr(e?.message ?? "섹션 순서 변경 실패");
    }
  };

  const renameSection = async (id: string, name: string) => {
    const nm = name.trim();
    if (!nm) return;

    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      await updateDoc(doc(db, "users", u, "manages", manageId, "sections", id), {
        name: nm,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      setErr(e?.message ?? "섹션 수정 실패");
    }
  };

  const deleteSection = async (id: string) => {
    if (sections.length <= 1) {
      setErr("섹션은 최소 1개는 필요합니다.");
      return;
    }

    setErr("");
    try {
      const u = auth.currentUser?.uid;
      if (!u || !manageId) return;

      const fallback = sections.find((s) => s.id !== id)!;

      const tasksCol = collection(db, "users", u, "manages", manageId, "tasks");
      const qMove = query(tasksCol, where("sectionId", "==", id));
      const snap = await getDocs(qMove);

      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { sectionId: fallback.id, updatedAt: serverTimestamp() }));
      batch.delete(doc(db, "users", u, "manages", manageId, "sections", id));
      await batch.commit();
    } catch (e: any) {
      setErr(e?.message ?? "섹션 삭제 실패");
    }
  };

  if (!manageId) return <p style={{ padding: 16 }}>Manage를 먼저 선택하세요.</p>;

  const gridStyle =
    typeof window !== "undefined" && window.innerWidth < 860 ? ui.panelsGrid1 : window.innerWidth < 1140 ? ui.panelsGrid2 : ui.panelsGrid;

  return (
    <div style={ui.appBg}>
      <div style={ui.page} className="tasksPage">
        {/* ✅ Dashboard와 동일한 헤더 포맷 */}
        <div style={ui.topBar} className="pageTop">
          <PageHeader
            chip="Tasks"
            caption="일상 / 업무 공용 플래너"
            title="할 일"
            sub={`Planner · ${todayStr} · 완료율 ${overallPct}% · 페이지 ${page + 1}/${totalPages}`}
          >
            <div style={{ ...ui.pageInfo, marginBottom: 10 }}>
              섹션+내용이 최대 {PAGE_SIZE}개씩 보여요.
            </div>

            <div style={ui.pagerBtns} className="tasksPagerBtns">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page <= 0}
                style={ui.btnGhost(page <= 0)}
              >
                ‹ 이전
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={ui.btnGhost(page >= totalPages - 1)}
              >
                다음 ›
              </button>
            </div>
          </PageHeader>


          <button
            onClick={() => setSectionModal(true)}
            style={ui.btnGhost(false)}
            className="pageHeaderBtn"
          >
            섹션 관리
          </button>
        </div>


        {err && <div style={ui.error}>{err}</div>}

        <div style={gridStyle} className="tasksGrid">
          {visibleSections.map((s) => {
            const stats = sectionStats.get(s.id) ?? { total: 0, done: 0, todo: 0 };
            const sectionTasks = tasks.filter((t) => t.sectionId === s.id);
            const color = s.color ?? DEFAULT_SECTION_COLOR;

            const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

            return (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={ui.panel} className="tasksPanel">
                  <div style={ui.panelTop}>
                    <div style={ui.panelTitleRow}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" as const }}>
                        <div
                          style={ui.colorDot(color, colorOpenSectionId === s.id)}
                          title="섹션 색 변경"
                          onClick={() => setColorOpenSectionId((prev) => (prev === s.id ? null : s.id))}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${color}22, 0 0 20px ${color}99`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              colorOpenSectionId === s.id
                                ? `0 0 0 4px ${color}33, 0 0 18px ${color}AA`
                                : "0 6px 16px rgba(15,23,42,.15)";
                          }}
                        />
                        <div style={ui.panelTitle}>{s.name}</div>

                        {colorOpenSectionId === s.id && (
                          <div
                            ref={colorPopoverRef}
                            style={ui.colorPopover}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 8, color: "rgba(11,18,32,.75)" }}>색 선택</div>
                            <SectionColorPicker value={color} onChange={(c) => updateSectionColor(s.id, c)} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={ui.statsRow}>
                      <span style={ui.chip("neutral")}>전체 {stats.total}</span>
                      <span style={ui.chip("good")}>완료 {stats.done}</span>
                      <span style={ui.chip("bad")}>미완료 {stats.todo}</span>
                    </div>

                    <div style={ui.inputRow} className="tasksInputRow">
                      <input
                        value={draftTitle[s.id] ?? ""}
                        onChange={(e) => setDraftTitle((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addTaskToSection(s.id)}
                        placeholder="할 일을 입력하고 Enter"
                        style={{ ...ui.input, flex: 1, minWidth: 200 }}
                      />

                      <input
                        type="date"
                        value={draftDue[s.id] ?? todayStr}
                        onChange={(e) => setDraftDue((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        style={{ ...ui.input, width: 170 }}
                      />

                      <button
                        onClick={() => addTaskToSection(s.id)}
                        disabled={!((draftTitle[s.id] ?? "").trim())}
                        style={ui.btnPrimary(!((draftTitle[s.id] ?? "").trim()))}
                        className="tasksAddBtn"
                      >
                        추가
                      </button>
                    </div>
                  </div>

                  <div style={ui.list}>
                    {sectionTasks.length === 0 ? (
                      <div style={ui.empty}>아직 할 일이 없어요 🙂</div>
                    ) : (
                      sectionTasks.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          onToggle={() => toggleDone(t)}
                          onDelete={() => removeTask(t.id)}
                          onRename={(newTitle) => renameTask(t.id, newTitle)}
                          onChangeDueDate={(newDue) => updateTaskDueDate(t.id, newDue)}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div style={ui.progressWrap}>
                  {/* ✅ total prop 누락 보완 */}
                  <SectionProgress pct={pct} color={color} total={stats.total} />
                </div>
              </div>
            );
          })}
        </div>

        {sectionModal && (
          <div style={ui.sectionModalBackdrop} onMouseDown={() => setSectionModal(false)}>
            <div style={ui.modal} className="sectionModal" onMouseDown={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 950, fontSize: 16, color: "#0b1220" }}>섹션 관리</div>
                <button onClick={() => setSectionModal(false)} style={ui.btnGhost(false)}>
                  닫기
                </button>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="새 섹션 이름 (예: 할일, 오늘, 내일...)"
                  style={{ ...ui.input, flex: 1, minWidth: 220 }}
                  onKeyDown={(e) => e.key === "Enter" && addSection()}
                />
                <button onClick={addSection} disabled={!newSectionName.trim()} style={ui.btnPrimary(!newSectionName.trim())}>
                  추가
                </button>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {sections.map((s) => (
                  <SectionRow
                    key={s.id}
                    section={s}
                    isFirst={sections[0].id === s.id}
                    isLast={sections[sections.length - 1].id === s.id}
                    onMoveUp={() => moveSection(s.id, -1)}
                    onMoveDown={() => moveSection(s.id, 1)}
                    onRename={(nm) => renameSection(s.id, nm)}
                    onDelete={() => deleteSection(s.id)}
                  />
                ))}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "rgba(11,18,32,.55)", fontWeight: 750 }}>
                섹션 색은 각 섹션 패널 제목 옆 동그라미를 눌러 변경하세요.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onRename,
  onChangeDueDate,
}: {
  task: TaskRow;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (t: string) => void;
  onChangeDueDate: (due: string | null) => void;
}) {
  const [editTitle, setEditTitle] = useState(false);
  const [val, setVal] = useState(task.title);

  const [editDate, setEditDate] = useState(false);
  const [dateVal, setDateVal] = useState(task.dueDate ?? "");

  useEffect(() => setVal(task.title), [task.title]);
  useEffect(() => setDateVal(task.dueDate ?? ""), [task.dueDate]);

  return (
    <div style={ui.taskCard} className="taskCard">
      <input type="checkbox" checked={task.done} onChange={onToggle} style={{ marginTop: 4 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editTitle ? (
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(val);
                setEditTitle(false);
              }
              if (e.key === "Escape") {
                setVal(task.title);
                setEditTitle(false);
              }
            }}
            style={{
              width: "100%",
              padding: 11,
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,.10)",
              background: "rgba(255,255,255,.65)",
              outline: "none",
            }}
            autoFocus
          />
        ) : (
          <div style={{ ...ui.titleText, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</div>
        )}

        {editDate ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,.10)",
                background: "rgba(255,255,255,.70)",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                onChangeDueDate(dateVal || null);
                setEditDate(false);
              }}
              style={ui.btnPrimary(false)}
            >
              저장
            </button>
            <button
              onClick={() => {
                setDateVal(task.dueDate ?? "");
                setEditDate(false);
              }}
              style={ui.btnGhost(false)}
            >
              취소
            </button>
            <button
              onClick={() => {
                setDateVal("");
                onChangeDueDate(null);
                setEditDate(false);
              }}
              style={ui.btnDanger()}
            >
              날짜삭제
            </button>
          </div>
        ) : (
          <div style={ui.badgeDate} className="taskDueBadge" onClick={() => setEditDate(true)} title="클릭해서 날짜 수정">
            <span>📅</span>
            {task.dueDate ? task.dueDate : "날짜 없음"}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>✎</span>
          </div>
        )}
      </div>

      {editTitle ? (
        <div style={{ display: "flex", gap: 8 }} className="taskActions">
          <button
            onClick={() => {
              onRename(val);
              setEditTitle(false);
            }}
            style={ui.btnPrimary(false)}
          >
            저장
          </button>
          <button
            onClick={() => {
              setVal(task.title);
              setEditTitle(false);
            }}
            style={ui.btnGhost(false)}
          >
            취소
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }} className="taskActions">
          <button onClick={() => setEditTitle(true)} style={ui.smallBtn("ghost")}>
            수정
          </button>
          <button onClick={onDelete} style={ui.smallBtn("danger")}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function SectionRow({
  section,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
}: {
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (nm: string) => void;
  onDelete: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(section.name);

  useEffect(() => setVal(section.name), [section.name]);

  return (
    <div
      style={{
        border: "1px solid rgba(15,23,42,.10)",
        borderRadius: 18,
        padding: 12,
        background: "rgba(255,255,255,.70)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          {edit ? (
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(val);
                  setEdit(false);
                }
                if (e.key === "Escape") {
                  setVal(section.name);
                  setEdit(false);
                }
              }}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,.10)",
                background: "rgba(255,255,255,.80)",
                outline: "none",
              }}
              autoFocus
            />
          ) : (
            <div style={{ fontWeight: 950, color: "#0b1220" }}>{section.name}</div>
          )}
        </div>

        <button onClick={onMoveUp} disabled={isFirst} style={ui.btnGhost(isFirst)}>
          ↑
        </button>
        <button onClick={onMoveDown} disabled={isLast} style={ui.btnGhost(isLast)}>
          ↓
        </button>

        {edit ? (
          <>
            <button
              onClick={() => {
                onRename(val);
                setEdit(false);
              }}
              style={ui.btnPrimary(false)}
            >
              저장
            </button>
            <button
              onClick={() => {
                setVal(section.name);
                setEdit(false);
              }}
              style={ui.btnGhost(false)}
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEdit(true)} style={ui.btnGhost(false)}>
              이름변경
            </button>
            <button onClick={onDelete} style={ui.btnDanger()}>
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SectionProgress({ pct, color, total }: { pct: number; color: string; total: number }) {
  const empty = total === 0;

  const mood = empty
    ? { emoji: "📭", face: "😴", text: "아직 할 일이 없어요" }
    : pct === 0
    ? { emoji: "🌱", face: "🙂", text: "시작해볼까요?" }
    : pct < 50
    ? { emoji: "🔥", face: "😤", text: "점점 올라가고 있어요" }
    : pct < 100
    ? { emoji: "✨", face: "😄", text: "거의 다 왔어요!" }
    : { emoji: "🎉", face: "🥳", text: "완벽하게 끝!" };

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: "rgba(255,255,255,.55)",
        border: "1px solid rgba(15,23,42,.10)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 14px 40px rgba(15,23,42,.10)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: empty ? 0 : 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: empty ? "#f1f5f9" : `${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, lineHeight: 1, letterSpacing: -0.5 }}>
            <span style={{ fontSize: 16 }}>{mood.emoji}</span>
            <span style={{ fontSize: 18 }}>{mood.face}</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>{mood.text}</div>
          {!empty && <div style={{ fontSize: 12, color: "rgba(11,18,32,.55)" }}>진행률 {pct}%</div>}
        </div>
      </div>

      {!empty && (
        <div style={{ height: 10, borderRadius: 999, background: "rgba(15,23,42,.08)", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 999,
              background: color,
              transition: "width 700ms cubic-bezier(.2,.9,.2,1)",
              boxShadow: `0 10px 26px ${color}33`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 45%, rgba(255,255,255,0) 80%)",
                transform: "translateX(-60%)",
                animation: "shine 2.2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-60%); }
          55% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}