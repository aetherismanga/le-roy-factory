package fr.leroyfactory.crm;
import org.junit.Test;
import static org.junit.Assert.*;
public class LaunchPolicyTest {
    @Test public void acceptsRealHttpsPagesWithoutChangingParameters() {
        for (String url : new String[]{LaunchPolicy.HOME, "https://leroyfactory.fr/agent.html", "https://leroyfactory.fr/tarifs-pro.html?partner=neobath#catalogue", "https://leroyfactory.fr:443/", "https://studio-one-beta-test-v2.vercel.app/", "https://randal-catalogue-general-3d.vercel.app/"}) assertTrue(url, LaunchPolicy.isAllowed(url));
    }
    @Test public void rejectsUntrustedAndLocalOrigins() {
        for (String url : new String[]{"http://leroyfactory.fr/", "https://evil.example/", "https://leroyfactory.fr.evil.example/", "https://leroyfactory.fr@evil.example/", "https://evil.example@leroyfactory.fr/", "https://leroyfactory.fr:8443/", "file:///etc/passwd", "content://fr.leroyfactory.crm/private", "javascript:alert(1)", "intent://leroyfactory.fr/", "https://localhost/", "https://leroyfactory.fr./", "https://leroyfactory.fr\\@evil.example/", "https://leroyfactory.fr/%0d%0a".replace("%0d%0a", "\r\n")}) assertFalse(url, LaunchPolicy.isAllowed(url));
    }
    @Test public void rejectsMissingMalformedAndOversizeUrls() {
        assertFalse(LaunchPolicy.isAllowed(null)); assertFalse(LaunchPolicy.isAllowed(""));
        assertFalse(LaunchPolicy.isAllowed("/agent.html")); assertFalse(LaunchPolicy.isAllowed("https://leroyfactory.fr/%zz"));
        assertFalse(LaunchPolicy.isAllowed(LaunchPolicy.HOME + "a".repeat(8193)));
    }
}
