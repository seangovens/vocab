import { ArrowDownward, ArrowUpward } from "@mui/icons-material";
import { Box, IconButton, useTheme } from "@mui/material";

type PageNavigationProps = {
    onUp?: () => void;
    onDown?: () => void;
    showUp?: boolean;
    showDown?: boolean;
};

export default function PageNavigation({ onUp, onDown, showUp, showDown } : PageNavigationProps) {
    const theme = useTheme();

    return (
        <Box className='pageNavigation' >
            {showUp && (
                <IconButton
                    className='pageNavigationButton upButton'
                    onClick={onUp}
                    sx={{
                        bgcolor: theme.palette.background.paper,
                        '&:hover': { bgcolor: theme.palette.background.paper }
                    }} >
                    <ArrowUpward />
                </IconButton>
            )}
            {showDown && (
                <IconButton
                    className='pageNavigationButton downButton'
                    onClick={onDown}
                    sx={{
                        bgcolor: theme.palette.background.paper,
                        '&:hover': { bgcolor: theme.palette.background.paper }
                    }} >
                    <ArrowDownward />
                </IconButton>
            )}
        </Box>
    );
}