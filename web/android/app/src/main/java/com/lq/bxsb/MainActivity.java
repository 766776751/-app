package com.lq.bxsb;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 返回键交给 Capacitor App 插件 → JS 分层返回；不要在 Activity 里直接 finish
    }
}

