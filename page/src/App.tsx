import { useCallback, useEffect, useState } from 'react';
import { Container } from '@mantine/core';
import { Enqueue } from './Enqueue';
import { SelfStatus } from './SelfStatus';
import { Login } from './Login';

export const App = () => {
  const [id, setId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const getId = useCallback(async () => {
    const res = await fetch("/id");
    const { id, enabled } = await res.json();
    setId(id);
    setEnabled(enabled);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('target')) {
      setTargetUserId(urlParams.get('target'));
    }
    getId();
  }, []);

  return (
    <Container my='md'>
      <Enqueue targetId={targetUserId} />
      {id != null && enabled != null && <SelfStatus userId={id} enabled={enabled} />}
      {id == null && <Login />}
    </Container>
  );
};
