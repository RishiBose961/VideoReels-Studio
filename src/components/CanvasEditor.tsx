/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Stage,
  Layer as KonvaLayer,
  Image as KImage,
  Text,
  Rect,
  Ellipse,
  Arrow,
  Transformer,
  Line,
  Circle,
  Group,
} from 'react-konva';
import Konva from 'konva';
import { Upload, Sparkles } from 'lucide-react';
import { useEditorStore, makeImageLayer, makeVideoLayer } from '../store/editorStore';
import { getTransformAtTime } from '../lib/animation';
import { drawParticleFxToCanvas } from '../lib/particleFx';
import {
  drawPaperBackdrop,
  drawPaperCutoutImage,
  drawPaperText,
  isPaperBackdrop,
} from '../lib/paperRenderer';
import { STARTER_TEMPLATES } from '../lib/templates';
import type { Layer } from '../types';

function getShadowProps(layer: Layer) {
  const s = layer.shadow;
  if (!s || !s.enabled) return { shadowEnabled: false };
  return {
    shadowEnabled: true,
    shadowColor: s.color || '#000000',
    shadowBlur: s.blur ?? 12,
    shadowOffsetX: s.offsetX ?? 0,
    shadowOffsetY: s.offsetY ?? 4,
    shadowOpacity: 0.75,
  };
}

// ─── Image Node ───────────────────────────────────────────────────────────────

