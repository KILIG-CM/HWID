import { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';
import type { LogEntry } from '../../types';

const LVL_META: Record<string, { tag: string; label: string }> = {
  info: { tag: 'tag-neutral', label: 'INFO' },
  ok:   { tag: 'tag-ok',      label: 'OK'   },
  warn: { tag: 'tag-warn',    label: 'WARN' },
  err:  { tag: 'tag-danger',  label: 'ERR'  },
};

interface LogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

export default function Logs({ logs, onClear }: LogsProps) {
  const [filter, setFilter] = useState('全部');
  const scroller = useRef<HTMLDivElement>(null);
  const filters = ['全部', 'info', 'ok', 'warn', 'err'];
  const fLabel: Record<string, string> = { '全部': '全部', info: '信息', ok: '成功', warn: '警告', err: '错误' };
  const shown = logs.filter(l => filter === '全部' || l.lvl === filter);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [logs.length]);

  return (
    <div className="page page-anim">
      <div className="page-head page-head-row">
        <div>
          <div className="page-title">日志输出</div>
          <div className="page-sub">服务运行、标识修改与还原的实时记录</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClear}><Icon name="x" size={15} />清空</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--gap)' }}>
        <div className="theme-switch" style={{ margin: 0 }}>
          {filters.map(f => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {fLabel[f]}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginLeft: 'auto' }}>{shown.length} 条记录</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={scroller} style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0', fontFamily: 'var(--font-mono)' }}>
          {shown.map((l, i) => {
            const m = LVL_META[l.lvl] || LVL_META.info;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: 12, padding: '5px 18px', fontSize: 12.5,
                animation: i === shown.length - 1 ? 'fadeUp .3s ease both' : 'none',
              }}>
                <span style={{ color: 'var(--text-faint)', flex: '0 0 auto', width: 58 }}>{l.t}</span>
                <span className={`tag ${m.tag}`} style={{ flex: '0 0 auto', width: 52, justifyContent: 'center', fontFamily: 'var(--font-ui)' }}>
                  {m.label}
                </span>
                <span style={{ color: 'var(--text)', flex: 1 }}>{l.msg}</span>
              </div>
            );
          })}
          {shown.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              暂无日志
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
