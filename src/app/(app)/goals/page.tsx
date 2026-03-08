"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export const dynamic = "force-dynamic";

// ── Types ──────────────────────────────────────────────────────────────────
type Timeframe = "all" | "daily" | "weekly" | "monthly" | "yearly";

interface Goal {
  id: string;
  title: string;
  description?: string;
  section: string;
  timeframe: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

const SECTIONS = [
  { key: "career", label: "Career & Income", icon: "💼" },
  { key: "financial", label: "Financial", icon: "💰" },
  { key: "health", label: "Health & Fitness", icon: "🏋️" },
  { key: "mental", label: "Mental & Emotional", icon: "🧠" },
  { key: "relationships", label: "Relationships", icon: "🤝" },
  { key: "learning", label: "Learning & Growth", icon: "📚" },
  { key: "wellness", label: "Wellness & Recovery", icon: "🧘" },
  { key: "home", label: "Home & Living", icon: "🏠" },
  { key: "travel", label: "Travel & Adventure", icon: "✈️" },
  { key: "creative", label: "Creative Projects", icon: "🎨" },
  { key: "legal", label: "Legal & Admin", icon: "⚖️" },
  { key: "style", label: "Style & Identity", icon: "✨" },
  { key: "legacy", label: "Legacy & Impact", icon: "🌟" },
];

const PAGE_SIZE = 5;

// ── Main Component ─────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-section pagination
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});

  // Add goal form
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (timeframe !== "all") params.set("timeframe", timeframe);
      const res = await fetch(`/api/goals?${params}`);
      if (!res.ok) throw new Error("Failed to load goals");
      const data = await res.json();
      setGoals(data.goals ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Reset per-section pages on timeframe change
  useEffect(() => { setSectionPages({}); }, [timeframe]);

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  // ── Helpers ────────────────────────────────────────────────────────────
  function goalsForSection(sectionKey: string) {
    return goals.filter((g) => g.section === sectionKey);
  }

  function pagedGoals(sectionKey: string) {
    const all = goalsForSection(sectionKey);
    const page = sectionPages[sectionKey] ?? 1;
    return {
      items: all.slice(0, page * PAGE_SIZE),
      hasMore: page * PAGE_SIZE < all.length,
      total: all.length,
    };
  }

  function loadMore(sectionKey: string) {
    setSectionPages((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] ?? 1) + 1,
    }));
  }

  // ── Actions ────────────────────────────────────────────────────────────
  async function toggleCompleted(goal: Goal) {
    const optimistic = goals.map((g) =>
      g.id === goal.id
        ? { ...g, completed: !g.completed, completed_at: !g.completed ? new Date().toISOString() : undefined }
        : g
    );
    setGoals(optimistic);

    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !goal.completed }),
    });
    if (!res.ok) {
      // Revert on failure
      setGoals(goals);
    }
  }

  async function saveEdit(goal: Goal) {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === goal.title) {
      setEditingId(null);
      return;
    }
    const optimistic = goals.map((g) =>
      g.id === goal.id ? { ...g, title: trimmed } : g
    );
    setGoals(optimistic);
    setEditingId(null);

    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) setGoals(goals);
  }

  async function deleteGoal(id: string) {
    setGoals(goals.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  async function addGoal(sectionKey: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSaving(true);
    const tf = timeframe === "all" ? "weekly" : timeframe;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed, description: newDesc.trim(), section: sectionKey, timeframe: tf }),
    });
    if (res.ok) {
      const { goal } = await res.json();
      setGoals([goal, ...goals]);
    }
    setNewTitle("");
    setNewDesc("");
    setAddingTo(null);
    setSaving(false);
  }

  // ── Derived stats ──────────────────────────────────────────────────────
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const completionPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold gradient-text mb-1"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          Goals + Vision
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Long-term vision, quarterly goals, milestones, and progress tracking.
        </p>

        {/* Stats bar */}
        {!loading && (
          <div className="flex items-center gap-4 mt-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)" }}
            >
              <span style={{ color: "var(--text-muted)" }}>Progress</span>
              <span className="font-semibold" style={{ color: "var(--accent-cyan)" }}>
                {completedGoals}/{totalGoals}
              </span>
              <div
                className="w-24 h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPct}%`,
                    background: "var(--accent-gradient)",
                  }}
                />
              </div>
              <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                {completionPct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Timeframe filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TIMEFRAMES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTimeframe(key)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
            style={{
              background:
                timeframe === key
                  ? "linear-gradient(135deg,#00d4ff,#1e90ff)"
                  : "rgba(255,255,255,0.05)",
              color: timeframe === key ? "#050505" : "var(--text-secondary)",
              border:
                timeframe === key
                  ? "1px solid transparent"
                  : "1px solid rgba(0,212,255,0.15)",
              fontWeight: timeframe === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}
        >
          {error}
          <button onClick={fetchGoals} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 w-32 rounded mb-4" style={{ background: "rgba(255,255,255,0.08)" }} />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-3 w-full rounded mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {!loading && (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const { items, hasMore, total } = pagedGoals(section.key);
            const sectionCompleted = goalsForSection(section.key).filter((g) => g.completed).length;

            return (
              <div
                key={section.key}
                className="glass-card overflow-hidden"
              >
                {/* Section header */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 18 }}>{section.icon}</span>
                    <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      {section.label}
                    </span>
                    {total > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{
                          background: "rgba(0,212,255,0.1)",
                          color: "var(--accent-cyan)",
                        }}
                      >
                        {sectionCompleted}/{total}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAddingTo(addingTo === section.key ? null : section.key);
                      setNewTitle("");
                      setNewDesc("");
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-all duration-150"
                    style={{
                      background: addingTo === section.key ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(0,212,255,0.2)",
                      color: "var(--accent-cyan)",
                    }}
                  >
                    <span>{addingTo === section.key ? "×" : "+"}</span>
                    <span>{addingTo === section.key ? "Cancel" : "Add goal"}</span>
                  </button>
                </div>

                {/* Add goal form */}
                {addingTo === section.key && (
                  <div
                    className="px-5 py-3 flex flex-col gap-2"
                    style={{ background: "rgba(0,212,255,0.04)", borderBottom: "1px solid rgba(0,212,255,0.08)" }}
                  >
                    <input
                      autoFocus
                      placeholder="Goal title…"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addGoal(section.key);
                        if (e.key === "Escape") setAddingTo(null);
                      }}
                      className="w-full bg-transparent text-sm outline-none"
                      style={{
                        color: "var(--text-primary)",
                        borderBottom: "1px solid rgba(0,212,255,0.25)",
                        paddingBottom: 4,
                      }}
                    />
                    <input
                      placeholder="Description (optional)…"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addGoal(section.key);
                        if (e.key === "Escape") setAddingTo(null);
                      }}
                      className="w-full bg-transparent text-xs outline-none"
                      style={{
                        color: "var(--text-muted)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        paddingBottom: 4,
                      }}
                    />
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => addGoal(section.key)}
                        disabled={saving || !newTitle.trim()}
                        className="px-3 py-1 rounded text-xs font-semibold transition-all duration-150"
                        style={{
                          background: "var(--accent-gradient)",
                          color: "#050505",
                          opacity: saving || !newTitle.trim() ? 0.5 : 1,
                        }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setAddingTo(null)}
                        className="px-3 py-1 rounded text-xs"
                        style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Goal list */}
                {items.length === 0 ? (
                  <div
                    className="px-5 py-6 text-center text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No {timeframe !== "all" ? timeframe : ""} goals yet — add one above.
                  </div>
                ) : (
                  <ul>
                    {items.map((goal, idx) => (
                      <GoalRow
                        key={goal.id}
                        goal={goal}
                        isLast={idx === items.length - 1 && !hasMore}
                        editingId={editingId}
                        editTitle={editTitle}
                        editRef={editRef}
                        onStartEdit={() => { setEditingId(goal.id); setEditTitle(goal.title); }}
                        onEditChange={setEditTitle}
                        onSaveEdit={() => saveEdit(goal)}
                        onCancelEdit={() => setEditingId(null)}
                        onToggle={() => toggleCompleted(goal)}
                        onDelete={() => deleteGoal(goal.id)}
                      />
                    ))}
                  </ul>
                )}

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={() => loadMore(section.key)}
                    className="w-full py-2.5 text-xs transition-all duration-150"
                    style={{
                      color: "var(--text-muted)",
                      borderTop: "1px solid rgba(0,212,255,0.06)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-cyan)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    Show more ({goalsForSection(section.key).length - items.length} remaining)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Goal Row ───────────────────────────────────────────────────────────────
interface GoalRowProps {
  goal: Goal;
  isLast: boolean;
  editingId: string | null;
  editTitle: string;
  editRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function GoalRow({
  goal, isLast, editingId, editTitle, editRef,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onToggle, onDelete,
}: GoalRowProps) {
  const isEditing = editingId === goal.id;
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className="flex items-start gap-3 px-5 py-3 group transition-all duration-100"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
        background: hovered ? "rgba(0,212,255,0.03)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Completion checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 transition-all duration-150"
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: goal.completed
            ? "2px solid var(--accent-cyan)"
            : "2px solid rgba(255,255,255,0.2)",
          background: goal.completed
            ? "var(--accent-cyan)"
            : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {goal.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#050505" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title / edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editRef}
            value={editTitle}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="w-full bg-transparent text-sm outline-none"
            style={{
              color: "var(--text-primary)",
              borderBottom: "1px solid var(--accent-cyan)",
              paddingBottom: 2,
            }}
          />
        ) : (
          <span
            className="text-sm cursor-pointer block"
            style={{
              color: goal.completed ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: goal.completed ? "line-through" : "none",
              opacity: goal.completed ? 0.6 : 1,
            }}
            onDoubleClick={onStartEdit}
            title="Double-click to edit"
          >
            {goal.title}
          </span>
        )}
        {goal.description && !isEditing && (
          <span className="text-xs mt-0.5 block" style={{ color: "var(--text-muted)" }}>
            {goal.description}
          </span>
        )}
        {goal.completed && goal.completed_at && !isEditing && (
          <span className="text-xs mt-0.5 block" style={{ color: "rgba(0,212,255,0.4)" }}>
            ✓ {new Date(goal.completed_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Timeframe badge + actions */}
      <div
        className="flex items-center gap-2 flex-shrink-0 transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{
            background: "rgba(0,212,255,0.08)",
            color: "rgba(0,212,255,0.7)",
            border: "1px solid rgba(0,212,255,0.12)",
          }}
        >
          {goal.timeframe}
        </span>
        <button
          onClick={onStartEdit}
          title="Edit"
          className="p-1 rounded transition-all duration-100"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-cyan)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1 rounded transition-all duration-100"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 3h8M5 3V2h2v1M10 3l-1 8H3L2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </li>
  );
}
