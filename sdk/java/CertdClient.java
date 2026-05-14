import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

public class CertdClient {
    private final String keyId;
    private final String keySecret;
    private final String baseUrl;
    private final boolean encrypt;
    private final String signType;

    public CertdClient(String keyId, String keySecret) {
        this(keyId, keySecret, "http://127.0.0.1:7001", false);
    }

    public CertdClient(String keyId, String keySecret, String baseUrl, boolean encrypt) {
        if (isBlank(keyId)) {
            throw new IllegalArgumentException("keyId is required");
        }
        if (isBlank(keySecret)) {
            throw new IllegalArgumentException("keySecret is required");
        }
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.baseUrl = trimRightSlash(isBlank(baseUrl) ? "http://127.0.0.1:7001" : baseUrl);
        this.encrypt = encrypt;
        this.signType = "md5";
    }

    public String getSign(String content) throws Exception {
        if (!"md5".equals(signType)) {
            throw new IllegalArgumentException("Unsupported signType: " + signType);
        }
        return md5Hex(content + keySecret);
    }

    public String getToken() throws Exception {
        String content = "{\"keyId\":\"" + jsonEscape(keyId) + "\",\"t\":" + Instant.now().getEpochSecond()
            + ",\"encrypt\":" + encrypt + ",\"signType\":\"" + signType + "\"}";
        String sign = getSign(content);
        return base64(content) + "." + base64(sign);
    }

    public String request(String path, String bodyJson) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + path))
            .header("content-type", "application/json")
            .header("x-certd-token", getToken())
            .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
            .build();

        HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    public String getCert(String paramsJson) throws Exception {
        return request("/api/v1/cert/get", paramsJson);
    }

    public static String jsonEscape(String value) {
        StringBuilder escaped = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            switch (ch) {
                case '"':
                    escaped.append("\\\"");
                    break;
                case '\\':
                    escaped.append("\\\\");
                    break;
                case '\b':
                    escaped.append("\\b");
                    break;
                case '\f':
                    escaped.append("\\f");
                    break;
                case '\n':
                    escaped.append("\\n");
                    break;
                case '\r':
                    escaped.append("\\r");
                    break;
                case '\t':
                    escaped.append("\\t");
                    break;
                default:
                    if (ch < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) ch));
                    } else {
                        escaped.append(ch);
                    }
            }
        }
        return escaped.toString();
    }

    private static String md5Hex(String value) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : digest) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    private static String base64(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String trimRightSlash(String value) {
        return value.replaceAll("/+$", "");
    }
}
