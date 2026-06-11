import { useState } from 'react';
import Icon from '../common/Icon';
import type { Identifier } from '../../types';

function CopyBtn({ text, onCopy }: { text: string; onCopy?: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm btn-icon"
      title="复制完整值"
      onClick={() => {
        // 始终复制完整原始值，绝不复制被省略后的显示文本
        navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        onCopy?.();
        setTimeout(() => setDone(false), 1200);
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={14} style={done ? { color: 'var(--ok)' } : undefined} />
    </button>
  );
}

function IdRow({ id, onStage, onClear, onReset, onToggleLock, onCopy, onRefresh, refreshing }: {
  id: Identifier;
  onStage: (key: string) => void;
  onClear: (key: string) => void;
  onReset: (key: string) => void;
  onToggleLock: (key: string) => void;
  onCopy?: () => void;
  /** 只读项可选的刷新动作（如公网 IP 重新检测）。 */
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const modified = id.value !== id.original;
  const pending = id.staged != null && id.staged !== id.value;

  // 只读参考项（公网 IP / CPU / 显卡）：仅展示与复制，无生成 / 锁定 / 撤销 / 还原。
  // 公网 IP 额外保留「重新检测」刷新按钮（onRefresh）。
  if (id.readonly) {
    const known = id.value && id.value !== '未知';
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', minHeight: 60,
        borderBottom: '1px solid var(--hairline)',
      }}>
        <span style={{
          width: 34, height: 34, flex: '0 0 auto', borderRadius: 10, display: 'grid', placeItems: 'center',
          background: 'var(--bg-inset)', color: 'var(--accent-strong)',
        }}>
          <Icon name={id.icon} size={17} />
        </span>
        <div style={{ flex: '0 0 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <span className="truncate">{id.label}</span>
          </div>
          <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4 }} title={id.desc}>
            {id.desc}
          </div>
        </div>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <span className="mono" style={{
            fontSize: 12.5, color: known ? 'var(--text)' : 'var(--text-faint)',
            wordBreak: 'break-all', lineHeight: 1.5,
          }}>{refreshing ? '检测中…' : id.value}</span>
        </div>
        <div style={{ width: 64, flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end' }}>
          <span className="tag tag-neutral">只读</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
          <CopyBtn text={id.value} onCopy={onCopy} />
          {onRefresh && (
            <button
              className="btn btn-ghost btn-sm btn-icon"
              title="重新检测"
              disabled={refreshing}
              onClick={onRefresh}
            >
              <Icon name="refresh" size={14} style={refreshing ? { animation: 'spin .8s linear infinite' } : undefined} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', minHeight: 60,
      borderBottom: '1px solid var(--hairline)', opacity: id.locked ? 0.72 : 1,
      transition: 'background .15s', background: pending ? 'var(--accent-softer)' : 'transparent',
    }}>
      <span style={{
        width: 34, height: 34, flex: '0 0 auto', borderRadius: 10, display: 'grid', placeItems: 'center',
        background: 'var(--bg-inset)', color: 'var(--accent-strong)',
      }}>
        <Icon name={id.icon} size={17} />
      </span>

      {/* 名称 + 说明：固定列，各自单行省略（说明可省略、可经 title 还原） */}
      <div style={{ flex: '0 0 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="truncate">{id.label}</span>
          {id.locked && <Icon name="lock" size={12} style={{ color: 'var(--text-faint)', flex: '0 0 auto' }} />}
        </div>
        <div className="truncate" style={{ fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.4 }} title={id.desc}>
          {id.desc}
        </div>
      </div>

      {/* 值区：可伸缩、完整显示（按字符换行），绝不省略，长值不会挤压右侧按钮 */}
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        {pending ? (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)',
            border: '1px solid var(--accent-soft)',
          }}>
            <span className="mono" style={{
              fontSize: 12.5, color: 'var(--text-faint)', textDecoration: 'line-through',
              wordBreak: 'break-all', minWidth: 0,
            }}>{id.value}</span>
            <Icon name="chevron" size={13} style={{ color: 'var(--accent)', flex: '0 0 auto' }} />
            <span className="mono" style={{
              fontSize: 12.5, fontWeight: 700, color: 'var(--accent-strong)',
              wordBreak: 'break-all', minWidth: 0,
            }}>{id.staged}</span>
          </div>
        ) : (
          <span className="mono" style={{
            fontSize: 12.5, color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.5,
          }}>{id.value}</span>
        )}
      </div>

      {/* 状态 */}
      <div style={{ width: 64, flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end' }}>
        {pending
          ? <span className="tag tag-warn">待应用</span>
          : modified
            ? <span className="tag tag-accent">已修改</span>
            : <span className="tag tag-ok">原始</span>}
      </div>

      {/* 操作：固定宽度，永不被长值挤压 */}
      <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
        <CopyBtn text={id.value} onCopy={onCopy} />
        <button
          className="btn btn-ghost btn-sm btn-icon"
          title={id.locked ? '已锁定，点击解锁' : '锁定（不参与批量）'}
          onClick={() => onToggleLock(id.key)}
        >
          <Icon name={id.locked ? 'lock' : 'unlock'} size={14} />
        </button>
        {pending
          ? <button className="btn btn-ghost btn-sm" title="撤销待应用值" onClick={() => onClear(id.key)}>撤销</button>
          : <button className="btn btn-soft btn-sm" disabled={id.locked} title="生成新的随机值" onClick={() => onStage(id.key)}>
              <Icon name="dice" size={14} />生成
            </button>}
        {modified && !pending && (
          <button className="btn btn-ghost btn-sm btn-icon" title="还原为原始值" onClick={() => onReset(id.key)}>
            <Icon name="restore" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

interface DeviceIDsProps {
  identifiers: Identifier[];
  setStage: (key: string) => void;
  clearStage: (key: string) => void;
  resetOne: (key: string) => void;
  toggleLock: (key: string) => void;
  applyAll: () => void;
  resetAll: () => void;
  stageAll: () => void;
  onCopy?: () => void;
  onDiagnose: () => void;
  diagnosing: boolean;
  onRefreshIp: () => void;
  ipLoading: boolean;
}

export default function DeviceIDs({
  identifiers, setStage, clearStage, resetOne, toggleLock,
  applyAll, resetAll, stageAll, onCopy, onDiagnose, diagnosing,
  onRefreshIp, ipLoading,
}: DeviceIDsProps) {
  const [group, setGroup] = useState('全部');
  const groups = ['全部', '网络', '硬件', '只读参考'];

  const pendingCount = identifiers.filter(i => i.staged != null && i.staged !== i.value).length;

  const listItems = identifiers;
  const order = ['网络', '硬件', '只读参考'];
  // 只读项一律归入「只读参考」组——无论其声明的 group 为何，确保后续新增的
  // 只读项默认落入此分组，不会混进「网络 / 硬件」可模拟修改项里。
  const groupOf = (i: Identifier) => (i.readonly ? '只读参考' : i.group);
  const grouped = order
    .filter(g => group === '全部' || g === group)
    .map(g => ({ group: g, items: listItems.filter(i => groupOf(i) === g) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="page page-anim">
      <div className="page-head page-head-row">
        <div>
          <div className="page-title">设备标识</div>
          <div className="page-sub">查看与模拟生成设备标识。所有修改仅在页面内模拟，不写入真实系统。</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
          <button className="btn btn-ghost" onClick={onDiagnose} disabled={diagnosing}>
            <Icon name="zap" size={15} style={diagnosing ? { animation: 'spin .8s linear infinite' } : undefined} />
            {diagnosing ? '运行中…' : '运行诊断'}
          </button>
          <button className="btn btn-ghost" onClick={resetAll}><Icon name="restore" size={15} />全部还原</button>
          <button className="btn btn-ghost" onClick={stageAll}><Icon name="dice" size={15} />批量生成</button>
          <button className="btn btn-primary" disabled={pendingCount === 0} onClick={applyAll}>
            <Icon name="check" size={15} />应用更改{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        </div>
      </div>

      {/* 工具栏：仅分类筛选 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--gap)' }}>
        <div className="theme-switch" style={{ margin: 0 }}>
          {groups.map(g => (
            <button key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      </div>

      {/* 列表：分组表格式，每组带标题栏 */}
      {grouped.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          没有匹配的标识项
        </div>
      )}
      {grouped.map(({ group: g, items }) => (
        <div key={g} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--gap)' }}>
          {/* 分组标题栏 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: 'var(--bg-inset)', borderBottom: '1px solid var(--hairline)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', color: 'var(--text)' }}>{g}</span>
            <span className="tag tag-neutral">{items.length}</span>
          </div>
          {items.map(i => (
            <IdRow key={i.key} id={i} onStage={setStage} onClear={clearStage}
              onReset={resetOne} onToggleLock={toggleLock} onCopy={onCopy}
              onRefresh={i.key === 'public_ip' ? onRefreshIp : undefined}
              refreshing={i.key === 'public_ip' ? ipLoading : undefined} />
          ))}
        </div>
      ))}

      {pendingCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 'var(--gap)', padding: '12px 16px',
          background: 'var(--accent-softer)', border: '1px solid var(--accent-soft)', borderRadius: 'var(--radius)',
        }}>
          <Icon name="info" size={18} style={{ color: 'var(--accent-strong)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--text)' }}>
            有 <b>{pendingCount}</b> 项待应用的更改。点击「应用更改」后仅在页面内模拟应用，不会写入真实系统。
          </span>
        </div>
      )}
    </div>
  );
}
