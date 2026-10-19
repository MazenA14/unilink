package com.anonymous.unilink.schedulewidget

import android.content.Context
import android.graphics.Color
import org.json.JSONObject
import java.util.Calendar

data class WidgetSession(
  val period: String,
  val start: Int,
  val end: Int,
  val startLabel: String,
  val endLabel: String,
  val title: String,
  val type: String?,
  val room: String?,
  val code: String?,
  val color: Int,
  val count: Int,
)

enum class SessionState { PAST, CURRENT, UPCOMING }

/**
 * Storage + time logic for the schedule widget. JS (utils/scheduleWidget.ts)
 * writes a resolved weekly snapshot; everything here is pure reads so the widget
 * can re-render at any time without the React Native runtime.
 */
object ScheduleWidgetData {
  private const val PREFS_NAME = "unilink_schedule_widget"
  private const val KEY_PAYLOAD = "payload"
  private const val DEFAULT_COLOR = 0xFFFF6B6B.toInt()

  private val DAY_NAMES = arrayOf(
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  )

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun save(context: Context, json: String) {
    prefs(context).edit().putString(KEY_PAYLOAD, json).commit()
  }

  fun clear(context: Context) {
    prefs(context).edit().remove(KEY_PAYLOAD).commit()
  }

  fun dayName(now: Calendar): String = DAY_NAMES[now.get(Calendar.DAY_OF_WEEK) - 1]

  fun minutesOf(now: Calendar): Int =
    now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)

  /** Today's sessions sorted by start time, or null when no schedule has been synced. */
  fun todaySessions(context: Context, now: Calendar): List<WidgetSession>? {
    val raw = prefs(context).getString(KEY_PAYLOAD, null) ?: return null
    return try {
      val days = JSONObject(raw).optJSONObject("days") ?: return emptyList()
      val arr = days.optJSONArray(dayName(now)) ?: return emptyList()
      (0 until arr.length())
        .mapNotNull { arr.optJSONObject(it) }
        .map { o ->
          WidgetSession(
            period = o.optString("period"),
            start = o.optInt("start"),
            end = o.optInt("end"),
            startLabel = o.optString("startLabel"),
            endLabel = o.optString("endLabel"),
            title = o.optString("title"),
            type = o.optNonBlank("type"),
            room = o.optNonBlank("room"),
            code = o.optNonBlank("code"),
            color = parseColor(o.optNonBlank("color")),
            count = o.optInt("count", 1),
          )
        }
        .sortedBy { it.start }
    } catch (e: Exception) {
      null
    }
  }

  fun stateOf(session: WidgetSession, nowMinutes: Int): SessionState = when {
    nowMinutes >= session.end -> SessionState.PAST
    nowMinutes >= session.start -> SessionState.CURRENT
    else -> SessionState.UPCOMING
  }

  /**
   * Wall-clock time of the next moment the widget's content changes: the next
   * session start/end today, otherwise just after midnight (new day).
   */
  fun nextBoundaryMillis(sessions: List<WidgetSession>?, now: Calendar): Long {
    val nowMinutes = minutesOf(now)
    val next = sessions.orEmpty()
      .flatMap { listOf(it.start, it.end) }
      .filter { it > nowMinutes }
      .minOrNull()

    val target = now.clone() as Calendar
    target.set(Calendar.SECOND, 1)
    target.set(Calendar.MILLISECOND, 0)
    if (next != null) {
      target.set(Calendar.HOUR_OF_DAY, next / 60)
      target.set(Calendar.MINUTE, next % 60)
    } else {
      target.add(Calendar.DAY_OF_YEAR, 1)
      target.set(Calendar.HOUR_OF_DAY, 0)
      target.set(Calendar.MINUTE, 0)
    }
    return target.timeInMillis
  }

  fun subtitleOf(session: WidgetSession): String =
    listOfNotNull(session.period, session.type, session.room).joinToString(" · ")

  private fun JSONObject.optNonBlank(name: String): String? =
    if (isNull(name)) null else optString(name).takeIf { it.isNotBlank() }

  private fun parseColor(value: String?): Int =
    try {
      if (value != null) Color.parseColor(value) else DEFAULT_COLOR
    } catch (e: IllegalArgumentException) {
      DEFAULT_COLOR
    }
}
