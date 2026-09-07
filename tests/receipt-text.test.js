import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, parseReceiptText } from '../src/receipt.js';

test('recognizes Indonesian thousands and currency decimal formats', () => {
  for (const input of ['15.000', '15,000', '15000', '15.000,00', '15,000.00', '15000.00']) assert.equal(parseMoney(input), 15000);
  assert.equal(parseMoney('12.34.56'), null);
});
test('extracts line totals, charges, discount, and printed total without counting payment twice', () => {
  const result = parseReceiptText('WARUNG MASAMA\n2 Nasi Goreng 25.000 50.000\nEs Teh 10.000\nSubtotal 60.000\nPajak 10% 6.000\nService 3.000\nDiskon 2.000\nTOTAL 67.000\nTUNAI 100.000\nKEMBALI 33.000\nTelp 081234567890');
  assert.deepEqual(result.items, [{name:'2 Nasi Goreng',price:50000},{name:'Es Teh',price:10000}]);
  assert.equal(result.tax_amount, 6000);
  assert.equal(result.service_amount, 3000);
  assert.equal(result.discount_amount, 2000);
  assert.equal(result.total, 67000);
});
test('keeps raw uncertain text and does not invent prices from percentages', () => {
  const raw = 'Pajak 11%\nEs Kopi Rp 18.000\nKasir Ani 12\nTanggal 07/09/2026\nRoti 12.34.56';
  const result = parseReceiptText(raw);
  assert.equal(result.text, raw);
  assert.deepEqual(result.items, [{name:'Es Kopi',price:18000}]);
  assert.equal(result.tax_amount, null);
});
