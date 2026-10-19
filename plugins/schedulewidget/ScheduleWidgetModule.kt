package com.anonymous.unilink.schedulewidget

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
}
