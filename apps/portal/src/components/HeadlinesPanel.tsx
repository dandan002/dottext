'use client';

// Collected news, one column per country. Headlines are rows (List), not
// cards, so a column scans top to bottom like a wire. Selecting a headline
// hands it to the agent as a starting question.

import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack, StackItem, VStack} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';

import {
  formatHeadlineTime,
  withinPeriod,
  type HeadlinePeriod,
} from '../lib/headlines';
import {
  SAMPLE_HEADLINES,
  TOPIC_LABEL,
  type SampleHeadline,
  type Topic,
} from '../lib/sample';
import {COUNTRY_LABEL, type Country} from '../lib/sources';

const COUNTRIES: Country[] = ['chile', 'colombia'];
const TOPIC_OPTIONS = [
  {value: 'all', label: 'All topics'},
  ...(Object.keys(TOPIC_LABEL) as Topic[]).map(topic => ({
    value: topic,
    label: TOPIC_LABEL[topic],
  })),
];

function HeadlineRow({
  headline,
  timeZone,
  onAsk,
}: {
  headline: SampleHeadline;
  timeZone: string;
  onAsk: (headline: SampleHeadline) => void;
}) {
  return (
    <ListItem
      align="first-line"
      label={
        <Text weight="medium" as="span" display="block">
          {headline.title}
        </Text>
      }
      description={`${headline.source} · ${TOPIC_LABEL[headline.topic]}`}
      endContent={
        <Text type="supporting" hasTabularNumbers>
          {formatHeadlineTime(headline.publishedAt, timeZone)}
        </Text>
      }
      onClick={() => onAsk(headline)}
    />
  );
}

export function HeadlinesPanel({
  timeZone,
  onAsk,
}: {
  timeZone: string;
  onAsk: (headline: SampleHeadline) => void;
}) {
  const [period, setPeriod] = useState<HeadlinePeriod>('7d');
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');

  const byCountry = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = SAMPLE_HEADLINES.filter(
      headline =>
        withinPeriod(headline, period) &&
        (topic === 'all' || headline.topic === topic) &&
        (term === '' ||
          headline.title.toLowerCase().includes(term) ||
          headline.source.toLowerCase().includes(term)),
    ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return Object.fromEntries(
      COUNTRIES.map(country => [
        country,
        visible.filter(headline => headline.country === country),
      ]),
    ) as Record<Country, SampleHeadline[]>;
  }, [period, topic, query]);

  return (
    <VStack gap={6}>
      <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
        <HStack gap={3} vAlign="center" wrap="wrap">
          <SegmentedControl
            label="Period"
            value={period}
            onChange={value => setPeriod(value as HeadlinePeriod)}>
            <SegmentedControlItem value="24h" label="24 hours" />
            <SegmentedControlItem value="7d" label="7 days" />
            <SegmentedControlItem value="30d" label="30 days" />
          </SegmentedControl>
          <Selector
            label="Topic"
            options={TOPIC_OPTIONS}
            value={topic}
            onChange={setTopic}
            variant="secondary"
            isLabelHidden
          />
        </HStack>
        <VStack width={260}>
          <TextInput
            label="Filter headlines"
            isLabelHidden
            value={query}
            onChange={setQuery}
            placeholder="Filter"
            startIcon={Search}
            hasClear
          />
        </VStack>
      </HStack>

      <Grid columns={{minWidth: 360}} columnGap={10} rowGap={8}>
        {COUNTRIES.map(country => {
          const items = byCountry[country];
          return (
            <VStack key={country} gap={2} as="section">
              <HStack gap={2} vAlign="end">
                <StackItem size="fill">
                  <Heading level={2}>{COUNTRY_LABEL[country]}</Heading>
                </StackItem>
                <Text type="supporting">
                  {`${items.length} ${items.length === 1 ? 'headline' : 'headlines'}`}
                </Text>
              </HStack>
              {items.length === 0 ? (
                <Text color="secondary">No headlines match these filters.</Text>
              ) : (
                <List hasDividers edge="flush" density="spacious">
                  {items.map(headline => (
                    <HeadlineRow
                      key={headline.id}
                      headline={headline}
                      timeZone={timeZone}
                      onAsk={onAsk}
                    />
                  ))}
                </List>
              )}
            </VStack>
          );
        })}
      </Grid>

      <Text type="supporting">
        Sample headlines that show the layout; nothing has been collected yet.
        Select a headline to ask the agent about it.
      </Text>
    </VStack>
  );
}
