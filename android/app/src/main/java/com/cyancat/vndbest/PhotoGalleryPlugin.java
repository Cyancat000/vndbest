package com.cyancat.vndbest;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(
    name = "PhotoGallery",
    permissions = {
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "photos")
    }
)
public class PhotoGalleryPlugin extends Plugin {
    @PluginMethod
    public void saveImage(PluginCall call) {
        String imageUrl = call.getString("url");
        String fileName = call.getString("fileName", "vndbest-image.jpg");
        String mimeType = call.getString("mimeType", "image/jpeg");

        if (imageUrl == null || imageUrl.isEmpty()) {
            call.reject("Image URL is required");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("photos") != PermissionState.GRANTED) {
            requestPermissionForAlias("photos", call, "saveImagePermissionCallback");
            return;
        }

        saveImageToGallery(call, imageUrl, fileName, mimeType);
    }

    @PermissionCallback
    public void saveImagePermissionCallback(PluginCall call) {
        if (getPermissionState("photos") != PermissionState.GRANTED) {
            call.reject("Photo storage permission denied");
            return;
        }

        String imageUrl = call.getString("url");
        String fileName = call.getString("fileName", "vndbest-image.jpg");
        String mimeType = call.getString("mimeType", "image/jpeg");
        saveImageToGallery(call, imageUrl, fileName, mimeType);
    }

    private void saveImageToGallery(PluginCall call, String imageUrl, String fileName, String mimeType) {
        getBridge().execute(() -> {
            Uri uri = null;
            ContentResolver resolver = getContext().getContentResolver();
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/VNDBest");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                }

                uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    call.reject("Failed to create gallery item");
                    return;
                }

                HttpURLConnection connection = (HttpURLConnection) new URL(imageUrl).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "VNDBest");

                try (InputStream inputStream = connection.getInputStream();
                     OutputStream outputStream = resolver.openOutputStream(uri)) {
                    if (outputStream == null) {
                        resolver.delete(uri, null, null);
                        call.reject("Failed to open gallery item");
                        return;
                    }

                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                } finally {
                    connection.disconnect();
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues completedValues = new ContentValues();
                    completedValues.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(uri, completedValues, null, null);
                }

                JSObject result = new JSObject();
                result.put("uri", uri.toString());
                call.resolve(result);
            } catch (Exception error) {
                if (uri != null) {
                    resolver.delete(uri, null, null);
                }
                call.reject("Failed to save image to gallery", error);
            }
        });
    }
}
