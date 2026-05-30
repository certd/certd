// proxy-server.js
import http from "http";
import https from "https";
import url from "url";
import net from "net";
import { logger } from "@certd/basic";

export function startProxyServer(opts: { port: number }) {
  const { port } = opts;

  // 创建 HTTP 代理服务器
  const proxyServer = http.createServer((clientReq, clientRes) => {
    logger.log(`[proxy] 收到请求: ${clientReq.method} ${clientReq.url}`);

    // 解析请求的 URL
    const parsedUrl = url.parse(clientReq.url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.path,
      method: clientReq.method,
      headers: clientReq.headers,
    };

    // 根据协议选择不同的模块
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    // 移除可能会引起问题的 headers
    delete options.headers["proxy-connection"];
    delete options.headers["connection"];
    delete options.headers["keep-alive"];

    // 创建到目标服务器的请求
    const proxyReq = protocol.request(options, proxyRes => {
      // 将目标服务器的响应返回给客户端
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on("error", err => {
      logger.error("[proxy] 代理请求错误:", err);
      clientRes.writeHead(500);
      clientRes.end("代理服务器错误");
    });

    // 将客户端请求体转发到目标服务器
    clientReq.pipe(proxyReq);
  });

  // 处理 CONNECT 方法（HTTPS 代理）
  proxyServer.on("connect", (req, clientSocket, head) => {
    logger.log(`[proxy] HTTPS 连接请求: ${req.url}`);

    const [hostname, port] = req.url.split(":");
    const portNum = parseInt(port) || 443;

    // 连接到目标服务器
    const serverSocket = net.connect(portNum, hostname, () => {
      // 告诉客户端连接已建立
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n" + "Proxy-agent: Node.js-Proxy\r\n" + "\r\n");

      // 建立双向数据流
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on("error", err => {
      logger.error("[proxy] HTTPS 代理错误:", err);
      clientSocket.end();
    });

    clientSocket.on("error", err => {
      logger.error("[proxy] 客户端 socket 错误:", err);
      serverSocket.end();
    });
  });

  // 监听端口
  proxyServer.listen(port, () => {
    logger.info(`[proxy] 正向代理服务器运行在 http://0.0.0.0:${port}`);
  });

  proxyServer.close(() => {
    logger.info("[proxy] 正向代理服务器已关闭");
  });

  return proxyServer;
}
