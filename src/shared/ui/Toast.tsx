import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { toastSlide } from '../../lib/animations';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  };

  const bgColors = {
    success: 'bg-green-950/90 border-green-800',
    error: 'bg-red-950/90 border-red-800',
    info: 'bg-blue-950/90 border-blue-800',
    warning: 'bg-yellow-950/90 border-yellow-800',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            variants={toastSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-xl max-w-sm
              ${bgColors[toast.type]}
            `}
          >
            {icons[toast.type]}
            <span className="flex-1 text-sm text-gray-100">
              {toast.message}
            </span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
