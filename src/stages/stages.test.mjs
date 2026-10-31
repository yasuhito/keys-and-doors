import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const load = async (name) => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const index = await load('index.json');
const layers = await Promise.all(index.map(load));
const stages = layers.flatMap((layer) => layer.stages);
const counts = [4, 5, 5, 5, 7, 5, 5, 7, 9, 6, 5, 5, 7, 6, 3, 3, 4, 3, 4, 6, 10, 5];
const number = (n, width) => String(n).padStart(width, '0');

function checkFormula(formula) {
  assert.equal(typeof formula, 'string');
  assert.ok(formula.length > 0);
  assert.doesNotMatch(formula, /[!?#&|~]|->|<=|<[^ ]*[>]|\n/);
  let depth = 0;
  for (const character of formula) {
    if (character === '(') depth++;
    if (character === ')') depth--;
    assert.ok(depth >= 0, formula);
  }
  assert.equal(depth, 0, formula);
}

test('22 layers and 119 stages retain their explicit sequence', () => {
  assert.equal(index.length, 22);
  assert.equal(stages.length, 119);
  assert.deepEqual(layers.map((layer) => layer.stages.length), counts);
  layers.forEach((layer, i) => {
    assert.equal(index[i], `layer-${number(i + 1, 2)}.json`);
    assert.equal(layer.id, `layer-${number(i + 1, 2)}`);
    assert.deepEqual(Object.keys(layer).sort(), ['id', 'stages']);
  });
  assert.deepEqual(stages.map((stage) => stage.id),
    Array.from({ length: 119 }, (_, i) => `stage-${number(i + 1, 3)}`));
});

test('only structural metadata and nonempty formula tasks are stored', () => {
  const allowed = new Set(['id', 'kind', 'logic', 'induction', 'tasks', 'lemmas', 'definitions']);
  for (const stage of stages) {
    for (const key of Object.keys(stage)) assert.ok(allowed.has(key), key);
    assert.ok(['prove', 'countermodel', 'classify', 'infinite-countermodel'].includes(stage.kind));
    assert.ok(['classical', 'intuitionistic'].includes(stage.logic));
    assert.equal(typeof stage.induction, 'boolean');
    assert.ok(stage.tasks.length > 0);
    if (stage.kind !== 'classify') assert.equal(stage.tasks.length, 1);
    for (const task of stage.tasks) {
      assert.deepEqual(Object.keys(task).sort(), ['assumptions', 'goal']);
      checkFormula(task.goal);
      assert.ok(Array.isArray(task.assumptions));
      task.assumptions.forEach(checkFormula);
    }
    (stage.lemmas ?? []).forEach(checkFormula);
    for (const definition of stage.definitions ?? []) {
      assert.ok(['sets', 'additive-order'].includes(definition));
    }
  }
});

test('multipart questions, supplied lemmas and exceptional logic are retained', () => {
  assert.deepEqual(stages.filter((stage) => stage.kind === 'classify').map((stage) => stage.tasks.length),
    [4, 3, 3, 3, 2, 2]);
  assert.equal(stages.reduce((sum, stage) => sum + stage.tasks.length, 0), 130);
  assert.equal(stages.filter((stage) => stage.kind === 'infinite-countermodel').length, 1);
  assert.equal(stages.filter((stage) => stage.lemmas).length, 13);
  assert.equal(layers[4].stages[4].logic, 'intuitionistic');
  assert.equal(layers[4].stages[5].logic, 'intuitionistic');
  assert.ok(layers.slice(-2).flatMap((layer) => layer.stages).every((stage) => !stage.induction));
  assert.deepEqual(stages.at(-1).tasks.map((task) => task.goal),
    ['∀x.(0 + x = x)', '¬∀x.(0 + x = x)']);
});

test('Japanese map has one ordered row per stage with all formulas', async () => {
  const document = await readFile(new URL('../../docs/stage-map.md', import.meta.url), 'utf8');
  const rows = document.split('\n').filter((line) => /^\| .*\| stage-\d{3} \|/.test(line));
  assert.equal(rows.length, stages.length);
  stages.forEach((stage, i) => {
    assert.ok(rows[i].includes(`| ${stage.id} |`));
    for (const task of stage.tasks) {
      for (const formula of [task.goal, ...task.assumptions]) {
        assert.ok(rows[i].includes(`\`${formula}\``), `${stage.id}: ${formula}`);
      }
    }
    for (const formula of stage.lemmas ?? []) assert.ok(rows[i].includes(`\`${formula}\``));
    const cells = rows[i].split('|');
    assert.equal(cells.length, 8);
    const formulas = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    assert.deepEqual(formulas(cells[4]), stage.tasks.map((task) => task.goal), `${stage.id}: goal order`);
    assert.deepEqual(formulas(cells[5]), [...stage.tasks.flatMap((task) => task.assumptions), ...(stage.lemmas ?? [])], `${stage.id}: assumption and lemma order`);
  });
});
