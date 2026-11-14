package fr.leroyfactory.crm;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Arrays;

/** Applies to incoming Android intents only. Browser navigation retains all website features. */
public final class LaunchPolicy {
    public static final String HOME = "https://leroyfactory.fr/";
    private static final List<String> HOSTS = Arrays.asList("leroyfactory.fr", "studio-one-beta-test-v2.vercel.app", "randal-catalogue-general-3d.vercel.app");
    private LaunchPolicy() {}
    public static boolean isAllowed(String value) {
        if (value == null || value.isEmpty() || value.length() > 8192 || value.indexOf('\\') >= 0) return false;
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getRawUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getHost() != null && HOSTS.contains(uri.getHost().toLowerCase(java.util.Locale.ROOT));
        } catch (URISyntaxException e) { return false; }
    }
}
