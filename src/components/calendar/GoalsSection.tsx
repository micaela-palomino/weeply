'use client';

import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Goal, GoalCompletion } from '@/types/schedule';
import { formatDateKey } from '@/lib/recurrence';

type Props = {
  goals: Goal[];
  goalCompletions: GoalCompletion[];
  weekStart: Date;
  onAddGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleItem: (goalId: string, date: string, item: string, checked: boolean) => void;
};

function calcDayPct(goals: Goal[], completions: GoalCompletion[], dateKey: string): number {
  const total = goals.reduce((s, g) => s + g.items.length, 0);
  if (total === 0) return 0;
  let done = 0;
  for (const g of goals) {
    const c = completions.find(c => c.goalId === g.id && c.date === dateKey);
    done += c?.completedItems.length ?? 0;
  }
  return Math.round((done / total) * 100);
}

function calcWeekAvg(goals: Goal[], completions: GoalCompletion[], weekStart: Date): number {
  if (goals.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += calcDayPct(goals, completions, formatDateKey(addDays(weekStart, i)));
  }
  return Math.round(sum / 7);
}

function calcStreak(goals: Goal[], completions: GoalCompletion[]): number {
  if (goals.length === 0) return 0;
  let streak = 0;
  let d = new Date();
  while (true) {
    const dateKey = formatDateKey(d);
    if (calcDayPct(goals, completions, dateKey) < 100) break;
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

const INPUT: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 12,
  color: '#f5f5f5',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
};

let _goalId = Date.now();
const makeGoalId = () => `goal-${_goalId++}`;

export function GoalsSection({ goals, goalCompletions, weekStart, onAddGoal, onDeleteGoal, onToggleItem }: Props) {
  const today = React.useMemo(() => {
    const t = new Date();
    const diff = Math.max(0, Math.min(6, Math.floor((t.getTime() - weekStart.getTime()) / 86400000)));
    return diff;
  }, [weekStart]);

  const [selectedDay, setSelectedDay] = React.useState(today);
  const [showAddForm, setShowAddForm] = React.useState(false);

  React.useEffect(() => {
    setSelectedDay(today);
  }, [today]);
  const [newGoalName, setNewGoalName] = React.useState('');
  const [newGoalItems, setNewGoalItems] = React.useState<string[]>(['']);

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const selectedDate = days[selectedDay]!;
  const selectedDateKey = formatDateKey(selectedDate);

  const dayPct = calcDayPct(goals, goalCompletions, selectedDateKey);
  const weekAvg = calcWeekAvg(goals, goalCompletions, weekStart);
  const streak = calcStreak(goals, goalCompletions);

  const handleAddItem = () => setNewGoalItems(prev => [...prev, '']);
  const handleItemChange = (i: number, v: string) =>
    setNewGoalItems(prev => prev.map((item, idx) => idx === i ? v : item));
  const handleRemoveItem = (i: number) =>
    setNewGoalItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGoalName.trim();
    const items = newGoalItems.map(s => s.trim()).filter(Boolean);
    if (!name || items.length === 0) return;
    onAddGoal({ id: makeGoalId(), name, items });
    setNewGoalName('');
    setNewGoalItems(['']);
    setShowAddForm(false);
  };

  const pctColor = (pct: number) =>
    pct >= 80 ? '#4ade80' : pct >= 50 ? '#ff6eb5' : '#f97316';

  if (goals.length === 0 && !showAddForm) {
    return (
      <div style={{ padding: '10px 16px 16px' }}>
        <p style={{ fontSize: 11, color: '#555', margin: '0 0 10px' }}>
          Sin objetivos. Creá tu primer hábito diario.
        </p>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            background: '#ff6eb515', border: '1px solid #ff6eb540', color: '#ff6eb5',
          }}
        >
          <Plus size={13} /> Agregar objetivo
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Day navigation */}
      {goals.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setSelectedDay(v => Math.max(0, v - 1))}
              disabled={selectedDay === 0}
              style={{
                background: 'none', border: 'none', cursor: selectedDay === 0 ? 'default' : 'pointer',
                color: selectedDay === 0 ? '#333' : '#666', padding: 2, display: 'flex', alignItems: 'center',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontSize: 12, fontWeight: 600, color: '#d4d4d4' }}>
              {format(selectedDate, "EEE d 'de' MMM", { locale: es })}
            </span>

            <button
              type="button"
              onClick={() => setSelectedDay(v => Math.min(6, v + 1))}
              disabled={selectedDay === 6}
              style={{
                background: 'none', border: 'none', cursor: selectedDay === 6 ? 'default' : 'pointer',
                color: selectedDay === 6 ? '#333' : '#666', padding: 2, display: 'flex', alignItems: 'center',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {days.map((d, i) => {
              const pct = calcDayPct(goals, goalCompletions, formatDateKey(d));
              const isSelected = i === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  title={format(d, 'EEE d', { locale: es })}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: `1px solid ${isSelected ? '#ff6eb560' : '#2a2a2a'}`,
                    background: isSelected ? '#ff6eb515' : '#1e1e1e',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2,
                    padding: 0,
                  }}
                >
                  <span style={{ fontSize: 8, color: isSelected ? '#ff6eb5' : '#555', fontWeight: 700, letterSpacing: '0.05em' }}>
                    {format(d, 'EEE', { locale: es }).replace('.', '').slice(0, 1).toUpperCase()}
                  </span>
                  <div style={{
                    width: 14, height: 3, borderRadius: 99,
                    background: pct > 0 ? pctColor(pct) : '#2a2a2a',
                    transition: 'width 0.3s ease',
                  }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals list for selected day */}
      {goals.map(goal => {
        const completion = goalCompletions.find(c => c.goalId === goal.id && c.date === selectedDateKey);
        const done = completion?.completedItems ?? [];
        const goalPct = goal.items.length > 0
          ? Math.round((done.length / goal.items.length) * 100)
          : 0;

        return (
          <div key={goal.id} style={{ padding: '10px 16px', borderBottom: '1px solid #161616' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#d4d4d4' }}>{goal.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                  background: `${pctColor(goalPct)}18`,
                  color: pctColor(goalPct),
                  border: `1px solid ${pctColor(goalPct)}40`,
                }}>
                  {goalPct}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDeleteGoal(goal.id)}
                title="Eliminar objetivo"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#444', padding: 2, display: 'flex', alignItems: 'center',
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {goal.items.map(item => {
                const checked = done.includes(item);
                return (
                  <label
                    key={item}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => onToggleItem(goal.id, selectedDateKey, item, e.target.checked)}
                      style={{ accentColor: '#ff6eb5', width: 13, height: 13, flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: 12, color: checked ? '#4ade80' : '#888',
                      textDecoration: checked ? 'line-through' : 'none',
                    }}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Stats */}
      {goals.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e1e1e', display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Hoy
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: pctColor(dayPct) }}>
              {dayPct}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Semana
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: pctColor(weekAvg) }}>
              {weekAvg}%
            </div>
          </div>
          {streak > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Racha
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ff6eb5' }}>
                🔥{streak}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add goal form */}
      {showAddForm ? (
        <form onSubmit={handleSubmitGoal} style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>Nuevo objetivo</span>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewGoalName(''); setNewGoalItems(['']); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2, display: 'flex', alignItems: 'center' }}
            >
              <X size={13} />
            </button>
          </div>

          <input
            type="text"
            value={newGoalName}
            onChange={e => setNewGoalName(e.target.value)}
            placeholder="Nombre (ej: Comer bien)"
            required
            autoFocus
            maxLength={60}
            style={{ ...INPUT, marginBottom: 8 }}
          />

          <div style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Ítems diarios
          </div>

          {newGoalItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
              <input
                type="text"
                value={item}
                onChange={e => handleItemChange(i, e.target.value)}
                placeholder={`Ítem ${i + 1}`}
                maxLength={60}
                style={{ ...INPUT, flex: 1, width: 'auto' }}
              />
              {newGoalItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(i)}
                  style={{
                    background: 'none', border: '1px solid #2a2a2a', borderRadius: 6,
                    cursor: 'pointer', color: '#555', padding: '0 6px', flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            style={{
              fontSize: 11, color: '#666', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0',
              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10,
            }}
          >
            <Plus size={11} /> Agregar ítem
          </button>

          <button
            type="submit"
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: '#ff6eb5', border: 'none', color: '#0f0f0f',
            }}
          >
            Guardar objetivo
          </button>
        </form>
      ) : (
        <div style={{ padding: '10px 16px' }}>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: '#ff6eb515', border: '1px solid #ff6eb540', color: '#ff6eb5',
            }}
          >
            <Plus size={13} /> Agregar objetivo
          </button>
        </div>
      )}
    </div>
  );
}
