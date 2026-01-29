// src/pages/manage2/Manage2Calendar.tsx
import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";
import { useManage2 } from "../../store/manage2Store";
import { auth, db } from "../../firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import "./Manage2Calendar.css";
import PageHeader from "../../components/manage/PageHeader";

type ValuePiece = Date | null;
type CalValue = ValuePiece | [ValuePiece, ValuePiece];
type CalView = "month" | "year" | "decade" | "century";

type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  sectionId?: string;
  dueDate?: string | null; // "YYYY-MM-DD"
  createdAt?: any;
};

type SectionRow = {
  id: string;
  name: string;
  order?: number;
  color?: string; // "#RRGGBB"
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { startYmd: ymd(start), endYmd: ymd(end) };
}

const DEFAULT_COLOR = "#64748B";

export default function Manage2Calendar() {
  const { manageId } = useManage2();
  const nav = useNavigate();

  const [err, setErr] = useState("");
  const [activeMonth, setActiveMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);

  useEffect(() => {
    if (!manageId) nav("/", { replace: true });
  }, [manageId, nav]);

  useEffect(() => {
    setErr("");
    if (!manageId) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErr("로그인이 필요합니다.");
      return;
    }

    const qSections = query(
      collection(db, "users", uid, "manages", manageId, "sections"),
      orderBy("order", "asc")
    );

    const unsub = onSnapshot(
      qSections,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: String(data?.name ?? ""),
            order: Number(data?.order ?? 0),
            color: data?.color ? String(data.color) : undefined,
          } as SectionRow;
        });
        setSections(rows);
      },
      (e) => setErr(e.message)
    );

    return () => unsub();
  }, [manageId]);

  const sectionNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sections) m.set(s.id, s.name);
    return m;
  }, [sections]);

  const sectionColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sections) m.set(s.id, s.color ?? DEFAULT_COLOR);
    return m;
  }, [sections]);

  useEffect(() => {
    setErr("");
    if (!manageId) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErr("로그인이 필요합니다.");
      return;
    }

    const { startYmd, endYmd } = monthRange(activeMonth);

    const qTasks = query(
      collection(db, "users", uid, "manages", manageId, "tasks"),
      where("dueDate", ">=", startYmd),
      where("dueDate", "<=", endYmd),
      orderBy("dueDate", "asc"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qTasks,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: String(data?.title ?? ""),
            done: Boolean(data?.done),
            sectionId: data?.sectionId,
            dueDate: data?.dueDate ?? null,
            createdAt: data?.createdAt,
          } as TaskRow;
        });
        setTasks(rows);
      },
      (e) => setErr(e.message)
    );

    return () => unsub();
  }, [manageId, activeMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  const selectedYmd = useMemo(() => ymd(selectedDate), [selectedDate]);

  const selectedTasks = useMemo(() => {
    const list = tasksByDate.get(selectedYmd) ?? [];
    return list.slice().sort((a, b) => Number(a.done) - Number(b.done));
  }, [tasksByDate, selectedYmd]);

  const doneCount = useMemo(() => selectedTasks.filter((t) => t.done).length, [selectedTasks]);

  if (!manageId) return null;

  return (
    <div className="calBg">
      <div className="calPage">
        <PageHeader
          chip="Calendar"
          caption="일상 / 업무 공용 플래너"
          title="캘린더"
          sub={`Planner · ${selectedYmd} · ${selectedTasks.length}개 · 완료 ${doneCount}개`}
          error={err}
        />

        <div className="calGrid">
          <div className="glass calCard">
            <Calendar
              locale="ko-KR"
              value={selectedDate}
              onChange={(value: any) => {
                const v: CalValue = value;
                const d = Array.isArray(v) ? v[0] : v;
                if (d) setSelectedDate(d);
              }}
              onActiveStartDateChange={(p: { activeStartDate: Date | null }) => {
                if (p.activeStartDate) setActiveMonth(p.activeStartDate);
              }}
              formatDay={(_, date) => String(date.getDate())}
              tileContent={(p: { date: Date; view: CalView }) => {
                if (p.view !== "month") return null;

                const key = ymd(p.date);
                const dayTasks = tasksByDate.get(key);
                if (!dayTasks?.length) return null;

                const colors = Array.from(
                  new Set(dayTasks.map((t) => sectionColorMap.get(t.sectionId ?? "") ?? DEFAULT_COLOR))
                );

                const top = colors.slice(0, 2);
                const rest = Math.max(0, colors.length - 2);

                return (
                  <div className="tileBars">
                    {top.map((c, idx) => (
                      <span key={idx} className="barLine" style={{ background: c }} />
                    ))}
                    {rest > 0 && <span className="barMore">+{rest}</span>}
                  </div>
                );
              }}
              tileClassName={(p: { date: Date; view: CalView }) => {
                if (p.view !== "month") return "";
                const key = ymd(p.date);
                const has = (tasksByDate.get(key)?.length ?? 0) > 0;
                const isSelected = key === selectedYmd;
                return [has ? "hasTasks" : "", isSelected ? "isSelected" : ""].join(" ");
              }}
            />
          </div>

          <div className="glass dayCard">
            <div className="dayHeader">
              <div>
                <div className="dayTitle">{selectedYmd}</div>
                <div className="dayMeta">
                  총 {selectedTasks.length} · 완료 {doneCount}
                </div>
              </div>
            </div>

            <div className="dayList">
              {selectedTasks.length === 0 ? (
                <div className="empty">이 날짜에 등록된 할 일이 없습니다.</div>
              ) : (
                selectedTasks.map((t) => {
                  const c = sectionColorMap.get(t.sectionId ?? "") ?? DEFAULT_COLOR;
                  const sectionName = t.sectionId ? sectionNameMap.get(t.sectionId) : undefined;

                  return (
                    <div key={t.id} className={`taskRow ${t.done ? "done" : ""}`}>
                      <span className="bar" style={{ background: c }} />
                      <div className="taskMain">
                        <div className="taskTitle">{t.title}</div>
                        <div className="taskMeta">
                          <span
                            className="badge"
                            style={{ borderColor: c, color: c, background: `${c}14` }}
                            title={sectionName ?? "미분류"}
                          >
                            {sectionName ?? "미분류"}
                          </span>
                          <span className="state">{t.done ? "완료" : "진행중"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hint">섹션 색은 할일(Task) 페이지에서 바꾸면 캘린더에 자동 반영됨</div>
          </div>
        </div>
      </div>
    </div>
  );
}