function ImageNode({
  layer,
  nodeRef,
  onSelect,
  onDragMoveSnap,
  onDragEndSnap,
  onTransformEnd,
}: {
  layer: Layer;
  nodeRef: (n: Konva.Node | null) => void;
  onSelect: () => void;
  onDragMoveSnap: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEndSnap: () => void;
  onTransformEnd: (patch: Partial<Layer['transform']>) => void;
}) {
  const imageRef = useRef<Konva.Image>(null);
  const { currentTime } = useEditorStore();
  const tf = getTransformAtTime(layer, currentTime);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [cutoutCanvas] = useState(() => document.createElement('canvas'));
  const cutoutEnabled = !!layer.paperCutout?.enabled;

  useEffect(() => {
    if (!layer.src) return;
    const i = new window.Image();
    i.src = layer.src;
    i.onload = () => setImg(i);
  }, [layer.src]);

  useEffect(() => {
    if (!img || !cutoutEnabled || !layer.paperCutout) return;
    drawPaperCutoutImage(
      cutoutCanvas,
      img,
      tf.width,
      tf.height,
      layer.paperCutout,
      layer.filters,
      !!layer.flipX,
      !!layer.flipY
    );
    imageRef.current?.getLayer()?.batchDraw();
  }, [img, cutoutEnabled, layer.paperCutout, layer.filters, layer.flipX, layer.flipY, tf.width, tf.height, cutoutCanvas]);

  useEffect(() => {
    if (!imageRef.current || !img) return;
    const node = imageRef.current;
    if (cutoutEnabled) {
      node.clearCache();
      node.filters([]);
      node.getLayer()?.batchDraw();
      return;
    }
    const f = layer.filters;
    const hasFilters =
      f.brightness !== 0 ||
      f.contrast !== 0 ||
      f.saturation !== 0 ||
      f.hue !== 0 ||
      f.blur > 0 ||
      f.grayscale ||
      f.sepia;

    if (!hasFilters) {
      node.clearCache();
      node.filters([]);
      node.getLayer()?.batchDraw();
      return;
    }

    const filters: Konva.Filter[] = [];
    if (f.brightness !== 0 || f.contrast !== 0) filters.push(Konva.Filters.Brighten, Konva.Filters.Contrast);
    if (f.blur > 0) filters.push(Konva.Filters.Blur);
    if (f.grayscale) filters.push(Konva.Filters.Grayscale);
    if (f.sepia) filters.push(Konva.Filters.Sepia);
    if (f.hue !== 0 || f.saturation !== 0) filters.push(Konva.Filters.HSL);
    node.filters(filters);
    node.brightness(f.brightness / 100);
    node.contrast(f.contrast);
    node.blurRadius(f.blur);
    node.hue(f.hue);
    node.saturation(1 + f.saturation / 100);
    const pad = layer.shadow?.enabled
      ? (layer.shadow.blur ?? 12) + Math.max(Math.abs(layer.shadow.offsetX ?? 0), Math.abs(layer.shadow.offsetY ?? 0)) + 16
      : 0;
    node.cache({ offset: pad });
    node.getLayer()?.batchDraw();
  }, [layer.filters, layer.shadow, cutoutEnabled, img, tf.width, tf.height]);

  if (!img) return null;

  const flipX = cutoutEnabled ? 1 : layer.flipX ? -1 : 1;
  const flipY = cutoutEnabled ? 1 : layer.flipY ? -1 : 1;
  const ax = layer.anchorX ?? 0.5;
  const ay = layer.anchorY ?? 0.5;
  const offX = !cutoutEnabled && layer.flipX ? tf.width * (1 - ax) : tf.width * ax;
  const offY = !cutoutEnabled && layer.flipY ? tf.height * (1 - ay) : tf.height * ay;

  return (
    <KImage
      ref={(n) => {
        (imageRef as React.MutableRefObject<Konva.Image | null>).current = n;
        nodeRef(n);
      }}
      image={cutoutEnabled ? cutoutCanvas : img}
      x={tf.x + tf.width * ax}
      y={tf.y + tf.height * ay}
      offsetX={offX}
      offsetY={offY}
      width={tf.width}
      height={tf.height}
      scaleX={flipX}
      scaleY={flipY}
      rotation={tf.rotation}
      opacity={tf.opacity}
      cornerRadius={cutoutEnabled ? 0 : layer.cornerRadius ?? 0}
      globalCompositeOperation={layer.blendMode || 'source-over'}
      {...getShadowProps(layer)}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMoveSnap}
      onDragEnd={(e) => {
        onDragEndSnap();
        onTransformEnd({
          x: Math.round(e.target.x() - tf.width * ax),
          y: Math.round(e.target.y() - tf.height * ay),
        });
      }}
      onTransformEnd={(e) => {
        const n = e.target;
        const newW = Math.max(10, Math.round(n.width() * Math.abs(n.scaleX())));
        const newH = Math.max(10, Math.round(n.height() * Math.abs(n.scaleY())));
        onTransformEnd({
          x: Math.round(n.x() - newW * ax),
          y: Math.round(n.y() - newH * ay),
          width: newW,
          height: newH,
          rotation: Math.round(n.rotation() * 10) / 10,
          scaleX: 1,
          scaleY: 1,
        });
        n.scaleX(flipX);
        n.scaleY(flipY);
      }}
    />
  );
}

// ─── Video Node ───────────────────────────────────────────────────────────────

