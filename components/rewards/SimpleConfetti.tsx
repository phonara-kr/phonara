import { motion } from "framer-motion";

interface SimpleConfettiProps {
  count?: number;
}

/**
 * Framer Motion만으로 구현한 가벽한 컨페티 효과
 * 보상 지급 시 사용
 */
export function SimpleConfetti({ count = 28 }: SimpleConfettiProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.35;
        const duration = 1.1 + Math.random() * 0.9;
        const size = 6 + Math.random() * 5;

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `-12%`,
              width: size,
              height: size,
              backgroundColor: ["#67e8f9", "#c084fc", "#f472b6", "#fde047"][i % 4],
            }}
            animate={{
              y: ["0vh", "130vh"],
              x: [0, (Math.random() - 0.5) * 280],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
              opacity: [1, 0],
            }}
            transition={{
              duration,
              delay,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
}
