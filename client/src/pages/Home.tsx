/**
 * FLL 3D Simulator — All 15 Missions + Dual Sidebar Layout
 * Layout: Three rows — top bar (timer+info), middle (left hints + canvas + right scoring), bottom bar (telemetry)
 * Left panel: Mission guide/hints (static reference)
 * Right panel: Live scoring tracker
 */

import { useState, useMemo } from "react";
import { useBabylonScene } from "@/hooks/useBabylonScene";
import { ScoringEngine } from "@/lib/scoringEngine";
import { getSeasonMissions } from "@/lib/missions";
import {
  RotateCcw, Compass, Box, Anchor, Target, Play, Square, Timer, Trophy,
  CheckCircle2, Circle, PanelRightClose, PanelRightOpen,
  PanelLeftClose, PanelLeftOpen,
  ChevronDown, ChevronRight, Gauge, Info, Lightbulb, MapPin,
} from "lucide-react";

export default function Home() {
  const { canvasRef, sceneState, resetScene, startMatch, stopMatch, resetMatch } = useBabylonScene();
  const [rightOpen, setRightOpen] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(new Set());
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set(["M01"])); // First mission expanded by default
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  // Get static mission definitions for the hints panel
  const missionDefs = useMemo(() => getSeasonMissions(), []);

  const toggleMission = (id: string) => {
    setExpandedMissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleHint = (id: string) => {
    setExpandedHints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isKeyActive = (key: string) => sceneState.keysPressed.has(key);
  const { match } = sceneState;
  const formattedTime = ScoringEngine.formatTime(match.timeRemaining);
  const isRunning = match.phase === "running";
  const isEnded = match.phase === "ended";

  const timerColor = match.timeRemaining <= 10
    ? "text-red-400"
    : match.timeRemaining <= 30
      ? "text-amber-score"
      : "text-cyan-glow";

  // Color coding for mission IDs in the hint panel
  const getMissionColor = (id: string): string => {
    const matchMission = match.missions.find((m) => m.missionId === id);
    if (!matchMission) return "text-cyan-glow";
    const allComplete = matchMission.conditions.length > 0 && matchMission.conditions.every((c) => c.completed);
    const someComplete = matchMission.conditions.some((c) => c.completed);
    if (allComplete) return "text-green-400";
    if (someComplete) return "text-amber-score";
    return "text-cyan-glow";
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-background">

      {/* ===== TOP BAR: Timer + Match Controls + Info ===== */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-hud-border/40 bg-hud-bg/60">
        {/* Left: Title & Season */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="p-1 rounded text-muted-foreground hover:text-cyan-glow hover:bg-cyan-glow/10 transition-colors"
            title={leftOpen ? "Hide guide" : "Show guide"}
          >
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <span className="data-readout text-[12px] text-cyan-glow font-bold tracking-wider">FLL 3D SIMULATOR</span>
          <div className="w-px h-4 bg-cyan-glow/20" />
          <div className="flex items-center gap-1.5">
            <Anchor className="w-3 h-3 text-cyan-glow/60" />
            <span className="text-[10px] uppercase tracking-wider text-cyan-glow/70">{sceneState.season}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-amber-score/60" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{sceneState.missionCount} missions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-muted-foreground/40"}`} />
            <span className={`text-[10px] uppercase tracking-wider ${isRunning ? "text-green-400/80" : "text-muted-foreground/50"}`}>
              {isRunning ? "Running" : isEnded ? "Ended" : "Ready"}
            </span>
          </div>
        </div>

        {/* Center: Timer + Controls */}
        <div className="flex items-center gap-3">
          <Timer className={`w-4 h-4 ${isRunning ? "text-cyan-glow animate-pulse" : "text-muted-foreground/50"}`} />
          <span className={`data-readout text-2xl font-bold tracking-wider ${timerColor} transition-colors duration-300`}>
            {formattedTime}
          </span>
          <div className="flex items-center gap-1.5">
            {!isRunning && !isEnded && (
              <button
                onClick={startMatch}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-500/15 border border-green-500/40 
                           text-green-400 text-[10px] font-medium tracking-wider uppercase
                           hover:bg-green-500/25 hover:border-green-500/60 transition-all duration-150"
              >
                <Play className="w-3 h-3" /> Start
              </button>
            )}
            {isRunning && (
              <button
                onClick={stopMatch}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/15 border border-red-500/40 
                           text-red-400 text-[10px] font-medium tracking-wider uppercase
                           hover:bg-red-500/25 hover:border-red-500/60 transition-all duration-150"
              >
                <Square className="w-3 h-3" /> Stop
              </button>
            )}
            <button
              onClick={() => { resetScene(); resetMatch(); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                         text-cyan-glow text-[10px] font-medium tracking-wider uppercase
                         hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-150"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <div className="w-px h-5 bg-cyan-glow/20" />
          <Trophy className="w-4 h-4 text-amber-score" />
          <span className="data-readout text-xl font-bold text-amber-score">{match.totalScore}</span>
          <span className="text-[10px] text-muted-foreground uppercase">pts</span>
        </div>

        {/* Right: FPS + Sidebar toggle */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">FPS</span>
          <span className="data-readout text-[11px] font-bold text-cyan-glow">{sceneState.fps}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Physics</span>
          <span className="data-readout text-[11px] font-bold text-amber-score">{sceneState.physicsStep}</span>
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="p-1 rounded text-muted-foreground hover:text-cyan-glow hover:bg-cyan-glow/10 transition-colors"
            title={rightOpen ? "Hide scoring" : "Show scoring"}
          >
            {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ===== MIDDLE: Left Hints + Canvas + Right Scoring ===== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT PANEL: Mission Guide / Hints ── */}
        <div
          className={`${leftOpen ? "w-[240px]" : "w-0"} flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
                      border-r border-hud-border/40 bg-background/95`}
        >
          <div className="w-[240px] h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-hud-border/30">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-score" />
                <span className="data-readout text-[11px] text-amber-score font-bold tracking-wider uppercase">Mission Guide</span>
              </div>
              <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">
                {missionDefs.length} missions
              </span>
            </div>

            {/* Scrollable mission hints list */}
            <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1 scrollbar-thin">
              {missionDefs.map((def) => {
                const isExpanded = expandedHints.has(def.id);
                const colorClass = getMissionColor(def.id);
                const matchMission = match.missions.find((m) => m.missionId === def.id);
                const allComplete = matchMission?.conditions.length
                  ? matchMission.conditions.every((c) => c.completed)
                  : false;

                return (
                  <div
                    key={def.id}
                    className={`rounded transition-colors duration-200 ${
                      allComplete
                        ? "bg-green-400/8 border border-green-400/20"
                        : selectedMission === def.id
                          ? "bg-cyan-glow/8 border border-cyan-glow/25"
                          : "bg-white/[0.02] border border-hud-border/20 hover:border-hud-border/35"
                    }`}
                  >
                    <button
                      onClick={() => {
                        toggleHint(def.id);
                        setSelectedMission(def.id);
                      }}
                      className="w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {allComplete ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : (
                          <MapPin className="w-3 h-3 text-cyan-glow/40 flex-shrink-0" />
                        )}
                        <span className={`data-readout text-[10px] font-bold flex-shrink-0 ${colorClass}`}>
                          {def.id}
                        </span>
                        <span className={`text-[9px] font-medium truncate ${allComplete ? "text-green-400/80" : "text-foreground/80"}`}>
                          {def.shortName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="data-readout text-[9px] text-amber-score/60">{def.maxPoints}pt</span>
                        {isExpanded ? (
                          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/40" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-2.5 pb-2 animate-in slide-in-from-top-1 duration-150">
                        {/* Mission description */}
                        <p className="text-[8px] text-foreground/60 leading-relaxed mb-1.5 pl-1 border-l-2 border-cyan-glow/20 ml-1">
                          {def.description}
                        </p>

                        {/* Scoring conditions as hints */}
                        {matchMission && matchMission.conditions.length > 0 && (
                          <div className="space-y-1 mt-1">
                            {matchMission.conditions.map((c, ci) => (
                              <div key={ci} className={`flex items-start gap-1.5 px-1.5 py-1 rounded ${
                                c.completed
                                  ? "bg-green-400/10"
                                  : "bg-white/[0.02]"
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
                                  c.completed ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" : "bg-amber-score/30"
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[8px] font-medium ${
                                      c.completed ? "text-green-400 line-through opacity-70" : "text-foreground/70"
                                    }`}>
                                      {c.description}
                                    </span>
                                    <span className={`data-readout text-[8px] font-bold flex-shrink-0 ${
                                      c.completed ? "text-green-400" : "text-amber-score/50"
                                    }`}>
                                      {c.points}pt
                                    </span>
                                  </div>
                                  {!c.completed && (
                                    <span className="text-[7px] text-cyan-glow/40 italic leading-tight block mt-0.5">
                                      {c.hint}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Parts list as quick reference */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {def.parts
                            .filter((p) => p.type === "dynamic" || p.type === "hinge")
                            .slice(0, 4)
                            .map((p) => (
                              <span
                                key={p.id}
                                className="text-[7px] px-1 py-0.5 rounded bg-cyan-glow/5 border border-cyan-glow/15 text-cyan-glow/60"
                              >
                                {p.label || p.id}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer: Quick stats */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-hud-border/30">
              <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Max Score</span>
              <span className="data-readout text-[12px] font-bold text-amber-score/70">
                {missionDefs.reduce((sum, m) => sum + m.maxPoints, 0)} pt
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER: Canvas area ── */}
        <div className="relative flex-1 min-w-0">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            touch-action="none"
          />

          {/* Loading overlay */}
          {!sceneState.isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-cyan-glow/30 border-t-cyan-glow rounded-full animate-spin" />
                <span className="data-readout text-sm text-cyan-glow/70 tracking-wider">
                  INITIALIZING SIMULATION...
                </span>
              </div>
            </div>
          )}

          {/* Match ended overlay */}
          {isEnded && (
            <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
              <div className="bg-background/90 border border-hud-border rounded-lg px-8 py-6 text-center pointer-events-auto backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                <Trophy className="w-10 h-10 text-amber-score mx-auto mb-3" />
                <div className="text-xl font-bold text-amber-score data-readout mb-1">MATCH ENDED</div>
                <div className="text-3xl font-bold text-cyan-glow data-readout mb-4">{match.totalScore} pts</div>
                <button
                  onClick={() => { resetScene(); resetMatch(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                             text-cyan-glow text-xs font-medium tracking-wider uppercase mx-auto
                             hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> New Match
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Live Scoring ── */}
        <div
          className={`${rightOpen ? "w-[240px]" : "w-0"} flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
                      border-l border-hud-border/40 bg-background/95`}
        >
          <div className="w-[240px] h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-hud-border/30">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-cyan-glow" />
                <span className="data-readout text-[11px] text-cyan-glow font-bold tracking-wider uppercase">Scoring</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-score/60" />
                <span className="data-readout text-[11px] font-bold text-amber-score">{match.totalScore}</span>
              </div>
            </div>

            {/* Scrollable scoring list */}
            <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1 scrollbar-thin">
              {match.missions.map((m) => {
                const allComplete = m.conditions.length > 0 && m.conditions.every((c) => c.completed);
                const someComplete = m.conditions.some((c) => c.completed);
                const isExpanded = expandedMissions.has(m.missionId);

                return (
                  <div key={m.missionId} className={`rounded transition-colors duration-200 ${
                    allComplete ? "bg-green-400/8 border border-green-400/20" :
                    someComplete ? "bg-amber-score/5 border border-amber-score/15" :
                    "bg-white/[0.02] border border-hud-border/20"
                  }`}>
                    <button
                      onClick={() => toggleMission(m.missionId)}
                      className="w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left hover:bg-white/[0.03] rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {allComplete ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : someComplete ? (
                          <Circle className="w-3 h-3 text-amber-score flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span className={`data-readout text-[10px] font-bold flex-shrink-0 ${allComplete ? "text-green-400" : "text-cyan-glow"}`}>
                          {m.missionId}
                        </span>
                        <span className={`text-[9px] font-medium truncate ${allComplete ? "text-green-400/80" : "text-foreground/80"}`}>
                          {m.missionName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`data-readout text-[10px] font-bold ${m.earnedPoints > 0 ? "text-green-400" : "text-muted-foreground/30"}`}>
                          {m.earnedPoints}
                        </span>
                        <span className="text-[8px] text-muted-foreground/30">/</span>
                        <span className="data-readout text-[10px] text-amber-score/70">{m.maxPoints}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/40" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                        )}
                      </div>
                    </button>

                    {isExpanded && m.conditions.length > 0 && (
                      <div className="px-2 pb-1.5 ml-4 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                        {m.conditions.map((c, ci) => (
                          <div key={ci} className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  c.completed ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" : "bg-muted-foreground/25"
                                }`} />
                                <span className={`text-[8px] font-medium truncate ${
                                  c.completed ? "text-green-400 line-through opacity-70" : "text-foreground/70"
                                }`}>
                                  {c.description}
                                </span>
                              </div>
                              <span className={`data-readout text-[8px] font-bold flex-shrink-0 ${
                                c.completed ? "text-green-400" : "text-muted-foreground/30"
                              }`}>
                                {c.completed ? `+${c.points}` : c.points}
                              </span>
                            </div>
                            {!c.completed && (
                              <div className="ml-3">
                                <span className="text-[7px] text-cyan-glow/50 italic leading-tight">
                                  {c.hint}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-hud-border/30">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Total</span>
              <span className={`data-readout text-[14px] font-bold ${match.totalScore > 0 ? "text-amber-score" : "text-muted-foreground/40"}`}>
                {match.totalScore} pt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM BAR: Telemetry + Controls ===== */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1 border-t border-hud-border/40 bg-hud-bg/60">
        {/* Left: Robot Telemetry */}
        <div className="flex items-center gap-3">
          <Compass className="w-3 h-3 text-cyan-glow/60" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Robot</span>
          <div className="flex items-center gap-2">
            <TelemetryValue label="X" value={sceneState.robot.position.x} color="text-cyan-glow" />
            <TelemetryValue label="Y" value={sceneState.robot.position.y} color="text-amber-score" />
            <TelemetryValue label="Z" value={sceneState.robot.position.z} color="text-cyan-glow" />
          </div>
          <div className="w-px h-3.5 bg-cyan-glow/15" />
          <TelemetryValue label="HDG" value={sceneState.robot.heading} unit="°" color="text-amber-score" />
          <TelemetryValue label="SPD" value={sceneState.robot.speed} unit="m/s" color="text-green-400" />
        </div>

        {/* Center: WASD Keys */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-px">
            <MiniKey active={isKeyActive("w") || isKeyActive("arrowup")} label="W" />
            <div className="flex gap-px">
              <MiniKey active={isKeyActive("a") || isKeyActive("arrowleft")} label="A" />
              <MiniKey active={isKeyActive("s") || isKeyActive("arrowdown")} label="S" />
              <MiniKey active={isKeyActive("d") || isKeyActive("arrowright")} label="D" />
            </div>
          </div>
          <span className="text-[8px] text-muted-foreground/50 tracking-wider max-w-[100px] leading-tight">
            WASD drive · Scroll zoom · Drag orbit
          </span>
        </div>

        {/* Right: Engine info */}
        <div className="flex items-center gap-2">
          <Box className="w-3 h-3 text-cyan-glow/40" />
          <span className="text-[8px] text-muted-foreground">Babylon 8 + Rapier WASM</span>
          <Gauge className="w-3 h-3 text-cyan-glow/40" />
          <span className="text-[8px] text-muted-foreground">Differential Drive</span>
        </div>
      </div>
    </div>
  );
}

/** Compact telemetry value for bottom bar */
function TelemetryValue({ label, value, unit = "m", color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-[8px] text-muted-foreground/60 uppercase">{label}</span>
      <span className={`data-readout text-[11px] font-bold ${color}`}>{value.toFixed(3)}</span>
      <span className="text-[7px] text-muted-foreground/40">{unit}</span>
    </div>
  );
}

/** Mini keyboard key for bottom bar */
function MiniKey({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`w-5 h-5 flex items-center justify-center rounded-sm text-[8px] font-mono transition-all duration-75
        ${active
          ? "bg-cyan-glow/30 border border-cyan-glow text-cyan-glow shadow-[0_0_6px_rgba(0,200,255,0.3)]"
          : "bg-hud-bg/80 border border-hud-border/40 text-muted-foreground/40"
        }`}
    >
      {label}
    </div>
  );
}
