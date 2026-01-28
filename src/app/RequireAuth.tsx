import { useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";

function LoginModal({ onLogin }: { onLogin: () => void }) {
  const [signingIn, setSigningIn] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid var(--border)",
          padding: 18,
        }}
      >
        <h2 style={{ margin: 0 }}>로그인</h2>
        <p style={{ marginTop: 8, color: "var(--muted)" }}>
          Google 계정으로 로그인해주시길 바랍니다.
        </p>

        <button
          className="btn"
          style={{ width: "100%", marginTop: 10, height: 42, borderRadius: 12 }}
          disabled={signingIn}
          onClick={async () => {
            if (signingIn) return;
            setSigningIn(true);
            try {
              onLogin();
            } finally {
              setSigningIn(false);
            }
          }}
        >
          {signingIn ? "로그인 중..." : "Google로 로그인"}
        </button>
      </div>
    </div>
  );
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ✅ 새로고침에도 세션 유지 강제
        await setPersistence(auth, browserLocalPersistence);

        // ✅ Redirect 로그인 결과 처리(있으면 user 세팅에 도움)
        try {
          await getRedirectResult(auth);
        } catch {
          // redirect 결과가 없거나 실패해도 계속 진행
        }

        const unsub = onAuthStateChanged(auth, (u) => {
          if (!mounted) return;
          setUser(u);
          setReady(true);
        });

        return () => unsub();
      } catch {
        // persistence 설정 실패해도 auth는 동작하니 계속 진행
        const unsub = onAuthStateChanged(auth, (u) => {
          if (!mounted) return;
          setUser(u);
          setReady(true);
        });
        return () => unsub();
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ ready 전에는 화면 전체를 막아서 깜빡임 제거
  if (!ready) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.7)",
          zIndex: 9999,
        }}
      >
        <div className="card" style={{ padding: 16 }}>
          로딩 중…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginModal
        onLogin={() => {
          const provider = new GoogleAuthProvider();
          signInWithRedirect(auth, provider);
        }}
      />
    );
  }

  return <>{children}</>;
}
