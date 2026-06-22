import type { IconAccentId, IconSkinToneId } from "../types";

export const CHARACTER_ICON_CATALOG = [
  "⚔️",
  "🗡️",
  "🛡️",
  "🏹",
  "🎯",
  "🧙",
  "🔮",
  "✨",
  "💚",
  "🪓",
  "⚡",
  "🔥",
  "❄️",
  "🌿",
  "🐺",
  "🦅",
  "🐻",
  "🎭",
  "👤",
  "🧝",
  "🧛",
  "🏴",
  "💀",
  "🎖️",
  "⭐",
  "🦁",
  "🐉",
] as const;

export const ENEMY_ICON_CATALOG = [
  "👹",
  "👺",
  "💀",
  "👾",
  "🦇",
  "🕷️",
  "🐍",
  "🐉",
  "🧟",
  "☠️",
  "🔥",
  "❄️",
  "🌑",
  "⚡",
  "🗿",
  "🦴",
  "👁️",
  "🐺",
  "🦂",
  "🧌",
] as const;

export const SKIN_TONE_ELIGIBLE: ReadonlySet<string> = new Set([
  "👤",
  "🧙",
  "🧝",
  "🧛",
]);

const CLASS_DEFAULT_ICON: Readonly<Record<string, string>> = {
  warrior: "⚔️",
  mage: "🧙",
  ranger: "🏹",
  healer: "💚",
  rogue: "🗡️",
  paladin: "🛡️",
  warlock: "🔮",
  berserker: "🪓",
};

const CHARACTER_ICON_SET = new Set<string>(CHARACTER_ICON_CATALOG);

export const ICON_ACCENT_IDS: readonly IconAccentId[] = [
  "default",
  "green",
  "gray",
  "blue",
  "red",
  "gold",
  "purple",
  "teal",
];

const FITZPATRICK_MODIFIER: Readonly<
  Record<Exclude<IconSkinToneId, "default">, string>
> = {
  light: "\u{1F3FB}",
  medium: "\u{1F3FD}",
  dark: "\u{1F3FF}",
};

export const ICON_SKIN_TONE_IDS = ['default', 'light', 'medium', 'dark'] as const satisfies readonly IconSkinToneId[]

export function defaultIconEmojiForClass(classId: string): string {
  return CLASS_DEFAULT_ICON[classId] ?? "👤";
}

export function isValidIconEmoji(emoji: string): boolean {
  return CHARACTER_ICON_SET.has(emoji);
}

export function isValidIconAccent(accent: string): accent is IconAccentId {
  return (ICON_ACCENT_IDS as readonly string[]).includes(accent);
}

export function renderEmojiWithSkinTone(
  baseEmoji: string,
  skinTone: IconSkinToneId,
): string {
  if (skinTone === "default" || !SKIN_TONE_ELIGIBLE.has(baseEmoji)) {
    return baseEmoji;
  }
  return baseEmoji + FITZPATRICK_MODIFIER[skinTone];
}

export function accentStyle(
  accent: IconAccentId,
): { borderColor: string; background: string; filter?: string } {
  switch (accent) {
    case "default":
      return { borderColor: "#d9d9d9", background: "rgba(217, 217, 217, 0.15)" };
    case "green":
      return {
        borderColor: "#52c41a",
        background: "rgba(82, 196, 26, 0.12)",
        filter: "hue-rotate(15deg)",
      };
    case "gray":
      return {
        borderColor: "#8c8c8c",
        background: "rgba(140, 140, 140, 0.12)",
        filter: "grayscale(0.7)",
      };
    case "blue":
      return { borderColor: "#1677ff", background: "rgba(22, 119, 255, 0.12)" };
    case "red":
      return { borderColor: "#ff4d4f", background: "rgba(255, 77, 79, 0.12)" };
    case "gold":
      return { borderColor: "#faad14", background: "rgba(250, 173, 20, 0.12)" };
    case "purple":
      return { borderColor: "#722ed1", background: "rgba(114, 46, 209, 0.12)" };
    case "teal":
      return { borderColor: "#13c2c2", background: "rgba(19, 194, 194, 0.12)" };
  }
}
