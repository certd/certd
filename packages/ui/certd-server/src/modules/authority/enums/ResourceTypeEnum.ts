import { EnumItem } from '../../../basic/enum-item.js';
import * as _ from 'lodash-es';
class ResourceTypes {
  MENU = new EnumItem('menu', '菜单', 'blue');
  BTN = new EnumItem('btn', '按钮', 'green');
  ROUTE = new EnumItem('route', '路由', 'red');

  names() {
    const list = [];
    _.forEach(this, (item, key) => {
      list.push(item);
    });
    return list;
  }
}

export const ResourceTypeEnum = new ResourceTypes();
