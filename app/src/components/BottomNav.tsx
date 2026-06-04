"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/log", label: "Log", icon: "➕" },
  { href: "/history", label: "History", icon: "📋" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                active
                  ? "text-blue-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
