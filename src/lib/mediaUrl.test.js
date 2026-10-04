import { describe, expect, it } from "vitest";
import {
  isSupabaseStorageUrl,
  mediaUrl,
  parseSupabaseStorageUrl,
  storagePathToR2Key,
} from "./mediaUrl";

describe("mediaUrl / supabase storage rewrite", () => {
  const publicUrl =
    "https://ggkvgohzwwoqdeaqhkzq.supabase.co/storage/v1/object/public/track-weather/24h%20Daytona/track-weather.png";
  const signedUrl =
    "https://ggkvgohzwwoqdeaqhkzq.supabase.co/storage/v1/object/sign/ChampionshipLogos/mclaren.png?token=abc";

  it("detects supabase storage urls", () => {
    expect(isSupabaseStorageUrl(publicUrl)).toBe(true);
    expect(isSupabaseStorageUrl(signedUrl)).toBe(true);
    expect(
      isSupabaseStorageUrl(
        "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev/track-weather/x.png",
      ),
    ).toBe(false);
  });

  it("parses public and signed storage urls", () => {
    expect(parseSupabaseStorageUrl(publicUrl)).toEqual({
      bucket: "track-weather",
      objectPath: "24h Daytona/track-weather.png",
    });
    expect(parseSupabaseStorageUrl(signedUrl)).toEqual({
      bucket: "ChampionshipLogos",
      objectPath: "mclaren.png",
    });
  });

  it("maps ChampionshipLogos bucket to championship-logos prefix", () => {
    expect(storagePathToR2Key("ChampionshipLogos", "mclaren.png")).toBe(
      "championship-logos/mclaren.png",
    );
    expect(
      storagePathToR2Key("track-weather", "track-weather/race/a.png"),
    ).toBe("track-weather/race/a.png");
  });

  it("rewrites supabase storage urls to R2 public base", () => {
    expect(mediaUrl(publicUrl)).toBe(
      "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev/track-weather/24h%20Daytona/track-weather.png",
    );
    expect(mediaUrl(signedUrl)).toBe(
      "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev/championship-logos/mclaren.png",
    );
  });

  it("passes through R2 and local paths", () => {
    expect(mediaUrl("/images/rtr_logo.png")).toBe("/images/rtr_logo.png");
    expect(
      mediaUrl(
        "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev/drivers/a.png",
      ),
    ).toBe("https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev/drivers/a.png");
  });

  it("prepends base for bare keys", () => {
    expect(mediaUrl("drivers/foo.png")).toBe(
      "https://pub-f0a47a1e0660483ca04c343f23495c08.r2.dev/drivers/foo.png",
    );
  });
});
