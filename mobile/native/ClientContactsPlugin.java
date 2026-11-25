package fr.leroyfactory.crm;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.ContactsContract;
import android.provider.ContactsContract.CommonDataKinds.Email;
import android.provider.ContactsContract.CommonDataKinds.Organization;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.provider.ContactsContract.Contacts;
import android.provider.ContactsContract.Data;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.Arrays;

@CapacitorPlugin(name = "ClientContacts", permissions = {
    @Permission(alias = "contacts", strings = {Manifest.permission.READ_CONTACTS})
})
public class ClientContactsPlugin extends Plugin {
    private static final int SYSTEM_PICKER_API = 37;
    // API 37 intent constants, kept as strings for the app's older compile SDK.
    private static final String PICK_CONTACTS = "android.provider.action.PICK_CONTACTS";
    private static final String REQUESTED_FIELDS = "android.provider.extra.PICK_CONTACTS_REQUESTED_DATA_FIELDS";
    private static final String PICKER_AUTHORITY = "com.android.contacts.picker.sessions";
    private static final String[] DATA_FIELDS = {
        Contacts.DISPLAY_NAME_PRIMARY, Data.MIMETYPE, Data.DATA1, Data.DATA2, Data.DATA3, Data.DATA4
    };

    @PluginMethod
    public void pickContact(PluginCall call) {
        if (Build.VERSION.SDK_INT >= SYSTEM_PICKER_API) {
            Intent intent = new Intent(PICK_CONTACTS);
            intent.putStringArrayListExtra(REQUESTED_FIELDS, new ArrayList<>(Arrays.asList(
                StructuredName.CONTENT_ITEM_TYPE, Phone.CONTENT_ITEM_TYPE, Email.CONTENT_ITEM_TYPE,
                Organization.CONTENT_ITEM_TYPE
            )));
            launch(call, intent);
        } else if (getPermissionState("contacts") == PermissionState.GRANTED) {
            launchLegacy(call);
        } else {
            requestPermissionForAlias("contacts", call, "contactsPermissionResult");
        }
    }

    @PermissionCallback
    private void contactsPermissionResult(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) launchLegacy(call);
        else call.reject("Accès aux contacts refusé");
    }

    private void launchLegacy(PluginCall call) {
        launch(call, new Intent(Intent.ACTION_PICK, Contacts.CONTENT_URI));
    }

    private void launch(PluginCall call, Intent intent) {
        try {
            startActivityForResult(call, intent, "contactPicked");
        } catch (ActivityNotFoundException | SecurityException error) {
            call.reject("Sélecteur de contacts indisponible", error);
        }
    }

    @ActivityCallback
    private void contactPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.resolve(new JSObject());
            return;
        }
        Uri uri = result.getData().getData();
        String authority = Build.VERSION.SDK_INT >= SYSTEM_PICKER_API ? PICKER_AUTHORITY : ContactsContract.AUTHORITY;
        if (uri == null || !ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())
                || !authority.equals(uri.getAuthority())) {
            call.reject("Fiche contact illisible");
            return;
        }
        getBridge().execute(() -> readContact(call, uri));
    }

    private void readContact(PluginCall call, Uri uri) {
        ContentResolver resolver = getContext().getContentResolver();
        try {
            JSObject contact = Build.VERSION.SDK_INT >= SYSTEM_PICKER_API
                ? readFields(resolver, uri, null, null)
                : readLegacyContact(resolver, uri);
            call.resolve(new JSObject().put("contact", contact));
        } catch (RuntimeException error) {
            call.reject("Impossible de lire la fiche contact", error);
        }
    }

    private JSObject readLegacyContact(ContentResolver resolver, Uri uri) {
        try (Cursor selected = resolver.query(uri, new String[]{Contacts._ID, Contacts.DISPLAY_NAME_PRIMARY}, null, null, null)) {
            if (selected == null || !selected.moveToFirst()) throw new IllegalStateException("Contact absent");
            String[] args = {selected.getString(0), StructuredName.CONTENT_ITEM_TYPE, Phone.CONTENT_ITEM_TYPE, Email.CONTENT_ITEM_TYPE, Organization.CONTENT_ITEM_TYPE};
            String selection = Data.CONTACT_ID + " = ? AND " + Data.MIMETYPE + " IN (?, ?, ?, ?)";
            return readFields(resolver, Data.CONTENT_URI, selection, args).put("displayName", selected.getString(1));
        }
    }

    private JSObject readFields(ContentResolver resolver, Uri uri, String selection, String[] args) {
        JSObject contact = new JSObject();
        JSArray phones = new JSArray();
        JSArray emails = new JSArray();
        try (Cursor rows = resolver.query(uri, DATA_FIELDS, selection, args, null)) {
            if (rows == null) throw new IllegalStateException("Données contact absentes");
            while (rows.moveToNext()) {
                contact.put("displayName", rows.getString(0));
                switch (rows.getString(1)) {
                    case StructuredName.CONTENT_ITEM_TYPE:
                        contact.put("prenom", rows.getString(3)).put("nom", rows.getString(4));
                        break;
                    case Phone.CONTENT_ITEM_TYPE:
                        phones.put(new JSObject().put("value", rows.getString(2)).put("type", phoneType(rows.getInt(3))));
                        break;
                    case Email.CONTENT_ITEM_TYPE:
                        emails.put(rows.getString(2));
                        break;
                    case Organization.CONTENT_ITEM_TYPE:
                        if (rows.getString(5) != null) contact.put("fonction", rows.getString(5));
                        break;
                    default:
                        break;
                }
            }
        }
        return contact.put("phones", phones).put("emails", emails);
    }

    private static String phoneType(int type) {
        if (type == Phone.TYPE_MOBILE || type == Phone.TYPE_WORK_MOBILE) return "mobile";
        if (type == Phone.TYPE_HOME || type == Phone.TYPE_WORK || type == Phone.TYPE_MAIN) return "fixed";
        return "";
    }
}
