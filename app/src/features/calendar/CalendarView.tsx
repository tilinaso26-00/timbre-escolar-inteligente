import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@shared/ui/Button';
import { DayPicker } from 'react-day-picker';
import { useCalendar, CalendarDayInfo, formatMonthYear, isCurrentMonth } from './hooks/useCalendar';
import { DateCell } from './components/DateCell';
import { ExceptionModal } from './components/ExceptionModal';
import { Legend } from './components/Legend';
import type { JourneySchedule, ScheduleTemplate, CalendarException } from '@core/schedule-engine';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarViewProps {
  journeys: JourneySchedule[];
  templates: ScheduleTemplate[];
  exceptions: CalendarException[];
  activeJourney: 'matutina' | 'vespertina';
  setActiveJourney: (journey: 'matutina' | 'vespertina') => void;
  onSaveException: (exception: CalendarException) => Promise<void>;
  onDeleteException: (id: string) => Promise<void>;
}

const LEGEND_ITEMS = [
  { color: 'bg-green-100', label: 'Normal', description: 'Horario base de la jornada' },
  { color: 'bg-blue-100', label: 'Corto', description: 'Períodos reducidos' },
  { color: 'bg-purple-100', label: 'Largo', description: 'Períodos extendidos' },
  { color: 'bg-orange-100', label: 'Examen', description: 'Solo exámenes' },
  { color: 'bg-pink-100', label: 'Actividades', description: 'Actividades especiales' },
  { color: 'bg-red-100', label: 'Sin clases', description: 'No suena el timbre' },
  { color: 'bg-gray-100', label: 'Personalizado', description: 'Eventos específicos' },
  { color: 'bg-yellow-100', label: 'Plantilla día', description: 'Según plantilla semanal' },
  { color: 'bg-slate-100', label: 'Por defecto', description: 'Horario base sin excepciones' },
] as const;

export function CalendarView({
  journeys,
  templates,
  exceptions,
  activeJourney,
  setActiveJourney,
  onSaveException,
  onDeleteException,
}: CalendarViewProps) {
  const {
    currentMonth,
    selectedDate,
    selectedJourney,
    dayInfoMap,
    nextMonth,
    prevMonth,
    selectDate,
    removeException,
    getDayInfo,
    setCurrentMonth,
  } = useCalendar(journeys, templates, exceptions, onSaveException, onDeleteException);

  const [showExceptionModal, setShowExceptionModal] = useState(false);

  const handleDateClick = (date: Date) => {
    selectDate(date);
    setShowExceptionModal(true);
  };

  const handleDateRightClick = (e: React.MouseEvent<HTMLButtonElement>, date: Date) => {
    e.preventDefault();
    const dayInfo = getDayInfo(date, selectedJourney);
    if (dayInfo?.exception) {
      selectDate(date);
      setShowExceptionModal(true);
    }
  };

  const handleSaveException = (exceptionData: Partial<CalendarException>) => {
    if (!selectedDate) return;
    const exception: CalendarException = {
      id: `exc-${format(selectedDate, 'yyyy-MM-dd')}-${selectedJourney}-${Date.now()}`,
      date: format(selectedDate, 'yyyy-MM-dd'),
      journey: selectedJourney,
      type: exceptionData.type || 'schedule',
      scheduleId: exceptionData.scheduleId,
      customEvents: exceptionData.customEvents,
      name: exceptionData.name || '',
      description: exceptionData.description,
      createdAt: new Date().toISOString(),
    };
    onSaveException(exception);
    setShowExceptionModal(false);
  };

  const handleDeleteException = () => {
    if (!selectedDate) return;
    removeException(selectedDate, selectedJourney);
    setShowExceptionModal(false);
  };

  const months = [
    { value: 0, label: 'Enero' }, { value: 1, label: 'Febrero' }, { value: 2, label: 'Marzo' },
    { value: 3, label: 'Abril' }, { value: 4, label: 'Mayo' }, { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' }, { value: 7, label: 'Agosto' }, { value: 8, label: 'Septiembre' },
    { value: 9, label: 'Octubre' }, { value: 10, label: 'Noviembre' }, { value: 11, label: 'Diciembre' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentMonth.getFullYear() - 5 + i);

  const getDayInfoForDayPicker = (day: { date: Date } | Date): CalendarDayInfo | null => {
    const date = day instanceof Date ? day : day.date;
    return getDayInfo(date, selectedJourney);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario Académico</h1>
          <p className="text-gray-500 mt-1">Asigne horarios especiales, días sin clases y excepciones por fecha</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setActiveJourney('matutina')} disabled={activeJourney === 'matutina'}>
            🌅 Matutina
          </Button>
          <Button variant="outline" onClick={() => setActiveJourney('vespertina')} disabled={activeJourney === 'vespertina'}>
            🌆 Vespertina
          </Button>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
            <CalendarIcon className="h-4 w-4 mr-1" /> Mes actual
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={prevMonth} aria-label="Mes anterior">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center min-w-[180px]">
              <p className="text-lg font-semibold text-gray-900 capitalize">{formatMonthYear(currentMonth)}</p>
              <p className="text-sm text-gray-500">Jornada: {selectedJourney === 'matutina' ? '🌅 Matutina' : '🌆 Vespertina'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={nextMonth} aria-label="Mes siguiente">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentMonth.getMonth()}
              onChange={e => setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1))}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={currentMonth.getFullYear()}
              onChange={e => setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1))}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <Legend items={LEGEND_ITEMS} title="Leyenda:" />

        <div className="mt-4">
          <DayPicker
            month={currentMonth}
            numberOfMonths={1}
            showWeekNumber
            weekStartsOn={1}
            locale={es}
            mode="single"
            required
            selected={selectedDate ?? undefined}
            onSelect={handleDateClick}
            classNames={{
              root: 'rdp',
              month: 'rdp-month',
              nav: 'rdp-nav',
              weekdays: 'rdp-weekdays',
              weekday: 'rdp-weekday',
              week_number: 'rdp-weeknumber',
              week: 'rdp-week',
              day: 'rdp-day',
              day_button: 'rdp-day_button',
              today: 'rdp-today',
              selected: 'rdp-selected',
              disabled: 'rdp-disabled',
              outside: 'rdp-outside',
            }}
            components={{
              Day: ({ day, modifiers, ...props }) => {
                const dayInfo = getDayInfoForDayPicker(day);
                const isCurrent = isCurrentMonth(day.date, currentMonth);
                const selected = modifiers.selected;
                const today = modifiers.today;

                if (!dayInfo) {
                  return (
                    <td {...props}>
                      <div className="rdp-day_button h-24 w-full p-2" aria-hidden="true" />
                    </td>
                  );
                }

                return (
                  <td {...props}>
                    <DateCell
                      dayInfo={dayInfo}
                      isSelected={selected}
                      isToday={today}
                      isCurrentMonth={isCurrent}
                      onClick={() => handleDateClick(day.date)}
                      onRightClick={e => handleDateRightClick(e, day.date)}
                    />
                  </td>
                );
              },
            }}
          />
        </div>
      </div>

      {selectedDate && showExceptionModal && (
        <ExceptionModal
          isOpen={showExceptionModal}
          onClose={() => { selectDate(null); setShowExceptionModal(false); }}
          date={selectedDate}
          journey={selectedJourney}
          existingException={dayInfoMap.get(`${format(selectedDate, 'yyyy-MM-dd')}-${selectedJourney}`)?.exception || null}
          templates={templates}
          journeySchedule={journeys.find(j => j.journey === selectedJourney) || null}
          onSave={handleSaveException}
          onDelete={handleDeleteException}
        />
      )}
    </div>
  );
}