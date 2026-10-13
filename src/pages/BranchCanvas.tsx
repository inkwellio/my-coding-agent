import { Icon } from "../components/Icon";

export function BranchCanvas() {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden text-on-surface">
<div className="absolute -top-12 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none">
</div>
<div className="absolute bottom-10 left-12 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none">
</div>
<div className="grid h-full min-h-0 grid-cols-12 gap-0 w-full">
  <section className="col-span-7 flex h-full min-h-0 flex-col overflow-hidden bg-surface border-r border-surface-container-high/40 min-w-0">
    <div className="h-10 px-space-md bg-surface-container-lowest flex items-center justify-between border-b border-surface-container-high/30">
      <div className="flex items-center gap-space-sm min-w-0">
        <Icon name="terminal" className="text-secondary text-[16px]" />
        <span className="font-code-sm text-code-sm text-on-surface font-medium truncate">
          packages/core/src/parser/sse-stream.ts
        </span>
        <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-code-sm text-[10px] tracking-wider font-semibold">
          MODIFIED (+42, -18)
        </span>
      </div>
      <div className="flex items-center gap-space-xs">
        <span className="h-2 w-2 rounded-full bg-amber-400/80 animate-pulse" title="未暂存更改">
        </span>
        <span className="font-code-sm text-code-sm text-outline">
          UTF-8
        </span>
        <button className="h-6 px-2 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors" type="button">
          对比视图
        </button>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto font-code-sm text-code-sm bg-surface-container-lowest/60 p-space-md flex flex-col gap-3">
      <div className="rounded-xl bg-surface-container-low p-space-md shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2">
            <Icon name="neurology" className="text-primary text-[18px]" />
            <span className="font-headline-sm text-body-md font-medium text-on-surface">
              优化建议: 零内存拷贝解析流
            </span>
          </div>
          <span className="font-code-sm text-[11px] text-tertiary">
            验证已通过 · AST Validated
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant pt-2 leading-relaxed">
          将原本逐字节分块解析的
          <code className="text-secondary bg-surface-container px-1 py-0.5 rounded">
            StringDecoder
          </code>
          逻辑迁移至基于游标的缓冲区切片，消除长连接高并发下的堆分配热点。
        </p>
      </div>
      <div className="rounded-xl bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="px-3 py-1.5 bg-surface-container-low/70 flex items-center justify-between text-outline font-label-xs">
          <span>
            PATCH BLOCK #1 · TRANSFORM_SSE_CHUNK
          </span>
          <span className="font-code-sm">
            28 lines context
          </span>
        </div>
        <div className="py-2 flex flex-col font-code-sm text-code-sm">
          <div className="flex items-center px-3 py-0.5 hover:bg-surface-container-high/30 text-outline">
            <span className="w-8 text-right select-none pr-3 opacity-40">
              104
            </span>
            <span className="w-3 select-none text-center">
            </span>
            <span className="text-on-surface-variant">
              {"export class SSEStreamParser extends TransformStream {"}
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 hover:bg-surface-container-high/30 text-outline">
            <span className="w-8 text-right select-none pr-3 opacity-40">
              105
            </span>
            <span className="w-3 select-none text-center">
            </span>
            <span className="text-on-surface-variant pl-4">
              private buffer: Uint8Array = new Uint8Array(0);
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 bg-error-container/20 text-error">
            <span className="w-8 text-right select-none pr-3 text-error/60">
              106
            </span>
            <span className="w-3 select-none text-center">
              -
            </span>
            <span className="pl-4">
              {"private decoder = new TextDecoder('utf-8', { fatal: false });"}
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 bg-error-container/20 text-error">
            <span className="w-8 text-right select-none pr-3 text-error/60">
              107
            </span>
            <span className="w-3 select-none text-center">
              -
            </span>
            <span className="pl-4">
              {"const raw = this.decoder.decode(chunk, { stream: true });"}
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 bg-tertiary-container/20 text-tertiary">
            <span className="w-8 text-right select-none pr-3 text-tertiary/60">
              106
            </span>
            <span className="w-3 select-none text-center">
              +
            </span>
            <span className="pl-4">
              private viewCursor: CursorBuffer = new CursorBuffer(INITIAL_CAPACITY);
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 bg-tertiary-container/20 text-tertiary">
            <span className="w-8 text-right select-none pr-3 text-tertiary/60">
              107
            </span>
            <span className="w-3 select-none text-center">
              +
            </span>
            <span className="pl-4">
              const parsedEvents = this.viewCursor.fastScanSSE(chunk, this.onPayload);
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 hover:bg-surface-container-high/30 text-outline">
            <span className="w-8 text-right select-none pr-3 opacity-40">
              108
            </span>
            <span className="w-3 select-none text-center">
            </span>
            <span className="text-on-surface-variant pl-4">
              {"for (const event of parsedEvents) {"}
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 hover:bg-surface-container-high/30 text-outline">
            <span className="w-8 text-right select-none pr-3 opacity-40">
              109
            </span>
            <span className="w-3 select-none text-center">
            </span>
            <span className="text-on-surface-variant pl-8">
              controller.enqueue(event);
            </span>
          </div>
          <div className="flex items-center px-3 py-0.5 hover:bg-surface-container-high/30 text-outline">
            <span className="w-8 text-right select-none pr-3 opacity-40">
              110
            </span>
            <span className="w-3 select-none text-center">
            </span>
            <span className="text-on-surface-variant pl-4">
              {"}"}
            </span>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-surface-container-lowest p-space-md mt-auto shadow-sm">
        <div className="flex items-center justify-between pb-2 text-outline font-label-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary">
            </span>
            单元测试运行器 · Vitest 1.4
          </span>
          <span className="font-code-sm">
            2 passed · 0 failed (18ms)
          </span>
        </div>
        <div className="bg-surface-container-low/50 rounded-lg p-2 font-code-sm text-xs text-on-surface-variant flex flex-col gap-1">
          <span className="text-tertiary">
            {"✓ test/sse-stream.spec.ts > SSE parser zero-alloc > supports chunked events"}
          </span>
          <span className="text-tertiary">
            {"✓ test/sse-stream.spec.ts > SSE parser zero-alloc > graceful backpressure handle"}
          </span>
        </div>
      </div>
    </div>
  </section>
  <section className="col-span-5 flex h-full min-h-0 flex-col overflow-hidden bg-surface-container-low/40 min-w-0">
    <div className="h-10 px-space-md bg-surface-container-lowest flex items-center justify-between border-b border-surface-container-high/30">
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
          <Icon name="smart_toy" className="text-[14px]" />
          Agent 会话
        </span>
        <span className="px-2 py-1 rounded hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm cursor-pointer">
          上下文 (4 文件)
        </span>
        <span className="px-2 py-1 rounded hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm cursor-pointer">
          变更检查
        </span>
      </div>
      <button className="h-6 w-6 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface">
        <Icon name="more_vert" className="text-[16px]" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-md">
      <div className="self-end max-w-[85%] rounded-xl bg-surface-container-high p-space-md shadow-sm">
        <p className="font-body-sm text-body-sm text-on-surface">
          把 SSE 解析器的内存分配再优化一下，目前的压力测试显示在 50k QPS 下 GC 耗时略高。
        </p>
        <span className="text-outline font-label-xs block text-right mt-1">
          10:42 AM
        </span>
      </div>
      <div className="self-start w-full rounded-xl bg-surface-container p-space-md shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping">
            </span>
            <span className="font-headline-sm text-label-md font-semibold text-primary">
              引擎 · Autonomous Plan
            </span>
          </div>
          <span className="font-code-sm text-[11px] text-outline">
            Claude 3.7 Sonnet
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
          我已经重构了
          <code className="text-secondary bg-surface-container-high px-1 rounded">
            sse-stream.ts
          </code>
          中的解析器核心逻辑，使用双指针游标缓冲（CursorBuffer）替换原有的 UTF-8 字符串拼接。
        </p>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="check_circle" className="text-tertiary text-[16px]" />
            <span>
              消除中间 Buffer.concat 调用
            </span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="check_circle" className="text-tertiary text-[16px]" />
            <span>
              新增循环双端队列以应对超长事件分包
            </span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <Icon name="radio_button_checked" className="text-primary text-[16px]" />
            <span className="text-on-surface font-medium">
              已生成补丁，等待合并检阅
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button className="h-7 px-space-md rounded bg-primary text-on-primary hover:bg-primary-container font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow transition-colors">
            <Icon name="done_all" className="text-[15px]" />
            接受全部建议
          </button>
          <button className="h-7 px-space-md rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm transition-colors">
            对比还原
          </button>
        </div>
      </div>
    </div>
    <div className="p-space-md bg-surface-container-lowest border-t border-surface-container-high/30">
      <div className="rounded-xl bg-surface-container-low p-2 shadow-inner focus-within:ring-1 focus-within:ring-primary/60 transition-all">
        <textarea className="w-full bg-transparent resize-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline/70 min-h-[58px]" placeholder="发送指令，或使用 '/' 呼出高级工作流..." readOnly />
        <div className="flex items-center justify-between pt-1 text-outline font-label-xs">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:text-on-surface rounded transition-colors" title="添加引用文件">
              <Icon name="attach_file" className="text-[15px]" />
            </button>
            <button className="p-1 hover:text-on-surface rounded transition-colors" title="运行终端">
              <Icon name="terminal" className="text-[15px]" />
            </button>
            <span className="text-outline/60 font-code-sm">
              @agent-runtime
            </span>
          </div>
          <button className="h-6 px-2.5 rounded bg-primary-container text-on-primary-container font-label-xs font-semibold flex items-center gap-1">
            发送 ↵
          </button>
        </div>
      </div>
    </div>
  </section>
</div>
    </div>
  );
}
