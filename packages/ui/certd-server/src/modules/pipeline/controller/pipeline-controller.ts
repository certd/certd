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
import { PipelineService } from '../service/pipeline-service';
import { PipelineEntity } from '../entity/pipeline';
import { Constants } from '../../../basic/constants';

/**
 * 证书
 */
@Provide()
@Controller('/api/pi/pipeline')
export class PipelineController extends CrudController<PipelineService> {
  @Inject()
  service: PipelineService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query.userId = this.ctx.user.id;
    const buildQuery = qb => {
      qb.where({});
    };
    return super.page({ ...body, buildQuery });
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.ctx.user.id);
    return super.update(bean);
  }

  @Post('/save', { summary: Constants.per.authOnly })
  async save(@Body(ALL) bean: PipelineEntity) {
    bean.userId = this.ctx.user.id;
    if (bean.id > 0) {
      await this.service.checkUserId(bean.id, this.ctx.user.id);
    }
    await this.service.save(bean);
    await this.service.registerTriggerById(bean.id);
    return this.ok(bean.id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.delete(id);
  }

  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    const detail = await this.service.detail(id);
    return this.ok(detail);
  }

  @Post('/trigger', { summary: Constants.per.authOnly })
  async trigger(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    await this.service.trigger(id);
    return this.ok({});
  }
}
