import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { storage } from './storage';
import type { Client } from '../types';

export type OfflineActionType =
  | 'client.create'
  | 'client.update'
  | 'client.delete';

export type OfflineActionStatus =
  | 'pending'
  | 'processing'
  | 'failed';

export interface OfflineAction {
  id: string;
  idempotencyKey: string;
  type: OfflineActionType;
  entityId: string;
  payload: Record<string, any>;
  expectedVersion: number | null;
  status: OfflineActionStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  nextRetryAt: number;
  lastError?: string | null;
}

export interface QueueSnapshot {
  pending: number;
  failed: number;
  processing: number;
  total: number;
}

type Scope = {
  userId: string;
  gymId: string;
};

type Listener = (
  snapshot: QueueSnapshot
) => void;

let currentScope: Scope | null =
  null;

const listeners = new Set<Listener>();

let processingPromise:
  Promise<QueueSnapshot> | null =
  null;

const bytesToUuid = (
  bytes: Uint8Array
) => {
  bytes[6] =
    (bytes[6] & 0x0f) | 0x40;
  bytes[8] =
    (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes).map(
    value =>
      value
        .toString(16)
        .padStart(2, '0')
  );

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

export const createOfflineUuid = () => {
  const bytes = new Uint8Array(16);
  const cryptoObject =
    (globalThis as any).crypto;

  if (
    cryptoObject?.getRandomValues
  ) {
    cryptoObject.getRandomValues(
      bytes
    );
  } else {
    for (
      let index = 0;
      index < bytes.length;
      index++
    ) {
      bytes[index] =
        Math.floor(
          Math.random() * 256
        );
    }
  }

  return bytesToUuid(bytes);
};

const queueKey = () => {
  if (!currentScope) {
    throw new Error(
      'Offline queue scope is not ready.'
    );
  }

  return [
    '@gym_app',
    'v2',
    currentScope.userId,
    currentScope.gymId,
    'offline_queue',
  ].join(':');
};

const readQueue = async () => {
  if (!currentScope) return [];

  const raw =
    await AsyncStorage.getItem(
      queueKey()
    );

  return raw
    ? (JSON.parse(raw) as OfflineAction[])
    : [];
};

const snapshotOf = (
  queue: OfflineAction[]
): QueueSnapshot => ({
  pending: queue.filter(
    item => item.status === 'pending'
  ).length,
  failed: queue.filter(
    item => item.status === 'failed'
  ).length,
  processing: queue.filter(
    item => item.status === 'processing'
  ).length,
  total: queue.length,
});

const emit = async () => {
  const snapshot =
    snapshotOf(await readQueue());

  listeners.forEach(listener =>
    listener(snapshot)
  );

  return snapshot;
};

const writeQueue = async (
  queue: OfflineAction[]
) => {
  if (!currentScope) return;

  await AsyncStorage.setItem(
    queueKey(),
    JSON.stringify(queue)
  );

  await emit();
};

const isConflict = (
  error: unknown
) =>
  String(
    (error as any)?.message ??
      error ??
      ''
  ).includes('SYNC_CONFLICT');

const backoffMs = (
  attempts: number
) => {
  const seconds = Math.min(
    5 * Math.pow(2, attempts),
    5 * 60
  );

  return seconds * 1000;
};

const serverRowToClient = (
  row: any
): Client => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  age: row.age,
  gender: row.gender,
  weight: row.weight,
  height: row.height,
  chest: row.chest,
  waist: row.waist,
  bmi: row.bmi,
  photoUrl: row.photo_url,
  membershipStatus:
    row.membership_status,
  registrationDate:
    row.registration_date,
  membershipDueDate:
    row.membership_due_date,
  serverUpdatedAt:
    row.updated_at ?? null,
  syncVersion:
    Number(
      row.sync_version ?? 1
    ),
  syncState: 'synced',
});

const mergeServerClient =
  async (
    row: any
  ) => {
    const clients =
      await storage.getClients();

    const mapped =
      serverRowToClient(row);

    const index =
      clients.findIndex(
        item =>
          item.id === mapped.id
      );

    if (index >= 0) {
      clients[index] = mapped;
    } else {
      clients.push(mapped);
    }

    await storage.saveClients(
      clients
    );
  };

const execute = async (
  action: OfflineAction
) => {
  if (!currentScope) {
    throw new Error(
      'Offline queue scope disappeared.'
    );
  }

  const { data, error } =
    await (supabase as any).rpc(
      'apply_client_mutation',
      {
        p_gym_id:
          currentScope.gymId,
        p_operation: action.type,
        p_client_id:
          action.entityId,
        p_payload:
          action.payload,
        p_expected_version:
          action.expectedVersion,
        p_idempotency_key:
          action.idempotencyKey,
      }
    );

  if (error) throw error;

  if (
    action.type !==
      'client.delete' &&
    data?.id
  ) {
    await mergeServerClient(data);
  }
};

