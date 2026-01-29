// src/pages/manage2/Dashboard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./Dashboard.css";
import "./Dashboard.css";

import { auth, db } from "../../firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { useManage2 } from "../../store/manage2Store";
import PageHeader from "../../components/manage/PageHeader";


type Task = {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string; // "YYYY-MM-DD"
  createdAt?: any;
};

type Memo = {
  id: string;
  text: string;
  createdAt?: any;
};

type QuickMode = "today" | "week";

const toISO = (d: Date) => d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0=일
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfWeekSun = (d: Date) => {
  const s = startOfWeekMon(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};

export default function Dashboard() {
  const { manageId } = useManage2();

  const [uid, setUid] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);

  // today/week panel
  const [quickMode, setQuickMode] = useState<QuickMode>("today");
  const [panelOpen, setPanelOpen] = useState(false);

  // memo input
  const [memoText, setMemoText] = useState("");

  // search input
  const [queryText, setQueryText] = useState("");
  const [searchKey, setSearchKey] = useState(""); // 검색 실행 시 고정

  const searchResultRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    setErr("");

    if (!uid) {
      setTasks([]);
      setMemos([]);
      setErr("로그인이 필요합니다.");
      return;
    }
    if (!manageId) {
      setTasks([]);
      setMemos([]);
      setErr("Planner(Manage)를 먼저 선택/생성해주세요.");
      return;
    }

    const tasksQ = query(
      collection(db, "users", uid, "manages", manageId, "tasks"),
      orderBy("createdAt", "desc")
    );
    const memosQ = query(
      collection(db, "users", uid, "manages", manageId, "memos"),
      orderBy("createdAt", "desc")
    );

    const unsubTasks = onSnapshot(
      tasksQ,
      (snap) => {
        const rows: Task[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title ?? "",
            done: !!data.done,
            dueDate: data.dueDate ?? "",
            createdAt: data.createdAt,
          };
        });
        setTasks(rows);
      },
      (e) => setErr(e.message)
    );

    const unsubMemos = onSnapshot(
      memosQ,
      (snap) => {
        const rows: Memo[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            text: data.text ?? "",
            createdAt: data.createdAt,
          };
        });
        setMemos(rows);
      },
      (e) => setErr(e.message)
    );

    return () => {
      unsubTasks();
      unsubMemos();
    };
  }, [uid, manageId]);

  const todayISO = useMemo(() => toISO(new Date()), []);
  const weekStartISO = useMemo(() => toISO(startOfWeekMon(new Date())), []);
  const weekEndISO = useMemo(() => toISO(endOfWeekSun(new Date())), []);

  // KPI
  const total = tasks.length;
  const doneCnt = tasks.reduce((a, t) => a + (t.done ? 1 : 0), 0);
  const undoneCnt = total - doneCnt;

  const todayDueCnt = tasks.filter((t) => (t.dueDate ?? "") === todayISO && !t.done).length;
  const weekDueCnt = tasks.filter((t) => {
    const dd = t.dueDate ?? "";
    return dd >= weekStartISO && dd <= weekEndISO && !t.done;
  }).length;

  // today/week panel list
  const quickTasks = useMemo(() => {
    if (!panelOpen) return [];
    if (quickMode === "today") {
      return tasks.filter((t) => (t.dueDate ?? "") === todayISO && !t.done);
    }
    return tasks.filter((t) => {
      const dd = t.dueDate ?? "";
      return dd >= weekStartISO && dd <= weekEndISO && !t.done;
    });
  }, [tasks, panelOpen, quickMode, todayISO, weekStartISO, weekEndISO]);

  // search parse
  const searchDate = useMemo(() => {
    const s = searchKey.trim();
    return isISODate(s) ? s : "";
  }, [searchKey]);

  const searchKeyword = useMemo(() => {
    const s = searchKey.trim().toLowerCase();
    return isISODate(s) ? "" : s;
  }, [searchKey]);

  // search results
  const searchTasksByKeyword = useMemo(() => {
    if (!searchKeyword) return [];
    return tasks.filter((t) => (t.title ?? "").toLowerCase().includes(searchKeyword));
  }, [tasks, searchKeyword]);

  const searchTasksByDate = useMemo(() => {
    if (!searchDate) return [];
    return tasks.filter((t) => (t.dueDate ?? "") === searchDate);
  }, [tasks, searchDate]);

  const searchMemos = useMemo(() => {
    if (!searchKeyword) return [];
    return memos.filter((m) => (m.text ?? "").toLowerCase().includes(searchKeyword));
  }, [memos, searchKeyword]);

  // actions
  const toggleDone = async (taskId: string, nextDone: boolean) => {
    if (!uid || !manageId) return;
    await updateDoc(doc(db, "users", uid, "manages", manageId, "tasks", taskId), {
      done: nextDone,
      updatedAt: serverTimestamp(),
    });
  };

  const addMemo = async () => {
    const text = memoText.trim();
    if (!text) return;
    if (!uid || !manageId) return;

    await addDoc(collection(db, "users", uid, "manages", manageId, "memos"), {
      text,
      createdAt: serverTimestamp(),
    });
    setMemoText("");
  };

  const deleteMemo = async (memoId: string) => {
    if (!uid || !manageId) return;
    await deleteDoc(doc(db, "users", uid, "manages", manageId, "memos", memoId));
  };

  // today/week open/close
  const openQuick = (mode: QuickMode) => {
    setQuickMode(mode);
    setPanelOpen(true);
  };
  const closePanel = () => setPanelOpen(false);

  // ✅ search run (스크롤 이동 제거)
  const runSearch = (key?: string) => {
    const next = (key ?? queryText).trim();
    setSearchKey(next);
    // ❌ scrollIntoView 제거: 검색해도 화면 안 내려감
  };

  const clearSearch = () => {
    setQueryText("");
    setSearchKey("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const pillForTask = (dueDate: string) => {
    if (dueDate && dueDate < todayISO) return { cls: "qPill qPill--danger", text: "지남" };
    if (dueDate === todayISO) return { cls: "qPill qPill--info", text: "오늘" };
    return { cls: "qPill", text: dueDate ? "예정" : "-" };
  };

  const searchTotalCnt = searchTasksByKeyword.length + searchTasksByDate.length;

  return (
    <div className="dashPage">
      <div className="dashWrap">
        <PageHeader
          chip="Dashboard"
          caption="일상 / 업무 공용 플래너"
          title="대시보드"
          sub={`${manageId ? `Planner · ${todayISO}` : "Planner 없음"} · 완료율 ${
            total ? Math.round((doneCnt / total) * 100) : 0
          }%`}
          error={err}
        />
        
        {/* Search */}
        <section className="searchCenter">
          <div className="searchGlass">
            <div className="searchField">
              <span className="searchIcon">⌕</span>
              <input
                ref={searchInputRef}
                className="searchInput"
                placeholder="키워드 또는 날짜(YYYY-MM-DD)로 검색"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
              />
            </div>

            <button type="button" className="pill pill--on" onClick={() => runSearch()}>
              검색
            </button>

            {searchKey && (
              <button type="button" className="pill pill--ghost" onClick={clearSearch}>
                지우기
              </button>
            )}
          </div>

          {/* ✅ 검색 결과 */}
          {searchKey && (
            <div ref={searchResultRef} className="searchResultWrap">
              <section className="searchResultCard">
                <div className="searchResultHead">
                  <div className="searchResultTitle">
                    검색 결과
                    <span className="searchResultChip">
                      키워드 {searchKeyword ? `"${searchKeyword}"` : "-"} · 날짜 {searchDate || "-"}
                    </span>
                  </div>

                  <button type="button" className="panelCloseBtn" onClick={clearSearch}>
                    닫기 ✕
                  </button>
                </div>

                <div className="searchResultBody">
                  {/* 키워드 결과 */}
                  {searchKeyword && (
                    <>
                      <div className="searchSectionTitle">
                        키워드로 찾은 할 일 · {searchTasksByKeyword.length}개
                      </div>

                      <div className="qList">
                        {searchTasksByKeyword.length === 0 ? (
                          <div className="qEmpty">키워드에 해당하는 할 일이 없어요.</div>
                        ) : (
                          searchTasksByKeyword.map((t) => {
                            const dd = t.dueDate ?? "";
                            const pill = pillForTask(dd);

                            return (
                              <div className="qItem" key={t.id}>
                                <button
                                  type="button"
                                  className={`checkBtn ${t.done ? "isDone" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDone(t.id, !t.done);
                                  }}
                                  aria-label={t.done ? "완료 해제" : "완료 처리"}
                                >
                                  <span className="checkIcon">{t.done ? "✓" : ""}</span>
                                </button>

                                <div className="qItemMain">
                                  <div className="qItemTitle">{t.title}</div>
                                  <div className="qItemSub">{dd || "-"}</div>
                                </div>

                                <span className={pill.cls}>{pill.text}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}

                  {/* 날짜 결과 */}
                  {searchDate && (
                    <>
                      <div className="searchSectionTitle" style={{ marginTop: 10 }}>
                        날짜로 찾은 할 일 · {searchTasksByDate.length}개
                      </div>

                      <div className="qList">
                        {searchTasksByDate.length === 0 ? (
                          <div className="qEmpty">해당 날짜에 마감인 할 일이 없어요.</div>
                        ) : (
                          searchTasksByDate.map((t) => {
                            const dd = t.dueDate ?? "";
                            const pill = pillForTask(dd);

                            return (
                              <div className="qItem" key={t.id}>
                                <button
                                  type="button"
                                  className={`checkBtn ${t.done ? "isDone" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDone(t.id, !t.done);
                                  }}
                                  aria-label={t.done ? "완료 해제" : "완료 처리"}
                                >
                                  <span className="checkIcon">{t.done ? "✓" : ""}</span>
                                </button>

                                <div className="qItemMain">
                                  <div className="qItemTitle">{t.title}</div>
                                  <div className="qItemSub">{dd || "-"}</div>
                                </div>

                                <span className={pill.cls}>{pill.text}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}

                  {/* 메모(키워드일 때만) */}
                  {searchKeyword && (
                    <>
                      <div className="searchSectionTitle" style={{ marginTop: 10 }}>
                        관련 메모 · {searchMemos.length}개
                      </div>

                      <div className="qList">
                        {searchMemos.length === 0 ? (
                          <div className="qEmpty">키워드를 포함한 메모가 없어요.</div>
                        ) : (
                          searchMemos.map((m) => (
                            <div className="qItem" key={m.id}>
                              <div className="qItemIcon">📝</div>
                              <div className="qItemMain">
                                <div className="qItemTitle">{m.text}</div>
                                <div className="qItemSub">메모</div>
                              </div>
                              <button
                                type="button"
                                className="panelCloseBtn"
                                onClick={() => deleteMemo(m.id)}
                              >
                                삭제
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* 아무 조건도 인식 못 했을 때 */}
                  {!searchKeyword && !searchDate && (
                    <div className="qEmpty">
                      입력값을 인식 못 했어요. 키워드 또는 날짜(YYYY-MM-DD) 형식으로 검색해줘!
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </section>

        {/* Quick 3 */}
        <section className="quickRow">
          <button
            type="button"
            className={`quickCard ${panelOpen && quickMode === "today" ? "quickCard--active" : ""}`}
            onClick={() => openQuick("today")}
          >
            <div className="quickIcon">🗓️</div>
            <div>
              <div className="quickTitle">오늘 할일 보기</div>
              <div className="quickSub">오늘 마감인 미완료만</div>
            </div>
            <div className="quickMeta">{todayDueCnt}개</div>
          </button>

          <button
            type="button"
            className={`quickCard ${panelOpen && quickMode === "week" ? "quickCard--active" : ""}`}
            onClick={() => openQuick("week")}
          >
            <div className="quickIcon">📌</div>
            <div>
              <div className="quickTitle">이번주 할일 정리</div>
              <div className="quickSub">
                {weekStartISO} ~ {weekEndISO}
              </div>
            </div>
            <div className="quickMeta">{weekDueCnt}개</div>
          </button>

          <button
            type="button"
            className={`quickCard ${searchKey ? "quickCard--active" : ""}`}
            onClick={() => {
              // 검색어 없으면 입력창으로 유도
              if (!queryText.trim() && !searchKey.trim()) {
                searchInputRef.current?.focus();
                return;
              }
              // 입력이 있으면 실행, 없으면 마지막 검색 결과로 이동만(원본 유지)
              if (queryText.trim()) runSearch();
              else searchResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <div className="quickIcon">🔎</div>
            <div>
              <div className="quickTitle">검색 결과 보기</div>
              <div className="quickSub">{searchKey ? `최근 검색: "${searchKey}"` : "검색창에서 실행"}</div>
            </div>
            <div className="quickMeta">{searchKey ? searchTotalCnt : 0}개</div>
          </button>
        </section>

        {/* today/week panel */}
        <div className="quickPanelWrap">
          <section className={`quickPanel ${panelOpen ? "isOpen" : ""}`}>
            <div className="quickPanelHead">
              <div className="quickPanelTitle">
                {quickMode === "today" ? "오늘 할 일" : "이번주 할 일"}
                <span className="quickPanelBadge">할일 {quickTasks.length}</span>
              </div>
              <button type="button" className="panelCloseBtn" onClick={closePanel}>
                닫기 ✕
              </button>
            </div>

            <div className="quickPanelBody">
              <div className="qList">
                {quickTasks.length === 0 ? (
                  <div className="qEmpty">조건에 맞는 할 일이 없어요.</div>
                ) : (
                  quickTasks.map((t) => {
                    const dd = t.dueDate ?? "";
                    const pill = pillForTask(dd);

                    return (
                      <div className="qItem" key={t.id}>
                        <button
                          type="button"
                          className={`checkBtn ${t.done ? "isDone" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDone(t.id, !t.done);
                          }}
                          aria-label={t.done ? "완료 해제" : "완료 처리"}
                        >
                          <span className="checkIcon">{t.done ? "✓" : ""}</span>
                        </button>

                        <div className="qItemMain">
                          <div className="qItemTitle">{t.title}</div>
                          <div className="qItemSub">{dd || "-"}</div>
                        </div>

                        <span className={pill.cls}>{pill.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        {/* KPI 4 + Memo */}
        <section className="kpiMemoRow">
          <div className="kpiGrid4">
            <div className="kpiCard">
              <div className="kpiTop">
                <div className="kpiTitle">전체</div>
                <div className="kpiDot" style={{ background: "rgba(148,163,184,.85)" }} />
              </div>
              <div className="kpiValue">{total}개</div>
            </div>

            <div className="kpiCard">
              <div className="kpiTop">
                <div className="kpiTitle">완료</div>
                <div className="kpiDot" style={{ background: "rgba(34,197,94,.9)" }} />
              </div>
              <div className="kpiValue">{doneCnt}개</div>
            </div>

            <div className="kpiCard">
              <div className="kpiTop">
                <div className="kpiTitle">미완료</div>
                <div className="kpiDot" style={{ background: "rgba(245,158,11,.9)" }} />
              </div>
              <div className="kpiValue">{undoneCnt}개</div>
            </div>

            <div className="kpiCard">
              <div className="kpiTop">
                <div className="kpiTitle">오늘 마감</div>
                <div className="kpiDot" style={{ background: "rgba(239,68,68,.9)" }} />
              </div>
              <div className="kpiValue">{todayDueCnt}개</div>
            </div>
          </div>

          <section className="memoSide">
            <div className="memoFloatHead">
              <div className="memoFloatTitle">메모 / 한줄 목표</div>
              <div className="memoFloatCount">{memos.length}개</div>
            </div>

            <div className="memoFloatInput">
              <input
                className="memoInput"
                placeholder="예) 오늘은 집중해서 기획 정리하기"
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMemo()}
              />
              <button type="button" className="memoAddBtn" onClick={addMemo}>
                추가
              </button>
            </div>

            <div className="stickyWall--memoSide">
              {memos.length === 0 ? (
                <div className="memoEmpty">아직 메모가 없어요.</div>
              ) : (
                memos.map((m, idx) => {
                  const v = (idx % 3) + 1;
                  return (
                    <div className={`sticky sticky--v${v}`} key={m.id}>
                      <div className="stickyText">{m.text}</div>
                      <div className="stickyActions">
                        <button type="button" className="iconOnly" onClick={() => deleteMemo(m.id)} title="삭제">
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </section>

        <div className="dashBottomSpace" />
      </div>
    </div>
  );
}
