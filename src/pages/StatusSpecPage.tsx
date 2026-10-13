import { Icon } from "../components/Icon";

export function StatusSpecPage() {
  return (
    <div className="h-full overflow-y-auto bg-surface-container-lowest">
      {/* Top Diagnostic Specification Header Banner */}
      <div className="px-space-xl py-space-lg bg-surface-container-low/80 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-space-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="dns" className="text-[18px]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
                    状态栏架构规范：每窗口独立 RPC 进程状态矩阵
                  </span>
                  <span className="px-2 py-0.5 rounded-DEFAULT bg-primary/15 text-primary font-code-sm text-[11px] tracking-wide">
                    SPEC-ID: AGENT-STATUS-2025.1
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  工作区核心规范 · 引擎状态芯片独立绑定单个宿主窗口子进程（IPC/RPC Socket），严禁与宿主执行沙箱混编，杜绝上下文交叉污染。
                </p>
              </div>
            </div>
            {/* Metric overview pills */}
            <div className="flex items-center gap-space-sm font-code-sm text-code-sm">
              <div className="flex items-center gap-space-xs px-2.5 py-1 rounded-DEFAULT bg-surface-container text-on-surface-variant">
                <span className="text-tertiary">
                  ●
                </span>
                <span>
                  IPC 通信协程: 
                  <span className="text-on-surface font-medium">
                    Stdio/UDS
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-space-xs px-2.5 py-1 rounded-DEFAULT bg-surface-container text-on-surface-variant">
                <Icon name="memory" className="text-[14px] text-secondary" />
                <span>
                  隔离级别: 
                  <span className="text-on-surface font-medium">
                    Per-Window PID
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-space-xs px-2.5 py-1 rounded-DEFAULT bg-surface-container-high text-on-surface">
                <Icon name="tune" className="text-[14px]" />
                <span className="font-label-sm text-label-sm">
                  规范视图: 4-States Grid
                </span>
              </div>
            </div>
          </div>
          {/* Quick architecture hint bar */}
          <div className="p-space-sm rounded-DEFAULT bg-surface-container-lowest/80 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
            <div className="flex items-center gap-space-md">
              <span className="px-1.5 py-0.5 rounded-DEFAULT bg-surface-container-high text-primary font-code-sm text-[10px] uppercase font-semibold">
                架构备忘
              </span>
              <span>
                1. 
                <strong>
                  引擎·RPC 芯片
                </strong>
                ：表示独立的 Agent 运行时子进程（如 
                <code className="font-code-sm text-primary">
                  pid: 48921
                </code>
                ），拥有独立的语义向量缓存与上下文推理树。
              </span>
              <span className="opacity-30">
                |
              </span>
              <span>
                2. 
                <strong>
                  沙箱芯片
                </strong>
                ：独立声明代码执行隔离层（容器/Direct Host），两者严格解耦保持独立槽位。
              </span>
            </div>
            <a href="#/engine" className="flex items-center gap-space-xs text-primary cursor-pointer hover:underline">
              <span>
                查看 IPC 通讯协议白皮书
              </span>
              <Icon name="arrow_outward" className="text-[14px]" />
            </a>
          </div>
        </div>
      </div>
      {/* Main Canvas: 4 Sequential Comparison Panels */}
      <div className="p-space-xl max-w-[1440px] mx-auto w-full flex flex-col gap-space-xl">
        {/* ==================== VARIANT 1: IDLE / READY ==================== */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl">
          {/* Variant Header */}
          <div className="px-space-md py-2 bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="w-5 h-5 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center font-code-sm text-[11px] font-bold">
                A
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                状态 1 · 空闲就绪 (Idle &amp; Ready)
              </span>
              <span className="px-2 py-0.2 rounded-DEFAULT bg-tertiary/10 text-tertiary font-code-sm text-[11px]">
                正常挂起 · 等待用户调度
              </span>
            </div>
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <span>
                子进程: 
                <span className="text-tertiary font-medium">
                  pid 48921
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                内存驻留: 
                <span className="text-on-surface">
                  114.2 MB
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                心跳: 
                <span className="text-tertiary">
                  Normal (0.8s)
                </span>
              </span>
            </div>
          </div>
          {/* Editor Code Canvas Mockup (Lines 142-150) */}
          <div className="bg-surface-container-lowest px-space-md py-space-sm font-code-sm text-code-sm text-on-surface-variant select-none">
            <div className="flex items-center gap-space-md leading-relaxed opacity-75">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                142
              </span>
              <span className="text-outline">
                import
              </span>
               
              <span className="text-secondary">
                &#123;
              </span>
               
              <span className="text-primary">
                AgentRuntimeSession
              </span>
              <span className="text-secondary">
                ,
              </span>
               
              <span className="text-primary">
                WindowProcessBridge
              </span>
               
              <span className="text-secondary">
                &#125;
              </span>
               
              <span className="text-outline">
                from
              </span>
               
              <span className="text-tertiary">
                '@pi/agent-core'
              </span>
              <span className="text-secondary">
                ;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-75">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                143
              </span>
              <span className="text-outline">
                import type
              </span>
               
              <span className="text-secondary">
                &#123;
              </span>
               
              <span className="text-primary">
                RPCConnectionSnapshot
              </span>
               
              <span className="text-secondary">
                &#125;
              </span>
               
              <span className="text-outline">
                from
              </span>
               
              <span className="text-tertiary">
                '@pi/types/ipc'
              </span>
              <span className="text-secondary">
                ;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-40">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                144
              </span>
              <span className="text-outline">
                // 确保当前窗口与专属独立编码助手子进程维持 Unix Domain Socket 双工长连接
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                145
              </span>
              <span className="text-secondary">
                export const
              </span>
               
              <span className="text-primary font-medium">
                activeWorkerSession
              </span>
               
              <span className="text-secondary">
                =
              </span>
               
              <span className="text-secondary">
                new
              </span>
               
              <span className="text-primary">
                AgentRuntimeSession
              </span>
              <span className="text-secondary">
                (&#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                146
              </span>
              <span className="text-secondary pl-6">
                isolatedSubprocessId:
              </span>
               
              <span className="text-tertiary-fixed-dim font-bold">
                48921
              </span>
              <span className="text-secondary">
                ,
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                147
              </span>
              <span className="text-secondary pl-6">
                heartbeatIntervalMs:
              </span>
               
              <span className="text-tertiary-fixed-dim">
                800
              </span>
              <span className="text-secondary">
                ,
              </span>
               
              <span className="text-outline">
                // 周期保持活动自检
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                148
              </span>
              <span className="text-secondary pl-6">
                executionSandbox:
              </span>
               
              <span className="text-error">
                false
              </span>
              <span className="text-secondary">
                ,
              </span>
               
              <span className="text-outline">
                // 宿主直通工作区模式
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-75">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                149
              </span>
              <span className="text-secondary">
                &#125;);
              </span>
            </div>
          </div>
          {/* STATUS BAR 1 (EXACT RENDERING) */}
          <div className="h-9 px-space-md bg-surface-container-low flex items-center justify-between select-none">
            {/* Left Group: Branch & Distinct Process Chips */}
            <div className="flex items-center gap-space-xs">
              {/* 1. Left Branch Switcher */}
              <button className="h-6 px-2 rounded-DEFAULT bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-1.5 text-on-surface font-code-sm text-[12px] group">
                <Icon name="fork_left" className="text-[14px] text-on-surface-variant group-hover:text-primary" />
                <span className="font-medium">
                  main*
                </span>
                <Icon name="expand_more" className="text-[12px] text-outline" />
              </button>
              {/* 2. Independent Engine RPC Chip (IDLE STATE) */}
              <div className="relative group">
                <div className="h-6 px-2.5 rounded-DEFAULT bg-surface-container-high flex items-center gap-2 cursor-pointer shadow-sm hover:bg-surface-bright transition-all">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-40">
                    </span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary">
                    </span>
                  </span>
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">
                    引擎 · RPC:
                  </span>
                  <span className="font-label-sm text-[11px] text-tertiary font-medium">
                    空闲 · 已连接
                  </span>
                  <span className="px-1 py-0.2 rounded-DEFAULT bg-surface-container-lowest text-[9px] font-code-sm text-outline uppercase tracking-wider">
                    idle
                  </span>
                </div>
                {/* Detailed Tooltip Inspection Badge */}
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-72 p-2.5 rounded-lg bg-surface-container-highest shadow-2xl z-dropdown pointer-events-none">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 bg-surface-container-high/40 px-1 rounded-DEFAULT">
                    <span className="font-label-xs text-tertiary font-semibold">
                      ● 每窗口独立进程 · 就绪
                    </span>
                    <span className="font-code-sm text-[10px] text-on-surface-variant">
                      PID: 48921
                    </span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                    当前 IDE 窗口绑定独立的专属 Agent RPC 子进程，无全局并发锁。已完成符号树挂载。
                  </p>
                  <div className="mt-2 pt-1.5 flex items-center justify-between font-code-sm text-[10px] text-outline">
                    <span>
                      协议: JSON-RPC v2.0
                    </span>
                    <span>
                      信道: /tmp/pi-48921.sock
                    </span>
                  </div>
                </div>
              </div>
              {/* 3. Independent Sandbox Chip (STRICTLY SEPARATE) */}
              <div className="relative group">
                <div className="h-6 px-2 rounded-DEFAULT bg-surface-container-low flex items-center gap-1.5 cursor-pointer hover:bg-surface-container transition-colors">
                  <Icon name="shield_with_heart" className="text-[13px] text-outline" />
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    沙盒 · 未启用
                  </span>
                </div>
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-60 p-2 rounded-lg bg-surface-container-highest shadow-xl z-dropdown pointer-events-none">
                  <span className="font-label-xs text-on-surface font-semibold mb-1">
                    宿主直通模式 (Host Direct)
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    脚本直接执行于当前开发机操作系统环境，未封装在轻量 Docker/nsjail 中。
                  </span>
                </div>
              </div>
            </div>
            {/* Right Group: Telemetry Metrics */}
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-1 hover:text-on-surface cursor-pointer">
                <Icon name="speed" className="text-[13px] text-tertiary" />
                <span>
                  延迟 18ms
                </span>
              </div>
              <div className="flex items-center gap-1 hover:text-on-surface cursor-pointer">
                <Icon name="data_usage" className="text-[13px] text-primary" />
                <span>
                  已消耗 4.2k tokens
                </span>
              </div>
              <span className="hover:text-on-surface cursor-pointer px-1">
                UTF-8
              </span>
              <span className="hover:text-on-surface cursor-pointer px-1">
                LF
              </span>
              <button className="w-6 h-6 rounded-DEFAULT flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
                <Icon name="notifications" className="text-[14px]" />
              </button>
            </div>
          </div>
        </div>
        {/* ==================== VARIANT 2: STREAMING / DIALOGUE ==================== */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl">
          {/* Variant Header */}
          <div className="px-space-md py-2 bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-code-sm text-[11px] font-bold">
                B
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                状态 2 · 流式对话中 (Active Streaming)
              </span>
              <span className="px-2 py-0.2 rounded-DEFAULT bg-primary/10 text-primary font-code-sm text-[11px]">
                高吞吐推理输出 · 上下文双向同步
              </span>
            </div>
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <span>
                子进程: 
                <span className="text-primary font-medium">
                  pid 48921
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                推理吞吐: 
                <span className="text-primary font-semibold">
                  112 tokens/sec
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                显存/算力调度: 
                <span className="text-secondary font-medium">
                  Remote Codex Cluster
                </span>
              </span>
            </div>
          </div>
          {/* Editor Code Canvas Mockup */}
          <div className="bg-surface-container-lowest px-space-md py-space-sm font-code-sm text-code-sm text-on-surface-variant select-none">
            <div className="flex items-center gap-space-md leading-relaxed opacity-75">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                142
              </span>
              <span className="text-secondary">
                async function*
              </span>
               
              <span className="text-primary font-medium">
                streamSubprocessTelemetry
              </span>
              <span className="text-secondary">
                () &#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                143
              </span>
              <span className="text-secondary pl-6">
                const
              </span>
               
              <span className="text-tertiary">
                incomingChunkStream
              </span>
               
              <span className="text-secondary">
                =
              </span>
               
              <span className="text-secondary">
                await
              </span>
               
              <span className="text-primary">
                rpcWorker
              </span>
              <span className="text-secondary">
                .
              </span>
              <span className="text-secondary-fixed">
                readChunkStream
              </span>
              <span className="text-secondary">
                ();
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed bg-primary/10 -mx-space-md px-space-md">
              <span className="w-8 text-right font-code-sm text-[11px] text-primary select-none font-bold">
                144
              </span>
              <span className="text-on-surface pl-6">
                // [AGENT EXECUTION TRACE] 正在实时解析 AST 补丁并分发 diff 建议...
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                145
              </span>
              <span className="text-secondary pl-6">
                for await (const
              </span>
               
              <span className="text-tertiary">
                delta
              </span>
               
              <span className="text-secondary">
                of
              </span>
               
              <span className="text-tertiary">
                incomingChunkStream
              </span>
              <span className="text-secondary">
                ) &#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                146
              </span>
              <span className="text-secondary pl-12">
                yield
              </span>
               
              <span className="text-primary">
                renderLiveToken
              </span>
              <span className="text-secondary">
                (
              </span>
              <span className="text-tertiary">
                delta
              </span>
              <span className="text-secondary">
                );
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-75">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                147
              </span>
              <span className="text-secondary pl-6">
                &#125;
              </span>
            </div>
          </div>
          {/* STATUS BAR 2 (ACTIVE STREAMING) */}
          <div className="h-9 px-space-md bg-surface-container-low flex items-center justify-between select-none">
            {/* Left Group */}
            <div className="flex items-center gap-space-xs">
              {/* 1. Left Branch Switcher */}
              <button className="h-6 px-2 rounded-DEFAULT bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-1.5 text-on-surface font-code-sm text-[12px] group">
                <Icon name="fork_left" className="text-[14px] text-on-surface-variant group-hover:text-primary" />
                <span className="font-medium">
                  feat/agent-rpc
                </span>
                <Icon name="expand_more" className="text-[12px] text-outline" />
              </button>
              {/* 2. Independent Engine RPC Chip (ACTIVE STREAMING) */}
              <div className="relative group">
                <div className="h-6 px-2.5 rounded-DEFAULT bg-primary/20 flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(127,133,249,0.25)] hover:bg-primary/25 transition-all">
                  <Icon name="radio_button_checked" className="text-[15px] text-primary animate-pulse" />
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">
                    引擎 · RPC:
                  </span>
                  <span className="font-label-sm text-[11px] text-primary font-medium">
                    对话中 (Streaming)
                  </span>
                  <span className="px-1.5 py-0.2 rounded-DEFAULT bg-primary/25 text-[9px] font-code-sm text-primary font-semibold tracking-tight">
                    4.2k tok/s
                  </span>
                </div>
                {/* Floating Active Info Tooltip */}
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-80 p-2.5 rounded-lg bg-surface-container-highest shadow-2xl z-dropdown pointer-events-none">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 bg-primary/10 px-1 rounded-DEFAULT">
                    <span className="font-label-xs text-primary font-semibold">
                      ◉ 每窗口独立进程 · 正在执行推理与上下文同步
                    </span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                    专属子进程正在接收 Transformer 模型增量流式 Token。当前活动槽位: Tab #1 (agent-runtime.ts)。
                  </p>
                  <div className="mt-2 pt-1.5 flex items-center justify-between font-code-sm text-[10px] text-outline">
                    <span>
                      上下文窗口: 28.4k / 128k
                    </span>
                    <span className="text-primary font-medium">
                      生成速率: 112 tok/s
                    </span>
                  </div>
                </div>
              </div>
              {/* 3. Independent Sandbox Chip */}
              <div className="relative group">
                <div className="h-6 px-2 rounded-DEFAULT bg-surface-container-low flex items-center gap-1.5 cursor-pointer hover:bg-surface-container transition-colors">
                  <Icon name="shield_with_heart" className="text-[13px] text-outline" />
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    沙盒 · 未启用
                  </span>
                </div>
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-60 p-2 rounded-lg bg-surface-container-highest shadow-xl z-dropdown pointer-events-none">
                  <span className="font-label-xs text-on-surface font-semibold mb-1">
                    宿主直通模式 (Host Direct)
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    独立于引擎 RPC 连接。当前操作具有本地文件写权限。
                  </span>
                </div>
              </div>
            </div>
            {/* Right Group: Telemetry Metrics */}
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-1 text-primary">
                <Icon name="sync" className="text-[13px] animate-spin" />
                <span>
                  延迟 32ms
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary font-medium">
                <Icon name="bolt" className="text-[13px]" />
                <span>
                  已消耗 8.9k tokens
                </span>
              </div>
              <span className="hover:text-on-surface cursor-pointer px-1">
                UTF-8
              </span>
              <span className="hover:text-on-surface cursor-pointer px-1">
                LF
              </span>
              <button className="w-6 h-6 rounded-DEFAULT flex items-center justify-center hover:bg-surface-container-high text-primary transition-colors">
                <Icon name="graphic_eq" className="text-[14px]" />
              </button>
            </div>
          </div>
        </div>
        {/* ==================== VARIANT 3: RECONNECTING ==================== */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl">
          {/* Variant Header */}
          <div className="px-space-md py-2 bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="w-5 h-5 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center font-code-sm text-[11px] font-bold">
                C
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                状态 3 · 子进程心跳重连 (Reconnecting)
              </span>
              <span className="px-2 py-0.2 rounded-DEFAULT bg-secondary/10 text-secondary font-code-sm text-[11px]">
                心跳丢帧 · 触发指数回退重试
              </span>
            </div>
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <span>
                子进程: 
                <span className="text-secondary font-medium">
                  pid 48921 (Unresponsive)
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                已重试: 
                <span className="text-secondary">
                  2 / 5 次
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                下一次重试: 
                <span className="text-on-surface">
                  1.4s 后
                </span>
              </span>
            </div>
          </div>
          {/* Editor Code Canvas Mockup */}
          <div className="bg-surface-container-lowest px-space-md py-space-sm font-code-sm text-code-sm text-on-surface-variant select-none">
            <div className="flex items-center gap-space-md leading-relaxed opacity-50">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                142
              </span>
              <span className="text-outline">
                const
              </span>
               
              <span className="text-on-surface">
                onHeartbeatMissed
              </span>
               
              <span className="text-secondary">
                =
              </span>
               
              <span className="text-secondary">
                () =&gt;
              </span>
               
              <span className="text-secondary">
                &#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-50">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                143
              </span>
              <span className="text-secondary pl-6">
                console.warn(
              </span>
              <span className="text-tertiary">
                '[IPC] Warning: window-level child subprocess heartbeat ack dropped'
              </span>
              <span className="text-secondary">
                );
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed bg-surface-container-high/30 -mx-space-md px-space-md">
              <span className="w-8 text-right font-code-sm text-[11px] text-secondary select-none font-bold">
                144
              </span>
              <span className="text-secondary pl-6">
                reconnectBackoffPolicy.triggerNextRetry(&#123; maxRetries: 5 &#125;);
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-50">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                145
              </span>
              <span className="text-secondary">
                &#125;;
              </span>
            </div>
          </div>
          {/* STATUS BAR 3 (RECONNECTING) */}
          <div className="h-9 px-space-md bg-surface-container-low flex items-center justify-between select-none">
            {/* Left Group */}
            <div className="flex items-center gap-space-xs">
              {/* 1. Left Branch Switcher */}
              <button className="h-6 px-2 rounded-DEFAULT bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-1.5 text-on-surface font-code-sm text-[12px] group">
                <Icon name="fork_left" className="text-[14px] text-on-surface-variant group-hover:text-primary" />
                <span className="font-medium">
                  main*
                </span>
                <Icon name="expand_more" className="text-[12px] text-outline" />
              </button>
              {/* 2. Independent Engine RPC Chip (RECONNECTING) */}
              <div className="relative group">
                <div className="h-6 px-2.5 rounded-DEFAULT bg-surface-container-high flex items-center gap-2 cursor-pointer shadow-sm hover:bg-surface-bright transition-all">
                  <Icon name="sync" className="text-[14px] text-secondary animate-spin" />
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">
                    引擎 · RPC:
                  </span>
                  <span className="font-label-sm text-[11px] text-secondary font-medium">
                    重连中 (尝试 2/5)
                  </span>
                  <span className="px-1 py-0.2 rounded-DEFAULT bg-surface-container-lowest text-[9px] font-code-sm text-secondary tracking-wider">
                    backoff
                  </span>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-80 p-2.5 rounded-lg bg-surface-container-highest shadow-2xl z-dropdown pointer-events-none">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 bg-surface-container-high/40 px-1 rounded-DEFAULT">
                    <span className="font-label-xs text-secondary font-semibold">
                      ↻ 每窗口独立进程 · 子进程心跳超时，自动拉起中...
                    </span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                    子进程 PID 48921 超过 2400ms 未响应 Ping 信号。正在执行平滑软重连，已暂缓未提交的代码变更审查请求。
                  </p>
                  <div className="mt-2 pt-1.5 flex items-center justify-between font-code-sm text-[10px] text-outline">
                    <span>
                      策略: Exponential Backoff
                    </span>
                    <span>
                      信道检测: PENDING
                    </span>
                  </div>
                </div>
              </div>
              {/* 3. Independent Sandbox Chip */}
              <div className="relative group">
                <div className="h-6 px-2 rounded-DEFAULT bg-surface-container-low flex items-center gap-1.5 cursor-pointer hover:bg-surface-container transition-colors">
                  <Icon name="shield_with_heart" className="text-[13px] text-outline" />
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    沙盒 · 未启用
                  </span>
                </div>
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-60 p-2 rounded-lg bg-surface-container-highest shadow-xl z-dropdown pointer-events-none">
                  <span className="font-label-xs text-on-surface font-semibold mb-1">
                    宿主直通模式 (Host Direct)
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    宿主沙箱与引擎 RPC 完全解耦，沙箱处于安全直通就绪态。
                  </span>
                </div>
              </div>
            </div>
            {/* Right Group: Telemetry Metrics */}
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-1 text-secondary">
                <Icon name="hourglass_empty" className="text-[13px]" />
                <span>
                  延迟 -- ms
                </span>
              </div>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <Icon name="data_usage" className="text-[13px]" />
                <span>
                  已消耗 4.2k tokens
                </span>
              </div>
              <span className="hover:text-on-surface cursor-pointer px-1">
                UTF-8
              </span>
              <span className="hover:text-on-surface cursor-pointer px-1">
                LF
              </span>
              <button className="w-6 h-6 rounded-DEFAULT flex items-center justify-center hover:bg-surface-container-high text-secondary transition-colors">
                <Icon name="sync_problem" className="text-[14px]" />
              </button>
            </div>
          </div>
        </div>
        {/* ==================== VARIANT 4: DISCONNECTED / CRASH ==================== */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl">
          {/* Variant Header */}
          <div className="px-space-md py-2 bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="w-5 h-5 rounded-full bg-error-container/40 text-error flex items-center justify-center font-code-sm text-[11px] font-bold">
                D
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                状态 4 · 异常崩溃 / 已断开 (Disconnected &amp; Crash Recovery)
              </span>
              <span className="px-2 py-0.2 rounded-DEFAULT bg-error/15 text-error font-code-sm text-[11px]">
                SIGKILL / OOM 退出 · 提供一键自愈
              </span>
            </div>
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <span>
                子进程状态: 
                <span className="text-error font-medium">
                  TERMINATED (Exit 137)
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                崩溃时段: 
                <span className="text-on-surface">
                  14:02:18
                </span>
              </span>
              <span className="opacity-30">
                /
              </span>
              <span>
                恢复动作: 
                <span className="text-primary font-medium">
                  Spawn Clean Subprocess
                </span>
              </span>
            </div>
          </div>
          {/* Editor Code Canvas Mockup */}
          <div className="bg-surface-container-lowest px-space-md py-space-sm font-code-sm text-code-sm text-on-surface-variant select-none">
            <div className="flex items-center gap-space-md leading-relaxed opacity-50">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                142
              </span>
              <span className="text-outline">
                function
              </span>
               
              <span className="text-on-surface">
                handleSubprocessFatal
              </span>
              <span className="text-secondary">
                (
              </span>
              <span className="text-error">
                exitCode: 137
              </span>
              <span className="text-secondary">
                ) &#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed bg-error/10 -mx-space-md px-space-md">
              <span className="w-8 text-right font-code-sm text-[11px] text-error select-none font-bold">
                143
              </span>
              <span className="text-error pl-6">
                // FATAL: RPC Worker exceeded max memory limit (137 = SIGKILL / OOM-Killer)
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                144
              </span>
              <span className="text-secondary pl-6">
                statusBarBridge.publish(&#123; status: 'TERMINATED', code: 137, allowRestart: true &#125;);
              </span>
            </div>
            <div className="flex items-center gap-space-md leading-relaxed opacity-50">
              <span className="w-8 text-right font-code-sm text-[11px] text-outline-variant select-none">
                145
              </span>
              <span className="text-secondary">
                &#125;
              </span>
            </div>
          </div>
          {/* STATUS BAR 4 (DISCONNECTED & RECOVER BUTTON) */}
          <div className="h-9 px-space-md bg-surface-container-low flex items-center justify-between select-none">
            {/* Left Group */}
            <div className="flex items-center gap-space-xs">
              {/* 1. Left Branch Switcher */}
              <button className="h-6 px-2 rounded-DEFAULT bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-1.5 text-on-surface font-code-sm text-[12px] group">
                <Icon name="fork_left" className="text-[14px] text-on-surface-variant group-hover:text-primary" />
                <span className="font-medium">
                  main*
                </span>
                <Icon name="expand_more" className="text-[12px] text-outline" />
              </button>
              {/* 2. Independent Engine RPC Chip (DISCONNECTED) */}
              <div className="relative group">
                <div className="h-6 px-2.5 rounded-DEFAULT bg-surface-container-high flex items-center gap-2 cursor-pointer shadow-sm hover:bg-surface-bright transition-all">
                  <Icon name="cancel" className="text-[13px] text-error" />
                  <span className="font-label-sm text-[11px] font-semibold text-on-surface">
                    引擎 · RPC:
                  </span>
                  <span className="font-label-sm text-[11px] text-error font-medium">
                    已断开 (退出码 137)
                  </span>
                  {/* Quick Reconnect Inline Action Pill */}
                  <button className="ml-1 px-1.5 py-0.5 rounded-DEFAULT bg-surface-bright hover:bg-primary hover:text-on-primary text-on-surface font-label-xs text-[10px] flex items-center gap-1 transition-colors">
                    <Icon name="refresh" className="text-[11px]" />
                    <span>
                      重新连接 (R)
                    </span>
                  </button>
                </div>
                {/* Crash Reason Tooltip */}
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-80 p-2.5 rounded-lg bg-surface-container-highest shadow-2xl z-dropdown pointer-events-none">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 bg-error/10 px-1 rounded-DEFAULT">
                    <span className="font-label-xs text-error font-semibold">
                      ✕ 每窗口独立进程 · 内存溢出或被手动终止
                    </span>
                    <span className="font-code-sm text-[10px] text-error">
                      SIGKILL
                    </span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                    当前窗口绑定的独立子进程因内存超出上限被宿主系统守护进程终止。代码未丢失，点击「重新连接」将以纯净上下文重新拉起子进程。
                  </p>
                  <div className="mt-2 pt-1.5 flex items-center justify-between font-code-sm text-[10px] text-outline">
                    <span>
                      退出码: 137 (OOM)
                    </span>
                    <span className="text-primary cursor-pointer">
                      快捷键: Cmd+Shift+R
                    </span>
                  </div>
                </div>
              </div>
              {/* 3. Independent Sandbox Chip */}
              <div className="relative group">
                <div className="h-6 px-2 rounded-DEFAULT bg-surface-container-low flex items-center gap-1.5 cursor-pointer hover:bg-surface-container transition-colors">
                  <Icon name="shield_with_heart" className="text-[13px] text-outline" />
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    沙盒 · 未启用
                  </span>
                </div>
                <div className="absolute bottom-8 left-0 hidden group-hover:flex flex-col w-60 p-2 rounded-lg bg-surface-container-highest shadow-xl z-dropdown pointer-events-none">
                  <span className="font-label-xs text-on-surface font-semibold mb-1">
                    宿主直通模式 (Host Direct)
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    引擎进程崩溃不影响宿主沙箱安全等级。
                  </span>
                </div>
              </div>
            </div>
            {/* Right Group: Telemetry Metrics */}
            <div className="flex items-center gap-space-md font-code-sm text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-1 text-error">
                <Icon name="signal_disconnected" className="text-[13px]" />
                <span>
                  延迟 N/A
                </span>
              </div>
              <div className="flex items-center gap-1 text-outline">
                <Icon name="data_usage" className="text-[13px]" />
                <span>
                  已消耗 4.2k tokens
                </span>
              </div>
              <span className="hover:text-on-surface cursor-pointer px-1">
                UTF-8
              </span>
              <span className="hover:text-on-surface cursor-pointer px-1">
                LF
              </span>
              <button className="w-6 h-6 rounded-DEFAULT flex items-center justify-center hover:bg-surface-container-high text-error transition-colors">
                <Icon name="error" className="text-[14px]" />
              </button>
            </div>
          </div>
        </div>
        {/* ==================== ENGINEERING ARCHITECTURE SPECIFICATION CARD ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-md">
          {/* Spec Rule 1 */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs shadow-md">
            <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md">
              <Icon name="call_split" className="text-[16px]" />
              <span className="font-semibold">
                窗口级独占子进程 (Per-Window PID)
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              每个打开的工作区窗口启动一个隔离的 Node/V8 子进程。多窗口并发编辑时，崩溃与长上下文排队严格局部化，不会造成全 IDE 假死。
            </p>
          </div>
          {/* Spec Rule 2 */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs shadow-md">
            <div className="flex items-center gap-space-xs text-tertiary font-label-md text-label-md">
              <Icon name="rule" className="text-[16px]" />
              <span className="font-semibold">
                芯片物理隔离原则 (Strict Decoupling)
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              「引擎·RPC」与「沙箱·状态」在视觉层使用独立 Chip 容器并存，杜绝将模型服务端状态与代码直通宿主执行状态合流展示，降低认知负载。
            </p>
          </div>
          {/* Spec Rule 3 */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs shadow-md">
            <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md">
              <Icon name="cable" className="text-[16px]" />
              <span className="font-semibold">
                毫秒级遥测与自愈 (Telemetry &amp; Recovery)
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              状态栏右侧动态投射当前 RPC 链路的实际往返延时（RTT）及 Token 消费计数器。断开状态就地挂载一键重启触发器，缩减恢复步长至 1 击。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
