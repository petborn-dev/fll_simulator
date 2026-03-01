/**
 * FLL 3D Simulator — Phase 3: Game Environment with Mission Models
 * Design: Mission Control HUD — full-bleed 3D viewport with floating panels
 */

import { useBabylonScene } from "@/hooks/useBabylonScene";
import { HudPanel, DataReadout } from "@/components/HudPanel";
import {
  RotateCcw, Compass, Gauge, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Cpu, Zap, Box, Anchor, Target
} from "lucide-react";

export default function Home() {
  const { canvasRef, sceneState, resetScene } = useBabylonScene();

  const isKeyActive = (key: string) => sceneState.keysPressed.has(key);

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

      {/* Top-left: Title & Season */}
      <div className="absolute top-4 left-4 z-10">
        <HudPanel title="FLL 3D Simulator" className="relative">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-green-400/80">
                Phase 3 — Game Environment
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

      {/* Right side: Mission List */}
      <div className="absolute top-[110px] right-4 z-10 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
        <HudPanel title="Missions" className="relative min-w-[160px]">
          <div className="flex flex-col gap-1">
            {[
              { id: "M01", name: "Coral Nursery", pts: 50 },
              { id: "M02", name: "Shark", pts: 30 },
              { id: "M03", name: "Coral Reef", pts: 35 },
              { id: "M05", name: "Angler Fish", pts: 30 },
              { id: "M06", name: "Raise the Mast", pts: 30 },
              { id: "M08", name: "Artificial Habitat", pts: 40 },
              { id: "M11", name: "Sonar Discovery", pts: 30 },
              { id: "M13", name: "Shipping Lanes", pts: 20 },
            ].map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="data-readout text-[10px] text-cyan-glow/80 w-6">{m.id}</span>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{m.name}</span>
                </div>
                <span className="data-readout text-[10px] text-amber-score/70">{m.pts}pt</span>
              </div>
            ))}
            <div className="w-full h-px bg-cyan-glow/10 my-0.5" />
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Max Total</span>
              <span className="data-readout text-[11px] text-amber-score">265pt</span>
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

            {/* Reset Button */}
            <button
              onClick={resetScene}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                         text-cyan-glow text-xs font-medium tracking-wider uppercase
                         hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

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