export const offlineQueue = {
  setScope: (
    userId: string | null | undefined,
    gymId: string | null | undefined
  ) => {
    currentScope =
      userId && gymId
        ? { userId, gymId }
        : null;

    emit().catch(() => {});
  },

  subscribe: (
    listener: Listener
  ) => {
    listeners.add(listener);

    emit().catch(() => {});

    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot: async () =>
    snapshotOf(await readQueue()),

  enqueueClientCreate: async (
    clientId: string,
    payload: Record<string, any>
  ) => {
    const queue = await readQueue();

    const withoutEntity =
      queue.filter(
        item =>
          item.entityId !== clientId
      );

    const now = Date.now();

    withoutEntity.push({
      id: createOfflineUuid(),
      idempotencyKey:
        createOfflineUuid(),
      type: 'client.create',
      entityId: clientId,
      payload,
      expectedVersion: null,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextRetryAt: now,
      lastError: null,
    });

    await writeQueue(
      withoutEntity
    );
  },

  enqueueClientUpdate: async (
    clientId: string,
    payload: Record<string, any>,
    expectedVersion:
      number | null | undefined
  ) => {
    const queue = await readQueue();
    const now = Date.now();

    const createIndex =
      queue.findIndex(
        item =>
          item.entityId ===
            clientId &&
          item.type ===
            'client.create' &&
          item.status !==
            'failed'
      );

    if (createIndex >= 0) {
      queue[createIndex] = {
        ...queue[createIndex],
        payload: {
          ...queue[createIndex]
            .payload,
          ...payload,
        },
        updatedAt: now,
      };

      await writeQueue(queue);
      return;
    }

    const updateIndex =
      queue.findIndex(
        item =>
          item.entityId ===
            clientId &&
          item.type ===
            'client.update' &&
          item.status !==
            'failed'
      );

    if (updateIndex >= 0) {
      queue[updateIndex] = {
        ...queue[updateIndex],
        payload,
        updatedAt: now,
        status: 'pending',
        nextRetryAt: now,
      };

      await writeQueue(queue);
      return;
    }

    queue.push({
      id: createOfflineUuid(),
      idempotencyKey:
        createOfflineUuid(),
      type: 'client.update',
      entityId: clientId,
      payload,
      expectedVersion:
        expectedVersion ?? null,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextRetryAt: now,
      lastError: null,
    });

    await writeQueue(queue);
  },

  enqueueClientDelete: async (
    clientId: string,
    expectedVersion:
      number | null | undefined
  ) => {
    let queue = await readQueue();

    const hasPendingCreate =
      queue.some(
        item =>
          item.entityId ===
            clientId &&
          item.type ===
            'client.create' &&
          item.status !==
            'failed'
      );

    if (hasPendingCreate) {
      queue = queue.filter(
        item =>
          item.entityId !==
          clientId
      );

      await writeQueue(queue);
      return;
    }

    queue = queue.filter(
      item =>
        !(
          item.entityId ===
            clientId &&
          item.type ===
            'client.update'
        )
    );

    const now = Date.now();

    queue.push({
      id: createOfflineUuid(),
      idempotencyKey:
        createOfflineUuid(),
      type: 'client.delete',
      entityId: clientId,
      payload: {},
      expectedVersion:
        expectedVersion ?? null,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextRetryAt: now,
      lastError: null,
    });

    await writeQueue(queue);
  },

  retryFailed: async () => {
    const queue = await readQueue();
    const now = Date.now();

    const next = queue.map(
      item =>
        item.status === 'failed'
          ? {
              ...item,
              status:
                'pending' as const,
              attempts: 0,
              updatedAt: now,
              nextRetryAt: now,
              lastError: null,
            }
          : item
    );

    await writeQueue(next);
  },

  processQueue:
    async (): Promise<QueueSnapshot> => {
      if (processingPromise) {
        return processingPromise;
      }

      processingPromise =
        (async () => {
          let queue =
            await readQueue();

          const ordered = [
            ...queue,
          ].sort(
            (a, b) =>
              a.createdAt -
              b.createdAt
          );

          for (const item of ordered) {
            const current =
              queue.find(
                value =>
                  value.id ===
                  item.id
              );

            if (
              !current ||
              current.status ===
                'failed' ||
              current.nextRetryAt >
                Date.now()
            ) {
              continue;
            }

            current.status =
              'processing';
            current.updatedAt =
              Date.now();

            await writeQueue(queue);

            try {
              await execute(current);

              queue =
                queue.filter(
                  value =>
                    value.id !==
                    current.id
                );

              await writeQueue(queue);
            } catch (error: any) {
              const target =
                queue.find(
                  value =>
                    value.id ===
                    current.id
                );

              if (!target) continue;

              target.attempts += 1;
              target.updatedAt =
                Date.now();
              target.lastError =
                String(
                  error?.message ??
                    error ??
                    'Sync failed'
                );

              if (
                isConflict(error) ||
                target.attempts >= 5
              ) {
                target.status =
                  'failed';
              } else {
                target.status =
                  'pending';
                target.nextRetryAt =
                  Date.now() +
                  backoffMs(
                    target.attempts
                  );
              }

              await writeQueue(queue);

              if (
                !isConflict(error)
              ) {
                break;
              }
            }
          }

          return emit();
        })().finally(() => {
          processingPromise =
            null;
        });

      return processingPromise;
    },
};