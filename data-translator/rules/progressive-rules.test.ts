import assert from "node:assert/strict";
import type { ManualMappingDraft } from "@/types/data-translator";
import { mappingFromSemantic, semanticFromField } from "@/data-translator/parser/semantic-classifier";
import { applyParameterizedRule, proposeParameterizedRule } from "@/data-translator/rules/progressive-rules";

function draft(header: string, confirmed = false): ManualMappingDraft {
  const semantic = semanticFromField(header, "mppt_voltage", {
    sourceUnit: "V",
    targetUnit: "V",
    transform: "number",
    confidence: confirmed ? 0.96 : 0.4,
  });
  return { ...mappingFromSemantic({ ...semantic, status: confirmed ? "confirmed" : "needs_review" }), id: header, semantic: { ...semantic, status: confirmed ? "confirmed" : "needs_review" } };
}

const mappings = ["Vpv1(V)", "Vpv2(V)", "Vpv3(V)", "Vpv20(V)", "VpvMax(V)", "VpvAvg(V)", "VpvTotal(V)"].map((header, index) =>
  index === 1 ? draft(header, true) : draft(header),
);

const proposal = proposeParameterizedRule({
  mapping: mappings[1],
  mappingIndex: 1,
  mappings,
  manufacturer: "Growatt",
  scope: "manufacturer",
});

assert.ok(proposal);
assert.deepEqual(
  proposal.matches.map((match) => match.sourceHeader),
  ["Vpv1(V)", "Vpv2(V)", "Vpv3(V)", "Vpv20(V)"],
);
assert.deepEqual(
  proposal.matches.map((match) => match.index),
  [1, 2, 3, 20],
);
assert.equal(proposal.matches.find((match) => match.sourceHeader === "Vpv2(V)")?.action, "conflict");

const result = applyParameterizedRule({ mappings, rule: proposal.rule, allowOverwriteConfirmed: false });
assert.equal(result.applied.length, 3);
assert.equal(result.mappings[0].semantic.index, 1);
assert.equal(result.mappings[3].semantic.index, 20);
