package com.anonymous.unilink.gucauth

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import cz.msebera.android.httpclient.HttpHost
import cz.msebera.android.httpclient.auth.AuthScope
import cz.msebera.android.httpclient.auth.NTCredentials
import cz.msebera.android.httpclient.client.CookieStore
import cz.msebera.android.httpclient.client.config.CookieSpecs
import cz.msebera.android.httpclient.client.config.RequestConfig
import cz.msebera.android.httpclient.client.methods.HttpEntityEnclosingRequestBase
import cz.msebera.android.httpclient.client.methods.HttpGet
import cz.msebera.android.httpclient.client.methods.HttpPost
import cz.msebera.android.httpclient.client.methods.HttpRequestBase
import cz.msebera.android.httpclient.client.protocol.HttpClientContext
import cz.msebera.android.httpclient.config.RegistryBuilder
import cz.msebera.android.httpclient.conn.socket.ConnectionSocketFactory
import cz.msebera.android.httpclient.conn.socket.PlainConnectionSocketFactory
import cz.msebera.android.httpclient.conn.ssl.NoopHostnameVerifier
import cz.msebera.android.httpclient.conn.ssl.SSLConnectionSocketFactory
import cz.msebera.android.httpclient.entity.StringEntity
import cz.msebera.android.httpclient.impl.client.BasicCookieStore
import cz.msebera.android.httpclient.impl.client.CloseableHttpClient
import cz.msebera.android.httpclient.impl.client.HttpClients
import cz.msebera.android.httpclient.impl.client.BasicCredentialsProvider
import cz.msebera.android.httpclient.impl.conn.PoolingHttpClientConnectionManager
import cz.msebera.android.httpclient.impl.cookie.BasicClientCookie
import cz.msebera.android.httpclient.util.EntityUtils
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.Date
import java.util.concurrent.Executors
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * Native NTLM client for GUC endpoints.
 *
 * Replaces the old Vercel proxy: performs NTLMv2 authentication on-device and
 * keeps a persistent cookie jar + persistent credentials so the ASP.NET session
 * cookie survives across requests and app restarts. NTLM only re-runs when the
 * session actually expires, which makes subsequent calls fast.
 */
class GucAuthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  private val prefs: SharedPreferences =
    reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  // Single background executor: Apache HttpClient calls are blocking.
  private val executor = Executors.newSingleThreadExecutor()

  private val cookieStore: CookieStore = BasicCookieStore()
  private var httpContext: HttpClientContext = HttpClientContext.create()

  private var username: String? = null
  private var password: String? = null

  @Volatile
  private var client: CloseableHttpClient? = null

  init {
    username = prefs.getString(KEY_USERNAME, null)
    password = prefs.getString(KEY_PASSWORD, null)
    loadCookies()
  }

  override fun getName(): String = "GucAuth"

  // ---------------------------------------------------------------------------
  // JS API
  // ---------------------------------------------------------------------------

  @ReactMethod
  fun setCredentials(user: String, pass: String, promise: Promise) {
    executor.execute {
      try {
        username = user
        password = pass
        prefs.edit().putString(KEY_USERNAME, user).putString(KEY_PASSWORD, pass).apply()
        // Rebuild the client so the new credentials take effect.
        rebuildClient()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SET_CREDENTIALS_FAILED", e.message, e)
      }
    }
  }

  @ReactMethod
  fun clearCredentials(promise: Promise) {
    executor.execute {
      try {
        username = null
        password = null
        prefs.edit().remove(KEY_USERNAME).remove(KEY_PASSWORD).apply()
        rebuildClient()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CLEAR_CREDENTIALS_FAILED", e.message, e)
      }
    }
  }

  @ReactMethod
  fun clearCookies(promise: Promise) {
    executor.execute {
      try {
        cookieStore.clear()
        // Drop cached auth/connection state so the next request re-handshakes.
        httpContext = HttpClientContext.create()
        persistCookies()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CLEAR_COOKIES_FAILED", e.message, e)
      }
    }
  }

  @ReactMethod
  fun hasSession(promise: Promise) {
    executor.execute {
      try {
        val now = Date()
        val alive = cookieStore.cookies.any { !it.isExpired(now) }
        promise.resolve(alive)
      } catch (e: Exception) {
        promise.reject("HAS_SESSION_FAILED", e.message, e)
      }
    }
  }

  /**
   * Perform an authenticated request to a GUC URL.
   *
   * Resolves with { status: Int, body: String, headers: { lower-cased -> String } }.
   * Redirects are NOT followed automatically (callers inspect 302/Location and
   * GUC's JS-based `sTo()` redirects), matching the old proxy's behavior.
   */
  @ReactMethod
  fun request(url: String, method: String, body: String?, headers: ReadableMap?, promise: Promise) {
    executor.execute {
      var httpRequest: HttpRequestBase? = null
      try {
        val active = ensureClient()

        val upper = (method ?: "GET").uppercase()
        httpRequest = if (upper == "POST" || upper == "PUT") {
          val enclosing: HttpEntityEnclosingRequestBase =
            if (upper == "PUT") cz.msebera.android.httpclient.client.methods.HttpPut(url) else HttpPost(url)
          enclosing.entity = StringEntity(body ?: "", "UTF-8")
          enclosing
        } else {
          HttpGet(url)
        }

        // Default headers (User-Agent mirrors the old httpntlm proxy).
        httpRequest.setHeader("User-Agent", USER_AGENT)

        var hasContentType = false
        if (headers != null) {
          val it = headers.keySetIterator()
          while (it.hasNextKey()) {
            val key = it.nextKey()
            val value = headers.getString(key) ?: continue
            if (key.equals("Content-Type", ignoreCase = true)) hasContentType = true
            httpRequest.setHeader(key, value)
          }
        }
        // Default form content-type for POST/PUT bodies, like the proxy did.
        if (!hasContentType && (upper == "POST" || upper == "PUT")) {
          httpRequest.setHeader("Content-Type", "application/x-www-form-urlencoded")
        }

        active.execute(httpRequest, httpContext).use { response ->
          val status = response.statusLine.statusCode
          val entity = response.entity
          val responseBody = if (entity != null) EntityUtils.toString(entity, "UTF-8") else ""

          val headerMap: WritableMap = Arguments.createMap()
          for (h in response.allHeaders) {
            val name = h.name.lowercase()
            val existing = if (headerMap.hasKey(name)) headerMap.getString(name) else null
            headerMap.putString(name, if (existing != null) "$existing, ${h.value}" else h.value)
          }

          // Persist any updated session cookies for future requests / restarts.
          persistCookies()

          val result: WritableMap = Arguments.createMap()
          result.putInt("status", status)
          result.putString("body", responseBody)
          result.putMap("headers", headerMap)
          promise.resolve(result)
        }
      } catch (e: Exception) {
        promise.reject("REQUEST_FAILED", e.message, e)
      } finally {
        try { httpRequest?.releaseConnection() } catch (_: Exception) {}
      }
    }
  }

  /**
   * Download a (potentially binary) resource to a local file using the
   * authenticated NTLM session. Unlike [request], the response body is streamed
   * straight to disk instead of being decoded as UTF-8, so PDFs / Office files /
   * images are not corrupted.
   *
   * `destPath` may be a plain filesystem path or a `file://` URI. Resolves with
   * { status, filePath, fileName, contentType }. Follows one redirect hop so
   * CMS `Download.aspx` handlers that 302 to the real file work transparently.
   */
  @ReactMethod
  fun downloadFile(url: String, destPath: String, headers: ReadableMap?, promise: Promise) {
    executor.execute {
      var httpRequest: HttpRequestBase? = null
      try {
        val active = ensureClient()
        val path = destPath.removePrefix("file://")
        val file = File(path)
        file.parentFile?.mkdirs()

        var currentUrl = url
        var redirects = 0
        var status = 0
        var fileName: String? = null
        var contentType: String? = null

        while (true) {
          httpRequest = HttpGet(currentUrl)
          httpRequest!!.setHeader("User-Agent", USER_AGENT)
          if (headers != null) {
            val it = headers.keySetIterator()
            while (it.hasNextKey()) {
              val key = it.nextKey()
              val value = headers.getString(key) ?: continue
              httpRequest!!.setHeader(key, value)
            }
          }

          val response = active.execute(httpRequest, httpContext)
          status = response.statusLine.statusCode

          // Follow redirects manually (client has redirects disabled).
          if (status in intArrayOf(301, 302, 303, 307, 308) && redirects < 5) {
            val location = response.getFirstHeader("Location")?.value
            try { EntityUtils.consumeQuietly(response.entity) } catch (_: Exception) {}
            response.close()
            httpRequest?.releaseConnection()
            if (location.isNullOrBlank()) break
            currentUrl = if (location.startsWith("http")) location else {
              val base = Uri.parse(currentUrl)
              if (location.startsWith("/")) "${base.scheme}://${base.host}$location"
              else "${base.scheme}://${base.host}${base.path?.substringBeforeLast('/')}/$location"
            }
            redirects++
            continue
          }

          if (status !in 200..299) {
            try { EntityUtils.consumeQuietly(response.entity) } catch (_: Exception) {}
            response.close()
            break
          }

          contentType = response.getFirstHeader("Content-Type")?.value
          fileName = parseFileName(response.getFirstHeader("Content-Disposition")?.value, currentUrl)

          response.entity?.content?.use { input ->
            FileOutputStream(file).use { output ->
              input.copyTo(output, 16 * 1024)
            }
          }
          response.close()
          break
        }

        persistCookies()

        if (status !in 200..299) {
          try { if (file.exists()) file.delete() } catch (_: Exception) {}
          val result: WritableMap = Arguments.createMap()
          result.putInt("status", status)
          promise.resolve(result)
          return@execute
        }

        val result: WritableMap = Arguments.createMap()
        result.putInt("status", status)
        result.putString("filePath", "file://$path")
        result.putString("fileName", fileName ?: file.name)
        if (contentType != null) result.putString("contentType", contentType)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("DOWNLOAD_FAILED", e.message, e)
      } finally {
        try { httpRequest?.releaseConnection() } catch (_: Exception) {}
      }
    }
  }

  /**
   * Open a previously downloaded local file with the device's default viewer
   * (ACTION_VIEW), so content is previewed in-place rather than kicking the user
   * to an unauthenticated browser. Uses a FileProvider content:// URI.
   */
  @ReactMethod
  fun openFile(filePath: String, mimeType: String?, promise: Promise) {
    try {
      val path = filePath.removePrefix("file://")
      val file = File(path)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File does not exist: $path")
        return
      }
      val authority = "${reactApplicationContext.packageName}.gucauth.fileprovider"
      val uri: Uri = FileProvider.getUriForFile(reactApplicationContext, authority, file)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mimeType ?: "*/*")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      val activity = reactApplicationContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        reactApplicationContext.applicationContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (e: android.content.ActivityNotFoundException) {
      promise.reject("NO_VIEWER_APP", "No app is available to open this file type.", e)
    } catch (e: Exception) {
      promise.reject("OPEN_FILE_FAILED", e.message, e)
    }
  }

  /**
   * Copy an already-downloaded local file into the device's public Downloads
   * collection so it shows up in the Downloads app / file manager. Uses
   * MediaStore on Android 10+ (no storage permission needed); falls back to a
   * direct write on older versions. Resolves with { uri, fileName }.
   */
  @ReactMethod
  fun saveToDownloads(srcPath: String, fileName: String, mimeType: String?, promise: Promise) {
    executor.execute {
      try {
        val src = File(srcPath.removePrefix("file://"))
        if (!src.exists()) {
          promise.reject("FILE_NOT_FOUND", "Source file does not exist: ${src.path}")
          return@execute
        }
        val mime = mimeType ?: "application/octet-stream"
        val savedUri: String

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val resolver = reactApplicationContext.contentResolver
          val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
            put(MediaStore.Downloads.MIME_TYPE, mime)
            put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            put(MediaStore.Downloads.IS_PENDING, 1)
          }
          val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
          val itemUri = resolver.insert(collection, values)
            ?: throw Exception("Failed to create Downloads entry")
          resolver.openOutputStream(itemUri).use { out ->
            if (out == null) throw Exception("Cannot open output stream for Downloads")
            src.inputStream().use { input -> input.copyTo(out, 16 * 1024) }
          }
          values.clear()
          values.put(MediaStore.Downloads.IS_PENDING, 0)
          resolver.update(itemUri, values, null, null)
          savedUri = itemUri.toString()
        } else {
          val downloads =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
          if (!downloads.exists()) downloads.mkdirs()
          // Avoid clobbering an existing file: append " (n)" before the extension.
          var dest = File(downloads, fileName)
          if (dest.exists()) {
            val dot = fileName.lastIndexOf('.')
            val base = if (dot > 0) fileName.substring(0, dot) else fileName
            val ext = if (dot > 0) fileName.substring(dot) else ""
            var i = 1
            while (dest.exists()) { dest = File(downloads, "$base ($i)$ext"); i++ }
          }
          src.inputStream().use { input ->
            FileOutputStream(dest).use { out -> input.copyTo(out, 16 * 1024) }
          }
          savedUri = "file://${dest.absolutePath}"
        }

        val result: WritableMap = Arguments.createMap()
        result.putString("uri", savedUri)
        result.putString("fileName", fileName)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("SAVE_FAILED", e.message, e)
      }
    }
  }

  /** Best-effort filename from a Content-Disposition header, falling back to the URL. */
  private fun parseFileName(contentDisposition: String?, url: String): String? {
    if (!contentDisposition.isNullOrBlank()) {
      // filename*=UTF-8''name.ext  (RFC 5987)
      Regex("filename\\*=(?:UTF-8'')?\"?([^\";]+)\"?", RegexOption.IGNORE_CASE)
        .find(contentDisposition)?.groupValues?.getOrNull(1)?.let {
          val decoded = try { java.net.URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
          if (decoded.isNotBlank()) return decoded.trim()
        }
      // filename="name.ext"
      Regex("filename=\"?([^\";]+)\"?", RegexOption.IGNORE_CASE)
        .find(contentDisposition)?.groupValues?.getOrNull(1)?.let {
          if (it.isNotBlank()) return it.trim()
        }
    }
    // Fall back to the last path segment of the URL.
    return try {
      val seg = Uri.parse(url).lastPathSegment
      if (!seg.isNullOrBlank() && seg.contains('.')) seg else null
    } catch (_: Exception) { null }
  }

  // ---------------------------------------------------------------------------
  // Client construction
  // ---------------------------------------------------------------------------

  private fun ensureClient(): CloseableHttpClient {
    val existing = client
    if (existing != null) return existing
    return rebuildClient()
  }

  @Synchronized
  private fun rebuildClient(): CloseableHttpClient {
    try { client?.close() } catch (_: Exception) {}

    // GUC serves an incomplete/older TLS chain; the old proxy used
    // rejectUnauthorized:false. Trust-all is scoped to this client, which only
    // ever talks to *.guc.edu.eg, matching the previous production behavior.
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(TrustAllManager()), java.security.SecureRandom())
    val sslSocketFactory = SSLConnectionSocketFactory(sslContext, NoopHostnameVerifier.INSTANCE)

    val registry = RegistryBuilder.create<ConnectionSocketFactory>()
      .register("http", PlainConnectionSocketFactory.getSocketFactory())
      .register("https", sslSocketFactory)
      .build()

    val connManager = PoolingHttpClientConnectionManager(registry)
    connManager.maxTotal = 10
    connManager.defaultMaxPerRoute = 6

    val requestConfig = RequestConfig.custom()
      .setCookieSpec(CookieSpecs.STANDARD)
      .setConnectTimeout(20000)
      .setSocketTimeout(45000)
      .setConnectionRequestTimeout(20000)
      .setRedirectsEnabled(false)
      .build()

    val credsProvider = BasicCredentialsProvider()
    val u = username
    val p = password
    if (!u.isNullOrEmpty() && p != null) {
      // Empty domain/workstation, exactly like the httpntlm proxy config.
      credsProvider.setCredentials(AuthScope.ANY, NTCredentials(u, p, "", ""))
    }

    val built = HttpClients.custom()
      .setConnectionManager(connManager)
      .setDefaultRequestConfig(requestConfig)
      .setDefaultCredentialsProvider(credsProvider)
      .setDefaultCookieStore(cookieStore)
      .setUserAgent(USER_AGENT)
      .build()

    // Fresh context so auth/cookie state is bound to the current credentials.
    httpContext = HttpClientContext.create()
    httpContext.cookieStore = cookieStore
    httpContext.credentialsProvider = credsProvider

    client = built
    return built
  }

  // ---------------------------------------------------------------------------
  // Cookie persistence (survives app restarts)
  // ---------------------------------------------------------------------------

  private fun persistCookies() {
    try {
      val arr = JSONArray()
      val now = Date()
      for (c in cookieStore.cookies) {
        if (c.isExpired(now)) continue
        val o = JSONObject()
        o.put("name", c.name)
        o.put("value", c.value)
        o.put("domain", c.domain ?: "")
        o.put("path", c.path ?: "/")
        o.put("expiry", c.expiryDate?.time ?: -1L)
        arr.put(o)
      }
      prefs.edit().putString(KEY_COOKIES, arr.toString()).apply()
    } catch (_: Exception) {}
  }

  private fun loadCookies() {
    try {
      val raw = prefs.getString(KEY_COOKIES, null) ?: return
      val arr = JSONArray(raw)
      val now = Date()
      for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        val cookie = BasicClientCookie(o.getString("name"), o.getString("value"))
        cookie.domain = o.optString("domain", "")
        cookie.path = o.optString("path", "/")
        val expiry = o.optLong("expiry", -1L)
        if (expiry > 0) {
          val d = Date(expiry)
          if (d.before(now)) continue
          cookie.expiryDate = d
        }
        cookieStore.addCookie(cookie)
      }
    } catch (_: Exception) {}
  }

  private class TrustAllManager : X509TrustManager {
    override fun checkClientTrusted(chain: Array<out java.security.cert.X509Certificate>?, authType: String?) {}
    override fun checkServerTrusted(chain: Array<out java.security.cert.X509Certificate>?, authType: String?) {}
    override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
  }

  companion object {
    private const val PREFS_NAME = "guc_auth_prefs"
    private const val KEY_USERNAME = "guc_username"
    private const val KEY_PASSWORD = "guc_password"
    private const val KEY_COOKIES = "guc_cookies"
    private const val USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  }
}
