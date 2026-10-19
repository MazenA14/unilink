package com.anonymous.unilink.schedulewidget

import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.anonymous.unilink.R
import java.util.Calendar

/** Supplies the rows of the schedule widget's ListView. */
class ScheduleWidgetService : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
    ScheduleWidgetItemFactory(applicationContext)
}

private class ScheduleWidgetItemFactory(private val context: Context) :
  RemoteViewsService.RemoteViewsFactory {

  private var sessions: List<WidgetSession> = emptyList()
  private var nowMinutes = 0

  override fun onCreate() {}

  override fun onDataSetChanged() {
    val now = Calendar.getInstance()
    sessions = ScheduleWidgetData.todaySessions(context, now).orEmpty()
    nowMinutes = ScheduleWidgetData.minutesOf(now)
  }

  override fun onDestroy() {
    sessions = emptyList()
  }

  override fun getCount(): Int = sessions.size

  override fun getViewAt(position: Int): RemoteViews {
    val session = sessions.getOrNull(position)
      ?: return RemoteViews(context.packageName, R.layout.schedule_widget_item)
    val state = ScheduleWidgetData.stateOf(session, nowMinutes)

    val layout = if (state == SessionState.PAST) {
      R.layout.schedule_widget_item_past
    } else {
      R.layout.schedule_widget_item
    }
    val views = RemoteViews(context.packageName, layout)

    views.setTextViewText(R.id.sw_item_start, session.startLabel)
    views.setTextViewText(R.id.sw_item_end, session.endLabel)
    views.setTextViewText(R.id.sw_item_title, session.title)
    views.setTextViewText(R.id.sw_item_subtitle, ScheduleWidgetData.subtitleOf(session))

    if (state != SessionState.PAST) {
      views.setInt(R.id.sw_item_bar, "setColorFilter", session.color)
    }

    val isCurrent = state == SessionState.CURRENT
    views.setViewVisibility(R.id.sw_item_now, if (isCurrent) View.VISIBLE else View.GONE)
    if (isCurrent) {
      views.setInt(R.id.sw_item_root, "setBackgroundResource", R.drawable.schedule_widget_item_current_bg)
    }

    if (session.count > 1) {
      views.setTextViewText(R.id.sw_item_count, "+${session.count - 1}")
      views.setViewVisibility(R.id.sw_item_count, View.VISIBLE)
    } else {
      views.setViewVisibility(R.id.sw_item_count, View.GONE)
    }

    views.setOnClickFillInIntent(R.id.sw_item_root, Intent())
    return views
  }

  override fun getLoadingView(): RemoteViews? = null

  override fun getViewTypeCount(): Int = 2

  override fun getItemId(position: Int): Long = position.toLong()

  override fun hasStableIds(): Boolean = false
}
