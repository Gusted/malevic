import {m, render, renderToString} from 'malevic';
import withAnimation, {animate} from 'malevic/animation';

withAnimation();

const DURATION = 2000;

function Circle({x, y, x0, y0}) {
    return (
        <circle
            cx={animate(x).initial(x0).duration(DURATION)}
            cy={animate(y).initial(y0).duration(DURATION)}
            r={5}
        />
    );
}

function getCurve(p: {x, y}[]) {
    return [
        `M${p[0].x},${p[0].y}`,
        `C${p[1].x},${p[1].y}`,
        `${p[2].x},${p[2].y}`,
        `${p[3].x},${p[3].y}`
    ].join(' ');
}

function Snake({points, color}) {
    return <svg width={100} height={100}>
        <g style={{
            fill: animate(color)
                .initial(color1)
                .interpolate(interpolateHexColor)
                .duration(DURATION),
            stroke: animate(color)
                .initial(color1)
                .interpolate(interpolateHexColor)
                .duration(DURATION)
        }}>
            <path
                d={animate(getCurve(points))
                    .initial(getCurve(curve1))
                    .duration(DURATION)}
                fill='none'
                stroke-width={4}
            />
            <Circle x={points[0].x} y={points[0].y} x0={curve1[0].x} y0={curve1[0].y} />
            <Circle x={points[3].x} y={points[3].y} x0={curve1[3].x} y0={curve1[3].y} />
        </g>
    </svg>
}

function interpolateHexColor(from: string, to: string) {
    const parse = (x: string) => parseInt(x, 16);
    const getRgb = (x: string) => [parse(x.substr(0, 2)), parse(x.substr(2, 2)), parse(x.substr(4, 2))];
    const rgb0 = getRgb(from.replace('#', ''));
    const rgb1 = getRgb(to.replace('#', ''));
    return function (t) {
        const rgb = rgb0.map((v0, i) => {
            const v1 = rgb1[i];
            return Math.round(v0 * (1 - t) + v1 * t);
        });
        return `#${rgb.map((v) => v.toString(16)).join('')}`;
    };
}

const curve1 = [
    {x: 10, y: 10},
    {x: 30, y: 40},
    {x: 70, y: 40},
    {x: 90, y: 10}
];
const curve2 = [
    {x: 10, y: 90},
    {x: 30, y: 60},
    {x: 70, y: 60},
    {x: 90, y: 90}
];
const color1 = '#223344';
const color2 = '#2299bb';
const state = {
    phase: 2,
    points: curve2,
    color: color2
};

const target = document.getElementById('animation');

function draw() {
    const tree = <Snake points={state.points} color={state.color} />;
    const markup = renderToString(tree);
    render(target, (
        <div>
            {tree}
            <pre>
                <code>{markup}</code>
            </pre>
        </div>
    ));
}

draw();

setInterval(function () {
    state.points = state.phase === 1 ? curve2 : curve1;
    state.color = state.phase === 1 ? color2 : color1;
    state.phase = state.phase === 1 ? 2 : 1;
    draw();
}, DURATION);
