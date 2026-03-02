/**
 * FLL 3D Simulator — All 15 Missions + Dual Sidebar Layout
 * Layout: Three rows — top bar (timer+info), middle (left hints + canvas + right scoring), bottom bar (telemetry)
 * Left panel: Mission guide/hints (static reference)
 * Right panel: Live scoring tracker
 */

import { useState, useMemo, useEffect } from "react";
import { useBabylonScene } from "@/hooks/useBabylonScene";
import { ScoringEngine } from "@/lib/scoringEngine";
import { getSeasonMissions } from "@/lib/missions";
import {
  RotateCcw, Compass, Box, Anchor, Target, Play, Square, Timer, Trophy,
  CheckCircle2, Circle,
  PanelLeftClose, PanelLeftOpen,
  ChevronDown, ChevronRight, Gauge, Lightbulb, MapPin, Zap,
  Hammer, KeyRound, Eye, Coins, HelpCircle, X, ExternalLink, Users, Share2, Award,
} from "lucide-react";

export default function Home() {
  const { canvasRef, sceneState, resetScene, startMatch, stopMatch, resetMatch, focusMission } = useBabylonScene();
  const [leftOpen, setLeftOpen] = useState(true);
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set(["M01"])); // First mission expanded by default
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem("fll-sim-best-score");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showShareToast, setShowShareToast] = useState(false);

  // Visitor counter — increment once per session via counterapi.dev
  useEffect(() => {
    const COUNTER_API = "https://api.counterapi.dev/v1/fll-simulator-app/visits";
    const alreadyCounted = sessionStorage.getItem("fll-sim-counted");

    if (alreadyCounted) {
      // Already counted this session — just read the current value
      fetch(`${COUNTER_API}/`, { method: "GET" })
        .then((r) => r.json())
        .then((data) => setVisitorCount(data.count))
        .catch(() => {});
    } else {
      // First visit this session — increment
      fetch(`${COUNTER_API}/up`, { method: "GET" })
        .then((r) => r.json())
        .then((data) => {
          setVisitorCount(data.count);
          sessionStorage.setItem("fll-sim-counted", "1");
        })
        .catch(() => {});
    }
  }, []);

  // Get static mission definitions for the hints panel
  const missionDefs = useMemo(() => getSeasonMissions(), []);

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

  // Update best score when match ends
  useEffect(() => {
    if (isEnded && match.totalScore > bestScore) {
      setBestScore(match.totalScore);
      localStorage.setItem("fll-sim-best-score", match.totalScore.toString());
    }
  }, [isEnded, match.totalScore, bestScore]);

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
          {bestScore > 0 && (
            <div className="flex items-center gap-1 ml-1" title="Personal best score">
              <Award className="w-3 h-3 text-amber-score/50" />
              <span className="data-readout text-[9px] text-amber-score/50">{bestScore}</span>
            </div>
          )}
          {/* Precision Tokens indicator */}
          <div className="w-px h-5 bg-cyan-glow/20" />
          <div className="flex items-center gap-1" title="Precision Tokens remaining">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                  i < match.precisionTokensRemaining
                    ? "bg-red-500 border-red-400 shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                    : "bg-transparent border-muted-foreground/30"
                }`}
              />
            ))}
            <span className="data-readout text-[9px] text-muted-foreground ml-0.5">
              {match.precisionTokensRemaining}/6
            </span>
          </div>
        </div>

        {/* Right: FPS + Info + Sidebar toggle */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">FPS</span>
          <span className="data-readout text-[11px] font-bold text-cyan-glow">{sceneState.fps}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Physics</span>
          <span className="data-readout text-[11px] font-bold text-amber-score">{sceneState.physicsStep}</span>
          {visitorCount !== null && (
            <>
              <div className="w-px h-4 bg-cyan-glow/20" />
              <div className="flex items-center gap-1" title="Total visitors">
                <Users className="w-3 h-3 text-cyan-glow/60" />
                <span className="data-readout text-[10px] text-cyan-glow/70">{visitorCount.toLocaleString()}</span>
              </div>
            </>
          )}
          <div className="w-px h-4 bg-cyan-glow/20" />
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1 rounded text-muted-foreground hover:text-cyan-glow hover:bg-cyan-glow/10 transition-colors"
            title="About this simulator"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== INFO MODAL ===== */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
          <div
            className="relative w-full max-w-2xl mx-4 bg-background border border-hud-border/60 rounded-lg shadow-2xl shadow-cyan-glow/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-hud-border/40 bg-hud-bg/60">
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-cyan-glow" />
                <span className="data-readout text-sm text-cyan-glow font-bold tracking-wider">ABOUT FLL SUBMERGED</span>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Embedded YouTube Video */}
              <div className="relative w-full aspect-video rounded-md overflow-hidden border border-hud-border/30 bg-black">
                <iframe
                  src="https://www.youtube.com/embed/J5u-2q_K3O0"
                  title="FLL SUBMERGED 2024-25 Season Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {/* Season Description */}
              <div className="space-y-3">
                <h3 className="data-readout text-sm text-cyan-glow font-bold tracking-wider uppercase">Season Overview</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  SUBMERGED is the 2024-25 FIRST LEGO League season. Teams explore the mysteries of the deep sea,
                  building and programming autonomous robots to complete 16 missions on a themed field mat. Missions
                  involve coral nurseries, underwater creatures, sonar discovery, research vessels, and more.
                </p>
              </div>

              {/* Simulator Quick Start */}
              <div className="space-y-3">
                <h3 className="data-readout text-sm text-amber-score font-bold tracking-wider uppercase">Quick Start</h3>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-hud-bg/40 border border-hud-border/20">
                    <span className="data-readout text-cyan-glow font-bold">WASD</span>
                    <span className="text-muted-foreground">Drive robot</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-hud-bg/40 border border-hud-border/20">
                    <span className="data-readout text-cyan-glow font-bold">E</span>
                    <span className="text-muted-foreground">Interact with mission</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-hud-bg/40 border border-hud-border/20">
                    <span className="data-readout text-cyan-glow font-bold">Mouse</span>
                    <span className="text-muted-foreground">Orbit camera</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded bg-hud-bg/40 border border-hud-border/20">
                    <span className="data-readout text-cyan-glow font-bold">Scroll</span>
                    <span className="text-muted-foreground">Zoom in/out</span>
                  </div>
                </div>
              </div>

              {/* Scoring Summary */}
              <div className="space-y-2">
                <h3 className="data-readout text-sm text-amber-score font-bold tracking-wider uppercase">Scoring</h3>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Hammer className="w-3 h-3 text-amber-score/70" />
                    <span>6 push missions (drive into objects)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3 text-cyan-glow/70" />
                    <span>9 trigger missions (press E near object)</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Max score: <span className="text-amber-score font-bold">605 pts</span> (555 missions + 50 precision tokens)</p>
              </div>

              {/* Stats */}
              {visitorCount !== null && (
                <div className="flex items-center gap-3 px-3 py-2 rounded bg-hud-bg/40 border border-hud-border/20">
                  <Users className="w-4 h-4 text-cyan-glow/60" />
                  <div className="flex flex-col">
                    <span className="data-readout text-lg text-cyan-glow font-bold">{visitorCount.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground">total visitors</span>
                  </div>
                  {bestScore > 0 && (
                    <>
                      <div className="w-px h-8 bg-hud-border/20 mx-2" />
                      <Award className="w-4 h-4 text-amber-score/60" />
                      <div className="flex flex-col">
                        <span className="data-readout text-lg text-amber-score font-bold">{bestScore}</span>
                        <span className="text-[10px] text-muted-foreground">your best score</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Links */}
              <div className="flex items-center gap-3 pt-2 border-t border-hud-border/20">
                <a
                  href="https://youtu.be/J5u-2q_K3O0?feature=shared"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-cyan-glow/70 hover:text-cyan-glow transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Watch on YouTube
                </a>
                <a
                  href="https://www.firstlegoleague.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-cyan-glow/70 hover:text-cyan-glow transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> FIRST LEGO League
                </a>
                <a
                  href="https://github.com/petborn-dev/fll_simulator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-cyan-glow/70 hover:text-cyan-glow transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> GitHub
                </a>
                <button
                  onClick={() => {
                    const url = "https://petborn-dev.github.io/fll_simulator/";
                    const text = `Check out this FLL SUBMERGED 3D Simulator!${bestScore > 0 ? ` My best score: ${bestScore} pts!` : ""}`;
                    if (navigator.share) {
                      navigator.share({ title: "FLL 3D Simulator", text, url }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
                        setShowShareToast(true);
                        setTimeout(() => setShowShareToast(false), 2000);
                      }).catch(() => {});
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] text-cyan-glow/70 hover:text-cyan-glow transition-colors"
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>
              {showShareToast && (
                <div className="text-[10px] text-green-400 text-center animate-in fade-in duration-200">
                  Link copied to clipboard!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                        focusMission(def.id);
                      }}
                      className="w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left rounded transition-colors group"
                      title={`Click to zoom to ${def.name}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {allComplete ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : def.id === "M16" ? (
                          <Coins className="w-3 h-3 text-red-400/60 flex-shrink-0" />
                        ) : def.interactionType === "trigger" ? (
                          <KeyRound className="w-3 h-3 text-amber-score/50 flex-shrink-0 group-hover:text-amber-score/80 transition-colors" />
                        ) : (
                          <Hammer className="w-3 h-3 text-cyan-glow/40 flex-shrink-0 group-hover:text-cyan-glow/70 transition-colors" />
                        )}
                        <span className={`data-readout text-[10px] font-bold flex-shrink-0 ${colorClass}`}>
                          {def.id}
                        </span>
                        <span className={`text-[9px] font-medium truncate ${allComplete ? "text-green-400/80" : "text-foreground/80"}`}>
                          {def.shortName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="data-readout text-[9px] text-amber-score/60">
                          {matchMission && matchMission.earnedPoints > 0
                            ? `${matchMission.earnedPoints}/${def.maxPoints}pt`
                            : `${def.maxPoints}pt`
                          }
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/40" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-2.5 pb-2 animate-in slide-in-from-top-1 duration-150">
                        {/* Interaction type badge + description */}
                        <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                          <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase ${
                            def.interactionType === "trigger"
                              ? "bg-amber-score/15 text-amber-score/80 border border-amber-score/25"
                              : "bg-cyan-glow/10 text-cyan-glow/70 border border-cyan-glow/20"
                          }`}>
                            {def.interactionType === "trigger" ? "E key" : "Push"}
                          </span>
                          <Eye className="w-2.5 h-2.5 text-muted-foreground/30 cursor-pointer hover:text-cyan-glow/60 transition-colors" />
                        </div>
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
                                {c.completed ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-3 h-3 text-amber-score/30 flex-shrink-0 mt-0.5" />
                                )}
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

          {/* Persistent scored missions list — top-right of canvas */}
          {match.completedEvents.length > 0 && (
            <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 pointer-events-none max-h-[50%] overflow-y-auto">
              <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
                <Trophy className="w-3 h-3 text-amber-score" />
                <span className="data-readout text-[9px] text-amber-score font-bold uppercase tracking-wider">Scored</span>
                <span className="data-readout text-[10px] text-amber-score font-bold">{match.totalScore}pt</span>
              </div>
              {match.completedEvents.map((evt, i) => (
                <div
                  key={`${evt.missionId}-${evt.timestamp}-${i}`}
                  className="flex items-center gap-2 px-2.5 py-1 rounded bg-green-500/15 border border-green-400/30 backdrop-blur-sm"
                >
                  <span className="data-readout text-[9px] font-bold text-green-400 flex-shrink-0">{evt.missionId}</span>
                  <span className="text-[8px] text-green-300/70 truncate max-w-[140px]">{evt.description}</span>
                  <span className="data-readout text-[9px] font-bold text-amber-score flex-shrink-0">+{evt.points}</span>
                </div>
              ))}
            </div>
          )}

          {/* Press [E] interaction prompt — shown when near a Category B mission */}
          {sceneState.nearestInteractable && isRunning && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-background/90 border border-cyan-glow/50 backdrop-blur-md shadow-[0_0_20px_rgba(0,200,255,0.15)]">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-cyan-glow/20 border border-cyan-glow/60">
                  <span className="data-readout text-sm font-bold text-cyan-glow">E</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-foreground/90">
                    {sceneState.nearestInteractable.missionName}
                  </span>
                  <span className="text-[9px] text-cyan-glow/70 data-readout">
                    {sceneState.nearestInteractable.missionId} · Stage {sceneState.nearestInteractable.stagesCompleted + 1}/{sceneState.nearestInteractable.stagesTotal}
                  </span>
                </div>
                <Zap className="w-3.5 h-3.5 text-amber-score animate-pulse" />
              </div>
            </div>
          )}

          {/* Match ended overlay */}
          {isEnded && (
            <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
              <div className="bg-background/90 border border-hud-border rounded-lg px-8 py-6 text-center pointer-events-auto backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                <Trophy className="w-10 h-10 text-amber-score mx-auto mb-3" />
                <div className="text-xl font-bold text-amber-score data-readout mb-1">MATCH ENDED</div>
                <div className="text-3xl font-bold text-cyan-glow data-readout mb-2">{match.totalScore} pts</div>
                {match.totalScore >= bestScore && match.totalScore > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mb-2 animate-in fade-in zoom-in-95 duration-500">
                    <Award className="w-4 h-4 text-amber-score" />
                    <span className="data-readout text-[11px] text-amber-score font-bold uppercase tracking-wider">
                      {match.totalScore > (bestScore > match.totalScore ? bestScore : 0) ? "New Personal Best!" : "Personal Best!"}
                    </span>
                  </div>
                )}
                {/* Precision Token Bonus Breakdown */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full border ${
                          i < match.precisionTokensRemaining
                            ? "bg-red-500 border-red-400"
                            : "bg-transparent border-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Precision: {match.precisionTokensRemaining}/6 tokens
                  </span>
                  {match.precisionBonus > 0 && (
                    <span className="text-[10px] text-green-400 font-bold">+{match.precisionBonus} pts</span>
                  )}
                </div>
                <button
                  onClick={() => { resetScene(); resetMatch(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                             text-cyan-glow text-xs font-medium tracking-wider uppercase mx-auto
                             hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> New Match
                </button>
                <button
                  onClick={() => {
                    const url = "https://petborn-dev.github.io/fll_simulator/";
                    const text = `I scored ${match.totalScore} pts in the FLL SUBMERGED 3D Simulator!`;
                    if (navigator.share) {
                      navigator.share({ title: "FLL 3D Simulator", text, url }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
                        setShowShareToast(true);
                        setTimeout(() => setShowShareToast(false), 2000);
                      }).catch(() => {});
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-glow/10 border border-cyan-glow/30 
                             text-cyan-glow text-xs font-medium tracking-wider uppercase mx-auto mt-2
                             hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all duration-200"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Score
                </button>
              </div>
            </div>
          )}
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
            WASD drive · E interact · Scroll zoom · Drag orbit
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
