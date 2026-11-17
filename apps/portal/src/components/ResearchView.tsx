'use client';

// Two views of the archive under one heading: the agent (cited answers) and
// headlines (collected news by country). The header is pinned in the Layout
// header slot so the chat can own the full height below it.

import {useState} from 'react';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutHeader,
  StackItem,
  VStack,
} from '@astryxdesign/core/Layout';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {Heading, Text} from '@astryxdesign/core/Text';

import {matchHeadlines} from '../lib/headlines';
import {SAMPLE_NOW, type SampleHeadline} from '../lib/sample';
import {useSession} from '../lib/session';
import {AgentPanel, type AgentTurn} from './AgentPanel';
import {HeadlinesPanel} from './HeadlinesPanel';

type View = 'agent' | 'headlines';

export function ResearchView() {
  const {session} = useSession();
  const timeZone =
    session.status === 'signed-in' ? session.user.timezone : 'America/New_York';

  const [view, setView] = useState<View>('agent');
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const [draft, setDraft] = useState('');

  const ask = (question: string) => {
    setTurns(current => [
      ...current,
      {
        id: `turn-${current.length + 1}`,
        question,
        askedAt: new Date().toISOString(),
        matches: matchHeadlines(question),
      },
    ]);
    setDraft('');
  };

  const askAboutHeadline = (headline: SampleHeadline) => {
    setDraft(`What is the background to “${headline.title}” (${headline.source})?`);
    setView('agent');
  };

  return (
    <Layout
      height="fill"
      contentWidth={800}
      header={
        <LayoutHeader padding={6} paddingBlockEnd={0}>
          <VStack gap={4}>
            <HStack gap={3} vAlign="end" wrap="wrap">
              <StackItem size="fill">
                <Heading level={1}>Research</Heading>
              </StackItem>
              <Text type="supporting">
                {`Archive as of ${new Intl.DateTimeFormat('en-US', {
                  timeZone,
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short',
                }).format(SAMPLE_NOW)}`}
              </Text>
            </HStack>
            <TabList
              value={view}
              onChange={value => setView(value as View)}
              hasDivider
              isFullBleed>
              <Tab value="agent" label="Agent" />
              <Tab value="headlines" label="Headlines" />
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        view === 'agent' ? (
          <LayoutContent padding={0} isScrollable={false} label="Agent">
            <AgentPanel
              turns={turns}
              draft={draft}
              timeZone={timeZone}
              onDraftChange={setDraft}
              onAsk={ask}
            />
          </LayoutContent>
        ) : (
          <LayoutContent padding={6} label="Headlines">
            <HeadlinesPanel timeZone={timeZone} onAsk={askAboutHeadline} />
          </LayoutContent>
        )
      }
    />
  );
}
