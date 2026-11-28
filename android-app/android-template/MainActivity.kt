package net.greatsite.marketplace_trader

import android.app.Activity
import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.DocumentsContract
import android.webkit.MimeTypeMap
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.text.Normalizer
import java.util.Locale

class MainActivity: FlutterActivity() {
    private var linkChannel: MethodChannel? = null
    private var pending: MethodChannel.Result? = null
    private var source: File? = null
    private var folderPending: MethodChannel.Result? = null
    private val storagePrefs by lazy { getSharedPreferences("alium_storage", MODE_PRIVATE) }
    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        linkChannel = MethodChannel(engine.dartExecutor.binaryMessenger, "alium/links")
        linkChannel?.setMethodCallHandler { call, result ->
            if (call.method == "initial") result.success(intent?.dataString) else result.notImplemented()
        }
        MethodChannel(engine.dartExecutor.binaryMessenger, "marketplace_trader/files").setMethodCallHandler { call, result ->
            when (call.method) {
                "share" -> {
                    val id = call.argument<String>("uuid") ?: ""
                    val title = call.argument<String>("title") ?: ""
                    val version = call.argument<String>("version") ?: ""
                    if (!Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$").matches(id)) {
                        result.error("invalid_item", "Link unavailable", null); return@setMethodCallHandler
                    }
                    fun slug(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFKD)
                        .replace(Regex("[\\u0300-\\u036f]"), "").lowercase(Locale.ROOT)
                        .replace(Regex("[^a-z0-9]+"), "-").trim('-')
                    var titleSlug = slug(title).take(64).trimEnd('-').ifEmpty { "addon" }
                    val versionSlug = slug(version).replace(Regex("^v(?=\\d)"), "").take(24).trimEnd('-')
                    if (versionSlug.isNotEmpty() && !("-$titleSlug-").contains("-$versionSlug-") && !("-$titleSlug-").contains("-v$versionSlug-")) titleSlug += "-$versionSlug"
                    val link = "https://marketplacetrader.great-site.net/$titleSlug-${id.lowercase(Locale.ROOT)}"
                    try {
                        startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "$title\n$link") }, "Share"))
                        result.success(null)
                    } catch (_: Exception) { result.error("share_failed", "Could not share link", null) }
                }
                "getFolder" -> result.success(storagePrefs.getString("tree", null))
                "resetFolder" -> { storagePrefs.edit().remove("tree").apply(); result.success(null) }
                "chooseFolder" -> {
                    if (folderPending != null) { result.error("busy", "Folder picker is open", null); return@setMethodCallHandler }
                    folderPending = result
                    try {
                        startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                        }, 9815)
                    } catch (_: Exception) { folderPending = null; result.error("folder_failed", "Folder picker unavailable", null) }
                }
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
                    val tree = storagePrefs.getString("tree", null)
                    if (tree != null) {
                        Thread {
                            var target: Uri? = null
                            try {
                                val treeUri = Uri.parse(tree)
                                val rootId = DocumentsContract.getTreeDocumentId(treeUri)
                                val parent = DocumentsContract.buildDocumentUriUsingTree(treeUri, rootId)
                                val children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, rootId)
                                var categoryUri: Uri? = null
                                contentResolver.query(children, arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE), null, null, null)?.use { cursor ->
                                    while (cursor.moveToNext()) {
                                        if (cursor.getString(1) == category && cursor.getString(2) == DocumentsContract.Document.MIME_TYPE_DIR) {
                                            categoryUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(0)); break
                                        }
                                    }
                                }
                                val directory = categoryUri ?: DocumentsContract.createDocument(contentResolver, parent, DocumentsContract.Document.MIME_TYPE_DIR, category) ?: throw IllegalStateException()
                                target = DocumentsContract.createDocument(contentResolver, directory, mime(name), name) ?: throw IllegalStateException()
                                val output = contentResolver.openOutputStream(target!!) ?: throw IllegalStateException()
                                output.use { canonical.inputStream().use { input -> input.copyTo(it, 65536) } }
                                val saved = target.toString()
                                runOnUiThread { result.success(saved) }
                            } catch (_: Exception) {
                                target?.let { try { DocumentsContract.deleteDocument(contentResolver, it) } catch (_: Exception) {} }
                                runOnUiThread { result.error("save_failed", "Could not save to selected folder", null) }
                            }
                        }.start()
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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
                                val name = call.argument<String>("name") ?: ""
                                val ext = name.substringAfterLast('.', "").lowercase()
                                if (ext in setOf("mcpack", "mcaddon", "mcworld", "mctemplate")) {
                                    setPackage("com.mojang.minecraftpe")
                                    clipData = ClipData.newRawUri("Minecraft package", uri)
                                }
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
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.dataString?.let { linkChannel?.invokeMethod("link", it) }
    }
    private fun safeName(raw: String): String {
        val name = raw.substringAfterLast('/').substringAfterLast('\\').replace(Regex("[\\x00-\\x1f]"), "_").take(180).trim()
        return if (name.isBlank() || name == "." || name == "..") "download" else name
    }
    private fun mime(name: String): String = MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substringAfterLast('.', "").lowercase()) ?: "application/octet-stream"
    @Deprecated("Android callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 9815) {
            val reply = folderPending ?: return
            folderPending = null
            val uri = data?.data
            if (resultCode != Activity.RESULT_OK || uri == null) { reply.success(null); return }
            try {
                val flags = data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                if (flags != (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)) throw SecurityException()
                contentResolver.takePersistableUriPermission(uri, flags)
                storagePrefs.edit().putString("tree", uri.toString()).apply()
                reply.success(uri.toString())
            } catch (_: Exception) { reply.error("folder_failed", "Folder access unavailable", null) }
            return
        }
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
