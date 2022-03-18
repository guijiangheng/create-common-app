import * as spawn from 'cross-spawn';

/**
 * Fetch `peerDependencies` of the given package by `npm show` command.
 *
 * @param packageName - The package name to fetch peerDependencies.
 * @returns Gotten peerDependencies. Returns null if npm was not found.
 */
export const fetchPeerDependencies = (packageName: string) => {
  const result = spawn.sync(
    'npm',
    ['show', '--json', packageName, 'peerDependencies'],
    { encoding: 'utf8' },
  );

  if ((result.error as any)?.code === 'ENOENT') {
    return null;
  }

  return JSON.parse(result.stdout.trim() || '{}') as Record<string, string>;
};

/**
 * Get the peer dependencies of the given module.
 * This adds the gotten value to cache at the first time, then reuses it.
 *
 * @param packageName - The module name to get.
 * @returns The peer dependencies of the given module.
 * This object is the object of `peerDependencies` field of `package.json`.
 * Returns null if npm was not found.
 */
export const getPeerDependencies = (packageName: string) => {
  let result = getPeerDependencies.cache.get(packageName);

  if (!result) {
    result = fetchPeerDependencies(packageName);
    getPeerDependencies.cache.set(packageName, result);
  }

  return result;
};

getPeerDependencies.cache = new Map();

/**
 * Brings package name to correct format based on prefix
 *
 * @param name - The name of the package
 * @param prefix - Can be either 'eslint-plugin', 'eslint-config' or 'eslint-formatter'
 * @returns Normalized name of the package
 */
export const normalizePackageName = (
  name: string,
  prefix: 'eslint-plugin' | 'eslint-config' | 'eslint-formatter',
) => {
  /**
   * On Windows, name can come in with Windows slashes instead of Unix slashes.
   * Normalize to Unix first to avoid errors later on.
   * https://github.com/eslint/eslint/issues/5644
   */
  if (name.includes('\\')) {
    name = name.replace(/\\/gu, '/');
  }

  if (name.charAt(0) === '@') {
    const scopedPackageShortcutRegex = new RegExp(
      `^(@[^/]+)(?:/(?:${prefix})?)?$`,
      'u',
    );

    if (scopedPackageShortcutRegex.test(name)) {
      return name.replace(scopedPackageShortcutRegex, `$1/${prefix}`);
    }

    return name.split('/')[1].startsWith(`${prefix}-`)
      ? name
      : name.replace(/^@([^/]+)\/(.*)$/u, `@$1/${prefix}-$2`);
  }

  // Remove sub path, for example `airbnb-typescript/base`.
  const module = name.includes('/') ? name.split('/')[0] : name;

  return name.startsWith(`${prefix}-`) ? module : `${prefix}-${module}`;
};

/**
 * Install node modules synchronously and save to devDependencies in package.json
 * @param packages - Node module or modules to install
 * @returns Weather npm install success
 */
export const installDevDependencies = (packages: string | string[]) => {
  packages = Array.isArray(packages) ? packages : [packages];

  if (!packages.length) {
    return true;
  }

  const result = spawn.sync('npm', ['i', '--save-dev'].concat(packages), {
    stdio: 'inherit',
    env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
  });

  if ((result.error as any)?.code === 'ENOENT') {
    const pluralS = packages.length > 1 ? 's' : '';

    console.error(
      `Could not execute npm. Please install the following package${pluralS} with a package manager of your choice: ${packages.join(
        ', ',
      )}`,
    );

    return false;
  }

  return true;
};
