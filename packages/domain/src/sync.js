/**
 * Offline-first sync engine (pure).
 *
 * The POS writes every change to a local outbox while offline. When the device
 * reconnects, `pushOutbox` sends operations in order and `mergeRemote` applies
 * server changes. Conflicts are resolved deterministically:
 *
 *   - server wins for reference data (menu, prices, settings)
 *   - latest `updatedAt` wins for mutable business documents
 *   - deletes are tombstones, never hard deletes
 *
 * The transport is injected, so this module runs in tests with zero network.
 */

export const OUTBOX_LIMIT = 5000;

export function createOutbox() {
  return { ops: [], lastPushedAt: null, deviceId: null };
}

export function enqueue(outbox, op) {
  if (!op || !op.entity || !op.type) throw new Error('SYNC_OP_INVALID');
  const ops = (outbox && outbox.ops) || [];
  if (ops.length >= OUTBOX_LIMIT) throw new Error('OUTBOX_FULL');
  const row = {
    id: op.id || `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entity: op.entity,
    type: op.type,
    entityId: op.entityId || null,
    payload: op.payload || null,
    updatedAt: op.updatedAt || new Date().toISOString(),
    attempts: 0,
    status: 'pending'
  };
  return { ...(outbox || {}), ops: [...ops, row] };
}

export function markFailed(outbox, opId, error) {
  return {
    ...outbox,
    ops: (outbox.ops || []).map((op) => (op.id === opId
      ? { ...op, attempts: (Number(op.attempts) || 0) + 1, status: 'failed', error: String(error || '') }
      : op))
  };
}

export function pendingCount(outbox) {
  return (outbox && outbox.ops ? outbox.ops : []).filter((op) => op.status !== 'synced').length;
}

/**
 * Push pending operations through an async transport. Operations are processed
 * strictly in order; the first failure stops the batch so dependent writes are
 * never reordered.
 */
export async function pushOutbox(outbox, transport, opts = {}) {
  if (!transport || typeof transport.push !== 'function') throw new Error('SYNC_TRANSPORT_REQUIRED');
  const batchSize = Math.max(1, Number(opts.batchSize) || 50);
  const pending = (outbox.ops || []).filter((op) => op.status !== 'synced');
  if (!pending.length) return { outbox, pushed: 0, failed: null, at: new Date().toISOString() };

  const batch = pending.slice(0, batchSize);
  const accepted = [];
  try {
    const result = await transport.push(batch.map((op) => ({
      id: op.id,
      entity: op.entity,
      type: op.type,
      entityId: op.entityId,
      payload: op.payload,
      updatedAt: op.updatedAt
    })));
    (result && result.accepted ? result.accepted : batch.map((op) => op.id)).forEach((id) => accepted.push(id));
  } catch (error) {
    return {
      outbox: markFailed(outbox, batch[0].id, error && error.message ? error.message : error),
      pushed: 0,
      failed: error && error.message ? error.message : String(error),
      at: new Date().toISOString()
    };
  }

  const acceptedSet = new Set(accepted);
  return {
    outbox: {
      ...outbox,
      lastPushedAt: new Date().toISOString(),
      ops: outbox.ops.map((op) => (acceptedSet.has(op.id)
        ? { ...op, status: 'synced', syncedAt: new Date().toISOString() }
        : op))
    },
    pushed: acceptedSet.size,
    failed: null,
    at: new Date().toISOString()
  };
}

const stamp = (value) => String(value || '');

export function resolveConflict(local, remote) {
  if (!local) return remote;
  if (!remote) return local;
  if (local.deleted && !remote.deleted) return remote.deletedAt && stamp(remote.deletedAt) > stamp(local.updatedAt) ? remote : local;
  if (remote.deleted && !local.deleted) return local.deletedAt && stamp(local.deletedAt) > stamp(remote.updatedAt) ? local : remote;
  return stamp(local.updatedAt) >= stamp(remote.updatedAt) ? local : remote;
}

/**
 * Merge server documents into the local collection. Reference entities always
 * take the server version; transactional entities use last-write-wins.
 */
export function mergeRemote(localRows, remoteRows, opts = {}) {
  const authoritative = new Set(opts.authoritative || ['product', 'category', 'setting', 'table']);
  const byId = new Map((localRows || []).map((row) => [row.id, row]));
  const applied = [];
  const conflicts = [];

  (remoteRows || []).forEach((remote) => {
    if (!remote || !remote.id) return;
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remote);
      applied.push({ id: remote.id, action: 'insert' });
      return;
    }
    if (authoritative.has(remote.entity)) {
      if (stamp(local.updatedAt) !== stamp(remote.updatedAt)) conflicts.push({ id: remote.id, winner: 'server' });
      byId.set(remote.id, remote);
      applied.push({ id: remote.id, action: 'replace' });
      return;
    }
    const winner = resolveConflict(local, remote);
    if (winner === local) {
      conflicts.push({ id: remote.id, winner: 'local' });
      return;
    }
    byId.set(remote.id, winner);
    applied.push({ id: remote.id, action: 'update' });
  });

  return { rows: [...byId.values()], applied, conflicts };
}

export function syncStatus(outbox, opts = {}) {
  const ops = (outbox && outbox.ops) || [];
  return {
    online: opts.online !== false,
    pending: ops.filter((op) => op.status !== 'synced').length,
    failed: ops.filter((op) => op.status === 'failed').length,
    synced: ops.filter((op) => op.status === 'synced').length,
    total: ops.length,
    lastPushedAt: (outbox && outbox.lastPushedAt) || null,
    deviceId: (outbox && outbox.deviceId) || null
  };
}
