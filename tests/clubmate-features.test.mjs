import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateSessionShares, roundUpToThousand } from "../lib/billing.mjs";

test("rounds each attendee share up to the nearest thousand", () => {
  assert.equal(roundUpToThousand(71_080), 72_000);
  assert.equal(roundUpToThousand(70_400), 71_000);
  assert.equal(roundUpToThousand(71_000), 71_000);
});

test("splits court equally and shuttle by selected gender factor", () => {
  assert.deepEqual(calculateSessionShares({
    courtCost: 200_000,
    shuttleCost: 100_000,
    maleCount: 2,
    femaleCount: 2,
    maleFactor: 2,
  }), { male: 84_000, female: 67_000 });
});

test("ships invitation, ghost claim, safe RSVP and atomic finalization RPCs", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609030001_complete_clubmate_features.sql", import.meta.url), "utf8");
  for (const functionName of ["join_team", "claim_member", "create_member_claim_code", "rsvp_session", "finalize_session_costs"]) {
    assert.match(sql, new RegExp(`function public\\.${functionName}`));
  }
  assert.match(sql, /ceil\(/);
  assert.match(sql, /claim_code_expires_at/);
  assert.match(sql, /insert into storage\.buckets/);
});

test("allows INSERT RETURNING for the team owner before membership trigger completes", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609030003_fix_team_insert_returning_rls.sql", import.meta.url), "utf8");
  assert.match(sql, /owner_id\s*=\s*\(select auth\.uid\(\)\)/);
  assert.match(sql, /or public\.has_team_membership\(id\)/);
});
