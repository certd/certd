import { Inject } from '@midwayjs/decorator';
import { ValidateException } from './exception/validation-exception';
import * as _ from 'lodash';
import { Context } from '@midwayjs/koa';
import { PermissionException } from './exception/permission-exception';
import { Repository } from 'typeorm';

/**
 * 服务基类
 */
export abstract class BaseService<T> {
  @Inject()
  ctx: Context;

  abstract getRepository(): Repository<T>;

  /**
   * 获得单个ID
   * @param id ID
   * @param infoIgnoreProperty 忽略返回属性
   */
  async info(id, infoIgnoreProperty?): Promise<T | null> {
    if (!id) {
      throw new ValidateException('id不能为空');
    }
    // @ts-ignore
    const info = await this.getRepository().findOne({ where: { id } });
    if (info && infoIgnoreProperty) {
      for (const property of infoIgnoreProperty) {
        delete info[property];
      }
    }
    return info;
  }

  /**
   * 非分页查询
   * @param option 查询配置
   */
  async find(options) {
    return await this.getRepository().find(options);
  }

  /**
   * 删除
   * @param ids 删除的ID集合 如：[1,2,3] 或者 1,2,3
   */
  async delete(ids) {
    if (ids instanceof Array) {
      await this.getRepository().delete(ids);
    } else if (typeof ids === 'string') {
      await this.getRepository().delete(ids.split(','));
    } else {
      //ids是一个condition
      await this.getRepository().delete(ids);
    }
    await this.modifyAfter(ids);
  }

  /**
   * 新增|修改
   * @param param 数据
   */
  async addOrUpdate(param) {
    await this.getRepository().save(param);
  }

  /**
   * 新增
   * @param param 数据
   */
  async add(param) {
    const now = new Date().getTime();
    param.createTime = now;
    param.updateTime = now;
    await this.addOrUpdate(param);
    await this.modifyAfter(param);
    return {
      id: param.id,
    };
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    if (!param.id) throw new ValidateException('no id');
    param.updateTime = new Date().getTime();
    await this.addOrUpdate(param);
    await this.modifyAfter(param);
  }

  /**
   * 新增|修改|删除 之后的操作
   * @param data 对应数据
   */
  async modifyAfter(data) {}

  /**
   * 分页查询
   * @param query 查询条件 bean
   * @param page
   * @param order
   * @param buildQuery
   */
  async page(query, page = { offset: 0, limit: 20 }, order, buildQuery) {
    if (page.offset == null) {
      page.offset = 0;
    }
    if (page.limit == null) {
      page.limit = 20;
    }
    const qb = this.getRepository().createQueryBuilder('main');
    if (order && order.prop) {
      qb.orderBy('main.' + order.prop, order.asc ? 'ASC' : 'DESC');
    } else {
      qb.orderBy('id', 'DESC');
    }
    qb.offset(page.offset).limit(page.limit);
    //根据bean query
    if (query) {
      let whereSql = '';
      let index = 0;
      _.forEach(query, (value, key) => {
        if (!value) {
          return;
        }
        if (index !== 0) {
          whereSql += ' and ';
        }
        whereSql += ` main.${key} = :${key} `;
        index++;
      });
      if (index > 0) {
        qb.where(whereSql, query);
      }
    }
    //自定义query
    if (buildQuery) {
      buildQuery(qb);
    }
    const list = await qb.getMany();
    const total = await qb.getCount();
    return {
      records: list,
      total,
      offset: page.offset,
      limit: page.limit,
    };
  }

  /**
   * 分页查询
   * @param query 查询条件 bean
   * @param order
   * @param buildQuery
   */
  async list(query, order, buildQuery) {
    const qb = this.getRepository().createQueryBuilder('main');
    if (order && order.prop) {
      qb.orderBy('main.' + order.prop, order.asc ? 'ASC' : 'DESC');
    } else {
      qb.orderBy('id', 'DESC');
    }
    //根据bean query
    if (query) {
      let whereSql = '';
      let index = 0;
      _.forEach(query, (value, key) => {
        if (!value) {
          return;
        }
        if (index !== 0) {
          whereSql += ' and ';
        }
        whereSql += ` main.${key} = :${key} `;
        index++;
      });
      if (index > 0) {
        qb.where(whereSql, query);
      }
    }
    //自定义query
    if (buildQuery) {
      buildQuery(qb);
    }
    return await qb.getMany();
  }

  async checkUserId(id = 0, userId, userKey = 'userId') {
    // @ts-ignore
    const res = await this.getRepository().findOne({
      // @ts-ignore
      select: { [userKey]: true },
      where: {
        // @ts-ignore
        id,
      },
    });
    // @ts-ignore
    if (!res || res.userId === userId) {
      return;
    }
    throw new PermissionException('权限不足');
  }
}
