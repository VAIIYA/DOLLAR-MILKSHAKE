import { getNextNoonUTC } from "./src/lib/fees";

console.log("Current time:", new Date().toISOString());
console.log("Calculated Next Noon UTC:", getNextNoonUTC().toISOString());
