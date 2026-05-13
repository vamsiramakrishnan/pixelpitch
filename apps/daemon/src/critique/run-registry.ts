export interface RunHandle {
  runId: string;
  projectId: string;
  abort: AbortController;
  startedAt: number;
}

export interface RunRegistry {
  register(handle: RunHandle): void;
  get(projectId: string, runId: string): RunHandle | null;
  interrupt(projectId: string, runId: string, reason?: string): boolean;
  unregister(projectId: string, runId: string): void;
  list(): RunHandle[];
}

function compositeKey(projectId: string, runId: string): string {
  return `${projectId}|${runId}`;
}

export function createRunRegistry(): RunRegistry {
  const store = new Map<string, RunHandle>();

  return {
    register(handle) {
      const key = compositeKey(handle.projectId, handle.runId);
      if (store.has(key)) {
        throw new Error(
          `RunRegistry: duplicate (projectId="${handle.projectId}", runId="${handle.runId}")`,
        );
      }
      store.set(key, handle);
    },

    get(projectId, runId) {
      return store.get(compositeKey(projectId, runId)) ?? null;
    },

    interrupt(projectId, runId, reason) {
      const handle = store.get(compositeKey(projectId, runId));
      if (!handle) return false;
      handle.abort.abort(reason);
      return true;
    },

    unregister(projectId, runId) {
      store.delete(compositeKey(projectId, runId));
    },

    list() {
      return [...store.values()];
    },
  };
}
