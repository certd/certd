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
import { PermissionService } from '../service/permission-service';

/**
 * 权限资源
 */
@Provide()
@Controller('/api/sys/authority/permission')
export class PermissionController extends CrudController {
  @Inject()
  service: PermissionService;

  getService() {
    return this.service;
  }

  @Post('/page')
  async page(
    @Body(ALL)
    body
  ) {
    return await super.page(body);
  }

  @Post('/add')
  async add(
    @Body(ALL)
    bean
  ) {
    return await super.add(bean);
  }

  @Post('/update')
  async update(
    @Body(ALL)
    bean
  ) {
    return await super.update(bean);
  }
  @Post('/delete')
  async delete(
    @Query('id')
    id
  ) {
    return await super.delete(id);
  }

  @Post('/tree')
  async tree() {
    const tree = await this.service.tree({});
    return this.ok(tree);
  }
}
