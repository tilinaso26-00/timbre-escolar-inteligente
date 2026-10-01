import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useToast } from '@shared/ui/Toast';

export interface DemoEvent {
  name: string;
  type: 'entrada' | 'salida' | 'cambio_periodo' | 'recreo_inicio' | 'recreo_fin' | 'actividad_especial';
  journey: 'matutina' | 'vespertina';
}

export interface DemoState {
  running: boolean;
  speed: number; // 1s real = X min simulados (default 60)
  simulatedTime: Date;
  realStartTime: number | null;
  lastTick: number;
}

const DEMO_EVENTS: DemoEvent[] = [
  { name: 'Entrada', type: 'entrada', journey: 'matutina' },
  { name: 'Cambio Período 1', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Cambio Período 2', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Recreo', type: 'recreo_inicio', journey: 'matutina' },
  { name: 'Fin Recreo', type: 'recreo_fin', journey: 'matutina' },
  { name: 'Cambio Período 3', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Cambio Período 4', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Salida', type: 'salida', journey: 'matutina' },
];

export function useDemoMode() {
  const { sendMessage } = useWebSocket();
  const { addToast } = useToast();

  const [state, setState] = useState<DemoState>({
    running: false,
    speed: 60,
    simulatedTime: new Date(),
    realStartTime: null,
    lastTick: 0,
  });

  const intervalRef = useRef<number | null>(null);
  const eventIndexRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const triggerDemoEvent = useCallback((event: DemoEvent) => {
    sendMessage('bell:manual', { durationSec: 3, demo: true, eventName: event.name });
    addToast({
      type: 'info',
      title: `🔔 Demo: ${event.name}`,
      message: `Simulado a las ${state.simulatedTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
    });
  }, [sendMessage, addToast, state.simulatedTime]);

  const stopDemo = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      running: false,
      realStartTime: null,
    }));

    sendMessage('demo:stop', {});
    addToast({ type: 'info', title: 'Modo Demo Detenido', message: 'Simulación finalizada' });
  }, [sendMessage, addToast]);

  const startDemo = useCallback(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(7, 0, 0, 0); // Start at 7:00 AM

    setState(prev => ({
      ...prev,
      running: true,
      realStartTime: now,
      simulatedTime: today,
      lastTick: now,
    }));

    eventIndexRef.current = 0;

    // Start simulation loop
    intervalRef.current = window.setInterval(() => {
      setState(prev => {
        if (!prev.running || !prev.realStartTime) return prev;

        const elapsedRealMs = Date.now() - prev.realStartTime;
        const elapsedSimMs = elapsedRealMs * prev.speed;
        const newSimTime = new Date(prev.simulatedTime.getTime() + elapsedSimMs);

        // Check for events to trigger
        const currentHour = newSimTime.getHours();
        const currentMin = newSimTime.getMinutes();

        // Trigger next event if time matches
        if (eventIndexRef.current < DEMO_EVENTS.length) {
          const nextDemoEvent = DEMO_EVENTS[eventIndexRef.current];

          // For demo, trigger events at specific simulated times
          if (currentHour === 7 && currentMin === 0 && eventIndexRef.current === 0) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 7 && currentMin === 45 && eventIndexRef.current === 1) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 8 && currentMin === 30 && eventIndexRef.current === 2) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 9 && currentMin === 15 && eventIndexRef.current === 3) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 9 && currentMin === 45 && eventIndexRef.current === 4) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 10 && currentMin === 30 && eventIndexRef.current === 5) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 11 && currentMin === 15 && eventIndexRef.current === 6) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          } else if (currentHour === 12 && currentMin === 0 && eventIndexRef.current === 7) {
            triggerDemoEvent(nextDemoEvent);
            eventIndexRef.current++;
          }
        }

        // Check if demo day ended (after 12:00)
        if (currentHour >= 12 && eventIndexRef.current >= DEMO_EVENTS.length) {
          stopDemo();
          return prev;
        }

        return {
          ...prev,
          simulatedTime: newSimTime,
          lastTick: Date.now(),
        };
      });
    }, 1000); // Tick every real second

    sendMessage('demo:start', { speed: state.speed });
    addToast({ type: 'info', title: 'Modo Demo Iniciado', message: `Simulación a ${state.speed}x velocidad` });
  }, [state.speed, sendMessage, addToast, stopDemo, triggerDemoEvent]);

  const setSpeed = useCallback((speed: number) => {
    const newSpeed = Math.max(1, Math.min(1440, speed));
    setState(prev => ({ ...prev, speed: newSpeed }));
    sendMessage('demo:speed', { speed: newSpeed });
  }, [sendMessage]);

  const triggerNextEvent = useCallback(() => {
    if (eventIndexRef.current < DEMO_EVENTS.length) {
      const event = DEMO_EVENTS[eventIndexRef.current];
      triggerDemoEvent(event);
      eventIndexRef.current++;
    }
  }, [triggerDemoEvent]);

  const forceBell = useCallback(() => {
    sendMessage('bell:manual', { durationSec: 3, demo: true, eventName: 'Timbre Forzado Demo' });
    addToast({ type: 'info', title: 'Timbre Forzado', message: 'Timbre de demo activado manualmente' });
  }, [sendMessage, addToast]);

  const resetDemo = useCallback(() => {
    stopDemo();
    setState(prev => ({
      ...prev,
      simulatedTime: new Date(new Date().setHours(7, 0, 0, 0)),
      speed: 60,
    }));
    eventIndexRef.current = 0;
  }, [stopDemo]);

  // Format simulated time for display
  const formatSimulatedTime = useCallback(() => {
    return state.simulatedTime.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [state.simulatedTime]);

  const getProgress = useCallback(() => {
    if (!state.running || !state.realStartTime) return 0;
    const dayStart = new Date(state.simulatedTime);
    dayStart.setHours(7, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(12, 0, 0, 0);

    const totalDayMs = dayEnd.getTime() - dayStart.getTime();
    const elapsedMs = state.simulatedTime.getTime() - dayStart.getTime();

    return Math.max(0, Math.min(100, (elapsedMs / totalDayMs) * 100));
  }, [state.running, state.realStartTime, state.simulatedTime]);

  return {
    ...state,
    formatSimulatedTime,
    getProgress,
    startDemo,
    stopDemo,
    setSpeed,
    triggerNextEvent,
    forceBell,
    resetDemo,
    DEMO_EVENTS,
  };
}