declare module 'node:assert/strict' {
  type Assert = {
    (value: unknown, message?: string): asserts value;
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    match(value1: unknown, value2: unknown): boolean;
  };

  const assert: Assert;
  export default assert;
}

declare module 'node:child_process' {
  export type SpawnSyncReturns = {
    status: number | null;
    stdout: string;
    stderr: string;
  };

  export const spawnSync: (
    command: string,
    args?: string[],
    options?: { cwd?: string; input?: string; encoding?: string },
  ) => SpawnSyncReturns;
}

declare module 'node:fs' {
  export type Dirent = {
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
  };

  export const existsSync: (path: string) => boolean;
  export const mkdirSync: (
    path: string,
    options?: { recursive?: boolean },
  ) => void;
  export const mkdtempSync: (prefix: string) => string;
  export const readdirSync: (
    path: string,
    options: { withFileTypes: true },
  ) => Dirent[];
  export const readFileSync: (path: string, encoding: string) => string;
  export const copyFileSync: (src: string, dest: string, mode?: string) => void;
  export const rmSync: (
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ) => void;
  export const writeFileSync: (
    path: string,
    data: string,
    encoding?: string,
  ) => void;
}

declare module 'node:path' {
  export const dirname: (path: string) => string;
  export const join: (...paths: string[]) => string;
  export const relative: (from: string, to: string) => string;
  export const resolve: (...paths: string[]) => string;
}

declare module 'node:test' {
  export type TestContext = {
    after: (fn: () => void) => void;
  };

  type TestFn = (t: TestContext) => void | Promise<void>;
  const test: (name: string, fn: TestFn) => void;
  export default test;
}

declare module 'node:url' {
  export const fileURLToPath: (url: string | URL) => string;
  export const pathToFileURL: (path: string) => { href: string };
}

declare const console: {
  error: (...data: unknown[]) => void;
  log: (...data: unknown[]) => void;
};

declare const process: {
  argv: string[];
  cwd: () => string;
  execPath: string;
  exit: (code?: number) => never;
  version: string;
  versions: { node: string };
};

interface ImportMeta {
  main: boolean;
}
