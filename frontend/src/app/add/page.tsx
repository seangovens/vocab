'use client';

import { useState } from 'react';
import {
    TextField,
    Button,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Stack,
    Alert,
    Checkbox,
    Snackbar,
} from '@mui/material';
import { Check } from '@mui/icons-material';
import { WordEntry } from '../page';

export default function AddPage() {
    const [word, setWord] = useState('');
    const [definitions, setDefinitions] = useState<WordEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [editing, setEditing] = useState(false);

    const handleLookup = async () => {
        setLoading(true);
        setError('');
        setSaved(false);
        setDefinitions([]);
        setEditing(false);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Lookup failed.');
            }
            else {
                setDefinitions(data.definitions);
                console.log(data);
                if (data['savedDefinitions'].length > 0) {
                    setEditing(true);
                    setSelectedIndices(
                        data.savedDefinitions.map((d: string) =>
                            data.definitions.findIndex(
                                (def: WordEntry) => def.definition === d
                            )
                        ).filter((i: number) => i !== -1)
                    );
                }
            }
        }
        catch (e) {
            setError('Could not connect to backend.');
        }
        finally {
            setLoading(false);
        }
    };

    const handleToggle = (idx: number) => {
        setSelectedIndices(selectedIndices.includes(idx) ? selectedIndices.filter(i => i !== idx) :
                            selectedIndices.length < 3 ? [...selectedIndices, idx] : selectedIndices);
    }

    const handleSave = async () => {
        setLoading(true);
        setSaved(false);
        setEditing(false);
        setSelectedIndices([]);
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word,
                    definitions: selectedIndices.map((v: number) => definitions[v]) 
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Save failed.');
            }
            else {
                setSaved(true);
                setWord('');
                setDefinitions([]);
                setSelectedIndices([]);
            }
        }
        catch (e) {
            setError('Could not connect to backend.');
        }
        finally {
            setLoading(false);
        }
    };

    return (
    <Stack spacing={3}>
        <Typography variant='h4'>Add a Word</Typography>

        <TextField
            label='Word'
            value={word}
            onChange={(e) => setWord(e.target.value)}
            disabled={loading} />

        <Button
            variant='contained'
            onClick={handleLookup}
            disabled={loading || !word}>
            Lookup Definition
        </Button>

        {
        error && 
        <Alert severity='error'>{error}</Alert>
        }
        {
        saved && 
        <Alert severity='success'>Word saved successfully!</Alert>
        }
        {
        editing &&
        <Alert severity='info' >Word already saved - you may edit the saved definitions.</Alert>
        }

        {definitions.length > 0 && (
            <>
            {/* TODO: pick up to three definitions to save? */}
            <Paper elevation={3} sx={{ padding: 2 }}>
                <Typography variant='h6'>Definitions:</Typography>
                <List>
                {definitions.map((def, i) => (
                    <ListItem
                        key={i}
                        secondaryAction={
                            <Checkbox
                                edge='end'
                                checked={selectedIndices.includes(i)}
                                onChange={() => handleToggle(i)}
                                disabled={
                                    !selectedIndices.includes(i) && selectedIndices.length >= 3
                                } />
                        } >
                        <ListItemText
                            primary={`Definition ${i}: ${def.definition}`}
                            secondary={def.example ? `Example: ${def.example}` : null} />
                    </ListItem>
                ))}
                </List>
            </Paper>

            <Button
                variant="outlined"
                onClick={handleSave}
                disabled={loading || selectedIndices.length == 0} >
                Save to Database
            </Button>
            </>
        )}
        </Stack>
    );
}
