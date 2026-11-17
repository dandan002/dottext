'use client';

// Scaffolded from the Astryx `login` page template: a centered credential
// form on a plain ground, nothing competing for attention.

import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {TextQuote} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Center} from '@astryxdesign/core/Center';
import {Icon} from '@astryxdesign/core/Icon';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';

import {useSession} from '../lib/session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only same-origin paths; never an absolute or protocol-relative URL. */
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next != null && next.startsWith('/') && !next.startsWith('//')
    ? next
    : '/briefings';
}

export function LoginView() {
  const {session, signIn} = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session.status === 'signed-in') {
      router.replace(safeNextPath());
    }
  }, [session.status, router]);

  const handleSignIn = () => {
    setError('');
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password === '') {
      setError('Enter your password.');
      return;
    }
    // Preview only: the password is not checked or stored.
    signIn(email.trim().toLowerCase());
  };

  return (
    <Center axis="both" padding={6} minHeight="100dvh">
      <VStack gap={6} hAlign="center" width="100%" maxWidth={400}>
        <VStack gap={2} hAlign="center">
          <Icon icon={TextQuote} size="lg" />
          <Text weight="semibold" type="large">
            DotTeXT
          </Text>
        </VStack>

        <Card padding={8} width="100%">
          <VStack gap={5} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={1}>Sign in</Heading>
              <Text color="secondary">Emerging markets research portal</Text>
            </VStack>

            {error !== '' && <Banner status="error" title={error} />}

            <TextInput
              label="Email"
              type="email"
              size="lg"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              hasAutoFocus
            />
            <TextInput
              label="Password"
              type="password"
              size="lg"
              value={password}
              onChange={setPassword}
              onEnter={handleSignIn}
              autoComplete="current-password"
            />
            <Button
              label="Sign in"
              variant="primary"
              size="lg"
              width="100%"
              onClick={handleSignIn}
            />
          </VStack>
        </Card>

        <Text type="supporting" justify="center">
          Preview sign-in: no authentication provider is connected yet. Any
          email starts a session on this device only.
        </Text>
      </VStack>
    </Center>
  );
}
