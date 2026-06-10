import { useState, useLayoutEffect, useEffect, useRef } from 'react';
import Icon from './components/common/Icon';
import DeviceIDs from './components/panels/DeviceIDs';
import Logs from './components/panels/Logs';
import Settings from './components/panels/Settings';
import { buildIdentifiers, genForKind, SEED_LOGS } from './data';
import { deviceService } from './services/deviceService';
import { loadSettings, saveSettings } from './services/settingsService';
import { isTauri, minimizeWindow, toggleMaximizeWindow, closeWindow } from './services/windowControls';
import type { Identifier, LogEntry, AppSettings, ApplyItem } from './types';

const NATIVE = isTauri();

const NAV = [
  { id: 'ids',       label: '设备标识', icon: 'id'        },
  { id: 'logs',      label: '日志输出', icon: 'terminal'  },
  { id: 'settings',  label: '设置',    icon: 'settings'  },
] as const;

type ViewId = typeof NAV[number]['id'];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

interface Toast {
  id: number;
  type: 'ok' | 'warn' | 'info';
  msg: string;
  desc?: string;
}

function ApplyOverlay({ items, done }: { items: ApplyItem[]; done: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
      background: 'color-mix(in oklch, var(--bg-window) 55%, transparent)',
      backdropFilter: 'blur(3px)', animation: 'pop .2s ease',
    }}>
      <div className="card" style={{ width: 380, boxShadow: 'var(--shadow-pop)', padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center',
            background: done ? 'var(--ok)' : 'var(--accent)', color: '#fff', transition: 'background .3s',
          }}>
            <Icon name={done ? 'check' : 'zap'} size={20}
              style={done ? undefined : { animation: 'spin .8s linear infinite' }} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{done ? '模拟应用成功' : '正在模拟应用更改…'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{done ? '仅更新页面，未写入真实系统' : '演示流程，不会修改系统'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {items.map(it => (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5,
              opacity: it.state === 'wait' ? 0.4 : 1, transition: 'opacity .2s',
            }}>
              <span style={{ width: 16, height: 16, display: 'grid', placeItems: 'center', color: 'var(--accent-strong)' }}>
                {it.state === 'done'
                  ? <Icon name="check" size={14} style={{ color: 'var(--ok)' }} />
                  : it.state === 'run'
                    ? <Icon name="refresh" size={13} style={{ animation: 'spin .8s linear infinite' }} />
                    : <span className="dot" style={{ background: 'var(--border-strong)' }} />}
              </span>
              <span style={{ flex: 1, fontWeight: it.state === 'run' ? 700 : 500 }}>{it.label}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{it.state === 'done' ? '✓' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppWindow() {
  const [view, setView] = useState<ViewId>('ids');
  const [identifiers, setIdentifiers] = useState<Identifier[]>(buildIdentifiers);
  const [logs, setLogs] = useState<LogEntry[]>(SEED_LOGS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [applying, setApplying] = useState<{ items: ApplyItem[]; done: boolean } | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [opts, setOpts] = useState<AppSettings>({ autoBackup: true, confirm: false, verboseLog: false });

  const addLog = (lvl: LogEntry['lvl'], msg: string) =>
    setLogs(L => [...L, { t: nowTime(), lvl, msg }]);

  // On startup inside the desktop app, build the identifier list from the REAL
  // machine (registry + WMI) — no hardcoded device names. Only real, existing
  // devices are returned by the backend.
  useEffect(() => {
    if (!NATIVE) return;
    let cancelled = false;
    (async () => {
      try {
        const info = await deviceService.loadDeviceInfo();
        if (cancelled) return;
        if (info.identifiers.length) {
          setIdentifiers(info.identifiers.map(b => ({
            key: b.key,
            group: b.group as Identifier['group'],
            label: b.label,
            icon: b.icon,
            desc: b.desc,
            original: b.value,
            value: b.value,
            staged: null,
            locked: b.locked,
            gen: genForKind(b.kind),
          })));
        }
        addLog('ok', `已识别本机设备信息（${info.identifiers.length} 项）`);
      } catch (e) {
        if (!cancelled) addLog('warn', `读取本机信息失败：${e}`);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Query the real public (egress) IP and patch the 公网 IP row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal });
        clearTimeout(timer);
        const ip = (await r.json())?.ip as string | undefined;
        if (cancelled || !ip) return;
        setIdentifiers(ids => ids.map(i =>
          i.key === 'public_ip' ? { ...i, original: ip, value: ip, staged: null } : i
        ));
      } catch {
        /* offline / blocked — leave 未知 */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load persisted settings on mount; persist on every change afterwards.
  const settingsLoaded = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSettings();
      if (!cancelled) { setOpts(saved); settingsLoaded.current = true; }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!settingsLoaded.current) return; // don't overwrite the file before load
    saveSettings(opts);
  }, [opts]);

  const toast = (type: Toast['type'], msg: string, desc?: string) => {
    const id = Math.random();
    setToasts(T => [...T, { id, type, msg, desc }]);
    setTimeout(() => setToasts(T => T.filter(t => t.id !== id)), 3400);
  };

  const setStage = (key: string) =>
    setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, staged: i.gen() } : i));

  const clearStage = (key: string) =>
    setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, staged: null } : i));

  const toggleLock = (key: string) =>
    setIdentifiers(ids => ids.map(i =>
      i.key === key ? { ...i, locked: !i.locked, staged: !i.locked ? null : i.staged } : i
    ));

  const resetOne = (key: string) => {
    setIdentifiers(ids => ids.map(i => i.key === key ? { ...i, value: i.original, staged: null } : i));
    const it = identifiers.find(i => i.key === key);
    if (it) { addLog('ok', `已还原「${it.label}」为原始值`); toast('ok', '已还原', it.label); }
  };

  const stageAll = () => {
    setIdentifiers(ids => ids.map(i => i.locked ? i : { ...i, staged: i.gen() }));
    addLog('info', '已为所有未锁定标识生成新值（待应用）');
  };

  // 模拟还原：仅重置页面状态，不触碰真实系统/配置。
  const resetAll = () => {
    setIdentifiers(ids => ids.map(i => ({ ...i, value: i.original, staged: null })));
    addLog('ok', '（模拟）已将全部标识还原为读取到的原始值');
    toast('ok', '已模拟还原', '仅重置页面显示，未改动系统');
  };

  // 模拟应用：只更新页面状态，不做任何真实写入（见后端 write_identifier）。
  const applyAll = async () => {
    const pending = identifiers.filter(i => i.staged != null && i.staged !== i.value);
    if (pending.length === 0) return;

    let items: ApplyItem[] = pending.map(p => ({ key: p.key, label: p.label, state: 'wait' }));
    setApplying({ items, done: false });
    addLog('info', `开始模拟应用 ${pending.length} 项标识更改…`);

    await new Promise(r => setTimeout(r, 350));

    for (let idx = 0; idx < items.length; idx++) {
      items = items.map((it, i) => i === idx ? { ...it, state: 'run' } : it);
      setApplying({ items: [...items], done: false });
      addLog('info', `（模拟）应用「${items[idx].label}」…`);

      // Simulation only — no real system/hardware write is performed.
      await deviceService.writeIdentifier(pending[idx].key, pending[idx].staged!).catch(() => {});

      items = items.map((it, i) => i === idx ? { ...it, state: 'done' } : it);
      setApplying({ items: [...items], done: false });
    }

    setIdentifiers(ids => ids.map(i =>
      i.staged != null && i.staged !== i.value ? { ...i, value: i.staged, staged: null } : i
    ));
    items = items.map(it => ({ ...it, state: 'done' }));
    setApplying({ items, done: true });
    addLog('ok', `（模拟）${pending.length} 项更改已应用到页面`);
    toast('ok', '模拟应用成功', `${pending.length} 项已更新（未写入真实系统）`);
    setTimeout(() => setApplying(null), 1100);
  };

  const diagnose = async () => {
    setDiagnosing(true);
    await deviceService.runDiagnostic((lvl, msg) => addLog(lvl as LogEntry['lvl'], msg));
    setDiagnosing(false);
    toast('ok', '诊断完成', '环境正常');
  };

  const onCopy = () => toast('info', '已复制到剪贴板');

  return (
    <div
      className={`app-window${NATIVE ? ' fill' : ''}`}
      style={NATIVE ? undefined : { width: 1180, height: 760 }}
    >
      <div className="titlebar" data-tauri-drag-region={NATIVE ? '' : undefined}>
        <span className="tb-icon"><Icon name="fingerprint" size={14} stroke={2} /></span>
        <span className="tb-title">设备标识管理器</span>
        <span className="tb-sub">DeviceID Manager</span>
        <span className="tb-spacer" />
        <div className="win-controls">
          <button title="最小化" onClick={minimizeWindow}><Icon name="min" size={15} /></button>
          <button title="最大化" onClick={toggleMaximizeWindow}><Icon name="max" size={13} /></button>
          <button className="close" title="关闭" onClick={closeWindow}><Icon name="x" size={15} /></button>
        </div>
      </div>

      <div className="app-body">
        <nav className="sidebar">
          <div className="nav-section">导航</div>
          {NAV.map(n => {
            const pending = n.id === 'ids'
              ? identifiers.filter(i => i.staged != null && i.staged !== i.value).length
              : 0;
            return (
              <div key={n.id} className={`nav-item${view === n.id ? ' active' : ''}`} onClick={() => setView(n.id)}>
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
          {view === 'ids' && (
            <DeviceIDs
              identifiers={identifiers} setStage={setStage} clearStage={clearStage}
              resetOne={resetOne} toggleLock={toggleLock} applyAll={applyAll}
              resetAll={resetAll} stageAll={stageAll} onCopy={onCopy}
              onDiagnose={diagnose} diagnosing={diagnosing}
            />
          )}
          {view === 'logs' && (
            <Logs logs={logs} onClear={() => setLogs([])} />
          )}
          {view === 'settings' && <Settings opts={opts} setOpts={setOpts} />}
        </main>
      </div>

      {applying && <ApplyOverlay items={applying.items} done={applying.done} />}

      <div className="toast-wrap">
        {toasts.map(t => {
          const meta = t.type === 'ok'
            ? { bg: 'var(--ok)', ic: 'check' }
            : t.type === 'warn'
              ? { bg: 'var(--warn)', ic: 'alert' }
              : { bg: 'var(--accent)', ic: 'info' };
          return (
            <div className="toast" key={t.id}>
              <span className="t-icon" style={{
                background: `color-mix(in oklch, ${meta.bg} 16%, transparent)`, color: meta.bg,
              }}>
                <Icon name={meta.ic} size={15} />
              </span>
              <div>
                <div className="t-msg">{t.msg}</div>
                {t.desc && <div className="t-desc">{t.desc}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (NATIVE) return; // native window fills the frame; no scaling needed.
    const fit = () => {
      const pad = 32;
      const s = Math.min((window.innerWidth - pad) / 1180, (window.innerHeight - pad) / 760, 1);
      setScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Inside the desktop app the OS window IS the chrome — fill it directly.
  if (NATIVE) return <AppWindow />;

  // In the browser, render the scaled desktop "stage" preview.
  return (
    <div className="stage">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform .15s ease' }}>
        <AppWindow />
      </div>
    </div>
  );
}
