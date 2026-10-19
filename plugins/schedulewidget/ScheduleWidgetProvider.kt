package com.anonymous.unilink.schedulewidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import com.anonymous.unilink.R
import java.util.Calendar

/**
 * Home-screen widget showing today's schedule with the current/next session
 * highlighted. Re-renders itself at every slot boundary via AlarmManager (and
 * every 30 min via updatePeriodMillis as a fallback), so the "Now" session stays
 * correct without the app running.
 */
class ScheduleWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    refreshAll(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_REFRESH,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> refreshAll(context)
    }
  }

  override fun onDisabled(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.cancel(refreshIntent(context))
  }

  companion object {
    private const val ACTION_REFRESH = "com.anonymous.unilink.schedulewidget.REFRESH"

    /** Re-render every placed widget and schedule the next boundary refresh. */
    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, ScheduleWidgetProvider::class.java))
      val alarms = context.getSystemService(AlarmManager::class.java)
      if (ids.isEmpty()) {
        alarms?.cancel(refreshIntent(context))
        return
      }

      val now = Calendar.getInstance()
      val sessions = ScheduleWidgetData.todaySessions(context, now)

      for (id in ids) {
        manager.updateAppWidget(id, buildViews(context, id, sessions, now))
      }
      @Suppress("DEPRECATION")
      manager.notifyAppWidgetViewDataChanged(ids, R.id.sw_list)

      alarms?.let { scheduleNext(context, it, ScheduleWidgetData.nextBoundaryMillis(sessions, now)) }
    }

    private fun buildViews(
      context: Context,
      appWidgetId: Int,
      sessions: List<WidgetSession>?,
      now: Calendar,
    ): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.schedule_widget)
      val nowMinutes = ScheduleWidgetData.minutesOf(now)

      views.setTextViewText(R.id.sw_day, ScheduleWidgetData.dayName(now))

      // Status card: current session, else the next one, else a day summary
      val current = sessions?.firstOrNull { ScheduleWidgetData.stateOf(it, nowMinutes) == SessionState.CURRENT }
      val next = sessions?.firstOrNull { ScheduleWidgetData.stateOf(it, nowMinutes) == SessionState.UPCOMING }
      val (label, title, subtitle) = when {
        sessions == null -> Triple("UniLink", "No schedule yet", "Open the app to load your schedule")
        sessions.isEmpty() -> Triple("Day off", "No classes today", "Enjoy your free day")
        current != null -> Triple(
          "Now",
          current.title,
          listOfNotNull(current.room, "until ${current.endLabel}").joinToString(" · ")
        )
        next != null -> Triple(
          "Next",
          next.title,
          listOfNotNull(next.room, "${next.period} at ${next.startLabel}").joinToString(" · ")
        )
        else -> Triple("Done", "No more classes today", "${sessions.size} classes today")
      }
      views.setTextViewText(R.id.sw_status_label, label.uppercase())
      views.setTextViewText(R.id.sw_status_title, title)
      views.setTextViewText(R.id.sw_status_subtitle, subtitle)

      // Session list (rendered by ScheduleWidgetService)
      val serviceIntent = Intent(context, ScheduleWidgetService::class.java).apply {
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        // Make the intent unique per widget so each gets its own factory
        data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
      }
      @Suppress("DEPRECATION")
      views.setRemoteAdapter(R.id.sw_list, serviceIntent)
      views.setEmptyView(R.id.sw_list, R.id.sw_empty)
      views.setTextViewText(
        R.id.sw_empty,
        if (sessions == null) "Sign in to UniLink to see your classes here" else "Nothing scheduled today"
      )

      // Taps open the app
      views.setOnClickPendingIntent(android.R.id.background, openAppIntent(context, 0, mutable = false))
      views.setPendingIntentTemplate(R.id.sw_list, openAppIntent(context, 1, mutable = true))

      return views
    }

    private fun scheduleNext(context: Context, alarms: AlarmManager, triggerAt: Long) {
      val pending = refreshIntent(context)
      alarms.cancel(pending)
      // Non-wakeup alarm: if the screen is off it fires as soon as the device wakes
      val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()
      try {
        if (canExact) {
          alarms.setExact(AlarmManager.RTC, triggerAt, pending)
        } else {
          alarms.setWindow(AlarmManager.RTC, triggerAt, 60_000L, pending)
        }
      } catch (e: SecurityException) {
        alarms.setWindow(AlarmManager.RTC, triggerAt, 60_000L, pending)
      }
    }

    private fun refreshIntent(context: Context): PendingIntent {
      val intent = Intent(context, ScheduleWidgetProvider::class.java).setAction(ACTION_REFRESH)
      return PendingIntent.getBroadcast(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun openAppIntent(context: Context, requestCode: Int, mutable: Boolean): PendingIntent {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent().setClassName(context.packageName, "${context.packageName}.MainActivity")
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

      // List item clicks merge a fill-in intent, which requires a mutable template on S+
      val mutability = if (mutable && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        PendingIntent.FLAG_MUTABLE
      } else {
        PendingIntent.FLAG_IMMUTABLE
      }
      return PendingIntent.getActivity(
        context,
        requestCode,
        launch,
        PendingIntent.FLAG_UPDATE_CURRENT or mutability
      )
    }
  }
}
