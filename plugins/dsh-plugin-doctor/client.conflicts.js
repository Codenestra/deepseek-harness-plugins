// Plugin Doctor — pure conflict analysis (M2).
//
// Dual-mode file, ONE canonical implementation:
//   - Browser: self-registers as a package-local chunk of the client module
//     system; client.js loads it via `require.async('./client.conflicts.js')`.
//     No host API involved — the conflict page works purely client-side
//     (design.md §5: "M2 客户端冲突页直接读 snapshot，不依赖 host").
//   - Node tests: tests/conflicts.test.mjs evaluates this exact file through
//     node:vm with a CJS shim and imports `module.exports`.
//
// Inputs are plain JSON-safe data (LiveCompositionNode[] from
// ctx.slots.snapshot(), plus a style inventory collected from the DOM).
// Zero dependencies, no DOM access, no side effects beyond the two
// registration branches at the bottom.
//
// Conflict rules (design.md §4 — exactly these four, nothing else):
//   1. id    — list slot, same id claimed by different registrants (shadowing)
//   2. order — sidebar.panellist, duplicate display order (ambiguous ordering)
//   3. key   — keyed slot, same key claimed by different registrants (shadowing)
//   4. style — untagged <style> tags; one data-plugin-css key owned by several
//              plugins (claimStyles hot-reload hazard)
// Single-slot shadowing and chain slots are normal framework behavior and are
// deliberately NOT reported.
;(function () {
  'use strict'

  var PANEL_LIST = 'sidebar.panellist'
  var UNKNOWN = '(unknown)'
  var SEVERITY_RANK = { id: 0, key: 0, order: 1, style: 2 }

  /** Depth-first collection of every live slot node (factory children included). */
  function flattenSlots(snapshot) {
    var out = []
    if (!Array.isArray(snapshot)) return out
    var walk = function (nodes) {
      if (!Array.isArray(nodes)) return
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i]
        if (!node || typeof node !== 'object') continue
        if (node.type === 'slot' && typeof node.name === 'string' && Array.isArray(node.occupants)) {
          out.push(node)
        }
        if (Array.isArray(node.children)) walk(node.children)
      }
    }
    walk(snapshot)
    return out
  }

  /** Group items by a derived key; null keys are dropped. */
  function groupBy(items, keyOf) {
    var groups = new Map()
    for (var i = 0; i < items.length; i++) {
      var key = keyOf(items[i])
      if (key === null || key === undefined) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(items[i])
    }
    return groups
  }

  /** Distinct registrant identities; missing registrants become "(unknown)". */
  function distinctRegistrants(occupants) {
    var seen = []
    for (var i = 0; i < occupants.length; i++) {
      var reg = occupants[i].registrant
      var name = typeof reg === 'string' && reg !== '' ? reg : UNKNOWN
      if (seen.indexOf(name) === -1) seen.push(name)
    }
    return seen
  }

  /** JSON-safe occupant projection for reports. */
  function occupantView(entry) {
    var view = {
      registrant: typeof entry.registrant === 'string' ? entry.registrant : null,
      active: Boolean(entry.active),
      priority: typeof entry.priority === 'number' ? entry.priority : 0,
    }
    if (typeof entry.id === 'string') view.id = entry.id
    if (typeof entry.key === 'string') view.key = entry.key
    if (typeof entry.order === 'number') view.order = entry.order
    return view
  }

  function occupantViews(group) {
    return group.map(occupantView)
  }

  /**
   * Analyze a live slot snapshot plus a style inventory.
   * @param {object} input
   * @param {Array} input.snapshot — ctx.slots.snapshot() output (LiveCompositionNode[])
   * @param {Array} input.styles — [{plugin: string|null, cssKey: string|null}] from the DOM
   * @returns {{conflicts: Array, orderTable: Array, styleInventory: object, summary: object, registrants: string[]}}
   */
  function analyzeConflicts(input) {
    var opts = input && typeof input === 'object' ? input : {}
    var slots = flattenSlots(opts.snapshot)
    var styles = Array.isArray(opts.styles) ? opts.styles : []
    var conflicts = []

    for (var s = 0; s < slots.length; s++) {
      var node = slots[s]
      var occupants = node.occupants

      if (node.kind === 'list') {
        // Rule 1: duplicate id across registrants.
        var byId = groupBy(occupants, function (o) { return typeof o.id === 'string' ? o.id : null })
        byId.forEach(function (group, id) {
          if (group.length < 2) return
          var registrants = distinctRegistrants(group)
          if (registrants.length < 2) return
          conflicts.push({
            type: 'id',
            slot: node.name,
            id: id,
            occupants: occupantViews(group),
            registrants: registrants,
            message: 'Slot "' + node.name + '": id "' + id + '" is registered by ' + registrants.length + ' plugins; only the first live entry renders.',
            suggestion: 'Give each entry a unique id, or remove the duplicate registration.',
          })
        })

        // Rule 2: duplicate display order — sidebar.panellist only (design scope).
        if (node.name === PANEL_LIST) {
          var byOrder = groupBy(occupants, function (o) { return typeof o.order === 'number' ? o.order : null })
          byOrder.forEach(function (group, order) {
            if (group.length < 2) return
            var registrants = distinctRegistrants(group)
            conflicts.push({
              type: 'order',
              slot: node.name,
              order: order,
              occupants: occupantViews(group),
              registrants: registrants,
              message: 'sidebar.panellist: order ' + order + ' is used by ' + group.length + ' entries; their display order is ambiguous.',
              suggestion: 'Pick a free order value (see the occupancy table) for one of the entries.',
            })
          })
        }
      } else if (node.kind === 'keyed') {
        // Rule 3: duplicate key across registrants (the later entry is shadowed).
        var byKey = groupBy(occupants, function (o) { return typeof o.key === 'string' ? o.key : null })
        byKey.forEach(function (group, key) {
          if (group.length < 2) return
          var registrants = distinctRegistrants(group)
          if (registrants.length < 2) return
          conflicts.push({
            type: 'key',
            slot: node.name,
            key: key,
            occupants: occupantViews(group),
            registrants: registrants,
            message: 'Slot "' + node.name + '": key "' + key + '" is claimed by ' + registrants.length + ' plugins; the later entry is shadowed.',
            suggestion: 'Use a unique key per plugin page, or coordinate the shared key.',
          })
        })
      }
      // single / chain: normal framework semantics, never reported.
    }

    // Rule 4a: untagged <style> tags (claimStyles may claim them for the wrong plugin).
    var untaggedCount = 0
    var byPlugin = new Map()
    var byCssKey = new Map()
    for (var i = 0; i < styles.length; i++) {
      var tag = styles[i] && typeof styles[i] === 'object' ? styles[i] : {}
      var plugin = typeof tag.plugin === 'string' && tag.plugin !== '' ? tag.plugin : null
      var cssKey = typeof tag.cssKey === 'string' && tag.cssKey !== '' ? tag.cssKey : null
      if (plugin === null) {
        untaggedCount += 1
        continue
      }
      byPlugin.set(plugin, (byPlugin.get(plugin) || 0) + 1)
      if (cssKey !== null) {
        if (!byCssKey.has(cssKey)) byCssKey.set(cssKey, [])
        var owners = byCssKey.get(cssKey)
        if (owners.indexOf(plugin) === -1) owners.push(plugin)
      }
    }
    if (untaggedCount > 0) {
      conflicts.push({
        type: 'style',
        untagged: untaggedCount,
        registrants: [],
        message: untaggedCount + ' <style> tag(s) carry no data-plugin attribute; hot-reload may claim them for the wrong plugin.',
        suggestion: 'Tag injected styles with data-plugin (and data-plugin-css) when injecting them.',
      })
    }
    // Rule 4b: one css key owned by several plugins.
    byCssKey.forEach(function (owners, cssKey) {
      if (owners.length < 2) return
      conflicts.push({
        type: 'style',
        cssKey: cssKey,
        registrants: owners.slice(),
        message: 'Style key "' + cssKey + '" is owned by ' + owners.length + ' plugins; hot-reload cleanup may remove another plugin\'s styles.',
        suggestion: 'Namespace data-plugin-css keys per plugin.',
      })
    })

    // Severity ordering: shadowing (id/key) > ambiguous order > style risk.
    conflicts.sort(function (a, b) {
      var rank = SEVERITY_RANK[a.type] - SEVERITY_RANK[b.type]
      if (rank !== 0) return rank
      var slotA = a.slot || ''
      var slotB = b.slot || ''
      if (slotA !== slotB) return slotA < slotB ? -1 : 1
      var detailA = String(a.id !== undefined ? a.id : a.key !== undefined ? a.key : a.order !== undefined ? a.order : a.cssKey !== undefined ? a.cssKey : 'untagged')
      var detailB = String(b.id !== undefined ? b.id : b.key !== undefined ? b.key : b.order !== undefined ? b.order : b.cssKey !== undefined ? b.cssKey : 'untagged')
      return detailA < detailB ? -1 : detailA > detailB ? 1 : 0
    })

    // Occupancy table for sidebar.panellist (all registered entries, sorted).
    var orderTable = []
    for (var p = 0; p < slots.length; p++) {
      if (slots[p].name !== PANEL_LIST) continue
      orderTable = slots[p].occupants.map(function (o) {
        return {
          order: typeof o.order === 'number' ? o.order : null,
          id: typeof o.id === 'string' ? o.id : null,
          registrant: typeof o.registrant === 'string' ? o.registrant : null,
          active: Boolean(o.active),
        }
      })
      orderTable.sort(function (a, b) {
        if (a.order === null && b.order === null) return (a.id || '') < (b.id || '') ? -1 : 1
        if (a.order === null) return 1
        if (b.order === null) return -1
        if (a.order !== b.order) return a.order - b.order
        return (a.id || '') < (b.id || '') ? -1 : 1
      })
      break
    }

    var summary = { id: 0, order: 0, key: 0, style: 0, total: conflicts.length }
    var involved = []
    for (var c = 0; c < conflicts.length; c++) {
      summary[conflicts[c].type] += 1
      for (var r = 0; r < conflicts[c].registrants.length; r++) {
        var name = conflicts[c].registrants[r]
        if (name !== UNKNOWN && involved.indexOf(name) === -1) involved.push(name)
      }
    }
    involved.sort()

    var pluginRows = []
    byPlugin.forEach(function (count, plugin) { pluginRows.push({ plugin: plugin, count: count }) })
    pluginRows.sort(function (a, b) { return a.plugin < b.plugin ? -1 : 1 })
    var cssKeyRows = []
    byCssKey.forEach(function (owners, cssKey) { cssKeyRows.push({ cssKey: cssKey, plugins: owners.slice() }) })

    return {
      conflicts: conflicts,
      orderTable: orderTable,
      styleInventory: {
        total: styles.length,
        tagged: styles.length - untaggedCount,
        untagged: untaggedCount,
        byPlugin: pluginRows,
        cssKeys: cssKeyRows,
      },
      summary: summary,
      registrants: involved,
    }
  }

  var api = { analyzeConflicts: analyzeConflicts, flattenSlots: flattenSlots, PANEL_LIST: PANEL_LIST }

  // Node (tests via node:vm CJS shim).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api
  }
  // Browser: register as a package-local chunk; client.js awaits it through
  // require.async('./client.conflicts.js').
  if (typeof window !== 'undefined' && window.__ModuleLoader__ && typeof window.__ModuleLoader__.load === 'function') {
    window.__ModuleLoader__.load({
      id: '@local/dsh-plugin-doctor',
      chunk: 'client.conflicts.js',
      factory: function () { return api },
    })
  }
})()