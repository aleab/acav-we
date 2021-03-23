/* eslint-disable react/no-danger */
import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ClockFontFamily } from '../../app/ClockFontFamily';
import WallpaperContext from '../../app/WallpaperContext';
import useComplexStateMerging from '../../hooks/useComplexStateMerging';
import useLocalFontFile from '../../hooks/useLocalFontFile';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

type AnalogClockStyle = {
};

type ClockBackgroundStyle = {
    fill: string;
    fillOpacity: number;
};
type ClockTicksStyle = {
    fill: string;
};
type ClockNumbersStyle = {
    fontFamily: string;
    fontSize: number;
    fill: string;
};
type ClockHandsStyle = {
    fill: string;
};
type ClockBorderStyle = {
    stroke: string;
    strokeWidth: number;
};

function calcWindowSizePercentage(percentage: number) {
    const minDimension = Math.min(window.innerHeight, window.innerWidth);
    return minDimension * (percentage / 100);
}

const LOCALSTORAGE_FONT = 'aleab.acav.clock_analog.font';

const SEC2DEG = 360 / 60;
const MIN2DEG = 360 / 60;
const H2DEG = 360 / 12;

function _calcClockHandsRotations(now: Date, showSeconds: boolean): [number, number, number] {
    const h = now.getHours();
    const m = now.getMinutes();
    const s = showSeconds ? now.getSeconds() : 0;

    const hR = -180 + (H2DEG * h) + (H2DEG * (m / 60)) + (H2DEG * (s / 3600));
    const mR = -180 + (MIN2DEG * m) + (MIN2DEG * (s / 60));
    const sR = -180 + (SEC2DEG * s);

    return [ hR % 360, mR % 360, sR % 360 ];
}

