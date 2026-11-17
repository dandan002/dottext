'use client';

// Adapted from the Astryx `shell-top-nav` page template: one top bar over the
// main content. The bar carries the brand, the three section links on the
// start side and the account menu on the end side. TopNav suits five or fewer
// always-visible destinations; when the roadmap's follows, schedules, usage
// and corrections arrive, group them under a TopNavMenu or move back to the
// `shell-side-nav` frame. Below the md breakpoint AppShell folds the links
// into its mobile drawer.

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
import {VStack} from '@astryxdesign/core/Layout';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Text} from '@astryxdesign/core/Text';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';

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
    <DropdownMenu
      placement="below"
      alignment="end"
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
  );
}

export function PortalShell({children}: {children: ReactNode}) {
  const pathname = usePathname() ?? '';
  const {session} = useSession();

  return (
    <AppShell
      variant="elevated"
      contentPadding={0}
      topNav={
        <TopNav
          label="Portal sections"
          heading={
            <TopNavHeading
              heading="DotTeXT"
              subheading="Chile · Colombia"
              logo={<NavIcon icon={<Icon icon={TextQuote} size="md" />} />}
              headingHref="/briefings"
            />
          }
          startContent={NAV_ITEMS.map(item => (
            <TopNavItem
              key={item.href}
              label={item.label}
              href={item.href}
              icon={<Icon icon={item.icon} size="sm" />}
              isSelected={pathname.startsWith(item.href)}
            />
          ))}
          endContent={
            session.status === 'signed-in' ? (
              <AccountMenu user={session.user} />
            ) : undefined
          }
        />
      }>
      {children}
    </AppShell>
  );
}
