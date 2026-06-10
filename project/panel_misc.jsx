/* ============================================================
   面板：历史与备份 / 日志 / 设置
   ============================================================ */

/* ---------- 历史与备份 ---------- */
function History({ snapshots, identifiers, onRestore, onCreate, onDelete }) {
  const modified = identifiers.filter(i => i.value !== i.original).length;
  return (
    <div className="page page-anim">
      <div className="page-head page-head-row">
        <div>
          <div className="page-title">历史与备份</div>
          <div className="page-sub">所有快照可一键还原。修改设备标识时会自动创建保护点。</div>
        </div>
        <button className="btn btn-primary" onClick={onCreate}><Icon name="save" size={15} />创建快照</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "var(--gap)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {snapshots.map((s, idx) => (
            <div className="card" key={s.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px" }}>
              <span style={{ width: 40, height: 40, flex: "0 0 auto", borderRadius: 11, display: "grid", placeItems: "center",
                background: s.auto ? "var(--bg-inset)" : "var(--accent-soft)", color: s.auto ? "var(--text-muted)" : "var(--accent-strong)" }}>
                <Icon name={s.auto ? "clock" : "save"} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                  {s.auto ? <span className="tag tag-neutral">自动</span> : <span className="tag tag-accent">手动</span>}
                  {idx === 0 && <span className="tag tag-ok">最新</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 3 }}>
                  {s.time} · {s.changes > 0 ? `${s.changes} 项变更` : "完整基线"} · {s.note}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                <button className="btn btn-soft btn-sm" onClick={() => onRestore(s)}><Icon name="restore" size={14} />还原</button>
                {!s.auto && <button className="btn btn-ghost btn-sm btn-icon" title="删除快照" onClick={() => onDelete(s.id)}><Icon name="x" size={14} /></button>}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ position: "sticky", top: 0 }}>
          <div className="card-title" style={{ marginBottom: 14 }}><span className="ct-icon"><Icon name="history" size={15} /></span>当前状态</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: modified ? "var(--accent-strong)" : "var(--ok)" }}>{modified}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>项标识偏离基线</div>
            </div>
            <div style={{ height: 1, background: "var(--hairline)" }} />
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              共 <b style={{ color: "var(--text)" }}>{snapshots.length}</b> 个快照可用。建议在批量修改前手动创建命名快照，方便快速回退。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 日志 ---------- */
const LVL_META = {
  info: { tag: "tag-neutral", label: "INFO", color: "var(--text-muted)" },
  ok:   { tag: "tag-ok", label: "OK", color: "var(--ok)" },
  warn: { tag: "tag-warn", label: "WARN", color: "var(--warn)" },
  err:  { tag: "tag-danger", label: "ERR", color: "var(--danger)" },
};

function Logs({ logs, onClear }) {
  const [filter, setFilter] = useState("全部");
  const scroller = useRef(null);
  const filters = ["全部", "info", "ok", "warn", "err"];
  const fLabel = { 全部: "全部", info: "信息", ok: "成功", warn: "警告", err: "错误" };
  const shown = logs.filter(l => filter === "全部" || l.lvl === filter);

  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [logs.length]);

  return (
    <div className="page page-anim">
      <div className="page-head page-head-row">
        <div>
          <div className="page-title">日志输出</div>
          <div className="page-sub">服务运行、标识修改与还原的实时记录</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClear}><Icon name="x" size={15} />清空</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--gap)" }}>
        <div className="theme-switch" style={{ margin: 0 }}>
          {filters.map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{fLabel[f]}</button>)}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--text-faint)", marginLeft: "auto" }}>{shown.length} 条记录</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div ref={scroller} style={{ maxHeight: 440, overflowY: "auto", padding: "8px 0", fontFamily: "var(--font-mono)" }}>
          {shown.map((l, i) => {
            const m = LVL_META[l.lvl] || LVL_META.info;
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "5px 18px", fontSize: 12.5,
                animation: i === shown.length - 1 ? "fadeUp .3s ease both" : "none" }}>
                <span style={{ color: "var(--text-faint)", flex: "0 0 auto", width: 58 }}>{l.t}</span>
                <span className={"tag " + m.tag} style={{ flex: "0 0 auto", width: 52, justifyContent: "center", fontFamily: "var(--font-ui)" }}>{m.label}</span>
                <span style={{ color: "var(--text)", flex: 1 }}>{l.msg}</span>
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ padding: 36, textAlign: "center", color: "var(--text-faint)", fontSize: 13, fontFamily: "var(--font-ui)" }}>暂无日志</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- 设置 ---------- */
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 40, height: 23, borderRadius: 99, border: "none", cursor: "pointer",
      background: on ? "var(--accent)" : "var(--border-strong)", position: "relative", transition: "background .2s", flex: "0 0 auto" }}>
      <span style={{ position: "absolute", top: 2.5, left: on ? 20 : 2.5, width: 18, height: 18, borderRadius: "50%",
        background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </button>
  );
}

function Settings({ opts, setOpts }) {
  const rows = [
    { key: "autoBackup", label: "修改前自动创建快照", desc: "每次应用更改前自动备份当前标识" },
    { key: "confirm", label: "应用更改前二次确认", desc: "批量写入标识时弹出确认提示" },
    { key: "verboseLog", label: "详细日志", desc: "记录每一项标识的读写细节" },
  ];
  return (
    <div className="page page-anim">
      <div className="page-head">
        <div className="page-title">设置</div>
        <div className="page-sub">服务行为与安全选项</div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--hairline)" : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{r.desc}</div>
            </div>
            <Toggle on={opts[r.key]} onChange={v => setOpts(o => ({ ...o, [r.key]: v }))} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "var(--gap)", padding: "13px 16px",
        background: "var(--bg-inset)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-muted)" }}>
        <Icon name="shield" size={17} style={{ color: "var(--accent-strong)", flex: "0 0 auto" }} />
        所有标识修改均在本地完成，原始值已加密备份。建议仅在开发、测试或运维授权范围内使用。
      </div>
    </div>
  );
}

Object.assign(window, { History, Logs, Settings, Toggle });
