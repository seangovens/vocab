'use client';

import { Box, Grid, Paper, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

type PracticeStat = {
    word: string;
    correct: number;
    incorrect: number;
};

type StatsSummary = {
    streak: number;
    wordCount: number;
    mostRecent: string;
};

export default function StatsPage() {
    const [practiceStats, setPracticeStats] = useState<PracticeStat[]>([]);
    const [summary, setSummary] = useState<StatsSummary | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats`)
            .then(res => res.json())
            .then((data) => {
                console.log('Here is the practice data:');
                console.log(data);
                setPracticeStats(data.practiceStats);
                setSummary(data.summary);
            })
    }, []);

    useEffect(() => {
        if (!practiceStats || practiceStats.length == 0 || !chartRef.current) return;

        const width = 700;
        const height = 500;
        const barHeight = 30;

        const data = practiceStats.slice(0, 10);
        const svg = d3.select(chartRef.current)
            .select('#practice-stats-svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);

        const maxIncorrect = d3.max(data, (d: PracticeStat) => d.incorrect) || 1;
        const maxCorrect = d3.max(data, (d: PracticeStat) => d.correct) || 1;
        const maxBoth = Math.max(maxIncorrect, maxCorrect);

        const ctxtWord = document.createElement('canvas').getContext('2d');
        const ctxtPractice = document.createElement('canvas').getContext('2d');
        let maxLabelWidth = 0;
        if (ctxtWord) {
            // TODO do not hardcode font
            ctxtWord.font = '14px Arial';
            data.forEach((d: PracticeStat) => {
                const width = ctxtWord.measureText(d.word).width;
                if (width > maxLabelWidth) {
                    maxLabelWidth = width;
                }
            });
        }
        if (ctxtPractice) {
            // TODO do not hardcode font
            ctxtPractice.font = '12px Arial';
            data.forEach((d: PracticeStat) => {
                const width = ctxtPractice.measureText(`practiced ${d.correct + d.incorrect} times`).width;
                if (width > maxLabelWidth) {
                    maxLabelWidth = width;
                }
            });
        }
        maxLabelWidth += 20; // Add some padding

        console.log('Max label width:', maxLabelWidth);

        const xScale = d3.scaleLinear()
            .domain([-maxBoth, maxBoth])
            .range([0, width]);
        const yScale = (i: number) => i*barHeight;
        const rowPad = 2;

        svg.selectAll('.bar-incorrect')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar-incorrect')
            .attr('x', (d: PracticeStat) => xScale(-d.incorrect))
            .attr('y', (_: PracticeStat, i: number) => yScale(i*rowPad))
            .attr('width', (d: PracticeStat) => xScale(d.incorrect) - xScale(0) - (maxLabelWidth / 2))
            .attr('height', barHeight)
            .attr('fill', 'error');

        svg.selectAll('.bar-correct')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar-correct')
            .attr('x', (d: PracticeStat) => xScale(0) + (maxLabelWidth / 2))
            .attr('y', (_: PracticeStat, i: number) => yScale(i*rowPad))
            .attr('width', (d: PracticeStat) => xScale(d.correct) - xScale(0) - (maxLabelWidth / 2))
            .attr('height', barHeight)
            .attr('fill', 'success');

        svg.selectAll('.word-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'word-label')
            .attr('x', xScale(0))
            .attr('y', (_: PracticeStat, i: number) => yScale(i*rowPad) + barHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', 'var(--foreground)')
            .text((d: PracticeStat) => d.word);

        svg.selectAll('.practice-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'practice-label')
            .attr('x', xScale(0))
            .attr('y', (_: PracticeStat, i: number) => yScale(i*rowPad) + barHeight / 2 + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--foreground)')
            .text((d: PracticeStat) => `practiced ${d.correct + d.incorrect} times`);
    }, [practiceStats]);

    return (
        <Box>
            <Typography
                variant='h4'
                align='center'
                gutterBottom >
                Vocabulary Statistics
            </Typography>

            {/* Summary boxes */}
            <Grid
                container
                spacing={3}
                justifyContent='center' >
                <Grid>
                    <Paper>
                        <Typography variant='h5' >Streak</Typography>
                        <Typography
                            variant='h3'
                            color='primary' >
                            {summary ? summary.streak : '--'}
                        </Typography>
                        <Typography variant='body2' >days in a row</Typography>
                    </Paper>
                </Grid>
                <Grid>
                    <Paper>
                        <Typography variant='h5' >Words</Typography>
                        <Typography
                            variant='h3'
                            color='primary' >
                            {summary ? summary.wordCount : '--'}
                        </Typography>
                        <Typography variant='body2' >in database</Typography>
                    </Paper>
                </Grid>
                <Grid>
                    <Paper>
                        <Typography variant="h5">Most Recent</Typography>
                        <Typography
                            variant='h6'
                            color='secondary' >
                            {summary ? summary.mostRecent : '--'}
                        </Typography>
                        <Typography variant='body2' >last added</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Practice stats chart */}
            <Box
                ref={chartRef}
                id='practice-stats-chart' >
                <svg id='practice-stats-svg' />
            </Box>
        </Box>
    );
}