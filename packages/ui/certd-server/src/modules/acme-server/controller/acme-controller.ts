import { ALL, Body, Controller, Get, Head, Inject, Param, Post, Provide } from "@midwayjs/core";
import { IMidwayKoaContext } from "@midwayjs/koa";
import { ApiTags } from "@midwayjs/swagger";
import { Constants } from "@certd/lib-server";
import { AcmeServerService } from "../service/acme-server-service.js";

@Provide()
@Controller("/api/acme")
@ApiTags(["acme"])
export class AcmeController {
  @Inject()
  ctx: IMidwayKoaContext;

  @Inject()
  acmeService: AcmeServerService;

  @Get("/:caId/directory", { description: Constants.per.guest, summary: "ACME目录" })
  async directory(@Param("caId") caId: number) {
    return await this.acmeService.directory(Number(caId));
  }

  @Head("/:caId/new-nonce", { description: Constants.per.guest, summary: "获取ACME nonce" })
  async newNonceHead(@Param("caId") caId: number) {
    this.acmeService.prepareResponse(this.ctx);
    this.ctx.status = 200;
    this.ctx.body = null;
  }

  @Get("/:caId/new-nonce", { description: Constants.per.guest, summary: "获取ACME nonce" })
  async newNonceGet(@Param("caId") caId: number) {
    this.acmeService.prepareResponse(this.ctx);
    this.ctx.status = 200;
    this.ctx.body = null;
  }

  @Post("/:caId/new-account", { description: Constants.per.guest, summary: "创建ACME账户" })
  async newAccount(@Param("caId") caId: number, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.newAccount(this.ctx, Number(caId), body));
  }

  @Post("/:caId/account/:id", { description: Constants.per.guest, summary: "查询ACME账户" })
  async account(@Param("caId") caId: number, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.getAccount(this.ctx, Number(caId), body));
  }

  @Post("/:caId/new-order", { description: Constants.per.guest, summary: "创建ACME订单" })
  async newOrder(@Param("caId") caId: number, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.newOrder(this.ctx, Number(caId), body));
  }

  @Post("/:caId/order/:id", { description: Constants.per.guest, summary: "查询ACME订单" })
  async order(@Param("caId") caId: number, @Param("id") id: string, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.getOrder(this.ctx, Number(caId), id, body));
  }

  @Post("/:caId/authz/:id", { description: Constants.per.guest, summary: "查询ACME授权" })
  async authz(@Param("caId") caId: number, @Param("id") id: string, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.getAuthorization(this.ctx, Number(caId), id, body));
  }

  @Post("/:caId/challenge/:id", { description: Constants.per.guest, summary: "触发ACME挑战" })
  async challenge(@Param("caId") caId: number, @Param("id") id: string, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.postChallenge(this.ctx, Number(caId), id, body));
  }

  @Post("/:caId/finalize/:id", { description: Constants.per.guest, summary: "完成ACME订单" })
  async finalize(@Param("caId") caId: number, @Param("id") id: string, @Body(ALL) body: any) {
    return await this.response(async () => this.acmeService.finalizeOrder(this.ctx, Number(caId), id, body));
  }

  @Post("/:caId/cert/:id", { description: Constants.per.guest, summary: "下载ACME证书" })
  async cert(@Param("caId") caId: number, @Param("id") id: string, @Body(ALL) body: any) {
    this.acmeService.prepareResponse(this.ctx);
    try {
      const pem = await this.acmeService.getCertificate(this.ctx, Number(caId), id, body);
      this.ctx.type = "application/pem-certificate-chain";
      return pem;
    } catch (e) {
      this.acmeService.respondError(this.ctx, e);
    }
  }

  @Post("/:caId/revoke-cert", { description: Constants.per.guest, summary: "吊销ACME证书" })
  async revokeCert(@Param("caId") caId: number, @Body(ALL) body: any) {
    this.acmeService.prepareResponse(this.ctx);
    try {
      await this.acmeService.revokeCertificate(this.ctx, Number(caId), body);
      this.ctx.status = 200;
      this.ctx.body = "";
    } catch (e) {
      this.acmeService.respondError(this.ctx, e);
    }
  }

  @Post("/:caId/key-change", { description: Constants.per.guest, summary: "ACME密钥变更（暂未支持）" })
  async keyChange() {
    return await this.response(async () => this.acmeService.notImplemented());
  }

  private async response(action: () => Promise<any>) {
    this.acmeService.prepareResponse(this.ctx);
    try {
      const result = await action();
      this.ctx.type = "application/json";
      return result;
    } catch (e) {
      this.acmeService.respondError(this.ctx, e);
    }
  }
}
