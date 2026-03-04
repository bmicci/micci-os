interface PlaceholderPageProps {
  icon: string;
  title: string;
  description: string;
  accentLabel?: string;
}

export default function PlaceholderPage({
  icon,
  title,
  description,
  accentLabel = "Coming soon",
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col min-h-full p-6 md:p-10">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: 28 }}>{icon}</span>
          <h1
            className="text-2xl md:text-3xl font-bold gradient-text"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            {title}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </header>

      {/* Skeleton card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 flex flex-col gap-3">
            <div
              className="h-2 rounded-full"
              style={{
                background: "linear-gradient(90deg,#00d4ff,#1e90ff)",
                opacity: 0.5 + i * 0.15,
                width: `${50 + i * 15}%`,
              }}
            />
            <div
              className="h-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.08)",
                width: `${70 - i * 10}%`,
              }}
            />
            <div
              className="h-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.05)",
                width: `${40 + i * 8}%`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Coming soon banner */}
      <div
        className="glass-card p-8 flex flex-col items-center justify-center text-center gap-4 flex-1"
        style={{ minHeight: 240 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-2"
            style={{
              color: "var(--accent-cyan)",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            {accentLabel}
          </p>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {title} module loading...
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            This section will be ported in a future session.
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent-cyan)",
                display: "inline-block",
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
