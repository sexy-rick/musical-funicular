package net.greatsite.marketplace_trader

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.MimeTypeMap
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
            when (call.method) {
                "save" -> {
                    val file = File(call.argument<String>("path") ?: "")
                    val base = filesDir.canonicalFile
                    val canonical = try { file.canonicalFile } catch (_: Exception) { null }
                    if (canonical == null || !canonical.path.startsWith(base.path + File.separator) || !canonical.isFile) {
                        result.error("invalid_file", "File is unavailable", null); return@setMethodCallHandler
                    }
                    val name = safeName(call.argument<String>("name") ?: "download")
                    val folders = setOf("Add-ons", "Texture packs", "Skin packs", "Worlds", "Mash-up packs", "Templates", "Applications", "Other")
                    val category = call.argument<String>("category").takeIf { folders.contains(it) } ?: "Other"
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        Thread {
                            var uri: Uri? = null
                            try {
                                val values = ContentValues().apply {
                                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                                    put(MediaStore.Downloads.MIME_TYPE, mime(name))
                                    put(MediaStore.Downloads.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/Alium/$category/")
                                    put(MediaStore.Downloads.IS_PENDING, 1)
                                }
                                val target = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: throw IllegalStateException()
                                uri = target
                                val output = contentResolver.openOutputStream(target) ?: throw IllegalStateException()
                                output.use { canonical.inputStream().use { input -> input.copyTo(it, 65536) } }
                                val done = ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }
                                if (contentResolver.update(target, done, null, null) != 1) throw IllegalStateException()
                                val saved = target.toString()
                                runOnUiThread { result.success(saved) }
                            } catch (_: Exception) {
                                uri?.let { try { contentResolver.delete(it, null, null) } catch (_: Exception) {} }
                                runOnUiThread { result.error("save_failed", "Could not save the file", null) }
                            }
                        }.start()
                    } else {
                        if (pending != null) { result.error("busy", "A save dialog is already open", null); return@setMethodCallHandler }
                        source = canonical; pending = result
                        try {
                            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE); type = mime(name); putExtra(Intent.EXTRA_TITLE, name)
                            }
                            startActivityForResult(intent, 9814)
                        } catch (_: Exception) { source = null; pending = null; result.error("save_failed", "Could not open save dialog", null) }
                    }
                }
                "open", "delete" -> {
                    val uri = try { Uri.parse(call.argument<String>("uri") ?: "") } catch (_: Exception) { null }
                    if (uri == null || uri.scheme != "content") { result.error("invalid_uri", "File is unavailable", null); return@setMethodCallHandler }
                    try {
                        if (call.method == "open") {
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                setDataAndType(uri, contentResolver.getType(uri) ?: "application/octet-stream")
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            startActivity(intent)
                        } else if (contentResolver.delete(uri, null, null) < 1) throw IllegalStateException()
                        result.success(null)
                    } catch (_: Exception) { result.error("file_unavailable", "File is missing or no compatible app is installed", null) }
                }
                else -> result.notImplemented()
            }
        }
    }
    private fun safeName(raw: String): String {
        val name = raw.substringAfterLast('/').substringAfterLast('\\').replace(Regex("[\\x00-\\x1f]"), "_").take(180).trim()
        return if (name.isBlank() || name == "." || name == "..") "download" else name
    }
    private fun mime(name: String): String = MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substringAfterLast('.', "").lowercase()) ?: "application/octet-stream"
    @Deprecated("Android callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 9814) return
        val reply = pending ?: return; val file = source; pending = null; source = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null || file == null) { reply.success(null); return }
        try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) } catch (_: Exception) {}
        Thread {
            try {
                val stream = contentResolver.openOutputStream(uri) ?: throw IllegalStateException()
                stream.use { output -> file.inputStream().use { input -> input.copyTo(output, 65536) } }
                runOnUiThread { reply.success(uri.toString()) }
            } catch (_: Exception) { runOnUiThread { reply.error("save_failed", "Could not save the file", null) } }
        }.start()
    }
}