function VideoNode({
  layer,
  nodeRef,
  onSelect,
  onDragMoveSnap,
  onDragEndSnap,
  onTransformEnd,
}: {
  layer: Layer;
  nodeRef: (n: Konva.Node | null) => void;
  onSelect: () => void;
  onDragMoveSnap: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEndSnap: () => void;
  onTransformEnd: (patch: Partial<Layer['transform']>) => void;
}) {
  const imageRef = useRef<Konva.Image>(null);
  const { currentTime, isPlaying } = useEditorStore();
  const tf = getTransformAtTime(layer, currentTime);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!layer.src) return;
    const vid = document.createElement('video');
    vid.src = layer.src;
    vid.muted = (layer.volume ?? 1) === 0;
    vid.volume = layer.volume ?? 1;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    vid.onloadeddata = () => setVideoEl(vid);
    return () => {
      vid.pause();
      vid.src = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.src]);

  // Sync video playback / seek with timeline
  useEffect(() => {
    if (!videoEl) return;
    const targetTime = Math.max(0, currentTime - layer.startTime + (layer.trimStart ?? 0));
    if (isPlaying) {
      if (Math.abs(videoEl.currentTime - targetTime) > 0.25) {
        videoEl.currentTime = targetTime;
      }
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    } else {
      if (!videoEl.paused) videoEl.pause();
      if (Math.abs(videoEl.currentTime - targetTime) > 0.03) {
        videoEl.currentTime = targetTime;
      }
    }
    imageRef.current?.getLayer()?.batchDraw();
  }, [videoEl, currentTime, isPlaying, layer.startTime, layer.trimStart]);

  useEffect(() => {
    if (!videoEl || !isPlaying) return;
    const anim = new Konva.Animation(() => {}, imageRef.current?.getLayer());
    anim.start();
    return () => {
      anim.stop();
    };
  }, [videoEl, isPlaying]);

  if (!videoEl) return null;

  const flipX = layer.flipX ? -1 : 1;
  const flipY = layer.flipY ? -1 : 1;
  const ax = layer.anchorX ?? 0.5;
  const ay = layer.anchorY ?? 0.5;
  const offX = layer.flipX ? tf.width * (1 - ax) : tf.width * ax;
  const offY = layer.flipY ? tf.height * (1 - ay) : tf.height * ay;

  return (
    <KImage
      ref={(n) => {
        (imageRef as React.MutableRefObject<Konva.Image | null>).current = n;
        nodeRef(n);
      }}
      image={videoEl}
      x={tf.x + tf.width * ax}
      y={tf.y + tf.height * ay}
      offsetX={offX}
      offsetY={offY}
      width={tf.width}
      height={tf.height}
      scaleX={flipX}
      scaleY={flipY}
      rotation={tf.rotation}
      opacity={tf.opacity}
      cornerRadius={layer.cornerRadius ?? 0}
      globalCompositeOperation={layer.blendMode || 'source-over'}
      {...getShadowProps(layer)}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMoveSnap}
      onDragEnd={(e) => {
        onDragEndSnap();
        onTransformEnd({
          x: Math.round(e.target.x() - tf.width * ax),
          y: Math.round(e.target.y() - tf.height * ay),
        });
      }}
      onTransformEnd={(e) => {
        const n = e.target;
        const newW = Math.max(10, Math.round(n.width() * Math.abs(n.scaleX())));
        const newH = Math.max(10, Math.round(n.height() * Math.abs(n.scaleY())));
        onTransformEnd({
          x: Math.round(n.x() - newW * ax),
          y: Math.round(n.y() - newH * ay),
          width: newW,
          height: newH,
          rotation: Math.round(n.rotation() * 10) / 10,
          scaleX: 1,
          scaleY: 1,
        });
        n.scaleX(flipX);
        n.scaleY(flipY);
      }}
    />
  );
}

// ─── Procedural Particle FX Node ──────────────────────────────────────────────

