'use client';

// Scaffolded from the Astryx `table-page` template: record-level facts in a
// MetadataList masthead, then one flat table of uniform rows. The roster is
// the real candidate list from config/sources, every entry still inactive.

import {useMemo, useState} from 'react';
import {
  HStack,
  Layout,
  LayoutContent,
  VStack,
} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import type {StatusDotVariant} from '@astryxdesign/core/StatusDot';
import {
  Table,
  pixel,
  proportional,
  useTableSortable,
  useTableSortableState,
} from '@astryxdesign/core/Table';
import type {TableColumn, TableSortComparator} from '@astryxdesign/core/Table';
import {Heading, Text} from '@astryxdesign/core/Text';

import {
  COUNTRY_LABEL,
  KIND_LABEL,
  MONTHLY_BUDGET_USD,
  SOURCES,
  type Country,
  type Source,
  type SourceStatus,
} from '../lib/sources';

type CountryScope = 'all' | Country;

/**
 * Each state is distinct on purpose: a quiet source is not a failing one, and
 * a paused source says why elsewhere. See docs/product.md.
 */
const STATUS_META: Record<
  SourceStatus,
  {label: string; variant: StatusDotVariant}
> = {
  inactive: {label: 'Not validated', variant: 'neutral'},
  healthy: {label: 'Collecting', variant: 'success'},
  quiet: {label: 'No new documents', variant: 'accent'},
  overdue: {label: 'Overdue', variant: 'warning'},
  failed: {label: 'Failed', variant: 'error'},
  paused: {label: 'Paused', variant: 'warning'},
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const columns: TableColumn<Source>[] = [
  {
    key: 'name',
    header: 'Source',
    width: proportional(3),
    sortable: true,
    renderCell: source => (
      <VStack gap={0.5}>
        <Text maxLines={1}>{source.name}</Text>
        <Text type="supporting">{KIND_LABEL[source.kind]}</Text>
      </VStack>
    ),
  },
  {
    key: 'country',
    header: 'Country',
    width: pixel(112),
    sortable: true,
    renderCell: source => (
      <Text color="secondary">{COUNTRY_LABEL[source.country]}</Text>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: pixel(168),
    renderCell: source => {
      const meta = STATUS_META[source.status];
      return (
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={meta.variant} label={meta.label} />
          <Text color="secondary">{meta.label}</Text>
        </HStack>
      );
    },
  },
  {
    key: 'lastSuccessAt',
    header: 'Last success',
    width: pixel(128),
    renderCell: source => (
      <Text color="secondary">{source.lastSuccessAt ?? 'Never'}</Text>
    ),
  },
  {
    key: 'documentCount',
    header: 'Documents',
    width: pixel(136),
    align: 'end',
    renderCell: source => (
      <Text hasTabularNumbers color="secondary">
        {source.documentCount == null ? '—' : String(source.documentCount)}
      </Text>
    ),
  },
];

const COMPARATORS: Partial<Record<string, TableSortComparator<Source>>> = {
  name: (a, b) => a.name.localeCompare(b.name),
  country: (a, b) => a.country.localeCompare(b.country),
};

export function CoverageView() {
  const [scope, setScope] = useState<CountryScope>('all');

  const visible = useMemo(
    () =>
      scope === 'all'
        ? SOURCES
        : SOURCES.filter(source => source.country === scope),
    [scope],
  );
  const {sortedData, sortConfig} = useTableSortableState<Source>({
    data: visible,
    comparators: COMPARATORS,
  });
  const sortPlugin = useTableSortable<Source>(sortConfig);

  const active = SOURCES.filter(source => source.status !== 'inactive').length;
  const spentUsd = 0;

  return (
    <Layout
      height="fill"
      contentWidth={960}
      content={
        <LayoutContent padding={6}>
          <VStack gap={8}>
            <VStack gap={6}>
              <Heading level={1}>Coverage</Heading>
              <MetadataList
                columns="multi"
                orientation="vertical"
                label={{position: 'top'}}>
                <MetadataListItem label="Active sources">
                  {`${active} of ${SOURCES.length}`}
                </MetadataListItem>
                <MetadataListItem label="Last successful collection">
                  Never
                </MetadataListItem>
                <MetadataListItem label="Backfill">Not started</MetadataListItem>
                <MetadataListItem label="Spend this month">
                  <VStack gap={1.5}>
                    <Text hasTabularNumbers>
                      {`${usd.format(spentUsd)} of ${usd.format(MONTHLY_BUDGET_USD)}`}
                    </Text>
                    <ProgressBar
                      label="Monthly budget used"
                      isLabelHidden
                      value={spentUsd}
                      max={MONTHLY_BUDGET_USD}
                      variant="neutral"
                    />
                  </VStack>
                </MetadataListItem>
              </MetadataList>
            </VStack>

            <VStack gap={4}>
              <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                <Heading level={2}>Sources</Heading>
                <SegmentedControl
                  label="Filter by country"
                  value={scope}
                  onChange={value => setScope(value as CountryScope)}>
                  <SegmentedControlItem value="all" label="All" />
                  <SegmentedControlItem value="chile" label="Chile" />
                  <SegmentedControlItem value="colombia" label="Colombia" />
                </SegmentedControl>
              </HStack>

              <Table<Source>
                data={sortedData}
                columns={columns}
                idKey="id"
                density="balanced"
                dividers="rows"
                textOverflow="truncate"
                plugins={{sort: sortPlugin}}
              />

              <Text type="supporting">
                Candidates from config/sources. A source collects only after
                its connector, access terms and history are validated.
              </Text>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
