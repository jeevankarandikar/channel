import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync(new URL('./game.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const readme = readFileSync(new URL('./README.md', import.meta.url), 'utf8');

assert.match(game, /tap_grid:\s*\{/, 'game.js should define a tap_grid alphabet');
assert.match(game, /tap:\s*\{[\s\S]*method:\s*'tap grid'/, 'game.js should define a tap grid channel mode');
assert.match(game, /TAP_GRID_SIZE\s*=\s*5/, 'tap grid should start as a 5x5 pilot');
assert.match(game, /function buildTapGrid/, 'game.js should render a dedicated tap grid');
assert.match(game, /data-tap-token/, 'tap grid cells should carry target tokens for pointer input');
assert.match(
  game,
  /data-tap-token[\s\S]{0,500}state\.awaitingStart\)[\s\S]{0,120}beginReadyRun\(\);[\s\S]{0,80}return;/,
  'tap grid pointer input should start the ready run before scoring',
);
assert.match(game, /startCalibrationRun\(target\.dataset\.chooseMode\)/, 'chooser cards should start the selected method');

assert.match(html, /choose your input/i, 'picker should ask the user to choose an input');
assert.match(html, /data-calibration-card="tap"/, 'calibration screen should include tap grid');
assert.match(html, /tablet|ipad|touchscreen/i, 'tap grid copy should point to a tablet / touchscreen');
assert.match(html, /data-action="start-scored"/, 'picker should offer a direct scored run');
assert.match(html, /data-pick-method="tap"/, 'picker should let the user select the tap grid');

assert.match(readme, /tap grid/, 'README should mention the tap grid modality');
assert.match(readme, /5x5|5 x 5/, 'README should document the 5x5 grid choice');

console.log('tap grid pilot checks passed');
