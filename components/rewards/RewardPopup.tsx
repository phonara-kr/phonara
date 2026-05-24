import { motion, AnimatePresence } from "framer-motion";
import { AnimatedReward } from "./AnimatedReward";
import { SimpleConfetti } from "./SimpleConfetti";

interface RewardPopupProps {
  isOpen: boolean;
  amount: number;
  title?: string;
  message?: string;
  onClose: () => void;
}

/**
 * 즉시 보상 지급 팝업
 * 네온 + 스프링 애니메이션 + 컨페티 포함
 * 온보딩 및 미션 완료 시 사용 예정
 */
export function RewardPopup({
  isOpen,
  amount,
  title = "보상 지급 완료!",
  message,
  onClose,
}: RewardPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          {/* Confetti */}
          <SimpleConfetti count={32} />

          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: "spring", bounce: 0.28, duration: 0.55 }}
            className="relative w-full max-w-[360px] rounded-3xl bg-zinc-900 border border-white/10 p-8 text-center overflow-hidden"
          >
            {/* 네온 글로우 효과 */}
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-cyan-500/30 via-purple-500/20 to-pink-500/30 blur-2xl" />

            <div className="relative z-10">
              <div className="mb-1 text-sm font-medium tracking-[0.5px] text-white/60">
                {title}
              </div>

              <div className="my-6">
                <AnimatedReward
                  value={amount}
                  className="text-[72px] leading-none"
                />
              </div>

              {message && (
                <p className="mb-8 text-[15px] text-white/70 leading-relaxed">
                  {message}
                </p>
              )}

              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-white py-4 text-[17px] font-semibold text-black active:scale-[0.985] transition-all active:bg-white/90"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
