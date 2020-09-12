import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

const Vec = {
    mul(v1, w) {
        return v1.map(v => v * w)
    },
    add(v1, v2) {
        return v1.map((v, i) => v + v2[i])
    },
    sub(v1, v2) {
        return v1.map((v, i) => v - v2[i])
    },
    min(v1, v2) {
        return v1.map((v, i) => Math.min(v, v2[i]))
    },
    max(v1, v2) {
        return v1.map((v, i) => Math.max(v, v2[i]))
    },
    rot2d(v, origin, angle) {
        const vec = this.sub(v, origin),
            rad = Math.atan2(vec[1], vec[0]) + angle,
            len = this.len(vec)
        return Vec.add(origin, [len * Math.cos(rad), len * Math.sin(rad)])
    },
    dot(v1, v2) {
        return v1.map((v, i) => v * v2[i]).reduce((s, a) => s + a, 0)
    },
    len(v) {
        return Math.sqrt(this.dot(v, v))
    },
}

const Box = {
    from(v1, v2) {
        return [Vec.min(v1, v2), Vec.max(v1, v2)]
    },
    area(b) {
        const [[xmin, ymin], [xmax, ymax]] = b
        return (xmax - xmin) * (ymax - ymin)
    },
    contains(b, v) {
        return v.every((v, i) => b[0][i] <= v && v <= b[1][i])
    },
}

