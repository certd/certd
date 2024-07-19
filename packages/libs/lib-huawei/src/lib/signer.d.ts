export declare class SigHttpRequest {
  method: string;
  host: string;
  uri: string;
  query: any;
  headers: any;
  body: string;
  constructor(method: any, url: any, headers: any, body: any);
}
export declare class Signer {
  Key: string;
  Secret: string;
  constructor(Key: any, Secret: any);
  Sign(r: any): {
    hostname: any;
    path: string;
    method: any;
    headers: any;
  };
}
