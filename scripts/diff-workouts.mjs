#!/usr/bin/env node
import { GarminConnect } from 'garmin-connect';
const gc = new GarminConnect({ username: process.env.GARMIN_USERNAME, password: process.env.GARMIN_PASSWORD });
await gc.login();

// UI-created (older) vs API-created (mine)
const ui = await gc.client.get(`https://connectapi.garmin.com/workout-service/workout/${process.argv[2]}`);
const api = await gc.client.get(`https://connectapi.garmin.com/workout-service/workout/${process.argv[3]}`);

function topKeys(o) { return Object.keys(o).sort(); }
console.log('UI top-level keys:', topKeys(ui));
console.log('API top-level keys:', topKeys(api));

const onlyUi = topKeys(ui).filter(k => !(k in api));
const onlyApi = topKeys(api).filter(k => !(k in ui));
console.log('Only in UI:', onlyUi);
console.log('Only in API:', onlyApi);

// Stringify side-by-side for full comparison
console.log('\n=== UI raw ===');
console.log(JSON.stringify(ui, null, 2).slice(0, 3500));
console.log('\n=== API raw ===');
console.log(JSON.stringify(api, null, 2).slice(0, 3500));