function withMouseDown(onMove, onUp) {
    function onMouseMove(evt) {
        onMove(evt)
    }
    function onMouseUp(evt) {
        onUp && onUp(evt)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
}

function App() {
    const [{ pts, fcs }, setMesh] = useState({ pts: [[50, 50], [200, 50], [50, 200], [200, 200]], fcs: [[0, 1, 2], [1, 2, 3]] }),
        [selected, setSelected] = useState({ }),
        selectedIdx = Object.keys(selected).filter(key => selected[key]).map(parseFloat),
        [selectBox, setSelectBox] = useState([[0, 0], [0, 0]]),
        [handler, setHandler] = useState({ pos: [0, 0], ang: 0, shown: false }),
        handleRadius = 15

    function onMouseDownOnPt(evt, idx) {
        const start = [evt.clientX, evt.clientY],
            points = pts
        withMouseDown(evt => {
            const delta = Vec.sub([evt.clientX, evt.clientY], start),
                pts = points.slice(),
                indices = selected[idx] ? selectedIdx : [idx],
                pos = Vec.add(handler.pos, delta)
            for (const idx of indices) {
                pts[idx] = Vec.add(pts[idx], delta)
            }
            setHandler({ ...handler, pos })
            setMesh({ fcs, pts })
        }, evt => {
            if (Vec.len(Vec.sub(start, [evt.clientX, evt.clientY])) < 2) {
                setSelected(evt.ctrlKey ? { ...selected, [idx]: !selected[idx] } : { [idx]: !selected[idx] })
            }
        })
    }

    function onMouseDownOnFace(evt) {
        const start = [evt.clientX, evt.clientY],
            points = pts
        withMouseDown(evt => {
            const delta = Vec.sub([evt.clientX, evt.clientY], start),
                pts = points.map(pt => Vec.add(pt, delta)),
                pos = Vec.add(handler.pos, delta)
            setHandler({ ...handler, pos })
            setMesh({ fcs, pts })
        })
    }

    function onMouseDownOnBg(evt) {
        const start = [evt.clientX, evt.clientY],
            selectedPts = selected
        withMouseDown(evt => {
            setSelectBox(Box.from(start, [evt.clientX, evt.clientY]))
        }, evt => {
            const selectBox = Box.from(start, [evt.clientX, evt.clientY])
            if (Box.area(selectBox)) {
                const selected = { ...selectedPts }
                for (const [idx, pt] of pts.entries()) {
                    const contains = Box.contains(selectBox, pt)
                    selected[idx] = evt.ctrlKey ? (selected[idx] || contains) : contains
                }
                setSelected(selected)
            } else {
                setSelected({ })
            }
            setSelectBox([[0, 0], [0, 0]])
        })
    }

    function onMouseDownOnRotPos(evt) {
        const start = [evt.clientX, evt.clientY],
            { pos } = handler
        withMouseDown(evt => {
            setHandler({ ...handler, pos: Vec.add(pos, Vec.sub([evt.clientX, evt.clientY], start)) })
        })
    }

    function onMouseDownOnRotScl(evt) {
        const { pos } = handler,
            points = pts,
            len = Vec.len(Vec.sub([evt.clientX, evt.clientY], pos))
        withMouseDown(evt => {
            const pts = points.slice(),
                scale = Vec.len(Vec.sub([evt.clientX, evt.clientY], pos)) / len
            for (const idx of selectedIdx) {
                pts[idx] = Vec.add(pos, Vec.mul(Vec.sub(pts[idx], pos), scale))
            }
            setMesh({ fcs, pts })
        })
    }

    function onMouseDownOnRotAng(evt) {
        const start = [evt.clientX, evt.clientY],
            { pos, ang } = handler,
            src = Vec.sub(start, pos),
            rad = Math.atan2(src[1], src[0]),
            points = pts
        withMouseDown(evt => {
            const dst = Vec.sub([evt.clientX, evt.clientY], pos),
                delta = Math.atan2(dst[1], dst[0]) - rad,
                pts = points.slice()
            for (const idx of selectedIdx) {
                pts[idx] = Vec.rot2d(pts[idx], pos, delta)
            }
            setMesh({ fcs, pts })
            setHandler({ ...handler, ang: ang + delta })
        })
    }

    useEffect(() => {
        let sum = [0, 0]
        for (const idx of selectedIdx) {
            sum = Vec.add(sum, pts[idx])
        }
        const shown = selectedIdx.length > 1,
            pos = selectedIdx.length ? Vec.mul(sum, 1 / selectedIdx.length) : [0, 0],
            ang = 0
        setHandler({ shown, pos, ang })
    }, [selectedIdx.join(',')])

    // https://stackoverflow.com/questions/11808860/how-to-place-arrow-head-triangles-on-svg-lines
    return <svg width={ window.innerWidth } height={ window.innerHeight }>
        <defs>
            <marker id="head" orient="auto" markerWidth="2" markerHeight="4" refX="0.1" refY="2">
                <path d="M0,0 V4 L2,2 Z" fill="black" />
            </marker>
        </defs>
        <rect onMouseDown={ evt => onMouseDownOnBg(evt) }
            width={ window.innerWidth } height={ window.innerHeight } fill="transparent" />
        {
            fcs.map((ijk, idx) => <polygon key={ idx } className="cursor-move"
                onMouseDown={ evt => onMouseDownOnFace(evt) }
                points={ ijk.map(i => pts[i].join(',')).join(' ') }
                fill="pink" stroke="red" />)
        }
        {
            handler.shown && <g
                transform={ `translate(${handler.pos[0]}, ${handler.pos[1]}) rotate(${handler.ang / Math.PI * 180})` }>
                <circle r={ 10 } className="cursor-move"
                    onMouseDown={ evt => onMouseDownOnRotPos(evt) }
                    fill="white" stroke="gray" />
                <path d={ `M 0 ${handleRadius} A ${handleRadius} ${handleRadius} 0 0 0 0 -${handleRadius}` } className="cursor-grab"
                    onMouseDown={ evt => onMouseDownOnRotAng(evt) }
                    markerEnd="url(#head)"
                    fill="none" stroke="black" strokeWidth={ 4 } />
                <rect x={ -handleRadius*1.2-3 } y={ -3 } width={ 6 } height={ 6 } className="cursor-crosshair"
                    onMouseDown={ evt => onMouseDownOnRotScl(evt) }
                    fill="black" />
            </g>
        }
        {
            pts.map(([x, y], idx) => <circle key={ idx } className="cursor-crosshair"
                onMouseDown={ evt => onMouseDownOnPt(evt, idx) }
                cx={ x } cy={ y } r={ 5 }
                fill={ selected[idx] ? "black" : "gray" } />)
        }
        {
            Box.area(selectBox) > 0 &&
            <rect x={ selectBox[0][0] } y={ selectBox[0][1] }
                width={ selectBox[1][0] - selectBox[0][0] } height={ selectBox[1][1] - selectBox[0][1] }
                fill="rgba(128, 128, 255, 0.5)" stroke="blue" />
        }
    </svg>
}

ReactDOM.render(<App />, document.getElementById('app'))
