import { AbstractRegistrable } from "../registry";
import { CreateRecordOptions, IDnsProvider, DnsProviderDefine, RemoveRecordOptions } from "./api";
import { AbstractAccess } from "../access";
import { Logger } from "log4js";
export abstract class AbstractDnsProvider extends AbstractRegistrable<DnsProviderDefine> implements IDnsProvider {
  access!: AbstractAccess;
  logger!: Logger;
  doInit(options: { access: AbstractAccess; logger: Logger }) {
    this.access = options.access;
    this.logger = options.logger;
    this.onInit();
  }

  protected abstract onInit(): void;

  abstract createRecord(options: CreateRecordOptions): Promise<any>;

  abstract removeRecord(options: RemoveRecordOptions): Promise<any>;
}
