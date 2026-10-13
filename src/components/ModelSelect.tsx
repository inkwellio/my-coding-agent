import { useMemo } from "react";
import { chooseModel, modelChoiceLabel, useCredentialBoard } from "../credentials/board";
import { ModelPicker } from "./ui/ModelPicker";

interface ModelSelectProps {
  variant: "chip" | "field" | "composer";
  fallback?: string;
}

async function choosePair(pair: string) {
  const slash = pair.indexOf("/");
  if (slash <= 0) return;
  await chooseModel(pair.slice(0, slash), pair.slice(slash + 1));
}

export function ModelSelect({ variant, fallback = "Sonnet-3.5" }: ModelSelectProps) {
  const board = useCredentialBoard();
  const configured = useMemo(() => {
    const ids = new Set(
      board.providers.filter((provider) => board.statuses[provider.id]?.configured).map((provider) => provider.id),
    );
    return board.providers.filter((provider) => ids.has(provider.id) && provider.models.length > 0);
  }, [board.providers, board.statuses]);

  const value = board.selected.providerId && board.selected.modelId
    ? `${board.selected.providerId}/${board.selected.modelId}`
    : "";
  const selectedName = board.selected.name
    || (board.selected.providerId && board.selected.modelId
      ? modelChoiceLabel(board.selected.providerId, board.selected.modelId, board.selected.modelId)
      : null);
  const deepseek = board.providers.find((provider) => provider.id === "deepseek");
  const flashModelId = deepseek?.flashModelId ?? null;
  const flashPair = flashModelId ? `deepseek/${flashModelId}` : null;
  const flashSelected = Boolean(
    flashPair && board.selected.providerId === "deepseek" && board.selected.modelId === flashModelId,
  );

  const label = selectedName || fallback;
  const title = flashSelected && flashPair ? flashPair : label;

  if (!board.available) {
    return (
      <span className={variant === "chip"
        ? "flex h-8 items-center gap-1 rounded bg-surface-container px-space-sm font-label-sm text-label-sm text-on-surface"
        : variant === "composer"
          ? "max-w-[9.5rem] truncate font-label-sm text-label-sm text-composer-text-secondary"
        : "font-code-sm text-code-sm text-on-surface font-semibold"}
      >
        {fallback}
      </span>
    );
  }

  if (variant === "composer" || variant === "field" || variant === "chip") {
    const picker = (
      <ModelPicker
        tone={variant}
        configured={configured}
        value={value}
        label={label}
        title={title}
        onPick={choosePair}
      />
    );

    if (variant === "chip" && flashSelected) {
      return (
        <span className="flex max-w-[18rem] flex-col justify-center leading-none">
          {picker}
          <span className="px-space-sm font-mono text-[10px] text-outline">{flashPair}</span>
        </span>
      );
    }

    return picker;
  }
}
