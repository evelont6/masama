import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateBill } from "../src/billing.js";

const base = { items: [{ id: "coffee", price: 10000 }], people: [{ id: "a" }, { id: "b" }, { id: "c" }], assignments: {}, taxMode: "percent", taxValue: 0, serviceMode: "percent", serviceValue: 0, discountValue: 0 };
test("rounded shares exactly match total", () => {
  const result = calculateBill(base);
  assert.equal(result.perPerson.reduce((sum, p) => sum + p.amount, 0), 10000);
});
test("only selected riders pay, with proportional charges", () => {
  const result = calculateBill({ ...base, assignments: { coffee: ["b"] }, taxValue: 10, serviceValue: 5, discountValue: 500 });
  assert.deepEqual(result.perPerson.map(p => p.amount), [0, 11000, 0]);
});
test("discount cannot create negative debts", () => {
  const result = calculateBill({ ...base, discountValue: 20000 });
  assert.equal(result.grandTotal, 0);
  assert.ok(result.perPerson.every(p => p.amount === 0));
});
test("empty bill remains zero", () => {
  assert.equal(calculateBill({ ...base, items: [] }).grandTotal, 0);
});
test("tiny totals split across many riders never produce negative amounts", () => {
  const result = calculateBill({ ...base, items: [{ id: "coffee", price: 2 }], people: ["a", "b", "c", "d"].map(id => ({ id })) });
  assert.deepEqual(result.perPerson.map(p => p.amount), [1, 1, 0, 0]);
});
test("removed or empty assignments fall back to current participants", () => {
  for (const ids of [["removed"], []]) {
    const result = calculateBill({ ...base, assignments: { coffee: ids } });
    assert.equal(result.perPerson.reduce((sum, p) => sum + p.subtotalShare, 0), 10000);
  }
});
