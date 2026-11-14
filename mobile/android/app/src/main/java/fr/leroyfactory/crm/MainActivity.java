package fr.leroyfactory.crm;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** The website runs at its real HTTPS origin, in the user's browser security boundary. */
public class MainActivity extends LauncherActivity {
    private boolean launching;

    @Override protected boolean shouldLaunchImmediately() { return false; }

    @Override protected void onCreate(Bundle state) {
        // Exported activities must never forward arbitrary URLs, extras, files or grant flags.
        Intent original = getIntent();
        String value = original.getDataString();
        Intent clean = new Intent(this, MainActivity.class);
        clean.setAction(Intent.ACTION_MAIN.equals(original.getAction()) ? Intent.ACTION_MAIN : Intent.ACTION_VIEW);
        clean.setFlags(original.getFlags() & (Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
        if (LaunchPolicy.isAllowed(value)) clean.setData(Uri.parse(value));
        setIntent(clean);
        super.onCreate(state);
        if (isFinishing()) return;
        setContentView(R.layout.activity_main);
        View root = findViewById(R.id.root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(root);
        findViewById(R.id.retry).setOnClickListener(view -> openSite());
        openSite();
    }

    @Override protected Uri getUrlForIntent(Intent intent) {
        String value = intent.getDataString();
        return LaunchPolicy.isAllowed(value) ? Uri.parse(value) : null;
    }

    private void openSite() {
        if (isFinishing() || launching) return;
        ConnectivityManager manager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(manager.getActiveNetwork());
        if (capabilities == null || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            showStatus(R.string.offline_title, R.string.offline_message);
            return;
        }
        launching = true;
        findViewById(R.id.retry).setVisibility(View.GONE);
        ((TextView) findViewById(R.id.title)).setText(R.string.welcome_title);
        ((TextView) findViewById(R.id.message)).setText(R.string.loading);
        try { launchTwa(); }
        catch (ActivityNotFoundException | SecurityException exception) {
            launching = false;
            showStatus(R.string.browser_title, R.string.browser_message);
        }
    }

    private void showStatus(int title, int message) {
        ((TextView) findViewById(R.id.title)).setText(title);
        ((TextView) findViewById(R.id.message)).setText(message);
        findViewById(R.id.retry).setVisibility(View.VISIBLE);
    }
}
