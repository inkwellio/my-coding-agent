import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { useRpc } from "../rpc/RpcProvider";

export function OnboardingPage() {
  const { addWorkspace } = useRpc();
  const [modal, setModal] = useState<null | "clone" | "shortcut">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cloneUrl, setCloneUrl] = useState("");

  function showToast(text: string) {
    setToast(text);
  }

  function chooseWorkspace() {
    if (window.piDesktop?.addWorkspace) void addWorkspace();
    else showToast("请在桌面应用中选择工作区目录");
  }

  function openProject(name: string) {
    showToast("正在装载工程上下文: " + name);
    window.location.hash = "#/";
  }

  function startClone() {
    const value = cloneUrl.trim();
    if (!value) {
      showToast("请输入有效的 Git 仓库 URL");
      return;
    }
    setModal(null);
    showToast("正在连接并克隆: " + value);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModal(null);
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        chooseWorkspace();
      } else if (key === "k") {
        event.preventDefault();
        showToast("快捷搜索已激活 (⌘K)");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addWorkspace]);

  return (
  <main className="h-full min-h-screen w-full overflow-y-auto bg-surface text-on-surface font-body-md text-body-md">
    <div className="flex flex-col w-full text-on-surface">
      <div className="relative w-full overflow-hidden px-margin py-space-xl flex flex-col items-center justify-center">
        {/* Ambient Radial Atmospheric Backdrops (Purely container relative) */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary-container/10 blur-[130px] pointer-events-none rounded-full">
        </div>
        <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] bg-secondary-container/10 blur-[140px] pointer-events-none rounded-full">
        </div>
        <div className="absolute -bottom-20 left-10 w-[480px] h-[280px] bg-tertiary-container/5 blur-[120px] pointer-events-none rounded-full">
        </div>
        {/* Main Surgical Hub Grid */}
        <div className="relative w-full max-w-5xl flex flex-col gap-space-xl">
          {/* Top Utility / Quick Telemetry Ribbon */}
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm px-space-sm">
            <div className="flex items-center gap-space-md">
              <span className="flex items-center gap-space-xs text-tertiary">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse">
                </span>
                <span>
                  PI_CORE_v2.4.9
                </span>
              </span>
              <span className="text-outline-variant">
                /
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                ENGINE_IDLE
              </span>
              <span className="text-outline-variant">
                /
              </span>
              <span className="font-code-sm text-code-sm text-outline">
                PORT: 8089 (SANDBOXED)
              </span>
            </div>
            <div className="flex items-center gap-space-md">
              <button className="flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onClick={() => setModal((current) => (current === "shortcut" ? null : "shortcut"))}>
                <Icon name="keyboard" className="text-[16px]" />
                <span className="font-label-sm text-label-sm">
                  快捷键清单
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-outline text-label-xs font-label-xs">
                  ?
                </span>
              </button>
              <div className="w-1 h-3 bg-surface-container-highest rounded-full">
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-tertiary">
                </span>
                <span className="font-label-sm text-label-sm text-on-surface">
                  零信任隔离已开启
                </span>
              </div>
            </div>
          </div>
          {/* 1) Centered Hero Card */}
          <section className="relative bg-surface-container-lowest rounded-xl p-space-xl shadow-xl overflow-hidden">
            {/* Subtle Grid Circuit Motif via inline SVG */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern height="32" id="grid-pattern" patternUnits="userSpaceOnUse" width="32">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75">
                    </path>
                  </pattern>
                </defs>
                <rect fill="url(#grid-pattern)" height="100%" width="100%">
                </rect>
              </svg>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto py-space-md">
              <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container mb-space-md">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping">
                </span>
                <span className="font-label-xs text-label-xs text-primary tracking-wider uppercase">
                  AUTONOMOUS ORCHESTRATOR
                </span>
                <span className="text-outline-variant">
                  |
                </span>
                <span className="font-label-xs text-label-xs text-on-surface-variant">
                  DEEP CONTEXT ENGINE
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mb-space-sm">
                欢迎使用智能编程工作台
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed max-w-xl">
                基于深度上下文推理的下一代全自主 AI 编码伙伴。选择工作目录即可开启精准代码理解、多文件编辑协同与自愈执行流水线。
              </p>
              {/* Rapid Command Trigger Strip */}
              <div className="mt-space-lg w-full max-w-md bg-surface-container-low rounded-lg p-1.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-space-sm pl-space-sm min-w-0">
                  <Icon name="terminal" className="text-outline text-[18px] flex-shrink-0" />
                  <input className="bg-transparent border-0 outline-none text-on-surface font-body-sm text-body-sm w-full placeholder:text-outline/60 truncate" placeholder="输入自然语言需求或快捷操作..." readOnly={true} type="text" onClick={() => showToast("请先载入或创建工程目录")} />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <kbd className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-code-sm text-code-sm">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>
          </section>
          {/* 2) Primary Action Cards (Grid of 3) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Card 1: Open Local (Hero Action) */}
            <div className="group relative bg-surface-container-low hover:bg-surface-container rounded-xl p-space-lg flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl" onClick={chooseWorkspace}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-container to-secondary rounded-t-xl opacity-90">
              </div>
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <Icon name="folder_open" className="text-[22px]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-xs text-label-xs font-medium">
                      推荐方式
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant font-code-sm text-code-sm">
                      ⌘O
                    </kbd>
                  </div>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors mb-space-xs">
                  打开本地项目文件夹
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg">
                  支持 Git 仓库自动识别、符号依赖索引与历史变更上下文加载。
                </p>
              </div>
              <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-primary font-medium">
                <span className="flex items-center gap-1">
                  浏览本地存储
                  <Icon name="arrow_forward" className="text-[16px] group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="font-code-sm text-code-sm text-outline">
                  AUTO_INDEX
                </span>
              </div>
            </div>
            {/* Card 2: Clone from Remote */}
            <div className="group relative bg-surface-container-low hover:bg-surface-container rounded-xl p-space-lg flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl" onClick={() => setModal((current) => (current === "clone" ? null : "clone"))}>
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
                    <Icon name="cloud_download" className="text-[22px]" />
                  </div>
                  <span className="font-code-sm text-code-sm text-outline">
                    HTTPS / SSH
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors mb-space-xs">
                  从 Git 仓库克隆
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg">
                  输入 GitHub / GitLab 仓库链接，自动拉取分支并装载隔离沙箱。
                </p>
              </div>
              <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-secondary font-medium">
                <span className="flex items-center gap-1">
                  克隆远程仓库
                  <Icon name="arrow_forward" className="text-[16px] group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-label-xs text-label-xs">
                  SSH_KEY
                </span>
              </div>
            </div>
            {/* Card 3: Scaffold New Project */}
            <div className="group relative bg-surface-container-low hover:bg-surface-container rounded-xl p-space-lg flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl" onClick={() => showToast("已加载工程脚手架预设清单")}>
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
                    <Icon name="dataset" className="text-[22px]" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary">
                    </span>
                    <span className="font-code-sm text-code-sm text-tertiary">
                      PRE-CONFIG
                    </span>
                  </div>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-tertiary transition-colors mb-space-xs">
                  新建空项目脚手架
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg">
                  一键初始化 Next.js 全栈、Rust 高性能微服务或 Python Agent 原型。
                </p>
              </div>
              <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-tertiary font-medium">
                <span className="flex items-center gap-1">
                  模板工厂
                  <Icon name="arrow_forward" className="text-[16px] group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="font-code-sm text-code-sm text-outline">
                  TEMPLATES (12)
                </span>
              </div>
            </div>
          </section>
          {/* 3) Split Section: Recent Projects & Context Intelligence Stats */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Left 8-cols: Recent Projects List */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-space-md pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <Icon name="history" className="text-primary text-[20px]" />
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    近期打开的工程
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-code-sm text-code-sm text-on-surface-variant">
                    3
                  </span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button className="px-space-sm py-1 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors" onClick={() => showToast("过滤视图切换")}>
                    按访问排序
                  </button>
                </div>
              </div>
              {/* Project Rows */}
              <div className="flex flex-col gap-1.5" id="recentList">
                {/* Project Item 1 */}
                <div className="group flex items-center justify-between p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer" onClick={() => openProject("demo-monorepo")}>
                  <div className="flex items-center gap-space-md min-w-0">
                    <div className="w-9 h-9 rounded bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors flex-shrink-0">
                      <Icon name="account_tree" className="text-[18px]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-sm">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-medium truncate group-hover:text-primary transition-colors">
                          demo-monorepo
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-tertiary-container/20 text-tertiary font-code-sm text-code-sm">
                          main
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary">
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs font-code-sm text-code-sm text-outline truncate mt-0.5">
                        <span className="truncate">
                          /Users/dev/code/demo-monorepo
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-md flex-shrink-0 ml-space-sm">
                    <div className="text-right hidden sm:flex flex-col items-end">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        2 小时前
                      </span>
                      <span className="font-code-sm text-code-sm text-outline">
                        Git: clean
                      </span>
                    </div>
                    <button className="w-8 h-8 rounded bg-surface-container hover:bg-primary-container text-on-surface-variant hover:text-on-primary transition-colors flex items-center justify-center" title="进入工程">
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </button>
                  </div>
                </div>
                {/* Project Item 2 */}
                <div className="group flex items-center justify-between p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer" onClick={() => openProject("payment-core")}>
                  <div className="flex items-center gap-space-md min-w-0">
                    <div className="w-9 h-9 rounded bg-surface-container-high flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors flex-shrink-0">
                      <Icon name="lock" className="text-[18px]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-sm">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-medium truncate group-hover:text-secondary transition-colors">
                          payment-core
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary font-code-sm text-code-sm">
                          feat/stripe
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs font-code-sm text-code-sm text-outline truncate mt-0.5">
                        <span className="truncate">
                          /Users/dev/code/payment-core
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-md flex-shrink-0 ml-space-sm">
                    <div className="text-right hidden sm:flex flex-col items-end">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        昨天
                      </span>
                      <span className="font-code-sm text-code-sm text-error">
                        2 uncommitted
                      </span>
                    </div>
                    <button className="w-8 h-8 rounded bg-surface-container hover:bg-secondary-container text-on-surface-variant hover:text-on-secondary transition-colors flex items-center justify-center" title="进入工程">
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </button>
                  </div>
                </div>
                {/* Project Item 3 */}
                <div className="group flex items-center justify-between p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer" onClick={() => openProject("ml-pipeline")}>
                  <div className="flex items-center gap-space-md min-w-0">
                    <div className="w-9 h-9 rounded bg-surface-container-high flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors flex-shrink-0">
                      <Icon name="memory" className="text-[18px]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-sm">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-medium truncate group-hover:text-tertiary transition-colors">
                          ml-pipeline
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface-variant font-code-sm text-code-sm">
                          dev
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs font-code-sm text-code-sm text-outline truncate mt-0.5">
                        <span className="truncate">
                          /Users/dev/code/ml-pipeline
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-md flex-shrink-0 ml-space-sm">
                    <div className="text-right hidden sm:flex flex-col items-end">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        3 天前
                      </span>
                      <span className="font-code-sm text-code-sm text-outline">
                        Synced
                      </span>
                    </div>
                    <button className="w-8 h-8 rounded bg-surface-container hover:bg-tertiary-container text-on-surface-variant hover:text-on-tertiary transition-colors flex items-center justify-center" title="进入工程">
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
              {/* Bottom micro actions */}
              <div className="mt-space-md pt-space-sm flex items-center justify-between font-label-sm text-label-sm text-outline">
                <span className="flex items-center gap-1">
                  <Icon name="tune" className="text-[14px]" />
                  本地缓存索引占用: 48.2 MB
                </span>
                <button className="hover:text-on-surface transition-colors cursor-pointer" onClick={() => showToast("已清除历史缓存")}>
                  清理过期工程
                </button>
              </div>
            </div>
            {/* Right 4-cols: Engine Workspace State / Graph Info */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                    Agent Context Pool
                  </span>
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse">
                  </span>
                </div>
                {/* SVG Data Visualizer: Context Buffer Distribution */}
                <div className="bg-surface-container-low rounded-lg p-space-md mb-space-md">
                  <div className="flex justify-between items-end mb-space-sm">
                    <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                      128K
                    </span>
                    <span className="font-code-sm text-code-sm text-tertiary">
                      MAX_WINDOW_READY
                    </span>
                  </div>
                  {/* Segmented Bar Chart SVG */}
                  <svg className="w-full h-4 rounded overflow-hidden" preserveAspectRatio="none" viewBox="0 0 200 12">
                    <rect fill="#7f85f9" height="12" opacity="0.9" width="80" x="0" y="0">
                    </rect>
                    <rect fill="#00a6e0" height="12" opacity="0.85" width="55" x="82" y="0">
                    </rect>
                    <rect fill="#4edea3" height="12" opacity="0.8" width="30" x="139" y="0">
                    </rect>
                    <rect fill="#272a2f" height="12" width="29" x="171" y="0">
                    </rect>
                  </svg>
                  <div className="grid grid-cols-3 gap-1 mt-space-sm text-[10px] font-code-sm">
                    <span className="text-primary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-xs inline-block">
                      </span>
                      AST (40%)
                    </span>
                    <span className="text-secondary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-xs inline-block">
                      </span>
                      Git (28%)
                    </span>
                    <span className="text-tertiary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-tertiary rounded-xs inline-block">
                      </span>
                      Docs (15%)
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">
                      嵌入式矢量模型
                    </span>
                    <span className="font-code-sm text-code-sm text-on-surface">
                      Voyage-Code-3
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">
                      推理调度核
                    </span>
                    <span className="font-code-sm text-code-sm text-primary">
                      Claude 3.7 Sonnet (Hybrid)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">
                      Diff 合并器
                    </span>
                    <span className="font-code-sm text-code-sm text-tertiary">
                      3-Way Semantic Tree
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-space-lg pt-space-md">
                <button className="w-full py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-space-xs" onClick={() => showToast("内存与上下文索引自检通过 (0 警告)")}>
                  <Icon name="speed" className="text-[16px]" />
                  <span>
                    运行工作区性能自检
                  </span>
                </button>
              </div>
            </div>
          </section>
          {/* 4) Quick Capabilities Tips Banner (3 pillars) */}
          <section className="bg-surface-container-low rounded-xl p-space-md shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {/* Tip 1 */}
              <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest/60">
                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <Icon name="lightbulb" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs mb-0.5">
                    <span className="font-label-sm text-label-sm text-on-surface font-medium">
                      全局交互核心
                    </span>
                    <kbd className="px-1 py-0.2 rounded bg-surface-container text-outline font-code-sm text-[10px]">
                      ⌘K
                    </kbd>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                    支持通过 ⌘K 唤醒全局搜索、自然语言指令与微任务分解。
                  </p>
                </div>
              </div>
              {/* Tip 2 */}
              <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest/60">
                <div className="w-7 h-7 rounded bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0 mt-0.5">
                  <Icon name="bolt" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs mb-0.5">
                    <span className="font-label-sm text-label-sm text-on-surface font-medium">
                      安全保障沙箱
                    </span>
                    <span className="px-1 py-0.2 rounded bg-secondary-container/20 text-secondary font-code-sm text-[10px]">
                      SECURE
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                    终端与文件读写均运行在受控安全沙箱内，未授权写操作需确认。
                  </p>
                </div>
              </div>
              {/* Tip 3 */}
              <div className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest/60">
                <div className="w-7 h-7 rounded bg-tertiary/10 flex items-center justify-center text-tertiary flex-shrink-0 mt-0.5">
                  <Icon name="difference" className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs mb-0.5">
                    <span className="font-label-sm text-label-sm text-on-surface font-medium">
                      精确补丁审查
                    </span>
                    <span className="px-1 py-0.2 rounded bg-tertiary-container/20 text-tertiary font-code-sm text-[10px]">
                      DIFF_V2
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                    可在右侧一键直观审查统一 Diff 补丁、局部接受并自动提交 Git。
                  </p>
                </div>
              </div>
            </div>
          </section>
          {/* Footer Micro Bar */}
          <footer className="flex flex-col sm:flex-row items-center justify-between text-outline font-label-xs text-label-xs px-space-sm gap-space-xs pb-space-sm">
            <div className="flex items-center gap-space-md">
              <span>
                智能编程工作台 © 2025
              </span>
              <span>
                ·
              </span>
              <span className="text-on-surface-variant">
                Privacy-Preserving Local Indexing
              </span>
              <span>
                ·
              </span>
              <span>
                Latency:
                <strong className="text-tertiary font-code-sm">
                  18ms
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="flex items-center gap-1 text-on-surface-variant">
                <Icon name="terminal" className="text-[14px]" />
                Shell: zsh / bash
              </span>
              <span>
                ·
              </span>
              <a className="hover:text-primary transition-colors" href="#/onboarding" onClick={() => showToast("帮助文档与使用指南")}>
                文档与规范
              </a>
            </div>
          </footer>
        </div>
      </div>
      {/* Interactive Modal: Git Clone Prompt (Hidden by default) */}
      <div className={modal === "clone" ? "fixed inset-0 bg-surface/80 backdrop-blur-sm z-dropdown flex items-center justify-center p-margin" : "hidden"} id="cloneModal">
        <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-xl shadow-2xl relative">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex items-center gap-space-sm">
              <Icon name="cloud_download" className="text-secondary text-[22px]" />
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium">
                克隆远程 Git 仓库
              </h3>
            </div>
            <button className="text-outline hover:text-on-surface transition-colors cursor-pointer" onClick={() => setModal((current) => (current === "clone" ? null : "clone"))}>
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            输入远程 Repository URL。应用将在沙箱临时目录运行克隆，并预先索引代码语义。
          </p>
          <div className="flex flex-col gap-space-md mb-space-lg">
            <div>
              <label className="font-label-xs text-label-xs text-outline uppercase tracking-wider block mb-1">
                仓库地址 (HTTPS 或 SSH)
              </label>
              <input className="w-full bg-surface-container-high rounded-lg px-space-md py-2 text-on-surface font-code-sm text-code-sm outline-none focus:bg-surface-container-highest transition-all placeholder:text-outline/50" id="cloneUrlInput" placeholder="https://github.com/username/project.git" type="text" value={cloneUrl} onChange={(event) => setCloneUrl(event.target.value)} />
            </div>
            <div>
              <label className="font-label-xs text-label-xs text-outline uppercase tracking-wider block mb-1">
                本地存放路径
              </label>
              <div className="flex items-center gap-space-xs">
                <input className="w-full bg-surface-container-high rounded-lg px-space-md py-2 text-on-surface-variant font-code-sm text-code-sm outline-none" readOnly={true} type="text" value="~/workspace/repos" />
                <button className="px-space-sm py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-highest font-label-sm text-label-sm" onClick={() => showToast("选择目标存储路径")}>
                  更改
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-space-sm">
            <button className="px-space-lg py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors" onClick={() => setModal((current) => (current === "clone" ? null : "clone"))}>
              取消
            </button>
            <button className="px-space-xl py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary font-label-md text-label-md font-semibold transition-colors flex items-center gap-space-xs" onClick={startClone}>
              <Icon name="downloading" className="text-[18px]" />
              <span>
                开始克隆
              </span>
            </button>
          </div>
        </div>
      </div>
      {/* Interactive Modal: Shortcuts (Hidden by default) */}
      <div className={modal === "shortcut" ? "fixed inset-0 bg-surface/80 backdrop-blur-sm z-dropdown flex items-center justify-center p-margin" : "hidden"} id="shortcutModal">
        <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-space-xl shadow-2xl relative">
          <div className="flex items-center justify-between mb-space-md">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium">
              键盘快捷键
            </h3>
            <button className="text-outline hover:text-on-surface transition-colors cursor-pointer" onClick={() => setModal((current) => (current === "shortcut" ? null : "shortcut"))}>
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
            <div className="flex items-center justify-between p-space-xs bg-surface-container-low rounded">
              <span className="text-on-surface-variant">
                打开项目目录
              </span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-code-sm text-code-sm text-on-surface">
                ⌘ O
              </kbd>
            </div>
            <div className="flex items-center justify-between p-space-xs bg-surface-container-low rounded">
              <span className="text-on-surface-variant">
                唤醒智能命令条
              </span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-code-sm text-code-sm text-on-surface">
                ⌘ K
              </kbd>
            </div>
            <div className="flex items-center justify-between p-space-xs bg-surface-container-low rounded">
              <span className="text-on-surface-variant">
                展开审查 Diff 对比
              </span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-code-sm text-code-sm text-on-surface">
                ⌘ ⇧ D
              </kbd>
            </div>
            <div className="flex items-center justify-between p-space-xs bg-surface-container-low rounded">
              <span className="text-on-surface-variant">
                切换嵌入终端
              </span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-code-sm text-code-sm text-on-surface">
                ⌃ `
              </kbd>
            </div>
          </div>
          <div className="mt-space-lg text-right">
            <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" onClick={() => setModal((current) => (current === "shortcut" ? null : "shortcut"))}>
              完成
            </button>
          </div>
        </div>
      </div>
      {/* Micro Notification Toast Container */}
      <div className={"fixed bottom-space-lg right-space-lg z-dropdown transform transition-all duration-300 flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-surface-container-highest text-on-surface shadow-2xl" + (toast ? "" : " translate-y-12 opacity-0 pointer-events-none")} id="quickToast">
        <Icon name="info" className="text-primary text-[18px]" />
        <span className="font-body-sm text-body-sm" id="toastMsg">
          {toast ?? "系统就绪"}
        </span>
      </div>
    </div>
  </main>
  );
}
