<script lang="ts">
  let id: string | null = null;
  let enabled: boolean | null = null;
  let targetTrackId: string | null = null;
  let targetUserId: string | null = null;
  let ok: boolean | null = null;

  const putItem = async () => {
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
    ok = res.ok;
  };

  const enable = async () => {
    const res = await fetch("/enable", { method: "POST" });
    if (res.ok) {
      enabled = true;
    }
  };

  const disable = async () => {
    const res = await fetch("/disable", { method: "POST" });
    if (res.ok) {
      enabled = false;
    }
  };

  const getId = async () => {
    const res = await fetch("/id");
    const json = await res.json();
    id = json.id;
    enabled = json.enabled;
  };

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('target')) {
    targetUserId = urlParams.get('target');
  }

  getId();
</script>

<main>
  {#if id == null}
    <a href="/login">login</a>
  {:else}
    <div>
      <p>hello <a href="/users/${id}">{id}</a></p>
      <p>Enabled: {enabled}</p>
      <button on:click={enable}>enable</button>
      <button on:click={disable}>disable</button>
      <a href="/logout">logout</a>
    </div>
  {/if}
  <div>
    <input placeholder="username" type="text" bind:value={targetUserId} />
    <input
      placeholder="trackId or url"
      type="text"
      bind:value={targetTrackId}
    />
    <button on:click={putItem}>聴かせる</button>
    <p>result: {ok ? "OK" : "Err"}</p>
  </div>
</main>
