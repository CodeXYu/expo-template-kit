import { copyFileSync, existsSync } from 'node:fs';

for (const profile of ['development', 'int', 'production']) {
  const destination = new URL('../.env.' + profile, import.meta.url);
  if (!existsSync(destination)) {
    copyFileSync(new URL('../packages/kit/template/env.' + profile, import.meta.url), destination);
  }
}
