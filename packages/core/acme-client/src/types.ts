import type * as rfc8555 from "./rfc8555.js";
import type { Challenge } from "./rfc8555.js";

export type * from "./rfc8555.js";

export type PrivateKeyBuffer = Buffer;
export type PublicKeyBuffer = Buffer;
export type CertificateBuffer = Buffer;
export type CsrBuffer = Buffer;

export type PrivateKeyString = string;
export type PublicKeyString = string;
export type CertificateString = string;
export type CsrString = string;

export interface Order extends rfc8555.Order {
    url: string;
}

export interface Authorization extends rfc8555.Authorization {
    url: string;
}

export type UrlMapping = {
    enabled: boolean;
    mappings: Record<string, string>;
};

export interface ClientExternalAccountBindingOptions {
    kid: string;
    hmacKey: string;
}

export interface ClientOptions {
    sslProvider: string;
    directoryUrl: string;
    accountKey: PrivateKeyBuffer | PrivateKeyString;
    accountUrl?: string;
    externalAccountBinding?: ClientExternalAccountBindingOptions;
    backoffAttempts?: number;
    backoffMin?: number;
    backoffMax?: number;
    urlMapping?: UrlMapping;
    signal?: AbortSignal;
    logger?: any;
    /**
     * 是否要求Directory返回的资源URL与Directory同源。
     *
     * 默认 true（安全推荐）：跨源资源URL会被拒绝，防止恶意目录把携带账户密钥签名的请求引导到其他主机。
     * 仅当第三方ACME确实使用跨源资源且已确认可信时，可显式设为 false。
     * 携带内部凭证（extraHeaders，如 x-certd-acme-token）的请求仍受同源/映射边界约束。
     */
    strictResourceOrigin?: boolean;
    /**
     * 单次ACME请求允许的最大重定向次数。
     *
     * 默认 0（不跟随重定向），防止凭证经重定向泄漏。
     * 依赖重定向的第三方ACME可显式调大；携带内部凭证的请求始终强制为0，不受此配置覆盖。
     */
    maxRedirects?: number;
}

export interface ClientAutoOptions {
    csr: CsrBuffer | CsrString;
    challengeCreateFn: (
        authz: Authorization,
        keyAuthorization: (challenge: Challenge) => Promise<string>
    ) => Promise<{ recordReq?: any; recordRes?: any; dnsProvider?: any; challenge: Challenge; keyAuthorization: string }>;
    challengeRemoveFn: (authz: Authorization, challenge: Challenge, keyAuthorization: string, recordReq: any, recordRes: any, dnsProvider: any, httpUploader: any) => Promise<any>;
    email?: string;
    termsOfServiceAgreed?: boolean;
    skipChallengeVerification?: boolean;
    preferredChain?: string;
    signal?: AbortSignal;
    profile?: string;
    waitDnsDiffuseTime?: number;
    dnsServers?: string[];
}

export interface CertificateDomains {
    commonName: string;
    altNames: string[];
}

export interface CertificateIssuer {
    commonName: string;
}

export interface CertificateInfo {
    issuer: CertificateIssuer;
    domains: CertificateDomains;
    notAfter: Date;
    notBefore: Date;
}

export interface CsrOptions {
    keySize?: number;
    commonName?: string;
    altNames?: string[];
    country?: string;
    state?: string;
    locality?: string;
    organization?: string;
    organizationUnit?: string;
    emailAddress?: string;
}

export interface RsaPublicJwk {
    e: string;
    kty: string;
    n: string;
}

export interface EcdsaPublicJwk {
    crv: string;
    kty: string;
    x: string;
    y: string;
}

export interface CryptoInterface {
    createPrivateKey(keySize?: number, encodingType?: string): Promise<PrivateKeyBuffer>;
    createPrivateRsaKey(keySize?: number, encodingType?: string): Promise<PrivateKeyBuffer>;
    createPrivateEcdsaKey(namedCurve?: "P-256" | "P-384" | "P-521", encodingType?: string): Promise<PrivateKeyBuffer>;
    getPublicKey(keyPem: PrivateKeyBuffer | PrivateKeyString | PublicKeyBuffer | PublicKeyString): PublicKeyBuffer;
    getJwk(keyPem: PrivateKeyBuffer | PrivateKeyString | PublicKeyBuffer | PublicKeyString): RsaPublicJwk | EcdsaPublicJwk;
    splitPemChain(chainPem: CertificateBuffer | CertificateString): string[];
    getPemBodyAsB64u(pem: CertificateBuffer | CertificateString): string;
    readCsrDomains(csrPem: CsrBuffer | CsrString): CertificateDomains;
    readCertificateInfo(certPem: CertificateBuffer | CertificateString): CertificateInfo;
    createCsr(data: CsrOptions, keyPem?: PrivateKeyBuffer | PrivateKeyString, encodingType?: string): Promise<[PrivateKeyBuffer, CsrBuffer]>;
    createAlpnCertificate(authz: Authorization, keyAuthorization: string, keyPem?: PrivateKeyBuffer | PrivateKeyString): Promise<[PrivateKeyBuffer, CertificateBuffer]>;
    isAlpnCertificateAuthorizationValid(certPem: CertificateBuffer | CertificateString, keyAuthorization: string): boolean;
}

export interface CryptoLegacyInterface {
    createPrivateKey(size?: number): Promise<PrivateKeyBuffer>;
    createPublicKey(key: PrivateKeyBuffer | PrivateKeyString): Promise<PublicKeyBuffer>;
    getPemBody(str: string): string;
    splitPemChain(str: string): string[];
    getModulus(input: PrivateKeyBuffer | PrivateKeyString | PublicKeyBuffer | PublicKeyString | CertificateBuffer | CertificateString | CsrBuffer | CsrString): Promise<Buffer>;
    getPublicExponent(input: PrivateKeyBuffer | PrivateKeyString | PublicKeyBuffer | PublicKeyString | CertificateBuffer | CertificateString | CsrBuffer | CsrString): Promise<Buffer>;
    readCsrDomains(csr: CsrBuffer | CsrString): Promise<CertificateDomains>;
    readCertificateInfo(cert: CertificateBuffer | CertificateString): Promise<CertificateInfo>;
    createCsr(data: CsrOptions, key?: PrivateKeyBuffer | PrivateKeyString): Promise<[PrivateKeyBuffer, CsrBuffer]>;
}
