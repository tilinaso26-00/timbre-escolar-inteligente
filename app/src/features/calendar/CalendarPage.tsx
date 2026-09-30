import { CalendarView } from './CalendarView';
import { useSchedule } from '@shared/hooks/useSchedule';

export function CalendarPage() {
  const { journeys, templates, exceptions, activeJourney, setActiveJourney, saveException, deleteException } = useSchedule();

  return (
    <div className="p-6">
      <CalendarView
        journeys={journeys}
        templates={templates}
        exceptions={exceptions}
        activeJourney={activeJourney}
        setActiveJourney={setActiveJourney}
        onSaveException={saveException}
        onDeleteException={deleteException}
      />
    </div>
  );
}