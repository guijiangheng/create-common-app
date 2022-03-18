"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDevDependencies = exports.normalizePackageName = exports.getPeerDependencies = exports.fetchPeerDependencies = void 0;
const spawn = __importStar(require("cross-spawn"));
/**
 * Fetch `peerDependencies` of the given package by `npm show` command.
 *
 * @param packageName - The package name to fetch peerDependencies.
 * @returns Gotten peerDependencies. Returns null if npm was not found.
 */
const fetchPeerDependencies = (packageName) => {
    var _a;
    const result = spawn.sync('npm', ['show', '--json', packageName, 'peerDependencies'], { encoding: 'utf8' });
    if (((_a = result.error) === null || _a === void 0 ? void 0 : _a.code) === 'ENOENT') {
        return null;
    }
    return JSON.parse(result.stdout.trim() || '{}');
};
exports.fetchPeerDependencies = fetchPeerDependencies;
/**
 * Get the peer dependencies of the given module.
 * This adds the gotten value to cache at the first time, then reuses it.
 *
 * @param packageName - The module name to get.
 * @returns The peer dependencies of the given module.
 * This object is the object of `peerDependencies` field of `package.json`.
 * Returns null if npm was not found.
 */
const getPeerDependencies = (packageName) => {
    let result = exports.getPeerDependencies.cache.get(packageName);
    if (!result) {
        result = (0, exports.fetchPeerDependencies)(packageName);
        exports.getPeerDependencies.cache.set(packageName, result);
    }
    return result;
};
exports.getPeerDependencies = getPeerDependencies;
exports.getPeerDependencies.cache = new Map();
/**
 * Brings package name to correct format based on prefix
 *
 * @param name - The name of the package
 * @param prefix - Can be either 'eslint-plugin', 'eslint-config' or 'eslint-formatter'
 * @returns Normalized name of the package
 */
const normalizePackageName = (name, prefix) => {
    /**
     * On Windows, name can come in with Windows slashes instead of Unix slashes.
     * Normalize to Unix first to avoid errors later on.
     * https://github.com/eslint/eslint/issues/5644
     */
    if (name.includes('\\')) {
        name = name.replace(/\\/gu, '/');
    }
    if (name.charAt(0) === '@') {
        const scopedPackageShortcutRegex = new RegExp(`^(@[^/]+)(?:/(?:${prefix})?)?$`, 'u');
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
exports.normalizePackageName = normalizePackageName;
/**
 * Install node modules synchronously and save to devDependencies in package.json
 * @param packages - Node module or modules to install
 * @returns Weather npm install success
 */
const installDevDependencies = (packages) => {
    var _a;
    packages = Array.isArray(packages) ? packages : [packages];
    if (!packages.length) {
        return true;
    }
    const result = spawn.sync('npm', ['i', '--save-dev'].concat(packages), {
        stdio: 'inherit',
        env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
    });
    if (((_a = result.error) === null || _a === void 0 ? void 0 : _a.code) === 'ENOENT') {
        const pluralS = packages.length > 1 ? 's' : '';
        console.error(`Could not execute npm. Please install the following package${pluralS} with a package manager of your choice: ${packages.join(', ')}`);
        return false;
    }
    return true;
};
exports.installDevDependencies = installDevDependencies;
