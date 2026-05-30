import { logger } from "@certd/basic";
import { Config, Configuration, IMidwayContainer } from "@midwayjs/core";
import { Cron } from "./cron.js";

// ... (see below) ...
@Configuration({
  namespace: "cron",
  //importConfigs: [join(__dirname, './config')],
})
export class CronConfiguration {
  @Config()
  config;
  cron: Cron;
  async onReady(container: IMidwayContainer) {
    logger.info("cron start");
    this.cron = new Cron({
      logger: logger,
      ...this.config,
    });
    container.registerObject("cron", this.cron);
    this.cron.start();
    logger.info("cron started");
  }
}
