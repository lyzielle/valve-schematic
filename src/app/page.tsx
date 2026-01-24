"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface LogEntry {
  id: number;
  timestamp: Date;
  action: string;
  component: string;
  state?: string;
}

interface ValveState {
  [key: string]: boolean;
}

interface ValveInfo {
  id: string;
  path: string;
  type: "2-way" | "3-way";
}

// Two-headed valve paths
const TWO_HEADED_VALVES: ValveInfo[] = [
  { id: "VacR", path: "M 751 430 L 771 440 L 751 450 Z M 791 430 L 771 440 L 791 450 Z", type: "2-way" },
  { id: "Neon", path: "M 741 470 L 761 480 L 741 490 Z M 781 470 L 761 480 L 781 490 Z", type: "2-way" },
  { id: "Argon", path: "M 741 510 L 761 520 L 741 530 Z M 781 510 L 761 520 L 781 530 Z", type: "2-way" },
  { id: "Krypton", path: "M 741 550 L 761 560 L 741 570 Z M 781 550 L 761 560 L 781 570 Z", type: "2-way" },
  { id: "CH1", path: "M 701 380 L 721 390 L 701 400 Z M 741 380 L 721 390 L 741 400 Z", type: "2-way" },
  { id: "RegR", path: "M 661 430 L 681 440 L 661 450 Z M 701 430 L 681 440 L 701 450 Z", type: "2-way" },
  { id: "Flow", path: "M 541 550 L 561 560 L 541 570 Z M 581 550 L 561 560 L 581 570 Z", type: "2-way" },
  { id: "Bypass", path: "M 261 580 L 281 590 L 261 600 Z M 301 580 L 281 590 L 301 600 Z", type: "2-way" },
  { id: "nach MFC", path: "M 381 550 L 401 560 L 381 570 Z M 421 550 L 401 560 L 421 570 Z", type: "2-way" },
  { id: "Reg L", path: "M 621 365.05 L 641 375.05 L 621 385.05 Z M 661 365.05 L 641 375.05 L 661 385.05 Z", type: "2-way" },
  { id: "Mixing Tank", path: "M 501 340 L 521 350 L 501 360 Z M 541 340 L 521 350 L 541 360 Z", type: "2-way" },
  { id: "Liquid/Gas Sample", path: "M 421 340 L 441 350 L 421 360 Z M 461 340 L 441 350 L 461 360 Z", type: "2-way" },
  { id: "VacL", path: "M 621 280 L 641 290 L 621 300 Z M 661 280 L 641 290 L 661 300 Z", type: "2-way" },
  { id: "CH2", path: "M 541 290 L 561 300 L 541 310 Z M 581 290 L 561 300 L 581 310 Z", type: "2-way" },
  { id: "CryoR", path: "M 181 510 L 201 520 L 181 530 Z M 221 510 L 201 520 L 221 530 Z", type: "2-way" },
  { id: "Abfuhr Cryo", path: "M 171 320 L 191 330 L 171 340 Z M 211 320 L 191 330 L 211 340 Z", type: "2-way" },
  { id: "Abfuhr Probe", path: "M 241 345.05 L 261 355.05 L 241 365.05 Z M 281 345.05 L 261 355.05 L 281 365.05 Z", type: "2-way" },
  { id: "Absperrventil (T2 und Pumpen)", path: "M 361 247.48 L 381 257.48 L 361 267.48 Z M 401 247.48 L 381 257.48 L 401 267.48 Z", type: "2-way" },
  { id: "Schlauchanschluss", path: "M 301 300 L 321 310 L 301 320 Z M 341 300 L 321 310 L 341 320 Z", type: "2-way" },
  { id: "T5 und T3", path: "M 501 190 L 521 200 L 501 210 Z M 541 190 L 521 200 L 541 210 Z", type: "2-way" },
  { id: "Schleuse Probe", path: "M 231 480 L 251 490 L 231 500 Z M 271 480 L 251 490 L 271 500 Z", type: "2-way" },
  { id: "CryoL", path: "M 101 510 L 121 520 L 101 530 Z M 141 510 L 121 520 L 141 530 Z", type: "2-way" },
];

