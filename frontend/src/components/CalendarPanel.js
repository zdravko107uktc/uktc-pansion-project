import React, { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaEdit, FaTrashAlt } from "react-icons/fa";

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const parseMonthValue = (month) => {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1);
};

const parseDateKey = (value) => {
  const [year, month, day] = `${value}`.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatMonthValue = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const CalendarPanel = ({
  title = "Календар",
  month,
  onMonthChange,
  events = [],
  attendance = [],
  dailySummary = [],
  canManageEvents = false,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  createState,
}) => {
  const [editingEventId, setEditingEventId] = useState(null);
  const monthDate = useMemo(() => parseMonthValue(month), [month]);

  const attendanceByDay = useMemo(() => {
    const byDay = {};
    attendance.forEach((entry) => {
      const day = `${entry.timestamp}`.slice(0, 10);
      if (!byDay[day] || new Date(entry.timestamp) > new Date(byDay[day].timestamp)) {
        byDay[day] = entry;
      }
    });
    return byDay;
  }, [attendance]);

  const summaryByDay = useMemo(() => {
    const byDay = {};
    dailySummary.forEach((entry) => {
      byDay[entry.day] = entry;
    });
    return byDay;
  }, [dailySummary]);

  const eventDays = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const start = parseDateKey(event.event_date);
      const end = parseDateKey(event.end_date || event.event_date);
      const current = new Date(start);

      while (current <= end) {
        const key = toLocalDateKey(current);
        if (!map[key]) map[key] = [];
        map[key].push(event);
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  const gridDays = useMemo(() => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const mondayIndex = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const cells = [];

    for (let i = 0; i < mondayIndex; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [monthDate]);

  const monthLabel = monthDate.toLocaleDateString("bg-BG", {
    month: "long",
    year: "numeric",
  });

  const moveMonth = (delta) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1);
    onMonthChange(formatMonthValue(next));
  };

  const editingEvent = useMemo(
    () => events.find((event) => event.id === editingEventId) || null,
    [editingEventId, events]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-[#791c1c]" size={16} />
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-start self-start sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
          >
            <FaChevronLeft className="mx-auto" size={12} />
          </button>
          <div className="flex-1 sm:flex-none min-w-0 text-center text-sm font-semibold text-gray-800 capitalize">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
          >
            <FaChevronRight className="mx-auto" size={12} />
          </button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {dayNames.map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 mt-2">
            {gridDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-24 sm:min-h-28 rounded-2xl bg-slate-50/70" />;
              }

              const dayKey = toLocalDateKey(date);
              const dayAttendance = attendanceByDay[dayKey];
              const daySummary = summaryByDay[dayKey];
              const dayEvents = eventDays[dayKey] || [];

              const attendanceStyle = dayAttendance
                ? dayAttendance.approval_status === "pending"
                  ? "border-amber-200 bg-amber-50"
                  : dayAttendance.status === "enrolled"
                  ? "border-green-200 bg-green-50"
                  : "border-slate-200 bg-slate-100"
                : "border-slate-200 bg-white";

              return (
                <div key={dayKey} className={`min-h-24 sm:min-h-28 rounded-2xl border p-2.5 sm:p-3 flex flex-col gap-2 ${attendanceStyle}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#791c1c] text-white text-[10px] font-semibold">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {dayAttendance && (
                    <div className="text-[11px] font-medium">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full ${
                          dayAttendance.approval_status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : dayAttendance.status === "enrolled"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {dayAttendance.approval_status === "pending"
                          ? "Чака одобрение"
                          : dayAttendance.status === "enrolled"
                          ? "Записан"
                          : "Отписан"}
                      </span>
                    </div>
                  )}

                  {daySummary && (
                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div>Записани: {daySummary.enrolled_count}</div>
                      <div>Отписани: {daySummary.unenrolled_count}</div>
                      <div>Чакащи: {daySummary.pending_count}</div>
                    </div>
                  )}

                  {dayEvents.length > 0 && (
                    <div className="space-y-1 text-[11px] text-slate-600">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div key={`${event.id}-${dayKey}`} className="rounded-lg bg-white/80 px-2 py-1 border border-white">
                          <div className="font-semibold text-slate-700 truncate">{event.title}</div>
                          {event.description && <div className="truncate text-slate-500">{event.description}</div>}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-slate-400">+ още {dayEvents.length - 2}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {canManageEvents && (
        <CalendarEventForm
          key={editingEvent?.id || "create-form"}
          mode={editingEvent ? "edit" : "create"}
          event={editingEvent}
          onSubmit={(payload) => {
            if (editingEvent) {
              onUpdateEvent?.({ ...payload, eventId: editingEvent.id });
            } else {
              onCreateEvent?.(payload);
            }
          }}
          onCancel={() => setEditingEventId(null)}
          createState={createState}
        />
      )}

      {events.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-gray-800">Предстоящи и активни събития</h3>
          <div className="space-y-2">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 break-words">{event.title}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {parseDateKey(event.event_date).toLocaleDateString("bg-BG")}
                      {event.end_date && ` - ${parseDateKey(event.end_date).toLocaleDateString("bg-BG")}`}
                    </div>
                    {event.description && <p className="text-sm text-slate-500 mt-1 break-words">{event.description}</p>}
                  </div>
                  {canManageEvents && (
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                      <button
                        type="button"
                        onClick={() => setEditingEventId(event.id)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <FaEdit size={11} />
                        Редакция
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent?.(event.id)}
                        className="px-3 py-2 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <FaTrashAlt size={11} />
                        Изтрий
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CalendarEventForm = ({ mode, event, onSubmit, onCancel, createState }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    endDate: "",
  });

  useEffect(() => {
    setForm({
      title: event?.title || "",
      description: event?.description || "",
      eventDate: event?.event_date || "",
      endDate: event?.end_date || "",
    });
  }, [event]);

  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      eventDate: form.eventDate,
      endDate: form.endDate || null,
    });
  };

  const isEdit = mode === "edit";

  return (
    <div className="border-t border-slate-100 pt-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">
          {isEdit ? "Редакция на календарно събитие" : "Добави календарно събитие"}
        </h3>
        {isEdit && (
          <button type="button" onClick={onCancel} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
            Отказ
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          placeholder="Заглавие на събитието"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] text-sm"
          required
        />
        <input
          type="date"
          value={form.eventDate}
          onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] text-sm"
          required
        />
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] text-sm"
        />
        <input
          type="text"
          placeholder="Кратко описание"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#791c1c]/20 focus:border-[#791c1c] text-sm"
        />
        <button
          type="submit"
          disabled={createState?.loading}
          className="md:col-span-2 px-5 py-3 bg-[#791c1c] text-white font-semibold rounded-xl hover:bg-[#6b1818] transition disabled:opacity-60"
        >
          {createState?.loading ? "Записване..." : isEdit ? "Запази промените" : "Създай събитие"}
        </button>
      </form>

      {createState?.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            createState.type === "success"
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-red-50 border-red-100 text-red-600"
          }`}
        >
          {createState.message}
        </div>
      )}
    </div>
  );
};

export default CalendarPanel;
