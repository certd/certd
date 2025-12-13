
export type BuildContentReq = {
    data: any;
}


export interface ITemplateProvider<T=any> {
    buildContent: (params: BuildContentReq) => Promise<T>;

    buildDefaultContent:(params: BuildContentReq) => Promise<T>;
}


export type EmailContent = {
    subject:string,
    content?:string,
    html?:string
};
