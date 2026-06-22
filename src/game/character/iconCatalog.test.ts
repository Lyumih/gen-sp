import { describe, expect, it } from "vitest";
import {
  CHARACTER_ICON_CATALOG,
  defaultIconEmojiForClass,
  isValidIconEmoji,
  renderEmojiWithSkinTone,
} from "./iconCatalog";

describe("iconCatalog", () => {
  it("warrior default is sword", () => {
    expect(defaultIconEmojiForClass("warrior")).toBe("⚔️");
  });

  it("catalog contains warrior default", () => {
    expect(CHARACTER_ICON_CATALOG).toContain("⚔️");
    expect(CHARACTER_ICON_CATALOG.length).toBeGreaterThanOrEqual(25);
  });

  it("validates emoji membership", () => {
    expect(isValidIconEmoji("⚔️")).toBe(true);
    expect(isValidIconEmoji("🦄")).toBe(false);
  });

  it("appends fitzpatrick modifier for eligible emoji", () => {
    const out = renderEmojiWithSkinTone("👤", "medium");
    expect(out.length).toBeGreaterThan("👤".length);
  });

  it("returns base emoji when skin tone default", () => {
    expect(renderEmojiWithSkinTone("👤", "default")).toBe("👤");
  });
});
