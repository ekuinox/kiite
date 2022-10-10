import { useCallback, useMemo, useState } from "react";
import { Grid, SegmentedControl, Text } from '@mantine/core';
import { IconBrandTwitter } from '@tabler/icons';
import { Logout } from "./Logout";

export const SelfStatus = ({ userId, enabled: initEnabled }: { userId: string; enabled: boolean }) => {
    const [enabled, setEnabled] = useState<boolean>(initEnabled);

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

    const shareTweetText = useMemo(() => {
        const userUrl = `${window.location.origin}/?target=${userId}`;
        const text = encodeURIComponent(`何か聴かせてください ${userUrl}`);
        return `https://twitter.com/intent/tweet?text=${text}`;
    }, [userId]);

    return (
        <Grid>
            <Grid.Col>
                <Text>
                    ログイン中のアカウント <a href={`/?target=${userId}`}>{userId}</a>
                    <a href={shareTweetText} target='_blank'><IconBrandTwitter /></a>
                </Text>
            </Grid.Col>
            <Grid.Col>
                <Text>次に再生に突っ込まれても良いかどうか切り替えます</Text>
                <SegmentedControl
                    value={enabled ? 'enabled' : 'disabled'}
                    onChange={(value: 'enabled' | 'disabled') => {
                        const enabled = value === 'enabled';
                        if (enabled) {
                            enable();
                        } else {
                            disable();
                        }
                    }}
                    data={[
                        {
                            value: 'enabled',
                            label: '有効',
                        },
                        {
                            value: 'disabled',
                            label: '無効',
                        },
                    ]}
                />
            </Grid.Col>
            <Grid.Col>
                <Logout />
            </Grid.Col>
        </Grid>
    );
};