function FxNode({
  layer,
  nodeRef,
  onSelect,
}: {
  layer: Layer;
  nodeRef: (n: Konva.Node | null) => void;
  onSelect: () => void;
}) {
  const imageRef = useRef<Konva.Image>(null);
  const { currentTime } = useEditorStore();
  const tf = getTransformAtTime(layer, currentTime);
  const [canvas] = useState(() => document.createElement('canvas'));

  useEffect(() => {
    drawParticleFxToCanvas(
      canvas,
      layer.fxType || 'sparks',
      layer.fxColor || '#FF4655',
      Math.max(64, Math.round(tf.width)),
      Math.max(64, Math.round(tf.height)),
      currentTime
    );
    imageRef.current?.getLayer()?.batchDraw();
  }, [canvas, layer.fxType, layer.fxColor, tf.width, tf.height, currentTime]);

  return (
    <KImage
      ref={(n) => {
        (imageRef as React.MutableRefObject<Konva.Image | null>).current = n;
        nodeRef(n);
      }}
      image={canvas}
      x={tf.x}
      y={tf.y}
      width={tf.width}
      height={tf.height}
      opacity={tf.opacity}
      globalCompositeOperation={layer.blendMode || 'screen'}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

// ─── Text Node with inline editing ───────────────────────────────────────────

function TextNode({
  layer,
  nodeRef,
  onSelect,
  onDragMoveSnap,
  onDragEndSnap,
  onTransformEnd,
}: {
  layer: Layer;
  nodeRef: (n: Konva.Node | null) => void;
  onSelect: () => void;
  onDragMoveSnap: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEndSnap: () => void;
  onTransformEnd: (patch: Partial<Layer['transform']>) => void;
}) {
  const { currentTime, updateLayer } = useEditorStore();
  const tf = getTransformAtTime(layer, currentTime);
  const textRef = useRef<Konva.Text>(null);
  const paperImgRef = useRef<Konva.Image>(null);
  const [paperCanvas] = useState(() => document.createElement('canvas'));
  const isPaperStyle = layer.paperTextStyle === 'ransom' || layer.paperTextStyle === 'highlight';

  useEffect(() => {
    if (!isPaperStyle) return;
    drawPaperText(paperCanvas, layer, tf.width, tf.height, currentTime);
    paperImgRef.current?.getLayer()?.batchDraw();
  }, [isPaperStyle, paperCanvas, layer, tf.width, tf.height, currentTime]);

  const handleDblClick = () => {
    if (layer.locked) return;
    const node = (isPaperStyle ? paperImgRef.current : textRef.current) as Konva.Node | null;
    if (!node) return;
    const stage = node.getStage();
    if (!stage) return;

    node.hide();
    node.getLayer()?.batchDraw();

    const apos = node.getAbsolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    Object.assign(textarea.style, {
      position: 'fixed',
      top: `${stageBox.top + apos.y}px`,
      left: `${stageBox.left + apos.x}px`,
      width: `${Math.max(140, tf.width * scale)}px`,
      minHeight: `${Math.max(40, tf.height * scale)}px`,
      fontSize: `${(layer.fontSize || 48) * scale}px`,
      fontFamily: layer.fontFamily || 'Inter',
      fontWeight: layer.fontWeight || 'bold',
      textAlign: layer.textAlign || 'center',
      color: layer.color || '#ffffff',
      border: '2px solid #6366f1',
      padding: '2px 4px',
      margin: '0',
      overflow: 'hidden',
      background: 'rgba(15,15,34,0.9)',
      outline: 'none',
      resize: 'none',
      lineHeight: '1.2',
      borderRadius: '4px',
      zIndex: '9999',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      transform: `rotate(${tf.rotation}deg)`,
      transformOrigin: 'top left',
    });

    textarea.value = layer.text || '';
    textarea.focus();
    textarea.select();

    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    textarea.addEventListener('input', resize);
    resize();

    let finished = false;
    const finish = (save: boolean) => {
      if (finished) return;
      finished = true;
      if (save) updateLayer(layer.id, { text: textarea.value });
      if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
      node.show();
      node.getLayer()?.batchDraw();
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finish(true);
      }
    });
    textarea.addEventListener('blur', () => finish(true));
  };

  const ax = layer.anchorX ?? 0.5;
  const ay = layer.anchorY ?? 0.5;

  if (isPaperStyle) {
    return (
      <KImage
        ref={(n) => {
          (paperImgRef as React.MutableRefObject<Konva.Image | null>).current = n;
          nodeRef(n);
        }}
        image={paperCanvas}
        x={tf.x + tf.width * ax}
        y={tf.y + tf.height * ay}
        offsetX={tf.width * ax}
        offsetY={tf.height * ay}
        width={tf.width}
        height={tf.height}
        rotation={tf.rotation}
        opacity={tf.opacity}
        globalCompositeOperation={layer.blendMode || 'source-over'}
        {...getShadowProps(layer)}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragMove={onDragMoveSnap}
        onDragEnd={(e) => {
          onDragEndSnap();
          onTransformEnd({
            x: Math.round(e.target.x() - tf.width * ax),
            y: Math.round(e.target.y() - tf.height * ay),
          });
        }}
        onTransformEnd={(e) => {
          const n = e.target;
          const newW = Math.max(20, Math.round(n.width() * Math.abs(n.scaleX())));
          const newH = Math.max(20, Math.round(n.height() * Math.abs(n.scaleY())));
          onTransformEnd({
            x: Math.round(n.x() - newW * ax),
            y: Math.round(n.y() - newH * ay),
            width: newW,
            height: newH,
            rotation: Math.round(n.rotation() * 10) / 10,
            scaleX: 1,
            scaleY: 1,
          });
          n.scaleX(1);
          n.scaleY(1);
        }}
      />
    );
  }

  return (
    <Text
      ref={(n) => {
        (textRef as React.MutableRefObject<Konva.Text | null>).current = n;
        nodeRef(n);
      }}
      text={layer.text || 'Double-click to edit'}
      x={tf.x + tf.width * ax}
      y={tf.y + tf.height * ay}
      offsetX={tf.width * ax}
      offsetY={tf.height * ay}
      width={tf.width}
      height={tf.height}
      rotation={tf.rotation}
      opacity={tf.opacity}
      fontSize={layer.fontSize || 48}
      fontFamily={layer.fontFamily || 'Inter'}
      fontStyle={layer.fontWeight || 'bold'}
      align={layer.textAlign || 'center'}
      fill={layer.color || '#ffffff'}
      stroke={layer.textStrokeWidth ? layer.textStroke || '#000000' : undefined}
      strokeWidth={layer.textStrokeWidth || 0}
      globalCompositeOperation={layer.blendMode || 'source-over'}
      {...getShadowProps(layer)}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragMove={onDragMoveSnap}
      onDragEnd={(e) => {
        onDragEndSnap();
        onTransformEnd({
          x: Math.round(e.target.x() - tf.width * ax),
          y: Math.round(e.target.y() - tf.height * ay),
        });
      }}
      onTransformEnd={(e) => {
        const n = e.target;
        const newW = Math.max(20, Math.round(n.width() * Math.abs(n.scaleX())));
        const newH = Math.max(20, Math.round(n.height() * Math.abs(n.scaleY())));
        onTransformEnd({
          x: Math.round(n.x() - newW * ax),
          y: Math.round(n.y() - newH * ay),
          width: newW,
          height: newH,
          rotation: Math.round(n.rotation() * 10) / 10,
          scaleX: 1,
          scaleY: 1,
        });
        n.scaleX(1);
        n.scaleY(1);
      }}
    />
  );
}

