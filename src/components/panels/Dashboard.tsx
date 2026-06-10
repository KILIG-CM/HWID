import Icon from '../common/Icon';
import type { Identifier, Snapshot } from '../../types';
import { SYSTEM_INFO } from '../../data';

function StatCard({ icon, label, value, sub, tone }: {
  icon: string; label: string; value: number; sub?: string; tone?: string;
}) {
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{
          width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
          background: tone === 'accent' ? 'var(--accent-soft)' : 'var(--bg-inset)',
          color: tone === 'accent' ? 'var(--accent-strong)' : 'var(--text-muted)',
        }}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sub}</span>}
      </div>
    </div>
  );
}

function InfoRow({ id }: { id: Identifier }) {
  const modified = id.value !== id.original;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span style={{ color: 'var(--text-faint)', display: 'grid', placeItems: 'center', width: 18 }}>
        <Icon name={id.icon} size={15} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{id.label}</div>
        <div className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{id.value}</div>
      </div>
      {id.locked
        ? <span className="tag tag-neutral"><Icon name="lock" size={11} />锁定</span>
        : modified
          ? <span className="tag tag-accent"><span className="dot" style={{ background: 'var(--accent)' }} />已修改</span>
          : <span className="tag tag-ok"><span className="dot" style={{ background: 'var(--ok)' }} />原始</span>}
    </div>
  );
}

interface DashboardProps {
  identifiers: Identifier[];
  snapshots: Snapshot[];
  onGoto: (view: 'ids') => void;
  fingerprint: string;
}

export default function Dashboard({ identifiers, snapshots, onGoto, fingerprint }: DashboardProps) {
  const modified = identifiers.filter(i => i.value !== i.original).length;
  const locked = identifiers.filter(i => i.locked).length;
  const groups = ['系统标识', '网络', '硬件'] as const;

  return (
    <div className="page page-anim">
      <div className="page-head">
        <div className="page-title">设备总览</div>
        <div className="page-sub">当前设备的标识、网络与硬件信息一览</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--gap)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, padding: '22px 24px',
          background: 'linear-gradient(120deg, var(--accent-softer), transparent 70%)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flex: '0 0 auto', display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: '#fff',
            boxShadow: '0 8px 20px -6px var(--accent)',
          }}>
            <Icon name="fingerprint" size={28} stroke={1.6} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>当前设备指纹</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>{fingerprint}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 5 }}>
              由 8 项设备标识聚合计算 · {modified > 0 ? `${modified} 项已偏离基线` : '与出厂基线一致'}
            </div>
          </div>
          <button className="btn btn-soft" onClick={() => onGoto('ids')}>
            管理标识<Icon name="chevron" size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
        <StatCard icon="id" label="标识项" value={identifiers.length} sub="项受管" tone="accent" />
        <StatCard icon="zap" label="已修改" value={modified} sub={`/ ${identifiers.length}`} />
        <StatCard icon="lock" label="已锁定" value={locked} sub="项保护" />
        <StatCard icon="save" label="备份快照" value={snapshots.length} sub="个可还原" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gap)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {groups.map(g => (
            <div className="card" key={g}>
              <div className="card-title" style={{ marginBottom: 6 }}>
                <span className="ct-icon">
                  <Icon name={g === '网络' ? 'network' : g === '硬件' ? 'cpu' : 'shield'} size={15} />
                </span>
                {g}
              </div>
              {identifiers.filter(i => i.group === g).map(i => <InfoRow id={i} key={i.key} />)}
              <div style={{ height: 0 }} />
            </div>
          ))}
        </div>
        <div className="card" style={{ position: 'sticky', top: 0 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            <span className="ct-icon"><Icon name="monitor" size={15} /></span>系统信息
          </div>
          {SYSTEM_INFO.map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0',
              borderBottom: i < SYSTEM_INFO.length - 1 ? '1px solid var(--hairline)' : 'none',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
