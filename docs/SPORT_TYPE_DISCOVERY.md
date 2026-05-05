# Garmin Workout sportTypeId — Empirical Discovery

> Last verified against `connectapi.garmin.com/workout-service/workout` on **2026-05-01**.

The Garmin Connect workout API uses a numeric `sportTypeId` to categorize structured
workouts. Public documentation is incomplete and several community libraries (notably
`python-garminconnect`) carry stale IDs from older Garmin Connect versions.

This document records the verified mapping discovered by creating probe workouts
and reading back what `sportTypeKey` Garmin assigned.

## Verified mapping

| sportTypeId | sportTypeKey | Notes |
|-------------|--------------|-------|
| 1 | `running` | |
| 2 | `cycling` | Road, gravel, MTB, indoor trainer |
| 3 | `other` | Generic catch-all |
| 4 | `swimming` | Open water |
| 5 | `lap_swimming` | Pool |
| 6 | `cardio_training` | Generic gym aerobic |
| 7 | `yoga` | |
| 8 | `pilates` | |
| 9 | `hiit` | High-intensity intervals; closest match for circuit-style strength |
| **10** | **(rejected)** | Server returns HTTP 400 |
| 11 | `mobility` | Stretching, prehab |
| 12 | `walking` | **Closest available match for "hiking" workouts** |
| 13 | `rucking` | Weighted-pack hiking |
| 14+ | **(silently stripped)** | Server saves the workout but `sportType` field is null on read; the workout is broken / unassigned |

## Key findings

### `sportTypeKey` is ignored on input
The API treats `sportTypeId` as the source of truth. Whatever string you send for
`sportTypeKey` is overwritten on read with Garmin's canonical key for that ID.

```js
// Send:
{ sportTypeId: 7, sportTypeKey: "hiking" }
// Garmin returns:
{ sportTypeId: 7, sportTypeKey: "yoga" }
```

### No dedicated `hiking` workout sportType
The Python community library `python-garminconnect` claims `HIKING = 7`, but ID 7
is currently `yoga`. Probing IDs 1-100 found no slot that returns `hiking`.

The Garmin Training API developer docs (gated) reference a `HikingWorkout` class
by name, but the public workout-service does not expose a corresponding ID.

**Workaround**: use `walking` (12) or `rucking` (13) for hike-style training.

### No dedicated `strength_training` workout sportType
Same situation. `hiit` (9) is the closest approximation for circuit-style strength
sessions like Dan John's Armor Building Complex.

### `subSportType` field caused 500s
Probing with `subSportType: { sportTypeId: <n>, sportTypeKey: "..." }` returns
HTTP 500 with a `MismatchedInputException`. The field exists in the Activity API
but the workout-service expects a different schema (or doesn't accept it at all).

### FIT SDK sport IDs are unrelated
The FIT protocol's sport enumeration (e.g., FIT `hiking = 17`) is a separate
namespace from Garmin Connect's workout-service. Don't conflate them.

## Forerunner 965 firmware compatibility filter

**The Garmin Connect mobile app applies a device-side compatibility filter** when
sending workouts to specific watches. The Forerunner 965 (firmware as of 2026-05)
**rejects walking and rucking workouts as incompatible** even though the device
has Walking and Hiking sport profiles. Running, cycling, swimming, and strength
workouts sync fine.

UI-created walking workouts in the Garmin Connect app behave identically — the
app silently downgrades them or refuses to send. This is not an MCP/API limitation;
it's firmware on the watch.

**Workaround for affected devices**: create the workout as `running` sportType
with explicit "START IN HIKE MODE" in the description. The watch syncs the workout
(running is universally compatible), the user starts the activity in Hike mode on
the watch, the structured workout runs unchanged, and the activity logs as a Hike
in the activity history. Post-activity, edit the hike in Garmin Connect to add
pack weight if needed.

## Discovery script

The script that produced this mapping is at `scripts/discover-sport-types.mjs`.
Run with `GARMIN_USERNAME=… GARMIN_PASSWORD=… node scripts/discover-sport-types.mjs`.
It creates probe workouts for an array of candidate IDs, reads each back to capture
the assigned key, then deletes the probe.

To re-verify in the future:
```bash
GARMIN_USERNAME=you@example.com \
GARMIN_PASSWORD=… \
node scripts/discover-sport-types.mjs
```

## Methodology

1. Authenticate via the `garmin-connect` npm package
2. POST to `https://connectapi.garmin.com/workout-service/workout` with a minimal
   payload (one warmup step), varying `sportTypeId` while sending
   `sportTypeKey: "unknown"`
3. GET the resulting workout by ID
4. Read `detail.sportType.sportTypeKey` — this is Garmin's canonical assignment
5. DELETE the probe workout

Any discrepancy between what was sent and what was returned identifies how Garmin
canonicalizes the ID space.
