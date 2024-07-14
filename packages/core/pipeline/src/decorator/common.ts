import { Decorator } from "./index.js";

export type AutowireProp = {
  name?: string;
  type?: any;
};
export const AUTOWIRE_KEY = "pipeline:autowire";

export function Autowire(props?: AutowireProp): PropertyDecorator {
  return (target, propertyKey) => {
    const _type = Reflect.getMetadata("design:type", target, propertyKey);
    target = Decorator.target(target, propertyKey);
    props = props || {};
    props.type = _type;
    Reflect.defineMetadata(AUTOWIRE_KEY, props || {}, target, propertyKey);
  };
}
