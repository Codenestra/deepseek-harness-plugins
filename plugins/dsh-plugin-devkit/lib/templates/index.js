/**
 * Central template registry for the devkit scaffold.
 *
 * Pure rendering only: form in, file tree out. Directory generation with the
 * overwrite-refusal rules lives in lib/scaffold.js.
 */
import { iconSvg, localeFiles, packageJson, patchYml } from './manifest.js'
import { hostIndex, storeLib } from './host.js'
import { clientBundle } from './client.js'
import { readmeEn, readmeZh, smokeTest } from './docs.js'

export { TEMPLATE_VERSION, TEMPLATE_BASELINE, FEATURES, CLIENT_INJECT_PRESETS, fill } from './meta.js'

/**
 * Render the complete file tree for a normalized form. Pure: no fs access.
 * @param form - normalized scaffold form (see lib/scaffold.js).
 * @returns array of { path, content } sorted by path.
 */
export function templateFiles(form) {
  const files = [
    { path: 'package.json', content: packageJson(form) },
    { path: 'cordis.patch.yml', content: patchYml(form) },
    { path: 'index.js', content: hostIndex(form) },
    { path: 'client.js', content: clientBundle(form) },
    ...localeFiles(form),
    { path: 'icon.svg', content: iconSvg() },
    { path: 'README.md', content: readmeEn(form) },
    { path: 'README.zh.md', content: readmeZh(form) },
    { path: 'tests/smoke.test.mjs', content: smokeTest(form) },
  ]
  if (form.features.sqlite) files.push({ path: 'lib/store.js', content: storeLib(form) })
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}