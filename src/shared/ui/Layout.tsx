import { motion } from 'framer-motion';
import { staggerContainer } from '../../lib/animations';
import { Home, TrendingUp, Wallet, Users, Trophy, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/trade', icon: TrendingUp, label: 'Trade' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/referral', icon: Users, label: 'Referral' },
    { path: '/leaderboard', icon: Trophy, label: 'Rank' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.div
      className="min-h-screen bg-gray-950 text-white"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.main
        className="pb-20 px-4 max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.main>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center w-16 h-full"
                >
                  <motion.div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-xl
                      transition-colors duration-200
                      ${
                        active
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }
                    `}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>

                  <motion.span
                    className={`
                      text-xs mt-1
                      ${active ? 'text-blue-400 font-medium' : 'text-gray-500'}
                    `}
                    animate={{
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {item.label}
                  </motion.span>

                  {active && (
                    <motion.div
                      className="absolute -top-0.5 w-12 h-0.5 bg-blue-500 rounded-full"
                      layoutId="activeTab"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </motion.div>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
