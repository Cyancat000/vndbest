package com.cyancat.vndbest;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhotoGalleryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