// Three-headed valve paths
const THREE_HEADED_VALVES: ValveInfo[] = [
  { id: "V23", path: "M 361 110 L 381 117.5 L 361 125 Z M 401 110 L 381 117.5 L 401 125 Z M 381 117.5 L 393 130 L 369 130 Z", type: "3-way" },
  { id: "V24", path: "M 171 110 L 191 117.5 L 171 125 Z M 211 110 L 191 117.5 L 211 125 Z M 191 117.5 L 203 130 L 179 130 Z", type: "3-way" },
  { id: "V25", path: "M 171 200 L 191 207.5 L 171 215 Z M 211 200 L 191 207.5 L 211 215 Z M 191 207.5 L 203 220 L 179 220 Z", type: "3-way" },
  { id: "V26", path: "M 361 44 L 381 51.5 L 361 59 Z M 401 44 L 381 51.5 L 401 59 Z M 381 51.5 L 393 64 L 369 64 Z", type: "3-way" },
];

const ALL_VALVES = [...TWO_HEADED_VALVES, ...THREE_HEADED_VALVES];

export default function Home() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rawSvgContent, setRawSvgContent] = useState<string>("");
  const [valveStates, setValveStates] = useState<ValveState>(() => {
    const initial: ValveState = {};
    ALL_VALVES.forEach((v) => {
      initial[v.id] = false;
    });
    return initial;
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hoveredValve, setHoveredValve] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((component: string, action: string, state?: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        component,
        action,
        state,
      },
    ]);
  }, []);

  // Load SVG content once
  useEffect(() => {
    fetch("/schematic.svg")
      .then((res) => res.text())
      .then((content) => {
        setRawSvgContent(content);
        addLog("System", "Schematic loaded");
      });
  }, [addLog]);

  // Text labels to hide
  const HIDDEN_LABELS = [
    "Bypass", "Flow", "RegR", "RegL", "Vacuum"
  ];

  // Process SVG to add valve attributes and colors
  const processedSvgContent = useMemo(() => {
    if (!rawSvgContent) return "";

    let processed = rawSvgContent;

    // Process valves
    ALL_VALVES.forEach((valve) => {
      const isOpen = valveStates[valve.id];
      const fillColor = isOpen ? "#22c55e" : "#ef4444";
      const strokeColor = isOpen ? "#16a34a" : "#dc2626";

      // Escape special regex characters in the path
      const escapedPath = valve.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Match the path element and add data attribute and styles
      const pathRegex = new RegExp(
        `<path([^>]*?)d="${escapedPath}"([^>]*?)(/?)>`,
        "g"
      );

      processed = processed.replace(pathRegex, (match, before, after, selfClose) => {
        // Remove any existing style, data-valve-id attributes
        let newBefore = before.replace(/\s*style="[^"]*"/g, "").replace(/\s*data-valve-id="[^"]*"/g, "");
        let newAfter = after.replace(/\s*style="[^"]*"/g, "").replace(/\s*data-valve-id="[^"]*"/g, "");

        return `<path${newBefore} data-valve-id="${valve.id}" style="fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: 2; cursor: pointer;" d="${valve.path}"${newAfter}${selfClose}>`;
      });
    });

    // Hide text labels that are in the hidden list
    HIDDEN_LABELS.forEach((label) => {
      // Hide in div tags (foreignObject)
      const divRegex = new RegExp(`(>)(${label})(</div>)`, 'g');
      processed = processed.replace(divRegex, '$1<span style="opacity:0;">$2</span>$3');

      // Hide in text/tspan tags
      const textRegex = new RegExp(`(>)(${label})(</(text|tspan)>)`, 'g');
      processed = processed.replace(textRegex, '$1<tspan style="opacity:0;">$2</tspan>$3');
    });

    return processed;
  }, [rawSvgContent, valveStates]);

  const toggleValve = useCallback((valveId: string) => {
    const valve = ALL_VALVES.find((v) => v.id === valveId);
    if (!valve) return;

    setValveStates((prev) => {
      const newState = !prev[valveId];
      return { ...prev, [valveId]: newState };
    });

    // Log after state update
    const currentState = valveStates[valveId];
    const newState = !currentState;
    addLog(
      valveId,
      newState ? "OPENED" : "CLOSED",
      newState ? "OPEN" : "CLOSED"
    );
  }, [valveStates, addLog]);

  // Handle clicks on SVG using event delegation
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    const valveId = target.getAttribute?.("data-valve-id");

    if (valveId) {
      e.stopPropagation();
      e.preventDefault();
      toggleValve(valveId);
    }
  }, [toggleValve]);

  // Handle mouse move for tooltip
  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    const valveId = target.getAttribute?.("data-valve-id");

    if (valveId) {
      setHoveredValve(valveId);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredValve(null);
    }
  }, []);

  const handleSvgMouseLeave = useCallback(() => {
    setHoveredValve(null);
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 4));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target.getAttribute?.("data-valve-id")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    addLog("System", "View reset");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("System", "Logs cleared");
  };

  const closeAllValves = () => {
    const openValves = Object.entries(valveStates).filter(([_, isOpen]) => isOpen);
    if (openValves.length === 0) return;

    setValveStates((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((k) => (newState[k] = false));
      return newState;
    });
    addLog("System", `Closed all valves (${openValves.length})`, "CLOSED");
  };

  const openValveCount = Object.values(valveStates).filter(Boolean).length;
  const closedValveCount = Object.values(valveStates).filter((v) => !v).length;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Schematic Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Valve Schematic Control
            </h1>
            <p className="text-sm text-gray-500">
              {TWO_HEADED_VALVES.length} two-way valves • {THREE_HEADED_VALVES.length} three-way valves
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Zoom: {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(s * 1.2, 4))}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              +
            </button>
            <button
              onClick={() => setScale((s) => Math.max(s * 0.8, 0.5))}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              −
            </button>
            <button
              onClick={resetView}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
            >
              Reset View
            </button>
          </div>
        </header>

        {/* Status Bar */}
        <div className="bg-white border-b px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-gray-600">{openValveCount} Open</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm text-gray-600">{closedValveCount} Closed</span>
            </span>
          </div>
          <button
            onClick={closeAllValves}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
          >
            Close All Valves
          </button>
        </div>

        {/* Schematic Viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-gray-50"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
            }}
            onClick={handleSvgClick}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={handleSvgMouseLeave}
            dangerouslySetInnerHTML={{ __html: processedSvgContent }}
          />
        </div>

        {/* Tooltip */}
        {hoveredValve && (
          <div
            className="fixed z-50 px-2 py-1 text-sm bg-gray-900 text-white rounded shadow-lg pointer-events-none"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y + 12,
            }}
          >
            {hoveredValve}
            <span className="ml-2 text-gray-400">
              ({valveStates[hoveredValve] ? "Open" : "Closed"})
            </span>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-white border-t px-6 py-2 text-sm text-gray-500">
          Scroll to zoom • Drag to pan • Hover for valve names • Click to toggle
        </footer>
      </div>

      {/* Log Panel */}
      <div className="w-96 bg-white border-l flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Activity Log</h2>
          <button
            onClick={clearLogs}
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Clear
          </button>
        </div>
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs"
        >
          {logs.map((log, index) => (
            <div
              key={log.id}
              className={`p-2 rounded ${
                log.state === "OPEN"
                  ? "bg-green-50 border border-green-200"
                  : log.state === "CLOSED"
                  ? "bg-red-50 border border-red-200"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div className="flex justify-between text-gray-400">
                <span>{formatTime(log.timestamp)}</span>
                {index === 0 || formatDate(logs[index - 1].timestamp) !== formatDate(log.timestamp) ? (
                  <span>{formatDate(log.timestamp)}</span>
                ) : null}
              </div>
              <div className="text-gray-800">
                <span className="font-semibold">{log.component}</span>: {log.action}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-400 text-center py-4">No activity yet</div>
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-gray-400">
          {logs.length} log entries
        </div>
      </div>
    </div>
  );
}
