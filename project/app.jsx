/* ============================================================
   主应用：窗口外壳 + 导航 + 状态 + 修改流程
   ============================================================ */

const NAV = [
  { id: "ids", label: "设备标识", icon: "id" },
  { id: "history", label: "历史与备份", icon: "history" },
  { id: "logs", label: "日志输出", icon: "terminal" },
  { id: "settings", label: "设置", icon: "settings" },
];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

/* ---------- 应用更改进度遮罩 ---------- */
function ApplyOverlay({ items, done }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "grid", placeItems: "center",
      background: "color-mix(in oklch, var(--bg-window) 55%, transparent)", backdropFilter: "blur(3px)", animation: "pop .2s ease" }}>
      <div className="card" style={{ width: 380, boxShadow: "var(--shadow-pop)", padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center",
            background: done ? "var(--ok)" : "var(--accent)", color: "#fff", transition: "background .3s" }}>
            <Icon name={done ? "check" : "zap"} size={20} style={done ? null : { animation: "spin .8s linear infinite" }} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{done ? "更改已应用" : "正在写入设备标识…"}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{done ? "全部完成，已记录日志" : "请勿关闭窗口"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {items.map((it, i) => (
            <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
              opacity: it.state === "wait" ? 0.4 : 1, transition: "opacity .2s" }}>
              <span style={{ width: 16, height: 16, display: "grid", placeItems: "center", color: "var(--accent-strong)" }}>
                {it.state === "done" ? <Icon name="check" size={14} style={{ color: "var(--ok)" }} />
                  : it.state === "run" ? <Icon name="refresh" size={13} style={{ animation: "spin .8s linear infinite" }} />
                  : <span className="dot" style={{ background: "var(--border-strong)" }} />}
              </span>
              <span style={{ flex: 1, fontWeight: it.state === "run" ? 700 : 500 }}>{it.label}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{it.state === "done" ? "✓" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App({ tweakVars = {} }) {
  const [view, setView] = useState("ids");
  const [identifiers, setIdentifiers] = useState(buildIdentifiers);
  const [logs, setLogs] = useState(SEED_LOGS);
  const [snapshots, setSnapshots] = useState(SEED_SNAPSHOTS);
  const [toasts, setToasts] = useState([]);
  const [fingerprint, setFingerprint] = useState(shortHash);
  const [applying, setApplying] = useState(null); // {items, done}
  const [diagnosing, setDiagnosing] = useState(false);
  const [opts, setOpts] = useState({ autoBackup: true, confirm: false, verboseLog: false });

  const addLog = (lvl, msg) => setLogs(L => [...L, { t: nowTime(), lvl, msg }]);
  const toast = (type, msg, desc) => {
    const id = Math.random();
    setToasts(T => [...T, { id, type, msg, desc }]);
    setTimeout(() => setToasts(T => T.filter(t => t.id !== id)), 3400);
  };

  /* ---- 标识操作 ---- */
  const setStage = (key) => setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, staged: i.gen() } : i));
  const clearStage = (key) => setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, staged: null } : i));
  const toggleLock = (key) => {
    setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, locked: !i.locked, staged: !i.locked ? null : i.staged } : i));
  };
  const resetOne = (key) => {
    setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, value: i.original, staged: null } : i));
    const it = identifiers.find(i => i.key === key);
    addLog("ok", `已还原「${it.label}」为原始值`);
    toast("ok", "已还原", it.label);
    setFingerprint(shortHash());
  };
  const stageAll = () => {
    setIdentifiers(ids => ids.map(i => i.locked ? i : { ...i, staged: i.gen() }));
    addLog("info", "已为所有未锁定标识生成新值（待应用）");
  };
  const resetAll = () => {
    setIdentifiers(ids => ids.map(i => ({ ...i, value: i.original, staged: null })));
    addLog("ok", "已将全部标识还原为原始值");
    toast("ok", "全部已还原", "所有标识恢复到出厂基线");
    setFingerprint(shortHash());
  };

  /* ---- 应用更改：自动快照 + 进度动画 ---- */
  const applyAll = () => {
    const pending = identifiers.filter(i => i.staged != null && i.staged !== i.value);
    if (pending.length === 0) return;

    if (opts.autoBackup) {
      const snap = { id: "snap-" + Date.now(), name: "应用前自动备份", time: "刚刚", auto: true, changes: pending.length, note: "应用更改时自动创建" };
      setSnapshots(S => [snap, ...S]);
      addLog("ok", `已创建自动快照（${pending.length} 项变更）`);
    }

    let items = pending.map(p => ({ key: p.key, label: p.label, state: "wait" }));
    setApplying({ items, done: false });
    addLog("info", `开始应用 ${pending.length} 项标识更改…`);

    let idx = 0;
    const step = () => {
      if (idx >= items.length) {
        setIdentifiers(ids => ids.map(i => (i.staged != null && i.staged !== i.value) ? { ...i, value: i.staged, staged: null } : i));
        setFingerprint(shortHash());
        items = items.map(it => ({ ...it, state: "done" }));
        setApplying({ items, done: true });
        addLog("ok", `全部 ${pending.length} 项标识已成功写入`);
        toast("ok", "更改已应用", `${pending.length} 项设备标识已更新`);
        setTimeout(() => setApplying(null), 1100);
        return;
      }
      items = items.map((it, i) => i === idx ? { ...it, state: "run" } : it);
      setApplying({ items: [...items], done: false });
      addLog("info", `写入「${items[idx].label}」…`);
      setTimeout(() => {
        items = items.map((it, i) => i === idx ? { ...it, state: "done" } : it);
        setApplying({ items: [...items], done: false });
        idx++;
        step();
      }, 420);
    };
    setTimeout(step, 350);
  };

  /* ---- 快照 ---- */
  const createSnapshot = () => {
    const modified = identifiers.filter(i => i.value !== i.original).length;
    const snap = { id: "snap-" + Date.now(), name: "手动快照", time: "刚刚", auto: false, changes: modified, note: "用户手动创建" };
    setSnapshots(S => [snap, ...S]);
    addLog("ok", "已创建手动快照");
    toast("ok", "快照已创建", "可在历史中随时还原");
  };
  const restoreSnapshot = (s) => {
    setIdentifiers(ids => ids.map(i => ({ ...i, value: i.original, staged: null })));
    setFingerprint(shortHash());
    addLog("ok", `已从快照「${s.name}」还原`);
    toast("ok", "已还原快照", s.name);
  };
  const deleteSnapshot = (id) => { setSnapshots(S => S.filter(s => s.id !== id)); addLog("warn", "已删除一个快照"); };

  /* ---- 诊断（流式日志） ---- */
  const diagnose = () => {
    setDiagnosing(true);
    const lines = [
      ["info", "开始环境诊断…"],
      ["ok", "管理员权限：已获取"],
      ["ok", "注册表访问：正常"],
      ["info", "枚举网络适配器（2 个）…"],
      ["warn", "无线网卡 MAC 已锁定"],
      ["ok", "硬件标识读取完成"],
      ["ok", "诊断完成，未发现异常"],
    ];
    let i = 0;
    const run = () => {
      if (i >= lines.length) { setDiagnosing(false); toast("ok", "诊断完成", "环境正常"); return; }
      addLog(lines[i][0], lines[i][1]); i++; setTimeout(run, 380);
    };
    run();
  };

  const onCopy = () => toast("info", "已复制到剪贴板");

  return (
    <div className="app-window" style={{ width: 1180, height: 760, ...tweakVars }}>
      {/* 标题栏 */}
      <div className="titlebar">
        <span className="tb-icon"><Icon name="fingerprint" size={14} stroke={2} /></span>
        <span className="tb-title">设备标识管理器</span>
        <span className="tb-sub">DeviceID Manager</span>
        <span className="tb-spacer" />
        <div className="win-controls">
          <button title="最小化"><Icon name="min" size={15} /></button>
          <button title="最大化"><Icon name="max" size={13} /></button>
          <button className="close" title="关闭"><Icon name="x" size={15} /></button>
        </div>
      </div>

      {/* 主体 */}
      <div className="app-body">
        <nav className="sidebar">
          <div className="nav-section">导航</div>
          {NAV.map(n => {
            const pending = n.id === "ids" ? identifiers.filter(i => i.staged != null && i.staged !== i.value).length : 0;
            return (
              <div key={n.id} className={"nav-item" + (view === n.id ? " active" : "")} onClick={() => setView(n.id)}>
                <span className="ni-icon"><Icon name={n.icon} size={18} /></span>
                {n.label}
                {pending > 0 && <span className="ni-badge">{pending}</span>}
              </div>
            );
          })}
          <div className="sidebar-foot">
            <div className="device-chip">
              <span className="dc-dot" />
              <div style={{ minWidth: 0 }}>
                <div className="dc-name truncate">WS-STUDIO-07</div>
                <div className="dc-meta">服务运行中 · v2.4.1</div>
              </div>
            </div>
          </div>
        </nav>

        <main className="content" key={view}>
          {view === "ids" && <DeviceIDs identifiers={identifiers} setStage={setStage} clearStage={clearStage}
            resetOne={resetOne} toggleLock={toggleLock} applyAll={applyAll} resetAll={resetAll} stageAll={stageAll} onCopy={onCopy}
            onDiagnose={diagnose} diagnosing={diagnosing} />}
          {view === "history" && <History snapshots={snapshots} identifiers={identifiers} onRestore={restoreSnapshot} onCreate={createSnapshot} onDelete={deleteSnapshot} />}
          {view === "logs" && <Logs logs={logs} onClear={() => { setLogs([]); }} />}
          {view === "settings" && <Settings opts={opts} setOpts={setOpts} />}
        </main>
      </div>

      {applying && <ApplyOverlay items={applying.items} done={applying.done} />}

      {/* toasts */}
      <div className="toast-wrap">
        {toasts.map(t => {
          const meta = t.type === "ok" ? { bg: "var(--ok)", ic: "check" } : t.type === "warn" ? { bg: "var(--warn)", ic: "alert" } : { bg: "var(--accent)", ic: "info" };
          return (
            <div className="toast" key={t.id}>
              <span className="t-icon" style={{ background: "color-mix(in oklch, " + meta.bg + " 16%, transparent)", color: meta.bg }}><Icon name={meta.ic} size={15} /></span>
              <div><div className="t-msg">{t.msg}</div>{t.desc && <div className="t-desc">{t.desc}</div>}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { App });
