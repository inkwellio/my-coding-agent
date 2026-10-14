import { diffTone } from "../git/format";

/** Unified diff text, one tinted row per line. */
export function DiffLines({ text }: { text: string }) {
    return (
        // w-max keeps each row's background as wide as the longest line when scrolled horizontally.
        <div className="w-max min-w-full">
            {text.split("\n").map((line, index) => (
                <div key={index} className={`whitespace-pre px-space-md ${diffTone(line)}`}>{line || " "}</div>
            ))}
        </div>
    );
}
