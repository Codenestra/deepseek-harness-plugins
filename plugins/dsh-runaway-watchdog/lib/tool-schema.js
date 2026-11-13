/**
 * Minimal tool-definition compiler so the plugin can register tools with ZERO
 * external imports (a profile-local plain-JS bundle cannot reliably resolve
 * `@deepseek-ai/dsh-tools`). It reproduces the subset of `defineTool` the
 * watchdog needs: compile the author-facing value/parameter schema DSL into the
 * raw JSON Schema subset that `ctx.tools.register` accepts, and wrap execute.
 *
 * Supported DSL: string/number/integer/boolean/null/array/object/json. The
 * `json` type compiles to the unconstrained `{}` schema. Object openness is
 * explicit. This module is pure and unit-tested.
 *
 * @module @local/dsh-runaway-watchdog/lib/tool-schema
 */

/**
 * Compile one author-facing value schema into the supported raw JSON Schema.
 * @param {object} spec - value schema spec.
 * @returns {object} raw JSON Schema node.
 */
export function compileValue(spec) {
  if (spec.type === 'json') return {}
  const out = {}
  if (typeof spec.description === 'string') out.description = spec.description
  if (spec.type === 'object') {
    out.type = 'object'
    out.properties = {}
    for (const [key, value] of Object.entries(spec.properties ?? {})) out.properties[key] = compileValue(value)
    out.additionalProperties = spec.additionalProperties === true
    return out
  }
  if (spec.type === 'array') {
    out.type = 'array'
    if (spec.items !== undefined) out.items = compileValue(spec.items)
    return out
  }
  out.type = spec.type
  return out
}

/**
 * Compile the implicit parameter object root from a per-property spec map.
 * @param {object} specMap - parameter property specs (each may carry required:true).
 * @returns {object} object-rooted raw JSON Schema.
 */
export function compileParameters(specMap) {
  const properties = {}
  const required = []
  for (const [key, value] of Object.entries(specMap)) {
    properties[key] = compileValue(value)
    if (value.required === true) required.push(key)
  }
  const schema = { type: 'object', properties }
  if (required.length > 0) schema.required = required
  return schema
}

/**
 * Build a registry-ready tool definition without importing dsh-tools.
 * @param {object} options - {name, description, parameters?, output, execute, render?}.
 * @returns {object} a ToolDefinition accepted by ctx.tools.register.
 */
export function makeTool(options) {
  const render = options.render ?? ((args, value) => [{ type: 'text', text: JSON.stringify(value) }])
  return {
    name: options.name,
    description: options.description,
    parameters: compileParameters(options.parameters ?? {}),
    output: { schema: compileValue(options.output), render },
    execute: async (args, exec) => options.execute(args, exec),
  }
}