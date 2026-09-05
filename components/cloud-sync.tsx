"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const TASK_KEY = "worklog.tasks.v2";
const REPORT_KEY = "worklog.overallReport.v1";
const MIGRATED_KEY = "worklog.cloudMigrated.v1";

type LocalTask = {
  id: string;
  date: string;
  description: string;
  assignedTo: string;
  driveLink?: string;
  remark?: string;
};

type Props = { children: React.ReactNode };

function safeTasks(): LocalTask[] {
  try {
    const value = localStorage.getItem(TASK_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizedTasks(tasks: LocalTask[]) {
  return [...tasks]
    .map((task) => ({
      id: task.id,
      date: task.date,
      description: task.description,
      assignedTo: task.assignedTo || "Designer",
      driveLink: task.driveLink || "",
      remark: task.remark,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function authRedirectUrl() {
  return typeof window !== "undefined" ? window.location.origin : undefined;
}

export default function CloudSync({ children }: Props) {
  const supabase = getSupabaseClient();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const lastUploaded = useRef("");
  const syncing = useRef(false);
  const hydrated = useRef(false);
  const activeUserId = useRef<string | null>(null);

  const loadCloud = useCallback(async () => {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (activeUserId.current !== user.id) {
      activeUserId.current = user.id;
      hydrated.current = false;
      lastUploaded.current = "";
    }

    const { data: rows, error } = await supabase
      .from("tasks")
      .select("id, work_date, description, assigned_to, drive_link, created_at")
      .eq("user_id", user.id)
      .order("work_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const cloudTasks: LocalTask[] = (rows ?? []).map((row) => ({
      id: row.id,
      date: row.work_date,
      description: row.description,
      assignedTo: row.assigned_to,
      driveLink: row.drive_link || undefined,
    }));

    const localTasks = safeTasks();

    // Always merge the first cloud load with the local cache. The previous
    // implementation only restored cloud tasks when localStorage was empty,
    // which meant having even one newly-created local task could hide all of
    // the user's older weeks. Cloud provides the history; local wins only for
    // matching IDs that have unsynced edits.
    if (!hydrated.current) {
      hydrated.current = true;

      const merged = new Map<string, LocalTask>();
      for (const task of cloudTasks) merged.set(task.id, task);
      for (const task of localTasks) merged.set(task.id, task);

      const mergedTasks = Array.from(merged.values()).sort(
        (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
      );
      const cloudSignature = JSON.stringify(normalizedTasks(cloudTasks));
      const localSignature = JSON.stringify(normalizedTasks(localTasks));
      const mergedSignature = JSON.stringify(normalizedTasks(mergedTasks));

      if (mergedSignature !== localSignature) {
        localStorage.setItem(TASK_KEY, JSON.stringify(mergedTasks));
        lastUploaded.current = mergedSignature;
        window.location.reload();
        return;
      }

      lastUploaded.current = cloudSignature === localSignature ? localSignature : localSignature;
      return;
    }

    const cloudSignature = JSON.stringify(normalizedTasks(cloudTasks));
    const localSignature = JSON.stringify(normalizedTasks(localTasks));

    // Routine polling must never overwrite a task that the user has just added
    // locally. It only acknowledges a successful match.
    if (cloudSignature === localSignature) {
      lastUploaded.current = localSignature;
    }
  }, [supabase]);

  const uploadLocal = useCallback(async () => {
    if (!supabase || syncing.current) return;

    syncing.current = true;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const localTasks = safeTasks();
      const signature = JSON.stringify(normalizedTasks(localTasks));

      if (signature !== lastUploaded.current) {
        const { data: cloudRows, error: cloudError } = await supabase
          .from("tasks")
          .select("id")
          .eq("user_id", user.id);

        if (cloudError) throw cloudError;

        const localIds = new Set(localTasks.map((task) => task.id));

        for (const row of cloudRows ?? []) {
          if (!localIds.has(row.id)) {
            const { error } = await supabase
              .from("tasks")
              .delete()
              .eq("user_id", user.id)
              .eq("id", row.id);
            if (error) throw error;
          }
        }

        if (localTasks.length) {
          const rows = localTasks.map((task) => ({
            id: task.id,
            user_id: user.id,
            work_date: task.date,
            description: task.description,
            assigned_to: task.assignedTo || "Designer",
            drive_link: task.driveLink || null,
          }));

          const { error } = await supabase
            .from("tasks")
            .upsert(rows, { onConflict: "id" });

          if (error) throw error;
        }

        const latestSignature = JSON.stringify(normalizedTasks(safeTasks()));
        if (latestSignature === signature) {
          lastUploaded.current = signature;
        }
      }

      const report = localStorage.getItem(REPORT_KEY) ?? "";
      if (report.trim() && localTasks.length) {
        const dates = localTasks.map((task) => task.date).sort();
        const { error } = await supabase.from("work_reports").upsert(
          {
            user_id: user.id,
            period_start: dates[0],
            period_end: dates[dates.length - 1],
            content: report,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,period_start,period_end" },
        );

        if (error) throw error;
      }
    } catch (error) {
      console.error("Worklog cloud sync failed", error);
    } finally {
      syncing.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUserEmail(session?.user?.email ?? "");
      setReady(true);

      if (session?.user) {
        try {
          const migratedKey = `${MIGRATED_KEY}:${session.user.id}`;

          if (!localStorage.getItem(migratedKey)) {
            const localTasks = safeTasks();

            if (localTasks.length) {
              const rows = localTasks.map((task) => ({
                id: task.id,
                user_id: session.user.id,
                work_date: task.date,
                description: task.description,
                assigned_to: task.assignedTo || "Designer",
                drive_link: task.driveLink || null,
              }));

              const { error } = await supabase
                .from("tasks")
                .upsert(rows, { onConflict: "id" });

              if (error) throw error;
            }

            localStorage.setItem(migratedKey, "1");
          }

          await loadCloud();
        } catch (error) {
          console.error(error);
          setMessage("Cloud sync is not ready yet. Check your Supabase setup.");
        }
      }
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? "");
      if (session?.user) void loadCloud();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadCloud, supabase]);

  useEffect(() => {
    if (!supabase || !userEmail) return;

    const localTimer = window.setInterval(() => void uploadLocal(), 1200);
    const cloudTimer = window.setInterval(() => void loadCloud(), 8000);

    return () => {
      window.clearInterval(localTimer);
      window.clearInterval(cloudTimer);
    };
  }, [loadCloud, supabase, uploadLocal, userEmail]);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    if (!email.trim() || password.length < 6) {
      setMessage("Enter an email and a password of at least 6 characters.");
      return;
    }

    setBusy(true);
    setMessage("");

    const options = { emailRedirectTo: authRedirectUrl() };
    const result =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm the account, then sign in.");
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!ready) {
    return (
      <div className="cloud-gate loading">
        <div className="cloud-card">
          <div className="cloud-logo">W</div>
          <strong>Loading Worklog…</strong>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="cloud-gate">
        <div className="cloud-card">
          <div className="cloud-logo">W</div>
          <span className="cloud-kicker">CLOUD SYNC</span>
          <h1>Connect your Worklog</h1>
          <p>Supabase configuration is missing.</p>
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="cloud-gate">
        <form className="cloud-card auth-card" onSubmit={submitAuth}>
          <div className="cloud-logo">W</div>
          <span className="cloud-kicker">WORKLOG CLOUD</span>
          <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p>
            {authMode === "login"
              ? "Sign in to access your tasks from any device."
              : "Create one account and use the same worklog everywhere."}
          </p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={authMode === "login" ? "current-password" : "new-password"} />
          </label>
          {message && <div className="cloud-message">{message}</div>}
          <button className="cloud-submit" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
          <button type="button" className="cloud-switch" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setMessage(""); }}>
            {authMode === "login" ? "Create a new account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {children}
      <div className="cloud-account">
        <span className="cloud-status" />
        <span>{userEmail}</span>
        <button onClick={signOut}>Sign out</button>
      </div>
    </>
  );
}
