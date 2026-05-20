import { describe, expect, it } from "vitest";
import {
  candidateToGrowthFruitInput,
  validateBranchGrowthCandidateFruit,
} from "../agent/skills/branch-growth-candidate.js";
import type { ReferenceUsageSummary } from "../modules/growth/domain/growth-types.js";

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
    ).toMatchObject({
      markdown: "# 好内容",
      summary: "适合小红书的产品表达",
      geneTags: ["情绪价值"],
      actualReferenceUsage: [
        expect.objectContaining({
          resourceType: "gene",
          resourceId: "gene_1",
          status: "actual",
        }),
      ],
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

  it("requires summary to be a short fruit title", () => {
    expect(() =>
      validateBranchGrowthCandidateFruit({
        ...validCandidate,
        meta: { ...validCandidate.meta, summary: "短" },
      }),
    ).toThrow(/5 to 20 character/);

    expect(() =>
      validateBranchGrowthCandidateFruit({
        ...validCandidate,
        meta: {
          ...validCandidate.meta,
          summary: "这是一个明显过长不适合展示在果实节点上的标题",
        },
      }),
    ).toThrow(/5 to 20 character/);
  });

  it("cleans thinking text from candidate markdown before adapting to Growth", () => {
    expect(
      candidateToGrowthFruitInput({
        ...validCandidate,
        payload: {
          ...validCandidate.payload,
          markdown: "<think>内部分析</think>\n我先分析一下\n\n## 标题\n清理后的标题",
          rawGeneratorOutput: "<think>内部分析</think>\n## 标题\n清理后的标题",
        },
      }),
    ).toMatchObject({
      markdown: "## 标题\n清理后的标题",
    });
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

  it("validates reference usage authorization and high risk handling summaries", () => {
    const highRiskUsage: ReferenceUsageSummary = {
      sourceType: "formal_nutrient",
      resourceType: "nutrient",
      resourceId: "nutrient_1",
      title: "广告 brief",
      status: "actual",
      atomIds: ["atom_claim"],
      actions: ["constrain"],
      slots: ["fact_check"],
      usageSummary: "使用广告主候选功效主张",
      evidenceStrength: "candidate",
      riskLevel: "high",
    };

    expect(() =>
      validateBranchGrowthCandidateFruit(
        {
          ...validCandidate,
          meta: {
            ...validCandidate.meta,
            usedResourceRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
            referenceUsage: [highRiskUsage],
          },
        },
        {
          authorizedResourceRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
          plannedReferenceUsage: [highRiskUsage],
        },
      ),
    ).toThrow(/riskHandlingSummary|factCheckSummary/);

    const accepted = validateBranchGrowthCandidateFruit(
      {
        ...validCandidate,
        meta: {
          ...validCandidate.meta,
          usedResourceRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
          referenceUsage: [highRiskUsage],
          factCheckSummary: "已按研究和广告边界做条件化表达",
        },
      },
      {
        authorizedResourceRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
        plannedReferenceUsage: [highRiskUsage],
      },
    );
    expect(accepted.meta.referenceUsage).toEqual([
      expect.objectContaining({
        resourceType: "nutrient",
        resourceId: "nutrient_1",
        riskLevel: "high",
      }),
    ]);

    expect(() =>
      validateBranchGrowthCandidateFruit(
        {
          ...validCandidate,
          meta: {
            ...validCandidate.meta,
            usedResourceRefs: [],
            referenceUsage: [{
              ...highRiskUsage,
              resourceId: "nutrient_2",
              riskLevel: "low",
              actions: ["ground"],
              slots: ["proof_evidence"],
            }],
            factCheckSummary: "低风险转述",
          },
        },
        {
          authorizedResourceRefs: [{ resourceType: "nutrient", resourceId: "nutrient_1" }],
        },
      ),
    ).toThrow(/not authorized/);
  });

  it("accepts route candidate meta but rejects system facts inside it", () => {
    const candidate = validateBranchGrowthCandidateFruit({
      ...validCandidate,
      meta: {
        ...validCandidate.meta,
        routeId: "route-1-platform-fit",
        routeSummary: "平台语感路线",
        mutationOperators: ["叙事机制变异"],
        riskWarnings: ["不要伪造案例"],
      },
    });

    expect(candidate.meta).toMatchObject({
      routeId: "route-1-platform-fit",
      routeSummary: "平台语感路线",
      mutationOperators: ["叙事机制变异"],
      riskWarnings: ["不要伪造案例"],
    });

    expect(() =>
      validateBranchGrowthCandidateFruit({
        ...validCandidate,
        meta: {
          ...validCandidate.meta,
          routeSummary: "已发布到平台",
        },
      }),
    ).toThrow(/system facts/);
  });
});
