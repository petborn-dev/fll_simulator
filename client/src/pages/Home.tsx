/**
 * FLL 3D Simulator — Phase 1: 3D Foundation
 * Design: Mission Control HUD — full-bleed 3D viewport with floating panels
 */

import { useBabylonScene } from "@/hooks/useBabylonScene";
import { HudPanel, DataReadout } from "@/components/HudPanel";
import { RotateCcw, Box, Cpu, Zap } from "lucide-react";

export default function Home() {
  const { canvasRef, sceneState, resetScene } = useBabylonScene();

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
              INITIALIZING PHYSICS ENGINE...
            </span>
          </div>
        </div>
      )}

      {/* Top-left: Title & Status */}
      <div className="absolute top-4 left-4 z-10">
        <HudPanel title="FLL 3D Simulator" className="relative">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-green-400/80">
                Phase 1 — Foundation
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

      {/* Bottom-left: Object Telemetry */}
      <div className="absolute bottom-4 left-4 z-10">
        <HudPanel title="Box Telemetry" className="relative min-w-[220px]">
          <div className="flex flex-col gap-1">
            <DataReadout
              label="X"
              value={sceneState.boxPosition.x}
              unit="m"
              color="cyan"
            />
            <DataReadout
              label="Y"
              value={sceneState.boxPosition.y}
              unit="m"
              color="amber"
            />
            <DataReadout
              label="Z"
              value={sceneState.boxPosition.z}
              unit="m"
              color="cyan"
            />
          </div>
        </HudPanel>
      </div>

      {/* Bottom-center: Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <HudPanel className="relative">
          <div className="flex items-center gap-3">
            <button
              onClick={resetScene}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                         text-cyan-glow text-xs font-medium tracking-wider uppercase
                         hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <div className="w-px h-6 bg-cyan-glow/20" />
            <span className="text-[10px] text-muted-foreground tracking-wider">
              Scroll to zoom · Drag to orbit · Right-drag to pan
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
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
