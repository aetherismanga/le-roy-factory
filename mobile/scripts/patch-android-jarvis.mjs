import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const mobileRoot=resolve(here,'..');
const javaDir=join(mobileRoot,'android','app','src','main','java','fr','leroyfactory','crm');
const voicePath=join(javaDir,'VoiceNativePlugin.java');

// Ce patch s'exécute après patch-android-google.mjs et remplace uniquement le plugin voix
// par une version qui sait écouter ET parler via TextToSpeech Android.
const voicePlugin=`package fr.leroyfactory.crm;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name = "VoiceNative")
public class VoiceNativePlugin extends Plugin {
    private ActivityResultLauncher<Intent> speechLauncher;
    private ActivityResultLauncher<String> permissionLauncher;
    private PluginCall pendingCall;
    private String pendingLanguage = "fr-FR";
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    public void load() {
        ComponentActivity activity = (ComponentActivity) getActivity();
        tts = new TextToSpeech(getContext(), status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady) tts.setLanguage(Locale.FRANCE);
        });
        speechLauncher = activity.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            PluginCall call = pendingCall;
            pendingCall = null;
            if (call == null) return;
            if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
                call.reject("Dictée annulée");
                return;
            }
            ArrayList<String> results = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (results == null || results.isEmpty()) { call.reject("Aucun texte reconnu"); return; }
            JSObject ret = new JSObject();
            ret.put("text", results.get(0));
            call.resolve(ret);
        });
        permissionLauncher = activity.registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            if (granted) startSpeech();
            else {
                PluginCall call = pendingCall;
                pendingCall = null;
                if (call != null) call.reject("Permission microphone refusée");
            }
        });
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (pendingCall != null) { call.reject("Une dictée est déjà en cours"); return; }
        pendingCall = call;
        pendingLanguage = call.getString("language", "fr-FR");
        if (tts != null) tts.stop();
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO);
        } else startSpeech();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) { call.resolve(); return; }
        getActivity().runOnUiThread(() -> {
            if (tts == null || !ttsReady) { call.reject("Synthèse vocale Android pas encore prête"); return; }
            String lang = call.getString("language", "fr-FR");
            Locale locale = lang != null && lang.toLowerCase().startsWith("fr") ? Locale.FRANCE : Locale.getDefault();
            tts.setLanguage(locale);
            tts.setSpeechRate(1.0f);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lrf-jarvis");
            call.resolve();
        });
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }

    private void startSpeech() {
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, pendingLanguage);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, pendingLanguage);
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Parlez maintenant");
            speechLauncher.launch(intent);
        } catch (Exception e) {
            PluginCall call = pendingCall;
            pendingCall = null;
            if (call != null) call.reject("Reconnaissance vocale indisponible", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        super.handleOnDestroy();
    }
}
`;

await writeFile(voicePath,voicePlugin,'utf8');
console.log('Jarvis Android : synthèse vocale native activée');
