/**
 * HUD Panel — Mission Control style floating panel
 * Design: Semi-transparent dark panel with cyan border glow, corner brackets
 */

import { type ReactNode } from "react";

interface HudPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function HudPanel({ children, className = "", title }: HudPanelProps) {
  return (
    <div
      className={`hud-panel glow-cyan px-3 py-2 ${className}`}
    >
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-glow opacity-80" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-glow opacity-80" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-glow opacity-80" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-glow opacity-80" />

      {title && (
        <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-glow/70 mb-1 font-medium">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

interface DataReadoutProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: "cyan" | "amber" | "green" | "default";
}

export function DataReadout({ label, value, unit, color = "default" }: DataReadoutProps) {
  const colorClasses = {
    cyan: "text-cyan-glow",
    amber: "text-amber-score",
    green: "text-green-400",
    default: "text-foreground",
  };

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`data-readout text-sm font-semibold ${colorClasses[color]}`}>
        {value}
      </span>
      {unit && (
        <span className="text-[9px] text-muted-foreground/60">{unit}</span>
      )}
    </div>
  );
}
