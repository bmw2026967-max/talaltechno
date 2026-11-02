import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOutbox,
  enqueue,
  pendingCount,
  pushOutbox,
  mergeRemote,
  resolveConflict,
  syncStatus
} from '../src/sync.js';

test('outbox queues operations in order and counts pending work', () => {
  let outbox = createOutbox();
  outbox = enqueue(outbox, { entity: 'sale', type: 'create', entityId: 'i1', payload: { total: 10 } });
  outbox = enqueue(outbox, { entity: 'sale', type: 'create', entityId: 'i2', payload: { total: 20 } });

  assert.equal(outbox.ops.length, 2);
  assert.equal(pendingCount(outbox), 2);
  assert.equal(outbox.ops[0].status, 'pending');
  assert.equal(outbox.ops[1].entityId, 'i2');
});

test('push marks accepted operations as synced', async () => {
  let outbox = createOutbox();
  outbox = enqueue(outbox, { id: 'op1', entity: 'sale', type: 'create' });
  outbox = enqueue(outbox, { id: 'op2', entity: 'sale', type: 'create' });

  const transport = { push: async (ops) => ({ accepted: ops.map((op) => op.id) }) };
  const result = await pushOutbox(outbox, transport);

  assert.equal(result.pushed, 2);
  assert.equal(result.failed, null);
  assert.equal(pendingCount(result.outbox), 0);
  assert.ok(result.outbox.lastPushedAt);
  assert.equal(syncStatus(result.outbox).synced, 2);
});

test('a failed push keeps the batch pending and records the error', async () => {
  let outbox = createOutbox();
  outbox = enqueue(outbox, { id: 'op1', entity: 'sale', type: 'create' });

  const transport = { push: async () => { throw new Error('network down'); } };
  const result = await pushOutbox(outbox, transport);

  assert.equal(result.pushed, 0);
  assert.equal(result.failed, 'network down');
  assert.equal(result.outbox.ops[0].status, 'failed');
  assert.equal(result.outbox.ops[0].attempts, 1);
  assert.equal(syncStatus(result.outbox).failed, 1);
});

test('push processes at most one batch per call', async () => {
  let outbox = createOutbox();
  for (let i = 0; i < 5; i += 1) outbox = enqueue(outbox, { id: `op${i}`, entity: 'sale', type: 'create' });

  const transport = { push: async (ops) => ({ accepted: ops.map((op) => op.id) }) };
  const result = await pushOutbox(outbox, transport, { batchSize: 2 });

  assert.equal(result.pushed, 2);
  assert.equal(pendingCount(result.outbox), 3);
});

test('server wins for authoritative reference data', () => {
  const local = [{ id: 'p1', entity: 'product', updatedAt: '2026-10-27T10:00:00Z', price: 10 }];
  const remote = [{ id: 'p1', entity: 'product', updatedAt: '2026-10-27T09:00:00Z', price: 12 }];
  const result = mergeRemote(local, remote, { authoritative: ['product'] });
  assert.equal(result.rows[0].price, 12);
  assert.equal(result.conflicts[0].winner, 'server');
});

test('last write wins for transactional data', () => {
  const local = [{ id: 's1', entity: 'sale', updatedAt: '2026-10-27T10:00:00Z', status: 'open' }];
  const remote = [{ id: 's1', entity: 'sale', updatedAt: '2026-10-27T09:00:00Z', status: 'paid' }];
  const result = mergeRemote(local, remote);
  assert.equal(result.rows[0].status, 'open');
  assert.equal(result.conflicts[0].winner, 'local');
});

test('remote inserts are applied and tombstones win by timestamp', () => {
  const local = [{ id: 's1', updatedAt: '2026-10-27T09:00:00Z', deleted: false }];
  const remote = [
    { id: 's1', updatedAt: '2026-10-27T10:00:00Z', deleted: true, deletedAt: '2026-10-27T10:00:00Z' },
    { id: 's2', updatedAt: '2026-10-27T10:00:00Z', deleted: false }
  ];
  const result = mergeRemote(local, remote);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.find((row) => row.id === 's1').deleted, true);
  assert.equal(result.applied.find((row) => row.id === 's2').action, 'insert');
});

test('resolveConflict prefers the newest timestamp', () => {
  const older = { id: 'x', updatedAt: '2026-01-01T00:00:00Z', value: 1 };
  const newer = { id: 'x', updatedAt: '2026-02-01T00:00:00Z', value: 2 };
  assert.equal(resolveConflict(older, newer).value, 2);
  assert.equal(resolveConflict(newer, older).value, 2);
  assert.equal(resolveConflict(null, newer).value, 2);
  assert.equal(resolveConflict(older, null).value, 1);
});

test('sync status reports offline state', () => {
  let outbox = createOutbox();
  outbox = enqueue(outbox, { entity: 'sale', type: 'create' });
  const status = syncStatus(outbox, { online: false });
  assert.equal(status.online, false);
  assert.equal(status.pending, 1);
});