// ─── Shape Node ───────────────────────────────────────────────────────────────

function ShapeNode({
  layer,
  nodeRef,
  onSelect,
  onDragMoveSnap,
  onDragEndSnap,
  onTransformEnd,
}: {
  layer: Layer;
  nodeRef: (n: Konva.Node | null) => void;
  onSelect: () => void;
  onDragMoveSnap: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEndSnap: () => void;
  onTransformEnd: (patch: Partial<Layer['transform']>) => void;
}) {
  const { currentTime } = useEditorStore();
  const tf = getTransformAtTime(layer, currentTime);
  const ax = layer.anchorX ?? 0.5;
  const ay = layer.anchorY ?? 0.5;
  const isEllipse = layer.shapeType === 'ellipse';

  const common = {
    x: tf.x + tf.width * ax,
    y: tf.y + tf.height * ay,
    offsetX: isEllipse ? (ax - 0.5) * tf.width : tf.width * ax,
    offsetY: isEllipse ? (ay - 0.5) * tf.height : tf.height * ay,
    rotation: tf.rotation,
    opacity: tf.opacity,
    fill: layer.fill || '#6366f1',
    stroke: layer.stroke || '#a5b4fc',
    strokeWidth: layer.strokeWidth ?? 2,
    globalCompositeOperation: layer.blendMode || 'source-over',
    ...getShadowProps(layer),
    draggable: !layer.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragMove: onDragMoveSnap,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEndSnap();
      onTransformEnd({
        x: Math.round(e.target.x() - tf.width * ax),
        y: Math.round(e.target.y() - tf.height * ay),
      });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const n = e.target;
      const newW = Math.max(10, Math.round(n.width() * Math.abs(n.scaleX())));
      const newH = Math.max(10, Math.round(n.height() * Math.abs(n.scaleY())));
      onTransformEnd({
        x: Math.round(n.x() - newW * ax),
        y: Math.round(n.y() - newH * ay),
        width: newW,
        height: newH,
        rotation: Math.round(n.rotation() * 10) / 10,
        scaleX: 1,
        scaleY: 1,
      });
      n.scaleX(1);
      n.scaleY(1);
    },
  };

  if (isEllipse) {
    return (
      <Ellipse
        ref={(n) => nodeRef(n)}
        {...common}
        width={tf.width}
        height={tf.height}
        radiusX={tf.width / 2}
        radiusY={tf.height / 2}
      />
    );
  }
  if (layer.shapeType === 'arrow') {
    return (
      <Arrow
        ref={(n) => nodeRef(n)}
        {...common}
        width={tf.width}
        height={tf.height}
        points={[0, tf.height / 2, tf.width, tf.height / 2]}
        pointerLength={16}
        pointerWidth={14}
      />
    );
  }
  return (
    <Rect
      ref={(n) => nodeRef(n)}
      {...common}
      width={tf.width}
      height={tf.height}
      cornerRadius={layer.cornerRadius ?? 6}
    />
  );
}

