import confetti from "canvas-confetti";

// Fires a short celebratory burst. Skipped for people who prefer reduced motion.
export function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#059669", "#10b981", "#34d399", "#0d9488", "#fbbf24"],
  });
}