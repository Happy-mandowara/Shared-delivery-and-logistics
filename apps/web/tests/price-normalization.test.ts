import assert from "assert";
import { parsePrice, formatCurrency } from "@nationx/shared";

function runPriceTests() {
  console.log("=== Testing Price Normalization & Currency Formatting ===");

  // 1. Numeric strings
  assert.strictEqual(parsePrice("240.00"), 240);
  assert.strictEqual(parsePrice("19.99"), 19.99);
  assert.strictEqual(parsePrice("0.00"), 0);
  assert.strictEqual(parsePrice("1250"), 1250);
  console.log("  [PASS] parses numeric strings from PostgreSQL DECIMAL/NUMERIC types correctly");

  // 2. Numbers
  assert.strictEqual(parsePrice(240), 240);
  assert.strictEqual(parsePrice(19.99), 19.99);
  assert.strictEqual(parsePrice(0), 0);
  console.log("  [PASS] handles primitive number types without distortion");

  // 3. Null/undefined/NaN
  assert.strictEqual(parsePrice(null), null);
  assert.strictEqual(parsePrice(undefined), null);
  assert.strictEqual(parsePrice(""), null);
  assert.strictEqual(parsePrice("not_a_number"), null);
  assert.strictEqual(parsePrice(NaN), null);
  assert.strictEqual(parsePrice(Infinity), null);
  console.log("  [PASS] safely handles null, undefined, empty, and invalid values");

  // 4. Currency formatting
  assert.strictEqual(formatCurrency("240.00"), "₹240.00");
  assert.strictEqual(formatCurrency(240), "₹240.00");
  assert.strictEqual(formatCurrency("19.5"), "₹19.50");
  assert.strictEqual(formatCurrency(0), "₹0.00");
  console.log("  [PASS] formats valid prices into INR currency strings");

  // 5. Fallback notice
  assert.strictEqual(formatCurrency(null), "Price not confirmed");
  assert.strictEqual(formatCurrency(undefined), "Price not confirmed");
  assert.strictEqual(formatCurrency("invalid"), "Price not confirmed");
  assert.strictEqual(formatCurrency(null, "Call for price"), "Call for price");
  console.log("  [PASS] formats invalid/null prices to unconfirmed notice instead of silently showing ₹0.00");

  // 6. Subtotal calculation without toFixed exception
  const rawPrice: any = "240.00"; // string from DB
  const parsed = parsePrice(rawPrice);
  assert.notStrictEqual(parsed, null);
  const qty = 3;
  const subtotal = parsed! * qty;
  assert.strictEqual(subtotal.toFixed(2), "720.00");
  assert.strictEqual(parsed!.toFixed(2), "240.00");
  console.log("  [PASS] safely calculates subtotal with quantity without throwing toFixed TypeError");

  // 7. Variants
  const variants = [
    { name: "Single / Half", price: "140.00" },
    { name: "Full Pack", price: "260.00" },
    { name: "Jumbo Family", price: 520 },
    { name: "Special Quotation", price: null },
  ];

  const formattedVariants = variants.map(v => ({
    name: v.name,
    parsedPrice: parsePrice(v.price),
    display: formatCurrency(v.price, "Call for price"),
  }));

  assert.strictEqual(formattedVariants[0].display, "₹140.00");
  assert.strictEqual(formattedVariants[1].display, "₹260.00");
  assert.strictEqual(formattedVariants[2].display, "₹520.00");
  assert.strictEqual(formattedVariants[3].display, "Call for price");
  assert.strictEqual(formattedVariants[3].parsedPrice, null);
  console.log("  [PASS] handles variant pricing correctly");

  console.log("\nALL PRICE NORMALIZATION TESTS PASSED!\n");
}

runPriceTests();
