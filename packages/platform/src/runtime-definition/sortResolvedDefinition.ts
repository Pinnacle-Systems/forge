import type { ResolvedTransactionDefinition } from './types';

export function sortResolvedDefinition(
  definition: ResolvedTransactionDefinition,
): ResolvedTransactionDefinition {
  return {
    ...definition,
    header: {
      fields: [...definition.header.fields].sort(compareByOrderThenId),
    },
    grid: {
      columns: [...definition.grid.columns].sort(compareByOrderThenId),
    },
    footer: {
      fields: [...definition.footer.fields].sort(compareByOrderThenId),
    },
  };
}

function compareByOrderThenId(
  left: { id: string; order: number },
  right: { id: string; order: number },
): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.id.localeCompare(right.id);
}
