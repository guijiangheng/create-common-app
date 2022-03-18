import * as spawn from 'cross-spawn';
import _debug from 'debug';

const debug = _debug('app:npm-utils');

export const isValidPackageName = (projectName: string) =>
  /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    projectName,
  );

export const toValidPackageName = (projectName: string) =>
  projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-');

export const fetchPeerDependencies = (packageName: string) => {
  debug(`Fetching peerDependencies of ${packageName}`);

  const result = spawn.sync(
    'npm',
    ['show', '--json', packageName, 'peerDependencies'],
    { encoding: 'utf8' },
  );

  if ((result.error as any)?.code === 'ENOENT') {
    debug(`Fetching peerDependencies of ${packageName} failed`);
    return undefined;
  }

  const dependencies = JSON.parse(result.stdout.trim() || '{}') as Record<
    string,
    string
  >;

  debug(`PeerDependencies %O`, dependencies);

  return dependencies;
};

export const getPeerDependencies = (packageName: string) => {
  let result = getPeerDependencies.cache.get(packageName);

  if (!result) {
    result = fetchPeerDependencies(packageName);
    if (result) {
      getPeerDependencies.cache.set(packageName, result);
    }
  }

  return result;
};

getPeerDependencies.cache = new Map<string, Record<string, string>>();

export const normalizePackageName = (
  name: string,
  prefix: 'eslint-plugin' | 'eslint-config' | 'eslint-formatter',
) => {
  debug(`Normalize package name, name: ${name}, prefix: ${prefix}`);

  /**
   * On Windows, name can come in with Windows slashes instead of Unix slashes.
   * Normalize to Unix first to avoid errors later on.
   * https://github.com/eslint/eslint/issues/5644
   */
  if (name.includes('\\')) {
    name = name.replace(/\\/gu, '/');
  }

  let result = '';

  if (name.charAt(0) === '@') {
    const scopedPackageShortcutRegex = new RegExp(
      `^(@[^/]+)(?:/(?:${prefix})?)?$`,
      'u',
    );

    if (scopedPackageShortcutRegex.test(name)) {
      result = name.replace(scopedPackageShortcutRegex, `$1/${prefix}`);
    } else {
      result = name.split('/')[1].startsWith(`${prefix}-`)
        ? name
        : name.replace(/^@([^/]+)\/(.*)$/u, `@$1/${prefix}-$2`);
    }
  } else {
    // Remove sub path, for example `airbnb-typescript/base`.
    const module = name.includes('/') ? name.split('/')[0] : name;

    result = name.startsWith(`${prefix}-`) ? module : `${prefix}-${module}`;
  }

  debug(`Normalized package name: ${result}`);

  return result;
};

type InstallOptions = {
  dev?: boolean;
};

export const installDependencies = (
  packages: string | string[],
  { dev = false }: InstallOptions = {},
) => {
  packages = Array.isArray(packages) ? packages : [packages];

  if (!packages.length) {
    return true;
  }

  debug(`Installing ${dev ? 'development' : ''} dependencies: %O`, packages);

  const result = spawn.sync(
    'npm',
    (['i', dev && '--save-dev'].filter(Boolean) as string[]).concat(packages),
    {
      stdio: 'inherit',
      env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
    },
  );

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
