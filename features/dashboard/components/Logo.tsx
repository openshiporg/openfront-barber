import React from "react";
import { cn } from "@/lib/utils";
import { Syne } from "next/font/google";

const syne = Syne({ subsets: ["latin"], display: "swap", adjustFontFallback: false });

/** Barber pole: blue stripes on a white pole between two blue caps. */
export const LogoIcon = ({ className, suffix = "" }: { className?: string; suffix?: string }) => {
  const id = `pole${suffix}`;
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("text-blue-600", className)} aria-hidden="true">
      <defs><clipPath id={id}><rect x="9" y="7" width="18" height="22" rx="2" /></clipPath></defs>
      <rect x="8" y="2" width="20" height="5" rx="2" fill="currentColor" />
      <rect x="8" y="29" width="20" height="5" rx="2" fill="currentColor" />
      <g clipPath={`url(#${id})`}>
        <rect x="9" y="7" width="18" height="22" fill="#fff" />
        <path d="M5 12 L31 2 L31 8 L5 18Z M5 24 L31 14 L31 20 L5 30Z M5 36 L31 26 L31 32 L5 42Z M5 0 L31 -10 L31 -4 L5 6Z" fill="currentColor" />
      </g>
      <rect x="9" y="7" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
};

export const Logo = ({ className, variant = "default" }: { className?: string; variant?: "default" | "sidebar" }) => {
  const sidebar = variant === "sidebar";
  return (
    <div className={cn("flex items-center text-left", sidebar ? "gap-1.5" : "gap-3", className)}>
      <LogoIcon className={sidebar ? "size-6 shrink-0" : "size-9 shrink-0"} suffix="-full" />
      <div className="flex flex-col justify-center">
        <span className={cn(syne.className, "font-semibold tracking-tight text-foreground", sidebar ? "text-[15px] leading-none" : "text-xl")}>
          open<span className="font-normal">front</span>
        </span>
        <span className="mt-0.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Barber</span>
      </div>
    </div>
  );
};
