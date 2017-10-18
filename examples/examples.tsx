import { html, render, renderToString } from 'malevic';
import withAnimation, { animate } from 'malevic/animation';
import withForms from 'malevic/forms';
import { Button, CheckBox, Flex, Label, TextBox } from 'malevic/controls';

// Core
// --------------------------------------------

(function () {

    function Heading({ text }) {
        return <h3>{text}</h3>;
    }

    function Button(props: { text: string; onClick: () => void; }) {
        return (
            <button onclick={(e: MouseEvent) => props.onClick()} >
                {props.text}
            </button>
        );
    }

    function PrintSize() {
        const printSize = (domNode: Element) => {
            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;
            render(domNode, `Window: ${width}x${height}`);
        };
        return (
            <h4
                native
                didmount={printSize}
                didupdate={printSize}
            ></h4>
        );
    }

    function View(props: {
        count: number;
        onIncrement: () => void;
    }) {
        return (
            <div class='view' style={{ width: '300px', height: '200px' }}>
                <PrintSize />
                {(domNode: Element) => {
                    const rect = domNode.getBoundingClientRect();
                    return <Heading text={`View: ${rect.width}x${rect.height}`} />;
                }}
                <Heading text={`Count: ${props.count}`} />
                <Button
                    onClick={props.onIncrement}
                    text='Increment'
                />
            </div>
        );
    }

    let state: { count: number; } = null;

    function setState(newState) {
        state = Object.assign({}, state, newState);
        render(
            document.getElementById('core'),
            <View
                count={state.count}
                onIncrement={() => {
                    setState({ count: state.count + 1 });
                }}
            />
        );
    }

    setState({ count: 0 });

    window.addEventListener('resize', () => setState({}));
})();

// Animation
// ---------------------------------------------

withAnimation();

(function () {

    const DURATION = 2000;

    function Circle({ x, y, x0, y0 }) {
        return (
            <circle
                cx={animate(x).initial(x0).duration(DURATION)}
                cy={animate(y).initial(y0).duration(DURATION)}
                r={5}
            />
        );
    }

    function getCurve(p: { x, y }[]) {
        return [
            `M${p[0].x},${p[0].y}`,
            `C${p[1].x},${p[1].y}`,
            `${p[2].x},${p[2].y}`,
            `${p[3].x},${p[3].y}`
        ].join(' ');
    }

    function Snake({ points, color }) {
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
        { x: 10, y: 10 },
        { x: 30, y: 40 },
        { x: 70, y: 40 },
        { x: 90, y: 10 }
    ];
    const curve2 = [
        { x: 10, y: 90 },
        { x: 30, y: 60 },
        { x: 70, y: 60 },
        { x: 90, y: 90 }
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

})();

// Lifecycle
// ---------------------------------------

(function () {

    function Tooltip({ text, cx, cy }) {
        return (domNode: SVGSVGElement) => {
            const temp = render(domNode, <text font-size={16}>{text}</text>);
            const box = (temp as SVGTextElement).getBBox();
            return [
                <rect fill='#fe2'
                    x={cx - box.width / 2}
                    y={cy - box.height / 2}
                    width={box.width}
                    height={box.height}
                />,
                <text font-size={16} text-anchor='middle'
                    x={cx}
                    y={cy - box.y - box.height / 2}
                >{text}</text>
            ];
        };
    }

    render(document.getElementById('lifecycle'), (
        <svg width="100" height="50">
            <Tooltip text='Hello' cx={50} cy={25} />
        </svg>
    ));

})();

// Forms
// ---------------------------------------

withForms();

(function () {

    let state: { text: string; checked: boolean; num: number; } = null;

    function Form({ checked, text, num, onCheckChange, onTextChange, onNumChange }) {
        return (
            <form onsubmit={(e) => e.preventDefault()}>
                <input
                    type="checkbox"
                    checked={checked}
                    onchange={(e) => onCheckChange(e.target.checked)}
                />
                <input
                    type="number"
                    value={num}
                    readonly={!checked}
                    onchange={(e) => !isNaN(e.target.value) && onNumChange(e.target.value)}
                    onkeypress={(e) => {
                        if (e.keycode === 13 && !isNaN(e.target.value)) {
                            onNumChange(e.target.value);
                        }
                    }}
                />
                <textarea oninput={(e) => onTextChange(e.target.value)}>
                    {text}
                </textarea>
                <pre>{JSON.stringify({ checked, text, num }, null, 4)}</pre>
            </form>
        );
    }

    function setState(newState) {
        state = Object.assign({}, state, newState);
        render(
            document.getElementById('forms'),
            <Form
                text={state.text}
                checked={state.checked}
                num={state.num}
                onCheckChange={(checked) => setState({ checked })}
                onTextChange={(text) => setState({ text })}
                onNumChange={(num) => setState({ num })}
            />
        );
    }

    setState({ checked: true, text: 'text', num: 5 });
})();

// Controls
// ---------------------------------------

(function () {

    let state: { text: string; done: boolean; num: number; } = null;

    function View({ text, isDone, onCheckChange, onClick, onTextChange, num, onNumChange }) {
        return (
            <Flex column>
                <Flex row>
                    <Button iconClass='smile' text='smile' />
                    <CheckBox checked={isDone} onchange={(e) => onCheckChange(e.target.checked)}>
                        Done
                    </CheckBox>
                    <Button onclick={onClick}>
                        {text}
                    </Button>
                </Flex>
                <Flex row>
                    <Label>Text</Label>
                    <TextBox oninput={(e) => onTextChange(e.target.value)} placeholder='input...'>
                        {text}
                    </TextBox>
                </Flex>
                <Flex row>
                    <Label>Number</Label>
                    <TextBox
                        type='number'
                        value={num}
                        onchange={(e) => !isNaN(e.target.value) && onNumChange(e.target.value)}
                        placeholder='input...'
                    />
                </Flex>
            </Flex>
        );
    }

    function setState(newState) {
        state = Object.assign({}, state, newState);
        render(
            document.getElementById('controls'),
            <View
                text={state.text}
                isDone={state.done}
                onCheckChange={(checked) => setState({ done: checked, text: state.text + checked })}
                onClick={() => setState({ text: (state.text + '+') })}
                onTextChange={(value) => setState({ text: value })}
                num={state.num}
                onNumChange={(value) => setState({ num: value })}
            />
        );
    }

    setState({ text: 'increment', done: true });

})();
