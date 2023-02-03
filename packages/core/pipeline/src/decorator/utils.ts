import _ from "lodash";

const propertyMap: any = {};
function attachProperty(target: any, propertyKey: string | symbol) {
  let props = propertyMap[target];
  if (props == null) {
    props = {};
    propertyMap[target] = props;
  }
  props[propertyKey] = true;
}

function getClassProperties(target: any) {
  return propertyMap[target] || {};
}

function target(target: any, propertyKey?: string | symbol) {
  if (typeof target === "object" && target.constructor) {
    target = target.constructor;
  }
  if (propertyKey != null) {
    attachProperty(target, propertyKey);
  }
  return target;
}

function inject(define: any, instance: any, context: any, preHandler?: (item: any, key: string, instance: any, context: any) => void) {
  _.forEach(define, (item, key) => {
    if (preHandler) {
      preHandler(item, key, instance, context);
    }
    if (context[key] != undefined) {
      instance[key] = context[key];
    }
  });
}
export const Decorator = {
  target,
  attachProperty,
  getClassProperties,
  inject,
};
