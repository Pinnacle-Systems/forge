import type {
  CellPosition,
  GridKeyboardCommand,
  GridRowMetadataPatch,
  GridRow,
  GridSnapshot,
  GridValue,
  QueuedExternalUpdate,
  ResolvedGridColumn,
  RowValidationState,
  TransactionElementId,
  TransactionGridEngine,
  TransactionGridEngineEvent,
  TransactionGridEngineOptions,
} from './types';
import {
  clearEmptyValues,
  createCommittedRow,
  createPhantomRow,
  ensureExactlyOnePhantomRow,
  rowHasNonEmptyValues,
} from './rowInvariants';

interface EngineState {
  columns: ResolvedGridColumn[];
  rows: GridRow[];
  mode: 'navigation' | 'edit';
  focus: CellPosition;
  events: TransactionGridEngineEvent[];
  internalRowId: number;
  internalPhantomId: number;
}

export function createTransactionGridEngine(
  options: TransactionGridEngineOptions,
): TransactionGridEngine {
  const state = createInitialState(options);

  const nextInternalPhantomId = (): string => `phantom-${state.internalPhantomId++}`;
  const nextReplacementPhantomId = (): string => options.createRowId?.() ?? nextInternalPhantomId();

  const enforcePhantomInvariant = (): void => {
    state.rows = ensureExactlyOnePhantomRow(state.rows, nextInternalPhantomId);
    state.focus = resolveFocus(state, state.focus);
  };

  const applyQueuedExternalUpdates = (row: GridRow): void => {
    const queuedUpdates = [...row.metadata.queuedExternalUpdates];
    row.metadata.queuedExternalUpdates = [];

    for (const update of queuedUpdates) {
      if (update.generation !== row.metadata.generation) {
        state.events.push({ type: 'staleExternalUpdateIgnored', rowId: row.id });
        continue;
      }

      applyExternalUpdate(row, update);
    }

    enforcePhantomInvariant();
  };

  const materializePhantomIfNeeded = (row: GridRow): void => {
    if (!row.metadata.isPhantom || !rowHasNonEmptyValues(row)) {
      if (row.metadata.isPhantom) {
        row.values = clearEmptyValues(row.values);
      }
      return;
    }

    row.metadata.isPhantom = false;
    row.state = 'new';
    state.rows.push(createPhantomRow(nextReplacementPhantomId()));
  };

  const commitFocusedEdit = (): { rowId?: string; columnId?: TransactionElementId } => {
    const row = findRow(state.focus.rowId);

    if (!row?.metadata.editBuffer) {
      state.mode = 'navigation';
      return {};
    }

    const buffer = row.metadata.editBuffer;
    delete row.metadata.editBuffer;
    state.mode = 'navigation';

    const changed = !Object.is(buffer.value, row.values[buffer.columnId]);

    if (changed) {
      row.values[buffer.columnId] = clone(buffer.value);
      row.metadata.revision += 1;
      row.metadata.generation += 1;

      if (!row.metadata.isPhantom && row.state !== 'new') {
        row.state = 'dirty';
      }

      materializePhantomIfNeeded(row);
      enforcePhantomInvariant();
    }

    state.events.push({
      type: 'cellCommitted',
      rowId: row.id,
      columnId: buffer.columnId,
      value: clone(buffer.value),
    });
    state.events.push({
      type: 'validationRequested',
      scope: 'cell',
      rowId: row.id,
      columnId: buffer.columnId,
    });

    applyQueuedExternalUpdates(row);

    return { rowId: row.id, columnId: buffer.columnId };
  };

  const moveFocusWithRowExit = (position: CellPosition): void => {
    const previousRowId = state.focus.rowId;
    const resolved = resolveFocus(state, position);
    const rowChanged = previousRowId !== resolved.rowId;

    if (rowChanged) {
      state.events.push({ type: 'rowExited', rowId: previousRowId });
      state.events.push({ type: 'validationRequested', scope: 'row', rowId: previousRowId });
    }

    state.focus = resolved;
  };

  return {
    getSnapshot(): GridSnapshot {
      return {
        columns: clone(state.columns),
        rows: clone(state.rows),
        mode: state.mode,
        focus: clone(state.focus),
      };
    },

    drainEvents(): TransactionGridEngineEvent[] {
      const events = clone(state.events);
      state.events = [];
      return events;
    },

    dispatchKeyboard(command: GridKeyboardCommand): void {
      switch (command.type) {
        case 'enter':
          if (state.mode === 'edit') {
            const committed = commitFocusedEdit();
            const rowId = committed.rowId ?? state.focus.rowId;
            const columnId = committed.columnId ?? state.focus.columnId;
            moveFocusWithRowExit(moveVertical(rowId, columnId, 1, state));
          } else {
            this.beginEdit();
          }
          break;
        case 'tab': {
          if (state.mode === 'edit') {
            commitFocusedEdit();
          }
          moveFocusWithRowExit(moveTab(state.focus, state, command.shiftKey ? -1 : 1));
          break;
        }
        case 'arrow':
          if (state.mode === 'edit') {
            break;
          }
          moveFocusWithRowExit(moveArrow(state.focus, state, command.direction));
          break;
        case 'f2':
          this.beginEdit();
          break;
        case 'escape':
          this.cancelEdit();
          break;
        case 'delete':
        case 'backspace':
          if (state.mode === 'navigation') {
            clearFocusedCell();
          }
          break;
        case 'save':
          state.events.push({ type: 'validationRequested', scope: 'grid' });
          state.events.push({ type: 'saveRequested' });
          break;
      }
    },

    beginEdit(position?: CellPosition): void {
      if (position) {
        state.focus = resolveFocus(state, position);
      }

      if (state.mode === 'edit') {
        return;
      }

      const row = findRow(state.focus.rowId);
      const column = findColumn(state.focus.columnId);

      if (!row || !column || !isEditable(column)) {
        state.mode = 'navigation';
        return;
      }

      row.metadata.editBuffer = {
        columnId: column.id,
        value: clone(row.values[column.id]),
        originalValue: clone(row.values[column.id]),
        capturedRevision: row.metadata.revision,
      };
      state.mode = 'edit';
    },

    updateEditBuffer(value: GridValue): void {
      const row = findRow(state.focus.rowId);

      if (!row?.metadata.editBuffer) {
        return;
      }

      row.metadata.editBuffer.value = clone(value);
    },

    commitEdit(): void {
      commitFocusedEdit();
    },

    cancelEdit(): void {
      const row = findRow(state.focus.rowId);

      if (row?.metadata.editBuffer) {
        delete row.metadata.editBuffer;
      }

      state.mode = 'navigation';

      if (row) {
        applyQueuedExternalUpdates(row);
      }

      enforcePhantomInvariant();
    },

    moveFocus(position: CellPosition): void {
      state.focus = resolveFocus(state, position);
    },

    deleteRow(rowId: string): void {
      const row = findRow(rowId);

      if (!row) {
        return;
      }

      if (row.metadata.isPhantom) {
        row.values = {};
        row.state = undefined;
        delete row.metadata.editBuffer;
        row.metadata.queuedExternalUpdates = [];
      } else {
        row.state = 'deleted';
        delete row.metadata.editBuffer;
      }

      state.mode = 'navigation';
      enforcePhantomInvariant();
    },

    applyExternalRowUpdate(rowId: string, update: QueuedExternalUpdate): void {
      const row = findRow(rowId);

      if (!row) {
        return;
      }

      const clonedUpdate = clone(update);

      if (row.metadata.editBuffer) {
        row.metadata.queuedExternalUpdates.push(clonedUpdate);
        state.events.push({ type: 'externalUpdateQueued', rowId });
        return;
      }

      if (clonedUpdate.generation !== row.metadata.generation) {
        state.events.push({ type: 'staleExternalUpdateIgnored', rowId });
        return;
      }

      applyExternalUpdate(row, clonedUpdate);
      materializePhantomIfNeeded(row);
      enforcePhantomInvariant();
    },

    applyValidation(rowId: string, validation: RowValidationState): void {
      const row = findRow(rowId);

      if (!row) {
        return;
      }

      row.metadata.validation = clone(validation);
      enforcePhantomInvariant();
    },
  };

  function findRow(rowId: string): GridRow | undefined {
    return state.rows.find((row) => row.id === rowId);
  }

  function findColumn(columnId: TransactionElementId): ResolvedGridColumn | undefined {
    return state.columns.find((column) => column.id === columnId);
  }

  function clearFocusedCell(): void {
    const row = findRow(state.focus.rowId);
    const column = findColumn(state.focus.columnId);

    if (!row || !column || !isEditable(column)) {
      return;
    }

    const previous = row.values[column.id];

    if (previous === undefined && row.metadata.isPhantom) {
      row.values = clearEmptyValues(row.values);
      enforcePhantomInvariant();
      return;
    }

    row.values[column.id] = undefined;
    row.metadata.revision += 1;
    row.metadata.generation += 1;

    if (!row.metadata.isPhantom && row.state !== 'new') {
      row.state = 'dirty';
    }

    materializePhantomIfNeeded(row);
    enforcePhantomInvariant();

    state.events.push({
      type: 'cellCommitted',
      rowId: row.id,
      columnId: column.id,
      value: undefined,
    });
    state.events.push({
      type: 'validationRequested',
      scope: 'cell',
      rowId: row.id,
      columnId: column.id,
    });
  }

  function applyExternalUpdate(row: GridRow, update: QueuedExternalUpdate): void {
    const values = update.values;

    for (const [columnId, value] of Object.entries(values)) {
      row.values[columnId] = clone(value);
    }

    if (update.metadata) {
      applyMetadataPatch(row, update.metadata);
    }

    if (Object.keys(values).length > 0) {
      row.metadata.revision += 1;
      row.metadata.generation += 1;
    }

    if (!row.metadata.isPhantom && row.state !== 'new') {
      row.state = 'dirty';
    }

    if (row.metadata.isPhantom && !rowHasNonEmptyValues(row)) {
      row.values = clearEmptyValues(row.values);
    }
  }
}

