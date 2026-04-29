import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  InputGroup,
  Intent,
  Tag,
} from '@blueprintjs/core';
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
            label: result.label ?? result.entityId,
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
            label: result.label ?? result.entityId,
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
        <ButtonGroup className="actions" minimal={false}>
          <Button type="button" icon="refresh" onClick={handleRefresh}>Refresh VM</Button>
          <Button type="button" intent={Intent.PRIMARY} icon="floppy-disk" onClick={handleSave}>Save</Button>
          <Button
            type="button"
            icon="tick"
            onClick={handleConfirmSave}
            disabled={viewModel.saveLifecycle.state !== 'confirming'}
          >
            Confirm Save
          </Button>
          <Button
            type="button"
            icon="cross"
            onClick={handleCancelSave}
            disabled={viewModel.saveLifecycle.state !== 'confirming'}
          >
            Cancel Save
          </Button>
        </ButtonGroup>

        <Card className="panel" compact>
          <h2>Status</h2>
          <Callout className="statusCallout" intent={statusIntent(viewModel)}>{statusMessage}</Callout>
          <dl className="statusGrid">
            <div><dt>Grid mode</dt><dd><Tag>{viewModel.grid.mode}</Tag></dd></div>
            <div><dt>Focused cell</dt><dd><Tag minimal>{viewModel.grid.focus.rowId} / {viewModel.grid.focus.columnId}</Tag></dd></div>
            <div><dt>Save state</dt><dd><Tag intent={saveStateIntent(viewModel.saveLifecycle.state)}>{viewModel.saveLifecycle.state}</Tag></dd></div>
            <div><dt>Warnings</dt><dd><Tag intent={viewModel.saveLifecycle.validationSummary.hasWarnings ? Intent.WARNING : Intent.NONE}>{String(viewModel.saveLifecycle.validationSummary.hasWarnings)}</Tag></dd></div>
            <div><dt>Errors</dt><dd><Tag intent={!viewModel.saveLifecycle.validationSummary.isValid ? Intent.DANGER : Intent.NONE}>{String(!viewModel.saveLifecycle.validationSummary.isValid)}</Tag></dd></div>
          </dl>
        </Card>

        <Card className="panel" compact>
          <h2>Validation Summary</h2>
          <ul className="issueList">
            {viewModel.saveLifecycle.validationSummary.issues.map((issue) => (
              <li key={issue.id} className={`issue issue-${issue.severity}`}>
                <Tag intent={issueIntent(issue.severity)}>{issue.severity}</Tag>
                <span>{issue.message}</span>
              </li>
            ))}
            {viewModel.saveLifecycle.validationSummary.issues.length === 0 ? <li>No active issues.</li> : null}
          </ul>
        </Card>

        <Card className="panel debugPanel" compact>
          <h2>View Model JSON</h2>
          <pre>{JSON.stringify(deferredViewModel, null, 2)}</pre>
        </Card>
      </aside>

      <main className="workspace">
        <Card className="card headerCard" compact>
          <div className="cardHeader">
            <div>
              <p className="eyebrow">{viewModel.title}</p>
              <h2>Header</h2>
            </div>
            <Tag className="layoutTag" minimal>{viewModel.layout.header} / {viewModel.layout.body} / {viewModel.layout.footer}</Tag>
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
        </Card>

        <Card className="card gridCard" compact>
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Keyboard-first inspection</p>
              <h2>Grid</h2>
            </div>
          </div>
          <div className="tableWrap">
            <HTMLTable compact striped interactive={false}>
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
            </HTMLTable>
          </div>
        </Card>

        <Card className="card footerCard" compact>
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
        </Card>
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
        <FormGroup label={field.label} labelFor={`header-${field.id}`}>
        <InputGroup
          id={`header-${field.id}`}
          value={lookupState?.query ?? ''}
          onChange={(event) => props.onLookupQueryChange(event.target.value)}
          placeholder={`Search ${field.label}`}
          rightElement={
            <Button
              type="button"
              icon="search"
              loading={lookupState?.loading}
              minimal
              onClick={props.onLookupSearch}
            />
          }
          fill
        />
        </FormGroup>
        {(lookupState?.results.length ?? 0) > 0 ? (
          <HTMLSelect fill defaultValue="" onChange={(event) => event.target.value && props.onLookupSelect(event.target.value)}>
            <option value="">Select result</option>
            {(lookupState?.results ?? []).map((result) => (
              <option key={result.entityId} value={result.entityId}>{result.label}</option>
            ))}
          </HTMLSelect>
        ) : null}
        {field.lookupSnapshot ? <small>Snapshot: {field.lookupSnapshot.entityId}</small> : null}
        {field.validationMessages.length > 0 ? <small className="errorText">{field.validationMessages.join(', ')}</small> : null}
        {lookupState?.error ? <small className="errorText">{lookupState.error}</small> : null}
      </div>
    );
  }

  return (
    <div className="field">
      <FormGroup label={field.label} labelFor={`header-${field.id}`}>
      <InputGroup
        key={`${field.id}:${String(field.value ?? '')}`}
        id={`header-${field.id}`}
        defaultValue={String(field.value ?? '')}
        onBlur={(event) => props.onValueCommit(event.target.value)}
        fill
      />
      </FormGroup>
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
        <InputGroup
          inputRef={props.setGridRef}
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
          rightElement={
            <Button
              type="button"
              icon="search"
              loading={lookupState?.loading}
              minimal
              onClick={props.onLookupSearch}
            />
          }
          fill
        />
        {(lookupState?.results.length ?? 0) > 0 ? (
          <HTMLSelect fill onChange={(event) => event.target.value && props.onLookupSelect(event.target.value)} defaultValue="">
            <option value="">Pick</option>
            {(lookupState?.results ?? []).map((result) => (
              <option key={result.entityId} value={result.entityId}>{result.label}</option>
            ))}
          </HTMLSelect>
        ) : null}
        {row.lookupSnapshots[cell.id] ? <small>Snapshot: {row.lookupSnapshots[cell.id]?.entityId}</small> : null}
        {cell.staleReason ? <small className="warningText">Stale: {cell.staleReason}</small> : null}
        {cell.validationMessages.length > 0 ? <small className="errorText">{cell.validationMessages.join(', ')}</small> : null}
        {lookupState?.error ? <small className="errorText">{lookupState.error}</small> : null}
      </div>
    );
  }

  return (
    <div className={className}>
        <InputGroup
          key={`${props.refKey}:${String(cell.value ?? '')}`}
          inputRef={props.setGridRef}
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
        fill
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

function statusIntent(viewModel: SalesInvoiceScreenViewModel) {
  if (!viewModel.saveLifecycle.validationSummary.isValid) {
    return Intent.DANGER;
  }

  if (viewModel.saveLifecycle.validationSummary.hasWarnings || viewModel.saveLifecycle.state === 'confirming') {
    return Intent.WARNING;
  }

  return Intent.SUCCESS;
}

function saveStateIntent(state: SalesInvoiceScreenViewModel['saveLifecycle']['state']) {
  return state === 'idle' ? Intent.NONE : state === 'confirming' ? Intent.WARNING : Intent.PRIMARY;
}

function issueIntent(severity: string) {
  if (severity === 'error' || severity === 'block') {
    return Intent.DANGER;
  }

  if (severity === 'warning' || severity === 'warn') {
    return Intent.WARNING;
  }

  return Intent.PRIMARY;
}