export default function AnalogClock() {
    const RENDER_ID = useMemo(() => `AnalogClock-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.clock.analog);

    const [ radius, setRadius ] = useState(calcWindowSizePercentage(O.current.radius));
    const [ showSeconds, setShowSeconds ] = useState(O.current.showSeconds);

    const [ style, setStyle ] = useComplexStateMerging<AnalogClockStyle>({});
    const [ clockBackgroundStyle, setClockBackgroundStyle ] = useComplexStateMerging<ClockBackgroundStyle>({
        fill: `#${ColorConvert.rgb.hex(O.current.backgroundColor as RGB)}`,
        fillOpacity: O.current.backgroundColorAlpha / 100,
    });
    const [ clockTicksStyle, setClockTicksStyle ] = useComplexStateMerging<ClockTicksStyle>({
        fill: `#${ColorConvert.rgb.hex(O.current.ticks.color as RGB)}`,
    });
    const [ clockNumbersStyle, setClockNumbersStyle ] = useComplexStateMerging<ClockNumbersStyle>({
        fontFamily: O.current.numbers.font,
        fontSize: O.current.numbers.fontSize,
        fill: `#${ColorConvert.rgb.hex(O.current.numbers.color as RGB)}`,
    });
    const [ clockHandsHoursStyle, setClockHandsHoursStyle ] = useComplexStateMerging<ClockHandsStyle>({ fill: `#${ColorConvert.rgb.hex(O.current.hands.hoursColor as RGB)}` });
    const [ clockHandsMinutesStyle, setClockHandsMinutesStyle ] = useComplexStateMerging<ClockHandsStyle>({ fill: `#${ColorConvert.rgb.hex(O.current.hands.minutesColor as RGB)}` });
    const [ clockHandsSecondsStyle, setClockHandsSecondsStyle ] = useComplexStateMerging<ClockHandsStyle>({ fill: `#${ColorConvert.rgb.hex(O.current.hands.secondsColor as RGB)}` });
    const [ clockBorderStyle, setClockBorderStyle ] = useComplexStateMerging<ClockBorderStyle>({
        stroke: `#${ColorConvert.rgb.hex(O.current.border.color as RGB)}`,
        strokeWidth: O.current.border.thickness,
    });

    const [ clockTicksRadius, setClockTicksRadius ] = useState(radius * (O.current.ticks.radius / 100));
    const [ clockTicksThickness, setClockTicksThickness ] = useState(O.current.ticks.thickness);
    const [ clockTicksLength, setClockTicksLength ] = useState(O.current.ticks.length);
    const [ clockNumbersRadius, setClockNumbersRadius ] = useState(radius * (O.current.numbers.radius / 100));
    const [ clockHandsHoursLength, setClockHandsHoursLength ] = useState(radius * (O.current.hands.hoursLength / 100));
    const [ clockHandsMinutesLength, setClockHandsMinutesLength ] = useState(radius * (O.current.hands.minutesLength / 100));
    const [ clockHandsSecondsLength, setClockHandsSecondsLength ] = useState(radius * (O.current.hands.secondsLength / 100));
    const [ clockHandsAnimations, setClockHandsAnimations ] = useState<[number, number, number]>();

    const [ now, setNow ] = useState(new Date());
    const [ loaded, setLoaded ] = useState(false);

    const pauseJustEnded = useRef(false);
    useEffect(() => {
        function onPaused(e: PausedEventArgs) {
            if (!e.isPaused) pauseJustEnded.current = true;
        }
        context.wallpaperEvents.onPaused.subscribe(onPaused);
        return () => {
            context.wallpaperEvents.onPaused.unsubscribe(onPaused);
        };
    }, [ context.wallpaperEvents.onPaused, loaded ]);

    const [ showBrowseFontButton, setShowBrowseFontButton, localFontBlobUrl, onLocalFontChange ] = useLocalFontFile(
        O.current.numbers.font === ClockFontFamily.LocalFont,
        LOCALSTORAGE_FONT,
        () => setLoaded(true),
        () => setClockNumbersStyle({ fontFamily: ClockFontFamily.LocalFont }),
        () => setClockNumbersStyle({ fontFamily: 'inherit' }),
    );

    const updateRadii = useCallback((clockRadius: number) => {
        setRadius(clockRadius);
        setClockTicksRadius(clockRadius * (O.current.ticks.radius / 100));
        setClockNumbersRadius(clockRadius * (O.current.numbers.radius / 100));
        setClockHandsHoursLength(clockRadius * (O.current.hands.hoursLength / 100));
        setClockHandsMinutesLength(clockRadius * (O.current.hands.minutesLength / 100));
        setClockHandsSecondsLength(clockRadius * (O.current.hands.secondsLength / 100));
    }, []);

    const calcClockHandsRotations = useCallback((_now: Date) => _calcClockHandsRotations(_now, showSeconds), [showSeconds]);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.clock?.analog, analogProps => {
        { // .analog
            const s: Partial<AnalogClockStyle> = {};
            if (analogProps.radius !== undefined) {
                const r = calcWindowSizePercentage(analogProps.radius);
                updateRadii(r);
            }
            setStyle(s);
        }
        { // background
            const s: Partial<ClockBackgroundStyle> = {};
            if (analogProps.backgroundColor !== undefined) s.fill = `#${ColorConvert.rgb.hex(analogProps.backgroundColor as RGB)}`;
            if (analogProps.backgroundColorAlpha !== undefined) s.fillOpacity = analogProps.backgroundColorAlpha / 100;
            setClockBackgroundStyle(s);
        }

        const r = calcWindowSizePercentage(O.current.radius);

        // border
        if (analogProps.border) {
            const s: Partial<ClockBorderStyle> = {};
            if (analogProps.border.thickness !== undefined) s.strokeWidth = analogProps.border.thickness;
            if (analogProps.border.color !== undefined) s.stroke = `#${ColorConvert.rgb.hex(analogProps.border.color as RGB)}`;

            setClockBorderStyle(s);
        }

        // ticks
        if (analogProps.ticks) {
            const s: Partial<ClockTicksStyle> = {};
            if (analogProps.ticks.color !== undefined) s.fill = `#${ColorConvert.rgb.hex(analogProps.ticks.color as RGB)}`;
            setClockTicksStyle(s);

            if (analogProps.ticks.radius !== undefined) setClockTicksRadius(r * (analogProps.ticks.radius / 100));
            if (analogProps.ticks.thickness !== undefined) setClockTicksThickness(analogProps.ticks.thickness);
            if (analogProps.ticks.length !== undefined) setClockTicksLength(analogProps.ticks.length);
        }

        // numbers
        if (analogProps.numbers) {
            const s: Partial<ClockNumbersStyle> = {};
            if (analogProps.numbers.font !== undefined) {
                s.fontFamily = analogProps.numbers.font === ClockFontFamily.LocalFont ? 'inherit' : analogProps.numbers.font;
                setShowBrowseFontButton(analogProps.numbers.font === ClockFontFamily.LocalFont);
            }
            if (analogProps.numbers.fontSize !== undefined) s.fontSize = analogProps.numbers.fontSize;
            if (analogProps.numbers.color !== undefined) s.fill = `#${ColorConvert.rgb.hex(analogProps.numbers.color as RGB)}`;

            setClockNumbersStyle(s);

            if (analogProps.numbers.radius !== undefined) setClockNumbersRadius(r * (analogProps.numbers.radius / 100));
        }

        // hands
        if (analogProps.hands) {
            {
                const s: Partial<ClockHandsStyle> = {};
                if (analogProps.hands.hoursColor !== undefined) s.fill = `#${ColorConvert.rgb.hex(O.current.hands.hoursColor as RGB)}`;
                setClockHandsHoursStyle(s);
            }
            {
                const s: Partial<ClockHandsStyle> = {};
                if (analogProps.hands.minutesColor !== undefined) s.fill = `#${ColorConvert.rgb.hex(O.current.hands.minutesColor as RGB)}`;
                setClockHandsMinutesStyle(s);
            }
            {
                const s: Partial<ClockHandsStyle> = {};
                if (analogProps.hands.secondsColor !== undefined) s.fill = `#${ColorConvert.rgb.hex(O.current.hands.secondsColor as RGB)}`;
                setClockHandsSecondsStyle(s);
            }

            if (analogProps.hands.hoursLength !== undefined) setClockHandsHoursLength(r * (analogProps.hands.hoursLength / 100));
            if (analogProps.hands.minutesLength !== undefined) setClockHandsMinutesLength(r * (analogProps.hands.minutesLength / 100));
            if (analogProps.hands.secondsLength !== undefined) setClockHandsSecondsLength(r * (analogProps.hands.secondsLength / 100));
        }

        if (analogProps.showSeconds !== undefined) setShowSeconds(analogProps.showSeconds);
    }, []);

    useEffect(() => {
        const intervalId = setInterval((() => {
            const _now = new Date();
            if (pauseJustEnded.current) {
                pauseJustEnded.current = false;
                const rotations = calcClockHandsRotations(_now);

                context.renderer.queue(RENDER_ID, () => {
                    setClockHandsAnimations(rotations);
                });
            } else {
                context.renderer.queue(RENDER_ID, () => {
                    setClockHandsAnimations(undefined);
                    setNow(_now);
                });
            }
        }) as TimerHandler, 1000);
        return () => {
            clearInterval(intervalId);
            context.renderer.cancel(RENDER_ID);
        };
    }, [ RENDER_ID, calcClockHandsRotations, context.renderer ]);

    // ========
    //  RENDER
    // ========

    // Animation to smoothly get the clock hands to the current time's position after a pause
    const clockHandHoursAnimationRef = React.createRef<SVGAnimationElement>();
    const clockHandMinutesAnimationRef = React.createRef<SVGAnimationElement>();
    const clockHandSecondsAnimationRef = React.createRef<SVGAnimationElement>();
    useEffect(() => clockHandHoursAnimationRef.current?.beginElement(), [clockHandHoursAnimationRef]);
    useEffect(() => clockHandMinutesAnimationRef.current?.beginElement(), [clockHandMinutesAnimationRef]);
    useEffect(() => clockHandSecondsAnimationRef.current?.beginElement(), [clockHandSecondsAnimationRef]);

    // eslint-disable-next-line react/display-name
    const ClockHandAnimation = React.forwardRef<SVGAnimationElement, { dur: number, rotation: number, a: number }>((p, ref) => (
      <animateTransform ref={ref} attributeName="transform" attributeType="XML" type="rotate" begin="indefinite" dur={`${p.dur.toFixed(3)}s`} fill="freeze" to={`${p.rotation} ${p.a} ${p.a}`} />
    ));

    const ClockNumbers = useCallback((p: { viewWidth: number, radius: number, style: ClockNumbersStyle }) => {
        const a = p.viewWidth / 2;

        const clockNumbers = [];
        for (let i = 0; i < 12; ++i) {
            const angle = H2DEG * i * Math.DEG2RAD;

            const baseline = i >= 11 || i <= 1 ? 'hanging'
                : i >= 5 && i <= 7 ? 'auto'
                : i === 10 || i === 2 ? 'mathematical'
                : 'middle';
            const anchor = i >= 2 && i <= 4 ? 'end'
                : i >= 8 && i <= 10 ? 'start'
                : 'middle';
            const dx = i === 10 ? 0.2 * p.style.fontSize : 0;

            clockNumbers.push(
              <text
                key={i} dominantBaseline={baseline} textAnchor={anchor}
                x={a + p.radius * Math.sin(angle) - dx}
                y={a - p.radius * Math.cos(angle)}
              >
                {i === 0 ? 12 : i}
              </text>,
            );
        }
        return (
          <g id="clock-numbers" shapeRendering="geometricPrecision" style={p.style}>
            {clockNumbers}
          </g>
        );
    }, []);

    const ClockTicks = useCallback((p: { viewWidth: number, radius: number, thickness: number, length: number, style: ClockTicksStyle }) => {
        const a = p.viewWidth / 2;

        const ticks = [];
        for (let i = 0; i < 5 * 12; ++i) {
            let width = p.thickness;
            let height = p.length;
            if ((i % 5) === 0) {
                // hour tick
                width = 2 * p.thickness;
                height = 1.5 * p.length;
            }

            ticks.push(
              <rect
                key={i} width={width} height={height}
                x={a - width / 2} y={a - p.radius}
                transform={`rotate(${MIN2DEG * i}, ${a}, ${a})`}
              />,
            );
        }
        return (
          <g id="clock-ticks" style={p.style}>{ticks}</g>
        );
    }, []);

    const ClockHands = useCallback((p: {
        now: Date, showSeconds: boolean,
        viewWidth: number, radius: number,
        lengths: [number, number, number],
        styles: [ClockHandsStyle, ClockHandsStyle, ClockHandsStyle],
        animations: [number, number, number] | undefined,
        animationRefs: [React.RefObject<SVGAnimationElement>, React.RefObject<SVGAnimationElement>, React.RefObject<SVGAnimationElement>]
    }) => {
        ((_: any) => {})(ClockHandAnimation); // eslint react-hooks/exhaustive-deps

        const a = p.viewWidth / 2;
        const rotations = _calcClockHandsRotations(p.now, p.showSeconds);

        const svgAnimations: [React.SVGProps<SVGElement> | null, React.SVGProps<SVGElement> | null, React.SVGProps<SVGElement> | null] = [ null, null, null ];
        if (p.animations) {
            for (let i = 0; i < 3; ++i) {
                if (p.animations[i] !== rotations[i]) {
                    let deltaRotation = p.animations[i] - rotations[i];
                    deltaRotation = Math.abs(deltaRotation + (deltaRotation > 180 ? -360 : deltaRotation < -180 ? 360 : 0));

                    // The speed of the animation is constant; max deltaRotation is 180 and max duration is 0.9s
                    const duration = (deltaRotation / 180) * 0.9;
                    svgAnimations[i] = <ClockHandAnimation dur={duration} rotation={p.animations[i]} a={a} ref={p.animationRefs[i]} />;
                }
            }
        }

        return (
          <g id="clock-hands">
            <rect x={a - 2} y={a} width="4" height={p.lengths[0]} transform={`rotate(${rotations[0]}, ${a}, ${a})`} style={p.styles[0]}>{svgAnimations[0]}</rect>
            <rect x={a - 1} y={a} width="2" height={p.lengths[1]} transform={`rotate(${rotations[1]}, ${a}, ${a})`} style={p.styles[1]}>{svgAnimations[1]}</rect>
            {
                p.showSeconds ? (
                  <rect x={a} y={a} width="1" height={p.lengths[2]} transform={`rotate(${rotations[2]}, ${a}, ${a})`} style={p.styles[2]}>{svgAnimations[2]}</rect>
                ) : null
            }
          </g>
        );
    }, [ClockHandAnimation]);

    const halfWidth = useMemo(() => radius + clockBorderStyle.strokeWidth, [ clockBorderStyle.strokeWidth, radius ]);
    const width = useMemo(() => 2 * halfWidth, [halfWidth]);

    return loaded ? (
      <>
        {showBrowseFontButton ? <input id="browseFont" type="file" style={{ color: clockNumbersStyle.fill }} accept=".ttf, .otf, .eot, .woff, .woff2" onChange={onLocalFontChange} /> : null}
        {localFontBlobUrl !== null ? <style dangerouslySetInnerHTML={{ __html: `@font-face { font-family: "LocalFont"; src: url(${localFontBlobUrl}); }` }} /> : null}
        <div className="analog" style={style}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${width}`} width={width}>
            <circle id="clock-face" cx={halfWidth} cy={halfWidth} r={radius} style={clockBackgroundStyle} />
            <ClockTicks viewWidth={width} radius={clockTicksRadius} style={clockTicksStyle} thickness={clockTicksThickness} length={clockTicksLength} />
            <ClockNumbers viewWidth={width} radius={clockNumbersRadius} style={clockNumbersStyle} />
            <ClockHands
              now={now} showSeconds={showSeconds} viewWidth={width} radius={radius}
              lengths={[ clockHandsHoursLength, clockHandsMinutesLength, clockHandsSecondsLength ]}
              styles={[ clockHandsHoursStyle, clockHandsMinutesStyle, clockHandsSecondsStyle ]}
              animations={clockHandsAnimations} animationRefs={[ clockHandHoursAnimationRef, clockHandMinutesAnimationRef, clockHandSecondsAnimationRef ]}
            />
            <circle id="clock-border" cx={halfWidth} cy={halfWidth} r={radius} fill="none" shapeRendering="geometricPrecision" style={clockBorderStyle} />
          </svg>
        </div>
      </>
    ) : null;
}
