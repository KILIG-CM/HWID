import Icon from '../common/Icon';
import type { Identifier, Snapshot } from '../../types';

interface HistoryProps {
  snapshots: Snapshot[];
  identifiers: Identifier[];
  onRestore: (s: Snapshot) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export default function History({ snapshots, identifiers, onRestore, onCreate, onDelete }: HistoryProps) {
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--gap)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {snapshots.map((s, idx) => (
            <div className="card" key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px' }}>
              <span style={{
                width: 40, height: 40, flex: '0 0 auto', borderRadius: 11, display: 'grid', placeItems: 'center',
                background: s.auto ? 'var(--bg-inset)' : 'var(--accent-soft)',
                color: s.auto ? 'var(--text-muted)' : 'var(--accent-strong)',
              }}>
                <Icon name={s.auto ? 'clock' : 'save'} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                  {s.auto
                    ? <span className="tag tag-neutral">自动</span>
                    : <span className="tag tag-accent">手动</span>}
                  {idx === 0 && <span className="tag tag-ok">最新</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 3 }}>
                  {s.time} · {s.changes > 0 ? `${s.changes} 项变更` : '完整基线'} · {s.note}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                <button className="btn btn-soft btn-sm" onClick={() => onRestore(s)}>
                  <Icon name="restore" size={14} />还原
                </button>
                {!s.auto && (
                  <button className="btn btn-ghost btn-sm btn-icon" title="删除快照" onClick={() => onDelete(s.id)}>
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ position: 'sticky', top: 0 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>
            <span className="ct-icon"><Icon name="history" size={15} /></span>当前状态
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: modified ? 'var(--accent-strong)' : 'var(--ok)' }}>
                {modified}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>项标识偏离基线</div>
            </div>
            <div style={{ height: 1, background: 'var(--hairline)' }} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              共 <b style={{ color: 'var(--text)' }}>{snapshots.length}</b> 个快照可用。建议在批量修改前手动创建命名快照，方便快速回退。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
