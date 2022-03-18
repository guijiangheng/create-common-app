import fs from 'fs';
import { red } from 'kolorist';
import path from 'path';
import prompts from 'prompts';

import { Answer, createApp } from './builder';
import { isEmpty } from './helper';
import { isValidPackageName } from './npm-utils';

(async () => {
  try {
    let targetDir = '';
    const answers = await prompts(
      [
        {
          type: 'text',
          name: 'targetDir',
          message: 'Project name:',
          initial: 'my-app',
          onState: (state) => {
            targetDir = (state.value as string).trim() || 'my-app';
            return targetDir;
          },
          validate: (dir: string) =>
            isValidPackageName(path.basename(path.resolve(dir))) ||
            'Invalid package name',
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm',
          name: 'overwrite',
          message: () =>
            `${
              targetDir === '.'
                ? 'Current directory'
                : `Target directory ${targetDir}`
            } is not empty. Remove existing files and continue`,
        },
        {
          type: (overwrite: boolean) => {
            if (!overwrite) {
              throw new Error(`${red('✖')} Operation cancelled`);
            }
            return null;
          },
          name: 'overwriteChecker',
        },
        {
          type: 'select',
          name: 'framework',
          message: 'Select a framework:',
          choices: [
            { title: 'Vite', value: 'vite' },
            { title: 'Next', value: 'next' },
            { title: 'None of these', value: 'none' },
          ],
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'Use typescript?',
        },
        {
          type: (_, values) =>
            values.framework === 'none' ? 'multiselect' : null,
          name: 'env',
          message: 'Environment:',
          choices: [
            { title: 'Browser', value: 'browser' },
            { title: 'Node', value: 'node' },
          ],
        },
      ],
      {
        onCancel: () => {
          throw new Error(`${red('✖')} Operation cancelled`);
        },
      },
    );
    createApp({
      ...answers,
      env:
        answers.framework === 'next'
          ? ['browser', 'node']
          : answers.framework === 'vite'
          ? ['browser']
          : (answers.env as string[]),
    });
  } catch (e: any) {
    console.error(e.message);
  }
})();
