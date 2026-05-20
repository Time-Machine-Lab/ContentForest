import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { DatabaseSync } from "node:sqlite";

const PRESERVED_TABLES = new Set([
  "generators",
  "nutrient_libraries",
  "nutrient_contents",
]);

const { values, positionals } = parseArgs({
  allowNegative: true,
  allowPositionals: true,
  options: {
    backup: { type: "boolean", default: true },
    "dry-run": { type: "boolean", default: false },
    vacuum: { type: "boolean", default: true },
  },
});

const databasePath = resolve(
  positionals[0] ??
    process.env.CONTENT_FOREST_DATABASE_PATH ??
    "data/app.sqlite",
);
const dryRun = values["dry-run"];
const shouldBackup = values.backup && !dryRun;
const shouldVacuum = values.vacuum && !dryRun;

if (!existsSync(databasePath)) {
  throw new Error(`Database does not exist: ${databasePath}`);
}

const backupPath = shouldBackup ? createBackup(databasePath) : null;
const database = new DatabaseSync(databasePath);

try {
  database.exec("PRAGMA busy_timeout = 5000");
  const before = countRows(database);
  const tables = listTables(database);
  const deleted = cleanTables(database, tables, dryRun);
  const after = dryRun ? projectCounts(before, deleted) : countRows(database);

  if (shouldVacuum) {
    database.exec("VACUUM");
  }

  printReport({
    databasePath,
    backupPath,
    dryRun,
    before,
    after,
    deleted,
  });
} finally {
  database.close();
}

function cleanTables(database, tables, dryRun) {
  const deleted = [];
  database.exec("PRAGMA foreign_keys = OFF");
  database.exec("BEGIN IMMEDIATE");

  try {
    for (const table of tables) {
      const changes = cleanTable(database, table);
      deleted.push({ table, rows: changes });
    }

    if (dryRun) {
      database.exec("ROLLBACK");
    } else {
      const foreignKeyIssues = database
        .prepare("PRAGMA foreign_key_check")
        .all();
      if (foreignKeyIssues.length > 0) {
        throw new Error(
          `Foreign key check failed: ${JSON.stringify(foreignKeyIssues)}`,
        );
      }
      database.exec("COMMIT");
    }
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.exec("PRAGMA foreign_keys = ON");
  }

  return deleted;
}

function cleanTable(database, table) {
  if (table === "generators") {
    return 0;
  }

  if (table === "nutrient_libraries") {
    return database
      .prepare("DELETE FROM nutrient_libraries WHERE scope <> 'public'")
      .run().changes;
  }

  if (table === "nutrient_contents") {
    return database
      .prepare(
        `DELETE FROM nutrient_contents
          WHERE NOT EXISTS (
            SELECT 1
            FROM nutrient_libraries
            WHERE nutrient_libraries.id = nutrient_contents.library_id
              AND nutrient_libraries.scope = 'public'
          )`,
      )
      .run().changes;
  }

  return database.prepare(`DELETE FROM ${quoteIdentifier(table)}`).run().changes;
}

function listTables(database) {
  return database
    .prepare(
      `SELECT name
        FROM sqlite_schema
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name`,
    )
    .all()
    .map((row) => row.name);
}

function countRows(database) {
  return Object.fromEntries(
    listTables(database).map((table) => [
      table,
      database
        .prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`)
        .get().count,
    ]),
  );
}

function projectCounts(before, deleted) {
  const after = { ...before };
  for (const { table, rows } of deleted) {
    after[table] = Math.max(0, (after[table] ?? 0) - rows);
  }
  return after;
}

function createBackup(databasePath) {
  const backupDir = join(dirname(databasePath), "backups");
  mkdirSync(backupDir, { recursive: true });
  const { name } = splitSqliteFilename(databasePath);
  const timestamp = new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
  const backupPath = join(backupDir, `${name}.before-clean-${timestamp}.sqlite`);
  copyFileSync(databasePath, backupPath);
  return backupPath;
}

function splitSqliteFilename(databasePath) {
  const baseName = databasePath.split(/[\\/]/).at(-1) ?? "app.sqlite";
  const sqliteSuffix = ".sqlite";
  if (!baseName.endsWith(sqliteSuffix)) {
    return { name: baseName };
  }
  return { name: baseName.slice(0, -sqliteSuffix.length) };
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function printReport({ databasePath, backupPath, dryRun, before, after, deleted }) {
  console.log(`Database: ${databasePath}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "cleaned"}`);
  if (backupPath !== null) {
    console.log(`Backup: ${backupPath}`);
    console.log(`Backup size: ${statSync(backupPath).size} bytes`);
  }

  console.log("");
  console.log("Deleted rows:");
  for (const { table, rows } of deleted) {
    if (PRESERVED_TABLES.has(table) && rows === 0) {
      continue;
    }
    console.log(`- ${table}: ${rows}`);
  }

  console.log("");
  console.log("Remaining rows:");
  for (const [table, count] of Object.entries(after)) {
    if (count > 0) {
      console.log(`- ${table}: ${count}`);
    }
  }

  console.log("");
  console.log("Preserved:");
  console.log(`- generators: ${after.generators ?? 0}`);
  console.log(`- public nutrient libraries: ${after.nutrient_libraries ?? 0}`);
  console.log(`- public nutrient contents: ${after.nutrient_contents ?? 0}`);

  if (dryRun) {
    const wouldDeleteTotal = Object.keys(before).reduce(
      (total, table) => total + before[table] - (after[table] ?? 0),
      0,
    );
    console.log("");
    console.log(`Dry run complete. Rows that would be deleted: ${wouldDeleteTotal}`);
  }
}
