import { Config, Configuration, Inject, Logger } from "@midwayjs/decorator";
// @ts-ignore
import { ILogger } from "@midwayjs/logger";
import { IMidwayContainer, MidwayDecoratorService } from "@midwayjs/core";
import { registerPlugins } from "../plugin/decorator";
import { registerAccess } from "../access/decorator";
import { registerDnsProviders } from "../dns-provider";

// ... (see below) ...
@Configuration({
  namespace: "pipeline",
  //importConfigs: [join(__dirname, './config')],
})
export class PipelineConfiguration {
  @Config()
  // @ts-ignore
  config;
  @Logger()
  // @ts-ignore
  logger: ILogger;

  @Inject()
  // @ts-ignore
  decoratorService: MidwayDecoratorService;

  async onReady(container: IMidwayContainer) {
    this.logger.info("pipeline install");

    registerPlugins();
    registerAccess();
    registerDnsProviders();
    //this.implPropertyDecorator(container);
    this.logger.info("pipeline installed");
  }

  // implPropertyDecorator(container: IMidwayContainer) {
  //   this.logger.info("初始化 property decorator");
  //   // 实现装饰器
  //   this.decoratorService.registerPropertyHandler(CLASS_INPUTS_KEY, (propertyName, meta) => {
  //     return undefined;
  //   });
  //
  //   const autowireWhiteList: any = {
  //     logger: true,
  //   };
  //   this.decoratorService.registerPropertyHandler(CLASS_AUTOWIRE_KEY, (propertyName, meta) => {
  //     // eslint-disable-next-line no-debugger
  //     debugger;
  //     const className = meta.name;
  //     if (autowireWhiteList[className]) {
  //       //在白名单里面，注入
  //       return container.get(className);
  //     }
  //     this.logger.warn(`autowire failed:${className} class is not in white list`);
  //     return undefined;
  //   });
  // }
}
