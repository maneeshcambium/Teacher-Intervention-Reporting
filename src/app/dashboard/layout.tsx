"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/dashboard" },
  { label: "Standards Analysis", href: "/dashboard/standards" },
  { label: "Assignments", href: "/dashboard/impact" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="border-b bg-white">
        <nav className="flex gap-0 px-6" aria-label="Dashboard tabs">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[#00A79D]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#00A79D] rounded-t" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
