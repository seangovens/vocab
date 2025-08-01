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
} from '@mui/material';

export default function AddPage() {
  const [word, setWord] = useState('');
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    setDefinitions([]);

    try {
      const res = await fetch('http://localhost:5000/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lookup failed.');
      } else {
        setDefinitions(data.definitions);
      }
    } catch (e) {
      setError('Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, definitions }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed.');
      } else {
        setSaved(true);
        setWord('');
        setDefinitions([]);
      }
    } catch (e) {
      setError('Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
        <Stack spacing={3}>
        <Typography variant="h4">Add a Word</Typography>

        <TextField
        label="Word"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        disabled={loading}
        />

        <Button variant="contained" onClick={handleLookup} disabled={loading || !word}>
        Lookup Definition
        </Button>

        {error && 
        <Alert severity="error">{error}</Alert>
        }
        {saved && <Alert severity="success">Word saved successfully!</Alert>}

      {definitions.length > 0 && (
        <>
        {/* TODO: pick up to three definitions to save? */}
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h6">Definitions:</Typography>
            <List>
              {definitions.map((def, i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={`Definition ${i}: ${def.definition}`}
                    secondary={def.example ? `Example: ${def.example}` : null}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Button variant="outlined" onClick={handleSave} disabled={loading}>
            Save to Database
          </Button>
        </>
      )}
    </Stack>
  );
}
