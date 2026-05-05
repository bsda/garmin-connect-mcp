#!/usr/bin/env node
// Discover Garmin workout sportTypeId mappings by creating test workouts and reading back the sportTypeKey.
// Usage: GARMIN_USERNAME=... GARMIN_PASSWORD=... node scripts/discover-sport-types.mjs
import { GarminConnect } from 'garmin-connect';

const username = process.env.GARMIN_USERNAME;
const password = process.env.GARMIN_PASSWORD;
if (!username || !password) {
  console.error('Set GARMIN_USERNAME and GARMIN_PASSWORD env vars');
  process.exit(1);
}

// Probe with explicit key="hiking" across various IDs to see if any produces hiking
const subProbes = [
  // [sportTypeId, sportTypeKey, label]
  [7, 'hiking', '7_hiking'],
  [12, 'hiking', '12_hiking'],
  [13, 'hiking', '13_hiking'],
  [14, 'hiking', '14_hiking'],
  [15, 'hiking', '15_hiking'],
  [16, 'hiking', '16_hiking'],
  [17, 'hiking', '17_hiking'],
  [3, 'hiking', '3_hiking'],
  [3, 'strength_training', '3_strength'],
  [9, 'strength_training', '9_strength'],
  [13, 'strength_training', '13_strength'],
];

const gc = new GarminConnect({ username, password });
await gc.login();

function buildPayload(sportTypeId, name, sportTypeKey = 'unknown') {
  return {
    workoutName: name,
    description: 'Sport type discovery probe — safe to delete',
    sportType: { sportTypeId, sportTypeKey, displayOrder: sportTypeId },
    subSportType: null,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: { sportTypeId, sportTypeKey: 'unknown' },
        workoutSteps: [
          {
            type: 'ExecutableStepDTO',
            stepId: 1,
            stepOrder: 1,
            childStepId: null,
            description: null,
            stepType: { stepTypeId: 1, stepTypeKey: 'warmup', displayOrder: 1 },
            endCondition: { conditionTypeId: 2, conditionTypeKey: 'time', displayOrder: 2, displayable: true },
            endConditionValue: 60,
            endConditionCompare: null,
            endConditionZone: null,
            preferredEndConditionUnit: null,
            targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target', displayOrder: 1 },
            targetValueOne: null,
            targetValueTwo: null,
            zoneNumber: null,
            exerciseName: null,
            strokeType: null,
            equipmentType: null,
            category: null,
          },
        ],
      },
    ],
    estimatedDistanceUnit: { unitKey: null },
    avgTrainingSpeed: 3.0,
    estimatedDurationInSecs: 0,
    estimatedDistanceInMeters: 0,
    estimateType: null,
    isWheelchair: false,
  };
}

const results = [];

for (const [sportId, key, label] of subProbes) {
  try {
    const created = await gc.client.post(
      'https://connectapi.garmin.com/workout-service/workout',
      buildPayload(sportId, `__probe_${label}__`, key),
    );
    const wid = created?.workoutId;
    if (!wid) {
      results.push({ id: label, key: '(no workoutId returned)' });
      continue;
    }
    const detail = await gc.client.get(`https://connectapi.garmin.com/workout-service/workout/${wid}`);
    const sportKey = detail?.sportType?.sportTypeKey ?? '(none)';
    const sportId2 = detail?.sportType?.sportTypeId ?? '(none)';
    results.push({ id: label, key: `id=${sportId2} key=${sportKey}`, workoutId: wid });
    try {
      await gc.client.delete(`https://connectapi.garmin.com/workout-service/workout/${wid}`);
    } catch { /* ignore cleanup errors */ }
  } catch (err) {
    results.push({ id: label, error: (err?.message ?? String(err)).slice(0, 200) });
  }
}

console.log('id   key (or error)');
console.log('-----------------------------');
for (const r of results) {
  if (r.error) {
    console.log(`${String(r.id).padEnd(4)} ERROR: ${r.error.slice(0, 80)}`);
  } else {
    console.log(`${String(r.id).padEnd(4)} ${r.key}`);
  }
}
