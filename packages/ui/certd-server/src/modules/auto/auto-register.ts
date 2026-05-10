import { Autoload, Init, Inject, Scope, ScopeEnum } from "@midwayjs/core";
import { AutoInitSite } from "./auto-init-site.js";
import { AutoLoadPlugins } from "./auto-load-plugins.js";
import { AutoCron } from "./auto-cron.js";
import { AutoMitterRegister } from "./auto-mitter-register.js";
import { AutoPipelineEmitterRegister } from "./auto-pipeline-emitter-register.js";
import { AutoFix } from "./auto-fix.js";
import { AutoPrint } from "./auto-print.js";

@Autoload()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoRegister {
  @Inject()
  autoInitSite: AutoInitSite;

  @Inject()
  autoLoadPlugins: AutoLoadPlugins;

  @Inject()
  autoCron: AutoCron;

  @Inject()
  autoMitterRegister: AutoMitterRegister;

  @Inject()
  autoPipelineEmitterRegister: AutoPipelineEmitterRegister;

  @Inject()
  autoPrint: AutoPrint;

  @Inject()
  autoFix: AutoFix;

  @Init()
  async init() {
    await this.autoInitSite.init();
    await this.autoLoadPlugins.init();
    await this.autoCron.init();
    await this.autoMitterRegister.init();
    await this.autoPipelineEmitterRegister.init();
    await this.autoFix.init();
    await this.autoPrint.init();
  }
}
