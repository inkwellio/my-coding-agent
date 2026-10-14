import { useEffect, useRef } from "react";
import { showToast } from "../components/ShortcutToast";
import { requestModelPickerOpen } from "../components/ui/ModelPicker";
import { chooseModel, ensureCredentialBoard, getCredentialBoard, modelChoiceLabel } from "../credentials/board";
import { notifyModelSettingsChanged, thinkingLevelLabel } from "../credentials/modelSettings";
import { useRpc } from "../rpc/RpcProvider";
import { readRoute } from "../router";
import { comboFromEvent, getKeybindings, isShortcutCapture, type ShortcutAction } from "../shortcuts";

function errorText(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

async function stepModel(direction: 1 | -1) {
    await ensureCredentialBoard();
    const board = getCredentialBoard();
    const choices = board.providers
        .filter((provider) => board.statuses[provider.id]?.configured)
        .flatMap((provider) => provider.models.map((model) => ({
            providerId: provider.id,
            modelId: model.id,
            label: modelChoiceLabel(provider.id, model.id, model.name, provider.flashModelId),
        })));
    if (choices.length === 0) {
        showToast("还没有配置凭据的模型");
        return;
    }
    const index = choices.findIndex((choice) => (
        choice.providerId === board.selected.providerId && choice.modelId === board.selected.modelId
    ));
    const next = choices[(index + direction + choices.length) % choices.length];
    if (choices.length === 1 && index === 0) {
        showToast(`只有一个可用模型：${next.label}`);
        return;
    }
    const result = await chooseModel(next.providerId, next.modelId);
    showToast(result.ok ? `模型：${next.label}` : result.message ?? "切换模型失败");
}

async function cycleThinking() {
    const desktop = window.piDesktop;
    if (!desktop?.getModelSettings || !desktop.setThinkingLevel) return;
    const settings = await desktop.getModelSettings();
    if (settings.levels.length <= 1) {
        showToast("当前模型不支持深度思考");
        return;
    }
    const index = settings.levels.indexOf(settings.thinkingLevel);
    const next = settings.levels[(index + 1) % settings.levels.length];
    const result = await desktop.setThinkingLevel(next);
    if (!result.ok) {
        showToast(result.message ?? "切换思考档位失败");
        return;
    }
    notifyModelSettingsChanged();
    showToast(`思考档位：${thinkingLevelLabel[result.settings.thinkingLevel]}`);
}

export function useGlobalShortcuts(enabled: boolean) {
    const rpc = useRpc();
    const rpcRef = useRef(rpc);
    rpcRef.current = rpc;

    useEffect(() => {
        if (!enabled) return;

        const run = async (action: ShortcutAction) => {
            const current = rpcRef.current;
            try {
                if (action === "abort") {
                    const result = await window.piDesktop?.abortPrompt?.();
                    if (result && !result.ok) showToast(result.message ?? "中止失败");
                    else if (result && !result.idle) showToast("已中止回复");
                } else if (action === "newSession") {
                    if (readRoute() !== "workspace") window.location.hash = "#/";
                    if (await current.changeSession(null)) showToast("已新建会话");
                } else if (action === "openModelPicker") {
                    if (readRoute() !== "workspace") window.location.hash = "#/";
                    requestModelPickerOpen();
                } else if (action === "nextModel") {
                    await stepModel(1);
                } else if (action === "previousModel") {
                    await stepModel(-1);
                } else if (action === "cycleThinking") {
                    await cycleThinking();
                }
            } catch (error) {
                showToast(errorText(error, "快捷键执行失败"));
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat || event.isComposing || isShortcutCapture()) return;
            const combo = comboFromEvent(event);
            if (!combo) return;
            // Tab combos move focus between controls; only claim them on the page or the composer.
            const target = event.target instanceof HTMLElement ? event.target : null;
            if (combo.split("+").includes("tab") && target && target !== document.body && !target.closest("[data-shortcut-tab]")) return;
            const bindings = getKeybindings();
            const action = (Object.keys(bindings) as ShortcutAction[]).find((id) => bindings[id] === combo);
            if (!action) return;
            if (action === "abort") {
                const engine = rpcRef.current.status.engine;
                if (engine !== "chatting") return;
            }
            event.preventDefault();
            void run(action);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [enabled]);
}
