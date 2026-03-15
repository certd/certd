import { Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { PipelineService } from '../../../modules/pipeline/service/pipeline-service.js';
import { BaseController, Constants, PermissionException } from '@certd/lib-server';
import { StorageService } from '../../../modules/pipeline/service/storage-service.js';
import { CertReader } from "@certd/plugin-cert";
import { UserSettingsService } from '../../../modules/mine/service/user-settings-service.js';
import { UserGrantSetting } from '../../../modules/mine/service/models.js';
import { ApiTags } from '@midwayjs/swagger';

@Provide()
@Controller('/api/pi/cert')
@ApiTags(['pipeline-cert'])
export class CertController extends BaseController {
  @Inject()
  pipelineService: PipelineService;
  @Inject()
  storeService: StorageService;


  @Inject()
  userSettingsService: UserSettingsService;


  @Post('/get', { description: Constants.per.authOnly, summary: "获取证书" })
  async getCert(@Query('id') id: number) {

    const {userId} = await this.getProjectUserIdRead()

    const pipleinUserId = await this.pipelineService.getPipelineUserId(id);

    if (pipleinUserId !== userId) {
      // 如果是管理员，检查用户是否有授权管理员查看
      const isAdmin = await this.isAdmin()
      if (!isAdmin) {
        throw new PermissionException();
      }
      // 是否允许管理员查看
      const setting = await this.userSettingsService.getSetting<UserGrantSetting>(pipleinUserId,null, UserGrantSetting, false);
      if (setting?.allowAdminViewCerts !== true) {
        //不允许管理员查看
        throw new PermissionException("该流水线的用户还未授权管理员查看证书，请先让用户在”设置->授权委托“中打开开关");
      }
    }
    const privateVars = await this.storeService.getPipelinePrivateVars(id);
    
    const certInfo = privateVars.cert;
    if (certInfo?.crt) {
      const certReader = new CertReader(certInfo);
      certInfo.detail = certReader.detail
    }

    return this.ok(certInfo);
  }


  @Post('/readCertDetail', { description: Constants.per.authOnly, summary: "读取证书详情" })
  async readCertDetail(@Body('crt') crt: string) {
    if (!crt) {
      throw new Error('crt is required');
    }
    const certDetail = CertReader.readCertDetail(crt)
    return this.ok(certDetail);
  }
}
