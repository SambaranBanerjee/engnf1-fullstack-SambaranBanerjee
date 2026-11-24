import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/health`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Backend responded with HTTP ${res.status}`);
        }
        return (await res.json()) as HealthResponse;
      })
      .then((data) => {
        if (active) {
          setHealth(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to reach backend");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">TriageSync</h1>
        <p className="text-sm text-slate-400">
          Phase 1 environment &amp; connectivity check (<code className="text-slate-200">{API_BASE_URL}</code>).
        </p>

        {health && (
          <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            Backend healthy: <span className="font-mono">{health.status}</span> ({health.service})
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-300">
            Backend check: {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;