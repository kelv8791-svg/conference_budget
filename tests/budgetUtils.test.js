import test from "node:test";
import assert from "node:assert/strict";
import { calculateGroupDays, getBudgetDetails, isConcludedStatus, migrateEventGroups } from "../src/utils/budgetUtils.js";
import { cleanAndMergeInventory } from "../src/store.js";

test("calculates inclusive and valid group days", () => {
  assert.equal(calculateGroupDays("2026-01-10", "2026-01-12"), 3);
  assert.equal(calculateGroupDays("2026-01-12", "2026-01-10"), 1);
});

test("migrates legacy budgets and calculates totals", () => {
  const budget = {
    orgName: "KRA",
    pax: 20,
    startDate: "2026-01-10",
    endDate: "2026-01-12",
    conferenceRate: 3500,
    subGroups: []
  };
  assert.equal(migrateEventGroups(budget).length, 1);
  assert.deepEqual(getBudgetDetails(budget).totalPax, 20);
  assert.equal(getBudgetDetails(budget).totalWorkshopAmount, 210000);
});

test("recognizes all concluded status variants", () => {
  assert.equal(isConcludedStatus("Completed"), true);
  assert.equal(isConcludedStatus("Completed (Surplus Returned)"), true);
  assert.equal(isConcludedStatus("Cancelled"), true);
  assert.equal(isConcludedStatus("Archived"), true);
  assert.equal(isConcludedStatus("Draft"), false);
});

test("preserves an intentionally empty inventory", () => {
  assert.deepEqual(cleanAndMergeInventory([]), []);
});

test("sanitizes invalid inventory numbers", () => {
  const result = cleanAndMergeInventory([
    { id: "X01", cat: "SUPERMARKET", name: "Example", unit: "PCS", price: -10, stock: -5 }
  ]);
  assert.equal(result[0].price, 0);
  assert.equal(result[0].stock, 0);
});
