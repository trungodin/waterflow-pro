// Type declaration for react-plotly.js
declare module 'react-plotly.js' {
    import * as React from 'react';
    interface PlotProps {
        data: any[];
        layout?: any;
        config?: any;
        style?: React.CSSProperties;
        className?: string;
        onInitialized?: (figure: any) => void;
        onUpdate?: (figure: any) => void;
        onPurge?: (figure: any) => void;
        onError?: (error: Error) => void;
        onClick?: (event: any) => void;
        onHover?: (event: any) => void;
        onSelected?: (event: any) => void;
        onRelayout?: (event: any) => void;
        onRestyle?: (event: any) => void;
        onRedraw?: (event: any) => void;
        onAnimated?: (event: any) => void;
        onAnimatingFrame?: (event: any) => void;
        onAnimationInterrupted?: (event: any) => void;
        onDoubleClick?: (event: any) => void;
        onBeforeHover?: (event: any) => void;
        onAfterHover?: (event: any) => void;
        onBeforeUnhover?: (event: any) => void;
        onAfterUnhover?: (event: any) => void;
        onLayout?: (event: any) => void;
        onResize?: (event: any) => void;
        onHover?: (event: any) => void;
        onClick?: (event: any) => void;
        onSelected?: (event: any) => void;
        onDeselect?: (event: any) => void;
        onRelayout?: (event: any) => void;
        onRestyle?: (event: any) => void;
        onAnimated?: (event: any) => void;
        onAnimatingFrame?: (event: any) => void;
        onAnimationInterrupted?: (event: any) => void;
        onDoubleClick?: (event: any) => void;
        onBeforeHover?: (event: any) => void;
        onAfterHover?: (event: any) => void;
        onBeforeUnhover?: (event: any) => void;
        onAfterUnhover?: (event: any) => void;
        onLayout?: (event: any) => void;
        onResize?: (event: any) => void;
        // ... other Plotly.js event handlers as needed
    }
    const Plot: React.FC<PlotProps>;
    export default Plot;
}
