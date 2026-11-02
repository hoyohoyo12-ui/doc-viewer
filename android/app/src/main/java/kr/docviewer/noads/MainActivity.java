package kr.docviewer.noads;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import androidx.core.content.IntentCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingFilePlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = null;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(action)) {
            uri = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri.class);
        }
        if (uri == null) return;
        final Uri source = uri;
        final String mime = intent.getType();

        // 파일을 앱 전용 임시폴더로 복사 → 웹 화면에서 읽을 수 있게 함
        new Thread(() -> {
            JSObject info = new JSObject();
            try {
                String name = displayName(source);
                File dir = new File(getCacheDir(), "incoming");
                if (dir.exists()) {
                    File[] old = dir.listFiles();
                    if (old != null) for (File f : old) f.delete();
                } else {
                    dir.mkdirs();
                }
                File out = new File(dir, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
                try (InputStream in = getContentResolver().openInputStream(source);
                     OutputStream os = new FileOutputStream(out)) {
                    if (in == null) throw new Exception("파일을 읽을 수 없습니다");
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                }
                info.put("path", out.getAbsolutePath());
                info.put("name", name);
                info.put("mime", mime != null ? mime : "");
            } catch (Exception e) {
                info.put("error", String.valueOf(e.getMessage()));
            }
            runOnUiThread(() -> IncomingFilePlugin.deliver(info));
        }).start();
    }

    private String displayName(Uri uri) {
        String name = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor c = getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
                if (c != null && c.moveToFirst()) name = c.getString(0);
            } catch (Exception ignored) {
            }
        }
        if (name == null) name = uri.getLastPathSegment();
        if (name == null || name.isEmpty()) name = "document";
        return name;
    }
}
