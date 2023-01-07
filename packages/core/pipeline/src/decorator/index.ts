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
export const Decorator = {
  target,
  attachProperty,
  getClassProperties,
};
