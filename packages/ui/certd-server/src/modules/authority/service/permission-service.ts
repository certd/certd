import { Provide } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { PermissionEntity } from '../entity/permission';

/**
 * 权限资源
 */
@Provide()
export class PermissionService extends BaseService {
  @InjectEntityModel(PermissionEntity)
  repository: Repository<PermissionEntity>;

  getRepository() {
    return this.repository;
  }

  async tree(options: any = {}) {
    if (options.order == null) {
      options.order = {
        sort: 'ASC',
      };
    }
    const list = await this.find(options);
    return this.buildTree(list);
  }

  buildTree(list: any) {
    const idMap = {};
    const root = [];
    for (const item of list) {
      idMap[item.id] = item;
      if (item.parentId == null || item.parentId <= 0) {
        root.push(item);
      }
    }

    for (const item of list) {
      if (item.parentId > 0) {
        const parent = idMap[item.parentId];
        if (parent) {
          if (parent.children == null) {
            parent.children = [];
          }
          parent.children.push(item);
        }
      }
    }
    return root;
  }
}
