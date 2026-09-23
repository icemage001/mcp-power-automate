import { makeFlowKey } from './flow-key.js';
import { z } from 'zod';

import { normalizedFlowSchema, type NormalizedFlow } from './schemas.js';
import { getDataFilePath } from './runtime-paths.js';
import { readVersionedStore, writeVersionedStore } from './store-utils.js';

const STORE_NAME = 'flow-backups';
const STORE_VERSION = 1;
const flowBackupSchema = z.object({
  capturedAt: z.string().trim().min(1),
  flow: normalizedFlowSchema,
  flowHash: z.string().regex(/^[a-f0-9]{64}$/i),
});

export interface FlowBackup {
  capturedAt: string;
  flow: NormalizedFlow;
  flowHash: string;
}

const normalizeStoredShape = (rawValue: unknown) => {
  const records = (rawValue as { records?: Record<string, unknown> } | null | undefined)?.records || {};
  return Object.fromEntries(
    Object.entries(records).map(([key, value]) => [
      key,
      z.array(flowBackupSchema).parse(value),
    ]),
  );
};

let backupsByKey: Record<string, FlowBackup[]> = {};

export const loadFlowBackups = async () => {
  backupsByKey = (await readVersionedStore({
    filePath: getDataFilePath('flow-backups.json'),
    migrate: normalizeStoredShape,
    name: STORE_NAME,
    parse: normalizeStoredShape,
    version: STORE_VERSION,
  })) || {};
  return backupsByKey;
};

export const getFlowBackups = ({ envId, flowId }: { envId: string; flowId: string }) =>
  [...(backupsByKey[makeFlowKey({ envId, flowId })] || [])].reverse();

export const saveFlowBackup = async (flow: NormalizedFlow, flowHash: string) => {
  const backup: FlowBackup = {
    capturedAt: new Date().toISOString(),
    flow,
    flowHash,
  };
  const key = makeFlowKey(flow);
  backupsByKey = {
    ...backupsByKey,
    [key]: [...(backupsByKey[key] || []), backup],
  };
  await writeVersionedStore({
    data: { records: backupsByKey },
    filePath: getDataFilePath('flow-backups.json'),
    name: STORE_NAME,
    version: STORE_VERSION,
  });
  return backup;
};
