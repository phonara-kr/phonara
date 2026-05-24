import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface AnimatedRewardProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * 고퀄리티 보상 카운트업 애니메이션
 * 숫자가 부드럽게 올라가는 훈훌한 보상 표현
 */
export function AnimatedReward({
  value,
  duration = 1.4,
  className = "",
  prefix = "+",
  suffix = " 포인트",
}: AnimatedRewardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.floor(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.22, 1.0, 0.36, 1], // 부드러운 프리미엄 이즈
    });
    return () => controls.stop();
  }, [value, duration]);

  return (
    <div className={`flex items-baseline gap-1 font-bold tabular-nums tracking-[-0.02em] ${className}`}>
      <span className="text-emerald-400">{prefix}</span>
      <motion.span className="text-white">{rounded}</motion.span>
      <span className="text-white/50 text-[0.82em] font-medium">{suffix}</span>
    </div>
  );
}
