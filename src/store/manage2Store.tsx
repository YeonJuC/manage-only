import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Ctx = {
  manageId: string | null;
  manageName: string | null;

  // ✅ 추가
  hydrated: boolean;

  setManage: (id: string, name: string) => void;
  clearManage: () => void;
};

const Manage2Ctx = createContext<Ctx | null>(null);

const LS_ID = "MANAGE2_ID";
const LS_NAME = "MANAGE2_NAME";

export function Manage2Provider({ children }: { children: React.ReactNode }) {
  // localStorage는 동기라서 "읽는 순간 값이 있음" (초기값 바로 세팅됨)
  const [manageId, setManageId] = useState<string | null>(() => localStorage.getItem(LS_ID));
  const [manageName, setManageName] = useState<string | null>(() => localStorage.getItem(LS_NAME));

  // ✅ hydrated: 첫 렌더 후 true로 바꿔서 RequireManage에서 잠깐 대기 가능하게
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const setManage = (id: string, name: string) => {
    localStorage.setItem(LS_ID, id);
    localStorage.setItem(LS_NAME, name);
    setManageId(id);
    setManageName(name);
  };

  const clearManage = () => {
    localStorage.removeItem(LS_ID);
    localStorage.removeItem(LS_NAME);
    setManageId(null);
    setManageName(null);
  };

  const value = useMemo(
    () => ({ manageId, manageName, hydrated, setManage, clearManage }),
    [manageId, manageName, hydrated]
  );

  return <Manage2Ctx.Provider value={value}>{children}</Manage2Ctx.Provider>;
}

export function useManage2() {
  const ctx = useContext(Manage2Ctx);
  if (!ctx) throw new Error("useManage2 must be used within Manage2Provider");
  return ctx;
}
