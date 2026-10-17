# Third-Party Notices / 第三方许可声明

本项目自身以 [MIT License](./LICENSE) 发布。项目中包含或依赖以下第三方软件与资源，它们遵循各自的许可证。

This project is licensed under the MIT License. It bundles or depends on the third-party software and assets listed below, each under its own license.

## 随仓库分发的字体 / Bundled fonts

以下字体文件位于 `src/assets/fonts/`，为子集化的 woff2 文件，对应的完整许可证文本与字体放在同一目录中。

| 字体 / Font | 文件 / Files | 版权 / Copyright | 许可证 / License | 许可证文本 / License text |
| --- | --- | --- | --- | --- |
| Geist | `geist-latin.woff2` | Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font) | SIL Open Font License 1.1 | [`OFL-Geist.txt`](./src/assets/fonts/OFL-Geist.txt) |
| JetBrains Mono | `jetbrains-mono-latin.woff2` | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) | SIL Open Font License 1.1 | [`OFL-JetBrainsMono.txt`](./src/assets/fonts/OFL-JetBrainsMono.txt) |
| Noto Sans SC | `noto-sc-0.woff2` … `noto-sc-8.woff2` | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' | SIL Open Font License 1.1 | [`OFL-NotoSansSC.txt`](./src/assets/fonts/OFL-NotoSansSC.txt) |
| Material Symbols | `material-symbols.woff2` | Google（https://github.com/google/material-design-icons） | Apache License 2.0 | [`LICENSE-MaterialSymbols.txt`](./src/assets/fonts/LICENSE-MaterialSymbols.txt) |

## 主要依赖 / Key dependencies

以下依赖通过 npm 安装，不随本仓库源码分发。若将应用打包分发，需随安装包附带这些依赖的版权声明与许可证（Apache-2.0 依赖如带有 NOTICE 文件也需一并保留）。

| 包 / Package | 版本 / Version | 许可证 / License | 来源 / Source |
| --- | --- | --- | --- |
| `@earendil-works/pi-coding-agent` | 1.1.0 | MIT | https://github.com/earendil-works/pi |
| `@earendil-works/pi-ai`（经 pi-coding-agent 间接依赖） | 1.1.0 | MIT | https://github.com/earendil-works/pi |
| `@anthropic-ai/sandbox-runtime` | 0.0.78 | Apache-2.0 | https://github.com/anthropics/sandbox-runtime |
| `react` / `react-dom` | 19.3.0 | MIT | https://github.com/facebook/react |
| `marked` | 18.0.11 | MIT | https://github.com/markedjs/marked |
| `electron`（开发依赖） | 44.4.3 | MIT | https://github.com/electron/electron |

完整的传递依赖许可证可在安装依赖后通过 `npx license-checker --summary` 查看。

本项目为非官方项目，与 Pi / earendil-works 及上述任何项目的作者均无隶属或背书关系。
