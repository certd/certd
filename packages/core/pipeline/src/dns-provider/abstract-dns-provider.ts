import { AbstractRegistrable } from "../registry";
import { CreateRecordOptions, IDnsProvider, DnsProviderDefine, RemoveRecordOptions } from "./api";
import { AbstractAccess } from "../access";
export abstract class AbstractDnsProvider extends AbstractRegistrable<DnsProviderDefine> implements IDnsProvider {
  // @ts-ignore
  access: AbstractAccess;

  doInit(options: { access: AbstractAccess }) {
    this.access = options.access;
    this.onInit();
  }

  protected abstract onInit(): void;

  abstract createRecord(options: CreateRecordOptions): Promise<any>;

  abstract removeRecord(options: RemoveRecordOptions): Promise<any>;
}
