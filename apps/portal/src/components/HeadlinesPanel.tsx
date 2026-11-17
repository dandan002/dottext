'use client';

// Collected news, grouped by country and laid out like a news front: each
// country is a section under a strong rule, its newest headline leads at
// display size and the rest follow in columns, newest first. Every story is a
// ClickableCard; selecting one hands it to the agent as a starting question.

import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack, StackItem, VStack} from '@astryxdesign/core/Layout';
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

function Story({
  headline,
  timeZone,
  isLead,
  onAsk,
}: {
  headline: SampleHeadline;
  timeZone: string;
  isLead: boolean;
  onAsk: (headline: SampleHeadline) => void;
}) {
  return (
    <ClickableCard
      label={`Ask the agent about: ${headline.title}`}
      variant="transparent"
      padding={0}
      onClick={() => onAsk(headline)}>
      <VStack gap={isLead ? 2 : 1}>
        <Text type="supporting" weight="semibold">
          {TOPIC_LABEL[headline.topic].toLocaleUpperCase('en-US')}
        </Text>
        {isLead ? (
          <Heading level={3} type="display-3" weight="semibold">
            {headline.title}
          </Heading>
        ) : (
          <Heading level={3}>{headline.title}</Heading>
        )}
        <Text type="supporting" hasTabularNumbers>
          {`${headline.source} · ${formatHeadlineTime(headline.publishedAt, timeZone)}`}
        </Text>
      </VStack>
    </ClickableCard>
  );
}

function CountrySection({
  country,
  items,
  timeZone,
  onAsk,
}: {
  country: Country;
  items: SampleHeadline[];
  timeZone: string;
  onAsk: (headline: SampleHeadline) => void;
}) {
  const [lead, ...rest] = items;
  return (
    <VStack gap={4} as="section">
      <Divider variant="strong" />
      <HStack gap={2} vAlign="end">
        <StackItem size="fill">
          <Heading level={2} weight="bold">
            {COUNTRY_LABEL[country]}
          </Heading>
        </StackItem>
        <Text type="supporting">
          {`${items.length} ${items.length === 1 ? 'headline' : 'headlines'} · latest first`}
        </Text>
      </HStack>
      {lead == null ? (
        <Text color="secondary">No headlines match these filters.</Text>
      ) : (
        <VStack gap={5}>
          <Story headline={lead} timeZone={timeZone} isLead onAsk={onAsk} />
          {rest.length > 0 && (
            <>
              <Divider />
              <Grid
                columns={{minWidth: 220, max: 3, repeat: 'fit'}}
                columnGap={6}
                rowGap={5}>
                {rest.map(headline => (
                  <Story
                    key={headline.id}
                    headline={headline}
                    timeZone={timeZone}
                    isLead={false}
                    onAsk={onAsk}
                  />
                ))}
              </Grid>
            </>
          )}
        </VStack>
      )}
    </VStack>
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
    <VStack gap={8}>
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

      <VStack gap={10}>
        {COUNTRIES.map(country => (
          <CountrySection
            key={country}
            country={country}
            items={byCountry[country]}
            timeZone={timeZone}
            onAsk={onAsk}
          />
        ))}
      </VStack>

      <Text type="supporting">
        Sample headlines that show the layout; nothing has been collected yet.
        Select a headline to ask the agent about it.
      </Text>
    </VStack>
  );
}
