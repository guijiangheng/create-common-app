import { execSync } from 'child_process';
import _debug from 'debug';
import path from 'path';

import { emptyDir } from './helper';

const debug = _debug('app:git');

export const tryGitInit = (root: string) => {
  debug('Try init git repository');

  let didInit = false;

  try {
    execSync('git init', { stdio: 'ignore' });

    didInit = true;

    execSync('git checkout -b main', { stdio: 'ignore' });
    execSync('git add -A', { stdio: 'ignore' });
    execSync('git commit -m "Initial commit from Create Common App"', {
      stdio: 'ignore',
    });
    return true;
  } catch (err) {
    if (didInit) {
      try {
        emptyDir(path.resolve(root, '.git'));
      } catch {
        // ignore
      }
    }
  }

  return false;
};
