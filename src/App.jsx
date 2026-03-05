import { useState, useRef, useEffect, useCallback } from "react";

const LANGUAGES = [
  {
    id: "python", label: "Python", icon: "🐍",
    template: 'print("Hello from Python!")\n\nfor i in range(5):\n    print(f"  -> iteration {i}")',
  },
  {
    id: "javascript", label: "JavaScript", icon: "⚡",
    template: 'console.log("Hello from JavaScript!");\n\nconst fib = n => n <= 1 ? n : fib(n-1) + fib(n-2);\nconsole.log("fib(10) =", fib(10));',
  },
  {
    id: "go", label: "Go", icon: "🔵",
    template: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from Go!")\n\n\tfor i := 0; i < 5; i++ {\n\t\tfmt.Printf("  -> iteration %d\\n", i)\n\t}\n}',
  },
];

const BACKEND = "http://localhost:8080";

export default function Playground() {
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [output, setOutput] = useState(null); // null = idle
  const [isError, setIsError] = useState(false);
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState(null);
  const textareaRef = useRef(null);

  const switchLang = (l) => {
    setLang(l);
    setCode(l.template);
    setOutput(null);
    setIsError(false);
    setExecTime(null);
  };

  const runCode = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    setIsError(false);
    const t0 = performance.now();
    try {
      const res = await fetch(`${BACKEND}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang.id, code }),
      });
      const data = await res.json();
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setExecTime(elapsed);
      if (data.stderr && !data.stdout) {
        setOutput(data.stderr);
        setIsError(true);
      } else if (data.stderr) {
        setOutput((data.stdout || "") + "\n[stderr]\n" + data.stderr);
        setIsError(false);
      } else {
        setOutput(data.stdout || "(no output)");
        setIsError(false);
      }
    } catch (e) {
      setOutput(`Could not reach backend at ${BACKEND}\n\nMake sure your Go server is running:\n  go run main.go`);
      setIsError(true);
      setExecTime(null);
    }
    setRunning(false);
  }, [code, lang, running]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runCode]);

  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      const s = ta.selectionStart;
      const newCode = code.slice(0, s) + "  " + code.slice(ta.selectionEnd);
      setCode(newCode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
    }
  };

  const lineCount = code.split("\n").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0b",
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      color: "#d4d4d8",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 99px; }

        .run-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #18181b; border: 1px solid #3f3f46;
          color: #a1f4c5; font-family: inherit; font-size: 12px; font-weight: 600;
          letter-spacing: 0.06em; padding: 8px 18px; border-radius: 6px;
          cursor: pointer; transition: all 0.15s ease;
        }
        .run-btn:hover:not(:disabled) {
          background: #1c1c20; border-color: #52c77e;
          box-shadow: 0 0 12px rgba(82,199,126,0.15);
        }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .lang-btn {
          background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 12px; font-weight: 500;
          padding: 6px 14px; border-radius: 5px;
          color: #52525b; transition: all 0.12s;
          display: flex; align-items: center; gap: 6px;
        }
        .lang-btn.active { background: #18181b; color: #a1f4c5; border: 1px solid #27272a; }
        .lang-btn:hover:not(.active) { color: #a1a1aa; }

        .code-ta {
          width: 100%; height: 100%;
          background: transparent; border: none; outline: none; resize: none;
          color: #d4d4d8; font-family: inherit; font-size: 13px; line-height: 1.75;
          padding: 18px 18px 18px 0; caret-color: #52c77e;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .output-appear { animation: fadeUp 0.2s ease both; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin {
          width: 12px; height: 12px;
          border: 2px solid #27272a; border-top-color: #52c77e;
          border-radius: 50%; animation: spin 0.6s linear infinite;
          display: inline-block; flex-shrink: 0;
        }

        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .cursor { display: inline-block; width: 6px; height: 13px; background: #52c77e; vertical-align: middle; margin-left: 2px; animation: pulse 1s step-end infinite; }
      `}</style>

      {/* Header */}
      <div style={{
        height: 48, borderBottom: "1px solid #18181b",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
            color: "#52c77e", textTransform: "uppercase",
          }}>RITZPAD</span>
          <span style={{ color: "#27272a", fontSize: 14 }}>|</span>
          <span style={{ fontSize: 11, color: "#3f3f46" }}>live code runner</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, color: "#3f3f46" }}>ctrl+enter to run</span>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: running ? "#facc15" : "#52c77e",
            boxShadow: running ? "0 0 6px #facc15" : "0 0 6px #52c77e",
            transition: "all 0.3s",
          }} />
        </div>
      </div>

      {/* Lang tabs + Run */}
      <div style={{
        height: 44, borderBottom: "1px solid #18181b",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              className={`lang-btn ${lang.id === l.id ? "active" : ""}`}
              onClick={() => switchLang(l)}
            >
              <span>{l.icon}</span>{l.label}
            </button>
          ))}
        </div>
        <button className="run-btn" onClick={runCode} disabled={running}>
          {running ? <span className="spin" /> : <span>▶</span>}
          {running ? "running..." : "Run"}
        </button>
      </div>

      {/* Editor + Output */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "1fr 1px 1fr",
        overflow: "hidden",
        minHeight: 0,
      }}>
        {/* Editor */}
        <div style={{ display: "flex", overflow: "hidden", minHeight: 0 }}>
          {/* Line numbers */}
          <div style={{
            padding: "18px 10px 18px 16px",
            textAlign: "right", userSelect: "none",
            color: "#27272a", fontSize: 13, lineHeight: 1.75,
            minWidth: 48, flexShrink: 0,
            borderRight: "1px solid #18181b",
          }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="code-ta"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={handleTab}
            spellCheck={false}
            style={{ paddingLeft: 16 }}
          />
        </div>

        {/* Divider */}
        <div style={{ background: "#18181b" }} />

        {/* Output */}
        <div style={{
          display: "flex", flexDirection: "column",
          overflow: "hidden", minHeight: 0,
          background: "#0d0d0e",
        }}>
          {/* Output header */}
          <div style={{
            height: 36, borderBottom: "1px solid #18181b",
            display: "flex", alignItems: "center",
            padding: "0 18px", gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#3f3f46", textTransform: "uppercase" }}>
              output
            </span>
            {execTime && !running && (
              <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>
                {execTime}s
              </span>
            )}
            {output && !running && (
              <button onClick={() => { setOutput(null); setExecTime(null); }} style={{
                marginLeft: execTime ? 8 : "auto",
                background: "none", border: "none", color: "#3f3f46",
                cursor: "pointer", fontFamily: "inherit", fontSize: 10,
              }}>clear</button>
            )}
          </div>

          {/* Output body */}
          <div style={{ flex: 1, overflow: "auto", padding: "18px" }}>
            {output === null && !running && (
              <div style={{ color: "#27272a", fontSize: 12 }}>
                <span style={{ color: "#1c1c1e" }}>$</span> awaiting execution...
              </div>
            )}

            {running && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#3f3f46", fontSize: 12 }}>
                <span className="spin" />
                executing...
              </div>
            )}

            {output !== null && !running && (
              <div className="output-appear">
                <div style={{ color: "#27272a", fontSize: 11, marginBottom: 12 }}>
                  $ {lang.id === "python" ? "python" : lang.id === "javascript" ? "node" : "go run"} main{lang.id === "python" ? ".py" : lang.id === "javascript" ? ".js" : ".go"}
                </div>
                <pre style={{
                  fontFamily: "inherit", fontSize: 13, lineHeight: 1.75,
                  color: isError ? "#f87171" : "#a1f4c5",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {output}
                </pre>
                <div style={{ marginTop: 14, color: "#27272a", fontSize: 11 }}>
                  ── done ──
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        height: 28, borderTop: "1px solid #18181b",
        display: "flex", alignItems: "center", padding: "0 20px",
        gap: 20, flexShrink: 0,
      }}>
        {[
          { label: "backend", value: "localhost:8080" },
          { label: "timeout", value: "5s" },
          { label: "runtime", value: lang.id === "python" ? "python" : lang.id === "javascript" ? "node" : "go run" },
          { label: "lines", value: lineCount },
        ].map(({ label, value }) => (
          <span key={label} style={{ fontSize: 10, color: "#27272a" }}>
            <span style={{ color: "#3f3f46" }}>{label}</span>
            {" "}{value}
          </span>
        ))}
      </div>
    </div>
  );
}
