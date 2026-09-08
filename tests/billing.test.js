import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateBill } from "../src/billing.js";

const base = { items: [{ id: "coffee", price: 10000 }], people: [{ id: "a" }, { id: "b" }, { id: "c" }], assignments: {}, taxMode: "percent", taxValue: 0, serviceMode: "percent", serviceValue: 0, discountValue: 0 };
test('international bills settle exactly in currency minor units', () => {
  for (const [currency, price, expected] of [
    ['USD', 10, [3.34, 3.33, 3.33]],
    ['EUR', 0.02, [0.01, 0.01, 0]],
    ['JPY', 10, [4, 3, 3]],
    ['KWD', 1, [0.334, 0.333, 0.333]],
  ]) {
    const result = calculateBill({ ...base, currency, items: [{ id: 'coffee', price }] });
    assert.deepEqual(result.perPerson.map(p => p.amount), expected, currency);
    for (const person of result.perPerson) {
      const digits = currency === 'JPY' ? 0 : currency === 'KWD' ? 3 : 2;
      const unit = 10 ** digits;
      assert.equal(Math.round(person.breakdown.reduce((sum, item) => sum + Math.round(item.share * unit), 0) + person.roundingAdjustment * unit), Math.round(person.amount * unit));
    }
  }
});
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
test("each person includes item and charge breakdown details", () => {
  const result = calculateBill({
    items: [{ id: "shared", name: "Nasi", price: 30000 }, { id: "solo", name: "Es teh", price: 10000 }],
    people: [{ id: "a", name: "Ana" }, { id: "b", name: "Budi" }],
    assignments: { shared: ["a", "b"], solo: ["a"] },
    taxMode: "amount", taxValue: 4000,
    serviceMode: "amount", serviceValue: 2000,
    discountValue: 2000,
  });
  const ana = result.perPerson.find(person => person.id === "a");
  const budi = result.perPerson.find(person => person.id === "b");
  assert.deepEqual(ana.breakdown.map(item => [item.name, item.totalPrice, item.splitCount, item.share]), [
    ["Nasi", 30000, 2, 15000], ["Es teh", 10000, 1, 10000],
  ]);
  assert.deepEqual(budi.breakdown.map(item => [item.name, item.splitCount, item.share]), [["Nasi", 2, 15000]]);
  assert.equal(ana.taxShare + budi.taxShare, 4000);
  assert.equal(ana.serviceShare + budi.serviceShare, 2000);
  assert.equal(ana.discountShare + budi.discountShare, 2000);
});
