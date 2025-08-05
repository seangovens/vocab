'use client';

import { useEffect, useState } from 'react';
import {
    Typography,
    Paper,
    Button,
    Stack,
    CircularProgress,
    Alert,
} from '@mui/material';

type WordEntry = {
    id: number;
    word: string;
    definition: string;
    example?: string;
};

export default function PracticePage() {
    const [word, setWord] = useState<WordEntry | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchWord = async () => {
        setLoading(true);
        setShowAnswer(false);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/getrandom');
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Error loading word');
                setWord(null);
            } else {
                setWord(data);
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

    const logResult = async (correct: boolean) => {
        if (!word) return;
        await fetch('http://localhost:5000/practice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word_id: word.id, correct }),
        });
        fetchWord();
    };

    useEffect(() => {
        fetchWord();
    }, []);

    return (
        <Stack spacing={3}>
        <Typography variant="h4">Practice</Typography>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        {word && (
            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="body1" gutterBottom>
                    {word.definition}
                </Typography>
                {word.example && (
                    <Typography variant="body2" color="text.secondary">
                    Example: {word.example}
                    </Typography>
                )}

                {showAnswer ? (
                    <>
                    <Typography variant='h6' >
                        ✅ The word was: <strong>{word.word}</strong>
                    </Typography>
                    <Stack
                        direction='row'
                        spacing={2} >
                        <Button
                            variant='contained'
                            color='success'
                            onClick={() => logResult(true)} >
                            I got it right
                        </Button>
                        <Button
                            variant='outlined'
                            color='error'
                            onClick={() => logResult(false)} >
                            I got it wrong
                        </Button>
                    </Stack>
                    </>
                ) : (
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={() => setShowAnswer(true)} >
                        Reveal
                    </Button>
                )}
            </Paper>
        )}
        </Stack>
    );
}
