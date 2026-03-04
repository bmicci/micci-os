"use client";

// 30 particles with varied sizes, positions, durations, and drift values
const PARTICLES = [
  { id: 0, left: "3%", size: 3, duration: 18, delay: 0, drift: "15px", opacity: 0.7 },
  { id: 1, left: "8%", size: 2, duration: 22, delay: 2, drift: "-20px", opacity: 0.5 },
  { id: 2, left: "14%", size: 4, duration: 16, delay: 5, drift: "10px", opacity: 0.6 },
  { id: 3, left: "19%", size: 2, duration: 25, delay: 1, drift: "25px", opacity: 0.4 },
  { id: 4, left: "24%", size: 3, duration: 20, delay: 8, drift: "-15px", opacity: 0.7 },
  { id: 5, left: "29%", size: 2, duration: 19, delay: 3, drift: "18px", opacity: 0.5 },
  { id: 6, left: "34%", size: 5, duration: 23, delay: 6, drift: "-10px", opacity: 0.4 },
  { id: 7, left: "38%", size: 2, duration: 17, delay: 9, drift: "22px", opacity: 0.6 },
  { id: 8, left: "43%", size: 3, duration: 21, delay: 4, drift: "-25px", opacity: 0.5 },
  { id: 9, left: "48%", size: 4, duration: 26, delay: 7, drift: "12px", opacity: 0.7 },
  { id: 10, left: "53%", size: 2, duration: 15, delay: 11, drift: "-18px", opacity: 0.4 },
  { id: 11, left: "57%", size: 3, duration: 24, delay: 2, drift: "20px", opacity: 0.6 },
  { id: 12, left: "62%", size: 2, duration: 18, delay: 13, drift: "-12px", opacity: 0.5 },
  { id: 13, left: "67%", size: 4, duration: 22, delay: 5, drift: "28px", opacity: 0.7 },
  { id: 14, left: "71%", size: 2, duration: 20, delay: 0, drift: "-22px", opacity: 0.4 },
  { id: 15, left: "76%", size: 3, duration: 27, delay: 8, drift: "16px", opacity: 0.6 },
  { id: 16, left: "81%", size: 2, duration: 16, delay: 10, drift: "-8px", opacity: 0.5 },
  { id: 17, left: "85%", size: 4, duration: 23, delay: 3, drift: "24px", opacity: 0.7 },
  { id: 18, left: "90%", size: 2, duration: 19, delay: 6, drift: "-20px", opacity: 0.4 },
  { id: 19, left: "95%", size: 3, duration: 21, delay: 12, drift: "14px", opacity: 0.6 },
  { id: 20, left: "6%", size: 2, duration: 28, delay: 14, drift: "-16px", opacity: 0.5 },
  { id: 21, left: "11%", size: 3, duration: 17, delay: 1, drift: "20px", opacity: 0.7 },
  { id: 22, left: "22%", size: 2, duration: 25, delay: 9, drift: "-24px", opacity: 0.4 },
  { id: 23, left: "31%", size: 4, duration: 20, delay: 4, drift: "10px", opacity: 0.6 },
  { id: 24, left: "41%", size: 2, duration: 18, delay: 7, drift: "-14px", opacity: 0.5 },
  { id: 25, left: "51%", size: 3, duration: 22, delay: 11, drift: "18px", opacity: 0.7 },
  { id: 26, left: "61%", size: 2, duration: 24, delay: 2, drift: "-26px", opacity: 0.4 },
  { id: 27, left: "72%", size: 4, duration: 19, delay: 15, drift: "22px", opacity: 0.6 },
  { id: 28, left: "83%", size: 2, duration: 26, delay: 5, drift: "-12px", opacity: 0.5 },
  { id: 29, left: "93%", size: 3, duration: 21, delay: 10, drift: "16px", opacity: 0.7 },
];

export default function AnimatedBackground() {
  return (
    <>
      {/* Sliding grid */}
      <div className="animated-grid" />

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: 0,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            "--drift": p.drift,
            maxOpacity: p.opacity,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}
