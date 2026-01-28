import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { deleteManage } from "../../lib/manage2/deleteManage";

type ManageRow = { id: string; name: string };

export default function ManagePicker() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const [manages, setManages] = useState<ManageRow[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErr("로그인이 필요합니다.");
      return;
    }

    const q = query(collection(db, "users", uid, "manages"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setManages(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return { id: d.id, name: String(data?.name ?? "Manage") };
          })
        );
      },
      (e) => setErr(e.message)
    );
  }, []);

  const createManage = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return setErr("로그인이 필요합니다.");
    const nm = name.trim();
    if (!nm) return;

    setErr("");
    const ref = await addDoc(collection(db, "users", uid, "manages"), {
      name: nm,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setName("");
    nav(`/m2/${ref.id}/dashboard`, { replace: true });
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Manage 선택</h1>
      <p style={{ color: "#666", marginTop: 6 }}>Manage를 만들거나 선택하세요.</p>

      {err && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff3f3", border: "1px solid #ffd0d0" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 Manage 이름 (예: 포빅아 32기)"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          onKeyDown={(e) => e.key === "Enter" && createManage()}
        />
        <button onClick={createManage} disabled={!name.trim()} style={{ padding: "10px 14px", borderRadius: 10 }}>
          추가
        </button>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {manages.map((m) => (
          <div key={m.id} style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => nav(`/m2/${m.id}/dashboard`, { replace: true })}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: "1px solid #eee",
                background: "#fff",
                textAlign: "left",
                fontWeight: 900,
              }}
            >
              {m.name}
            </button>
            <button
              onClick={async () => {
                const ok = window.confirm(`"${m.name}"을(를) 삭제할까요?\n(섹션/할 일도 함께 삭제됩니다)`);
                if (!ok) return;
                await deleteManage(m.id);
              }}
              style={{ padding: "10px 14px", borderRadius: 12 }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
