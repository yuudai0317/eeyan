'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WordCard } from '@/components/cards/WordCard';
import { ja } from '@/i18n/ja';
import { getWord, hintFor } from '@/lib/cards';

function SortableCard({
  id,
  index,
  count,
  onMove,
  swapMode,
  onSwap,
  disabled,
  animate,
  topicId,
}: {
  topicId: string;
  id: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  swapMode: boolean;
  onSwap: (id: string) => void;
  disabled: boolean;
  animate: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const text = getWord(id)?.text ?? '';
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-stretch gap-2 ${isDragging ? 'opacity-90' : ''}`}
      data-testid="hand-card"
      data-card-id={id}
    >
      <div
        className={`min-w-0 flex-1 ${disabled ? '' : 'cursor-grab touch-none active:cursor-grabbing'}`}
        {...attributes}
        {...listeners}
        aria-roledescription="並べ替えできるカード"
      >
        <WordCard cardId={id} order={index + 1} animate={animate} delayIndex={index} hint={hintFor(id, topicId)} />
      </div>
      <div className="flex shrink-0 flex-col justify-center gap-2">
        {swapMode ? (
          <button type="button" className="btn btn-secondary btn-small !px-3 !text-sm" onClick={() => onSwap(id)}>
            これを
            <br />
            こうかん
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-plain btn-small !h-11 !w-11 !p-0"
              aria-label={ja.prep.moveUp(text)}
              disabled={disabled || index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              ▲
            </button>
            <button
              type="button"
              className="btn btn-plain btn-small !h-11 !w-11 !p-0"
              aria-label={ja.prep.moveDown(text)}
              disabled={disabled || index === count - 1}
              onClick={() => onMove(index, index + 1)}
            >
              ▼
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** 手札3枚の並べ替え（ドラッグ、または ▲▼ ボタン・キーボード） */
export function SortableHand({
  order,
  onChange,
  swapMode = false,
  onSwap = () => {},
  disabled = false,
  animate = false,
  topicId,
}: {
  /** お題（カードのヒントに使う） */
  topicId: string;
  order: string[];
  onChange: (next: string[]) => void;
  swapMode?: boolean;
  onSwap?: (id: string) => void;
  disabled?: boolean;
  animate?: boolean;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    onChange(arrayMove(order, from, to));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-3">
          {order.map((id, i) => (
            <SortableCard
              key={id}
              id={id}
              index={i}
              count={order.length}
              onMove={move}
              swapMode={swapMode}
              onSwap={onSwap}
              disabled={disabled || swapMode}
              animate={animate}
              topicId={topicId}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
