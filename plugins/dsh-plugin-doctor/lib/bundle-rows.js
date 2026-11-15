/**
 * dsh-plugin-doctor — bundle patch row-name extraction (M1 wrap-up).
 *
 * Container bundles (dsh-base, voice-input-bundle, …) insert loader rows under
 * OTHER package names; app-boot flattens every bundle patch into one Include
 * tree, so no live entry carries the container's own name. To classify a
 * container we read its `dsh.bundle.patch` file(s) and extract the row names it
 * contributes, then join them against live entries.
 *
 * Zero third-party dependencies: this is a conservative indent scan of the
 * Loader patch dialect, NOT a YAML parser. Rules (verified against the real
 * dsh-base / voice-input / agent-team / computer-use patches):
 *   - a row starts at a `- id:` list item; its own properties sit two spaces
 *     deeper than the marker (`name:` aligns with `id:` after `- `)
 *   - `config` sub-keys are deeper still and never match; a deeper `- id:`
 *     inside plain config data is NOT a row
 *   - a row declaring `group: true` opens a nested entry list: deeper `- id:`
 *     items inside its config ARE rows (cordis:group semantics)
 *   - comments / blank lines are skipped; `!!js` name values are skipped
 *
 * Semantics: both `insert` rows and id-targeted overrides carrying a `name`
 * assertion are counted — a bundle that re-asserts a row depends on it too.
 * Extraction is best-effort: attribution only matches names against LIVE
 * loader entries, so an unexpected name is harmless. Anything unparseable
 * degrades to fewer names, never a guess.
 */

/**
 * Extract contributed row names from one patch file's text.
 * @param {string|null|undefined} yamlText — raw patch file content
 * @returns {string[]} unique names in first-seen order (verbatim, incl. relative paths)
 */
export function extractRowNames(yamlText) {
  if (typeof yamlText !== 'string' || yamlText === '') return []
  const names = []
  const seen = new Set()
  let rowIndent = null
  let groupMarkerIndent = null
  for (const line of yamlText.split(/\r?\n/)) {
    if (line.trim() === '' || /^\s*#/.test(line)) continue
    const indent = line.length - line.trimStart().length
    const rowStart = line.match(/^(\s*)- id:/)
    if (rowStart) {
      const marker = rowStart[1].length
      if (rowIndent !== null && marker + 2 > rowIndent) {
        // Deeper `- id:`: a nested row only inside a declared group's config;
        // otherwise it is config data and must not be treated as a row.
        if (groupMarkerIndent === null || marker < groupMarkerIndent) continue
      }
      rowIndent = marker + 2
      groupMarkerIndent = null
      continue
    }
    if (rowIndent !== null && indent < rowIndent) {
      rowIndent = null
      groupMarkerIndent = null
    }
    if (rowIndent === null || indent !== rowIndent) continue
    if (/^\s*group:\s*true\s*$/.test(line)) {
      groupMarkerIndent = rowIndent - 2
      continue
    }
    const match = line.match(/^\s*name:\s*(.+?)\s*$/)
    if (!match) continue
    let value = match[1]
    if (value.startsWith('!!')) continue
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1)
    }
    if (value === '' || seen.has(value)) continue
    seen.add(value)
    names.push(value)
  }
  return names
}