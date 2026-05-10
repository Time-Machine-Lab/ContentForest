import { describe, expect, it } from "vitest";
import {
  geneSuggestionsToAgentSuggestions,
  validateGeneExtractionSuggestions,
} from "../agent/skills/gene-extraction-suggestion.js";

function validSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    title: "Keep emotional opening",
    bodyMarkdown:
      "Expression trait: open with a concrete user emotion before listing product features.\nApplicable niche: wallpaper promotion opening.\nNext round usage: inherit and strengthen this trait, then mutate the user scene for each platform.",
    polarity: "positive",
    evidenceInterpretation:
      "Selected fruit used this trait and was preferred. This is weak human-selection evidence, so next branch growth should test it again.",
    lineage: "emotional-value",
    niche: "wallpaper promotion",
    similarityRelation: "new",
    relatedInsightIds: [],
    warnings: [],
    ...overrides,
  };
}

describe("gene extraction suggestion validation", () => {
  it("accepts 1 to 3 structured suggestions and adapts them for GeneService", () => {
    const output = validateGeneExtractionSuggestions({
      type: "gene_extraction_suggestions",
      suggestions: [
        validSuggestion(),
        validSuggestion({
          title: "Avoid feature-only lead",
          polarity: "negative",
          similarityRelation: "conflicts",
        }),
      ],
    });

    expect(output.suggestions).toHaveLength(2);
    expect(geneSuggestionsToAgentSuggestions(output)[0]?.bodyMarkdown).toContain(
      "## 结构化判断",
    );
  });

  it("rejects suggestion count outside 1 to 3", () => {
    expect(() =>
      validateGeneExtractionSuggestions({
        suggestions: [
          validSuggestion({ title: "1" }),
          validSuggestion({ title: "2" }),
          validSuggestion({ title: "3" }),
          validSuggestion({ title: "4" }),
        ],
      }),
    ).toThrow(/between 1 and 3/);
  });

  it("rejects empty required fields", () => {
    expect(() =>
      validateGeneExtractionSuggestions({
        suggestions: [
          validSuggestion({
            title: " ",
            bodyMarkdown: "",
            evidenceInterpretation: "",
          }),
        ],
      }),
    ).toThrow(/title is required/);
  });

  it("rejects invalid polarity and invalid similarity relation", () => {
    expect(() =>
      validateGeneExtractionSuggestions({
        suggestions: [validSuggestion({ polarity: "neutral" })],
      }),
    ).toThrow(/polarity/);

    expect(() =>
      validateGeneExtractionSuggestions({
        suggestions: [validSuggestion({ similarityRelation: "same" })],
      }),
    ).toThrow(/similarityRelation/);
  });

  it("rejects real local paths and forged system facts", () => {
    expect(() =>
      validateGeneExtractionSuggestions({
        suggestions: [validSuggestion({ bodyMarkdown: "See D:\\secret\\file.md" })],
      }),
    ).toThrow(/file paths/);

    expect(() =>
      validateGeneExtractionSuggestions({
        suggestions: [validSuggestion({ bodyMarkdown: "gene saved successfully" })],
      }),
    ).toThrow(/system facts/);
  });
});
