'use client';

// Adapted from the Astryx `shell-side-nav` page template: one collapsible,
// resizable rail around the main content. SideNav was kept (rather than TopNav)
// because the product roadmap adds follows, schedules, usage and corrections;
// the rail absorbs those destinations without changing the frame. The account
// menu sits in the rail footer, bottom left.

import {usePathname, useRouter} from 'next/navigation';
import type {ReactNode} from 'react';
import {
  Activity,
  BookOpenText,
  LogOut,
  MessagesSquare,
  TextQuote,
  UserRound,
} from 'lucide-react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {Avatar} from '@astryxdesign/core/Avatar';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import {Text} from '@astryxdesign/core/Text';

import {useSession, type SessionUser} from '../lib/session';

const NAV_ITEMS = [
  {label: 'Briefings', href: '/briefings', icon: BookOpenText},
  {label: 'Research', href: '/research', icon: MessagesSquare},
  {label: 'Coverage', href: '/coverage', icon: Activity},
] as const;

function AccountMenu({user}: {user: SessionUser}) {
  const {signOut} = useSession();
  const router = useRouter();

  return (
    <HStack>
      <DropdownMenu
        placement="above"
        alignment="start"
        menuWidth={240}
        hasChevron={false}
        button={{
          label: user.name,
          variant: 'ghost',
          icon: <Avatar name={user.name} size="xsm" tooltip={false} />,
        }}
        header={
          <VStack gap={0.5} padding={3}>
            <Text weight="semibold" maxLines={1}>
              {user.name}
            </Text>
            <Text type="supporting" maxLines={1}>
              {user.email}
            </Text>
          </VStack>
        }
        items={[
          {
            label: 'Account',
            href: '/account',
            icon: <Icon icon={UserRound} size="sm" />,
          },
          {type: 'divider'},
          {
            label: 'Sign out',
            icon: <Icon icon={LogOut} size="sm" />,
            onClick: () => {
              signOut();
              router.replace('/login');
            },
          },
        ]}
      />
    </HStack>
  );
}

export function PortalShell({children}: {children: ReactNode}) {
  const pathname = usePathname() ?? '';
  const {session} = useSession();

  return (
    <AppShell
      variant="section"
      contentPadding={0}
      sideNav={
        <SideNav
          collapsible
          resizable={{defaultWidth: 248, minWidth: 208, maxWidth: 320}}
          header={
            <SideNavHeading
              heading="dottext"
              subheading="Chile · Colombia"
              icon={<NavIcon icon={<Icon icon={TextQuote} size="sm" />} />}
              headingHref="/briefings"
            />
          }
          footer={
            session.status === 'signed-in' ? (
              <AccountMenu user={session.user} />
            ) : undefined
          }>
          <SideNavSection title="Navigate" isHeaderHidden>
            {NAV_ITEMS.map(item => (
              <SideNavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isSelected={pathname.startsWith(item.href)}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }>
      {children}
    </AppShell>
  );
}
