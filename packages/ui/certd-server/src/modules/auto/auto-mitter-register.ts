import { logger, utils } from "@certd/basic";
import { UserSuiteService } from "@certd/commercial-core";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoMitterRegister {
  @Inject()
  userSuiteService: UserSuiteService;

  async init() {
    await this.registerOnNewUser();
  }
  async registerOnNewUser() {
    utils.mitter.on("register", async (req: { userId: number }) => {
      logger.info("register event", req.userId);
      await this.userSuiteService.presentGiftSuite(req.userId);
    });
  }
}
