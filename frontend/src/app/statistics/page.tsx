'use client';

import { Box, Grid, Paper, Typography, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import PageNavigation from '@/components/pageNavigation';

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
    const theme = useTheme();
    const [practiceStats, setPracticeStats] = useState<PracticeStat[]>([]);
    const [summary, setSummary] = useState<StatsSummary | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const sections = useRef<HTMLDivElement[]>([]);
    const [currentSection, setCurrentSection] = useState<number>(0);
    const [isScrolling, setIsScrolling] = useState<boolean>(false);

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
        const barHeight = 30;

        const data = practiceStats.slice(0, 10);
        const height = 60 * data.length;
        const svg = d3.select(chartRef.current)
            .select('#practiceStatsSvg')
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
            .attr('fill', theme.palette.error.main);

        svg.selectAll('.bar-correct')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar-correct')
            .attr('x', (d: PracticeStat) => xScale(0) + (maxLabelWidth / 2))
            .attr('y', (_: PracticeStat, i: number) => yScale(i*rowPad))
            .attr('width', (d: PracticeStat) => xScale(d.correct) - xScale(0) - (maxLabelWidth / 2))
            .attr('height', barHeight)
            .attr('fill', theme.palette.success.main);

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

        svg.selectAll('.practiceLabel')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'practiceLabel')
            .attr('x', xScale(0))
            .attr('y', (_: PracticeStat, i: number) => yScale(i*rowPad) + barHeight / 2 + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', 'var(--foreground)')
            .text((d: PracticeStat) => `practiced ${d.correct + d.incorrect} times`);
    }, [practiceStats]);

    const scrollToSection = (index: number) => {
        if (isScrolling) return;
        setIsScrolling(true);
        setCurrentSection(index);

        const targetSection = sections.current[index];
        if (!targetSection) return;

        targetSection.scrollIntoView({ behavior: 'smooth' });

        // const targetPosition = targetSection.offsetTop;
        
        // window.scrollTo({
        //     top: targetPosition,
        //     behavior: 'smooth'
        // });

        setTimeout(() => setIsScrolling(false), 1000);
    };
    const scrollToSectionRef = useRef(scrollToSection);
    scrollToSectionRef.current = scrollToSection;

    useEffect(() => {
        const handleScroll = (e: WheelEvent) => {
            console.log('handleScroll called');
            e.preventDefault();

            if (isScrolling) return;
            
            const direction = e.deltaY > 0 ? 1 : -1;
            console.log('Scroll direction:', direction);
            console.log('Current section index:', currentSection);
            const nextSection = currentSection + direction;
            console.log('Next section index:', nextSection);

            if (nextSection >= 0 && nextSection < sections.current.length) {
                scrollToSectionRef.current(nextSection);
            }
        };

        window.addEventListener('wheel', handleScroll, { passive: false });
        return () => window.removeEventListener('wheel', handleScroll);
    }, [currentSection, isScrolling]);

    return (
        <Box id='statisticsContainer' >

            <PageNavigation 
                showUp={currentSection > 0}
                showDown={currentSection < sections.current.length - 1}
                onUp={() => scrollToSectionRef.current(currentSection - 1)}
                onDown={() => scrollToSectionRef.current(currentSection + 1)} />

            {/* Summary boxes */}
            <Box
                ref={(el: HTMLDivElement | null) => {
                    if (el) sections.current[0] = el;
                }}
                className='statsSection'
                sx={{
                    bgcolor: theme.palette.background.default
                }} >
                <Grid
                    id='summaryBoxes'
                    container
                    spacing={3}
                    justifyContent='center'
                    alignItems='center' >
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
            </Box>

            {/* Practice stats chart */}
            <Box
                ref={(el: HTMLDivElement | null) => {
                    if (el) sections.current[1] = el;
                }}
                className='statsSection' >
                <Typography
                    variant="h4"
                    gutterBottom
                    align="center" >
                    Most Practiced Words
                </Typography>
                <Box
                    ref={chartRef}
                    id='practiceStatsChart' >
                    <svg id='practiceStatsSvg' />
                </Box>
            </Box>
        </Box>
    );
}