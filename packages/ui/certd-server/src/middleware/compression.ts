import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { IMidwayKoaContext, NextFunction } from "@midwayjs/koa";

const gzipAsync = promisify(gzip);
const MIN_COMPRESS_SIZE = 1024;

function acceptsGzip(header: string | undefined): boolean {
  if (!header) {
    return false;
  }
  const encodings = header.split(",").map(value => value.trim().split(";"));
  const gzipEncoding = encodings.find(([encoding]) => encoding === "gzip") ?? encodings.find(([encoding]) => encoding === "*");
  if (!gzipEncoding) {
    return false;
  }
  const quality = gzipEncoding[1]?.trim().replace(/^q=/, "");
  return quality !== "0";
}

function isCompressibleContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return true;
  }
  const type = contentType.split(";", 1)[0].trim().toLowerCase();
  return type.startsWith("text/") || type.includes("json") || type.includes("javascript") || type.includes("xml") || type.includes("svg");
}

export function shouldCompress(ctx: Pick<IMidwayKoaContext, "method" | "status" | "response" | "request" | "body">): boolean {
  if (ctx.method === "HEAD" || ctx.status === 204 || ctx.status === 304) {
    return false;
  }
  if (ctx.response.get("Content-Encoding") || ctx.response.get("Content-Disposition")) {
    return false;
  }
  if (!acceptsGzip(ctx.request.get("Accept-Encoding"))) {
    return false;
  }
  if (!isCompressibleContentType(ctx.response.get("Content-Type"))) {
    return false;
  }
  if (Buffer.isBuffer(ctx.body) && !ctx.response.get("Content-Type")) {
    return false;
  }
  return typeof ctx.body === "string" || Buffer.isBuffer(ctx.body) || (ctx.body !== null && typeof ctx.body === "object");
}

export async function compressResponse(ctx: IMidwayKoaContext, next: NextFunction): Promise<void> {
  await next();
  if (!shouldCompress(ctx)) {
    return;
  }

  const contentType = ctx.response.get("Content-Type");
  const body = Buffer.isBuffer(ctx.body) ? ctx.body : Buffer.from(typeof ctx.body === "string" ? ctx.body : JSON.stringify(ctx.body));
  if (body.length < MIN_COMPRESS_SIZE) {
    return;
  }

  const compressed = await gzipAsync(body);
  ctx.body = compressed;
  if (contentType) {
    ctx.response.set("Content-Type", contentType);
  }
  ctx.response.set("Content-Encoding", "gzip");
  ctx.response.set("Vary", "Accept-Encoding");
  ctx.response.remove("Content-Length");
}
