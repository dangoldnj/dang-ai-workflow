// The workflow scripts rely on Node's native TypeScript type stripping for
// `.ts` files, which is unflagged only from Node 22.18.0 onward. On older
// runtimes the stripping fails with a cryptic unknown-extension error, so we
// fail fast here with an actionable message instead.
const MINIMUM_NODE_VERSION = [22, 18, 0] as const;

const isBelowMinimum = (
  current: readonly number[],
  minimum: readonly number[],
): boolean => {
  for (let i = 0; i < minimum.length; i += 1) {
    const value = current[i] ?? 0;
    if (value !== minimum[i]) return value < minimum[i];
  }
  return false;
};

export const requireNodeVersion = (): void => {
  const current = process.versions.node.split('.').map(Number);
  if (!isBelowMinimum(current, MINIMUM_NODE_VERSION)) return;

  console.error(
    `This script requires Node >= ${MINIMUM_NODE_VERSION.join('.')}, but found ${process.version}.`,
  );
  console.error(
    'The workflow scripts rely on native TypeScript type stripping for .ts files. Upgrade Node and retry.',
  );
  process.exit(2);
};
