import React from 'react';
import Icon from '../common/Icon';
import type { AppSettings } from '../../types';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 40, height: 23, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: on ? 'var(--accent)' : 'var(--border-strong)',
        position: 'relative', transition: 'background .2s', flex: '0 0 auto',
      }}
    >
      <span style={{
        position: 'absolute', top: 2.5, left: on ? 20 : 2.5, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

interface SettingsProps {
  opts: AppSettings;
  setOpts: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export default function Settings({ opts, setOpts }: SettingsProps) {
  const rows: Array<{ key: keyof AppSettings; label: string; desc: string }> = [
    { key: 'autoBackup', label: '修改前自动创建快照', desc: '每次应用更改前自动备份当前标识' },
    { key: 'confirm',    label: '应用更改前二次确认', desc: '批量写入标识时弹出确认提示' },
    { key: 'verboseLog', label: '详细日志',           desc: '记录每一项标识的读写细节' },
  ];

  return (
    <div className="page page-anim">
      <div className="page-head">
        <div className="page-title">设置</div>
        <div className="page-sub">服务行为与安全选项</div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{r.desc}</div>
            </div>
            <Toggle on={opts[r.key]} onChange={v => setOpts(o => ({ ...o, [r.key]: v }))} />
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginTop: 'var(--gap)', padding: '13px 16px',
        background: 'var(--bg-inset)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)',
      }}>
        <Icon name="shield" size={17} style={{ color: 'var(--accent-strong)', flex: '0 0 auto' }} />
        所有标识修改均在本地完成，原始值已加密备份。建议仅在开发、测试或运维授权范围内使用。
      </div>
    </div>
  );
}
