import { useCallback, useEffect, useState } from 'react';

export const App = () => {
  const [id, setId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [targetTrackId, setTargetTrackId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const putItem = useCallback(async () => {
    if (targetTrackId == null) {
      return;
    }
    let trackId = targetTrackId;
    if (trackId.startsWith("https")) {
      const url = new URL(trackId);
      const paths = url.pathname.split("/");
      trackId = paths[paths.length - 1];
    }

    const res = await fetch(
      `/api/users/${targetUserId}/queue?trackId=${trackId}`,
      { method: "POST" }
    );
    setOk(res.ok);
  }, [targetTrackId]);

  const enable = useCallback(async () => {
    const res = await fetch("/enable", { method: "POST" });
    if (res.ok) {
      setEnabled(true);
    }
  }, []);

  const disable = useCallback(async () => {
    const res = await fetch("/disable", { method: "POST" });
    if (res.ok) {
      setEnabled(false);
    }
  }, []);

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
    <>
      {id == null && <a href="/login" > login</a > || (
        < div >
          <p>hello <a href={`/?target=${id}`}>{id}</a></p>
          <p>Enabled: {enabled ? 'enabled' : 'disabled'}</p>
          <button onClick={enable}>enable</button>
          <button onClick={disable}>disable</button>
          <a href="/logout">logout</a>
        </div >
      )}
      <div>
        <input placeholder="username" type="text" onChange={({ target }) => setTargetUserId(target.value)} />
        <input
          placeholder="trackId or url"
          type="text"
          onChange={({ target }) => setTargetTrackId(target.value)}
        />
        <button onClick={putItem}>聴かせる</button>
        <p>result: {ok ? "OK" : "Err"}</p>
      </div>
    </>
  );
};
