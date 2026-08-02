import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { PlusService } from "./plus-service.js";
import { IOcrService } from "@certd/plugin-lib";

/**
 */
@Provide("ocrService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class OcrService implements IOcrService {
  @Inject()
  plusService: PlusService;

  async doOcrFromImage(opts: { image: string }): Promise<{ texts: string[] }> {
    const res = await this.plusService.requestWithToken({
      url: "/activation/certd/ocr",
      method: "post",
      data: {
        image: opts.image,
      },
    });
    return res;
  }
}
