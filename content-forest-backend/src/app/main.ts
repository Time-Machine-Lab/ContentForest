import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { bootstrapApp } from "./bootstrap/app-bootstrap.js";
import { loadLocalEnvFile } from "./config/local-env.js";
import {
  ApplicationError,
  isApplicationError,
} from "../shared/errors/application-error.js";
import type {
  GrowthResourceRef,
  GrowthSourceNodeRef,
} from "../modules/growth/domain/growth-types.js";
import type {
  NutrientArchiveState,
  NutrientLibraryScope,
} from "../modules/nutrient/domain/nutrient-types.js";

await loadLocalEnvFile();
const app = await bootstrapApp();

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "access-control-allow-headers": "content-type",
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, null);
      return;
    }

    if (request.url === "/health") {
      sendJson(response, 200, {
        status: "ok",
        contentRootDir: app.config.contentRootDir,
        databasePath: app.config.databasePath,
      });
      return;
    }

    const handled = await handleApiRequest(request, response);
    if (handled) {
      return;
    }

    sendJson(response, 404, { code: "NOT_FOUND", message: "Not Found" });
  } catch (error) {
    if (isApplicationError(error)) {
      sendJson(response, error.status, {
        code: error.code,
        message: error.message,
      });
      return;
    }

    sendJson(response, 500, {
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    });
  }
});

