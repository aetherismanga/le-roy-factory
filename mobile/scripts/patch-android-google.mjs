import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, '..');
const androidRoot = join(mobileRoot, 'android');
const appGradle = join(androidRoot, 'app', 'build.gradle');
const manifestPath = join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const javaDir = join(androidRoot, 'app', 'src', 'main', 'java', 'fr', 'leroyfactory', 'crm');

await mkdir(javaDir, { recursive: true });

let gradle = await readFile(appGradle, 'utf8');
const authDependency = "implementation 'com.google.android.gms:play-services-auth:21.6.0'";
if (!gradle.includes('com.google.android.gms:play-services-auth')) {
  if (!gradle.includes('dependencies {')) throw new Error('Bloc dependencies Gradle introuvable');
  gradle = gradle.replace('dependencies {', `dependencies {\n    ${authDependency}`);
  await writeFile(appGradle, gradle, 'utf8');
}

let manifest = await readFile(manifestPath, 'utf8');
const permissions = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION'
];
for (const permission of permissions) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(/<manifest([^>]*)>/, `<manifest$1>\n    <uses-permission android:name="${permission}" />`);
  }
}
await writeFile(manifestPath, manifest, 'utf8');

const mainActivity = `package fr.leroyfactory.crm;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleCalendarNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
await writeFile(join(javaDir, 'MainActivity.java'), mainActivity, 'utf8');

const googlePlugin = `package fr.leroyfactory.crm;

import android.app.Activity;
import android.app.PendingIntent;
import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "GoogleCalendarNative")
public class GoogleCalendarNativePlugin extends Plugin {
    private static final String CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
    private AuthorizationClient authorizationClient;
    private ActivityResultLauncher<IntentSenderRequest> authorizationLauncher;
    private PluginCall pendingCall;

    @Override public void load() {
        authorizationClient = Identity.getAuthorizationClient(getActivity());
        authorizationLauncher = ((ComponentActivity) getActivity()).registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(), result -> {
                PluginCall call = pendingCall; pendingCall = null; if (call == null) return;
                if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("Autorisation Google annulée"); return; }
                try { resolveAuthorization(call, authorizationClient.getAuthorizationResultFromIntent(result.getData())); }
                catch (ApiException e) { call.reject("Autorisation Google impossible", e); }
            });
    }

    @PluginMethod public void authorize(PluginCall call) {
        List<Scope> scopes = Collections.singletonList(new Scope(CALENDAR_SCOPE));
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(scopes).build();
        authorizationClient.authorize(request).addOnSuccessListener(result -> {
            if (result.hasResolution()) {
                PendingIntent p = result.getPendingIntent(); if (p == null) { call.reject("Autorisation Google indisponible"); return; }
                pendingCall = call; authorizationLauncher.launch(new IntentSenderRequest.Builder(p.getIntentSender()).build());
            } else resolveAuthorization(call, result);
        }).addOnFailureListener(error -> call.reject("Connexion Google Calendar impossible", error));
    }

    private void resolveAuthorization(PluginCall call, AuthorizationResult result) {
        String token = result.getAccessToken();
        if (token == null || token.isEmpty()) { call.reject("Google n'a pas fourni de jeton Calendar"); return; }
        JSObject ret = new JSObject();
        ret.put("connected", true);
        ret.put("accessToken", token);
        call.resolve(ret);
    }
}
`;
await writeFile(join(javaDir, 'GoogleCalendarNativePlugin.java'), googlePlugin, 'utf8');

console.log('Pont Google Calendar + localisation Android installés (sans Jarvis / plugin voix)');