function applyMetadataPatch(row: GridRow, patch: GridRowMetadataPatch): void {
  mergeMetadataRecord(row.metadata.lookupSnapshots, patch.lookupSnapshots);
  mergeMetadataRecord(row.metadata.autofill, patch.autofill);
  mergeMetadataRecord(row.metadata.stale, patch.stale);
}

function mergeMetadataRecord<T>(
  target: Partial<Record<TransactionElementId, T>>,
  patch?: Partial<Record<TransactionElementId, T | undefined>>,
): void {
  if (!patch) {
    return;
  }

  for (const [fieldId, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete target[fieldId];
    } else {
      target[fieldId] = clone(value);
    }
  }
}

function createInitialState(options: TransactionGridEngineOptions): EngineState {
  let internalRowId = 1;
  let internalPhantomId = 1;
  const rows = (options.rows ?? []).map((values) => createCommittedRow(
    `row-${internalRowId++}`,
    values,
  ));

  rows.push(createPhantomRow(`phantom-${internalPhantomId++}`));

  const columns = clone(options.columns);
  const firstVisibleColumn = columns.find(isVisible) ?? columns[0];
  const firstActiveRow = rows.find((row) => row.state !== 'deleted') ?? rows[0];

  return {
    columns,
    rows,
    mode: 'navigation',
    focus: {
      rowId: firstActiveRow?.id ?? '',
      columnId: firstVisibleColumn?.id ?? '',
    },
    events: [],
    internalRowId,
    internalPhantomId,
  };
}

