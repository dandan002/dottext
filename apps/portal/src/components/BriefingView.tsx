'use client';

// Frame adapted from the Astryx `table-page` template (scrolling masthead over a
// capped content column), narrowed to a 680px reading measure. Controls sit in
// one quiet row; the article below is plain prose with generous section gaps.

import {useMemo, useState} from 'react';
import {Copy, Download} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Divider} from '@astryxdesign/core/Divider';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Icon} from '@astryxdesign/core/Icon';
import {
  HStack,
  Layout,
  LayoutContent,
  StackItem,
  VStack,
} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useToast} from '@astryxdesign/core/Toast';

import {
  EXPORT_FORMATS,
  copyBriefing,
  downloadBriefing,
  type BriefingDocument,
  type ExportFormat,
} from '../lib/briefing-export';
import {ANALYST_LABEL, SAMPLE_BRIEFING, type Analyst} from '../lib/sample';
import {useSession} from '../lib/session';
import {COUNTRY_LABEL, SOURCES, type Country} from '../lib/sources';

type CountryScope = 'all' | Country;
type Period = '24h' | '7d';

const ANALYSTS: Analyst[] = ['briefing', 'local', 'macro', 'political'];
const PERIOD_LABEL: Record<Period, string> = {
  '24h': 'Past 24 hours',
  '7d': 'Past 7 days',
};
const WORDS_PER_MINUTE = 230;
const SAMPLE_NOTICE =
  'Sample layout. No sources are collected yet; the text describes what each part of a briefing will hold.';

// Sample timestamps.
const GENERATED_AT = new Date('2026-11-16T12:00:00Z');
const EVIDENCE_CUTOFF = new Date('2026-11-16T11:45:00Z');

function formatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

export function BriefingView() {
  const {session} = useSession();
  const showToast = useToast();
  const [scope, setScope] = useState<CountryScope>('all');
  const [period, setPeriod] = useState<Period>('24h');
  const [analyst, setAnalyst] = useState<Analyst>('briefing');

  const timeZone =
    session.status === 'signed-in' ? session.user.timezone : 'America/New_York';

  const doc = useMemo<BriefingDocument>(() => {
    const timestamp = formatter(timeZone);
    const countries: Country[] =
      scope === 'all' ? ['chile', 'colombia'] : [scope];
    const content = SAMPLE_BRIEFING[analyst];
    const sections = countries.map(country => ({
      heading: COUNTRY_LABEL[country],
      paragraphs: content.countries[country],
      sources: SOURCES.filter(source => source.country === country)
        .slice(0, 3)
        .map(source => source.name),
    }));
    const words =
      countWords(content.overview) +
      sections
        .flatMap(section => section.paragraphs)
        .reduce((sum, paragraph) => sum + countWords(paragraph), 0);
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
    return {
      title: `${countries.map(c => COUNTRY_LABEL[c]).join(' and ')} briefing`,
      view: ANALYST_LABEL[analyst],
      meta: [
        {label: 'Period', value: PERIOD_LABEL[period]},
        {label: 'Generated', value: timestamp.format(GENERATED_AT)},
        {label: 'Evidence cutoff', value: timestamp.format(EVIDENCE_CUTOFF)},
        {label: 'Reading time', value: `${minutes} min`},
      ],
      notice: SAMPLE_NOTICE,
      overview: content.overview,
      sections,
    };
  }, [analyst, period, scope, timeZone]);

  const fileStem = [
    'dottext',
    GENERATED_AT.toISOString().slice(0, 10),
    scope === 'all' ? 'chile-colombia' : scope,
    period,
    analyst,
  ].join('-');

  const copy = async () => {
    try {
      await copyBriefing(doc);
      showToast({body: 'Briefing copied', uniqueID: 'briefing-copied'});
    } catch {
      showToast({
        body: 'The browser blocked copying. Use Download instead.',
        type: 'error',
        uniqueID: 'briefing-copy-failed',
      });
    }
  };

  return (
    <Layout
      height="fill"
      contentWidth={680}
      content={
        <LayoutContent padding={6}>
          <VStack gap={8}>
            <VStack gap={5}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Heading level={1}>Briefing</Heading>
                </StackItem>
                <Button label="Schedule" variant="ghost" />
                <Button label="Generate now" variant="primary" />
              </HStack>

              <HStack gap={3} vAlign="center" wrap="wrap">
                <SegmentedControl
                  label="Countries"
                  value={scope}
                  onChange={value => setScope(value as CountryScope)}>
                  <SegmentedControlItem value="all" label="Both" />
                  <SegmentedControlItem value="chile" label="Chile" />
                  <SegmentedControlItem value="colombia" label="Colombia" />
                </SegmentedControl>
                <SegmentedControl
                  label="Period"
                  value={period}
                  onChange={value => setPeriod(value as Period)}>
                  <SegmentedControlItem value="24h" label="24 hours" />
                  <SegmentedControlItem value="7d" label="7 days" />
                </SegmentedControl>
              </HStack>

              <MetadataList orientation="horizontal">
                {doc.meta.slice(1).map(item => (
                  <MetadataListItem key={item.label} label={item.label}>
                    {item.value}
                  </MetadataListItem>
                ))}
                <MetadataListItem label="Coverage">
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant="neutral" label="Not collecting" />
                    <Text>Not collecting</Text>
                  </HStack>
                </MetadataListItem>
              </MetadataList>
            </VStack>

            <VStack gap={6}>
              <TabList
                value={analyst}
                onChange={value => setAnalyst(value as Analyst)}
                hasDivider
                isFullBleed>
                {ANALYSTS.map(key => (
                  <Tab key={key} value={key} label={ANALYST_LABEL[key]} />
                ))}
              </TabList>

              <HStack gap={2} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <Text type="supporting">
                    Sample layout · no sources collected yet
                  </Text>
                </StackItem>
                <Button
                  label="Copy"
                  size="sm"
                  icon={<Icon icon={Copy} size="sm" />}
                  onClick={copy}
                />
                <DropdownMenu
                  alignment="end"
                  button={{
                    label: 'Download',
                    size: 'sm',
                    icon: <Icon icon={Download} size="sm" />,
                  }}
                  items={(Object.keys(EXPORT_FORMATS) as ExportFormat[]).map(
                    format => ({
                      label: EXPORT_FORMATS[format].label,
                      onClick: () => downloadBriefing(doc, format, fileStem),
                    }),
                  )}
                />
              </HStack>

              <VStack gap={10} as="article">
                <Text type="large" weight="normal" as="p" display="block">
                  {doc.overview}
                </Text>

                {doc.sections.map(section => (
                  <VStack key={section.heading} gap={4} as="section">
                    <Heading level={2}>{section.heading}</Heading>
                    {section.paragraphs.map(paragraph => (
                      <Text key={paragraph} as="p" display="block">
                        {paragraph}
                      </Text>
                    ))}
                    <Text type="supporting">
                      {`Sources: ${section.sources.join(' · ')}`}
                    </Text>
                  </VStack>
                ))}
              </VStack>

              <Divider />
              <Text type="supporting">
                {`${doc.view} · ${PERIOD_LABEL[period]} · times in ${timeZone}`}
              </Text>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
