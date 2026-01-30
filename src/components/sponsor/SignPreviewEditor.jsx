import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import { Download, RotateCw, ZoomIn, ZoomOut, Type, Move, Trash2 } from 'lucide-react';

// Helper to load images
const useImage = (url) => {
    const [image, setImage] = useState(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!url) {
            setImage(null);
            setStatus('idle');
            return;
        }

        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            setImage(img);
            setStatus('loaded');
        };

        img.onerror = () => {
            setStatus('error');
        };

        img.src = url;
    }, [url]);

    return [image, status];
};

// Draggable/Resizable Logo Component
const DraggableLogo = ({ imageUrl, isSelected, onSelect, onChange, stageWidth, stageHeight }) => {
    const shapeRef = useRef();
    const trRef = useRef();
    const [logoImage, status] = useImage(imageUrl);

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    if (status !== 'loaded' || !logoImage) return null;

    // Calculate initial size (fit within placement zone, max 200px)
    const maxWidth = Math.min(stageWidth * 0.4, 200);
    const scale = maxWidth / logoImage.width;
    const initialWidth = logoImage.width * scale;
    const initialHeight = logoImage.height * scale;

    return (
        <>
            <KonvaImage
                ref={shapeRef}
                image={logoImage}
                x={stageWidth / 2 - initialWidth / 2}
                y={stageHeight * 0.6}
                width={initialWidth}
                height={initialHeight}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e) => {
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    const node = shapeRef.current;
                    onChange({
                        x: node.x(),
                        y: node.y(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                        rotation: node.rotation(),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        // Limit resize
                        if (newBox.width < 20 || newBox.height < 20) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

// Draggable Text Component
const DraggableText = ({ text, isSelected, onSelect, onChange, id }) => {
    const textRef = useRef();
    const trRef = useRef();

    useEffect(() => {
        if (isSelected && trRef.current && textRef.current) {
            trRef.current.nodes([textRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Text
                ref={textRef}
                id={id}
                text={text.content}
                x={text.x}
                y={text.y}
                fontSize={text.fontSize || 24}
                fontFamily="Arial"
                fontStyle="bold"
                fill={text.fill || '#ffffff'}
                stroke={text.stroke || '#000000'}
                strokeWidth={1}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e) => {
                    onChange({
                        ...text,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    const node = textRef.current;
                    onChange({
                        ...text,
                        x: node.x(),
                        y: node.y(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    enabledAnchors={['middle-left', 'middle-right']}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10) return oldBox;
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

export default function SignPreviewEditor({
    backgroundImageUrl,
    logoUrl,
    companyName = '',
    onSave,
    placementZone = { x: 10, y: 60, width: 80, height: 30 }
}) {
    const stageRef = useRef();
    const containerRef = useRef();

    const [containerWidth, setContainerWidth] = useState(600);
    const [bgImage, bgStatus] = useImage(backgroundImageUrl);

    const [selectedId, setSelectedId] = useState(null);
    const [logoProps, setLogoProps] = useState({ x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0 });
    const [texts, setTexts] = useState([]);
    const [newTextInput, setNewTextInput] = useState('');

    // Responsive container
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Calculate stage dimensions based on background image
    const stageWidth = containerWidth;
    const stageHeight = bgImage ? (containerWidth / bgImage.width) * bgImage.height : 400;

    const handleExport = () => {
        if (!stageRef.current) return;

        // Deselect before export
        setSelectedId(null);

        setTimeout(() => {
            const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = 'sign-preview.png';
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, 100);
    };

    const addText = () => {
        if (!newTextInput.trim()) return;
        setTexts([...texts, {
            id: `text-${Date.now()}`,
            content: newTextInput,
            x: stageWidth / 2 - 50,
            y: stageHeight * 0.8,
            fontSize: 20,
            fill: '#ffffff',
            stroke: '#000000'
        }]);
        setNewTextInput('');
    };

    const updateText = (id, newProps) => {
        setTexts(texts.map(t => t.id === id ? { ...t, ...newProps } : t));
    };

    const removeText = (id) => {
        setTexts(texts.filter(t => t.id !== id));
        setSelectedId(null);
    };

    const handleStageClick = (e) => {
        // Clicked on empty area - deselect
        if (e.target === e.target.getStage()) {
            setSelectedId(null);
        }
    };

    if (!backgroundImageUrl) {
        return (
            <div className="bg-gray-100 rounded-2xl p-8 text-center text-gray-500">
                <Move className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-bold">No Sign Preview Available</p>
                <p className="text-sm">The organizer hasn't uploaded a sign location image yet.</p>
            </div>
        );
    }

    if (bgStatus === 'loading') {
        return (
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-500 mt-2">Loading preview...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Type className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Add text (e.g., company name, phone)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newTextInput}
                        onChange={(e) => setNewTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addText()}
                    />
                    <button
                        onClick={addText}
                        className="px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition"
                    >
                        Add
                    </button>
                </div>

                {selectedId && selectedId.startsWith('text-') && (
                    <button
                        onClick={() => removeText(selectedId)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition"
                    >
                        <Trash2 className="w-4 h-4" /> Remove Text
                    </button>
                )}

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition ml-auto"
                >
                    <Download className="w-4 h-4" /> Download Preview
                </button>
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden border-4 border-gray-200 shadow-lg bg-gray-100"
            >
                <Stage
                    ref={stageRef}
                    width={stageWidth}
                    height={stageHeight}
                    onClick={handleStageClick}
                    onTap={handleStageClick}
                >
                    <Layer>
                        {/* Background Image */}
                        {bgImage && (
                            <KonvaImage
                                image={bgImage}
                                width={stageWidth}
                                height={stageHeight}
                            />
                        )}

                        {/* Placement Zone Hint (subtle) */}
                        <Rect
                            x={(placementZone.x / 100) * stageWidth}
                            y={(placementZone.y / 100) * stageHeight}
                            width={(placementZone.width / 100) * stageWidth}
                            height={(placementZone.height / 100) * stageHeight}
                            stroke="#ffffff"
                            strokeWidth={2}
                            dash={[10, 5]}
                            opacity={0.3}
                        />

                        {/* Sponsor Logo */}
                        {logoUrl && (
                            <DraggableLogo
                                imageUrl={logoUrl}
                                isSelected={selectedId === 'logo'}
                                onSelect={() => setSelectedId('logo')}
                                onChange={(newProps) => setLogoProps({ ...logoProps, ...newProps })}
                                stageWidth={stageWidth}
                                stageHeight={stageHeight}
                            />
                        )}

                        {/* Text Overlays */}
                        {texts.map((text) => (
                            <DraggableText
                                key={text.id}
                                id={text.id}
                                text={text}
                                isSelected={selectedId === text.id}
                                onSelect={() => setSelectedId(text.id)}
                                onChange={(newProps) => updateText(text.id, newProps)}
                            />
                        ))}
                    </Layer>
                </Stage>

                {/* Instructions overlay */}
                {!logoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="text-center text-white p-6">
                            <Move className="w-12 h-12 mx-auto mb-3 opacity-80" />
                            <p className="font-bold text-lg">Upload Your Logo First</p>
                            <p className="text-sm opacity-80">Your logo will appear here for positioning</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Helper text */}
            <p className="text-xs text-gray-500 text-center">
                Drag your logo to position it. Add text for additional details. Click "Download Preview" to save your mockup.
            </p>
        </div>
    );
}