function resolveFocus(state: EngineState, requested: CellPosition): CellPosition {
  const rows = activeRows(state);
  const visibleColumns = state.columns.filter(isVisible);
  const fallbackRow = rows.find((row) => !row.metadata.isPhantom)
    ?? rows.find((row) => row.metadata.isPhantom)
    ?? rows[0];
  const fallbackColumn = visibleColumns[0] ?? state.columns[0];

  const requestedRow = rows.find((row) => row.id === requested.rowId) ?? fallbackRow;
  const requestedColumn = visibleColumns.find((column) => column.id === requested.columnId)
    ?? nearestVisibleColumn(state.columns, visibleColumns, requested.columnId)
    ?? fallbackColumn;

  return {
    rowId: requestedRow?.id ?? '',
    columnId: requestedColumn?.id ?? '',
  };
}

function nearestVisibleColumn(
  columns: ResolvedGridColumn[],
  visibleColumns: ResolvedGridColumn[],
  columnId: TransactionElementId,
): ResolvedGridColumn | undefined {
  const requestedIndex = columns.findIndex((column) => column.id === columnId);

  if (requestedIndex === -1) {
    return visibleColumns[0];
  }

  for (let distance = 1; distance < columns.length; distance += 1) {
    const previous = columns[requestedIndex - distance];
    const next = columns[requestedIndex + distance];

    if (previous && isVisible(previous)) {
      return previous;
    }

    if (next && isVisible(next)) {
      return next;
    }
  }

  return visibleColumns[0];
}

