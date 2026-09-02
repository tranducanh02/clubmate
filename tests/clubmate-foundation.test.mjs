import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses standard Next.js and Supabase SSR", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(packageJson.scripts.build, "next build");
  assert.ok(packageJson.dependencies.next);
  assert.ok(packageJson.dependencies["@supabase/ssr"]);
  assert.equal(packageJson.dependencies.vinext, undefined);
});

test("ships tenant RLS and immutable gender rules", async () => {
  const sql = await readFile(
    new URL("supabase/migrations/202609020001_initial_clubmate.sql", root),
    "utf8",
  );
  assert.match(sql, /enable row level security/);
  assert.match(sql, /is_team_member/);
  assert.match(sql, /is_team_owner/);
  assert.match(sql, /profiles_gender_immutable/);
  assert.match(sql, /participant_identity_check/);
});
