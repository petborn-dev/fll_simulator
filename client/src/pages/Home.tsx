/**
 * FLL 3D Simulator — Phase 4: Scoring System & Match Timer
 * Design: Mission Control HUD with match timer, live scoring, and match controls
 * Features: 2:30 countdown, per-mission scoring conditions, start/stop/reset
 */

import { useBabylonScene } from "@/hooks/useBabylonScene";
import { HudPanel, DataReadout } from "@/components/HudPanel";
import { ScoringEngine } from "@/lib/scoringEngine";
import {
  RotateCcw, Compass, Gauge, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Cpu, Zap, Box, Anchor, Target, Play, Square, Timer, Trophy,
  CheckCircle2, Circle,
} from "lucide-react";

export default function Home() {
  const { canvasRef, sceneState, resetScene, startMatch, stopMatch, resetMatch } = useBabylonScene();

  const isKeyActive = (key: string) => sceneState.keysPressed.has(key);
  const { match } = sceneState;
  const formattedTime = ScoringEngine.formatTime(match.timeRemaining);
  const isRunning = match.phase === "running";
  const isEnded = match.phase === "ended";

  // Timer color based on remaining time
  const timerColor = match.timeRemaining <= 10
    ? "text-red-400"
    : match.timeRemaining <= 30
      ? "text-amber-score"
      : "text-cyan-glow";

  const timerGlow = match.timeRemaining <= 10
    ? "shadow-[0_0_12px_rgba(255,80,80,0.4)]"
    : match.timeRemaining <= 30
      ? "shadow-[0_0_12px_rgba(255,180,50,0.3)]"
      : "";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Full-bleed 3D Viewport */}
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
          <div className="hud-panel glow-cyan px-8 py-6 text-center pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
            <Trophy className="w-10 h-10 text-amber-score mx-auto mb-3" />
            <div className="text-xl font-bold text-amber-score data-readout mb-1">
              MATCH ENDED
            </div>
            <div className="text-3xl font-bold text-cyan-glow data-readout mb-4">
              {match.totalScore} pts
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { resetScene(); resetMatch(); }}
                className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                           text-cyan-glow text-xs font-medium tracking-wider uppercase
                           hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-center: Match Timer */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <HudPanel className="relative">
          <div className="flex items-center gap-4">
            <Timer className={`w-4 h-4 ${isRunning ? "text-cyan-glow animate-pulse" : "text-muted-foreground"}`} />
            <div className={`data-readout text-2xl font-bold tracking-wider ${timerColor} ${timerGlow} transition-all duration-300`}>
              {formattedTime}
            </div>
            <div className="w-px h-8 bg-cyan-glow/20" />
            <div className="flex items-center gap-2">
              {!isRunning && !isEnded && (
                <button
                  onClick={startMatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-500/15 border border-green-500/40 
                             text-green-400 text-[10px] font-medium tracking-wider uppercase
                             hover:bg-green-500/25 hover:border-green-500/60 transition-all duration-200"
                >
                  <Play className="w-3 h-3" />
                  Start
                </button>
              )}
              {isRunning && (
                <button
                  onClick={stopMatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/15 border border-red-500/40 
                             text-red-400 text-[10px] font-medium tracking-wider uppercase
                             hover:bg-red-500/25 hover:border-red-500/60 transition-all duration-200"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
              )}
              <button
                onClick={() => { resetScene(); resetMatch(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                           text-cyan-glow text-[10px] font-medium tracking-wider uppercase
                           hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="w-px h-8 bg-cyan-glow/20" />
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-score" />
              <span className="data-readout text-xl font-bold text-amber-score">
                {match.totalScore}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">pts</span>
            </div>
          </div>
        </HudPanel>
      </div>

      {/* Top-left: Title & Season */}
      <div className="absolute top-4 left-4 z-10">
        <HudPanel title="FLL 3D Simulator" className="relative">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
              <span className={`text-[10px] uppercase tracking-wider ${isRunning ? "text-green-400/80" : "text-muted-foreground"}`}>
                {isRunning ? "Match Running" : isEnded ? "Match Ended" : "Phase 4 — Scoring System"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Anchor className="w-3 h-3 text-cyan-glow/60" />
              <span className="text-[10px] uppercase tracking-wider text-cyan-glow/80">
                {sceneState.season}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-amber-score/60" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {sceneState.missionCount} missions loaded
              </span>
            </div>
          </div>
        </HudPanel>
      </div>

      {/* Top-right: Performance Stats */}
      <div className="absolute top-4 right-4 z-10">
        <HudPanel title="Performance" className="relative min-w-[180px]">
          <div className="flex flex-col gap-1">
            <DataReadout label="FPS" value={sceneState.fps} color="cyan" />
            <DataReadout
              label="Physics"
              value={sceneState.physicsStep}
              unit="steps"
              color="amber"
            />
          </div>
        </HudPanel>
      </div>

      {/* Right side: Mission Scoring Panel */}
      <div className="absolute top-[110px] right-4 z-10 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
        <HudPanel title="Mission Scoring" className="relative min-w-[280px] max-w-[300px]">
          <div className="flex flex-col gap-2">
            {match.missions.map((m) => {
              const allComplete = m.conditions.length > 0 && m.conditions.every((c) => c.completed);
              const someComplete = m.conditions.some((c) => c.completed);

              return (
                <div key={m.missionId} className={`rounded px-2 py-1.5 transition-colors duration-200 ${
                  allComplete ? "bg-green-400/8 border border-green-400/20" :
                  someComplete ? "bg-amber-score/5 border border-amber-score/15" :
                  "bg-white/[0.02] border border-transparent"
                }`}>
                  {/* Mission header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {allComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      ) : someComplete ? (
                        <Circle className="w-3.5 h-3.5 text-amber-score flex-shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={`data-readout text-[11px] font-bold ${allComplete ? "text-green-400" : "text-cyan-glow"}`}>
                        {m.missionId}
                      </span>
                      <span className={`text-[10px] font-medium ${allComplete ? "text-green-400/80" : "text-foreground/80"}`}>
                        {m.missionName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`data-readout text-[11px] font-bold ${m.earnedPoints > 0 ? "text-green-400" : "text-muted-foreground/30"}`}>
                        {m.earnedPoints}
                      </span>
                      <span className="text-[9px] text-muted-foreground/30">/</span>
                      <span className="data-readout text-[11px] text-amber-score/70">{m.maxPoints}</span>
                    </div>
                  </div>
                  {/* Scoring conditions with hints */}
                  {m.conditions.length > 0 && (
                    <div className="ml-5 mt-1 space-y-1">
                      {m.conditions.map((c, ci) => (
                        <div key={ci} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                c.completed ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" : "bg-muted-foreground/25"
                              }`} />
                              <span className={`text-[9px] font-medium ${
                                c.completed ? "text-green-400 line-through opacity-70" : "text-foreground/70"
                              }`}>
                                {c.description}
                              </span>
                            </div>
                            <span className={`data-readout text-[9px] font-bold ${
                              c.completed ? "text-green-400" : "text-muted-foreground/25"
                            }`}>
                              {c.completed ? `+${c.points}` : c.points}
                            </span>
                          </div>
                          {/* How-to hint — only show when not yet completed */}
                          {!c.completed && (
                            <div className="ml-3 flex items-start gap-1">
                              <span className="text-[8px] text-cyan-glow/40 mt-px">▶</span>
                              <span className="text-[8px] text-cyan-glow/50 italic leading-tight">
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
            <div className="w-full h-px bg-cyan-glow/15 my-1" />
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total Score</span>
              <span className={`data-readout text-[15px] font-bold ${match.totalScore > 0 ? "text-amber-score" : "text-muted-foreground/40"}`}>
                {match.totalScore}pt
              </span>
            </div>
          </div>
        </HudPanel>
      </div>

      {/* Bottom-left: Robot Telemetry */}
      <div className="absolute bottom-4 left-4 z-10">
        <HudPanel title="Robot Telemetry" className="relative min-w-[240px]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <Compass className="w-3 h-3 text-cyan-glow/60" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <DataReadout
                label="X"
                value={sceneState.robot.position.x}
                unit="m"
                color="cyan"
              />
              <DataReadout
                label="Y"
                value={sceneState.robot.position.y}
                unit="m"
                color="amber"
              />
              <DataReadout
                label="Z"
                value={sceneState.robot.position.z}
                unit="m"
                color="cyan"
              />
            </div>
            <div className="w-full h-px bg-cyan-glow/10 my-0.5" />
            <div className="flex gap-4">
              <DataReadout
                label="HDG"
                value={sceneState.robot.heading}
                unit="°"
                color="amber"
              />
              <DataReadout
                label="SPD"
                value={sceneState.robot.speed}
                unit="m/s"
                color="green"
              />
            </div>
          </div>
        </HudPanel>
      </div>

      {/* Bottom-center: Controls & Key Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <HudPanel className="relative">
          <div className="flex items-center gap-4">
            {/* WASD Key Indicators */}
            <div className="flex flex-col items-center gap-0.5">
              <KeyIndicator label="W" icon={<ArrowUp className="w-2.5 h-2.5" />} active={isKeyActive("w") || isKeyActive("arrowup")} />
              <div className="flex gap-0.5">
                <KeyIndicator label="A" icon={<ArrowLeft className="w-2.5 h-2.5" />} active={isKeyActive("a") || isKeyActive("arrowleft")} />
                <KeyIndicator label="S" icon={<ArrowDown className="w-2.5 h-2.5" />} active={isKeyActive("s") || isKeyActive("arrowdown")} />
                <KeyIndicator label="D" icon={<ArrowRight className="w-2.5 h-2.5" />} active={isKeyActive("d") || isKeyActive("arrowright")} />
              </div>
            </div>

            <div className="w-px h-10 bg-cyan-glow/20" />

            <span className="text-[10px] text-muted-foreground tracking-wider max-w-[140px] leading-relaxed">
              WASD to drive · Scroll to zoom · Drag to orbit
            </span>
          </div>
        </HudPanel>
      </div>

      {/* Bottom-right: Engine Info */}
      <div className="absolute bottom-4 right-4 z-10">
        <HudPanel title="Engine" className="relative">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Box className="w-3 h-3 text-cyan-glow/60" />
              <span className="text-[10px] text-muted-foreground">Babylon.js 8.x</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-score/60" />
              <span className="text-[10px] text-muted-foreground">Rapier 0.19 (WASM)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-green-400/60" />
              <span className="text-[10px] text-muted-foreground">WebGL 2.0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3 h-3 text-cyan-glow/60" />
              <span className="text-[10px] text-muted-foreground">Differential Drive</span>
            </div>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}

/** Keyboard key indicator component */
function KeyIndicator({ label, icon, active }: { label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <div
      className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-mono transition-all duration-100
        ${active
          ? "bg-cyan-glow/30 border border-cyan-glow text-cyan-glow shadow-[0_0_8px_rgba(0,200,255,0.3)]"
          : "bg-hud-bg border border-hud-border text-muted-foreground"
        }`}
      title={label}
    >
      {icon}
    </div>
  );
}