// ─── Paper Backdrop Node ──────────────────────────────────────────────────────

function PaperBackdropNode({ backdropId, width, height, onDeselect }: {
  backdropId: string;
  width: number;
  height: number;
  onDeselect: () => void;
}) {
  const imgRef = useRef<Konva.Image>(null);
  const [canvas] = useState(() => document.createElement('canvas'));

  useEffect(() => {
    drawPaperBackdrop(canvas, backdropId, width, height);
    imgRef.current?.getLayer()?.batchDraw();
  }, [canvas, backdropId, width, height]);

  return (
    <KImage
      ref={imgRef}
      name="bg-rect"
      image={canvas}
      x={0}
      y={0}
      width={width}
      height={height}
      onClick={onDeselect}
      onTap={onDeselect}
    />
  );
}

// ─── Main 2D Canvas Editor ────────────────────────────────────────────────────

export function CanvasEditor() {
  const {
    project,
    selectedLayerId,
    currentTime,
    canvasZoom,
    snapToGrid,
    selectLayer,
    updateTransform,
    setCanvasZoom,
  } = useEditorStore();
  const { settings, layers } = project;
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeMap = useRef<Map<string, Konva.Node>>(new Map());
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });
  const [isDragOver, setIsDragOver] = useState(false);

  const visibleLayers = layers
    .filter((l) => l.visible && currentTime >= l.startTime && currentTime <= l.startTime + l.duration)
    .sort((a, b) => a.zIndex - b.zIndex);

  const fitCanvas = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 48;
    const availW = Math.max(200, el.clientWidth - pad);
    const availH = Math.max(200, el.clientHeight - pad);
    const z = Math.min(availW / settings.width, availH / settings.height, 1.5);
    setCanvasZoom(Math.max(0.15, Math.round(z * 100) / 100));
  }, [settings.width, settings.height, setCanvasZoom]);

  useEffect(() => {
    fitCanvas();
    const onFit = () => fitCanvas();
    window.addEventListener('videoreels:fit-canvas', onFit);
    return () => window.removeEventListener('videoreels:fit-canvas', onFit);
  }, [fitCanvas]);

  useEffect(() => {
    if (!transformerRef.current) return;
    const isVisible = visibleLayers.some((l) => l.id === selectedLayerId);
    const node = selectedLayerId && isVisible ? nodeMap.current.get(selectedLayerId) ?? null : null;
    transformerRef.current.nodes(node ? [node] : []);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedLayerId, visibleLayers.length, currentTime]);

  const handleDragMoveSnap = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!snapToGrid) return;
      const node = e.target;
      const box = node.getClientRect({ skipTransform: false });
      const stage = node.getStage();
      if (!stage) return;
      const scale = stage.scaleX();
      const nodeW = box.width / scale;
      const nodeH = box.height / scale;

      const cx = node.x() + nodeW / 2;
      const cy = node.y() + nodeH / 2;
      const targetCx = settings.width / 2;
      const targetCy = settings.height / 2;
      const threshold = 10;

      let vGuide: number | null = null;
      let hGuide: number | null = null;

      if (Math.abs(cx - targetCx) < threshold) {
        node.x(targetCx - nodeW / 2);
        vGuide = targetCx;
      }
      if (Math.abs(cy - targetCy) < threshold) {
        node.y(targetCy - nodeH / 2);
        hGuide = targetCy;
      }
      setGuides({ v: vGuide, h: hGuide });
    },
    [snapToGrid, settings.width, settings.height]
  );

  const handleDragEndSnap = useCallback(() => {
    setGuides({ v: null, h: null });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const { addLayer } = useEditorStore.getState();
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (file.type.startsWith('video/')) {
          const url = URL.createObjectURL(file);
          const vid = document.createElement('video');
          vid.preload = 'metadata';
          vid.onloadedmetadata = () => {
            addLayer(
              makeVideoLayer(
                url,
                file.name.replace(/\.[^.]+$/, ''),
                vid.videoWidth || settings.width,
                vid.videoHeight || settings.height,
                vid.duration || 5,
                settings.width,
                settings.height,
                Math.round(currentTime * 10) / 10
              )
            );
          };
          vid.src = url;
          return;
        }
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target!.result as string;
          const img = new window.Image();
          img.onload = () => {
            addLayer(
              makeImageLayer(
                src,
                file.name.replace(/\.[^.]+$/, ''),
                img.naturalWidth,
                img.naturalHeight,
                settings.width,
                settings.height,
                Math.round(currentTime * 10) / 10
              )
            );
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      });
    },
    [settings.width, settings.height, currentTime]
  );

  const w = Math.round(settings.width * canvasZoom);
  const h = Math.round(settings.height * canvasZoom);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex items-center justify-center bg-[#090914] overflow-auto relative transition-colors ${
        isDragOver ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-950/20' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
    >
      <div
        className="shadow-2xl ring-1 ring-white/15"
        style={{
          width: w,
          height: h,
          position: 'relative',
          flexShrink: 0,
          backgroundImage:
            settings.backgroundColor === 'transparent'
              ? 'linear-gradient(45deg, #1b1b2f 25%, transparent 25%), linear-gradient(-45deg, #1b1b2f 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1b2f 75%), linear-gradient(-45deg, transparent 75%, #1b1b2f 75%)'
              : undefined,
          backgroundSize: settings.backgroundColor === 'transparent' ? '20px 20px' : undefined,
          backgroundPosition:
            settings.backgroundColor === 'transparent' ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
          backgroundColor: settings.backgroundColor === 'transparent' ? '#121222' : undefined,
        }}
      >
        <Stage
          width={w}
          height={h}
          scaleX={canvasZoom}
          scaleY={canvasZoom}
          onClick={(e) => {
            if (e.target === e.target.getStage() || e.target.name() === 'bg-rect') {
              selectLayer(null);
            }
          }}
        >
          <KonvaLayer>
            {isPaperBackdrop(settings.backgroundColor) ? (
              <PaperBackdropNode
                backdropId={settings.backgroundColor}
                width={settings.width}
                height={settings.height}
                onDeselect={() => selectLayer(null)}
              />
            ) : (
              <Rect
                name="bg-rect"
                width={settings.width}
                height={settings.height}
                fill={settings.backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : settings.backgroundColor}
              />
            )}
          </KonvaLayer>

          <KonvaLayer>
            {visibleLayers.map((layer) => {
              const onSelect = () => selectLayer(layer.id);
              const onTransformEnd = (patch: Partial<Layer['transform']>) => updateTransform(layer.id, patch);
              const nodeRef = (n: Konva.Node | null) => {
                if (n) nodeMap.current.set(layer.id, n);
                else nodeMap.current.delete(layer.id);
              };
              const props = {
                key: layer.id,
                layer,
                nodeRef,
                onSelect,
                onDragMoveSnap: handleDragMoveSnap,
                onDragEndSnap: handleDragEndSnap,
                onTransformEnd,
              };

              if (layer.type === 'fx') return <FxNode key={layer.id} layer={layer} nodeRef={nodeRef} onSelect={onSelect} />;
              if (layer.type === 'video') return <VideoNode {...props} />;
              if (layer.type === 'image') return <ImageNode {...props} />;
              if (layer.type === 'text') return <TextNode {...props} />;
              if (layer.type === 'shape') return <ShapeNode {...props} />;
              return null;
            })}

            {guides.v !== null && (
              <Line
                points={[guides.v, 0, guides.v, settings.height]}
                stroke="#818cf8"
                strokeWidth={1.5 / canvasZoom}
                dash={[6, 4]}
                listening={false}
              />
            )}
            {guides.h !== null && (
              <Line
                points={[0, guides.h, settings.width, guides.h]}
                stroke="#818cf8"
                strokeWidth={1.5 / canvasZoom}
                dash={[6, 4]}
                listening={false}
              />
            )}

            <Transformer
              ref={transformerRef}
              keepRatio={false}
              enabledAnchors={[
                'top-left',
                'top-center',
                'top-right',
                'middle-left',
                'middle-right',
                'bottom-left',
                'bottom-center',
                'bottom-right',
              ]}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
              anchorStroke="#6366f1"
              borderStroke="#6366f1"
              anchorFill="#ffffff"
              anchorSize={9}
              anchorCornerRadius={2}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            />

            {/* Visible Anchor / Pivot Point Target for Selected Layer */}
            {(() => {
              const sel = visibleLayers.find((l) => l.id === selectedLayerId);
              if (!sel) return null;
              const tf = getTransformAtTime(sel, currentTime);
              const px = tf.x + tf.width * (sel.anchorX ?? 0.5);
              const py = tf.y + tf.height * (sel.anchorY ?? 0.5);
              const r = 7 / canvasZoom;
              return (
                <Group listening={false}>
                  <Circle
                    x={px}
                    y={py}
                    radius={r}
                    stroke="#facc15"
                    strokeWidth={2 / canvasZoom}
                    fill="rgba(250,204,21,0.25)"
                    listening={false}
                  />
                  <Circle x={px} y={py} radius={2 / canvasZoom} fill="#facc15" listening={false} />
                </Group>
              );
            })()}
          </KonvaLayer>
        </Stage>

        {layers.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 pointer-events-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-white/35" />
              </div>
              <p className="text-white/55 text-sm font-medium">Drop images or videos here, or pick a Quick Template</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pointer-events-auto max-w-md">
              {STARTER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => useEditorStore.getState().setProject(tpl.build())}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#13132b]/90 hover:bg-[#1a1a3a] border border-white/15 hover:border-white/30 text-left transition-all cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: tpl.accent }} />
                  <div>
                    <div className="text-xs font-semibold text-white">{tpl.name}</div>
                    <div className="text-[10px] text-white/45">{tpl.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
