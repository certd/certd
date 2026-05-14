public class GetCert {
    public static void main(String[] args) {
        try {
            new GetCert().run();
        } catch (Exception e) {
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }

    private void run() throws Exception {
        CertdClient client = new CertdClient(
            requireEnv("CERTD_KEY_ID"),
            requireEnv("CERTD_KEY_SECRET"),
            env("CERTD_BASE_URL", "http://127.0.0.1:7001"),
            boolEnv("CERTD_ENCRYPT", false)
        );

        String certId = System.getenv("CERTD_CERT_ID");
        String domains = System.getenv("CERTD_DOMAINS");
        String format = System.getenv("CERTD_FORMAT");

        if (isBlank(certId) && isBlank(domains)) {
            throw new IllegalArgumentException("Set CERTD_CERT_ID or CERTD_DOMAINS");
        }

        StringBuilder body = new StringBuilder();
        body.append("{");
        boolean hasField = false;
        if (!isBlank(certId)) {
            body.append("\"certId\":").append(Long.parseLong(certId));
            hasField = true;
        }
        if (!isBlank(domains)) {
            appendComma(body, hasField);
            body.append("\"domains\":\"").append(CertdClient.jsonEscape(domains)).append("\"");
            hasField = true;
        }
        appendComma(body, hasField);
        body.append("\"autoApply\":").append(boolEnv("CERTD_AUTO_APPLY", false));
        hasField = true;
        if (!isBlank(format)) {
            appendComma(body, hasField);
            body.append("\"format\":\"").append(CertdClient.jsonEscape(format)).append("\"");
        }
        body.append("}");

        System.out.println(client.getCert(body.toString()));
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (isBlank(value)) {
            throw new IllegalArgumentException("Missing environment variable: " + name);
        }
        return value;
    }

    private static String env(String name, String defaultValue) {
        String value = System.getenv(name);
        return isBlank(value) ? defaultValue : value;
    }

    private static boolean boolEnv(String name, boolean defaultValue) {
        String value = System.getenv(name);
        if (isBlank(value)) {
            return defaultValue;
        }
        return value.equalsIgnoreCase("1")
            || value.equalsIgnoreCase("true")
            || value.equalsIgnoreCase("yes")
            || value.equalsIgnoreCase("y");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static void appendComma(StringBuilder builder, boolean hasField) {
        if (hasField) {
            builder.append(",");
        }
    }
}
