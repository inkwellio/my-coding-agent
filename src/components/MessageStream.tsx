import { reasoningChips, reasoningSteps, userPrompt } from "../data/workspace";
import { Icon } from "./Icon";
import { ParserCode } from "./ParserCode";

export function MessageStream() {
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-lg p-space-lg lg:p-space-xl">
            <article className="w-full">
                <div className="select-text rounded-2xl border border-composer-border/80 bg-composer-surface px-space-lg py-space-md font-body-md text-body-md leading-relaxed text-composer-text shadow-sm">
                    {userPrompt}
                </div>
            </article>

            <article className="flex min-w-0 flex-col gap-space-md">
                    <span className="font-code-sm text-code-sm text-outline">耗时 1.8s · 已写入 3 文件</span>

                    <details className="group rounded-xl bg-surface-container-low shadow-sm" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-space-md py-space-sm transition-colors hover:bg-surface-container">
                            <div className="flex items-center gap-space-sm">
                                <Icon
                                    name="chevron_right"
                                    className="text-[16px] text-primary transition-transform group-open:rotate-90"
                                />
                                <span className="font-label-sm text-label-sm font-medium text-on-surface">
                                    思考过程 (展开查看 4 个思考步骤 - 耗时 1.8s)
                                </span>
                            </div>
                            <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-on-surface-variant">
                                Tokens: 1,420
                            </span>
                        </summary>
                        <div className="flex flex-col gap-space-sm px-space-md pb-space-md pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                            <div className="flex flex-wrap gap-space-xs">
                                {reasoningChips.map((chip) => (
                                    <span
                                        key={chip.text}
                                        className={`inline-flex items-center gap-1 rounded bg-surface-container px-2 py-1 font-code-sm text-code-sm ${chip.tone}`}
                                    >
                                        <Icon name={chip.icon} className="text-[13px]" />
                                        {chip.text}
                                    </span>
                                ))}
                            </div>
                            <p className="select-text pl-2 font-code-sm text-code-sm text-on-surface/90">
                                {reasoningSteps.map((step) => (
                                    <span key={step}>
                                        {step}
                                        <br />
                                    </span>
                                ))}
                            </p>
                        </div>
                    </details>

                    <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md shadow-sm">
                        <div className="flex items-center justify-between pb-space-xs">
                            <div className="flex items-center gap-space-sm">
                                <Icon name="check_circle" className="text-[16px] text-tertiary" />
                                <span className="font-label-sm text-label-sm font-medium text-on-surface">
                                    已执行工具: Bash 运行与读取文件
                                </span>
                            </div>
                            <span className="rounded bg-tertiary/10 px-1.5 py-0.5 font-code-sm text-code-sm text-tertiary">
                                exit 0
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 rounded bg-surface-container-lowest p-space-sm font-code-sm text-code-sm text-on-surface-variant">
                            <div className="flex items-center gap-space-sm text-secondary">
                                <span>$</span>
                                <span className="text-on-surface">cat src/stream/parser.ts | grep -n &quot;buffer&quot;</span>
                                <span className="ml-auto text-[11px] text-outline">exited 0 in 12ms</span>
                            </div>
                            <div className="flex items-center gap-space-sm text-secondary">
                                <span>$</span>
                                <span className="text-on-surface">touch tests/stream_parser.test.ts</span>
                                <span className="ml-auto text-[11px] text-outline">file created</span>
                            </div>
                        </div>
                    </div>

                    <div className="select-text font-body-md text-body-md leading-relaxed text-on-surface">
                        已重构{" "}
                        <code className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-code-sm text-primary">
                            StreamParser
                        </code>{" "}
                        类，采用双缓冲环形队列处理 TCP 粘包，并添加了指数退避自动重连机制。以下是核心变更解释及执行结果：
                    </div>

                    <ParserCode />

                    <div className="flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm shadow-sm">
                        <span className="inline-flex items-center gap-1.5 rounded bg-secondary/10 px-space-sm py-1 font-label-sm text-label-sm font-medium text-secondary">
                            <Icon name="difference" className="text-[15px]" />
                            3 个文件变更
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded bg-tertiary/10 px-space-sm py-1 font-label-sm text-label-sm font-medium text-tertiary">
                            <Icon name="verified" className="text-[15px]" />
                            18 项测试全部通过 (0.42s)
                        </span>
                        <button
                            type="button"
                            className="ml-auto inline-flex items-center gap-1 rounded bg-surface-container px-space-sm py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
                        >
                            <span>审查所有变更</span>
                            <Icon name="arrow_outward" className="text-[14px]" />
                        </button>
                    </div>
            </article>
        </div>
    );
}
