/**
 * DeepSeek Harness Project Hub client half.
 *
 * The heavy side of a deliberately light-host plugin: everything rendered here
 * comes from the official Client faces — `ctx.workspaces` for Workspace CRUD,
 * `ctx.sessions.list` for live session activity, `ctx.uiWorkspace` for every
 * navigation action — plus the host's single `/overview` aggregate for the
 * directory probe and the durable registry account. No session creation,
 * navigation or workspace mutation is re-implemented here.
 *
 * Boundary with the native sidebar: this panel is a cross-project dashboard
 * (all projects on one screen, with counts, activity and directory health).
 * It is not a second workspace tree, and it never renders a session browser.
 */
(() => {
  const PACKAGE_ID = '@local/dsh-project-hub'
  const PANEL_ID = 'project-hub'
  const API = '/api/project-hub'
  /** Safety-net refetch; the Workspace store subscription is the real trigger. */
  const POLL_MS = 60_000
  /** Relative-time labels need a heartbeat of their own. */
  const CLOCK_MS = 30_000
  /** Keystroke quiet period before a search round-trip; races are aborted. */
  const SEARCH_DEBOUNCE_MS = 180
  /** Quiet period before the notes editor autosaves; one save per pause. */
  const NOTES_SAVE_MS = 1_000

  const COPY = {
    zh: {
      panel: '项目中枢',
      title: '项目中枢',
      subtitle: '所有项目一屏总览 · 一键进入 · 目录健康可见',
      refresh: '刷新',
      refreshing: '刷新中…',
      register: '注册项目',
      registering: '注册中…',
      sortLabel: '排序',
      sortRecent: '最近活动',
      sortSessions: '会话数',
      sortManual: '手动顺序',
      statProjects: '项目',
      statSessions: '会话',
      statRunning: '进行中',
      statArchived: '已归档',
      statSubagents: '子代理',
      statUngrouped: '未分组',
      statMissing: '目录丢失',
      runningApproxHint: '会话实时状态尚未就绪，暂以宿主已加载会话数近似',
      subagentsHint: '项目内会话派生的子代理会话，按父链归属到项目，不计入「会话」',
      tabsLabel: '视图',
      tabOverview: '总览',
      tabSearch: '全局搜索',
      searchPlaceholder: '搜索所有项目的会话内容…',
      searchScope: '搜索范围',
      filterAll: '全部项目',
      searchIdleTitle: '跨项目全文搜索',
      searchIdleHint: '输入关键词，匹配所有会话的消息内容；结果带所属项目与命中片段，点击直达会话。',
      searching: '搜索中…',
      noHitsTitle: '没有命中',
      noHitsHint: '换个关键词再试；搜索按字面短语匹配。',
      searchUnavailableTitle: '全文搜索不可用',
      searchReasonDisabled: '该部署把会话内容索引关着：session-query 的 openAt 配置为 "never"，索引从不打开，因此没有任何可搜索的内容（错误码 SESSION_QUERY_SEARCH_DISABLED）。会话的精确读取、标题与血缘追踪不受影响，只有全文搜索被关闭。',
      searchReasonUnmounted: '全文搜索服务未挂载：该部署没有提供 @deepseek-ai/dsh-session-query，宿主端无法执行内容搜索。',
      searchReasonNoFace: '当前 Client 没有暴露任何全文搜索接口，插件找不到可调用的官方入口。',
      searchNextDisabled: '下一步：在 profile 的 cordis.patch.yml（或 --patch 覆盖层）里，把 session-query-sqlite 这一行的 openAt 从 "never" 改为 "first-search"（首次搜索时才打开 SQLite）；若要持久索引，再把 path 从 ":memory:" 指向一个固定文件，然后重启桌面应用。本插件不会替你修改全局索引配置。',
      searchNextUnmounted: '下一步：安装并启用提供 session-query 的插件后刷新本页；在此之前可用「总览」页签浏览与切换项目。',
      searchNextNoFace: '下一步：升级宿主到暴露 ctx.sessions.search / ctx.remote.session.search 的版本；在此之前可用「总览」页签浏览与切换项目。',
      searchFailed: '搜索失败',
      searchFailedHint: '这是搜索请求本身失败，不是索引被关闭；可以稍后重试，或切回「总览」继续使用其他功能。',
      hitsUnit: '条命中',
      hitsMore: '还有更多命中，仅显示前 {n} 条',
      hitOpenHint: '打开该会话',
      chipUngrouped: '未分组',
      sessionsUnit: '个会话',
      runningUnit: '进行中',
      activeUnit: '已加载',
      lastActive: '最近活动',
      never: '尚无会话',
      newSession: '新会话',
      open: '打开',
      statusMissing: '目录已丢失',
      statusUnknown: '目录未探测',
      pinnedCount: '置顶会话',
      archivedCount: '归档会话',
      emptyTitle: '还没有项目',
      emptyHint: '注册一个目录，或先在任意工作区开一个会话——DSH 启动时会从会话历史自动发现项目。',
      errorTitle: '项目总览加载失败',
      retry: '重试',
      degradedSessions: '会话统计不可用',
      degradedWorkspaces: '部分项目读取失败',
      registered: '已注册项目',
      registerFailed: '注册失败',
      registerCancelled: '未选择目录',
      openFailed: '打开失败',
      newSessionFailed: '新会话失败',
      noNavigation: '当前部署未提供工作区导航能力（uiWorkspace）',
      noWorkspaceApi: '当前部署未提供工作区注册能力',
      updatedAt: '更新于',
      loading: '正在读取项目总览…',
      cardLabel: '项目',
      pathLabel: '路径',
      orderHint: '手动顺序即宿主工作区注册表的显示顺序',
      detail: '详情',
      backToOverview: '返回总览',
      detailSessions: '会话',
      detailNoSessions: '这个项目还没有会话。',
      notesTitle: '项目笔记',
      notesTextLabel: '备注',
      notesTextHint: '随手记：这个项目的上下文、约定、待办。停止输入 1 秒后自动保存。',
      notesInstructionsLabel: '固定指令',
      notesInstructionsHint: '开新会话时粘给模型的固定指令；MVP 只提供复制，不自动注入。',
      notesPlaceholderText: '写下这个项目需要记住的事…',
      notesPlaceholderInstructions: '例如：始终用中文回答；改动前先给出计划…',
      copyInstructions: '复制固定指令',
      copiedInstructions: '固定指令已复制到剪贴板',
      copyFailed: '复制失败',
      copyEmpty: '固定指令为空，没有可复制的内容',
      clipboardUnavailable: '当前页面没有提供剪贴板接口，请手动选中复制',
      notesStateIdle: '未保存的修改会自动保存',
      notesStateSaving: '保存中…',
      notesStateSaved: '已保存 {time}',
      notesStateError: '保存失败：{message}',
      notesStateRetry: '重试保存',
      notesUnavailable: '笔记不可用',
      notesDegraded: '笔记状态',
      deleteNote: '删除笔记',
      deleteNoteConfirm: '确认删除',
      noteDeleted: '笔记已删除',
      noteDeleteFailed: '删除笔记失败',
      renameLabel: '显示名',
      rename: '重命名',
      renameSave: '保存名称',
      renameCancel: '取消',
      renamed: '已重命名',
      renameFailed: '重命名失败',
      renameUnchanged: '名称没有变化',
      renameUnavailable: '当前部署没有提供工作区重命名接口',
      moveUp: '上移',
      moveDown: '下移',
      moveFailed: '调整顺序失败',
      moveUnavailable: '当前部署没有提供工作区排序接口',
      pinSession: '置顶',
      unpinSession: '取消置顶',
      archiveSession: '归档',
      unarchiveSession: '取消归档',
      sessionActionFailed: '会话操作失败',
      sessionActionUnavailable: '当前部署没有提供该会话操作接口',
      chipPinned: '已置顶',
      chipArchived: '已归档',
      chipSubagent: '子代理',
      chipNote: '有笔记',
      detailMissing: '这个项目已不在总览中（可能已被删除或重命名后刷新尚未完成）。',
      archiveRunning: '停止并归档',
      switcher: '快速切换',
      switcherOpen: '切换器',
      switcherPlaceholder: '输入项目名或会话标题…',
      switcherLoading: '正在读取项目…',
      switcherEmpty: '没有匹配的项目或会话',
      switcherEmptyHint: '换个关键词，或按 Esc 关闭',
      switcherFailed: '切换器读取失败：{message}',
      switcherOpenFailed: '打开失败：{message}',
      switcherRetry: '重试',
      switcherClose: '关闭',
      switcherKindProject: '项目',
      switcherKindSession: '会话',
      switcherFoot: '↑↓ 选择 · Enter 打开 · Esc 关闭',
      switcherRunning: '进行中',
      switcherUngrouped: '未分组',
      switcherHint: '按 {keys} 在项目与会话之间跳转',
      switcherHintNoKeys: '用「切换器」按钮在项目与会话之间跳转',
      switcherShortcutTaken: '快捷键 {keys} 已被宿主占用，切换器未绑定默认键；可在 设置 → 快捷键 中为「{command}」自行指定',
      switcherShortcutAbsent: '当前部署没有提供快捷键接口，切换器仍可从本面板的「切换器」按钮打开',
    },
    en: {
      panel: 'Project Hub',
      title: 'Project Hub',
      subtitle: 'Every project on one screen · one click in · directory health visible',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      register: 'Register project',
      registering: 'Registering…',
      sortLabel: 'Sort',
      sortRecent: 'Recent activity',
      sortSessions: 'Sessions',
      sortManual: 'Manual order',
      statProjects: 'Projects',
      statSessions: 'Sessions',
      statRunning: 'Running',
      statArchived: 'Archived',
      statSubagents: 'Subagents',
      statUngrouped: 'Ungrouped',
      statMissing: 'Missing dirs',
      runningApproxHint: 'Live session state is not ready yet; approximated by host-loaded sessions',
      subagentsHint: 'Subagent sessions spawned by this project, attributed through the parent chain; not counted as sessions',
      tabsLabel: 'Views',
      tabOverview: 'Overview',
      tabSearch: 'Global search',
      searchPlaceholder: 'Search session content across every project…',
      searchScope: 'Search scope',
      filterAll: 'All projects',
      searchIdleTitle: 'Full-text search across projects',
      searchIdleHint: 'Type a phrase to match message content in every session; results carry their project and the matching snippet, and open the session on click.',
      searching: 'Searching…',
      noHitsTitle: 'No matches',
      noHitsHint: 'Try another phrase; search matches literal phrases.',
      searchUnavailableTitle: 'Full-text search unavailable',
      searchReasonDisabled: 'This deployment keeps the session content index closed: session-query is configured with openAt "never", so the index never opens and there is nothing to search (error code SESSION_QUERY_SEARCH_DISABLED). Exact reads, titles and lineage traces keep working; only full-text search is off.',
      searchReasonUnmounted: 'The full-text search service is not mounted: this deployment provides no @deepseek-ai/dsh-session-query, so the host cannot run a content search.',
      searchReasonNoFace: 'This Client exposes no full-text search face, so the plugin has no official entry point to call.',
      searchNextDisabled: 'Next step: in the profile cordis.patch.yml (or a --patch overlay), change openAt on the session-query-sqlite row from "never" to "first-search" (opens SQLite on the first search); for a durable index also point path away from ":memory:" to a fixed file, then restart the desktop app. This plugin never changes your global index configuration for you.',
      searchNextUnmounted: 'Next step: install and enable a plugin that provides session-query, then reload this page; meanwhile the Overview tab still browses and switches projects.',
      searchNextNoFace: 'Next step: upgrade to a host that exposes ctx.sessions.search / ctx.remote.session.search; meanwhile the Overview tab still browses and switches projects.',
      searchFailed: 'Search failed',
      searchFailedHint: 'The search request itself failed; the index is not closed. Retry shortly, or use the Overview tab meanwhile.',
      hitsUnit: 'matches',
      hitsMore: 'More matches exist; showing the first {n}',
      hitOpenHint: 'Open this session',
      chipUngrouped: 'Ungrouped',
      sessionsUnit: 'sessions',
      runningUnit: 'running',
      activeUnit: 'loaded',
      lastActive: 'Last activity',
      never: 'No sessions yet',
      newSession: 'New session',
      open: 'Open',
      statusMissing: 'Directory missing',
      statusUnknown: 'Directory unprobed',
      pinnedCount: 'Pinned sessions',
      archivedCount: 'Archived sessions',
      emptyTitle: 'No projects yet',
      emptyHint: 'Register a directory, or simply start a session anywhere — DSH discovers projects from session history at startup.',
      errorTitle: 'Could not load the project overview',
      retry: 'Retry',
      degradedSessions: 'Session statistics unavailable',
      degradedWorkspaces: 'Some projects could not be read',
      registered: 'Project registered',
      registerFailed: 'Registration failed',
      registerCancelled: 'No directory selected',
      openFailed: 'Open failed',
      newSessionFailed: 'New session failed',
      noNavigation: 'This deployment provides no workspace navigation (uiWorkspace)',
      noWorkspaceApi: 'This deployment provides no workspace registration',
      updatedAt: 'Updated',
      loading: 'Reading the project overview…',
      cardLabel: 'Project',
      pathLabel: 'Path',
      orderHint: 'Manual order is the host workspace registry display order',
      detail: 'Details',
      backToOverview: 'Back to overview',
      detailSessions: 'Sessions',
      detailNoSessions: 'This project has no sessions yet.',
      notesTitle: 'Project notes',
      notesTextLabel: 'Notes',
      notesTextHint: 'Scratchpad: context, conventions, todos. Saved automatically 1 s after you stop typing.',
      notesInstructionsLabel: 'Pinned instructions',
      notesInstructionsHint: 'Fixed instructions to paste into a new session; the MVP only copies them, it never injects them.',
      notesPlaceholderText: 'What should be remembered about this project…',
      notesPlaceholderInstructions: 'e.g. always answer in Chinese; propose a plan before editing…',
      copyInstructions: 'Copy instructions',
      copiedInstructions: 'Pinned instructions copied to the clipboard',
      copyFailed: 'Copy failed',
      copyEmpty: 'The pinned instructions are empty; there is nothing to copy',
      clipboardUnavailable: 'This page exposes no clipboard API; select the text and copy manually',
      notesStateIdle: 'Edits are saved automatically',
      notesStateSaving: 'Saving…',
      notesStateSaved: 'Saved {time}',
      notesStateError: 'Save failed: {message}',
      notesStateRetry: 'Retry save',
      notesUnavailable: 'Notes unavailable',
      notesDegraded: 'Notes status',
      deleteNote: 'Delete notes',
      deleteNoteConfirm: 'Confirm delete',
      noteDeleted: 'Notes deleted',
      noteDeleteFailed: 'Deleting the notes failed',
      renameLabel: 'Display name',
      rename: 'Rename',
      renameSave: 'Save name',
      renameCancel: 'Cancel',
      renamed: 'Renamed',
      renameFailed: 'Rename failed',
      renameUnchanged: 'The name did not change',
      renameUnavailable: 'This deployment provides no workspace rename',
      moveUp: 'Move up',
      moveDown: 'Move down',
      moveFailed: 'Reordering failed',
      moveUnavailable: 'This deployment provides no workspace reordering',
      pinSession: 'Pin',
      unpinSession: 'Unpin',
      archiveSession: 'Archive',
      unarchiveSession: 'Unarchive',
      sessionActionFailed: 'Session action failed',
      sessionActionUnavailable: 'This deployment provides no such session action',
      chipPinned: 'Pinned',
      chipArchived: 'Archived',
      chipSubagent: 'Subagent',
      chipNote: 'Has notes',
      detailMissing: 'This project is no longer in the overview (it may have been deleted, or a refresh is still pending).',
      archiveRunning: 'Stop and archive',
      switcher: 'Quick switcher',
      switcherOpen: 'Switcher',
      switcherPlaceholder: 'Type a project or session title…',
      switcherLoading: 'Loading projects…',
      switcherEmpty: 'No matching project or session',
      switcherEmptyHint: 'Try another term, or press Esc to close',
      switcherFailed: 'The switcher could not load: {message}',
      switcherOpenFailed: 'Could not open: {message}',
      switcherRetry: 'Retry',
      switcherClose: 'Close',
      switcherKindProject: 'Project',
      switcherKindSession: 'Session',
      switcherFoot: '↑↓ select · Enter open · Esc close',
      switcherRunning: 'running',
      switcherUngrouped: 'Ungrouped',
      switcherHint: 'Press {keys} to jump across projects and sessions',
      switcherHintNoKeys: 'Use the Switcher button to jump across projects and sessions',
      switcherShortcutTaken: '{keys} is already taken by the host, so the switcher ships unbound; assign "{command}" yourself in Settings → Shortcuts',
      switcherShortcutAbsent: 'This deployment provides no shortcut face; the switcher still opens from this panel\'s Switcher button',
    },
  }

  function localeKey() {
    const language = document.documentElement.lang || navigator.language || 'en'
    return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  const STYLE = `
  .ph-page, .ph-page * { box-sizing: border-box; }
  .ph-page {
    --ph-dur-1: .12s; --ph-dur-2: .25s;
    --ph-ease-out: cubic-bezier(.22,1,.36,1);
    /* The design system publishes no monospace stack and no elevation scale, so
       these are local values named as such instead of inventing --dsw-* tokens
       that would silently resolve to nothing. */
    --ph-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    --ph-shadow-1: 0 1px 2px rgba(0, 0, 0, .08);
    --ph-shadow-2: 0 10px 28px rgba(0, 0, 0, .22);
    height: 100%; min-width: 0; min-height: 0; overflow: auto;
    padding: calc(26px + var(--dsh-frame-top-clearance, 0px)) 28px 48px;
    background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
    font-family: var(--dsw-font-family, inherit);
  }
  .ph-shell { width: min(1480px, 100%); margin: 0 auto; }
  .ph-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
  .ph-title { margin: 0; font-size: 28px; line-height: 1.2; letter-spacing: -.02em; }
  .ph-subtitle { margin: 8px 0 0; color: var(--dsw-alias-label-secondary); font-size: 13px; }
  .ph-stamp { margin-top: 9px; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
  .ph-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
  .ph-button { min-height: 36px; padding: 0 13px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; transition: background var(--ph-dur-1) ease, transform var(--ph-dur-1) ease; }
  .ph-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-solid); }
  .ph-button:active:not(:disabled) { transform: scale(.97); }
  .ph-button:disabled { cursor: not-allowed; opacity: .55; }
  .ph-button:focus-visible, .ph-sort:focus-visible, .ph-card:focus-within { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
  /* The official Button recipe (ui-primitives Button.module.css): fill plus the
     foreground label, both theme-aware, so the near-black primary of light mode
     becomes a near-white primary with dark text in dark mode. */
  .ph-button--primary { border-color: transparent; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
  .ph-button--primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
  .ph-button--quiet { min-height: 30px; padding: 0 10px; font-size: 11.5px; }
  .ph-strip { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .ph-stat { min-width: 116px; flex: 1 1 116px; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); }
  .ph-stat__label { color: var(--dsw-alias-label-tertiary); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .ph-stat__value { margin-top: 5px; color: var(--dsw-alias-label-primary); font-size: 21px; font-weight: 720; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .ph-stat[data-tone='warn'] .ph-stat__value { color: var(--dsw-alias-state-warn-primary); }
  .ph-stat[data-approx='true'] .ph-stat__label::after { content: ' ~'; color: var(--dsw-alias-state-warn-primary); }
  .ph-note { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 12px; padding: 10px 13px; border-radius: var(--dsw-radius-md, 10px); border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, var(--dsw-alias-border-l3)); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 9%, var(--dsw-alias-bg-layer-1)); color: var(--dsw-alias-label-secondary); font-size: 12px; }
  .ph-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
  .ph-count { color: var(--dsw-alias-label-tertiary); font-size: 11.5px; }
  .ph-sorts { display: flex; gap: 4px; padding: 4px; border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); }
  .ph-sort { padding: 6px 11px; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; font: inherit; font-size: 12px; transition: background var(--ph-dur-1) ease, color var(--ph-dur-1) ease; }
  .ph-sort:hover { color: var(--dsw-alias-label-primary); }
  .ph-sort[data-active='true'] { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); box-shadow: var(--ph-shadow-1); }
  .ph-tabs { display: flex; gap: 4px; width: max-content; margin-bottom: 16px; padding: 4px; border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); }
  .ph-tab { padding: 7px 14px; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600; transition: background var(--ph-dur-1) ease, color var(--ph-dur-1) ease; }
  .ph-tab:hover { color: var(--dsw-alias-label-primary); }
  .ph-tab[data-active='true'] { background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); box-shadow: var(--ph-shadow-1); }
  .ph-searchbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
  .ph-input { flex: 1 1 260px; min-width: 0; height: 36px; padding: 0 12px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; }
  .ph-input::placeholder { color: var(--dsw-alias-label-tertiary); }
  .ph-input:focus, .ph-select:focus { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); outline: none; }
  .ph-select { height: 36px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; }
  .ph-hits { display: flex; flex-direction: column; gap: 8px; }
  .ph-hit { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); cursor: pointer; text-align: left; font: inherit; color: inherit; transition: border-color var(--ph-dur-1) ease, transform var(--ph-dur-1) ease; }
  .ph-hit:hover { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, var(--dsw-alias-border-l3)); transform: translateY(-1px); }
  .ph-hit:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
  .ph-hit__head { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
  .ph-hit__title { min-width: 0; overflow: hidden; font-size: 13px; font-weight: 660; text-overflow: ellipsis; white-space: nowrap; }
  .ph-chip { padding: 1.5px 7px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 99px; color: var(--dsw-alias-label-secondary); font-size: 10px; font-weight: 600; white-space: nowrap; }
  .ph-hit__time { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; white-space: nowrap; }
  .ph-hit__snippet { margin: 0; display: -webkit-box; overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
  .ph-hit__mark { padding: 0 1px; border-radius: 3px; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent); color: var(--dsw-alias-label-primary); }
  .ph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(304px, 1fr)); gap: 12px; }
  .ph-card { display: flex; flex-direction: column; gap: 11px; min-width: 0; padding: 15px 16px 14px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg, 14px); background: var(--dsw-alias-bg-layer-1); transition: border-color var(--ph-dur-2) ease, transform var(--ph-dur-2) var(--ph-ease-out); }
  .ph-card:hover { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, var(--dsw-alias-border-l3)); transform: translateY(-1px); }
  .ph-card[data-status='missing-dir'] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, var(--dsw-alias-border-l3)); }
  .ph-card__head { display: flex; align-items: flex-start; gap: 8px; }
  .ph-card__title { margin: 0; min-width: 0; flex: 1 1 auto; overflow: hidden; font-size: 15px; font-weight: 680; letter-spacing: -.01em; text-overflow: ellipsis; white-space: nowrap; }
  .ph-badges { display: flex; flex: 0 0 auto; gap: 5px; align-items: center; }
  .ph-badge { padding: 2.5px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: .02em; white-space: nowrap; border: 0.5px solid transparent; }
  .ph-badge--missing { color: var(--dsw-alias-state-warn-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent); }
  .ph-badge--unknown { color: var(--dsw-alias-label-tertiary); border-color: var(--dsw-alias-border-l2); }
  .ph-badge--live { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent); }
  .ph-badge--pin { color: var(--dsw-alias-label-secondary); border-color: var(--dsw-alias-border-l2); }
  .ph-badge--sub { color: var(--dsw-alias-label-secondary); border-color: var(--dsw-alias-border-l2); background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 9%, transparent); }
  .ph-card__path { margin: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-family: var(--ph-font-mono); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .ph-card__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 10px 0; border-top: 0.5px solid var(--dsw-alias-border-l3); border-bottom: 0.5px solid var(--dsw-alias-border-l3); }
  .ph-metric__label { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
  .ph-metric__value { margin-top: 3px; color: var(--dsw-alias-label-primary); font-size: 13.5px; font-weight: 660; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ph-metric__value[data-live='true'] { color: var(--dsw-alias-state-success-primary); }
  .ph-card__actions { display: flex; gap: 7px; }
  .ph-card__actions .ph-button { flex: 1 1 0; }
  .ph-panel { display: grid; place-items: center; gap: 12px; padding: 56px 24px; text-align: center; border: 0.5px dashed var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 14px); color: var(--dsw-alias-label-secondary); }
  .ph-panel__title { margin: 0; color: var(--dsw-alias-label-primary); font-size: 16px; font-weight: 680; }
  .ph-panel__hint { margin: 0; max-width: 52ch; font-size: 12.5px; line-height: 1.6; }
  .ph-panel__detail { margin: 0; max-width: 68ch; color: var(--dsw-alias-label-tertiary); font-family: var(--ph-font-mono); font-size: 11px; word-break: break-word; }
  .ph-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(304px, 1fr)); gap: 12px; }
  .ph-bone { height: 148px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg, 14px); background: linear-gradient(100deg, var(--dsw-alias-bg-layer-1) 40%, var(--dsw-alias-bg-layer-2) 50%, var(--dsw-alias-bg-layer-1) 60%); background-size: 220% 100%; animation: ph-shimmer 1.5s linear infinite; }
  @keyframes ph-shimmer { from { background-position: 120% 0; } to { background-position: -20% 0; } }
  /* --- M3 detail view: breadcrumb, blocks, notes editor, session rows --- */
  .ph-crumb { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .ph-crumb__title { overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 660; text-overflow: ellipsis; white-space: nowrap; }
  .ph-detail { display: flex; flex-direction: column; gap: 14px; }
  .ph-block { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg, 14px); background: var(--dsw-alias-bg-layer-1); }
  .ph-block__head { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
  .ph-block__title { margin: 0; overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; }
  .ph-block__actions { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
  .ph-detail__path { margin: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-family: var(--ph-font-mono); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .ph-rename { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .ph-notes { display: flex; flex-direction: column; gap: 12px; }
  .ph-field { display: flex; flex-direction: column; gap: 5px; }
  .ph-field__label { color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 660; letter-spacing: .02em; }
  .ph-field__hint { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; line-height: 1.5; }
  .ph-textarea { box-sizing: border-box; width: 100%; min-height: 76px; padding: 9px 11px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; line-height: 1.55; resize: vertical; }
  .ph-textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
  .ph-textarea:focus { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); outline: none; }
  .ph-save { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; white-space: nowrap; }
  .ph-save[data-state='saving'] { color: var(--dsw-alias-label-secondary); }
  .ph-save[data-state='error'] { color: var(--dsw-alias-state-error-primary); }
  .ph-rows { display: flex; flex-direction: column; gap: 6px; }
  .ph-row { display: flex; gap: 8px; align-items: center; padding: 8px 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 10px); background: var(--dsw-alias-bg-layer-1); }
  .ph-row__open { display: flex; flex: 1 1 auto; gap: 7px; align-items: center; min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; text-align: left; }
  .ph-row__title { overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 12.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .ph-row__time { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; white-space: nowrap; }
  .ph-row__actions { display: flex; flex-shrink: 0; gap: 6px; }

  /* M4 quick switcher. It renders in \`shell.overlay\`, outside \`.ph-page\`, so the
     local values the design system does not publish are declared on the palette
     root as well; every --dsw-* token is global and needs no repetition. The
     layer, mask and hover fill follow ui-primitives' Modal so the palette sits
     in the shell like a platform dialog. No transition or animation is added, so
     reduced motion needs no override here. */
  .ph-palette-backdrop { --ph-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; --ph-shadow-2: 0 10px 28px rgba(0, 0, 0, .22); position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-start; justify-content: center; padding: calc(max(24px, var(--dsh-frame-top-clearance, 24px)) + 7vh) 24px 24px; pointer-events: auto; }
  .ph-palette-backdrop::after { content: ''; position: absolute; inset: 0; background: var(--dsw-alias-bg-mask-1); backdrop-filter: var(--dsw-mask-blur); }
  .ph-palette { position: relative; z-index: 1; display: flex; flex-direction: column; width: min(680px, 100%); max-height: min(70vh, 620px); overflow: hidden; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 14px); background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); box-shadow: var(--ph-shadow-2); }
  .ph-palette__input { flex-shrink: 0; padding: 14px 16px; border: 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); font-size: 14px; outline: none; }
  .ph-palette__input::placeholder { color: var(--dsw-alias-label-tertiary); }
  .ph-palette__status { margin: 0; padding: 16px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
  .ph-palette__error { display: flex; align-items: center; gap: 10px; margin: 0; padding: 10px 16px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-state-error-primary); font-family: var(--ph-font-mono); font-size: 11px; word-break: break-word; }
  .ph-palette__empty { padding: 22px 16px; text-align: center; }
  .ph-palette__empty p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
  .ph-palette__empty .ph-palette__hint { margin-top: 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
  .ph-palette__list { flex: 1 1 auto; margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
  .ph-palette__row { margin: 0; padding: 0; }
  .ph-palette__open { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: 0; border-radius: var(--dsw-radius-md, 10px); background: transparent; color: inherit; cursor: pointer; font: inherit; text-align: left; }
  .ph-palette__open:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .ph-palette__row[data-active='true'] .ph-palette__open { background: var(--dsw-alias-interactive-bg-hover); }
  .ph-palette__kind { flex-shrink: 0; padding: 1.5px 7px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 99px; color: var(--dsw-alias-label-secondary); font-size: 10px; font-weight: 600; white-space: nowrap; }
  .ph-palette__row[data-kind='project'] .ph-palette__kind { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l2)); color: var(--dsw-alias-brand-primary); }
  .ph-palette__title { flex-shrink: 1; min-width: 0; overflow: hidden; font-size: 12.5px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
  .ph-palette__tail { flex-shrink: 2; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-family: var(--ph-font-mono); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
  .ph-palette__time { flex-shrink: 0; margin-left: auto; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; white-space: nowrap; }
  .ph-palette__foot { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-top: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-tertiary); font-size: 11px; }

  .ph-toast { position: fixed; right: 22px; bottom: 22px; z-index: 60; max-width: min(420px, calc(100vw - 44px)); padding: 11px 14px; border-radius: var(--dsw-radius-md, 10px); border: 0.5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); box-shadow: var(--ph-shadow-2); font-size: 12.5px; line-height: 1.5; word-break: break-word; }
  .ph-toast[data-kind='error'] { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, var(--dsw-alias-border-l2)); color: var(--dsw-alias-state-error-primary); }
  .ph-visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  @media (max-width: 680px) {
    .ph-page { padding-left: 14px; padding-right: 14px; }
    .ph-head { display: grid; } .ph-actions { justify-content: flex-start; }
    .ph-stat { flex: 1 1 calc(50% - 4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ph-page *, .ph-page *::before, .ph-page *::after { animation: none !important; transition: none !important; }
    .ph-card:hover { transform: none; }
  }
  `

  /**
   * Lifecycle diagnostics for the shared HMR style-loss event (2026-11-12 23:17,
   * reproduced 23:57 without a page refresh).
   *
   * The loader removes entry-owned styles during `replace()` *before* it
   * re-imports the entry, so a failed re-import leaves the panel functional but
   * style-less. That removal belongs to core and cannot be prevented from inside
   * a plugin -- but it can be timed. Everything below is observation only: a
   * capped ring on `window.__projectHubDiag` plus `[project-hub]`-prefixed
   * console lines, so one reproduction yields an ordered timeline (how often
   * this entry loaded, when its style was attached, and whether the style
   * vanished without our own cleanup running). No core file and no other
   * plugin is touched.
   */
  const DIAG_LIMIT = 100
  const STYLE_SENTINEL_MS = 1_000
  const diagSink = typeof window === 'object' && window !== null ? window : globalThis
  if (!Array.isArray(diagSink.__projectHubDiag)) diagSink.__projectHubDiag = []
  if (typeof diagSink.__projectHubLoads !== 'number') diagSink.__projectHubLoads = 0

  function diag(event, detail) {
    const rows = diagSink.__projectHubDiag
    const row = { at: new Date().toISOString(), event, load: diagSink.__projectHubLoads, ...(detail ?? {}) }
    rows.push(row)
    if (rows.length > DIAG_LIMIT) rows.splice(0, rows.length - DIAG_LIMIT)
    try {
      if (event.startsWith('style-lost')) console.warn(`[project-hub] ${event}`, row)
      else console.debug(`[project-hub] ${event}`, detail ?? '')
    } catch { /* a hostile console must never break the panel */ }
  }

  window.__ModuleLoader__.load({
    id: PACKAGE_ID,
    factory(require) {
      diagSink.__projectHubLoads += 1
      diag('factory')
      const React = require('react')
      const { useCallback, useEffect, useMemo, useRef, useState } = React
      const h = React.createElement

      function tcopy() { return COPY[localeKey()] }

      function messageOf(error) {
        return error instanceof Error ? error.message : String(error)
      }

      function count(value) {
        return typeof value === 'number' && Number.isFinite(value)
          ? new Intl.NumberFormat(localeKey() === 'zh' ? 'zh-CN' : 'en-US').format(value)
          : '—'
      }

      /** One relative-time label; `null` reads as "no sessions yet". */
      function relativeTime(value, copy) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return copy.never
        const locale = localeKey() === 'zh' ? 'zh-CN' : 'en-US'
        const diff = Date.now() - value
        const absolute = Math.abs(diff)
        const direction = diff >= 0 ? -1 : 1
        try {
          const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
          if (absolute < 60_000) return format.format(direction * Math.round(absolute / 1_000), 'second')
          if (absolute < 3_600_000) return format.format(direction * Math.round(absolute / 60_000), 'minute')
          if (absolute < 86_400_000) return format.format(direction * Math.round(absolute / 3_600_000), 'hour')
          if (absolute < 30 * 86_400_000) return format.format(direction * Math.round(absolute / 86_400_000), 'day')
        } catch {
          /* fall through to the absolute date */
        }
        return new Date(value).toLocaleDateString(locale)
      }

      function absoluteTime(value) {
        return typeof value === 'number' && Number.isFinite(value)
          ? new Date(value).toLocaleString(localeKey() === 'zh' ? 'zh-CN' : 'en-US')
          : '—'
      }

      /**
       * Trailing path segments, so a deep monorepo path stays identifiable in a
       * narrow card. The full path always rides in a `title` attribute.
       */
      function shortenPath(path) {
        if (typeof path !== 'string' || path === '') return '—'
        const trimmed = path.replace(/[\\/]+$/, '')
        const separator = path.includes('\\') ? '\\' : '/'
        const segments = trimmed.split(/[\\/]/).filter(segment => segment !== '')
        if (segments.length <= 2) return trimmed
        return `…${separator}${segments.slice(-2).join(separator)}`
      }

      function displayName(row) {
        if (typeof row.title === 'string' && row.title !== '') return row.title
        const segments = String(row.path ?? '').split(/[\\/]/).filter(segment => segment !== '')
        return segments.length > 0 ? segments[segments.length - 1] : row.id
      }

      /**
       * Subscribe to one observable snapshot store.
       *
       * The Session and Workspace Controllers both publish their state this way,
       * so the grid follows renames, archives and running turns without polling
       * the host. An absent store reads as null and never throws: a deployment
       * without it still renders the host aggregate.
       */
      function useObservable(store) {
        const [snapshot, setSnapshot] = useState(() => (
          typeof store?.getSnapshot === 'function' ? store.getSnapshot() : null
        ))
        useEffect(() => {
          if (typeof store?.subscribe !== 'function') return undefined
          const sync = () => setSnapshot(store.getSnapshot())
          sync()
          return store.subscribe(sync)
        }, [store])
        return snapshot
      }

      /**
       * Resolve one platform seed word, or null when this build does not ship it.
       *
       * A dynamic Client half may only require the platform's seeded singletons
       * (`packages/client/web/src/seed.ts`). Each is treated as optional here: a
       * require miss must degrade one feature, never take the panel down.
       */
      function seedModule(spec) {
        try {
          const value = require(spec)
          return value !== null && typeof value === 'object' ? value : null
        } catch {
          return null
        }
      }

      /**
       * The official modal layer, when this build seeds ui-primitives.
       *
       * It owns Escape, Tab traversal, focus entry/restore, and registration in
       * the document's modal stack — reimplementing that would be a second copy
       * of a platform capability. Resolved once per entry load, so the hook
       * branch below is constant for the lifetime of this component tree.
       */
      const PRIMITIVES = seedModule('@deepseek-ai/dsh-client-ui-primitives')
      const useModalLayerHook = typeof PRIMITIVES?.useModalLayer === 'function' ? PRIMITIVES.useModalLayer : null

      /**
       * Read one optional Client face.
       *
       * `inject` declares a hard dependency, so a face this plugin can work
       * without is read through `ctx.get(name, false)` — the documented
       * optional-face accessor, which answers undefined instead of throwing.
       */
      function optionalFace(hub, name) {
        try {
          if (typeof hub?.get === 'function') {
            const value = hub.get(name, false)
            if (value !== undefined && value !== null) return value
          }
        } catch { /* an older Context without get() falls through */ }
        try {
          const value = hub?.[name]
          return value === undefined ? null : value
        } catch {
          return null
        }
      }

      /**
       * The quick switcher's open/close signal.
       *
       * The overlay lives in `shell.overlay`, which the shell mounts, while its
       * two triggers live in a shortcut `resolve()` and in the panel header — so
       * the state cannot belong to either component.
       */
      function createSwitcherSignal() {
        let open = false
        const listeners = new Set()
        const publish = () => { for (const listener of [...listeners]) listener(open) }
        return {
          /** Keycaps the registry resolved for our command, or null when unbound. */
          keys: null,
          /** Why: 'bound' | 'unbound' | 'no-face' | 'failed' — surfaced in diagnostics. */
          status: 'idle',
          reason: null,
          /** True only while the shell.overlay seat is live, so a dead trigger is visible. */
          mounted: false,
          get: () => open,
          set(value) {
            const next = value === true
            if (next === open) return
            open = next
            publish()
          },
          toggle() { open = !open; publish() },
          /**
           * Re-publish without changing `open`, so listeners re-read the fields
           * above. Claiming a binding happens after the panel may have rendered.
           */
          notify: publish,
          subscribe(listener) {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
          },
        }
      }

      const switcher = createSwitcherSignal()

      /**
       * The last overview payload any surface read.
       *
       * The panel already polls it, so the switcher opens on cached rows and
       * refreshes in the background instead of flashing an empty list.
       */
      const overviewCache = {
        payload: null,
        at: 0,
        read() { return this.payload },
        write(body) {
          this.payload = body
          this.at = Date.now()
        },
      }

      /**
       * Score one candidate against a query; null means "does not match".
       *
       * A literal substring always outranks a subsequence, an earlier hit
       * outranks a later one, and a scattered subsequence pays for its gaps —
       * the ranking a switcher needs, without a second search index.
       */
      function fuzzyScore(query, value) {
        if (typeof value !== 'string' || value === '' || typeof query !== 'string' || query === '') return null
        const needle = query.toLowerCase()
        const haystack = value.toLowerCase()
        const at = haystack.indexOf(needle)
        if (at >= 0) return 1_000 - Math.min(at, 100) * 2 - (haystack.length - needle.length) * 0.1
        let cursor = 0
        let spread = 0
        let last = -1
        for (const char of needle) {
          const found = haystack.indexOf(char, cursor)
          if (found < 0) return null
          if (last >= 0) spread += found - last - 1
          last = found
          cursor = found + 1
        }
        return 500 - spread * 4 - Math.min(last, 100) * 0.5
      }

      /**
       * Flatten the aggregate plus the live session list into switcher rows.
       *
       * Membership comes from the host aggregate's `sessionIds` (the registry's
       * own accounting), titles and running flags from the live session list —
       * the same two sources the panel uses, so the switcher cannot disagree
       * with the grid about what exists or what is running. Rows are ordered
       * most-recent-first, the grid's default sort.
       */
      function switcherRows(payload, sessions, copy) {
        const rows = []
        if (payload === null || typeof payload !== 'object' || !Array.isArray(payload.workspaces)) return rows
        const byId = sessions !== null && typeof sessions === 'object' && typeof sessions.byId === 'object'
          && sessions.byId !== null ? sessions.byId : null
        for (const project of payload.workspaces) {
          if (project === null || typeof project !== 'object') continue
          const title = displayName(project)
          const projectRow = {
            kind: 'project',
            id: String(project.id ?? ''),
            title,
            tail: typeof project.path === 'string' && project.path !== '' ? shortenPath(project.path) : '',
            workspaceId: String(project.id ?? ''),
            running: Number(project.liveCount ?? 0) > 0,
            updatedAt: typeof project.lastActiveAt === 'number' ? project.lastActiveAt : null,
          }
          rows.push(projectRow)
          const ids = Array.isArray(project.sessionIds) ? project.sessionIds : []
          for (const sessionId of ids) {
            const summary = byId === null ? null : byId[sessionId]
            const liveTitle = typeof summary?.displayTitle === 'string' && summary.displayTitle !== ''
              ? summary.displayTitle
              : null
            rows.push({
              kind: 'session',
              id: String(sessionId),
              title: liveTitle ?? `${copy.switcherKindSession} ${String(sessionId).slice(0, 8)}`,
              tail: title,
              workspaceId: projectRow.workspaceId,
              running: summary?.running === true,
              updatedAt: typeof summary?.updatedAt === 'number' ? summary.updatedAt : projectRow.updatedAt,
            })
          }
        }
        rows.sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
        return rows
      }

      /**
       * Rank switcher rows for one query.
       *
       * An empty query keeps the recency order; otherwise a title hit outranks a
       * path or project-name hit, and ties fall back to recency so the list does
       * not reshuffle under a cursor while somebody types.
       */
      function rankSwitcherRows(rows, query, limit) {
        const needle = typeof query === 'string' ? query.trim() : ''
        if (needle === '') return rows.slice(0, limit)
        const scored = []
        for (const row of rows) {
          const title = fuzzyScore(needle, row.title)
          const tail = fuzzyScore(needle, row.tail)
          if (title === null && tail === null) continue
          scored.push({ row, score: Math.max(title ?? -1_000, (tail ?? -1_000) * 0.6) })
        }
        scored.sort((a, b) => b.score - a.score
          || Number(b.row.updatedAt ?? 0) - Number(a.row.updatedAt ?? 0))
        return scored.slice(0, limit).map(entry => entry.row)
      }

      /**
       * Create a Workspace through whichever official face is mounted.
       *
       * `ctx.workspaces` is the Controller's Client face and throws on refusal;
       * `ctx.remote.workspace` is the generated remote namespace and answers a
       * `RemoteResult`. Both are supported so the button keeps working across
       * deployments instead of depending on one internal name.
       */
      async function createWorkspace(hub, path) {
        if (typeof hub?.workspaces?.create === 'function') return hub.workspaces.create({ path })
        let remote = null
        try {
          remote = hub?.remote?.workspace ?? null
        } catch {
          remote = null
        }
        if (typeof remote?.create !== 'function') throw new Error(tcopy().noWorkspaceApi)
        const result = await remote.create({ path })
        if (result !== null && typeof result === 'object' && result.ok === false) {
          throw new Error(result.error?.message ?? result.error?.code ?? 'workspace create failed')
        }
        return result?.ok === true ? result.value : result
      }

      /**
       * Full-text search through whichever official face is mounted.
       *
       * `ctx.sessions.search(query, signal)` is the Session Controller's Client
       * face; `ctx.remote.session.search({query}, signal)` is the generated
       * remote namespace. Both fold transport failures into a RemoteResult and
       * both answer `{items:[{sessionId,snippet}], hasMore}` on success. A
       * deployment without session-query answers an error whose message says
       * "session search is unavailable", which the UI surfaces as a notice
       * instead of a crash.
       */
      async function searchSessionContent(hub, query, signal) {
        const controller = hub?.sessions
        // The remote namespace is a guarded face: reading it without declaring
        // the inject throws, and a deployment may omit the slice entirely, so
        // both cases fold into "no remote face" instead of surfacing as a crash.
        let remote = null
        try {
          remote = hub?.remote?.session ?? null
        } catch {
          remote = null
        }
        const call = typeof controller?.search === 'function'
          ? () => controller.search(query, signal)
          : typeof remote?.search === 'function'
            ? () => remote.search({ query }, signal)
            : null
        if (call === null) throw new Error('no session search face: this Client exposes neither ctx.sessions.search nor ctx.remote.session.search')
        const result = await call()
        if (result !== null && typeof result === 'object' && result.ok === false) {
          throw new Error(result.error?.message ?? result.error?.code ?? 'session search failed')
        }
        const value = result?.ok === true ? result.value : result
        return {
          items: Array.isArray(value?.items) ? value.items : [],
          hasMore: value?.hasMore === true,
        }
      }

      /**
       * Capability failures are states to explain, never stack traces to show.
       *
       * The wire text is stable across layers: session-controller wraps engine
       * failures as `session search failed: ${String(error)}` (list.ts:265), the
       * SQLite engine refuses searches while the index is closed with code
       * SESSION_QUERY_SEARCH_DISABLED and the message `session search is
       * disabled … openAt "never"` (session-query-sqlite/src/index.ts:339-342),
       * and a deployment without the provider answers `session search is
       * unavailable … does not mount …` (list.ts:171-177). Each gets its own
       * explanation and its own next step.
       */
      function classifySearchFailure(error) {
        const text = messageOf(error)
        if (/session search is disabled|SESSION_QUERY_SEARCH_DISABLED|openAt\s*"never"/i.test(text)) return 'disabled'
        if (/no session search face|no search face/i.test(text)) return 'noface'
        if (/session search is unavailable|does not mount/i.test(text)) return 'unmounted'
        return 'error'
      }

      /** A genuine failure shows one bounded line, not an internal stack. */
      function firstLine(text) {
        const line = String(text ?? '').split('\n')[0].trim()
        return line.length > 200 ? `${line.slice(0, 200)}…` : line
      }

      function isAbort(error) {
        return error !== null && typeof error === 'object'
          && (error.name === 'AbortError' || /aborted/i.test(messageOf(error)))
      }

      /**
       * Attach display facts to raw search hits. The wire item carries only
       * `{sessionId, snippet}`: title and time come from the live session list,
       * and membership from the host aggregate, because the registry is the
       * source of truth — a hit no project accounts for reads as ungrouped
       * instead of vanishing from the results.
       */
      function decorateHits(items, payload, sessionById, copy) {
        const owner = new Map()
        for (const row of Array.isArray(payload?.workspaces) ? payload.workspaces : []) {
          for (const sessionId of row.sessionIds ?? []) owner.set(sessionId, row)
        }
        return items
          .filter(item => item !== null && typeof item === 'object' && typeof item.sessionId === 'string')
          .map((item) => {
            const summary = sessionById?.[item.sessionId] ?? null
            const row = owner.get(item.sessionId) ?? null
            return {
              sessionId: item.sessionId,
              snippet: typeof item.snippet === 'string' ? item.snippet : '',
              title: typeof summary?.displayTitle === 'string' && summary.displayTitle !== ''
                ? summary.displayTitle
                : item.sessionId,
              updatedAt: typeof summary?.updatedAt === 'number' ? summary.updatedAt : null,
              projectId: row?.id ?? null,
              projectTitle: row?.title ?? copy.chipUngrouped,
              subagent: summary?.origin === 'subagent' || typeof summary?.parentId === 'string',
            }
          })
      }

      /** Split a snippet around every literal occurrence of the query. */
      function highlight(snippet, query) {
        const needle = query.trim().toLowerCase()
        if (needle === '') return [snippet]
        const lower = snippet.toLowerCase()
        const nodes = []
        let cursor = 0
        for (;;) {
          const at = lower.indexOf(needle, cursor)
          if (at === -1) break
          if (at > cursor) nodes.push(snippet.slice(cursor, at))
          nodes.push(h('mark', { className: 'ph-hit__mark' }, snippet.slice(at, at + needle.length)))
          cursor = at + needle.length
        }
        nodes.push(snippet.slice(cursor))
        return nodes
      }

      function Icon(props) {
        const size = typeof props?.size === 'number' ? props.size : 18
        return h('svg', {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', color: props?.active === true ? 'var(--dsw-alias-brand-primary)' : 'currentColor' },
        },
        h('rect', { x: 3, y: 3, width: 7.5, height: 7.5, rx: 2, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('rect', { x: 13.5, y: 3, width: 7.5, height: 7.5, rx: 2, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('rect', { x: 3, y: 13.5, width: 7.5, height: 7.5, rx: 2, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('path', { d: 'M17.25 13.9v6.7M13.9 17.25h6.7', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }))
      }

      function Metric({ label, value, live }) {
        return h('div', { className: 'ph-metric' },
          h('div', { className: 'ph-metric__label' }, label),
          h('div', { className: 'ph-metric__value', ...(live === true ? { 'data-live': 'true' } : {}) }, value))
      }

      function Stat({ label, value, tone, approx, hint }) {
        return h('div', {
          className: 'ph-stat',
          ...(tone === undefined ? {} : { 'data-tone': tone }),
          ...(approx === true ? { 'data-approx': 'true' } : {}),
          ...(hint === undefined ? {} : { title: hint }),
        },
        h('div', { className: 'ph-stat__label' }, label),
        h('div', { className: 'ph-stat__value' }, value))
      }

      function ProjectCard({ row, copy, onNewSession, onOpen, onDetail, hasNote }) {
        const name = displayName(row)
        const statusBadge = row.status === 'missing-dir'
          ? h('span', { className: 'ph-badge ph-badge--missing', title: copy.statusMissing }, copy.statusMissing)
          : row.status === 'unknown'
            ? h('span', { className: 'ph-badge ph-badge--unknown', title: copy.statusUnknown }, copy.statusUnknown)
            : null
        return h('article', {
          className: 'ph-card',
          'data-status': row.status,
          'aria-label': `${copy.cardLabel}: ${name}`,
        },
        h('div', { className: 'ph-card__head' },
          h('h3', { className: 'ph-card__title', title: name }, name),
          h('div', { className: 'ph-badges' },
            row.running > 0 ? h('span', {
              className: 'ph-badge ph-badge--live',
              ...(row.runningApprox === true ? { title: copy.runningApproxHint } : {}),
            }, `${copy.runningUnit} ${row.running}`) : null,
            row.pinnedCount > 0 ? h('span', { className: 'ph-badge ph-badge--pin', title: copy.pinnedCount }, `★ ${row.pinnedCount}`) : null,
            row.subagentCount > 0
              ? h('span', { className: 'ph-badge ph-badge--sub', title: copy.subagentsHint }, `↳ ${row.subagentCount}`)
              : null,
            hasNote === true ? h('span', { className: 'ph-badge', title: copy.chipNote }, '✎') : null,
            statusBadge)),
        h('p', { className: 'ph-card__path', title: row.path }, shortenPath(row.path)),
        h('div', { className: 'ph-card__stats' },
          h(Metric, { label: copy.statSessions, value: count(row.sessionCount) }),
          h(Metric, { label: copy.statArchived, value: count(row.archivedCount) }),
          h(Metric, {
            label: copy.lastActive,
            value: relativeTime(row.lastActiveAt, copy),
            live: false,
          })),
        h('div', { className: 'ph-card__actions' },
          h('button', {
            type: 'button',
            className: 'ph-button ph-button--primary',
            onClick: () => onNewSession(row),
            title: copy.newSession,
          }, copy.newSession),
          h('button', {
            type: 'button',
            className: 'ph-button',
            onClick: () => onOpen(row),
            title: copy.open,
          }, copy.open),
          h('button', {
            type: 'button',
            className: 'ph-button',
            onClick: () => onDetail(row),
            title: copy.detail,
          }, copy.detail)))
      }

      function Page(props) {
        const hub = props?.hub
        const copy = tcopy()
        const [payload, setPayload] = useState(null)
        const [failure, setFailure] = useState(null)
        const [busy, setBusy] = useState('')
        const [notice, setNotice] = useState(null)
        const [sort, setSort] = useState('recent')
        const [view, setView] = useState('overview')
        // The header advertises the switcher's binding, which is claimed when the
        // shell.overlay seat goes live — possibly after this panel's first render.
        // Following the signal keeps the advertised keys honest instead of stale.
        const [, setSwitcherVersion] = useState(0)
        useEffect(() => switcher.subscribe(() => setSwitcherVersion(version => version + 1)), [])
        const [query, setQuery] = useState('')
        const [scope, setScope] = useState('all')
        const [search, setSearch] = useState({ phase: 'idle', items: [], hasMore: false, error: null, reason: null })
        const [notes, setNotes] = useState({ phase: 'idle', byId: {}, degraded: null, error: null })
        const [detailId, setDetailId] = useState(null)
        const [draft, setDraft] = useState(null)
        const [save, setSave] = useState({ state: 'idle', at: null, error: null })
        const [renaming, setRenaming] = useState(false)
        const [renameValue, setRenameValue] = useState('')
        const [confirmDelete, setConfirmDelete] = useState(false)
        const [, setClock] = useState(0)

        // A monotonically increasing request id: a slow answer that lands after
        // a newer request started is dropped instead of overwriting fresh data.
        const requestId = useRef(0)
        const etag = useRef(null)
        const hasData = useRef(false)
        const searchRun = useRef(0)
        const searchAbort = useRef(null)
        const notesRun = useRef(0)
        const notesEtag = useRef(null)
        const saveRun = useRef(0)
        /** Latest editor content, so a slow save cannot mask newer typing. */
        const draftRef = useRef(null)
        /** Which project the editor was seeded from; guards against clobbering edits. */
        const seededFor = useRef(null)

        const sessionStore = hub?.sessions?.list
        const workspaceStore = hub?.workspaces?.list
        const sessions = useObservable(sessionStore)

        const load = useCallback(async (quiet = false) => {
          const request = ++requestId.current
          if (!quiet) setBusy('refresh')
          try {
            const headers = {}
            if (quiet && etag.current !== null) headers['if-none-match'] = etag.current
            const response = await fetch(`${API}/overview`, { headers })
            if (request !== requestId.current) return
            if (response.status === 304) return
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
            const tag = response.headers.get('etag')
            if (tag !== null) etag.current = tag
            const body = await response.json()
            if (request !== requestId.current) return
            if (body !== null && typeof body === 'object' && body.error !== undefined) {
              throw new Error(body.error?.message ?? 'unknown error')
            }
            hasData.current = true
            // Shared with the switcher so opening it never starts from nothing.
            overviewCache.write(body)
            setPayload(body)
            setFailure(null)
          } catch (error) {
            if (request !== requestId.current) return
            // A background refetch never blanks a grid that already has data.
            if (quiet && hasData.current) return
            setFailure(messageOf(error))
          } finally {
            if (request === requestId.current && !quiet) setBusy('')
          }
        }, [])

        /**
         * Read the durable notes. A 304 keeps whatever is already on screen; an
         * error body — including the 503 a host without a profile directory
         * answers — becomes an explained state instead of a thrown exception.
         */
        const loadNotes = useCallback(async (quiet = false) => {
          const run = ++notesRun.current
          try {
            const headers = {}
            if (quiet && notesEtag.current !== null) headers['if-none-match'] = notesEtag.current
            const response = await fetch(`${API}/notes`, { headers })
            if (run !== notesRun.current) return
            if (response.status === 304) return
            const body = await response.json().catch(() => null)
            if (run !== notesRun.current) return
            if (body !== null && typeof body === 'object' && body.error !== undefined) {
              setNotes({
                phase: 'unavailable',
                byId: {},
                degraded: null,
                error: firstLine(String(body.error?.message ?? body.error?.code ?? `HTTP ${response.status}`)),
              })
              return
            }
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
            const tag = response.headers.get('etag')
            if (tag !== null) notesEtag.current = tag
            setNotes({
              phase: 'ready',
              byId: body !== null && typeof body?.notes === 'object' && body.notes !== null && !Array.isArray(body.notes)
                ? body.notes
                : {},
              degraded: typeof body?.degraded?.notes === 'string' ? body.degraded.notes : null,
              error: null,
            })
          } catch (error) {
            if (run !== notesRun.current) return
            // A failed background refetch never blanks notes already on screen.
            setNotes(previous => ({
              ...previous,
              phase: Object.keys(previous.byId).length > 0 ? previous.phase : 'error',
              error: firstLine(messageOf(error)),
            }))
          }
        }, [])

        // First paint, a safety-net poll, and a refresh when the tab returns.
        useEffect(() => {
          void load(false)
          void loadNotes(false)
          const poll = setInterval(() => {
            void load(true)
            void loadNotes(true)
          }, POLL_MS)
          const onVisible = () => {
            if (document.visibilityState !== 'visible') return
            void load(true)
            void loadNotes(true)
          }
          document.addEventListener('visibilitychange', onVisible)
          return () => {
            clearInterval(poll)
            document.removeEventListener('visibilitychange', onVisible)
            requestId.current += 1
            notesRun.current += 1
            saveRun.current += 1
          }
        }, [load, loadNotes])

        // The registry is the source of truth for projects: when its Client
        // mirror moves (create, rename, delete, archive) refetch the aggregate.
        useEffect(() => {
          if (typeof workspaceStore?.subscribe !== 'function') return undefined
          let timer = null
          const dispose = workspaceStore.subscribe(() => {
            if (timer !== null) return
            timer = setTimeout(() => {
              timer = null
              void load(true)
            }, 220)
          })
          return () => {
            dispose()
            if (timer !== null) clearTimeout(timer)
          }
        }, [workspaceStore, load])

        // Relative labels age on their own.
        useEffect(() => {
          const clock = setInterval(() => setClock(value => value + 1), CLOCK_MS)
          return () => clearInterval(clock)
        }, [])

        useEffect(() => {
          if (notice === null) return undefined
          const timer = setTimeout(() => setNotice(null), 3_600)
          return () => clearTimeout(timer)
        }, [notice])

        // Search round-trips: debounce the keystrokes, abort the superseded
        // request, and keep a monotonic run id so an answer that lands after a
        // newer query started is dropped instead of crossing into the results.
        useEffect(() => {
          if (view !== 'search' || query.trim() === '') {
            searchRun.current += 1
            searchAbort.current?.abort()
            searchAbort.current = null
            setSearch(view === 'search'
              ? { phase: 'idle', items: [], hasMore: false, error: null, reason: null }
              : previous => previous)
            return undefined
          }
          const run = ++searchRun.current
          const timer = setTimeout(() => {
            searchAbort.current?.abort()
            const controller = new AbortController()
            searchAbort.current = controller
            setSearch(previous => (previous.phase === 'loading' ? previous : { ...previous, phase: 'loading' }))
            searchSessionContent(hub, query.trim(), controller.signal)
              .then((value) => {
                if (run !== searchRun.current || controller.signal.aborted) return
                setSearch({ phase: 'ready', items: value.items, hasMore: value.hasMore, error: null, reason: null })
              })
              .catch((error) => {
                if (run !== searchRun.current || controller.signal.aborted || isAbort(error)) return
                const kind = classifySearchFailure(error)
                setSearch({
                  phase: kind === 'error' ? 'error' : 'unavailable',
                  items: [],
                  hasMore: false,
                  error: kind === 'error' ? firstLine(messageOf(error)) : null,
                  reason: kind,
                })
              })
          }, SEARCH_DEBOUNCE_MS)
          return () => clearTimeout(timer)
        }, [view, query, hub])

        useEffect(() => () => {
          searchRun.current += 1
          searchAbort.current?.abort()
        }, [])

        const sessionById = sessions?.byId ?? null
        // Only once the host list has arrived is "running" a fact rather than an
        // approximation. Until then the host's own loaded-session count stands in,
        // visibly marked as approximate rather than silently reading as exact.
        const listReady = sessions?.phase === 'ready' && sessionById !== null

        // Host aggregate + live Client session state, merged per project. The
        // host owns membership and counts; the Client owns "is it running now"
        // and the accurate last-activity stamp (it folds in the last prompt).
        const projects = useMemo(() => {
          const rows = Array.isArray(payload?.workspaces) ? payload.workspaces : []
          return rows.map((row) => {
            let lastActiveAt = typeof row.lastActiveAt === 'number' ? row.lastActiveAt : null
            let running = 0
            if (sessionById !== null) {
              for (const sessionId of row.sessionIds ?? []) {
                const summary = sessionById[sessionId]
                if (summary === undefined) continue
                if (typeof summary.updatedAt === 'number'
                  && (lastActiveAt === null || summary.updatedAt > lastActiveAt)) {
                  lastActiveAt = summary.updatedAt
                }
                if (summary.running === true) running += 1
              }
            }
            return {
              ...row,
              lastActiveAt,
              running: listReady ? running : (row.liveCount ?? 0),
              runningApprox: !listReady,
            }
          })
        }, [payload, sessionById, listReady])

        const sorted = useMemo(() => {
          const rows = [...projects]
          if (sort === 'sessions') {
            rows.sort((left, right) => (right.sessionCount - left.sessionCount)
              || ((right.lastActiveAt ?? 0) - (left.lastActiveAt ?? 0))
              || (left.order - right.order))
          } else if (sort === 'manual') {
            rows.sort((left, right) => left.order - right.order)
          } else {
            rows.sort((left, right) => ((right.lastActiveAt ?? -1) - (left.lastActiveAt ?? -1))
              || (right.sessionCount - left.sessionCount)
              || (left.order - right.order))
          }
          return rows
        }, [projects, sort])

        // "Running" comes from the live list once it has arrived, and only from
        // host-list membership (`ids`), so retained subagent rows never inflate it.
        const runningTotal = useMemo(() => {
          if (!listReady || !Array.isArray(sessions?.ids)) return null
          let running = 0
          for (const sessionId of sessions.ids) {
            if (sessionById[sessionId]?.running === true) running += 1
          }
          return running
        }, [listReady, sessionById, sessions])

        const summary = payload?.summary ?? null
        const degraded = payload?.degraded ?? null
        const runningApprox = runningTotal === null

        const notify = useCallback((kind, text) => { setNotice({ kind, text }) }, [])

        const onNewSession = useCallback((row) => {
          // Official semantics, unmodified: start a New Session flow in that
          // Workspace, reusing its blank session when it has one, and navigate.
          if (typeof hub?.uiWorkspace?.startSession !== 'function') {
            notify('error', copy.noNavigation)
            return
          }
          try {
            hub.uiWorkspace.startSession(row.id)
          } catch (error) {
            notify('error', `${copy.newSessionFailed}: ${messageOf(error)}`)
          }
        }, [hub, notify, copy])

        const onOpen = useCallback((row) => {
          if (typeof hub?.uiWorkspace?.openWorkspace !== 'function') {
            notify('error', copy.noNavigation)
            return
          }
          Promise.resolve()
            .then(() => hub.uiWorkspace.openWorkspace(row.id))
            .catch(error => notify('error', `${copy.openFailed}: ${messageOf(error)}`))
        }, [hub, notify, copy])

        const onRegister = useCallback(() => {
          if (typeof hub?.uiWorkspace?.pickDirectory !== 'function') {
            notify('error', copy.noNavigation)
            return
          }
          setBusy('register')
          hub.uiWorkspace.pickDirectory()
            .then(async (path) => {
              if (typeof path !== 'string' || path === '') {
                notify('info', copy.registerCancelled)
                return
              }
              await createWorkspace(hub, path)
              await load(false)
              notify('ok', `${copy.registered}: ${path}`)
            })
            .catch(error => notify('error', `${copy.registerFailed}: ${messageOf(error)}`))
            .finally(() => setBusy(''))
        }, [hub, notify, copy, load])

        // Raw hits become display rows: the live list supplies title and time,
        // the host aggregate supplies membership, and the scope filter is pure
        // post-filtering so switching project never re-queries the host.
        const hits = useMemo(() => {
          const decorated = decorateHits(search.items, payload, sessionById, copy)
          return scope === 'all' ? decorated : decorated.filter(hit => hit.projectId === scope)
        }, [search.items, payload, sessionById, copy, scope])

        const onOpenSession = useCallback((sessionId) => {
          if (typeof hub?.uiWorkspace?.openSession !== 'function') {
            notify('error', copy.noWorkspaceApi)
            return
          }
          Promise.resolve()
            .then(() => hub.uiWorkspace.openSession(sessionId))
            .catch(error => notify('error', `${copy.openFailed}: ${messageOf(error)}`))
        }, [hub, notify, copy])

        // --------------------------------------------------- M3: detail + notes

        const onDetail = useCallback((row) => {
          seededFor.current = null
          setDetailId(row.id)
          setRenaming(false)
          setRenameValue(typeof row.title === 'string' ? row.title : '')
          setConfirmDelete(false)
          setView('detail')
        }, [])

        const onBack = useCallback(() => {
          setView('overview')
          setRenaming(false)
        }, [])

        const detailRow = useMemo(
          () => (view === 'detail' && detailId !== null
            ? projects.find(row => row.id === detailId) ?? null
            : null),
          [view, detailId, projects],
        )

        /** Projects whose note actually holds content, for the card badge. */
        const noteIds = useMemo(() => {
          const ids = new Set()
          for (const [workspaceId, note] of Object.entries(notes.byId ?? {})) {
            const filled = (typeof note?.text === 'string' && note.text.trim() !== '')
              || (typeof note?.instructions === 'string' && note.instructions.trim() !== '')
              || (Array.isArray(note?.tags) && note.tags.length > 0)
            if (filled) ids.add(workspaceId)
          }
          return ids
        }, [notes])

        // Registry order decides the display order, pinned sessions lead exactly
        // as they do in the native sidebar; titles and stamps come from the live
        // list, membership from the host aggregate.
        const detailSessions = useMemo(() => {
          if (detailRow === null) return []
          const pinned = new Set(Array.isArray(detailRow.pinnedSessionIds) ? detailRow.pinnedSessionIds : [])
          const archived = new Set(Array.isArray(detailRow.archivedSessionIds) ? detailRow.archivedSessionIds : [])
          const rows = (Array.isArray(detailRow.sessionIds) ? detailRow.sessionIds : []).map((sessionId) => {
            const summary = sessionById?.[sessionId] ?? null
            return {
              id: sessionId,
              title: typeof summary?.displayTitle === 'string' && summary.displayTitle !== ''
                ? summary.displayTitle
                : sessionId,
              updatedAt: typeof summary?.updatedAt === 'number' ? summary.updatedAt : null,
              running: summary?.running === true,
              pinned: pinned.has(sessionId),
              archived: archived.has(sessionId),
              subagent: summary?.origin === 'subagent' || typeof summary?.parentId === 'string',
            }
          })
          return rows.sort((left, right) => Number(right.pinned) - Number(left.pinned))
        }, [detailRow, sessionById])

        // Seed the editor once per project, and only once the notes answer has
        // arrived — a later refresh must never clobber text being typed.
        useEffect(() => {
          if (view !== 'detail' || detailId === null) return
          if (seededFor.current === detailId || notes.phase === 'idle') return
          seededFor.current = detailId
          const stored = notes.byId?.[detailId] ?? null
          const seeded = {
            id: detailId,
            text: typeof stored?.text === 'string' ? stored.text : '',
            instructions: typeof stored?.instructions === 'string' ? stored.instructions : '',
          }
          draftRef.current = seeded
          setDraft(seeded)
          setSave({
            state: 'idle',
            at: typeof stored?.updatedAt === 'number' ? stored.updatedAt : null,
            error: null,
          })
        }, [view, detailId, notes])

        useEffect(() => {
          if (view !== 'detail') seededFor.current = null
        }, [view])

        const onDraft = useCallback(field => (event) => {
          const value = typeof event?.target?.value === 'string' ? event.target.value : ''
          setDraft((previous) => {
            if (previous === null) return previous
            const next = { ...previous, [field]: value }
            draftRef.current = next
            return next
          })
          setSave(previous => (previous.state === 'saving' ? previous : { ...previous, state: 'dirty', error: null }))
        }, [])

        /** One save in flight at a time; the newest text always wins. */
        const flushSave = useCallback(async (value) => {
          if (value === null) return
          const run = ++saveRun.current
          setSave(previous => ({ ...previous, state: 'saving' }))
          try {
            const response = await fetch(`${API}/notes`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                workspaceId: value.id,
                text: value.text,
                instructions: value.instructions,
              }),
            })
            const body = await response.json().catch(() => null)
            if (run !== saveRun.current) return
            if (!response.ok || (body !== null && typeof body === 'object' && body.error !== undefined)) {
              throw new Error(firstLine(String(body?.error?.message ?? `HTTP ${response.status}`)))
            }
            const note = body?.note ?? null
            const latest = draftRef.current
            // Typing during the round-trip keeps the editor dirty, so the newer
            // text earns its own save instead of being reported as stored.
            const changedSince = latest !== null
              && (latest.id !== value.id || latest.text !== value.text || latest.instructions !== value.instructions)
            setNotes(previous => ({
              ...previous,
              byId: {
                ...previous.byId,
                [value.id]: note ?? {
                  workspaceId: value.id,
                  text: value.text,
                  instructions: value.instructions,
                  tags: [],
                  updatedAt: Date.now(),
                },
              },
            }))
            notesEtag.current = null
            setSave(previous => ({
              state: changedSince ? 'dirty' : 'saved',
              at: typeof note?.updatedAt === 'number' ? note.updatedAt : previous.at,
              error: null,
            }))
          } catch (error) {
            if (run !== saveRun.current) return
            setSave(previous => ({ state: 'error', at: previous.at, error: firstLine(messageOf(error)) }))
          }
        }, [])

        // Autosave: one second after the last keystroke, never while a save runs.
        useEffect(() => {
          if (view !== 'detail' || draft === null || save.state !== 'dirty') return undefined
          const timer = setTimeout(() => { void flushSave(draft) }, NOTES_SAVE_MS)
          return () => clearTimeout(timer)
        }, [view, draft, save.state, flushSave])

        const onCopyInstructions = useCallback(() => {
          const value = typeof draft?.instructions === 'string' ? draft.instructions : ''
          if (value.trim() === '') {
            notify('info', copy.copyEmpty)
            return
          }
          const clipboard = typeof navigator === 'object' && navigator !== null ? navigator.clipboard : null
          // `clipboard` is undefined outside a secure context, so this must not
          // dereference it before the check.
          if (typeof clipboard?.writeText !== 'function') {
            notify('error', copy.clipboardUnavailable)
            return
          }
          Promise.resolve()
            .then(() => clipboard.writeText(value))
            .then(() => notify('ok', copy.copiedInstructions))
            .catch(error => notify('error', `${copy.copyFailed}: ${messageOf(error)}`))
        }, [draft, notify, copy])

        const onDeleteNote = useCallback(() => {
          if (detailId === null) return
          if (!confirmDelete) {
            setConfirmDelete(true)
            return
          }
          const workspaceId = detailId
          setConfirmDelete(false)
          Promise.resolve()
            .then(async () => {
              const response = await fetch(`${API}/notes/delete`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ workspaceId }),
              })
              const body = await response.json().catch(() => null)
              if (!response.ok || (body !== null && typeof body === 'object' && body.error !== undefined)) {
                throw new Error(firstLine(String(body?.error?.message ?? `HTTP ${response.status}`)))
              }
              setNotes((previous) => {
                const byId = { ...previous.byId }
                delete byId[workspaceId]
                return { ...previous, byId }
              })
              const cleared = { id: workspaceId, text: '', instructions: '' }
              draftRef.current = cleared
              setDraft(cleared)
              setSave({ state: 'idle', at: null, error: null })
              notesEtag.current = null
              notify('ok', copy.noteDeleted)
            })
            .catch(error => notify('error', `${copy.noteDeleteFailed}: ${messageOf(error)}`))
        }, [detailId, confirmDelete, notify, copy])

        const onRename = useCallback(() => {
          if (detailRow === null) {
            setRenaming(false)
            return
          }
          const title = renameValue.trim()
          if (title === '') return
          if (title === detailRow.title) {
            notify('info', copy.renameUnchanged)
            setRenaming(false)
            return
          }
          const rename = hub?.workspaces?.rename
          if (typeof rename !== 'function') {
            notify('error', copy.renameUnavailable)
            return
          }
          Promise.resolve()
            // The controller owns the registry write; a duplicate name it refuses
            // is reported verbatim instead of being swallowed.
            .then(() => rename.call(hub.workspaces, detailRow.id, title))
            .then(() => {
              notify('ok', copy.renamed)
              setRenaming(false)
              return load(true)
            })
            .catch(error => notify('error', `${copy.renameFailed}: ${messageOf(error)}`))
        }, [detailRow, renameValue, hub, notify, copy, load])

        const onMove = useCallback((direction) => {
          if (detailRow === null) return
          const rows = [...projects].sort((left, right) => left.order - right.order)
          const index = rows.findIndex(row => row.id === detailRow.id)
          const target = direction === 'up' ? index - 1 : index + 1
          if (index < 0 || target < 0 || target >= rows.length) return
          const move = hub?.workspaces?.insertBefore
          if (typeof move !== 'function') {
            notify('error', copy.moveUnavailable)
            return
          }
          // Moving down means moving the neighbour up: one official verb, both ways.
          const moved = direction === 'up' ? rows[index] : rows[target]
          const anchor = direction === 'up' ? rows[target] : rows[index]
          Promise.resolve()
            .then(() => move.call(hub.workspaces, moved.id, anchor.id))
            .then(() => load(true))
            .catch(error => notify('error', `${copy.moveFailed}: ${messageOf(error)}`))
        }, [detailRow, projects, hub, notify, copy, load])

        /**
         * Session verbs live on two faces. `uiWorkspace` wins because it also
         * reconciles the native sidebar (pin order, clearing a selection it just
         * archived); `workspaces` is the fallback for a deployment that mounts
         * only the controller. Neither present is a state to explain, never a
         * silent no-op.
         */
        const sessionVerb = useCallback((verb) => {
          const preferred = hub?.uiWorkspace?.[verb]
          if (typeof preferred === 'function') return preferred.bind(hub.uiWorkspace)
          const fallback = hub?.workspaces?.[verb]
          if (typeof fallback === 'function') return fallback.bind(hub.workspaces)
          return null
        }, [hub])

        const onSessionAction = useCallback((verb, sessionId, failedLabel, options) => {
          const call = sessionVerb(verb)
          if (call === null) {
            notify('error', copy.sessionActionUnavailable)
            return
          }
          Promise.resolve()
            .then(() => call(sessionId, options))
            .then(() => load(true))
            .catch(error => notify('error', `${failedLabel}: ${messageOf(error)}`))
        }, [sessionVerb, notify, copy, load])

        const saveLabel = save.state === 'saving'
          ? copy.notesStateSaving
          : save.state === 'error'
            ? copy.notesStateError.replace('{message}', save.error ?? '')
            : save.state === 'dirty'
              // Unsaved edits say so: an older "saved at" stamp would lie.
              ? copy.notesStateIdle
              : save.at !== null
                ? copy.notesStateSaved.replace('{time}', absoluteTime(save.at))
                : copy.notesStateIdle

        const stamp = typeof payload?.generatedAt === 'number' ? absoluteTime(payload.generatedAt) : null

        // One slot serves both views: the overview keeps every M1 node verbatim
        // and the search view is a sibling body, so the panel gains a dimension
        // without growing a second sidebar entry.
        const overviewBody = [
          degraded?.sessions === undefined ? null : h('div', { className: 'ph-note', role: 'status' },
            h('strong', null, `${copy.degradedSessions}: `), h('span', null, String(degraded.sessions))),
          degraded?.workspaces === undefined ? null : h('div', { className: 'ph-note', role: 'status' },
            h('strong', null, `${copy.degradedWorkspaces}: `), h('span', null, String(degraded.workspaces))),

          summary === null ? null : h('div', { className: 'ph-strip' },
            h(Stat, { label: copy.statProjects, value: count(summary.workspaces) }),
            h(Stat, { label: copy.statSessions, value: count(summary.sessions) }),
            h(Stat, {
              label: copy.statRunning,
              value: count(runningApprox ? summary.liveSessions : runningTotal),
              ...(runningApprox ? { approx: true, hint: copy.runningApproxHint } : {}),
            }),
            h(Stat, { label: copy.statArchived, value: count(summary.archivedSessions) }),
            summary.subagentSessions > 0
              ? h(Stat, { label: copy.statSubagents, value: count(summary.subagentSessions), hint: copy.subagentsHint })
              : null,
            summary.ungroupedSessions > 0
              ? h(Stat, { label: copy.statUngrouped, value: count(summary.ungroupedSessions), tone: 'warn' })
              : null,
            summary.missingDirs > 0
              ? h(Stat, { label: copy.statMissing, value: count(summary.missingDirs), tone: 'warn' })
              : null),

          failure === null && payload !== null && sorted.length > 0 ? h('div', { className: 'ph-toolbar' },
            h('div', { className: 'ph-count' },
              `${count(sorted.length)} ${copy.statProjects.toLowerCase()}`,
              sort === 'manual' ? ` · ${copy.orderHint}` : ''),
            h('div', { className: 'ph-sorts', role: 'group', 'aria-label': copy.sortLabel },
              ...[['recent', copy.sortRecent], ['sessions', copy.sortSessions], ['manual', copy.sortManual]]
                .map(([key, label]) => h('button', {
                  key,
                  type: 'button',
                  className: 'ph-sort',
                  'data-active': sort === key ? 'true' : 'false',
                  'aria-pressed': sort === key ? 'true' : 'false',
                  onClick: () => setSort(key),
                }, label)))) : null,

          failure !== null ? h('div', { className: 'ph-panel' },
            h('h2', { className: 'ph-panel__title' }, copy.errorTitle),
            h('p', { className: 'ph-panel__detail' }, failure),
            h('button', { type: 'button', className: 'ph-button', onClick: () => { void load(false) } }, copy.retry))
            : payload === null ? h('div', { className: 'ph-skeleton', 'aria-busy': 'true', 'aria-label': copy.loading },
              ...Array.from({ length: 6 }, (_, index) => h('div', { key: index, className: 'ph-bone' })))
              : sorted.length === 0 ? h('div', { className: 'ph-panel' },
                h('h2', { className: 'ph-panel__title' }, copy.emptyTitle),
                h('p', { className: 'ph-panel__hint' }, copy.emptyHint),
                h('button', {
                  type: 'button',
                  className: 'ph-button ph-button--primary',
                  onClick: onRegister,
                  disabled: busy !== '',
                }, copy.register))
                : h('div', { className: 'ph-grid' },
                  ...sorted.map(row => h(ProjectCard, {
                    key: row.id,
                    row,
                    copy,
                    onNewSession,
                    onOpen,
                    onDetail,
                    hasNote: noteIds.has(row.id),
                  }))),
        ]

        const searchLimit = typeof hub?.sessions?.searchResultLimit === 'number'
          ? hub.sessions.searchResultLimit
          : 20
        const searchBody = [
          h('div', { className: 'ph-searchbar' },
            h('input', {
              className: 'ph-input',
              type: 'search',
              value: query,
              placeholder: copy.searchPlaceholder,
              'aria-label': copy.tabSearch,
              onChange: event => setQuery(event.target.value),
            }),
            h('select', {
              className: 'ph-select',
              value: scope,
              'aria-label': copy.searchScope,
              onChange: event => setScope(event.target.value),
            },
              h('option', { value: 'all' }, copy.filterAll),
              ...projects.map(row => h('option', { key: row.id, value: row.id }, row.title ?? row.id))),

          search.phase === 'unavailable'
            ? h('div', { className: 'ph-panel', role: 'status', 'data-reason': search.reason ?? 'noface' },
              h('h2', { className: 'ph-panel__title' }, copy.searchUnavailableTitle),
              h('p', { className: 'ph-panel__detail' }, search.reason === 'disabled' ? copy.searchReasonDisabled
                : search.reason === 'unmounted' ? copy.searchReasonUnmounted
                  : copy.searchReasonNoFace),
              h('p', { className: 'ph-panel__hint' }, search.reason === 'disabled' ? copy.searchNextDisabled
                : search.reason === 'unmounted' ? copy.searchNextUnmounted
                  : copy.searchNextNoFace))
            : search.phase === 'error'
              ? h('div', { className: 'ph-panel' },
                h('h2', { className: 'ph-panel__title' }, copy.searchFailed),
                h('p', { className: 'ph-panel__detail' }, search.error ?? ''),
                h('p', { className: 'ph-panel__hint' }, copy.searchFailedHint))
              : search.phase === 'loading'
                ? h('div', { className: 'ph-count', role: 'status', 'aria-busy': 'true' }, copy.searching)
                : search.phase === 'idle'
                  ? h('div', { className: 'ph-panel' },
                    h('h2', { className: 'ph-panel__title' }, copy.searchIdleTitle),
                    h('p', { className: 'ph-panel__hint' }, copy.searchIdleHint))
                  : hits.length === 0
                    ? h('div', { className: 'ph-panel' },
                      h('h2', { className: 'ph-panel__title' }, copy.noHitsTitle),
                      h('p', { className: 'ph-panel__hint' }, copy.noHitsHint))
                    : h('div', { className: 'ph-hits' },
                      h('div', { className: 'ph-count' },
                        `${count(hits.length)} ${copy.hitsUnit}`,
                        search.hasMore ? ` · ${copy.hitsMore.replace('{n}', count(searchLimit))}` : ''),
                      ...hits.map(hit => h('button', {
                        key: hit.sessionId,
                        type: 'button',
                        className: 'ph-hit',
                        title: copy.hitOpenHint,
                        onClick: () => onOpenSession(hit.sessionId),
                      },
                        h('div', { className: 'ph-hit__head' },
                          h('span', { className: 'ph-hit__title', title: hit.title }, hit.title),
                          hit.subagent ? h('span', { className: 'ph-chip', title: copy.subagentsHint }, '↳') : null,
                          h('span', { className: 'ph-chip' }, hit.projectTitle),
                          hit.updatedAt === null ? null : h('span', { className: 'ph-hit__time' }, relativeTime(hit.updatedAt, copy))),
                        h('p', { className: 'ph-hit__snippet' }, ...highlight(hit.snippet, query)))))),
        ]

        // The detail view is the third body of one panel: it adds a dimension
        // (notes + management for one project) instead of a second sidebar entry.
        const detailBody = [
          h('div', { className: 'ph-crumb' },
            h('button', { type: 'button', className: 'ph-button', onClick: onBack }, `← ${copy.backToOverview}`),
            detailRow === null ? null : h('span', {
              className: 'ph-crumb__title',
              title: detailRow.title ?? detailRow.id,
            }, detailRow.title ?? detailRow.id)),

          detailRow === null
            ? h('div', { className: 'ph-panel' },
              h('h2', { className: 'ph-panel__title' }, copy.errorTitle),
              h('p', { className: 'ph-panel__hint' }, copy.detailMissing))
            : h('div', { className: 'ph-detail' },
              h('section', { className: 'ph-block' },
                h('div', { className: 'ph-block__head' },
                  h('h2', { className: 'ph-block__title' }, renaming ? copy.renameLabel : (detailRow.title ?? detailRow.id)),
                  h('div', { className: 'ph-block__actions' },
                    h('button', { type: 'button', className: 'ph-button', onClick: () => onMove('up'), title: copy.moveUp }, copy.moveUp),
                    h('button', { type: 'button', className: 'ph-button', onClick: () => onMove('down'), title: copy.moveDown }, copy.moveDown),
                    renaming ? null : h('button', {
                      type: 'button',
                      className: 'ph-button',
                      onClick: () => {
                        setRenameValue(typeof detailRow.title === 'string' ? detailRow.title : '')
                        setRenaming(true)
                      },
                    }, copy.rename),
                    h('button', { type: 'button', className: 'ph-button', onClick: () => onNewSession(detailRow) }, copy.newSession),
                    h('button', {
                      type: 'button',
                      className: 'ph-button ph-button--primary',
                      onClick: () => onOpen(detailRow),
                    }, copy.open))),
                h('p', { className: 'ph-detail__path', title: detailRow.path }, detailRow.path),
                renaming ? h('div', { className: 'ph-rename' },
                  h('input', {
                    className: 'ph-input',
                    value: renameValue,
                    'aria-label': copy.renameLabel,
                    onChange: event => setRenameValue(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') onRename()
                      if (event.key === 'Escape') setRenaming(false)
                    },
                  }),
                  h('button', {
                    type: 'button',
                    className: 'ph-button ph-button--primary',
                    onClick: onRename,
                  }, copy.renameSave),
                  h('button', {
                    type: 'button',
                    className: 'ph-button',
                    onClick: () => setRenaming(false),
                  }, copy.renameCancel)) : null,
                detailRow.status === 'missing-dir'
                  ? h('p', { className: 'ph-note' }, copy.statusMissing)
                  : null),

              h('section', { className: 'ph-block' },
                h('div', { className: 'ph-block__head' },
                  h('h2', { className: 'ph-block__title' }, copy.notesTitle),
                  h('span', { className: 'ph-save', role: 'status', 'data-state': save.state }, saveLabel)),
                notes.degraded === null ? null : h('div', { className: 'ph-note', role: 'status' },
                  h('strong', null, `${copy.notesDegraded}: `), h('span', null, notes.degraded)),
                notes.phase === 'unavailable' || notes.phase === 'error'
                  ? h('div', { className: 'ph-panel' },
                    h('h3', { className: 'ph-panel__title' }, copy.notesUnavailable),
                    h('p', { className: 'ph-panel__detail' }, notes.error ?? ''),
                    h('button', {
                      type: 'button',
                      className: 'ph-button',
                      onClick: () => { void loadNotes(false) },
                    }, copy.retry))
                  : draft === null ? null : h('div', { className: 'ph-notes' },
                    h('label', { className: 'ph-field' },
                      h('span', { className: 'ph-field__label' }, copy.notesTextLabel),
                      h('textarea', {
                        className: 'ph-textarea',
                        rows: 4,
                        value: draft.text,
                        placeholder: copy.notesPlaceholderText,
                        'aria-label': copy.notesTextLabel,
                        onChange: onDraft('text'),
                      }),
                      h('span', { className: 'ph-field__hint' }, copy.notesTextHint)),
                    h('label', { className: 'ph-field' },
                      h('span', { className: 'ph-field__label' }, copy.notesInstructionsLabel),
                      h('textarea', {
                        className: 'ph-textarea',
                        rows: 4,
                        value: draft.instructions,
                        placeholder: copy.notesPlaceholderInstructions,
                        'aria-label': copy.notesInstructionsLabel,
                        onChange: onDraft('instructions'),
                      }),
                      h('span', { className: 'ph-field__hint' }, copy.notesInstructionsHint)),
                    h('div', { className: 'ph-block__actions' },
                      h('button', {
                        type: 'button',
                        className: 'ph-button',
                        onClick: onCopyInstructions,
                        title: copy.copyInstructions,
                      }, copy.copyInstructions),
                      save.state === 'error' ? h('button', {
                        type: 'button',
                        className: 'ph-button',
                        onClick: () => { void flushSave(draft) },
                      }, copy.notesStateRetry) : null,
                      noteIds.has(detailRow.id) || draft.text !== '' || draft.instructions !== ''
                        ? h('button', {
                          type: 'button',
                          className: 'ph-button',
                          onClick: onDeleteNote,
                        }, confirmDelete ? copy.deleteNoteConfirm : copy.deleteNote)
                        : null))),

              h('section', { className: 'ph-block' },
                h('div', { className: 'ph-block__head' },
                  h('h2', { className: 'ph-block__title' }, copy.detailSessions),
                  h('span', { className: 'ph-count' }, `${count(detailSessions.length)} ${copy.sessionsUnit}`)),
                detailSessions.length === 0
                  ? h('p', { className: 'ph-panel__hint' }, copy.detailNoSessions)
                  : h('div', { className: 'ph-rows' },
                    ...detailSessions.map(session => h('div', { key: session.id, className: 'ph-row' },
                      h('button', {
                        type: 'button',
                        className: 'ph-row__open',
                        title: copy.hitOpenHint,
                        onClick: () => onOpenSession(session.id),
                      },
                        h('span', { className: 'ph-row__title', title: session.title }, session.title),
                        session.running ? h('span', { className: 'ph-badge ph-badge--live' }, copy.runningUnit) : null,
                        session.pinned ? h('span', { className: 'ph-chip' }, copy.chipPinned) : null,
                        session.archived ? h('span', { className: 'ph-chip' }, copy.chipArchived) : null,
                        session.subagent
                          ? h('span', { className: 'ph-chip', title: copy.subagentsHint }, copy.chipSubagent)
                          : null,
                        session.updatedAt === null ? null : h('span', { className: 'ph-row__time' }, relativeTime(session.updatedAt, copy))),
                      h('div', { className: 'ph-row__actions' },
                        h('button', {
                          type: 'button',
                          className: 'ph-button',
                          onClick: () => onSessionAction(
                            session.pinned ? 'unpinSession' : 'pinSession',
                            session.id,
                            copy.sessionActionFailed,
                          ),
                        }, session.pinned ? copy.unpinSession : copy.pinSession),
                        session.archived
                          ? h('button', {
                            type: 'button',
                            className: 'ph-button',
                            onClick: () => onSessionAction('unarchiveSession', session.id, copy.sessionActionFailed),
                          }, copy.unarchiveSession)
                          : h('button', {
                            type: 'button',
                            className: 'ph-button',
                            // A running session is archived only with an explicit
                            // stop, and the label says so: nothing is killed silently.
                            onClick: () => onSessionAction(
                              'archiveSession',
                              session.id,
                              copy.sessionActionFailed,
                              session.running ? { stopActivity: true } : undefined,
                            ),
                          }, session.running ? copy.archiveRunning : copy.archiveSession))))))),
        ]

        const shortcutNote = switcher.status === 'no-face'
          ? copy.switcherShortcutAbsent
          : switcher.status === 'unbound' || switcher.status === 'failed'
            ? copy.switcherShortcutTaken.replace('{keys}', 'Ctrl+K').replace('{command}', copy.switcher)
            : null

        return h('div', { className: 'ph-page' },
          h('div', { className: 'ph-shell' },
            h('header', { className: 'ph-head' },
              h('div', null,
                h('h1', { className: 'ph-title' }, copy.title),
                h('p', { className: 'ph-subtitle' }, copy.subtitle),
                stamp === null ? null : h('div', { className: 'ph-stamp' }, `${copy.updatedAt} ${stamp}`),
                // Say why the keyboard entry is missing instead of leaving the
                // user to guess whether Ctrl+K is broken, taken, or simply not
                // offered by this deployment.
                shortcutNote === null ? null : h('div', { className: 'ph-stamp' }, shortcutNote)),
              h('div', { className: 'ph-actions' },
                h('button', {
                  type: 'button',
                  className: 'ph-button',
                  // The overlay is reachable without a keyboard binding, because a
                  // host that owns Ctrl+K must not cost the feature entirely.
                  onClick: () => switcher.set(true),
                  title: switcher.keys === null
                    ? copy.switcherHintNoKeys
                    : copy.switcherHint.replace('{keys}', switcher.keys),
                }, switcher.keys === null ? copy.switcherOpen : `${copy.switcherOpen} ${switcher.keys}`),
                h('button', {
                  type: 'button',
                  className: 'ph-button',
                  onClick: () => { void load(false) },
                  disabled: busy !== '',
                }, busy === 'refresh' ? copy.refreshing : copy.refresh),
                h('button', {
                  type: 'button',
                  className: 'ph-button ph-button--primary',
                  onClick: onRegister,
                  disabled: busy !== '',
                }, busy === 'register' ? copy.registering : copy.register))),

            h('div', { className: 'ph-tabs', role: 'tablist', 'aria-label': copy.tabsLabel },
              h('button', {
                type: 'button',
                role: 'tab',
                className: 'ph-tab',
                'data-active': view === 'overview' ? 'true' : 'false',
                'aria-selected': view === 'overview' ? 'true' : 'false',
                onClick: () => setView('overview'),
              }, copy.tabOverview),
              h('button', {
                type: 'button',
                role: 'tab',
                className: 'ph-tab',
                'data-active': view === 'search' ? 'true' : 'false',
                'aria-selected': view === 'search' ? 'true' : 'false',
                onClick: () => setView('search'),
              }, copy.tabSearch)),

            ...(view === 'overview' ? overviewBody : view === 'search' ? searchBody : detailBody),

            notice === null ? null : h('div', {
              className: 'ph-toast',
              'data-kind': notice.kind === 'error' ? 'error' : 'info',
              role: 'status',
            }, notice.text)))
      }

      /** How many rows the switcher lists at once; a palette is not a scroll-through table. */
      const SWITCHER_LIMIT = 40

      /**
       * Escape-to-close and focus restore for a build that seeds no ui-primitives.
       *
       * The official modal layer already does this plus Tab traversal and modal
       * stack registration; this fallback covers only the two keys a switcher
       * cannot work without, and is used when — and only when — that layer is
       * unavailable.
       */
      function useFallbackDialogKeys(open, close) {
        const restore = useRef(null)
        useEffect(() => {
          if (open !== true) return undefined
          restore.current = typeof document === 'undefined' ? null : document.activeElement
          const onKeydown = (event) => {
            if (event?.key === 'Escape' && event.repeat !== true) close()
          }
          document.addEventListener('keydown', onKeydown)
          return () => {
            document.removeEventListener('keydown', onKeydown)
            const target = restore.current
            restore.current = null
            if (target !== null && typeof target?.focus === 'function' && target.isConnected !== false) target.focus()
          }
        }, [open, close])
      }

      /**
       * The quick switcher overlay.
       *
       * Registered into `shell.overlay` — the frame-wide floating layer above
       * every column, the same seat the platform's own dialogs use — so this is
       * an addition to the shell, not a second sidebar. It ranks projects and
       * sessions for keyboard-only navigation and opens the chosen row through
       * `uiWorkspace`, the official navigation face.
       */
      function Switcher(props) {
        const hub = props?.hub ?? null
        const copy = tcopy()
        const [open, setOpen] = useState(switcher.get())
        const [query, setQuery] = useState('')
        const [active, setActive] = useState(0)
        const [payload, setPayload] = useState(() => overviewCache.read())
        const [phase, setPhase] = useState('idle')
        const [failure, setFailure] = useState(null)
        const [activating, setActivating] = useState(null)
        const run = useRef(0)
        const dialogRef = useRef(null)
        const inputRef = useRef(null)
        const payloadRef = useRef(overviewCache.read())
        const sessions = useObservable(hub?.sessions?.list)

        const rows = useMemo(() => switcherRows(payload, sessions, copy), [payload, sessions, copy])
        const matches = useMemo(() => rankSwitcherRows(rows, query, SWITCHER_LIMIT), [rows, query])

        const close = useCallback(() => switcher.set(false), [])

        // The trigger lives outside React, so the overlay follows the signal.
        useEffect(() => switcher.subscribe(setOpen), [])

        // Every open starts clean: a stale query or selection would hide rows.
        useEffect(() => {
          if (open !== true) return undefined
          setQuery('')
          setActive(0)
          setFailure(null)
          setActivating(null)
          return undefined
        }, [open])

        const refresh = useCallback(async () => {
          const request = ++run.current
          setPhase('loading')
          try {
            const response = await fetch(`${API}/overview`)
            if (request !== run.current) return
            // A structured error body carries the real reason, so read it before
            // falling back to the bare status line.
            const body = await response.json().catch(() => null)
            if (request !== run.current) return
            if (body !== null && typeof body === 'object' && body.error !== undefined) {
              throw new Error(String(body.error?.message ?? body.error?.code ?? `HTTP ${response.status}`))
            }
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
            overviewCache.write(body)
            payloadRef.current = body
            setPayload(body)
            setFailure(null)
            setPhase('ready')
          } catch (error) {
            if (request !== run.current) return
            // Cached rows stay on screen: a failed refresh must not empty a
            // switcher somebody is already reading.
            setFailure(tcopy().switcherFailed.replace('{message}', firstLine(messageOf(error))))
            setPhase(payloadRef.current === null ? 'error' : 'ready')
          }
        }, [])

        useEffect(() => {
          if (open !== true) return undefined
          void refresh()
          return () => { run.current += 1 }
        }, [open, refresh])

        // The official modal layer owns Escape, Tab, focus entry and restore.
        if (useModalLayerHook !== null) useModalLayerHook(dialogRef, open === true, close)
        else useFallbackDialogKeys(open === true, close)

        useEffect(() => {
          if (open !== true) return undefined
          const node = inputRef.current
          if (node !== null && typeof node?.focus === 'function') node.focus()
          return undefined
        }, [open])

        const activate = useCallback(async (row) => {
          if (row === null || row === undefined) return
          setActivating(row.id)
          try {
            const face = optionalFace(hub, 'uiWorkspace')
            if (row.kind === 'session') {
              if (typeof face?.openSession !== 'function') throw new Error(copy.sessionActionUnavailable)
              await face.openSession(row.id)
            } else if (typeof face?.openWorkspace === 'function') {
              await face.openWorkspace(row.id)
            } else if (typeof face?.startSession === 'function') {
              face.startSession(row.id)
            } else {
              throw new Error(copy.sessionActionUnavailable)
            }
            switcher.set(false)
          } catch (error) {
            setFailure(copy.switcherOpenFailed.replace('{message}', firstLine(messageOf(error))))
            setPhase('ready')
          } finally {
            setActivating(null)
          }
        }, [hub, copy])

        const onKeyDown = (event) => {
          if (event === null || event === undefined) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // Arrows belong to the list, not to the text cursor.
            if (typeof event.preventDefault === 'function') event.preventDefault()
            if (matches.length === 0) return
            const step = event.key === 'ArrowDown' ? 1 : -1
            setActive(index => (index + step + matches.length) % matches.length)
            return
          }
          if (event.key === 'Enter') {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            const row = matches[Math.min(active, matches.length - 1)]
            if (row !== undefined) void activate(row)
            return
          }
          if (event.key === 'Escape') {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            close()
          }
        }

        if (open !== true) return null
        const loading = phase === 'loading' && payloadRef.current === null
        return h('div', {
          className: 'ph-palette-backdrop',
          onClick: close,
        },
          h('div', {
            className: 'ph-palette',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': copy.switcher,
            // The shortcuts adapter names the foreground modal from this
            // attribute, so other commands yield to an open switcher.
            'data-shortcut-modal': PANEL_ID,
            ref: dialogRef,
            onClick: event => { if (typeof event?.stopPropagation === 'function') event.stopPropagation() },
          },
            h('input', {
              className: 'ph-palette__input',
              type: 'text',
              value: query,
              placeholder: copy.switcherPlaceholder,
              'aria-label': copy.switcher,
              'data-modal-autofocus': 'true',
              ref: inputRef,
              onChange: event => { setQuery(String(event?.target?.value ?? '')); setActive(0) },
              onKeyDown,
            }),

            loading ? h('p', { className: 'ph-palette__status' }, copy.switcherLoading) : null,

            failure === null ? null : h('p', { className: 'ph-palette__error', role: 'alert' },
              failure,
              h('button', {
                type: 'button',
                className: 'ph-button',
                onClick: () => { void refresh() },
              }, copy.switcherRetry)),

            matches.length === 0 && !loading
              ? h('div', { className: 'ph-palette__empty' },
                  h('p', null, copy.switcherEmpty),
                  h('p', { className: 'ph-palette__hint' }, copy.switcherEmptyHint))
              : h('ul', { className: 'ph-palette__list', role: 'listbox', 'aria-label': copy.switcher },
                  ...matches.map((row, index) => h('li', {
                    key: `${row.kind}:${row.id}`,
                    className: 'ph-palette__row',
                    role: 'option',
                    'aria-selected': index === active ? 'true' : 'false',
                    'data-active': index === active ? 'true' : 'false',
                    'data-kind': row.kind,
                  },
                    h('button', {
                      type: 'button',
                      className: 'ph-palette__open',
                      disabled: activating !== null,
                      title: row.tail,
                      onMouseEnter: () => setActive(index),
                      onClick: () => { void activate(row) },
                    },
                      h('span', { className: 'ph-palette__kind' },
                        row.kind === 'project' ? copy.switcherKindProject : copy.switcherKindSession),
                      h('span', { className: 'ph-palette__title' }, row.title),
                      row.running ? h('span', { className: 'ph-chip' }, copy.switcherRunning) : null,
                      row.tail === '' ? null : h('span', { className: 'ph-palette__tail' }, row.tail),
                      row.updatedAt === null
                        ? null
                        : h('span', { className: 'ph-palette__time' }, relativeTime(row.updatedAt, copy)))))),

            h('div', { className: 'ph-palette__foot' },
              h('span', null, copy.switcherFoot),
              h('button', { type: 'button', className: 'ph-button', onClick: close }, copy.switcherClose))))
      }

      return {
        inject: ['slots', 'locale', 'uiWorkspace', 'workspaces', 'sessions', 'remote'],
        apply(ctx) {
          diag('apply')

          // Acceptance handle: the overlay can be driven from DevTools even on a
          // deployment where no shortcut could be bound.
          if (typeof window !== 'undefined') {
            window.__projectHubSwitcher = {
              open: () => switcher.set(true),
              close: () => switcher.set(false),
              toggle: () => switcher.toggle(),
              isOpen: () => switcher.get(),
              status: () => ({
                status: switcher.status, keys: switcher.keys, reason: switcher.reason, mounted: switcher.mounted,
              }),
            }
          }

          ctx.effect(() => {
            const style = document.createElement('style')
            // Ownership must be declared by us, not inferred by the loader:
            // `claimStyles(id)` claims every `style:not([data-plugin])` for
            // whichever plugin materializes next, and `removeOwnedStyles(id)`
            // deletes by `data-plugin` on that plugin's HMR — so an untagged node
            // we injected late can be adopted by another plugin and then removed
            // by its reload (the 23:17 style loss). Tagging with our own entry id
            // is the documented preset-emitted shape (system.ts:66-81) and matches
            // ui-theme's `dataset.plugin` / `dataset.pluginCss` pair.
            style.dataset.plugin = PACKAGE_ID
            style.dataset.pluginCss = `${PACKAGE_ID}/${PANEL_ID}`
            style.dataset.projectHub = 'true'
            style.textContent = STYLE
            document.head.append(style)
            diag('style-attached', { owner: PACKAGE_ID })
            // Sentinel: only an explicit `isConnected === false` counts, so an
            // environment without that property cannot raise a false alarm.
            let disposed = false
            let reported = false
            const sentinel = setInterval(() => {
              if (disposed || reported || style.isConnected !== false) return
              reported = true
              diag('style-lost-while-entry-alive', {
                cause: 'the entry-owned <style> left the document without our cleanup running (loader replace/HMR path)',
              })
            }, STYLE_SENTINEL_MS)
            return () => {
              disposed = true
              clearInterval(sentinel)
              diag('style-disposed', reported ? { afterLoss: true } : undefined)
              style.remove()
            }
          }, 'project-hub: styles')

          ctx.effect(() => ctx.locale.register('projectHub', {
            zh: { panel: COPY.zh.panel },
            en: { panel: COPY.en.panel },
          }), 'project-hub: locale')

          const label = ctx.locale.bind('projectHub')

          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main', key: PANEL_ID, locale: 'projectHub',
          }, props => h(Page, { ...props, hub: ctx })))

          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist', id: PANEL_ID, order: 21,
            label: () => label('panel'), locale: 'projectHub',
          }, Icon))

          /**
           * M4: the quick switcher.
           *
           * The overlay goes into `shell.overlay`, the frame-wide floating layer
           * the platform's own dialogs use, so it is an addition to the shell and
           * not a second panel. Its trigger goes into the official shortcut
           * registry, which means the binding shows up in Settings → Shortcuts,
           * is user-editable, and is checked against the host's own table before
           * we claim any keys.
           */
          ctx.slots.inject('shell.overlay', () => {
            // `inject` defers this callback until the frame's declaration is live
            // and re-runs it if the owner remounts, so the seat is never claimed
            // against a shell that does not have one (slot-catalog: registering
            // into an undeclared slot throws).
            switcher.mounted = true
            const disposeSlot = ctx.slots.register({
              name: 'shell.overlay', id: PANEL_ID, locale: 'projectHub',
            }, props => h(Switcher, { ...props, hub: ctx }))

            const shortcuts = optionalFace(ctx, 'shortcuts')
            let disposeCommand = null
            if (shortcuts === null || typeof shortcuts.register !== 'function') {
              switcher.status = 'no-face'
              switcher.reason = 'this Client exposes no shortcuts face'
              diag('shortcut-unavailable', { reason: switcher.reason })
            } else {
              const binding = { code: 'KeyK', modifiers: ['primary'] }
              // The registry rejects defaults it cannot deliver: Web refuses
              // single-modifier combinations and Web-on-Linux admits only three
              // reserved ones (shortcuts/src/binding.ts isWebBindingAllowed), so
              // the browser default carries a second modifier and Web/Linux ships
              // unbound for the user to assign in Settings.
              const webBinding = { code: 'KeyK', modifiers: ['primary', 'alt'] }
              let defaults = {}
              let keys = null
              let taken = null
              try {
                const described = typeof shortcuts.describeBinding === 'function'
                  ? shortcuts.describeBinding(binding)
                  : null
                keys = Array.isArray(described?.keys) ? described.keys.join('') : null
                taken = described !== null && Array.isArray(described.conflicts) && described.conflicts.length > 0
                  ? described.conflicts
                  : null
                const issue = described === null ? null : described.issue ?? null
                if (taken === null && issue === null) {
                  defaults = {
                    'desktop:macos': binding,
                    'desktop:windows': binding,
                    'desktop:linux': binding,
                    'web:macos': webBinding,
                    'web:windows': webBinding,
                  }
                } else {
                  switcher.reason = taken === null
                    ? `the host rejects this default binding (${String(issue)})`
                    : `the host already binds ${String(keys ?? 'Ctrl+K')} to ${taken.join(', ')}`
                }
              } catch (error) {
                // An unreadable shortcut table must not cost the command: it is
                // registered unbound and stays assignable in Settings.
                switcher.reason = firstLine(messageOf(error))
                diag('shortcut-describe-failed', { message: switcher.reason })
              }
              const command = {
                id: `${PANEL_ID}.switcher`,
                label: () => tcopy().switcher,
                aliases: ['project hub', 'quick switcher', 'switch project', '切换项目'],
                defaults,
                regions: ['page', 'editable'],
                modals: [PANEL_ID],
                resolve: (context) => {
                  const modal = context?.modal
                  if (typeof modal === 'string' && modal !== PANEL_ID) return { status: 'blocked', reason: 'modal' }
                  return { status: 'handled', run: () => switcher.toggle() }
                },
              }
              try {
                disposeCommand = shortcuts.register(command)
                switcher.keys = Object.keys(defaults).length > 0 ? keys : null
                switcher.status = switcher.keys === null ? 'unbound' : 'bound'
                diag('shortcut-registered', {
                  bound: switcher.status === 'bound', keys: switcher.keys, taken, reason: switcher.reason,
                })
              } catch (error) {
                // `register` also rejects a default overlapping another plugin's
                // command, which `describeBinding` does not report. Losing the
                // keys must not lose the command: retry unbound, so it still
                // appears in Settings → Shortcuts for the user to assign.
                const rejection = firstLine(messageOf(error))
                diag('shortcut-register-rejected', { message: rejection })
                try {
                  disposeCommand = shortcuts.register({ ...command, defaults: {} })
                  switcher.keys = null
                  switcher.status = 'unbound'
                  switcher.reason = rejection
                  diag('shortcut-registered', { bound: false, keys: null, taken, reason: rejection })
                } catch (retryError) {
                  switcher.keys = null
                  switcher.status = 'failed'
                  switcher.reason = firstLine(messageOf(retryError))
                  diag('shortcut-register-failed', { message: switcher.reason })
                }
              }
            }

            switcher.notify()
            return () => {
              if (typeof disposeCommand === 'function') disposeCommand()
              switcher.mounted = false
              switcher.keys = null
              switcher.status = 'idle'
              switcher.reason = null
              switcher.notify()
              disposeSlot()
            }
          })

          diag('slots-injected')
        },
      }
    },
  })
})()
