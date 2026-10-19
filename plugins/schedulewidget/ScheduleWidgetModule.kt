package com.anonymous.unilink.schedulewidget

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

/** JS bridge (`NativeModules.ScheduleWidget`) used by utils/scheduleWidget.ts. */
class ScheduleWidgetModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ScheduleWidget"

  @ReactMethod
  fun setData(json: String, promise: Promise) {
    try {
      JSONObject(json) // validate before persisting
      ScheduleWidgetData.save(reactApplicationContext, json)
      ScheduleWidgetProvider.refreshAll(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_SCHEDULE_WIDGET", e.message, e)
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    try {
      ScheduleWidgetData.clear(reactApplicationContext)
      ScheduleWidgetProvider.refreshAll(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_SCHEDULE_WIDGET", e.message, e)
    }
  }

  /** Whether exact alarms are allowed; class reminders fire late without it (Android 12+). */
  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(true)
      return
    }
    val alarms = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    promise.resolve(alarms.canScheduleExactAlarms())
  }

  /** Open the system "Alarms & reminders" page for this app. */
  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(false)
      return
    }
    try {
      val intent = Intent(
        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
        Uri.parse("package:${reactApplicationContext.packageName}")
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_EXACT_ALARM_SETTINGS", e.message, e)
    }
  }
}
