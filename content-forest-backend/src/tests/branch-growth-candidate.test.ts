import { describe, expect, it } from "vitest";
import {
  candidateToGrowthFruitInput,
  validateBranchGrowthCandidateFruit,
} from "../agent/skills/branch-growth-candidate.js";

const validCandidate = {
  type: "candidate_fruit",
  payload: {
    markdown: "# 好内容",
    rawGeneratorOutput: "# 好内容",
    attachments: [],
  },
  meta: {
    summary: "适合小红书的产品表达",
    geneTags: ["情绪价值"],
    usedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
    warnings: [],
  },
};

describe("BranchGrowthCandidate schema", () => {
  it("accepts a valid candidate and adapts it for Growth", () => {
    expect(
      candidateToGrowthFruitInput(validCandidate, {
        authorizedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
      }),
    ).toEqual({
      markdown: "# 好内容",
      summary: "适合小红书的产品表达",
      geneTags: ["情绪价值"],
    });
  });

  it("normalizes string resource references when they uniquely match authorized resources", () => {
    const candidate = validateBranchGrowthCandidateFruit(
      {
        ...validCandidate,
        meta: {
          ...validCandidate.meta,
          usedResourceRefs: ["gene_1", "nutrient:nutrient_1"],
        },
      },
      {
        authorizedResourceRefs: [
          { resourceType: "gene", resourceId: "gene_1" },
          { resourceType: "nutrient", resourceId: "nutrient_1" },
        ],
      },
    );

    expect(candidate.meta.usedResourceRefs).toEqual([
      { resourceType: "gene", resourceId: "gene_1" },
      { resourceType: "nutrient", resourceId: "nutrient_1" },
    ]);
  });

  it("rejects empty markdown and summary", () => {
    expect(() =>
      validateBranchGrowthCandidateFruit({
        ...validCandidate,
        payload: { markdown: " ", attachments: [] },
        meta: { ...validCandidate.meta, summary: "" },
      }),
    ).toThrow(/payload\.markdown/);
  });

  it("rejects unauthorized resource references", () => {
    expect(() =>
      validateBranchGrowthCandidateFruit(validCandidate, {
        authorizedResourceRefs: [{ resourceType: "gene", resourceId: "gene_2" }],
      }),
    ).toThrow(/not authorized/);

    expect(() =>
      validateBranchGrowthCandidateFruit(validCandidate, {
        authorizedResourceRefs: [],
      }),
    ).toThrow(/not authorized/);
  });

  it("rejects unsafe string resource references", () => {
    expect(() =>
      validateBranchGrowthCandidateFruit(
        {
          ...validCandidate,
          meta: { ...validCandidate.meta, usedResourceRefs: [" "] },
        },
        {
          authorizedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
        },
      ),
    ).toThrow(/resource ref id is required/);

    expect(() =>
      validateBranchGrowthCandidateFruit(
        {
          ...validCandidate,
          meta: { ...validCandidate.meta, usedResourceRefs: ["gene_unknown"] },
        },
        {
          authorizedResourceRefs: [{ resourceType: "gene", resourceId: "gene_1" }],
        },
      ),
    ).toThrow(/not authorized/);

    expect(() =>
      validateBranchGrowthCandidateFruit(
        {
          ...validCandidate,
          meta: { ...validCandidate.meta, usedResourceRefs: ["shared_1"] },
        },
        {
          authorizedResourceRefs: [
            { resourceType: "gene", resourceId: "shared_1" },
            { resourceType: "nutrient", resourceId: "shared_1" },
          ],
        },
      ),
    ).toThrow(/ambiguous/);
  });

  it("rejects real local paths and forged system facts", () => {
    expect(() =>
      validateBranchGrowthCandidateFruit({
        ...validCandidate,
        payload: {
          markdown: "读取 D:\\secret\\file.md 后已保存果实",
          attachments: [],
        },
      }),
    ).toThrow(/real local file paths|system facts/);
  });
});
