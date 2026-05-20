import { describe, expect, it } from "vitest";
import { buildContentEvolutionStrategy } from "../agent/skills/content-evolution-strategy.js";

function selectedRoute() {
  return {
    id: "route-1-case",
    objective: "用案例建立真实感",
    platforms: ["小红书"],
    audience: "移动端快速浏览用户",
    contentForm: "图文笔记",
    narrativeMechanism: "案例前后对比",
    emotionalDrivers: ["代入感"],
    evidencePlan: ["正式营养", "临时营养卡片"],
    interactionMode: "引导评论",
    riskGuards: ["不要伪造案例"],
    mutationOperators: [
      {
        key: "route-1:evidence",
        label: "证据计划轮换",
        variable: "evidence",
        action: "调整证据优先级",
        radius: "balanced",
      },
    ],
    successSignals: ["出现具体情境"],
    referencePlan: {
      summary: "正式营养作证据，临时卡片作候选证据",
      items: [
        {
          sourceType: "nutrient",
          resourceId: "nutrient_1",
          role: "evidence",
          usage: "作为稳定案例参考",
          confidence: "high",
        },
        {
          sourceType: "temporary_nutrient_card",
          resourceId: "card_1",
          role: "candidate_evidence",
          usage: "低置信试用",
          confidence: "low",
        },
        {
          sourceType: "gene",
          resourceId: "gene_1",
          role: "avoid",
          usage: "规避硬广表达",
          confidence: "medium",
        },
      ],
    },
  };
}

describe("content evolution strategy", () => {
  it("uses selected route metadata as the primary strategy input", () => {
    const route = selectedRoute();
    const strategy = buildContentEvolutionStrategy({
      taskInput: {
        attemptIndex: 1,
        target: { fruitCount: 1, totalFruitCount: 2 },
        selectedRoute: route,
        referencePlan: route.referencePlan,
        mutationOperators: route.mutationOperators,
        platformInference: {
          platforms: ["小红书"],
          contentForms: ["图文笔记"],
          source: "generator",
          confidence: "high",
          evidenceSummary: "生成器线索",
        },
        contentSearchMap: {
          algorithmVersion: "content-search-map-v1",
          platformInference: { source: "generator" },
          routeCandidates: [route],
          fallbackUsed: false,
        },
      },
      source: {
        title: "来源种子",
        markdown: "种子正文",
        geneTags: ["真实复盘"],
      },
      resources: {
        nutrients: [
          {
            resourceType: "nutrient",
            resourceId: "nutrient_1",
            title: "正式营养",
            markdown: "正式资料",
          },
        ],
        temporaryNutrientCards: [
          {
            resourceType: "nutrient_card",
            resourceId: "card_1",
            title: "未沉淀卡片",
            markdown: "候选资料",
          },
        ],
        genes: [
          {
            resourceType: "gene",
            resourceId: "gene_1",
            title: "负向基因",
            markdown: "失败：太像广告，需要规避",
            performance: { negativeCount: 2 },
          },
        ],
      },
    });

    expect(strategy.fallbackUsed).toBe(false);
    expect(strategy.explorationSlot.key).toBe("route-1-case");
    expect(strategy.platformInference).toMatchObject({ source: "generator" });
    expect(strategy.mutationOperators).toHaveLength(1);
    expect(strategy.evidenceCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "nutrient",
          resourceId: "nutrient_1",
          confidence: "high",
        }),
        expect.objectContaining({
          sourceType: "temporary_nutrient_card",
          resourceId: "card_1",
          confidence: "low",
          candidate: true,
        }),
        expect.objectContaining({
          sourceType: "gene",
          resourceId: "gene_1",
        }),
      ]),
    );
    expect(strategy.avoidedGeneUses.join("\n")).toContain("规避");
  });

  it("falls back to fixed exploration slots when route metadata is missing", () => {
    const strategy = buildContentEvolutionStrategy({
      taskInput: {
        attemptIndex: 2,
        target: { fruitCount: 1, totalFruitCount: 3 },
      },
      source: { title: "来源", markdown: "正文" },
      resources: {},
    });

    expect(strategy.fallbackUsed).toBe(true);
    expect(strategy.fallbackReason).toContain("缺少有效选中探索路线");
    expect(strategy.explorationSlot.key).toBe("utility-save");
  });
});
