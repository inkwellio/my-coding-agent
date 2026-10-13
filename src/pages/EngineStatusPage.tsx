import { Icon } from "../components/Icon";

export function EngineStatusPage() {
  return (
    <div className="relative w-full h-full min-h-0 flex flex-col justify-between overflow-hidden">
      {/* Background workspace with an active code diff and inference session. */}
      <div className="absolute inset-0 z-0 flex flex-col select-none transition-opacity duration-300">
        {/* Editor Breadcrumb & Tabs */}
        <div className="h-9 bg-surface-container-low flex items-center justify-between px-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-1 rounded-t text-on-surface">
              <Icon name="code" className="text-[15px] text-primary" />
              <span className="font-code-sm text-code-sm">
                sse-pipeline.ts
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container ml-space-xs">
              </span>
            </div>
            <div className="flex items-center gap-space-xs px-space-md py-1 text-outline hover:text-on-surface">
              <Icon name="terminal" className="text-[15px]" />
              <span className="font-code-sm text-code-sm">
                agent-runner.test.ts
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm text-outline">
            <span className="font-code-sm text-code-sm">
              src/runtime/stream/sse-pipeline.ts
            </span>
          </div>
        </div>
        {/* Simulated Editor Split Lines with Diff */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden bg-surface-container-lowest font-code-sm text-code-sm p-space-md gap-space-lg">
          {/* Editor Left (8 Cols): Code & Streaming Diff */}
          <div className="col-span-8 flex flex-col gap-1 text-on-surface-variant">
            <div className="flex items-center gap-space-md text-outline">
              <span className="w-8 text-right select-none">
                104
              </span>
              <span className="text-tertiary font-medium">
                // Agent: 优化流式推测解析缓冲池分配
              </span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <span className="w-8 text-right select-none text-outline">
                105
              </span>
              <span className="">
                <span className="text-primary font-medium">
                  export async function*
                </span>
                 
                <span className="text-secondary">
                  streamEngineInference
                </span>
                (req: StreamContext): AsyncGenerator&lt;TokenFrame&gt; &#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md bg-error-container/20 text-error px-1 rounded">
              <span className="w-8 text-right select-none text-error/60">
                106
              </span>
              <span className="">
                - const rawChunkBuffer = Buffer.allocUnsafe(chunkSize);
              </span>
            </div>
            <div className="flex items-center gap-space-md bg-tertiary-container/20 text-tertiary px-1 rounded">
              <span className="w-8 text-right select-none text-tertiary/60">
                106
              </span>
              <span className="">
                + const tokenSlab = MemoryPool.leaseRingBuffer(req.tokenRingId);
              </span>
            </div>
            <div className="flex items-center gap-space-md bg-tertiary-container/20 text-tertiary px-1 rounded">
              <span className="w-8 text-right select-none text-tertiary/60">
                107
              </span>
              <span className="">
                + const zeroCopySlice = tokenSlab.asTypedArray(Uint32Array);
              </span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <span className="w-8 text-right select-none text-outline">
                108
              </span>
              <span className="">
                  while (!req.signal.aborted) &#123;
              </span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <span className="w-8 text-right select-none text-outline">
                109
              </span>
              <span className="">
                    const nextBatch = await req.driver.readTokens(zeroCopySlice);
              </span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <span className="w-8 text-right select-none text-outline">
                110
              </span>
              <span className="">
                    yield* parseBatchTokens(nextBatch);
              </span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <span className="w-8 text-right select-none text-outline">
                111
              </span>
              <span className="">
                  &#125;
              </span>
            </div>
          </div>
          {/* Assistant Conversation Strip (4 Cols) */}
          <div className="col-span-4 bg-surface-container rounded-lg p-space-md flex flex-col gap-space-sm shadow-md">
            <div className="flex items-center justify-between pb-space-xs">
              <span className="font-label-sm text-label-sm text-primary font-medium">
                AUTONOMOUS RUNNER
              </span>
              <span className="font-code-sm text-code-sm text-tertiary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse">
                </span>
                活跃编排中
              </span>
            </div>
            <div className="bg-surface-container-high p-space-sm rounded text-body-sm font-body-sm text-on-surface">
              已定位到事件流循环中 2 处潜在分配瓶颈。现已应用零内存拷贝环形缓冲区（RingBuffer），正在编译并运行针对性回归测试集...
            </div>
            <div className="bg-surface-container-lowest p-space-xs rounded font-code-sm text-code-sm text-on-surface-variant flex items-center gap-space-xs">
              <Icon name="check_circle" className="text-[14px] text-tertiary" />
              <span className="">
                tests/unit/sse-pipeline.test.ts [14 passed]
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* SEMI-TRANSPARENT AMBIENT FOCUS SHIELD */}
      {/* HERO POPOVER: Anchored upwards directly from the Engine Heartbeat Chip */}
      {/* DENSE HIGH-PRECISION CODEX STATUS BAR (Target: 30px Fixed Height Bar) */}
      <div className="absolute bottom-2 left-64 z-30 flex flex-col w-[380px] bg-surface-container-high/95 backdrop-blur-md border border-tertiary/40 rounded-lg shadow-2xl p-space-md pointer-events-auto">
        <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/30 mb-2">
          <div className="flex items-center gap-1.5">
            <Icon name="shield_with_heart" className="text-tertiary text-[18px]" />
            <span className="font-headline-sm text-[13px] font-semibold text-on-surface">
              沙盒隔离策略
            </span>
          </div>
          <span className="font-label-xs text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/30">
            已生效
          </span>
        </div>
        <p className="font-body-sm text-[12px] text-on-surface leading-relaxed">
          主要防范工作区外的文件操作，并限制随意联网；仍可修改当前项目。当前仅隔离终端命令。帮助降低命令风险，非绝对安全。
        </p>
        <div className="mt-2 pt-2 border-t border-outline-variant/20 flex items-center justify-between font-label-xs text-outline">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary">
            </span>
            <span className="">
              终端命令：独立沙箱
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary">
            </span>
            <span className="">
              外网请求：白名单拦截
            </span>
          </div>
        </div>
        <div className="absolute -bottom-2 left-8 w-3 h-3 bg-surface-container-high border-r border-b border-tertiary/40 rotate-45">
        </div>
      </div>
      <div className="absolute bottom-2 right-4 z-30 flex flex-col gap-1.5 bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 p-2.5 rounded-lg shadow-lg w-72">
        <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
          <span className="font-label-xs text-outline uppercase tracking-wider">
            生命周期状态示例
          </span>
          <span className="font-label-xs text-outline">
            无干扰常驻
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded bg-surface-container border border-primary/30">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-t-transparent animate-spin border-primary flex-shrink-0">
            </span>
            <span className="font-label-xs text-primary font-medium">
              正在启用…
            </span>
          </div>
          <span className="text-[10px] text-outline">
            过渡中
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-2 py-1 rounded bg-surface-container border border-outline-variant/30">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outline/50 flex-shrink-0">
            </span>
            <span className="font-label-xs text-outline font-medium">
              未启用
            </span>
          </div>
          <span className="text-[10px] text-outline/80 leading-tight">
            取消 UAC 仍为灰色未启用，无弹窗打扰
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded bg-surface-container border border-secondary-container/40">
          <div className="flex items-center gap-1.5">
            <Icon name="refresh" className="text-[13px] text-secondary" />
            <span className="font-label-xs text-secondary font-medium">
              可重试
            </span>
          </div>
          <span className="text-[10px] text-outline">
            非阻塞行内状态
          </span>
        </div>
      </div>
    </div>
  );
}
