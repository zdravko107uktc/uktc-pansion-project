import React, { useEffect, useRef, useState } from "react";

const CANVAS_HEIGHT = 120;

const SignaturePad = ({ onChange }) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const lastPos = useRef(null);
  const isDrawingRef = useRef(false);
  const contentRef = useRef(false);
  const [hasContent, setHasContent] = useState(false);

  const configureCanvas = () => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.max(wrapper.clientWidth, 280);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(CANVAS_HEIGHT * ratio);
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    configureCanvas();

    const observer = new ResizeObserver(() => {
      if (!contentRef.current) {
        configureCanvas();
      }
    });

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const getPos = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;

    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    isDrawingRef.current = true;
    lastPos.current = getPos(event);
  };

  const draw = (event) => {
    event.preventDefault();
    if (!isDrawingRef.current || !lastPos.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(event);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;

    if (!contentRef.current) {
      contentRef.current = true;
      setHasContent(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPos.current = null;

    if (contentRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    configureCanvas();
    contentRef.current = false;
    setHasContent(false);
    onChange(null);
  };

  return (
    <div>
      <div
        ref={wrapperRef}
        className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-white"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
            <span className="text-slate-300 text-sm select-none text-center">Нарисувайте подписа си тук...</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 mt-1.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-400">Използвайте мишката или пръст</span>
        {hasContent && (
          <button
            type="button"
            onClick={clear}
            className="self-start text-xs text-slate-400 hover:text-red-500 transition"
          >
            ✕ Изчисти
          </button>
        )}
      </div>
    </div>
  );
};

export default SignaturePad;
