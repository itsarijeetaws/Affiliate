import { app } from "./app.js";
import { env } from "./config/env.js";
import { startDailyPriceCron } from "./jobs/daily-price-cron.js";

app.listen(env.port, () => {
  console.log(`API running on port ${env.port}`);
});

startDailyPriceCron();
