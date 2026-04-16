import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { createSalesInvoiceScreen } from '@forge/sales/ui';
import type {
  SalesInvoiceCellView,
  SalesInvoiceFieldView,
  SalesInvoiceRowView,
  SalesInvoiceScreen,
  SalesInvoiceScreenViewModel,
} from '@forge/sales/ui';

type LookupResultItem = {
  entityId: string;
  label: string;
};

type HeaderLookupState = Record<string, { query: string; results: LookupResultItem[]; loading: boolean; error?: string }>;
type RowLookupState = Record<string, { query: string; results: LookupResultItem[]; loading: boolean; error?: string }>;

export function SandboxApp() {
  const [screen] = useState<SalesInvoiceScreen>(() => createSalesInvoiceScreen());
  const [viewModel, setViewModel] = useState<SalesInvoiceScreenViewModel>(() => screen.getViewModel());
  const [headerLookupState, setHeaderLookupState] = useState<HeaderLookupState>({});
  const [rowLookupState, setRowLookupState] = useState<RowLookupState>({});
  const [statusMessage, setStatusMessage] = useState<string>('Ready for inspection.');
  const deferredViewModel = useDeferredValue(viewModel);
  const gridRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  useEffect(() => {
    setViewModel(screen.getViewModel());

    return screen.subscribe(() => {
      startTransition(() => {
        setViewModel(screen.getViewModel());
      });
    });
  }, [screen]);

  useEffect(() => {
    const focusKey = `${viewModel.grid.focus.rowId}:${viewModel.grid.focus.columnId}`;
    gridRefs.current[focusKey]?.focus();
  }, [viewModel.grid.focus.columnId, viewModel.grid.focus.rowId]);

  async function refreshHeaderLookup(fieldId: string) {
    const query = headerLookupState[fieldId]?.query ?? '';
    setHeaderLookupState((current) => ({
      ...current,
      [fieldId]: {
        ...current[fieldId],
        query,
        results: current[fieldId]?.results ?? [],
        loading: true,
        error: undefined,
      },
    }));

    try {
      const results = await screen.searchHeaderLookup(fieldId, query);
      setHeaderLookupState((current) => ({
        ...current,
        [fieldId]: {
          query,
          results: results.map((result) => ({
            entityId: result.entityId,
            label: result.label,
          })),
          loading: false,
        },
      }));
      setStatusMessage(`Loaded ${results.length} lookup result(s) for header field "${fieldId}".`);
    } catch (error) {
      setHeaderLookupState((current) => ({
        ...current,
        [fieldId]: {
          query,
          results: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Lookup failed.',
        },
      }));
    }
  }

  async function refreshRowLookup(rowId: string, fieldId: string) {
    const lookupKey = `${rowId}:${fieldId}`;
    const query = rowLookupState[lookupKey]?.query ?? '';
    setRowLookupState((current) => ({
      ...current,
      [lookupKey]: {
        ...current[lookupKey],
        query,
        results: current[lookupKey]?.results ?? [],
        loading: true,
        error: undefined,
      },
    }));

    try {
      const results = await screen.searchRowLookup(rowId, fieldId, query);
      setRowLookupState((current) => ({
        ...current,
        [lookupKey]: {
          query,
          results: results.map((result) => ({
            entityId: result.entityId,
            label: result.label,
          })),
          loading: false,
        },
      }));
      setStatusMessage(`Loaded ${results.length} lookup result(s) for row "${rowId}".`);
    } catch (error) {
      setRowLookupState((current) => ({
        ...current,
        [lookupKey]: {
          query,
          results: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Lookup failed.',
        },
      }));
    }
  }

  async function applyHeaderLookup(fieldId: string, entityId: string) {
    await screen.selectHeaderLookup(fieldId, entityId);
    setStatusMessage(`Applied header lookup "${entityId}" to "${fieldId}".`);
  }

  async function applyRowLookup(rowId: string, fieldId: string, entityId: string) {
    await screen.selectRowLookup(rowId, fieldId, entityId);
    setStatusMessage(`Applied row lookup "${entityId}" to "${fieldId}".`);
  }

  async function handleSave() {
    const result = await screen.requestSave();
    setStatusMessage(`Save request result: ${result.status}`);
  }

  async function handleConfirmSave() {
    const result = await screen.confirmSave();
    setStatusMessage(`Confirm save result: ${result.status}`);
  }

  function handleCancelSave() {
    screen.cancelSave();
    setStatusMessage('Save cancelled.');
  }

  function handleRefresh() {
    setViewModel(screen.getViewModel());
    setStatusMessage('View model refreshed manually.');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Forge Sandbox</h1>
        <p className="eyebrow">Dev-only inspection harness for Story 008</p>
        <div className="actions">
          <button type="button" onClick={handleRefresh}>Refresh VM</button>
          <button type="button" onClick={handleSave}>Save</button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={viewModel.saveLifecycle.state !== 'confirming'}
          >
            Confirm Save
          </button>
          <button
            type="button"
            onClick={handleCancelSave}
            disabled={viewModel.saveLifecycle.state !== 'confirming'}
          >
            Cancel Save
          </button>
        </div>

        <section className="panel">
          <h2>Status</h2>
          <p>{statusMessage}</p>
          <p>Grid mode: <strong>{viewModel.grid.mode}</strong></p>
          <p>Focused cell: <strong>{viewModel.grid.focus.rowId}</strong> / <strong>{viewModel.grid.focus.columnId}</strong></p>
          <p>Save state: <strong>{viewModel.saveLifecycle.state}</strong></p>
          <p>Warnings: <strong>{String(viewModel.saveLifecycle.validationSummary.hasWarnings)}</strong></p>
          <p>Errors: <strong>{String(viewModel.saveLifecycle.validationSummary.hasErrors)}</strong></p>
        </section>

        <section className="panel">
          <h2>Validation Summary</h2>
          <ul className="issueList">
            {viewModel.saveLifecycle.validationSummary.issues.map((issue) => (
              <li key={issue.id} className={`issue issue-${issue.severity}`}>
                {issue.severity}: {issue.message}
              </li>
            ))}
            {viewModel.saveLifecycle.validationSummary.issues.length === 0 ? <li>No active issues.</li> : null}
          </ul>
        </section>

        <section className="panel debugPanel">
          <h2>View Model JSON</h2>
          <pre>{JSON.stringify(deferredViewModel, null, 2)}</pre>
        </section>
      </aside>

      <main className="workspace">
        <section className="card">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">{viewModel.title}</p>
              <h2>Header</h2>
            </div>
            <span className="layoutTag">{viewModel.layout.header} / {viewModel.layout.body} / {viewModel.layout.footer}</span>
          </div>
          <div className="headerGrid">
            {viewModel.header.fields.map((field) => (
              <HeaderFieldEditor
                key={field.id}
                field={field}
                lookupState={headerLookupState[field.id]}
                onLookupQueryChange={(query) => {
                  setHeaderLookupState((current) => ({
                    ...current,
                    [field.id]: {
                      query,
                      results: current[field.id]?.results ?? [],
                      loading: current[field.id]?.loading ?? false,
                      error: undefined,
                    },
                  }));
                }}
                onLookupSearch={() => refreshHeaderLookup(field.id)}
                onLookupSelect={(entityId) => applyHeaderLookup(field.id, entityId)}
                onValueCommit={(value) => {
                  screen.setHeaderValue(field.id, coerceValue(field.kind, value));
                  setStatusMessage(`Updated header field "${field.id}".`);
                }}
              />
            ))}
          </div>
        </section>

        <section className="card">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Keyboard-first inspection</p>
              <h2>Grid</h2>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  {viewModel.grid.columns.map((column) => (
                    <th key={column.id}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewModel.grid.rows.map((row) => (
                  <tr key={row.id} data-phantom={row.isPhantom}>
                    <td>
                      <strong>{row.id}</strong>
                      <div>{row.isPhantom ? 'phantom' : row.state ?? 'active'}</div>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.id}>
                        <GridCellEditor
                          row={row}
                          cell={cell}
                          isFocused={
                            viewModel.grid.focus.rowId === row.id && viewModel.grid.focus.columnId === cell.id
                          }
                          refKey={`${row.id}:${cell.id}`}
                          setGridRef={(element) => {
                            gridRefs.current[`${row.id}:${cell.id}`] = element;
                          }}
                          lookupState={rowLookupState[`${row.id}:${cell.id}`]}
                          onFocus={() => screen.moveFocus(row.id, cell.id)}
                          onKeyboard={async (event) => {
                            const result = await screen.handleKeyboardEvent(event);
                            if (result) {
                              setStatusMessage(`Keyboard command result: ${result.status}`);
                            }
                          }}
                          onLookupQueryChange={(query) => {
                            const lookupKey = `${row.id}:${cell.id}`;
                            setRowLookupState((current) => ({
                              ...current,
                              [lookupKey]: {
                                query,
                                results: current[lookupKey]?.results ?? [],
                                loading: current[lookupKey]?.loading ?? false,
                                error: undefined,
                              },
                            }));
                          }}
                          onLookupSearch={() => refreshRowLookup(row.id, cell.id)}
                          onLookupSelect={(entityId) => applyRowLookup(row.id, cell.id, entityId)}
                          onValueCommit={(value) => {
                            screen.editCell(row.id, cell.id, coerceValue(cell.kind, value));
                            setStatusMessage(`Committed ${cell.id} for row "${row.id}".`);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Resolved footer</p>
              <h2>Totals</h2>
            </div>
          </div>
          <div className="footerGrid">
            {viewModel.footer.fields.map((field) => (
              <div className="footerStat" key={field.id}>
                <span>{field.label}</span>
                <strong>{String(field.value ?? '')}</strong>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function HeaderFieldEditor(props: {
  field: SalesInvoiceFieldView;
  lookupState?: { query: string; results: LookupResultItem[]; loading: boolean; error?: string };
  onLookupQueryChange: (query: string) => void;
  onLookupSearch: () => void;
  onLookupSelect: (entityId: string) => void;
  onValueCommit: (value: string) => void;
}) {
  const { field, lookupState } = props;

  if (field.kind === 'lookup') {
    return (
      <div className="field">
        <label htmlFor={`header-${field.id}`}>{field.label}</label>
        <input
          id={`header-${field.id}`}
          value={lookupState?.query ?? ''}
          onChange={(event) => props.onLookupQueryChange(event.target.value)}
          placeholder={`Search ${field.label}`}
        />
        <div className="inlineActions">
          <button type="button" onClick={props.onLookupSearch}>
            {lookupState?.loading ? 'Searching...' : 'Search'}
          </button>
          <select defaultValue="" onChange={(event) => event.target.value && props.onLookupSelect(event.target.value)}>
            <option value="">Select result</option>
            {(lookupState?.results ?? []).map((result) => (
              <option key={result.entityId} value={result.entityId}>{result.label}</option>
            ))}
          </select>
        </div>
        {field.lookupSnapshot ? <small>Snapshot: {field.lookupSnapshot.entityId}</small> : null}
        {field.validationMessages.length > 0 ? <small className="errorText">{field.validationMessages.join(', ')}</small> : null}
        {lookupState?.error ? <small className="errorText">{lookupState.error}</small> : null}
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={`header-${field.id}`}>{field.label}</label>
      <input
        key={`${field.id}:${String(field.value ?? '')}`}
        id={`header-${field.id}`}
        defaultValue={String(field.value ?? '')}
        onBlur={(event) => props.onValueCommit(event.target.value)}
      />
      {field.validationMessages.length > 0 ? <small className="errorText">{field.validationMessages.join(', ')}</small> : null}
    </div>
  );
}

function GridCellEditor(props: {
  row: SalesInvoiceRowView;
  cell: SalesInvoiceCellView;
  isFocused: boolean;
  refKey: string;
  setGridRef: (element: HTMLInputElement | HTMLSelectElement | null) => void;
  lookupState?: { query: string; results: LookupResultItem[]; loading: boolean; error?: string };
  onFocus: () => void;
  onKeyboard: (event: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  }) => Promise<void>;
  onLookupQueryChange: (query: string) => void;
  onLookupSearch: () => void;
  onLookupSelect: (entityId: string) => void;
  onValueCommit: (value: string) => void;
}) {
  const { cell, isFocused, lookupState, row } = props;
  const className = [
    'cellEditor',
    isFocused ? 'focused' : '',
    cell.staleReason ? 'stale' : '',
    cell.validationMessages.length > 0 ? 'invalid' : '',
  ].filter(Boolean).join(' ');

  if (cell.kind === 'lookup') {
    return (
      <div className={className}>
        <input
          ref={props.setGridRef}
          defaultValue={lookupState?.query ?? ''}
          onFocus={props.onFocus}
          onKeyDown={(event) => {
            if (shouldPreventDefaultGridKey(event.key, event.ctrlKey, event.metaKey)) {
              event.preventDefault();
            }
            void props.onKeyboard({
              key: event.key,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
              altKey: event.altKey,
            });
          }}
          onChange={(event) => props.onLookupQueryChange(event.target.value)}
          placeholder={String(cell.value ?? 'Search')}
        />
        <div className="inlineActions">
          <button type="button" onClick={props.onLookupSearch}>
            {lookupState?.loading ? 'Searching...' : 'Search'}
          </button>
          <select onChange={(event) => event.target.value && props.onLookupSelect(event.target.value)} defaultValue="">
            <option value="">Pick</option>
            {(lookupState?.results ?? []).map((result) => (
              <option key={result.entityId} value={result.entityId}>{result.label}</option>
            ))}
          </select>
        </div>
        {row.lookupSnapshots[cell.id] ? <small>Snapshot: {row.lookupSnapshots[cell.id]?.entityId}</small> : null}
        {cell.staleReason ? <small className="warningText">Stale: {cell.staleReason}</small> : null}
        {cell.validationMessages.length > 0 ? <small className="errorText">{cell.validationMessages.join(', ')}</small> : null}
        {lookupState?.error ? <small className="errorText">{lookupState.error}</small> : null}
      </div>
    );
  }

  return (
    <div className={className}>
        <input
          key={`${props.refKey}:${String(cell.value ?? '')}`}
          ref={props.setGridRef}
          defaultValue={String(cell.value ?? '')}
          onFocus={props.onFocus}
          onBlur={(event) => props.onValueCommit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Tab') {
              props.onValueCommit(event.currentTarget.value);
            }
            if (shouldPreventDefaultGridKey(event.key, event.ctrlKey, event.metaKey)) {
              event.preventDefault();
            }
            void props.onKeyboard({
              key: event.key,
              ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          });
        }}
      />
      {cell.staleReason ? <small className="warningText">Stale: {cell.staleReason}</small> : null}
      {cell.validationMessages.length > 0 ? <small className="errorText">{cell.validationMessages.join(', ')}</small> : null}
    </div>
  );
}

function coerceValue(kind: string, value: string) {
  if (kind === 'number' || kind === 'currency') {
    if (value.trim() === '') {
      return '';
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  return value;
}

function shouldPreventDefaultGridKey(key: string, ctrlKey?: boolean, metaKey?: boolean) {
  return (
    key === 'Enter' ||
    key === 'Tab' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'F2' ||
    key === 'Escape' ||
    key === 'Delete' ||
    key === 'Backspace' ||
    ((ctrlKey || metaKey) && key.toLowerCase() === 's')
  );
}
