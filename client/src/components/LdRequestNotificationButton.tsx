import React from "react";
import { ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function LdRequestNotificationButton({ href, title, count, tone }: { href: string; title: string; count: number; tone: "admin" | "guest" }) {
  const badgeClass = tone === "admin" ? "bg-amber-500" : "bg-emerald-500";
  return <Link href={href}>
    <Button variant="ghost" size="icon" title={title} className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      <ClipboardList className="w-4 h-4" />
      {count > 0 && <span aria-label={`${count} solicitações pendentes`} className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${badgeClass} text-white text-[10px] font-bold flex items-center justify-center`}>{count > 9 ? "9+" : count}</span>}
    </Button>
  </Link>;
}
