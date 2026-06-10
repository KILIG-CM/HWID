/* ============================================================
   面板：设备标识（查看 / 生成 / 应用修改）
   ============================================================ */

function CopyBtn({ text, onCopy }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm btn-icon" title="复制"
      onClick={() => { navigator.clipboard?.writeText(text).catch(()=>{}); setDone(true); onCopy && onCopy(); setTimeout(() => setDone(false), 1200); }}>
      <Icon name={done ? "check" : "copy"} size={14} style={done ? { color: "var(--ok)" } : null} />
    </button>
  );
}

function IdRow({ id, onStage, onClear, onReset, onToggleLock, onCopy }) {
  const modified = id.value !== id.original;
  const pending = id.staged != null && id.staged !== id.value;

  return (
    <div className="id-row" style={{
      display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
      borderBottom: "1px solid var(--hairline)", opacity: id.locked ? 0.72 : 1,
      transition: "background .15s", background: pending ? "var(--accent-softer)" : "transparent" }}>
      <span style={{ width: 34, height: 34, flex: "0 0 auto", borderRadius: 10, display: "grid", placeItems: "center",
        background: "var(--bg-inset)", color: "var(--accent-strong)" }}>
        <Icon name={id.icon} size={17} />
      </span>

      <div style={{ width: 178, flex: "0 0 auto", minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          {id.label}
          {id.locked && <Icon name="lock" size={12} style={{ color: "var(--text-faint)" }} />}
        </div>
        <div className="truncate" style={{ fontSize: 11, color: "var(--text-faint)" }}>{id.desc}</div>
      </div>

      {/* 值区 */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono truncate" style={{ fontSize: 12.5, color: pending ? "var(--text-faint)" : "var(--text)",
          textDecoration: pending ? "line-through" : "none", flex: pending ? "0 1 auto" : "1" }}>
          {id.value}
        </span>
        {pending && <>
          <Icon name="chevron" size={14} style={{ color: "var(--accent)", flex: "0 0 auto" }} />
          <span className="mono truncate" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-strong)", flex: 1 }}>{id.staged}</span>
        </>}
      </div>

      {/* 状态 */}
      <div style={{ width: 74, flex: "0 0 auto", display: "flex", justifyContent: "flex-end" }}>
        {pending ? <span className="tag tag-warn">待应用</span>
          : modified ? <span className="tag tag-accent">已修改</span>
          : <span className="tag tag-ok">原始</span>}
      </div>

      {/* 操作 */}
      <div style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
        <CopyBtn text={id.value} onCopy={onCopy} />
        <button className="btn btn-ghost btn-sm btn-icon" title={id.locked ? "已锁定，点击解锁" : "锁定（不参与批量）"}
          onClick={() => onToggleLock(id.key)}>
          <Icon name={id.locked ? "lock" : "unlock"} size={14} />
        </button>
        {pending
          ? <button className="btn btn-ghost btn-sm" title="撤销待应用值" onClick={() => onClear(id.key)}>撤销</button>
          : <button className="btn btn-soft btn-sm" disabled={id.locked} title="生成新的随机值" onClick={() => onStage(id.key)}>
              <Icon name="dice" size={14} />生成
            </button>}
        {modified && !pending &&
          <button className="btn btn-ghost btn-sm btn-icon" title="还原为原始值" onClick={() => onReset(id.key)}>
            <Icon name="restore" size={14} />
          </button>}
      </div>
    </div>
  );
}

function DeviceIDs({ identifiers, setStage, clearStage, resetOne, toggleLock, applyAll, resetAll, stageAll, onCopy }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("全部");
  const groups = ["全部", "系统标识", "网络", "硬件"];

  const filtered = identifiers.filter(i =>
    (group === "全部" || i.group === group) &&
    (q === "" || i.label.includes(q) || i.value.toLowerCase().includes(q.toLowerCase()) || i.desc.toLowerCase().includes(q.toLowerCase()))
  );
  const pendingCount = identifiers.filter(i => i.staged != null && i.staged !== i.value).length;
  const byGroup = ["系统标识", "网络", "硬件"].map(g => ({ g, items: filtered.filter(i => i.group === g) })).filter(x => x.items.length);

  return (
    <div className="page page-anim">
      <div className="page-head page-head-row">
        <div>
          <div className="page-title">设备标识</div>
          <div className="page-sub">查看、生成并应用设备标识。修改前会自动创建快照以便还原。</div>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <button className="btn btn-ghost" onClick={resetAll}><Icon name="restore" size={15} />全部还原</button>
          <button className="btn btn-ghost" onClick={stageAll}><Icon name="dice" size={15} />批量生成</button>
          <button className="btn btn-primary" disabled={pendingCount === 0} onClick={applyAll}>
            <Icon name="check" size={15} />应用更改{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--gap)" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索标识或值…"
            style={{ width: "100%", height: 36, padding: "0 12px 0 34px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)",
              font: "inherit", fontSize: 13, outline: "none" }}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
        </div>
        <div className="theme-switch" style={{ margin: 0 }}>
          {groups.map(g => (
            <button key={g} className={group === g ? "active" : ""} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {byGroup.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>没有匹配的标识项</div>
        )}
        {byGroup.map(({ g, items }) => (
          <div key={g}>
            <div style={{ padding: "9px 16px", fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em",
              textTransform: "uppercase", color: "var(--text-faint)", background: "var(--bg-inset)",
              borderBottom: "1px solid var(--hairline)" }}>{g}</div>
            {items.map(i => (
              <IdRow key={i.key} id={i} onStage={setStage} onClear={clearStage}
                onReset={resetOne} onToggleLock={toggleLock} onCopy={onCopy} />
            ))}
          </div>
        ))}
      </div>

      {pendingCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "var(--gap)", padding: "12px 16px",
          background: "var(--accent-softer)", border: "1px solid var(--accent-soft)", borderRadius: "var(--radius)" }}>
          <Icon name="info" size={18} style={{ color: "var(--accent-strong)" }} />
          <span style={{ fontSize: 12.5, color: "var(--text)" }}>
            有 <b>{pendingCount}</b> 项待应用的更改。点击「应用更改」后将自动创建快照并写入新值。
          </span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { DeviceIDs, IdRow, CopyBtn });
