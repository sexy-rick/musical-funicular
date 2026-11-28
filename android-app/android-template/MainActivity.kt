package net.greatsite.marketplace_trader

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity: FlutterActivity() {
    private var pending: MethodChannel.Result? = null
    private var source: File? = null
    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        MethodChannel(engine.dartExecutor.binaryMessenger, "marketplace_trader/files").setMethodCallHandler { call, result ->
            if (call.method != "save") { result.notImplemented(); return@setMethodCallHandler }
            if (pending != null) { result.error("busy", "A save dialog is already open", null); return@setMethodCallHandler }
            val file = File(call.argument<String>("path") ?: "")
            val base = filesDir.canonicalFile
            val canonical = try { file.canonicalFile } catch (_: Exception) { null }
            if (canonical == null || !canonical.path.startsWith(base.path + File.separator) || !canonical.isFile) {
                result.error("invalid_file", "File is unavailable", null); return@setMethodCallHandler
            }
            val name = (call.argument<String>("name") ?: "download").substringAfterLast('/').substringAfterLast('\\').take(180)
            source = canonical; pending = result
            try {
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "application/octet-stream"
                    putExtra(Intent.EXTRA_TITLE, name.ifBlank { "download" })
                }
                startActivityForResult(intent, 9814)
            } catch (e: Exception) { source = null; pending = null; result.error("save_failed", "Could not open save dialog", null) }
        }
    }
    @Deprecated("Android callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 9814) return
        val reply = pending ?: return
        val file = source
        pending = null; source = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null || file == null) { reply.success(false); return }
        Thread {
            try {
                val stream = contentResolver.openOutputStream(uri) ?: throw IllegalStateException()
                stream.use { output -> file.inputStream().use { input -> input.copyTo(output, 65536) } }
                runOnUiThread { reply.success(true) }
            } catch (_: Exception) { runOnUiThread { reply.error("save_failed", "Could not save the file", null) } }
        }.start()
    }
}
