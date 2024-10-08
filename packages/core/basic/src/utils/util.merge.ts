import _ from "lodash-es";
function isUnMergeable(srcValue: any) {
  return srcValue != null && srcValue instanceof UnMergeable;
}
function isUnCloneable(value: any) {
  return isUnMergeable(value) && !value.cloneable;
}
function merge(target: any, ...sources: any) {
  /**
   * 如果目标为不可合并对象，比如array、unMergeable、ref,则直接覆盖不合并
   * @param objValue 被合并对象
   * @param srcValue 来源对象
   */
  function customizer(objValue: any, srcValue: any) {
    if (srcValue == null) {
      return;
    }
    // 如果被合并对象为数组，则直接被覆盖对象覆盖，只要覆盖对象不为空
    if (_.isArray(objValue)) {
      //原对象如果是数组
      return srcValue; //来源对象
    }

    if (isUnMergeable(srcValue)) {
      return srcValue;
    }
  }

  let found: any = null;
  for (const item of sources) {
    if (isUnMergeable(item)) {
      found = item;
    }
  }
  if (found) {
    return found;
  }
  return _.mergeWith(target, ...sources, customizer);
}

function cloneDeep(target: any) {
  if (isUnCloneable(target)) {
    return target;
  }
  function customizer(value: any) {
    if (isUnCloneable(value)) {
      return value;
    }
  }

  return _.cloneDeepWith(target, customizer);
}
export class UnMergeable {
  cloneable = false;

  setCloneable(cloneable: any) {
    this.cloneable = cloneable;
  }
}

export const mergeUtils = {
  merge,
  cloneDeep,
};
