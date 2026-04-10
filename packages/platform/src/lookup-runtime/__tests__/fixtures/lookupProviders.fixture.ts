import type {
  LookupProvider,
  LookupResult,
  LookupValidationResult,
} from '../../types';

export const fixtureResult: LookupResult = {
  entityId: 'entity-1',
  label: 'Entity One',
  values: {
    lookupField: 'entity-1',
    description: 'Resolved description',
    dependentValue: 'incoming dependent',
    manualOverride: 'incoming manual',
  },
};

export function createFixtureProvider(id = 'fixture.entity'): LookupProvider {
  return {
    id,
    async search() {
      return [fixtureResult];
    },
    async resolve() {
      return fixtureResult;
    },
    async validate(): Promise<LookupValidationResult> {
      return {
        valid: true,
        issues: [],
      };
    },
  };
}
