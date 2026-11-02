package kr.docviewer.noads;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 다른 앱에서 '연결 프로그램/공유'로 받은 파일 정보를 웹 화면(React)에 전달 */
@CapacitorPlugin(name = "IncomingFile")
public class IncomingFilePlugin extends Plugin {
    private static IncomingFilePlugin instance;
    private static JSObject pending;

    @Override
    public void load() {
        instance = this;
    }

    /** 앱이 꺼져 있다가 파일로 실행된 경우, 화면이 준비되면 가져감 */
    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject r = pending != null ? pending : new JSObject();
        pending = null;
        call.resolve(r);
    }

    static void deliver(JSObject info) {
        if (instance != null && instance.hasListeners("fileOpened")) {
            instance.notifyListeners("fileOpened", info);
        } else {
            pending = info;
        }
    }
}