async function handleApiRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname;
  const method = request.method ?? "GET";

  if (pathname === "/api/nutrient-libraries" && method === "GET") {
    const result = await app.nutrientController.listLibraries(
      toListNutrientLibrariesInput(url.searchParams),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/nutrient-libraries" && method === "POST") {
    const result = await app.nutrientController.createLibrary(
      toCreateNutrientLibraryInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientLibraryContentsMatch = pathname.match(
    /^\/api\/nutrient-libraries\/([^/]+)\/contents$/,
  );
  if (nutrientLibraryContentsMatch && method === "GET") {
    const result = await app.nutrientController.listContents(
      decodeURIComponent(nutrientLibraryContentsMatch[1] ?? ""),
      toListNutrientContentsInput(url.searchParams),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (nutrientLibraryContentsMatch && method === "POST") {
    const result = await app.nutrientController.createContent(
      decodeURIComponent(nutrientLibraryContentsMatch[1] ?? ""),
      toCreateNutrientContentInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientLibraryArchiveMatch = pathname.match(
    /^\/api\/nutrient-libraries\/([^/]+)\/archive$/,
  );
  if (nutrientLibraryArchiveMatch && method === "POST") {
    const result = await app.nutrientController.archiveLibrary(
      decodeURIComponent(nutrientLibraryArchiveMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientLibraryRestoreMatch = pathname.match(
    /^\/api\/nutrient-libraries\/([^/]+)\/restore$/,
  );
  if (nutrientLibraryRestoreMatch && method === "POST") {
    const result = await app.nutrientController.restoreLibrary(
      decodeURIComponent(nutrientLibraryRestoreMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientLibraryMatch = pathname.match(
    /^\/api\/nutrient-libraries\/([^/]+)$/,
  );
  if (nutrientLibraryMatch && method === "GET") {
    const result = await app.nutrientController.getLibrary(
      decodeURIComponent(nutrientLibraryMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (nutrientLibraryMatch && method === "PATCH") {
    const result = await app.nutrientController.updateLibrary(
      decodeURIComponent(nutrientLibraryMatch[1] ?? ""),
      toUpdateNutrientLibraryInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientContentArchiveMatch = pathname.match(
    /^\/api\/nutrient-contents\/([^/]+)\/archive$/,
  );
  if (nutrientContentArchiveMatch && method === "POST") {
    const result = await app.nutrientController.archiveContent(
      decodeURIComponent(nutrientContentArchiveMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientContentRestoreMatch = pathname.match(
    /^\/api\/nutrient-contents\/([^/]+)\/restore$/,
  );
  if (nutrientContentRestoreMatch && method === "POST") {
    const result = await app.nutrientController.restoreContent(
      decodeURIComponent(nutrientContentRestoreMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const nutrientContentMatch = pathname.match(
    /^\/api\/nutrient-contents\/([^/]+)$/,
  );
  if (nutrientContentMatch && method === "GET") {
    const result = await app.nutrientController.getContent(
      decodeURIComponent(nutrientContentMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (nutrientContentMatch && method === "PATCH") {
    const result = await app.nutrientController.updateContent(
      decodeURIComponent(nutrientContentMatch[1] ?? ""),
      toUpdateNutrientContentInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const referableNutrientsMatch = pathname.match(
    /^\/api\/seeds\/([^/]+)\/referable-nutrients$/,
  );
  if (referableNutrientsMatch && method === "GET") {
    const result = await app.nutrientController.listReferableContents(
      decodeURIComponent(referableNutrientsMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const workspaceSnapshotMatch = pathname.match(
    /^\/api\/seeds\/([^/]+)\/workspace$/,
  );
  if (workspaceSnapshotMatch && method === "GET") {
    const result = await app.workspaceController.getWorkspaceSnapshot(
      decodeURIComponent(workspaceSnapshotMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/seeds" && method === "GET") {
    const result = await app.seedController.listActiveSeeds();
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/growth-tasks" && method === "POST") {
    const result = await app.growthController.startGrowthTask(
      toStartGrowthTaskInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/publication-records" && method === "POST") {
    const result = await app.publicationController.createPublicationRecord(
      toCreatePublicationRecordInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const publicationRecordMatch = pathname.match(
    /^\/api\/publication-records\/([^/]+)$/,
  );
  if (publicationRecordMatch && method === "GET") {
    const result = await app.publicationController.getPublicationRecord(
      decodeURIComponent(publicationRecordMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (publicationRecordMatch && method === "PATCH") {
    const result = await app.publicationController.editPublicationRecord(
      decodeURIComponent(publicationRecordMatch[1] ?? ""),
      toUpdatePublicationRecordInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const publicationMonitorMatch = pathname.match(
    /^\/api\/publication-records\/([^/]+)\/monitor$/,
  );
  if (publicationMonitorMatch && method === "POST") {
    const result = await app.feedbackController.attachManualMonitor(
      decodeURIComponent(publicationMonitorMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const publicationFeedbackMatch = pathname.match(
    /^\/api\/publication-records\/([^/]+)\/feedback$/,
  );
  if (publicationFeedbackMatch && method === "GET") {
    const result = await app.feedbackController.getFeedbackHistory(
      decodeURIComponent(publicationFeedbackMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const publicationFeedbackSnapshotsMatch = pathname.match(
    /^\/api\/publication-records\/([^/]+)\/feedback-snapshots$/,
  );
  if (publicationFeedbackSnapshotsMatch && method === "POST") {
    const result = await app.feedbackController.createFeedbackSnapshot(
      decodeURIComponent(publicationFeedbackSnapshotsMatch[1] ?? ""),
      toCreateFeedbackSnapshotInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const feedbackSnapshotMatch = pathname.match(
    /^\/api\/feedback-snapshots\/([^/]+)$/,
  );
  if (feedbackSnapshotMatch && method === "PATCH") {
    const result = await app.feedbackController.editFeedbackSnapshot(
      decodeURIComponent(feedbackSnapshotMatch[1] ?? ""),
      toUpdateFeedbackSnapshotInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const growthTaskMatch = pathname.match(/^\/api\/growth-tasks\/([^/]+)$/);
  if (growthTaskMatch && method === "GET") {
    const result = await app.growthController.getGrowthTask(
      decodeURIComponent(growthTaskMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const growthSourceRetryMatch = pathname.match(
    /^\/api\/growth-sources\/([^/]+)\/([^/]+)\/retry$/,
  );
  if (growthSourceRetryMatch && method === "POST") {
    const result = await app.growthController.retryLatestFailedTask(
      toGrowthSourceNodeRef(growthSourceRetryMatch[1], growthSourceRetryMatch[2]),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const growthSourceStatusMatch = pathname.match(
    /^\/api\/growth-sources\/([^/]+)\/([^/]+)\/status$/,
  );
  if (growthSourceStatusMatch && method === "GET") {
    const result = await app.growthController.getSourceStatus(
      toGrowthSourceNodeRef(growthSourceStatusMatch[1], growthSourceStatusMatch[2]),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const growthSourceFailedInputMatch = pathname.match(
    /^\/api\/growth-sources\/([^/]+)\/([^/]+)\/failed-input$/,
  );
  if (growthSourceFailedInputMatch && method === "GET") {
    const result = await app.growthController.getLatestFailedInput(
      toGrowthSourceNodeRef(
        growthSourceFailedInputMatch[1],
        growthSourceFailedInputMatch[2],
      ),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedGeneLibraryMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/gene-library$/);
  if (seedGeneLibraryMatch && method === "GET") {
    const result = await app.geneController.getSeedGeneLibrary(
      decodeURIComponent(seedGeneLibraryMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (seedGeneLibraryMatch && method === "POST") {
    const result = await app.geneController.prepareSeedGeneLibrary(
      decodeURIComponent(seedGeneLibraryMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedGeneRemindersMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/gene-reminders$/);
  if (seedGeneRemindersMatch && method === "GET") {
    const result = await app.geneController.listPendingReminders(
      decodeURIComponent(seedGeneRemindersMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (seedGeneRemindersMatch && method === "POST") {
    const result = await app.geneController.createReminderFromFruitEvidence(
      decodeURIComponent(seedGeneRemindersMatch[1] ?? ""),
      toCreateGeneReminderInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const geneReminderIgnoreMatch = pathname.match(/^\/api\/gene-reminders\/([^/]+)\/ignore$/);
  if (geneReminderIgnoreMatch && method === "POST") {
    const result = await app.geneController.ignoreReminder(
      decodeURIComponent(geneReminderIgnoreMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedGeneTaskMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/gene-extraction-tasks$/);
  if (seedGeneTaskMatch && method === "POST") {
    const result = await app.geneController.startExtractionTask(
      decodeURIComponent(seedGeneTaskMatch[1] ?? ""),
      toStartGeneExtractionInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedGeneSuggestionsMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/gene-suggestions$/);
  if (seedGeneSuggestionsMatch && method === "GET") {
    const result = await app.geneController.listPendingSuggestions(
      decodeURIComponent(seedGeneSuggestionsMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const geneSuggestionConfirmMatch = pathname.match(/^\/api\/gene-suggestions\/([^/]+)\/confirm$/);
  if (geneSuggestionConfirmMatch && method === "POST") {
    const result = await app.geneController.confirmSuggestion(
      decodeURIComponent(geneSuggestionConfirmMatch[1] ?? ""),
      toConfirmGeneSuggestionInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const geneSuggestionDismissMatch = pathname.match(/^\/api\/gene-suggestions\/([^/]+)\/dismiss$/);
  if (geneSuggestionDismissMatch && method === "POST") {
    const result = await app.geneController.dismissSuggestion(
      decodeURIComponent(geneSuggestionDismissMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const geneSuggestionMatch = pathname.match(/^\/api\/gene-suggestions\/([^/]+)$/);
  if (geneSuggestionMatch && method === "GET") {
    const result = await app.geneController.getSuggestion(
      decodeURIComponent(geneSuggestionMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (geneSuggestionMatch && method === "PATCH") {
    const result = await app.geneController.editSuggestion(
      decodeURIComponent(geneSuggestionMatch[1] ?? ""),
      toEditGeneSuggestionInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedGeneReferableInsightsMatch = pathname.match(
    /^\/api\/seeds\/([^/]+)\/gene-insights\/referable$/,
  );
  if (seedGeneReferableInsightsMatch && method === "GET") {
    const result = await app.geneController.listReferableInsights(
      decodeURIComponent(seedGeneReferableInsightsMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedGeneInsightsMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/gene-insights$/);
  if (seedGeneInsightsMatch && method === "GET") {
    const result = await app.geneController.listInsights(
      decodeURIComponent(seedGeneInsightsMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const geneInsightArchiveMatch = pathname.match(/^\/api\/gene-insights\/([^/]+)\/archive$/);
  if (geneInsightArchiveMatch && method === "POST") {
    const result = await app.geneController.archiveInsight(
      decodeURIComponent(geneInsightArchiveMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const geneInsightMatch = pathname.match(/^\/api\/gene-insights\/([^/]+)$/);
  if (geneInsightMatch && method === "GET") {
    const result = await app.geneController.getInsight(
      decodeURIComponent(geneInsightMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (geneInsightMatch && method === "PATCH") {
    const result = await app.geneController.editInsight(
      decodeURIComponent(geneInsightMatch[1] ?? ""),
      toEditGeneInsightInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/generators" && method === "GET") {
    const result = await app.generatorController.listGenerators();
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/generators" && method === "POST") {
    const result = await app.generatorController.importGenerator(
      toImportGeneratorInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/generators/selectable" && method === "GET") {
    const result = await app.generatorController.listSelectableGenerators();
    sendJson(response, result.status, result.body);
    return true;
  }

  const generatorEnableMatch = pathname.match(/^\/api\/generators\/([^/]+)\/enable$/);
  if (generatorEnableMatch && method === "POST") {
    const result = await app.generatorController.enableGenerator(
      decodeURIComponent(generatorEnableMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const generatorDisableMatch = pathname.match(/^\/api\/generators\/([^/]+)\/disable$/);
  if (generatorDisableMatch && method === "POST") {
    const result = await app.generatorController.disableGenerator(
      decodeURIComponent(generatorDisableMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const generatorReuploadMatch = pathname.match(/^\/api\/generators\/([^/]+)\/reupload$/);
  if (generatorReuploadMatch && method === "POST") {
    const result = await app.generatorController.reuploadGeneratorSkill(
      decodeURIComponent(generatorReuploadMatch[1] ?? ""),
      toReuploadGeneratorInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const generatorMatch = pathname.match(/^\/api\/generators\/([^/]+)$/);
  if (generatorMatch && method === "GET") {
    const result = await app.generatorController.getGenerator(
      decodeURIComponent(generatorMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const fruitContentMatch = pathname.match(/^\/api\/fruits\/([^/]+)\/content$/);
  if (fruitContentMatch && method === "PATCH") {
    const result = await app.fruitController.updateFruitContent(
      decodeURIComponent(fruitContentMatch[1] ?? ""),
      toUpdateFruitContentInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const fruitSelectMatch = pathname.match(/^\/api\/fruits\/([^/]+)\/select$/);
  if (fruitSelectMatch && method === "POST") {
    const result = await app.fruitController.selectFruit(
      decodeURIComponent(fruitSelectMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const fruitEliminateMatch = pathname.match(/^\/api\/fruits\/([^/]+)\/eliminate$/);
  if (fruitEliminateMatch && method === "POST") {
    const result = await app.fruitController.eliminateFruit(
      decodeURIComponent(fruitEliminateMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const fruitRestoreMatch = pathname.match(/^\/api\/fruits\/([^/]+)\/restore-candidate$/);
  if (fruitRestoreMatch && method === "POST") {
    const result = await app.fruitController.restoreFruitToCandidate(
      decodeURIComponent(fruitRestoreMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const fruitPublicationRecordsMatch = pathname.match(
    /^\/api\/fruits\/([^/]+)\/publication-records$/,
  );
  if (fruitPublicationRecordsMatch && method === "GET") {
    const result = await app.publicationController.listPublicationRecordsByFruit(
      decodeURIComponent(fruitPublicationRecordsMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const fruitMatch = pathname.match(/^\/api\/fruits\/([^/]+)$/);
  if (fruitMatch && method === "GET") {
    const result = await app.fruitController.getFruit(
      decodeURIComponent(fruitMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/seeds" && method === "POST") {
    const result = await app.seedController.createSeed(
      toCreateSeedInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  if (pathname === "/api/seeds/archived" && method === "GET") {
    const result = await app.seedController.listArchivedSeeds();
    sendJson(response, result.status, result.body);
    return true;
  }

  const archiveMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/archive$/);
  if (archiveMatch && method === "POST") {
    const result = await app.seedController.archiveSeed(decodeURIComponent(archiveMatch[1] ?? ""));
    sendJson(response, result.status, result.body);
    return true;
  }

  const restoreMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/restore$/);
  if (restoreMatch && method === "POST") {
    const result = await app.seedController.restoreSeed(decodeURIComponent(restoreMatch[1] ?? ""));
    sendJson(response, result.status, result.body);
    return true;
  }

  const rootNodeMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/root-node$/);
  if (rootNodeMatch && method === "GET") {
    const result = await app.seedController.getRootNode(decodeURIComponent(rootNodeMatch[1] ?? ""));
    sendJson(response, result.status, result.body);
    return true;
  }

  const eligibilityMatch = pathname.match(/^\/api\/seeds\/([^/]+)\/growth-eligibility$/);
  if (eligibilityMatch && method === "GET") {
    const result = await app.seedController.getGrowthEligibility(
      decodeURIComponent(eligibilityMatch[1] ?? ""),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  const seedMatch = pathname.match(/^\/api\/seeds\/([^/]+)$/);
  if (seedMatch && method === "GET") {
    const result = await app.seedController.getSeed(decodeURIComponent(seedMatch[1] ?? ""));
    sendJson(response, result.status, result.body);
    return true;
  }

  if (seedMatch && method === "PATCH") {
    const result = await app.seedController.updateSeed(
      decodeURIComponent(seedMatch[1] ?? ""),
      toUpdateSeedInput(await readJsonBody(request)),
    );
    sendJson(response, result.status, result.body);
    return true;
  }

  return false;
}

function toImportGeneratorInput(body: Record<string, unknown>): {
  name: string;
  description: string;
  zipBuffer: Buffer;
} {
  if (
    typeof body.name !== "string" ||
    typeof body.description !== "string" ||
    typeof body.zipBase64 !== "string"
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "导入生成器需要提供名称、描述和 zipBase64",
      400,
    );
  }

  return {
    name: body.name,
    description: body.description,
    zipBuffer: decodeBase64Zip(body.zipBase64),
  };
}

function toCreateNutrientLibraryInput(body: Record<string, unknown>): {
  name: string;
  description?: string;
  scope: NutrientLibraryScope;
  seedId?: string | null;
} {
  if (
    typeof body.name !== "string" ||
    (body.scope !== "public" && body.scope !== "seed_scoped")
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "创建营养库需要提供名称和有效作用域",
      400,
    );
  }
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new ApplicationError("VALIDATION_ERROR", "营养库描述必须是字符串", 400);
  }
  if (
    body.seedId !== undefined &&
    body.seedId !== null &&
    typeof body.seedId !== "string"
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "归属种子必须是字符串", 400);
  }
  return {
    name: body.name,
    description: body.description,
    scope: body.scope,
    seedId: body.seedId,
  };
}

function toUpdateNutrientLibraryInput(body: Record<string, unknown>): {
  name?: string;
  description?: string;
} {
  rejectUnexpectedFields(body, ["name", "description"]);
  const input: { name?: string; description?: string } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      throw new ApplicationError("VALIDATION_ERROR", "营养库名称必须是字符串", 400);
    }
    input.name = body.name;
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      throw new ApplicationError("VALIDATION_ERROR", "营养库描述必须是字符串", 400);
    }
    input.description = body.description;
  }
  return input;
}

function toCreateNutrientContentInput(body: Record<string, unknown>): {
  title: string;
  markdown: string;
} {
  if (typeof body.title !== "string" || typeof body.markdown !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "新增营养内容需要提供标题和 Markdown 正文",
      400,
    );
  }
  return {
    title: body.title,
    markdown: body.markdown,
  };
}

function toUpdateNutrientContentInput(body: Record<string, unknown>): {
  title?: string;
  markdown?: string;
} {
  rejectUnexpectedFields(body, ["title", "markdown"]);
  const input: { title?: string; markdown?: string } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      throw new ApplicationError("VALIDATION_ERROR", "营养内容标题必须是字符串", 400);
    }
    input.title = body.title;
  }
  if (body.markdown !== undefined) {
    if (typeof body.markdown !== "string") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "营养内容 Markdown 正文必须是字符串",
        400,
      );
    }
    input.markdown = body.markdown;
  }
  return input;
}

function toListNutrientLibrariesInput(
  searchParams: URLSearchParams,
): {
  scope?: NutrientLibraryScope;
  archiveState?: NutrientArchiveState;
  seedId?: string;
} {
  const scope = searchParams.get("scope");
  const archiveState = searchParams.get("archiveState");
  return {
    scope: parseNutrientScope(scope),
    archiveState: parseNutrientArchiveState(archiveState),
    seedId: searchParams.get("seedId") ?? undefined,
  };
}

function toListNutrientContentsInput(
  searchParams: URLSearchParams,
): {
  archiveState?: NutrientArchiveState;
} {
  return {
    archiveState: parseNutrientArchiveState(searchParams.get("archiveState")),
  };
}

function parseNutrientScope(
  value: string | null,
): NutrientLibraryScope | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }
  if (value !== "public" && value !== "seed_scoped") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "营养库作用域必须是 public 或 seed_scoped",
      400,
    );
  }
  return value;
}

function parseNutrientArchiveState(
  value: string | null,
): NutrientArchiveState | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }
  if (value !== "active" && value !== "archived") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "归档状态必须是 active 或 archived",
      400,
    );
  }
  return value;
}

function toReuploadGeneratorInput(body: Record<string, unknown>): {
  zipBuffer: Buffer;
} {
  if (typeof body.zipBase64 !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "重新上传生成器需要提供 zipBase64",
      400,
    );
  }

  return {
    zipBuffer: decodeBase64Zip(body.zipBase64),
  };
}

function toCreateSeedInput(body: Record<string, unknown>): {
  title: string;
  markdown: string;
} {
  if (typeof body.title !== "string" || typeof body.markdown !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "创建种子需要提供标题和 Markdown 正文",
      400,
    );
  }

  return {
    title: body.title,
    markdown: body.markdown,
  };
}

function toCreatePublicationRecordInput(body: Record<string, unknown>): {
  fruitId: string;
  publicationTarget: string;
  publicationEvidence: string;
  publicationNote?: string;
} {
  rejectUnexpectedFields(body, [
    "fruitId",
    "publicationTarget",
    "publicationEvidence",
    "publicationNote",
  ]);
  if (
    typeof body.fruitId !== "string" ||
    typeof body.publicationTarget !== "string" ||
    typeof body.publicationEvidence !== "string"
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Creating a publication record requires fruitId, publicationTarget, and publicationEvidence",
      400,
    );
  }
  if (
    body.publicationNote !== undefined &&
    typeof body.publicationNote !== "string"
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Publication note must be a string",
      400,
    );
  }
  return {
    fruitId: body.fruitId,
    publicationTarget: body.publicationTarget,
    publicationEvidence: body.publicationEvidence,
    publicationNote: body.publicationNote,
  };
}

function toUpdatePublicationRecordInput(body: Record<string, unknown>): {
  publicationTarget?: string;
  publicationEvidence?: string;
  publicationNote?: string;
} {
  rejectUnexpectedFields(body, [
    "publicationTarget",
    "publicationEvidence",
    "publicationNote",
  ]);
  const input: {
    publicationTarget?: string;
    publicationEvidence?: string;
    publicationNote?: string;
  } = {};

  if (body.publicationTarget !== undefined) {
    if (typeof body.publicationTarget !== "string") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Publication target must be a string",
        400,
      );
    }
    input.publicationTarget = body.publicationTarget;
  }
  if (body.publicationEvidence !== undefined) {
    if (typeof body.publicationEvidence !== "string") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Publication evidence must be a string",
        400,
      );
    }
    input.publicationEvidence = body.publicationEvidence;
  }
  if (body.publicationNote !== undefined) {
    if (typeof body.publicationNote !== "string") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Publication note must be a string",
        400,
      );
    }
    input.publicationNote = body.publicationNote;
  }
  return input;
}

function toCreateFeedbackSnapshotInput(body: Record<string, unknown>): {
  performanceData: Record<string, unknown>;
  userObservation?: string;
  capturedAt?: string;
} {
  rejectUnexpectedFields(body, [
    "performanceData",
    "userObservation",
    "capturedAt",
  ]);
  if (!isPlainRecord(body.performanceData)) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Creating a feedback snapshot requires structured performanceData",
      400,
    );
  }
  if (
    body.userObservation !== undefined &&
    typeof body.userObservation !== "string"
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "User observation must be a string",
      400,
    );
  }
  if (body.capturedAt !== undefined && typeof body.capturedAt !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Captured time must be a string",
      400,
    );
  }
  return {
    performanceData: body.performanceData,
    userObservation: body.userObservation,
    capturedAt: body.capturedAt,
  };
}

function toUpdateFeedbackSnapshotInput(body: Record<string, unknown>): {
  performanceData?: Record<string, unknown>;
  userObservation?: string;
  capturedAt?: string;
} {
  rejectUnexpectedFields(body, [
    "performanceData",
    "userObservation",
    "capturedAt",
  ]);
  const input: {
    performanceData?: Record<string, unknown>;
    userObservation?: string;
    capturedAt?: string;
  } = {};
  if (body.performanceData !== undefined) {
    if (!isPlainRecord(body.performanceData)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Performance data must be a structured object",
        400,
      );
    }
    input.performanceData = body.performanceData;
  }
  if (body.userObservation !== undefined) {
    if (typeof body.userObservation !== "string") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "User observation must be a string",
        400,
      );
    }
    input.userObservation = body.userObservation;
  }
  if (body.capturedAt !== undefined) {
    if (typeof body.capturedAt !== "string") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Captured time must be a string",
        400,
      );
    }
    input.capturedAt = body.capturedAt;
  }
  return input;
}

function toStartGrowthTaskInput(body: Record<string, unknown>): {
  seedId: string;
  sourceNodeRef: GrowthSourceNodeRef;
  userInput?: string;
  generatorId: string;
  fruitCount?: number;
  nutrientRefs?: GrowthResourceRef[];
  geneRefs?: GrowthResourceRef[];
  detailParams?: Record<string, unknown>;
} {
  if (
    typeof body.seedId !== "string" ||
    typeof body.generatorId !== "string" ||
    typeof body.sourceNodeRef !== "object" ||
    body.sourceNodeRef === null
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "发起枝化生长需要提供 seedId、sourceNodeRef 和 generatorId",
      400,
    );
  }
  return {
    seedId: body.seedId,
    sourceNodeRef: toSourceNodeRef(body.sourceNodeRef),
    userInput: typeof body.userInput === "string" ? body.userInput : undefined,
    generatorId: body.generatorId,
    fruitCount: typeof body.fruitCount === "number" ? body.fruitCount : undefined,
    nutrientRefs: toGrowthResourceRefs(body.nutrientRefs, "nutrient"),
    geneRefs: toGrowthResourceRefs(body.geneRefs, "gene"),
    detailParams: toOptionalRecord(body.detailParams),
  };
}

function toGrowthSourceNodeRef(
  rawNodeType: string | undefined,
  rawNodeId: string | undefined,
): GrowthSourceNodeRef {
  const nodeType = decodeURIComponent(rawNodeType ?? "");
  const nodeId = decodeURIComponent(rawNodeId ?? "");
  if (nodeType !== "seed" && nodeType !== "fruit") {
    throw new ApplicationError("VALIDATION_ERROR", "来源节点类型不正确", 400);
  }
  return {
    nodeType,
    nodeId,
  };
}

function toSourceNodeRef(value: object): GrowthSourceNodeRef {
  const record = value as Record<string, unknown>;
  if (
    (record.nodeType !== "seed" && record.nodeType !== "fruit") ||
    typeof record.nodeId !== "string"
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "来源节点格式不正确", 400);
  }
  return {
    nodeType: record.nodeType,
    nodeId: record.nodeId,
  };
}

function toGrowthResourceRefs(
  value: unknown,
  resourceType: GrowthResourceRef["resourceType"],
): GrowthResourceRef[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", "引用资源格式不正确", 400);
  }
  return value.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      (item as GrowthResourceRef).resourceType !== resourceType ||
      typeof (item as GrowthResourceRef).resourceId !== "string"
    ) {
      throw new ApplicationError("VALIDATION_ERROR", "引用资源格式不正确", 400);
    }
    return {
      resourceType,
      resourceId: (item as GrowthResourceRef).resourceId,
    };
  });
}

function toOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", "枝化生长详情参数格式不正确", 400);
  }
  return value as Record<string, unknown>;
}

function toUpdateSeedInput(body: Record<string, unknown>): {
  title?: string;
  markdown?: string;
} {
  const input: {
    title?: string;
    markdown?: string;
  } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      throw new ApplicationError("VALIDATION_ERROR", "种子标题必须是字符串", 400);
    }
    input.title = body.title;
  }

  if (body.markdown !== undefined) {
    if (typeof body.markdown !== "string") {
      throw new ApplicationError("VALIDATION_ERROR", "种子 Markdown 正文必须是字符串", 400);
    }
    input.markdown = body.markdown;
  }

  return input;
}

function toUpdateFruitContentInput(body: Record<string, unknown>): {
  markdown: string;
} {
  if (typeof body.markdown !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "编辑果实需要提供 Markdown 正文",
      400,
    );
  }

  return {
    markdown: body.markdown,
  };
}

function toCreateGeneReminderInput(body: Record<string, unknown>): {
  fruitId: string;
  action: "selected" | "eliminated";
} {
  if (
    typeof body.fruitId !== "string" ||
    (body.action !== "selected" && body.action !== "eliminated")
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "创建汲取提醒需要提供 fruitId 和 action",
      400,
    );
  }
  return {
    fruitId: body.fruitId,
    action: body.action,
  };
}

function toStartGeneExtractionInput(body: Record<string, unknown>): {
  reminderId?: string;
  evidenceSources: Array<{
    sourceType: "fruit_selected" | "fruit_eliminated" | "publication" | "feedback";
    sourceId: string;
    strength: "weak" | "medium" | "strong";
  }>;
} {
  const evidenceSources = Array.isArray(body.evidenceSources)
    ? body.evidenceSources
    : [];
  return {
    reminderId: typeof body.reminderId === "string" ? body.reminderId : undefined,
    evidenceSources: evidenceSources.map(toGeneEvidenceSource),
  };
}

function toGeneEvidenceSource(value: unknown): {
  sourceType: "fruit_selected" | "fruit_eliminated" | "publication" | "feedback";
  sourceId: string;
  strength: "weak" | "medium" | "strong";
} {
  if (
    typeof value !== "object" ||
    value === null ||
    !("sourceType" in value) ||
    !("sourceId" in value) ||
    !("strength" in value)
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "证据来源格式不正确", 400);
  }
  const record = value as Record<string, unknown>;
  if (
    (record.sourceType !== "fruit_selected" &&
      record.sourceType !== "fruit_eliminated" &&
      record.sourceType !== "publication" &&
      record.sourceType !== "feedback") ||
    typeof record.sourceId !== "string" ||
    (record.strength !== "weak" &&
      record.strength !== "medium" &&
      record.strength !== "strong")
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "证据来源格式不正确", 400);
  }
  return {
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    strength: record.strength,
  };
}

function toEditGeneSuggestionInput(body: Record<string, unknown>): {
  title: string;
  bodyMarkdown: string;
  lineage?: string;
  niche?: string;
} {
  if (typeof body.title !== "string" || typeof body.bodyMarkdown !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "编辑基因建议需要提供标题和 Markdown 正文",
      400,
    );
  }
  return {
    title: body.title,
    bodyMarkdown: body.bodyMarkdown,
    lineage: typeof body.lineage === "string" ? body.lineage : undefined,
    niche: typeof body.niche === "string" ? body.niche : undefined,
  };
}

function toConfirmGeneSuggestionInput(body: Record<string, unknown>): {
  title?: string;
  bodyMarkdown?: string;
  lineage?: string;
  niche?: string;
} {
  return {
    title: typeof body.title === "string" ? body.title : undefined,
    bodyMarkdown:
      typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : undefined,
    lineage: typeof body.lineage === "string" ? body.lineage : undefined,
    niche: typeof body.niche === "string" ? body.niche : undefined,
  };
}

function toEditGeneInsightInput(body: Record<string, unknown>): {
  bodyMarkdown: string;
} {
  if (typeof body.bodyMarkdown !== "string") {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "编辑基因经验需要提供 Markdown 正文",
      400,
    );
  }
  return {
    bodyMarkdown: body.bodyMarkdown,
  };
}

function decodeBase64Zip(zipBase64: string): Buffer {
  try {
    return Buffer.from(zipBase64, "base64");
  } catch {
    throw new ApplicationError("VALIDATION_ERROR", "zipBase64 格式不正确", 400);
  }
}

function rejectUnexpectedFields(
  body: Record<string, unknown>,
  allowedFields: string[],
): void {
  const allowed = new Set(allowedFields);
  const unexpected = Object.keys(body).find((field) => !allowed.has(field));
  if (unexpected !== undefined) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      `Unexpected field: ${unexpected}`,
      400,
    );
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    ...corsHeaders,
    "content-type": "application/json",
  });
  response.end(body === null ? "" : JSON.stringify(body));
}

server.listen(app.config.port, () => {
  console.log(`Content Forest backend started on http://localhost:${app.config.port}`);
  console.log(`Content root: ${app.config.contentRootDir}`);
  console.log(`Database: ${app.config.databasePath}`);
});

function shutdown(): void {
  server.close(() => {
    app.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
