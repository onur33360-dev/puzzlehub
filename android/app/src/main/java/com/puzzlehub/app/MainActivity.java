package com.puzzlehub.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Capacitor 7'nin BridgeActivity'si donanım geri tuşunu ele almaz: AndroidX
    // varsayılanı Activity'yi doğrudan bitirir, WebView geçmişine hiç bakmaz.
    // Sonuç: oyunun ortasında geri'ye basan oyuncu TÜM uygulamadan çıkardı.
    //
    // Geri tuşunu WebView içindeki SPA'ya (core/app.js) delege ediyoruz. JS,
    // uygulama içinde bir adım geri gider; ana ekran kökünde iki kez basış
    // aşağıdaki PHNativeBack.exit() köprüsüyle uygulamadan çıkar.
    //
    // NOT: history.pushState + webView.canGoBack() yaklaşımı denendi ve eski
    // WebView'lerde (Android 9 / P20 Lite) pushState girişlerinin back-forward
    // listesine yansımadığı, canGoBack()'in her zaman false döndüğü ölçüldü.
    // Bu yüzden karar tamamen JS'te veriliyor, WebView geçmişine bel bağlanmıyor.
    //
    // @capacitor/app eklentisi GEREKMEZ; bu sadece native köprü kodu, yeni bir
    // runtime bağımlılığı değil.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new BackBridge(), "PHNativeBack");
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = (getBridge() != null) ? getBridge().getWebView() : null;
                if (wv != null) {
                    // Kararı SPA verir (core/app.js → __phHandleBack). Çıkış
                    // gerektiğinde JS, PHNativeBack.exit() köprüsünü çağırır.
                    wv.evaluateJavascript("window.__phHandleBack && window.__phHandleBack();", null);
                } else {
                    finish();
                }
            }
        });
    }

    // JS → native köprü. Yalnızca uygulamadan çıkış için kullanılır; JS ana
    // ekran kökünde ikinci geri basışında çağırır.
    private class BackBridge {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(() -> finish());
        }
    }
}
