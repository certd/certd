
export type BuildContentReq = {
    data: any;
}

export type BuildContentReply = Record<string, string>;

export interface ITemplateProvider {
    buildContent: (params: BuildContentReq) => Promise<BuildContentReply>;
}