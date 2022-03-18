import fs from 'fs';
import stringify from 'json-stable-stringify-without-jsonify';
import os from 'os';
import path from 'path';

export const isEmpty = (dir: string) => !fs.readdirSync(dir).length;

export const emptyDir = (dir: string) => {
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const abs = path.resolve(dir, file);
      if (fs.statSync(abs).isDirectory()) {
        emptyDir(abs);
        fs.rmdirSync(abs);
      } else {
        fs.unlinkSync(abs);
      }
    }
  }
};

export type CopyOptions = {
  rename?: (name: string) => string;
};

export const copyDir = (src: string, dest: string, options?: CopyOptions) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const file of fs.readdirSync(src)) {
    const srcFile = path.resolve(src, file);
    const destFile = path.resolve(dest, options?.rename?.(file) || file);

    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile, options);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
};

export const copy = (src: string, dest: string) => {
  if (fs.statSync(src).isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
};

export const writeJSONFile = (config: Object, filePath: string) => {
  fs.writeFileSync(
    filePath,
    stringify(config, {
      cmp: (a: any, b: any) => (a.key > b.key ? 1 : -1),
      space: 4,
    }) + os.EOL,
    'utf8',
  );
};
