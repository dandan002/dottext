'use client';

// Transcript and composer adapted from the Astryx `ai-chat` template, with the
// zero state from `ai-chat-landing`. The agent never answers beyond the
// evidence: with nothing collected it says so, shows what the archive matched,
// and offers live retrieval as a separate, explicit step.

import {Globe, TextQuote} from 'lucide-react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Button} from '@astryxdesign/core/Button';
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatToolCalls,
} from '@astryxdesign/core/Chat';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Timestamp} from '@astryxdesign/core/Timestamp';

import {formatHeadlineTime} from '../lib/headlines';
import type {SampleHeadline} from '../lib/sample';
import {COUNTRY_LABEL} from '../lib/sources';

export interface AgentTurn {
  id: string;
  question: string;
  askedAt: string;
  matches: SampleHeadline[];
}

const SUGGESTIONS = [
  {
    heading: 'Central bank signals',
    prompt: 'What did the central banks signal at their latest meetings?',
  },
  {
    heading: 'Fiscal outlook',
    prompt: 'What changed in the fiscal outlook for Colombia this month?',
  },
  {
    heading: 'Local reaction to FX',
    prompt: 'How are local exporters reacting to peso moves?',
  },
  {
    heading: 'Political calendar',
    prompt: 'Which votes or debates are scheduled in Chile’s congress?',
  },
];

function AgentAvatar() {
  return <Avatar name="Research agent" size="sm" tooltip={false} />;
}

function EmptyAgent({onPick}: {onPick: (prompt: string) => void}) {
  // Picking a suggestion asks it straight away.
  return (
    <VStack gap={8} paddingBlock={10}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Icon icon={TextQuote} size="md" color="secondary" />
          <Text color="secondary">Research agent</Text>
        </HStack>
        <Heading level={2}>Ask about Chile or Colombia</Heading>
        <Text color="secondary">
          Answers cite collected local sources. When the archive cannot support
          an answer, the agent says so and offers a live search instead.
        </Text>
      </VStack>
      <Grid columns={{minWidth: 240}} gap={3}>
        {SUGGESTIONS.map(suggestion => (
          <ClickableCard
            key={suggestion.heading}
            label={suggestion.prompt}
            variant="muted"
            padding={4}
            onClick={() => onPick(suggestion.prompt)}>
            <VStack gap={1}>
              <Text weight="semibold">{suggestion.heading}</Text>
              <Text color="secondary">{suggestion.prompt}</Text>
            </VStack>
          </ClickableCard>
        ))}
      </Grid>
    </VStack>
  );
}

function AgentAnswer({turn, timeZone}: {turn: AgentTurn; timeZone: string}) {
  return (
    <ChatMessage
      sender="assistant"
      avatar={<AgentAvatar />}
      metadata={
        <ChatMessageMetadata
          timestamp={<Timestamp value={turn.askedAt} format="time" />}
          footer={<Text type="supporting">Archive only · no live retrieval</Text>}
        />
      }>
      <ChatToolCalls
        calls={[
          {
            name: 'search archive',
            target: turn.question,
            status: 'complete',
          },
        ]}
      />
      <ChatMessageBubble variant="ghost" width="100%">
        <VStack gap={4}>
          <Text as="p" display="block">
            There is not enough collected evidence to answer this. No Chilean
            or Colombian sources have been collected yet, so there is nothing
            to cite.
          </Text>
          {turn.matches.length > 0 && (
            <VStack gap={2}>
              <Text weight="semibold">Sample headlines matching your keywords</Text>
              <List hasDividers edge="flush">
                {turn.matches.map(match => (
                  <ListItem
                    key={match.id}
                    label={match.title}
                    description={`${match.source} · ${COUNTRY_LABEL[match.country]}`}
                    endContent={
                      <Text type="supporting" hasTabularNumbers>
                        {formatHeadlineTime(match.publishedAt, timeZone)}
                      </Text>
                    }
                  />
                ))}
              </List>
            </VStack>
          )}
          <HStack gap={2} wrap="wrap">
            <Button
              label="Search live sources"
              icon={<Icon icon={Globe} size="sm" />}
            />
          </HStack>
        </VStack>
      </ChatMessageBubble>
    </ChatMessage>
  );
}

export function AgentPanel({
  turns,
  draft,
  timeZone,
  onDraftChange,
  onAsk,
}: {
  turns: AgentTurn[];
  draft: string;
  timeZone: string;
  onDraftChange: (value: string) => void;
  onAsk: (question: string) => void;
}) {
  return (
    <ChatLayout
      density="spacious"
      composer={
        <ChatComposer
          value={draft}
          onChange={onDraftChange}
          onSubmit={value => {
            if (value.trim() !== '') {
              onAsk(value.trim());
            }
          }}
          placeholder="Ask about Chile or Colombia…"
        />
      }>
      <ChatMessageList
        align="top"
        emptyState={<EmptyAgent onPick={onAsk} />}>
        {turns.flatMap(turn => [
          <ChatMessage key={`${turn.id}-q`} sender="user">
            <ChatMessageBubble>{turn.question}</ChatMessageBubble>
          </ChatMessage>,
          <AgentAnswer key={`${turn.id}-a`} turn={turn} timeZone={timeZone} />,
        ])}
      </ChatMessageList>
    </ChatLayout>
  );
}
