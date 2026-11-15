# Genera el proyecto Android (WebView) que empaqueta www/ como APK, sus iconos y el workflow de GitHub Actions.
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = sys.argv[1]
A = os.path.join(ROOT, 'android')
PKG = 'com.fotograciela.elwero'
def w(path, text):
    p = os.path.join(ROOT, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text.lstrip('\n'))

w('android/settings.gradle', """
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositories { google(); mavenCentral() } }
rootProject.name = "EL-WERO"
include ':app'
""")
w('android/build.gradle', """
plugins { id 'com.android.application' version '8.5.2' apply false }
""")
w('android/gradle.properties', """
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
""")
w('android/app/build.gradle', f"""
plugins {{ id 'com.android.application' }}
android {{
    namespace '{PKG}'
    compileSdk 34
    defaultConfig {{
        applicationId '{PKG}'
        minSdk 24
        targetSdk 34
        versionCode Integer.parseInt(System.getenv('VERSION_CODE') ?: '1')
        versionName System.getenv('VERSION_NAME') ?: '1.0.0'
    }}
    signingConfigs {{
        wero {{
            storeFile file('wero.keystore')
            storePassword 'elwero2026'
            keyAlias 'elwero'
            keyPassword 'elwero2026'
        }}
    }}
    buildTypes {{
        release {{ minifyEnabled false; signingConfig signingConfigs.wero }}
        debug {{ signingConfig signingConfigs.wero }}
    }}
    sourceSets {{ main {{ assets.srcDirs = ['../../www'] }} }}
    compileOptions {{ sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }}
}}
dependencies {{ implementation 'androidx.webkit:webkit:1.11.0' }}
""")
w('android/app/src/main/AndroidManifest.xml', """
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <application
        android:label="El Wero"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:resizeableActivity="true"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden|density|uiMode"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
""")
w(f'android/app/src/main/java/{PKG.replace(".", "/")}/MainActivity.java', f"""
package {PKG};

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {{
    private WebView web;

    @Override
    protected void onCreate(Bundle b) {{
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#050b18"));
        setContentView(web);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {{
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {{
                return loader.shouldInterceptRequest(r.getUrl());
            }}
        }});
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        immersive();
    }}

    private void immersive() {{
        if (Build.VERSION.SDK_INT >= 30) {{
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {{
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }}
        }} else {{
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }}
    }}

    @Override
    public void onWindowFocusChanged(boolean f) {{ super.onWindowFocusChanged(f); if (f) immersive(); }}

    @Override
    public void onBackPressed() {{
        web.evaluateJavascript("(window.androidBack && window.androidBack()) ? 1 : 0", value -> {{
            if (!"1".equals(value)) MainActivity.super.onBackPressed();
        }});
    }}

    @Override protected void onPause() {{ super.onPause(); web.onPause(); }}
    @Override protected void onResume() {{ super.onResume(); web.onResume(); }}
}}
""")

src = Image.open(os.path.join(ROOT, 'www/art/samurai.webp')).convert('RGB')
sw, sh = src.size
face = src.crop((int(sw * .2), 0, int(sw * .8), int(sw * .6)))
base = 512
icon = Image.new('RGBA', (base, base), (0, 0, 0, 0))
d = ImageDraw.Draw(icon)
d.rounded_rectangle((0, 0, base - 1, base - 1), 110, fill=(11, 24, 48, 255))
f = face.resize((400, 400))
m = Image.new('L', (400, 400), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 399, 399), 70, fill=255)
icon.paste(f, (56, 34), m)
d = ImageDraw.Draw(icon)
d.rounded_rectangle((14, 14, base - 15, base - 15), 96, outline=(226, 178, 90, 255), width=14)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 88)
except Exception:
    font = ImageFont.load_default()
d.rounded_rectangle((44, 370, base - 44, 476), 30, fill=(11, 24, 48, 240), outline=(226, 178, 90, 255), width=6)
tw = d.textlength('WERO', font=font)
d.text(((base - tw) / 2, 374), 'WERO', font=font, fill=(255, 217, 138, 255))
for dens, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    p = os.path.join(A, f'app/src/main/res/mipmap-{dens}'); os.makedirs(p, exist_ok=True)
    icon.resize((px, px), Image.LANCZOS).save(os.path.join(p, 'ic_launcher.png'))
icon.save(os.path.join(ROOT, 'icon.png'))

w('.github/workflows/build.yml', """
name: Compilar APK
on:
  push:
    branches: ['**']
    tags: ['v*']
  workflow_dispatch:
permissions:
  contents: write
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: gradle/actions/setup-gradle@v4
        with: { gradle-version: '8.7' }
      - name: Compilar
        working-directory: android
        env:
          VERSION_CODE: ${{ github.run_number }}
          VERSION_NAME: ${{ startsWith(github.ref, 'refs/tags/v') && github.ref_name || format('1.0.{0}', github.run_number) }}
        run: |
          echo "sdk.dir=$ANDROID_HOME" > local.properties
          gradle assembleRelease --no-daemon --stacktrace
      - name: Renombrar
        run: cp android/app/build/outputs/apk/release/app-release.apk EL-WERO.apk
      - uses: actions/upload-artifact@v4
        with: { name: EL-WERO-apk, path: EL-WERO.apk }
      - name: Publicar release
        if: startsWith(github.ref, 'refs/tags/v') || contains(github.event.head_commit.message, '[release]')
        uses: softprops/action-gh-release@v2
        with:
          files: EL-WERO.apk
          tag_name: ${{ startsWith(github.ref, 'refs/tags/v') && github.ref_name || format('v1.0.{0}', github.run_number) }}
          target_commitish: ${{ github.sha }}
          name: El Wero ${{ startsWith(github.ref, 'refs/tags/v') && github.ref_name || format('v1.0.{0}', github.run_number) }}
          body: |
            El Wero · Juego de Cartas para Android.
            Descarga EL-WERO.apk en tu teléfono e instálala.
""")
w('.gitignore', """
android/.gradle/
android/build/
android/app/build/
android/local.properties
*.iml
.idea/
""")
print('ok')