function moveArrow(
  focus: CellPosition,
  state: EngineState,
  direction: 'up' | 'down' | 'left' | 'right',
): CellPosition {
  switch (direction) {
    case 'up':
      return moveVertical(focus.rowId, focus.columnId, -1, state);
    case 'down':
      return moveVertical(focus.rowId, focus.columnId, 1, state);
    case 'left':
      return moveHorizontal(focus, state, -1, false);
    case 'right':
      return moveHorizontal(focus, state, 1, false);
  }
}

function moveVertical(
  rowId: string,
  columnId: TransactionElementId,
  delta: number,
  state: EngineState,
): CellPosition {
  const rows = activeRows(state);
  const currentIndex = rows.findIndex((row) => row.id === rowId);
  const nextIndex = clamp(currentIndex + delta, 0, rows.length - 1);

  return resolveFocus(state, {
    rowId: rows[nextIndex]?.id ?? rowId,
    columnId,
  });
}

function moveTab(
  focus: CellPosition,
  state: EngineState,
  delta: number,
): CellPosition {
  return moveHorizontal(focus, state, delta, true);
}

function moveHorizontal(
  focus: CellPosition,
  state: EngineState,
  delta: number,
  wrapRows: boolean,
): CellPosition {
  const visibleColumns = state.columns.filter(isVisible);
  const rows = activeRows(state);
  const currentColumnIndex = visibleColumns.findIndex((column) => column.id === focus.columnId);
  const currentRowIndex = rows.findIndex((row) => row.id === focus.rowId);
  const nextColumnIndex = currentColumnIndex + delta;

  if (!wrapRows) {
    return resolveFocus(state, {
      rowId: focus.rowId,
      columnId: visibleColumns[clamp(nextColumnIndex, 0, visibleColumns.length - 1)]?.id ?? focus.columnId,
    });
  }

  if (nextColumnIndex >= 0 && nextColumnIndex < visibleColumns.length) {
    return resolveFocus(state, {
      rowId: focus.rowId,
      columnId: visibleColumns[nextColumnIndex]?.id ?? focus.columnId,
    });
  }

  const nextRowIndex = clamp(currentRowIndex + delta, 0, rows.length - 1);
  const wrappedColumnIndex = delta > 0 ? 0 : visibleColumns.length - 1;

  return resolveFocus(state, {
    rowId: rows[nextRowIndex]?.id ?? focus.rowId,
    columnId: visibleColumns[wrappedColumnIndex]?.id ?? focus.columnId,
  });
}

function activeRows(state: EngineState): GridRow[] {
  return state.rows.filter((row) => row.state !== 'deleted');
}

function isVisible(column: ResolvedGridColumn): boolean {
  return column.visible === true;
}

function isEditable(column: ResolvedGridColumn): boolean {
  return isVisible(column) && column.editable === true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
