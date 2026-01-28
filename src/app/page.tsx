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


// Gas sources (bottles) that can be clicked to start flow
const GAS_SOURCES = ["Neon", "Argon", "Krypton"] as const;
type GasSource = typeof GAS_SOURCES[number];

const GAS_COLORS: { [key: string]: string } = {
  "Neon": "#f472b6",     // pink
  "Argon": "#60a5fa",    // blue
  "Krypton": "#a78bfa",  // purple
};

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
  const [probePosition, setProbePosition] = useState<"cryo" | "schleuse">("cryo");
  const [cryoDirection, setCryoDirection] = useState<"spektrometer" | "schleuse">("spektrometer");
  const [spektrometerState, setSpektrometerState] = useState<"leer" | "n2">("leer");
  // Gas source state - which bottle is active (only one at a time)
  const [activeGasSource, setActiveGasSource] = useState<"Neon" | "Argon" | "Krypton" | null>(null);
  // Flow is active when a gas source is selected
  const [showPipeLabels, setShowPipeLabels] = useState(false);
  const [logInput, setLogInput] = useState("");
  const [showTecDialog, setShowTecDialog] = useState(false);
  const [tecOn, setTecOn] = useState(false);
  const [kuehlfalle, setKuehlfalle] = useState(false);
  const [mfcOn, setMfcOn] = useState(false);
  const [cryoOn, setCryoOn] = useState(false);
  const [heaterOn, setHeaterOn] = useState(false);
  const [hvOn, setHvOn] = useState(false);
  const [mfcValue, setMfcValue] = useState("");
  // Cryo Heater temperature
  const [heaterTemp1, setHeaterTemp1] = useState("");
  // Cryo temperatures
  const [cryoTemp1, setCryoTemp1] = useState("");
  const [cryoTemp2, setCryoTemp2] = useState("");
  // TEC temperature
  const [tecTemp, setTecTemp] = useState("");
  // Pressure sensors (mbar)
  const [pressureCH1, setPressureCH1] = useState("");
  const [pressureCH2, setPressureCH2] = useState("");
  const [pressureT1, setPressureT1] = useState("");
  const [pressureT2, setPressureT2] = useState("");
  const [pressureT3, setPressureT3] = useState("");
  const [pressureT4, setPressureT4] = useState("");
  const [pressureT5, setPressureT5] = useState("");
  // Heizdrähte toggles
  const [heizdraehteFlow, setHeizdraehteFlow] = useState(false);
  const [heizdraehteTank, setHeizdraehteTank] = useState(false);
  const [heizdraehtePumpe, setHeizdraehtePumpe] = useState(false);
  const [heizdraehteMischProben, setHeizdraehteMischProben] = useState(false);
  const [heizdraehteMischAbsaug, setHeizdraehteMischAbsaug] = useState(false);
  const [heizdraehteAbpump, setHeizdraehteAbpump] = useState(false);
  const [showHeizdraehte, setShowHeizdraehte] = useState(false);
  // Messung
  const [showMessungDialog, setShowMessungDialog] = useState(false);
  const [showSchliffchenWarning, setShowSchliffchenWarning] = useState(false);
  const [showCryoWarning, setShowCryoWarning] = useState(false);
  const [messungCount, setMessungCount] = useState(0);
  const [messungDateiname, setMessungDateiname] = useState("");
  const [messungAmplitude, setMessungAmplitude] = useState("");
  const [messungPosition, setMessungPosition] = useState("");
  // Sidebar widths
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(224);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(384);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [hoveredPipe, setHoveredPipe] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("valve-schematic-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.valveStates) setValveStates(state.valveStates);
        if (state.probePosition) setProbePosition(state.probePosition);
        if (state.cryoDirection) setCryoDirection(state.cryoDirection);
        if (state.spektrometerState) setSpektrometerState(state.spektrometerState);
        if (state.activeGasSource !== undefined) setActiveGasSource(state.activeGasSource);
        if (state.tecOn !== undefined) setTecOn(state.tecOn);
        if (state.kuehlfalle !== undefined) setKuehlfalle(state.kuehlfalle);
        if (state.mfcOn !== undefined) setMfcOn(state.mfcOn);
        if (state.mfcValue !== undefined) setMfcValue(state.mfcValue);
        if (state.cryoOn !== undefined) setCryoOn(state.cryoOn);
        if (state.heaterOn !== undefined) setHeaterOn(state.heaterOn);
        if (state.hvOn !== undefined) setHvOn(state.hvOn);
        if (state.heaterTemp1 !== undefined) setHeaterTemp1(state.heaterTemp1);
        if (state.cryoTemp1 !== undefined) setCryoTemp1(state.cryoTemp1);
        if (state.cryoTemp2 !== undefined) setCryoTemp2(state.cryoTemp2);
        if (state.tecTemp !== undefined) setTecTemp(state.tecTemp);
        if (state.pressureCH1 !== undefined) setPressureCH1(state.pressureCH1);
        if (state.pressureCH2 !== undefined) setPressureCH2(state.pressureCH2);
        if (state.pressureT1 !== undefined) setPressureT1(state.pressureT1);
        if (state.pressureT2 !== undefined) setPressureT2(state.pressureT2);
        if (state.pressureT3 !== undefined) setPressureT3(state.pressureT3);
        if (state.pressureT4 !== undefined) setPressureT4(state.pressureT4);
        if (state.pressureT5 !== undefined) setPressureT5(state.pressureT5);
        if (state.heizdraehteFlow !== undefined) setHeizdraehteFlow(state.heizdraehteFlow);
        if (state.heizdraehteTank !== undefined) setHeizdraehteTank(state.heizdraehteTank);
        if (state.heizdraehtePumpe !== undefined) setHeizdraehtePumpe(state.heizdraehtePumpe);
        if (state.heizdraehteMischProben !== undefined) setHeizdraehteMischProben(state.heizdraehteMischProben);
        if (state.heizdraehteMischAbsaug !== undefined) setHeizdraehteMischAbsaug(state.heizdraehteMischAbsaug);
        if (state.heizdraehteAbpump !== undefined) setHeizdraehteAbpump(state.heizdraehteAbpump);
        if (state.leftSidebarWidth !== undefined) setLeftSidebarWidth(state.leftSidebarWidth);
        if (state.rightSidebarWidth !== undefined) setRightSidebarWidth(state.rightSidebarWidth);
        if (state.messungCount !== undefined) setMessungCount(state.messungCount);
        if (state.showHeizdraehte !== undefined) setShowHeizdraehte(state.showHeizdraehte);
        if (state.showPipeLabels !== undefined) setShowPipeLabels(state.showPipeLabels);
        if (state.logs) {
          setLogs(state.logs.map((log: { id: number; timestamp: string; action: string; component: string; state?: string }) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          })));
        }
      } catch (e) {
        console.error("Failed to load saved state:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    const state = {
      valveStates,
      probePosition,
      cryoDirection,
      spektrometerState,
      activeGasSource,
      tecOn,
      kuehlfalle,
      mfcOn,
      mfcValue,
      cryoOn,
      heaterOn,
      hvOn,
      heaterTemp1,
      cryoTemp1,
      cryoTemp2,
      tecTemp,
      pressureCH1,
      pressureCH2,
      pressureT1,
      pressureT2,
      pressureT3,
      pressureT4,
      pressureT5,
      heizdraehteFlow,
      heizdraehteTank,
      heizdraehtePumpe,
      heizdraehteMischProben,
      heizdraehteMischAbsaug,
      heizdraehteAbpump,
      leftSidebarWidth,
      rightSidebarWidth,
      messungCount,
      showHeizdraehte,
      showPipeLabels,
      logs,
    };
    localStorage.setItem("valve-schematic-state", JSON.stringify(state));
  }, [isLoaded, valveStates, probePosition, cryoDirection, spektrometerState, activeGasSource, tecOn, kuehlfalle, mfcOn, mfcValue, cryoOn, heaterOn, hvOn, heaterTemp1, cryoTemp1, cryoTemp2, tecTemp, pressureCH1, pressureCH2, pressureT1, pressureT2, pressureT3, pressureT4, pressureT5, heizdraehteFlow, heizdraehteTank, heizdraehtePumpe, heizdraehteMischProben, heizdraehteMischAbsaug, heizdraehteAbpump, leftSidebarWidth, rightSidebarWidth, messungCount, showHeizdraehte, showPipeLabels, logs]);

  const addLog = useCallback((component: string, action: string, state?: string) => {
    const timestamp = new Date();
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        timestamp,
        component,
        action,
        state,
      },
    ]);

    // Write to file in real time
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: timestamp.toISOString(),
        component,
        action,
        state,
      }),
    }).catch(console.error);
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

    // Replace "Sample Tray" with probe position
    const probeLabel = probePosition === "cryo" ? "Schliffchen in Cryo" : "Schliffchen in Schleuse";
    processed = processed.replace(/>Sample Tray</g, `>${probeLabel}<`);

    // Replace "Mirror in Cryostat" with cryo direction
    const cryoLabel = cryoDirection === "spektrometer" ? "Cryo zum Spektrometer" : "Cryo zur Schleuse";
    processed = processed.replace(/>Mirror in Cryostat</g, `>${cryoLabel}<`);

    // Replace "Spectrometer" with spektrometer state
    const spektrometerLabel = spektrometerState === "leer" ? "Spektrometer (leer)" : "Spektrometer (N2 befüllt)";
    processed = processed.replace(/>Spectrometer</g, `>${spektrometerLabel}<`);

    // Make gas bottle rectangles clickable
    // Gas bottle positions: Neon at y=470, Argon at y=510, Krypton at y=550 (all at x=801)
    const gasBottlePositions: { [key: string]: string } = {
      "Neon": 'x="801" y="470"',
      "Argon": 'x="801" y="510"',
      "Krypton": 'x="801" y="550"',
    };

    GAS_SOURCES.forEach((gas) => {
      const isActive = activeGasSource === gas;
      const fillColor = isActive ? GAS_COLORS[gas] : "#ffffff";
      const pos = gasBottlePositions[gas];

      // Find the rect element for this gas bottle and make it clickable
      const rectRegex = new RegExp(
        `(<rect ${pos}[^>]*)(style="[^"]*")([^>]*/>)`,
        'g'
      );
      processed = processed.replace(rectRegex,
        `$1data-gas-source="${gas}" style="fill: ${fillColor}; stroke: #000000; stroke-width: 3; cursor: pointer;"$3`
      );
    });

    // Add pipe IDs to all line paths for identification
    if (showPipeLabels) {
      let pipeCounter = 1;
      // Match simple line paths (not valve triangles which have Z)
      processed = processed.replace(
        /(<path[^>]*d=")(M [0-9.]+ [0-9.]+ L [0-9.]+ [0-9.]+)("[^>]*)(style="[^"]*")([^>]*>)/g,
        (match, before, pathD, middle, style, after) => {
          const pipeId = `P${pipeCounter++}`;
          return `${before}${pathD}${middle}data-pipe-id="${pipeId}" data-pipe-path="${pathD}" ${style} cursor: pointer;"${after}`;
        }
      );
    }

    return processed;
  }, [rawSvgContent, valveStates, probePosition, cryoDirection, spektrometerState, showPipeLabels, activeGasSource]);

  const toggleValve = useCallback((valveId: string) => {
    const valve = ALL_VALVES.find((v) => v.id === valveId);
    if (!valve) return;

    // Check if it's a 3-way valve - if so, toggle all 3-way valves together
    if (valve.type === "3-way") {
      const currentState = valveStates[valveId];
      const newState = !currentState;

      // V24 and V25 are linked, V23 and V26 are linked
      const group1 = ["V24", "V25"];
      const group2 = ["V23", "V26"];

      setValveStates((prev) => {
        const updated = { ...prev };
        if (group1.includes(valveId)) {
          group1.forEach((id) => { updated[id] = newState; });
        } else if (group2.includes(valveId)) {
          group2.forEach((id) => { updated[id] = newState; });
        }
        return updated;
      });

      if (group1.includes(valveId)) {
        addLog("Turbo Cryo", newState ? "in" : "out", newState ? "IN" : "OUT");
      } else {
        addLog("Turbo", newState ? "in" : "out", newState ? "IN" : "OUT");
      }
      return;
    }

    setValveStates((prev) => {
      const newState = !prev[valveId];
      return { ...prev, [valveId]: newState };
    });

    // Log after state update
    const currentState = valveStates[valveId];
    const newState = !currentState;
    addLog(
      `${valveId} Ventil`,
      newState ? "OPENED" : "CLOSED",
      newState ? "OPEN" : "CLOSED"
    );
  }, [valveStates, addLog]);

  // Toggle gas source (bottle) on/off
  const activeGasSourceRef = useRef<GasSource | null>(null);

  // Sync ref with loaded state
  useEffect(() => {
    activeGasSourceRef.current = activeGasSource;
  }, [activeGasSource]);

  const toggleGasSource = useCallback((gas: GasSource) => {
    const prev = activeGasSourceRef.current;

    if (prev === gas) {
      activeGasSourceRef.current = null;
      setActiveGasSource(null);
      addLog(gas, "Gas bottle closed", "CLOSED");
    } else {
      if (prev) {
        addLog(prev, "Gas bottle closed", "CLOSED");
      }
      activeGasSourceRef.current = gas;
      setActiveGasSource(gas);
      addLog(gas, "Gas bottle opened", "OPEN");
    }
  }, [addLog]);

  // Handle clicks on SVG using event delegation
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    const valveId = target.getAttribute?.("data-valve-id");
    const gasSource = target.getAttribute?.("data-gas-source") as GasSource | null;

    if (valveId) {
      e.stopPropagation();
      e.preventDefault();
      toggleValve(valveId);
    } else if (gasSource) {
      e.stopPropagation();
      e.preventDefault();
      toggleGasSource(gasSource);
    }
  }, [toggleValve, toggleGasSource]);

  // Handle mouse move for tooltip
  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    const valveId = target.getAttribute?.("data-valve-id");
    const pipeId = target.getAttribute?.("data-pipe-id");
    const pipePath = target.getAttribute?.("data-pipe-path");

    if (valveId) {
      setHoveredValve(valveId);
      setHoveredPipe(null);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else if (pipeId && pipePath && showPipeLabels) {
      setHoveredPipe(`${pipeId}: ${pipePath}`);
      setHoveredValve(null);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredValve(null);
      setHoveredPipe(null);
    }
  }, [showPipeLabels]);

  const handleSvgMouseLeave = useCallback(() => {
    setHoveredValve(null);
  }, []);

  // Right-click to copy pipe path
  const handleSvgContextMenu = useCallback((e: React.MouseEvent) => {
    if (!showPipeLabels) return;

    const target = e.target as Element;
    const pipePath = target.getAttribute?.("data-pipe-path");

    if (pipePath) {
      e.preventDefault();
      navigator.clipboard.writeText(pipePath).then(() => {
        addLog("System", `Copied: ${pipePath}`);
      });
    }
  }, [showPipeLabels, addLog]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Sidebar resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(150, Math.min(400, e.clientX));
        setLeftSidebarWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };
    if (isResizingLeft || isResizingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingLeft, isResizingRight]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 4));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    // Don't start dragging if clicking on valves or gas bottles
    if (target.getAttribute?.("data-valve-id") || target.getAttribute?.("data-gas-source")) {
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
    setMessungCount(0);
    // Clear the log file
    fetch('/api/log', { method: 'DELETE' }).catch(console.error);
    addLog("System", "Logs cleared");
  };

  const deleteLog = (id: number) => {
    setLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const downloadLogs = () => {
    const logText = logs.map(log => {
      const time = log.timestamp.toLocaleString();
      return `[${time}] ${log.component}: ${log.action}${log.state ? ` (${log.state})` : ''}`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valve-log-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const toggleProbePosition = () => {
    const newPos = probePosition === "cryo" ? "schleuse" : "cryo";
    // Warn if trying to go to cryo while cryoDirection is spektrometer
    if (newPos === "cryo" && cryoDirection === "spektrometer") {
      setShowSchliffchenWarning(true);
      return;
    }
    executeProbeToggle(newPos);
  };

  const executeProbeToggle = (newPos: "cryo" | "schleuse") => {
    setProbePosition(newPos);
    addLog("Schliffchen", newPos === "cryo" ? "in Cryo" : "in Schleuse");
    // Only ask about TEC restart if TEC is on
    if (tecOn) {
      setShowTecDialog(true);
    }
  };

  const handleSchliffchenWarning = (proceed: boolean) => {
    setShowSchliffchenWarning(false);
    if (proceed) {
      executeProbeToggle("cryo");
    }
  };

  const handleTecResponse = (restart: boolean) => {
    setShowTecDialog(false);
    if (restart) {
      addLog("TEC", "restarted");
    }
  };

  const toggleTec = () => {
    const newState = !tecOn;
    setTecOn(newState);
    addLog("TEC", newState ? "ON" : "OFF", newState ? "ON" : "OFF");
  };

  const toggleKuehlfalle = () => {
    const newState = !kuehlfalle;
    setKuehlfalle(newState);
    addLog("Kühlfalle", newState ? "ja" : "nein");
  };

  const toggleMfc = () => {
    const newState = !mfcOn;
    setMfcOn(newState);
    addLog("MFC", newState ? "ON" : "OFF", newState ? "ON" : "OFF");
    if (!newState) {
      setMfcValue("");
    }
  };

  const toggleCryo = () => {
    const newState = !cryoOn;
    setCryoOn(newState);
    addLog("Cryo", newState ? "ON" : "OFF", newState ? "ON" : "OFF");
  };

  const toggleHeater = () => {
    const newState = !heaterOn;
    setHeaterOn(newState);
    addLog("Cryo Heater", newState ? "ON" : "OFF", newState ? "ON" : "OFF");
  };

  // Heizdrähte toggles
  const toggleHeizdraehte = (name: string, current: boolean, setter: (v: boolean) => void) => {
    const newState = !current;
    setter(newState);
    addLog(`Heizdrähte ${name}`, newState ? "ON" : "OFF", newState ? "ON" : "OFF");
  };

  // Temperature/Pressure logging
  const logTemperature = (name: string, value: string, unit: string = "K") => {
    if (value.trim()) addLog(name, `${value} ${unit}`);
  };

  const formatScientific = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    const exp = num.toExponential();
    const [mantissa, exponent] = exp.split('e');
    const superscripts: { [key: string]: string } = {
      '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': ''
    };
    const superExp = exponent.split('').map(c => superscripts[c] || c).join('');
    return `${parseFloat(mantissa)} × 10${superExp}`;
  };

  const logPressure = (name: string, value: string) => {
    if (value.trim()) {
      const isT = name.startsWith('T') && name.length === 2;
      const formatted = isT ? formatScientific(value) : value;
      addLog(name, `${formatted} mbar`);
    }
  };

  const submitMessung = () => {
    const newCount = messungCount + 1;
    setMessungCount(newCount);
    addLog(`Messung ${newCount}`, `Dateiname: ${messungDateiname}, Amplitude: ${messungAmplitude}, Position: ${messungPosition}`);
    setMessungDateiname("");
    setMessungAmplitude("");
    setMessungPosition("");
    setShowMessungDialog(false);
  };

  const toggleHv = () => {
    const newState = !hvOn;
    setHvOn(newState);
    addLog("HV", newState ? "ON" : "OFF", newState ? "ON" : "OFF");
  };

  const handleMfcValueSubmit = (value: string) => {
    if (value.trim()) {
      addLog("MFC", value.trim());
    }
  };

  const toggleCryoDirection = () => {
    const newDir = cryoDirection === "spektrometer" ? "schleuse" : "spektrometer";
    // Warn if trying to go to spektrometer while probe is in cryo
    if (newDir === "spektrometer" && probePosition === "cryo") {
      setShowCryoWarning(true);
      return;
    }
    executeCryoToggle(newDir);
  };

  const executeCryoToggle = (newDir: "spektrometer" | "schleuse") => {
    setCryoDirection(newDir);
    addLog("Cryo", newDir === "spektrometer" ? "Zum Spektrometer" : "Zur Schleuse");
  };

  const handleCryoWarning = (proceed: boolean) => {
    setShowCryoWarning(false);
    if (proceed) {
      executeCryoToggle("spektrometer");
    }
  };

  const toggleSpektrometerState = () => {
    const newState = spektrometerState === "leer" ? "n2" : "leer";
    setSpektrometerState(newState);
    addLog("Spektrometer", newState === "leer" ? "Leer" : "N2 befüllt");
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
            {activeGasSource && (
              <span
                className="px-3 py-1 text-white rounded text-sm font-medium"
                style={{ backgroundColor: GAS_COLORS[activeGasSource] }}
              >
                Gas: {activeGasSource}
              </span>
            )}
            <button
              onClick={() => setShowPipeLabels((prev) => !prev)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                showPipeLabels
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              {showPipeLabels ? "Pipes: ON" : "Pipes: OFF"}
            </button>
          </div>
        </header>

        {/* Main content area with left sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Controls */}
          <div className="bg-white border-r flex flex-col p-4 gap-3 overflow-y-auto relative" style={{ width: leftSidebarWidth }}>
            {/* Resize handle */}
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
              onMouseDown={() => setIsResizingLeft(true)}
            />
            {/* Valve Status */}
            <div className="flex flex-col gap-2 pb-3 border-b">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-sm text-gray-600">{openValveCount} Open</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-sm text-gray-600">{closedValveCount} Closed</span>
              </span>
            </div>

            {/* Messung Button */}
            <button
              onClick={() => setShowMessungDialog(true)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
            >
              Messung
            </button>

            {/* Toggle Buttons */}
            <button
              onClick={toggleCryo}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                cryoOn
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {cryoOn ? "Cryo on" : "Cryo off"}
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">T1:</span>
                <input
                  type="number"
                  value={cryoTemp1}
                  onChange={(e) => setCryoTemp1(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && logTemperature("Cryo T1", cryoTemp1)}
                  placeholder="Temp"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">K</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">T2:</span>
                <input
                  type="number"
                  value={cryoTemp2}
                  onChange={(e) => setCryoTemp2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && logTemperature("Cryo T2", cryoTemp2)}
                  placeholder="Temp"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">K</span>
              </div>
            </div>
            <button
              onClick={toggleProbePosition}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                probePosition === "cryo"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
            >
              {probePosition === "cryo" ? "Schliffchen in Cryo" : "Schliffchen in Schleuse"}
            </button>
            <button
              onClick={toggleCryoDirection}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                cryoDirection === "spektrometer"
                  ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {cryoDirection === "spektrometer" ? "Cryo zum Spektrometer" : "Cryo zur Schleuse"}
            </button>
            <button
              onClick={toggleSpektrometerState}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                spektrometerState === "leer"
                  ? "bg-gray-500 hover:bg-gray-600 text-white"
                  : "bg-teal-500 hover:bg-teal-600 text-white"
              }`}
            >
              {spektrometerState === "leer" ? "Spektrometer (leer)" : "Spektrometer (N2 befüllt)"}
            </button>
            <button
              onClick={toggleTec}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                tecOn
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {tecOn ? "TEC on" : "TEC off"}
            </button>
            {tecOn && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tecTemp}
                  onChange={(e) => setTecTemp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && logTemperature("TEC Temp", tecTemp, "°C")}
                  placeholder="Temp"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">°C</span>
              </div>
            )}
            <button
              onClick={toggleKuehlfalle}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                kuehlfalle
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {kuehlfalle ? "Kühlfalle ja" : "Kühlfalle nein"}
            </button>
            <button
              onClick={toggleMfc}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                mfcOn
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {mfcOn ? "MFC on" : "MFC off"}
            </button>
            {mfcOn && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={mfcValue}
                  onChange={(e) => setMfcValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleMfcValueSubmit(mfcValue);
                    }
                  }}
                  placeholder="0"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
              </div>
            )}
            <button
              onClick={toggleHeater}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                heaterOn
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {heaterOn ? "Cryo Heater on" : "Cryo Heater off"}
            </button>
            {heaterOn && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={heaterTemp1}
                  onChange={(e) => setHeaterTemp1(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && logTemperature("Cryo Heater", heaterTemp1)}
                  placeholder="Temp"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">K</span>
              </div>
            )}
            <button
              onClick={toggleHv}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                hvOn
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {hvOn ? "HV on" : "HV off"}
            </button>

            {/* Heizdrähte Submenu */}
            <div className="border-t pt-3">
              <button
                onClick={() => setShowHeizdraehte(!showHeizdraehte)}
                className="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium flex justify-between items-center"
              >
                Heizdrähte
                <span>{showHeizdraehte ? "▲" : "▼"}</span>
              </button>
              {showHeizdraehte && (
                <div className="mt-2 flex flex-col gap-2 pl-2">
                  <button
                    onClick={() => toggleHeizdraehte("Flow", heizdraehteFlow, setHeizdraehteFlow)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium ${heizdraehteFlow ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    Flow {heizdraehteFlow ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => toggleHeizdraehte("Tank", heizdraehteTank, setHeizdraehteTank)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium ${heizdraehteTank ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    Tank {heizdraehteTank ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => toggleHeizdraehte("Pumpe", heizdraehtePumpe, setHeizdraehtePumpe)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium ${heizdraehtePumpe ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    Pumpe {heizdraehtePumpe ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => toggleHeizdraehte("Mischanlage + Probenleitung", heizdraehteMischProben, setHeizdraehteMischProben)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium ${heizdraehteMischProben ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    Mischanlage + Probenleitung {heizdraehteMischProben ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => toggleHeizdraehte("Mischanlage + Absauganlage", heizdraehteMischAbsaug, setHeizdraehteMischAbsaug)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium ${heizdraehteMischAbsaug ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    Mischanlage + Absauganlage {heizdraehteMischAbsaug ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => toggleHeizdraehte("Abpumpleitungsschleuse", heizdraehteAbpump, setHeizdraehteAbpump)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium ${heizdraehteAbpump ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    Abpumpleitungsschleuse {heizdraehteAbpump ? "on" : "off"}
                  </button>
                </div>
              )}
            </div>

            {/* Close All Valves */}
            <div className="pt-3 border-t mt-auto">
              <button
                onClick={closeAllValves}
                className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
              >
                Close All Valves
              </button>
            </div>
          </div>

          {/* Schematic Viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-gray-50 relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Pressure Sensors Panel */}
          <div className="absolute top-2 right-2 bg-white border rounded shadow-md p-3 z-10">
            <h3 className="text-xs font-semibold mb-2 text-gray-700">Pressure Sensors (mbar)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "CH1", value: pressureCH1, setter: setPressureCH1, scientific: false },
                { label: "CH2", value: pressureCH2, setter: setPressureCH2, scientific: false },
                { label: "T1", value: pressureT1, setter: setPressureT1, scientific: true },
                { label: "T2", value: pressureT2, setter: setPressureT2, scientific: true },
                { label: "T3", value: pressureT3, setter: setPressureT3, scientific: true },
                { label: "T4", value: pressureT4, setter: setPressureT4, scientific: true },
                { label: "T5", value: pressureT5, setter: setPressureT5, scientific: true },
              ].map(({ label, value, setter, scientific }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-8 text-gray-600">{label}:</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && logPressure(label, value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`px-1 py-0.5 border rounded text-xs ${scientific ? "w-20" : "w-16"}`}
                    placeholder={scientific ? "1.0e-5" : "0"}
                  />
                </div>
              ))}
            </div>
          </div>
          <div
            className="w-full h-full flex items-center justify-center relative"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <div
              onClick={handleSvgClick}
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
              onContextMenu={handleSvgContextMenu}
              dangerouslySetInnerHTML={{ __html: processedSvgContent }}
            />
          </div>
        </div>
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
        {hoveredPipe && showPipeLabels && (
          <div
            className="fixed z-50 px-3 py-2 text-xs bg-yellow-900 text-yellow-100 rounded shadow-lg pointer-events-none font-mono max-w-md"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y + 12,
            }}
          >
            {hoveredPipe}
          </div>
        )}

        {/* TEC Restart Dialog */}
        {showTecDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">TEC neustarten?</h3>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleTecResponse(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  Nein
                </button>
                <button
                  onClick={() => handleTecResponse(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Ja
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schliffchen Warning Dialog */}
        {showSchliffchenWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Warnung</h3>
              <p className="text-gray-600 mb-4">Cryo ist zum Spektrometer gerichtet. Wirklich fortfahren?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleSchliffchenWarning(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleSchliffchenWarning(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded"
                >
                  Fortfahren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cryo Direction Warning Dialog */}
        {showCryoWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Warnung</h3>
              <p className="text-gray-600 mb-4">Schliffchen ist im Cryo. Wirklich fortfahren?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleCryoWarning(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleCryoWarning(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded"
                >
                  Fortfahren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messung Dialog */}
        {showMessungDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-80">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Messung {messungCount + 1}</h3>
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Dateiname</label>
                  <input
                    type="text"
                    value={messungDateiname}
                    onChange={(e) => setMessungDateiname(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amplitude</label>
                  <input
                    type="text"
                    value={messungAmplitude}
                    onChange={(e) => setMessungAmplitude(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Position</label>
                  <input
                    type="text"
                    value={messungPosition}
                    onChange={(e) => setMessungPosition(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMessungDialog(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={submitMessung}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-white border-t px-6 py-2 text-sm text-gray-500">
          Scroll to zoom • Drag to pan • Hover for valve names • Click to toggle
        </footer>
      </div>

      {/* Log Panel */}
      <div className="bg-white border-l flex flex-col relative" style={{ width: rightSidebarWidth }}>
        {/* Resize handle */}
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors"
          onMouseDown={() => setIsResizingRight(true)}
        />
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Activity Log</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadLogs}
              className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Download
            </button>
            <button
              onClick={clearLogs}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Clear
            </button>
          </div>
        </div>
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs"
        >
          {logs.map((log, index) => (
            <div
              key={log.id}
              className={`p-2 rounded relative group ${
                log.state === "OPEN"
                  ? "bg-green-50 border border-green-200"
                  : log.state === "CLOSED"
                  ? "bg-red-50 border border-red-200"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <button
                onClick={() => deleteLog(log.id)}
                className="absolute top-1 right-1 w-5 h-5 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded flex items-center justify-center text-sm font-bold"
                title="Delete entry"
              >
                x
              </button>
              <div className="flex justify-between text-gray-400 pr-5">
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
        <div className="border-t px-4 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (logInput.trim()) {
                addLog("User", logInput.trim());
                setLogInput("");
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              placeholder="Add note..."
              className="flex-1 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Add
            </button>
          </form>
          <div className="text-xs text-gray-400 mt-1">{logs.length} log entries</div>
        </div>
      </div>
    </div>
  );
}
