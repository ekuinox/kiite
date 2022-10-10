import { useCallback, useState } from "react";
import { Grid, Button, TextInput, Tooltip } from '@mantine/core';
import { useEffect } from "react";
import { useTimeout } from "@mantine/hooks";

export const Enqueue = ({ targetId: initTargetId }: { targetId: string | null }) => {
    const [userId, setUserId] = useState<string>(initTargetId ?? '');
    const [trackUrl, setTrackUrl] = useState<string>('');
    const [ok, setOk] = useState<boolean | null>(null);
    const [isTooltipVisible, setTooltipVisible] = useState<boolean>(false);

    useEffect(() => {
        if (initTargetId != null) {
            setUserId(initTargetId);
        }
    }, [initTargetId]);

    const submit = useCallback(async () => {
        setOk(null);
        if (trackUrl == null) {
            return;
        }
        let trackId = trackUrl;
        if (trackUrl.startsWith("https")) {
            const url = new URL(trackId);
            const paths = url.pathname.split("/");
            trackId = paths[paths.length - 1];
        }

        try {
            const res = await fetch(
                `/api/users/${userId}/queue?trackId=${trackId}`,
                { method: "POST" }
            );
            setOk(res.ok);
            setTooltipVisible(true);
            useTimeout(() => {
                setTooltipVisible(false);
            }, 3000);
        } catch (e: unknown) {
            setOk(false);
            setTooltipVisible(true);
            useTimeout(() => {
                setTooltipVisible(false);
            }, 3000);
        }
    }, [userId, trackUrl]);
    return (
        <Grid>
            <Grid.Col>
                <TextInput
                    label='聴かせる相手'
                    placeholder='spotify user id'
                    value={userId}
                    onChange={({ target: { value } }) => setUserId(value)}
                />
            </Grid.Col>
            <Grid.Col>
                <TextInput
                    label='聴かせる曲のURL'
                    placeholder='https://open.spotify.com/track/...'
                    value={trackUrl}
                    onChange={({ target: { value } }) => setTrackUrl(value)}
                />
            </Grid.Col>
            <Grid.Col>
                <Tooltip
                    label={ok ? 'ok!' : 'err'}
                    offset={3}
                    position="right"
                    radius="xl"
                    transition="slide-right"
                    transitionDuration={1000}
                    opened={isTooltipVisible}
                >
                    <Button onClick={submit}>
                        聴かせる
                    </Button>
                </Tooltip>
            </Grid.Col>
        </Grid>
    )
};
