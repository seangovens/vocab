'use client';

import { useEffect, useState } from 'react';
import {
    Typography,
    Paper,
    Button,
    Stack,
    CircularProgress,
    Alert,
    useTheme,
} from '@mui/material';

export type WordEntry = {
    id: number;
    word: string;
    definition: string;
    example?: string;
};

export default function PracticePage() {
    const theme = useTheme();
    console.log('Theme colors:', {
        success: theme.palette.success.main,
        error: theme.palette.error.main
    });
    const [responses, setResponses] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [word, setWord] = useState<WordEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchWords = async () => {
        setLoading(true);
        setSelected(null);
        setError('');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/getrandom`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Error loading words');
                setWord(null);
            } else {
                // Generate a random index in data to select correct word
                const correctIndex = Math.floor(Math.random() * data.length);
                setWord(data[correctIndex]);
                setResponses(data.map((entry: WordEntry) => entry.word));
            }
        } 
        catch (e) {
            setError('Failed to connect to backend.');
            setWord(null);
        }
        finally {
            setLoading(false);
        }
    };

    const handleResponse = async (resp: string) => {
        if (!word) return;
        setSelected(resp);
        const correct = resp === word.word;
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/practice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word_id: word.id, correct }),
        });
    }

    useEffect(() => {
        fetchWords();
    }, []);

    return (
        <Stack spacing={3} >
        <Typography variant='h4' >Practice</Typography>

        {loading && <CircularProgress />}
        {error && <Alert severity='error' >{error}</Alert>}

        {word && (
            <Paper elevation={3} >
                <Typography
                    variant='body1'
                    gutterBottom >
                    {word.definition}
                </Typography>

                {/* Only show example if it exists and answer is revealed */}
                {
                (word.example && selected != null) &&
                <Typography variant='body2' color='text.secondary' >
                    Example: {word.example}
                </Typography>
                }

                <Stack
                    direction='row'
                    spacing={1}
                    flexWrap='wrap' >
                    {responses.map((resp, i) => (
                        <Button
                            key={i}
                            variant={selected === resp ? 'contained' : 'outlined'}
                            sx={{
                                '&.MuiButton-containedSuccess': {
                                    backgroundColor: theme.palette.success.main
                                },
                                '&.MuiButton-containedError': {
                                    backgroundColor: theme.palette.error.main
                                },
                                // Add styles for outlined variants
                                '&.MuiButton-outlinedSuccess': {
                                    borderColor: theme.palette.success.main,
                                    color: theme.palette.success.main
                                },
                                '&.MuiButton-outlinedError': {
                                    borderColor: theme.palette.error.main,
                                    color: theme.palette.error.main
                                }
                            }}
                            color={selected != null ? 
                                (word.word === resp ? 'success' :
                                    selected === resp ? 'error' : 'primary') : 'primary'}
                            onClick={() => handleResponse(resp)}
                            disabled={selected != null} >
                            {resp}
                        </Button>
                    ))}
                </Stack>
                {
                selected != null &&
                <Button
                    variant='text'
                    onClick={fetchWords} >
                    Next
                </Button>
                }
            </Paper>
        )}
        </Stack>
    );
}
