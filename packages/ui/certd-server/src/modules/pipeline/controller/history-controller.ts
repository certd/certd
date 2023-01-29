import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/decorator';
import { CrudController } from '../../../basic/crud-controller';
import { PipelineEntity } from '../entity/pipeline';
import { HistoryService } from '../service/history-service';
import { HistoryLogService } from '../service/history-log-service';
import { HistoryEntity } from '../entity/history';
import { HistoryLogEntity } from '../entity/history-log';

/**
 * 证书
 */
@Provide()
@Controller('/api/pi/history')
export class HistoryController extends CrudController {
  @Inject()
  service: HistoryService;
  @Inject()
  logService: HistoryLogService;

  getService() {
    return this.service;
  }

  @Post('/page')
  async page(@Body(ALL) body) {
    body.query.userId = this.ctx.user.id;
    return super.page(body);
  }

  @Post('/list')
  async list(@Body(ALL) body) {
    body.userId = this.ctx.user.id;
    if (body.pipelineId == null) {
      return this.ok([]);
    }
    const buildQuery = qb => {
      qb.limit(10);
    };
    const listRet = await this.getService().list(
      body,
      { prop: 'id', asc: false },
      buildQuery
    );
    return this.ok(listRet);
  }

  @Post('/add')
  async add(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update')
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.ctx.user.id);
    return super.update(bean);
  }

  @Post('/save')
  async save(@Body(ALL) bean: HistoryEntity) {
    bean.userId = this.ctx.user.id;
    if (bean.id > 0) {
      await this.service.checkUserId(bean.id, this.ctx.user.id);
    }
    await this.service.save(bean);
    return this.ok(bean.id);
  }

  @Post('/saveLog')
  async saveLog(@Body(ALL) bean: HistoryLogEntity) {
    bean.userId = this.ctx.user.id;
    if (bean.id > 0) {
      await this.service.checkUserId(bean.id, this.ctx.user.id);
    }
    await this.logService.save(bean);
    return this.ok(bean.id);
  }

  @Post('/delete')
  async delete(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.delete(id);
  }

  @Post('/detail')
  async detail(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/logs')
  async logs(@Query('id') id) {
    await this.logService.checkUserId(id, this.ctx.user.id);
    const logInfo = await this.logService.info(id);
    return this.ok(logInfo);
  }
}
