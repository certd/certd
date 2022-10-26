export interface ServiceContext {
  get(name: string): any;
  register(name: string, service: any): void;
}

export class ServiceContextImpl implements ServiceContext {
  register(name: string, service: any): void {}
  storage: {
    [key: string]: any;
  } = {};
  get(name: string): any {
    return this.storage[name];
  }
}

export const serviceContext = new ServiceContextImpl();
