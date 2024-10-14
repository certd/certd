import { ValidateException } from './exception/index.js';
import * as _ from 'lodash-es';
import { PermissionException } from './exception/index.js';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Inject } from '@midwayjs/core';
import { TypeORMDataSourceManager } from '@midwayjs/typeorm';
import { EntityManager } from 'typeorm/entity-manager/EntityManager.js';

export type PageReq<T = any> = {
  page?: { offset: number; limit: number };
} & ListReq<T>;

export type ListReq<T = any> = {
  query?: Partial<T>;
  sort?: {
    prop: string;
    asc: boolean;
  };
  buildQuery?: (bq: SelectQueryBuilder<any>) => void;
};

/**
 * 服务基类
 */
export abstract class BaseService<T> {
  @Inject()
  dataSourceManager: TypeORMDataSourceManager;

  abstract getRepository(): Repository<T>;

  async transaction(callback: (entityManager: EntityManager) => Promise<any>) {
    const dataSource = this.dataSourceManager.getDataSource('default');
    await dataSource.transaction(callback as any);
  }

  /**
   * 获得单个ID
   * @param id ID
   * @param infoIgnoreProperty 忽略返回属性
   */
  async info(id, infoIgnoreProperty?): Promise<T | null> {
    if (!id) {
      throw new ValidateException('id不能为空');
    }
    const info = await this.getRepository().findOneBy({ id } as any);
    if (info && infoIgnoreProperty) {
      for (const property of infoIgnoreProperty) {
        delete info[property];
      }
    }
    return info;
  }

  /**
   * 非分页查询
   * @param options
   */
  async find(options) {
    return await this.getRepository().find(options);
  }

  /**
   * 删除
   * @param ids 删除的ID集合 如：[1,2,3] 或者 1,2,3
   * @param where
   */
  async delete(ids: any, where?: any) {
    if (!ids) {
      throw new ValidateException('ids不能为空');
    }
    if (typeof ids === 'string') {
      ids = ids.split(',');
    }
    if (ids.length === 0) {
      return;
    }
    await this.getRepository().delete({
      id: In(ids),
      ...where,
    });
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
    const now = new Date();
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
    if (!param.id) throw new ValidateException('id 不能为空');
    param.updateTime = new Date();
    await this.addOrUpdate(param);
    await this.modifyAfter(param);
  }

  /**
   * 新增|修改|删除 之后的操作
   * @param data 对应数据
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async modifyAfter(data: any) {}

  /**
   * 分页查询
   */
  async page(pageReq: PageReq<T>) {
    const { page } = pageReq;
    if (page.offset == null) {
      page.offset = 0;
    }
    if (page.limit == null) {
      page.limit = 20;
    }
    const qb = this.buildListQuery(pageReq);
    qb.offset(page.offset).limit(page.limit);
    const list = await qb.getMany();
    const total = await qb.getCount();
    return {
      records: list,
      total,
      offset: page.offset,
      limit: page.limit,
    };
  }

  private buildListQuery(listReq: ListReq<T>) {
    const { query, sort, buildQuery } = listReq;
    const qb = this.getRepository().createQueryBuilder('main');
    if (sort && sort.prop) {
      qb.addOrderBy('main.' + sort.prop, sort.asc ? 'ASC' : 'DESC');
    }
    qb.addOrderBy('id', 'DESC');
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
        qb.andWhere(whereSql, query);
      }
    }
    //自定义query
    if (buildQuery) {
      buildQuery(qb);
    }
    return qb;
  }

  /**
   * 分页查询
   */
  async list(listReq: ListReq<T>) {
    const qb = this.buildListQuery(listReq);
    return await qb.getMany();
  }

  async checkUserId(id: any = 0, userId: number, userKey = 'userId') {
    const res = await this.getRepository().findOne({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      select: { [userKey]: true },
      where: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        id,
      },
    });
    if (!res || res[userKey] === userId) {
      return;
    }
    throw new PermissionException('权限不足');
  }
}
