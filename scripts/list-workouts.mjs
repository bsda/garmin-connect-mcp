import { GarminConnect } from 'garmin-connect';
const gc = new GarminConnect({ username: process.env.GARMIN_USERNAME, password: process.env.GARMIN_PASSWORD });
await gc.login();
const list = await gc.client.get('https://connectapi.garmin.com/workout-service/workouts?start=1&limit=50');
for (const w of list) {
  console.log(`${w.workoutId}\t${w.sportType?.sportTypeKey}\t${w.workoutName}`);
}
