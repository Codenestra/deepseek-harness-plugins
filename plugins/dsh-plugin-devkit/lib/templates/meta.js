/**
 * Template metadata shared by every template module.
 *
 * The baseline is the user's usage-center plugin (read in full before these
 * templates were distilled). TEMPLATE_VERSION locks the template contract:
 * bump it whenever the generated shape changes, and update the locked
 * snapshot in tests/__snapshots__ after a hand review.
 */

/** Template contract version (semver). */
export const TEMPLATE_VERSION = '1.0.0'
/** Human-readable baseline the templates were distilled from. */
export const TEMPLATE_BASELINE = 'usage-center@1.1.2'
/** Optional feature blocks offered by the scaffold form. */
export const FEATURES = Object.freeze(['httpApi', 'sqlite', 'timer', 'settings'])

/** Client inject presets: the usage-center basic four, plus the full surface. */
export const CLIENT_INJECT_PRESETS = Object.freeze({
  basic: Object.freeze([
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-sidebar',
    '@deepseek-ai/dsh-client-ui-renderer',
  ]),
  full: Object.freeze([
    '@deepseek-ai/dsh-api-remotes',
    '@deepseek-ai/dsh-api-session-controller',
    '@deepseek-ai/dsh-api-workspace-controller',
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-renderer',
    '@deepseek-ai/dsh-client-ui-sidebar',
    '@deepseek-ai/dsh-client-ui-workspace',
  ]),
})

/** Render a value as a safe single-quoted JS string literal (titles may contain quotes). */
export function jsString(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
  return `'${escaped}'`
}

/** Substitute {{token}} placeholders; every token must resolve. */
export function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(vars, key)) throw new Error(`template token ${match} has no value`)
    return String(vars[key])
  })
}