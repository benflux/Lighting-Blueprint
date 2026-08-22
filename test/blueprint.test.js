const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const BLUEPRINT_PATH = path.join(__dirname, '..', 'flux_lighting.yaml');

let passed = 0;
let failed = 0;

function assert(condition, testName, message) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}`);
    console.log(`    FAIL: ${message}`);
    failed++;
  }
}

function parseBlueprint() {
  const content = fs.readFileSync(BLUEPRINT_PATH, 'utf8');
  const customTypes = [
    new yaml.Type('!input', { kind: 'scalar', construct: (data) => ({ __input: data }) }),
    new yaml.Type('!input', { kind: 'sequence', construct: (data) => ({ __input: data }) }),
    new yaml.Type('!input', { kind: 'mapping', construct: (data) => ({ __input: data }) }),
  ];
  const schema = yaml.DEFAULT_SCHEMA.extend(customTypes);
  return yaml.load(content, { schema });
}

function findChooseBlocks(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findChooseBlocks(item, results);
    }
  } else {
    if (obj.choose !== undefined) {
      results.push(obj);
    }
    for (const key of Object.keys(obj)) {
      findChooseBlocks(obj[key], results);
    }
  }
  return results;
}

function findSequenceWithCondition(chooseBlock, conditionCheck) {
  if (!chooseBlock || !chooseBlock.choose) return null;
  for (const option of chooseBlock.choose) {
    if (option.conditions && option.conditions.some(conditionCheck)) {
      return option;
    }
  }
  return null;
}

function hasTripleSend(sequence) {
  if (!sequence) return false;
  
  function checkForRepeatCount3(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (Array.isArray(obj)) {
      return obj.some(item => checkForRepeatCount3(item));
    }
    if (obj.repeat && obj.repeat.count === 3) {
      return true;
    }
    return Object.values(obj).some(val => checkForRepeatCount3(val));
  }
  
  return checkForRepeatCount3(sequence);
}

function hasOccupiedCondition(option) {
  if (!option || !option.conditions) return false;
  return option.conditions.some(c => 
    c.condition === 'template' && 
    c.value_template && 
    c.value_template.includes('v_any_occupied')
  );
}

function getQuietServiceCall(sequence) {
  if (!sequence || !sequence.sequence) return null;
  for (const action of sequence.sequence) {
    if (action.service === 'light.turn_on' && action.data) {
      const data = action.data;
      if (data.brightness_pct && 
          typeof data.brightness_pct === 'string' && 
          data.brightness_pct.includes('v_quiet_brightness')) {
        return action;
      }
    }
  }
  return null;
}

function getNormalServiceCall(chooseBlock) {
  if (!chooseBlock) return null;
  if (chooseBlock.default) {
    for (const action of chooseBlock.default) {
      if (action.service === 'light.turn_on') {
        return action;
      }
    }
  }
  return null;
}

console.log('\n=== flux_lighting.yaml Blueprint Tests ===\n');

let blueprint;
try {
  blueprint = parseBlueprint();
  console.log('Blueprint parsed successfully.\n');
} catch (e) {
  console.error('Failed to parse blueprint:', e.message);
  process.exit(1);
}

const inputs = blueprint.blueprint.input;
const variables = blueprint.variables;
const action = blueprint.action;

console.log('Test Suite 1: Blank occupancy preserves Day/Evening/Night behaviour');
console.log('-'.repeat(60));

const occupancyInput = inputs.occupancy_sensors;
assert(
  occupancyInput && occupancyInput.default !== undefined,
  'occupancy_sensors has default value',
  'occupancy_sensors input should have a default'
);

assert(
  Array.isArray(occupancyInput.default) && occupancyInput.default.length === 0,
  'occupancy_sensors default is empty array',
  `Expected [], got: ${JSON.stringify(occupancyInput.default)}`
);

const vAnyOccupied = variables.v_any_occupied;
assert(
  vAnyOccupied && vAnyOccupied.includes('v_occupancy_sensors | length == 0'),
  'v_any_occupied checks for empty sensor list',
  'Should return false when sensor list is empty'
);

assert(
  vAnyOccupied && vAnyOccupied.includes('false') && 
  vAnyOccupied.includes('v_occupancy_sensors is not defined or v_occupancy_sensors | length == 0'),
  'v_any_occupied returns false when sensors empty/undefined',
  'Template should explicitly return false for empty/undefined sensors'
);

const allChooseBlocks = findChooseBlocks(action);
let dayModeBlock = null;
let eveningModeBlock = null;

for (const block of allChooseBlocks) {
  const dayOption = findSequenceWithCondition(block, c => 
    c.condition === 'state' && c.state === 'Day'
  );
  const eveningOption = findSequenceWithCondition(block, c => 
    c.condition === 'state' && c.state === 'Evening'
  );
  
  if (dayOption) dayModeBlock = { parent: block, option: dayOption };
  if (eveningOption) eveningModeBlock = { parent: block, option: eveningOption };
}

const dayInnerChoose = findChooseBlocks(dayModeBlock?.option?.sequence || [])[0];
const eveningInnerChoose = findChooseBlocks(eveningModeBlock?.option?.sequence || [])[0];

const dayTripleSendOption = findSequenceWithCondition(dayInnerChoose, c =>
  c.condition === 'template' && 
  c.value_template && 
  c.value_template.includes('v_day_brightness') &&
  c.value_template.includes('100')
);

const eveningTripleSendOption = findSequenceWithCondition(eveningInnerChoose, c =>
  c.condition === 'template' && 
  c.value_template && 
  c.value_template.includes('v_evening_brightness') &&
  c.value_template.includes('100')
);

assert(
  hasTripleSend(dayTripleSendOption),
  'Day mode has triple-send (3x repeat) for 100% brightness',
  'Day mode should have repeat count 3 for 100% brightness'
);

assert(
  hasTripleSend(eveningTripleSendOption),
  'Evening mode has triple-send (3x repeat) for 100% brightness',
  'Evening mode should have repeat count 3 for 100% brightness'
);

const dayOccupiedOption = findSequenceWithCondition(dayInnerChoose, c =>
  c.condition === 'template' && 
  c.value_template && 
  c.value_template.includes('v_any_occupied')
);

assert(
  dayOccupiedOption !== null,
  'Day mode has occupancy check as first condition in choose',
  'v_any_occupied check should exist in Day mode choose block'
);

assert(
  dayInnerChoose && dayInnerChoose.choose && 
  dayInnerChoose.choose[0] === dayOccupiedOption,
  'Occupied condition is checked BEFORE triple-send in Day mode',
  'Occupied check must be first so blank sensors fall through to triple-send'
);


console.log('\n\nTest Suite 2: Occupied (any sensor on) applies quiet settings');
console.log('-'.repeat(60));

assert(
  inputs.quiet_brightness !== undefined,
  'quiet_brightness input exists',
  'Blueprint should have quiet_brightness input'
);

assert(
  inputs.quiet_color_temp !== undefined,
  'quiet_color_temp input exists',
  'Blueprint should have quiet_color_temp input'
);

const quietDefault = inputs.quiet_brightness.default;
assert(
  quietDefault !== undefined && quietDefault < 100,
  'quiet_brightness has sensible default (less than 100%)',
  `Default should be < 100, got: ${quietDefault}`
);

assert(
  vAnyOccupied && vAnyOccupied.includes("select('is_state', 'on')"),
  'v_any_occupied checks if ANY sensor is on',
  'Should use select filter to find sensors in "on" state'
);

const dayQuietCall = getQuietServiceCall(dayOccupiedOption);
assert(
  dayQuietCall !== null,
  'Day mode occupied path calls light.turn_on with quiet brightness',
  'When occupied, Day mode should apply quiet brightness'
);

assert(
  dayQuietCall && dayQuietCall.data.color_temp_kelvin &&
  typeof dayQuietCall.data.color_temp_kelvin === 'string' &&
  dayQuietCall.data.color_temp_kelvin.includes('v_quiet_color_temp'),
  'Day mode occupied path uses quiet color temp',
  'When occupied, Day mode should apply quiet color temp'
);

const eveningOccupiedOption = findSequenceWithCondition(eveningInnerChoose, c =>
  c.condition === 'template' && 
  c.value_template && 
  c.value_template.includes('v_any_occupied')
);

const eveningQuietCall = getQuietServiceCall(eveningOccupiedOption);
assert(
  eveningQuietCall !== null,
  'Evening mode occupied path calls light.turn_on with quiet brightness',
  'When occupied, Evening mode should apply quiet brightness'
);

assert(
  !hasTripleSend(dayOccupiedOption),
  'Day mode occupied path does NOT use triple-send',
  'Quiet mode should not need triple-send'
);


console.log('\n\nTest Suite 3: Empty bed (sensors selected but all off) keeps normal mode');
console.log('-'.repeat(60));

assert(
  vAnyOccupied && vAnyOccupied.includes('length > 0'),
  'v_any_occupied checks sensor count after filtering for "on"',
  'Should check if filtered list length > 0'
);

const dayDefaultAction = getNormalServiceCall(dayInnerChoose);
assert(
  dayDefaultAction !== null,
  'Day mode has default action when not occupied',
  'Should fall through to normal settings when all sensors off'
);

assert(
  dayDefaultAction && dayDefaultAction.data && 
  dayDefaultAction.data.brightness_pct &&
  dayDefaultAction.data.brightness_pct.__input === 'day_brightness',
  'Day mode default uses day_brightness (not quiet)',
  'When all sensors off, should use normal day brightness'
);

const eveningDefaultAction = getNormalServiceCall(eveningInnerChoose);
assert(
  eveningDefaultAction !== null,
  'Evening mode has default action when not occupied',
  'Should fall through to normal settings when all sensors off'
);

assert(
  eveningDefaultAction && eveningDefaultAction.data &&
  eveningDefaultAction.data.brightness_pct &&
  eveningDefaultAction.data.brightness_pct.__input === 'evening_brightness',
  'Evening mode default uses evening_brightness (not quiet)',
  'When all sensors off, should use normal evening brightness'
);

const nightModeBlock = allChooseBlocks.find(block => 
  block.default && JSON.stringify(block.default).includes('night_brightness')
);

assert(
  nightModeBlock !== null,
  'Night mode exists as default in mode choose',
  'Night should be the default mode'
);

assert(
  nightModeBlock && !JSON.stringify(nightModeBlock.default).includes('v_any_occupied'),
  'Night mode does not check occupancy (unchanged behavior)',
  'Night mode should work the same regardless of occupancy'
);


console.log('\n\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  process.exit(1);
}
