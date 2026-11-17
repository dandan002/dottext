'use client';

// Scaffolded from the Astryx `settings` page template (Settings Form): one
// scrolling form, each section a two-column Grid of description and fields,
// separated by Dividers. The template's section nav was dropped: four short
// sections are all reachable by scrolling.

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {CheckboxInput} from '@astryxdesign/core/CheckboxInput';
import {Divider} from '@astryxdesign/core/Divider';
import {Grid} from '@astryxdesign/core/Grid';
import {
  HStack,
  Layout,
  LayoutContent,
  VStack,
} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {useToast} from '@astryxdesign/core/Toast';

import {useSession, type SessionUser} from '../lib/session';
import {MONTHLY_BUDGET_USD} from '../lib/sources';

const TIMEZONES = [
  {value: 'America/New_York', label: 'New York (ET)'},
  {value: 'America/Chicago', label: 'Chicago (CT)'},
  {value: 'America/Los_Angeles', label: 'Los Angeles (PT)'},
  {value: 'America/Santiago', label: 'Santiago'},
  {value: 'America/Bogota', label: 'Bogotá'},
  {value: 'Europe/London', label: 'London'},
];

function SectionIntro({title, description}: {title: string; description: string}) {
  return (
    <VStack gap={1}>
      <Heading level={2}>{title}</Heading>
      <Text color="secondary">{description}</Text>
    </VStack>
  );
}

export function AccountView() {
  const {session} = useSession();
  // RequireSession in the portal layout guarantees a signed-in user here.
  return session.status === 'signed-in' ? (
    <AccountForm user={session.user} />
  ) : null;
}

function AccountForm({user}: {user: SessionUser}) {
  const {updateUser, signOut} = useSession();
  const router = useRouter();
  const showToast = useToast();

  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [period, setPeriod] = useState('24h');
  const [chile, setChile] = useState(true);
  const [colombia, setColombia] = useState(true);

  const saveProfile = () => {
    updateUser({name: name.trim() || user.name, timezone});
    showToast({body: 'Account saved', uniqueID: 'account-saved'});
  };

  return (
    <Layout
      height="fill"
      contentWidth={880}
      content={
        <LayoutContent padding={6}>
          <VStack gap={8}>
            <Heading level={1}>Account</Heading>

            <Grid columns={{minWidth: 280}} gap={10}>
              <SectionIntro
                title="Profile"
                description="Your name appears on saved briefings and feedback."
              />
              <VStack gap={4}>
                <TextInput label="Name" value={name} onChange={setName} />
                <TextInput
                  label="Email"
                  value={user.email}
                  isReadOnly
                  description="Managed by your sign-in provider."
                />
                <Selector
                  label="Timezone"
                  options={TIMEZONES}
                  value={timezone}
                  onChange={setTimezone}
                />
                <HStack>
                  <Button label="Save" variant="primary" onClick={saveProfile} />
                </HStack>
              </VStack>
            </Grid>

            <Divider />

            <Grid columns={{minWidth: 280}} gap={10}>
              <SectionIntro
                title="Briefing defaults"
                description="Used when you open Briefings or generate one without changing the controls."
              />
              <VStack gap={5}>
                <VStack gap={2}>
                  <Text weight="semibold">Period</Text>
                  <SegmentedControl
                    label="Default period"
                    value={period}
                    onChange={setPeriod}>
                    <SegmentedControlItem value="24h" label="24 hours" />
                    <SegmentedControlItem value="7d" label="7 days" />
                  </SegmentedControl>
                </VStack>
                <VStack gap={3}>
                  <Text weight="semibold">Countries</Text>
                  <CheckboxInput label="Chile" value={chile} onChange={setChile} />
                  <CheckboxInput
                    label="Colombia"
                    value={colombia}
                    onChange={setColombia}
                  />
                </VStack>
              </VStack>
            </Grid>

            <Divider />

            <Grid columns={{minWidth: 280}} gap={10}>
              <SectionIntro
                title="Workspace"
                description="Briefings, history, follows and feedback stay private to this workspace."
              />
              <MetadataList label={{position: 'start', width: 160}}>
                <MetadataListItem label="Workspace">{user.workspace}</MetadataListItem>
                <MetadataListItem label="Members">1</MetadataListItem>
                <MetadataListItem label="Monthly budget">
                  {`$${MONTHLY_BUDGET_USD} target`}
                </MetadataListItem>
              </MetadataList>
            </Grid>

            <Divider />

            <Grid columns={{minWidth: 280}} gap={10}>
              <SectionIntro
                title="Session"
                description="Signing out ends your session on this device."
              />
              <HStack>
                <Button
                  label="Sign out"
                  onClick={() => {
                    signOut();
                    router.replace('/login');
                  }}
                />
              </HStack>
            </Grid>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
