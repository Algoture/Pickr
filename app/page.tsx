"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    ImageUploadIcon,
    Copy01Icon,
    Tick01Icon,
    ColorsIcon,
    Time02Icon,
    Delete02Icon,
    MouseIcon,
    Settings02Icon,
    Download02Icon,
    RefreshIcon
} from '@hugeicons/core-free-icons';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface ColorData {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
    cmyk: string;
}

export default function ProfessionalColorSuite() {
    const [image, setImage] = useState<string | null>(null);
    const [colorData, setColorData] = useState<ColorData>({
        hex: '#6366f1',
        rgb: { r: 99, g: 102, b: 241 },
        hsl: { h: 239, s: 84, l: 67 },
        cmyk: '60, 58, 0, 5'
    });
    const [palette, setPalette] = useState<string[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, show: false });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const toolRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                // Check if the pasted item is an image
                if (item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            setImage(event.target?.result as string);
                        };
                        reader.readAsDataURL(blob);
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && image) {
                setImage(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [image]);

    // --- Color Math ---
    const calculateColorDetails = (r: number, g: number, b: number): ColorData => {
        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

        let r_ = r / 255, g_ = g / 255, b_ = b / 255;
        let max = Math.max(r_, g_, b_), min = Math.min(r_, g_, b_);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r_) h = (g_ - b_) / d + (g_ < b_ ? 6 : 0);
            else if (max === g_) h = (b_ - r_) / d + 2;
            else h = (r_ - g_) / d + 4;
            h /= 6;
        }

        let k = 1 - Math.max(r_, g_, b_);
        let c = (1 - r_ - k) / (1 - k) || 0;
        let m = (1 - g_ - k) / (1 - k) || 0;
        let y = (1 - b_ - k) / (1 - k) || 0;

        return {
            hex,
            rgb: { r, g, b },
            hsl: { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) },
            cmyk: `${Math.round(c * 100)}, ${Math.round(m * 100)}, ${Math.round(y * 100)}, ${Math.round(k * 100)}`
        };
    };

    // --- Manual Adjustment ---
    const updateFromHSL = (h: number, s: number, l: number) => {
        const s_ = s / 100;
        const l_ = l / 100;
        const a = s_ * Math.min(l_, 1 - l_);
        const f = (n: number, k = (n + h / 30) % 12) => l_ - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        const r = Math.round(f(0) * 255);
        const g = Math.round(f(8) * 255);
        const b = Math.round(f(4) * 255);
        setColorData(calculateColorDetails(r, g, b));
    };

    // --- Contrast Ratio ---
    const contrast = useMemo(() => {
        const getL = (c: number) => {
            let s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        const { r, g, b } = colorData.rgb;
        const L = 0.2126 * getL(r) + 0.7152 * getL(g) + 0.0722 * getL(b);
        return {
            ratio: ((L + 0.05) / (0.05)).toFixed(2), // Against black
            onWhite: ((1.05) / (L + 0.05)).toFixed(2), // Against white
            isDark: L < 0.5
        };
    }, [colorData]);

    // --- Interactions ---
    const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
        const img = imageRef.current;
        const magCanvas = magnifierCanvasRef.current;
        if (!img || !magCanvas) return;

        const rect = img.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
        const y = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;

        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, show: true });

        const magCtx = magCanvas.getContext('2d');
        if (magCtx) {
            magCtx.imageSmoothingEnabled = false;
            magCtx.clearRect(0, 0, 140, 140);
            magCtx.drawImage(img, x - 7, y - 7, 14, 14, 0, 0, 140, 140);
            magCtx.strokeStyle = 'rgba(255,255,255,0.8)';
            magCtx.strokeRect(65, 65, 10, 10);
        }
    };

    const pickColor = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;
        const rect = img.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
        const y = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const data = ctx.getImageData(x, y, 1, 1).data;
        const result = calculateColorDetails(data[0], data[1], data[2]);
        setColorData(result);
        if (!history.includes(result.hex)) setHistory(prev => [result.hex, ...prev].slice(0, 12));
    };

    const extractPalette = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const points = [[0.2, 0.2], [0.5, 0.2], [0.8, 0.5], [0.3, 0.8], [0.7, 0.7]];
        const p = points.map(([px, py]) => {
            const d = ctx.getImageData(canvas.width * px, canvas.height * py, 1, 1).data;
            return calculateColorDetails(d[0], d[1], d[2]).hex;
        });
        setPalette(p);
    }, []);

    const scrollToTool = () => toolRef.current?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            {/* --- SECTION 1: HERO LANDING --- */}
            <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#e0e7ff_0%,rgba(255,255,255,0)_50%)]" />
                <div className="relative z-10 text-center px-6 max-w-4xl">
                    <h1 className="text-6xl font-geist md:text-8xl font-black tracking-tighter mb-6 bg-linear-to-b from-slate-900 to-slate-500 bg-clip-text text-transparent leading-none">
                        Design with <br /> Perfect Precision.
                    </h1>
                    <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Transform any image into a production-ready color palette. Analyze contrast, adjust values, and export directly to your codebase.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <Button onClick={scrollToTool} size="lg" className="rounded-full h-14 px-10 bg-primary text-lg shadow-xl shadow-indigo-200">
                            Start Analyzing
                        </Button>
                        <Button variant="ghost" size="lg" className="rounded-full h-14 px-8 text-slate-500 gap-2">
                            <HugeiconsIcon icon={MouseIcon} size={20} /> Scroll to explore
                        </Button>
                    </div>
                </div>
            </section>

            {/* --- SECTION 2: THE ADVANCED TOOL --- */}
            <section ref={toolRef} className="py-24 px-6 lg:px-12">
                <div className="max-w-350 mx-auto">
                    {!image ? (
                        <div className="group relative h-150 border-2 border-dashed border-slate-200 rounded-[4rem] bg-white flex flex-col items-center justify-center transition-all hover:border-primary hover:shadow-2xl hover:shadow-accent/20 cursor-pointer p-10">
                            <input type="file" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const r = new FileReader();
                                    r.onload = (f) => setImage(f.target?.result as string);
                                    r.readAsDataURL(file);
                                }
                            }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                <HugeiconsIcon icon={ImageUploadIcon} size={40} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800">Drop your masterpiece</h2>
                            <p className="text-slate-400 mt-3 text-lg">
                                Drag & drop, browse, or <span className="text-primary font-semibold underline underline-offset-4">paste your image</span>
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Left: Interactive Canvas */}
                            <div className="lg:col-span-7 space-y-8">
                                    <div className="flex justify-between items-center mb-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="px-3 py-1 bg-primary text-accent rounded-full text-xs font-bold uppercase tracking-widest">
                                                Active Session
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => setImage(null)}
                                            variant="ghost"
                                            className="rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 gap-2 transition-all"
                                        >
                                            <HugeiconsIcon icon={RefreshIcon} size={18} />
                                            <span>Restart Project</span>
                                        </Button>
                                    </div>
                                <div className="relative bg-white p-4 rounded-[3.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100">
                                    <div
                                        className="relative rounded-[2.5rem] overflow-hidden bg-slate-100 cursor-none group"
                                        onMouseEnter={() => setCursorPos(p => ({ ...p, show: true }))}
                                        onMouseLeave={() => setCursorPos(p => ({ ...p, show: false }))}
                                    >
                                        <img ref={imageRef} src={image} alt="Source" className="w-full h-auto block" onLoad={extractPalette} onMouseMove={handleMouseMove} onClick={pickColor} />
                                        <canvas ref={canvasRef} className="hidden" />

                                        {/* Precision Loupe */}
                                        {cursorPos.show && (
                                            <div
                                                className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
                                                style={{ left: cursorPos.x + imageRef.current!.getBoundingClientRect().left, top: cursorPos.y + imageRef.current!.getBoundingClientRect().top }}
                                            >
                                                <div className="relative">
                                                    <canvas ref={magnifierCanvasRef} width={140} height={140} className="rounded-full border-4 border-white shadow-2xl bg-white" />
                                                    <div className="absolute inset-0 rounded-full border border-black/10 ring-1 ring-white/50" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Palette Generation */}
                                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center gap-6">
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><HugeiconsIcon icon={ColorsIcon} /></div>
                                    <div className="flex gap-4 flex-1">
                                        {palette.map((hex, i) => (
                                            <button key={i} onClick={() => {
                                                const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
                                                setColorData(calculateColorDetails(r, g, b));
                                            }} className="h-16 flex-1 rounded-2xl border border-black/5 hover:scale-110 transition-all shadow-sm" style={{ backgroundColor: hex }} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Engineering Console */}
                            <div className="lg:col-span-5 space-y-8">
                                <div className="bg-white p-10  rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                                    <Tabs defaultValue="adjust">
                                        <TabsList className="grid w-full grid-cols-2 mb-10 bg-slate-50 rounded-2xl ">
                                            <TabsTrigger value="adjust" className="rounded-xl data-[state=active]:shadow-md">
                                                <HugeiconsIcon icon={Settings02Icon} size={18} className="mr-2 " /> Adjuster
                                            </TabsTrigger>
                                            <TabsTrigger value="export" className="rounded-xl data-[state=active]:shadow-md">
                                                <HugeiconsIcon icon={Download02Icon} size={18} className="mr-2" /> Export
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="adjust" className="space-y-8 ">
                                            {/* Live Preview Area */}
                                            <div className="flex items-center gap-8 mb-4">
                                                <div className="size-10 rounded-full shadow-inner border border-black/5" style={{ backgroundColor: colorData.hex }} />
                                                <div className="flex-1">
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-primary block mb-1">Active Selection</span>
                                                    <h3 className="text-5xl font-black text-slate-800 uppercase tracking-tighter">{colorData.hex}</h3>
                                                </div>
                                            </div>

                                            {/* Manual Sliders (True Color Picker) */}
                                            <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Hue</span><span>{colorData.hsl.h}°</span></div>
                                                    <input type="range" min="0" max="360" value={colorData.hsl.h} onChange={(e) => updateFromHSL(Number(e.target.value), colorData.hsl.s, colorData.hsl.l)} className="w-full h-2 bg-linear-to-r from-red-500 via-green-500 to-red-500 rounded-full appearance-none cursor-pointer" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Saturation</span><span>{colorData.hsl.s}%</span></div>
                                                    <input type="range" min="0" max="100" value={colorData.hsl.s} onChange={(e) => updateFromHSL(colorData.hsl.h, Number(e.target.value), colorData.hsl.l)} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Lightness</span><span>{colorData.hsl.l}%</span></div>
                                                    <input type="range" min="0" max="100" value={colorData.hsl.l} onChange={(e) => updateFromHSL(colorData.hsl.h, colorData.hsl.s, Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer" />
                                                </div>
                                            </div>

                                            {/* Accessibility Lab */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className={cn("p-6 rounded-3xl border transition-all", contrast.isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900 border-slate-100")}>
                                                    <span className="text-[10px] font-bold opacity-60 uppercase block mb-3">Contrast vs Black</span>
                                                    <div className="text-3xl font-black">{contrast.ratio}:1</div>
                                                    <div className="text-[10px] mt-2 font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 inline-block">WCAG Pass</div>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-white border border-slate-100 text-slate-900">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Contrast vs White</span>
                                                    <div className="text-3xl font-black">{contrast.onWhite}:1</div>
                                                    <div className="text-[10px] mt-2 font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 inline-block">Large Text Only</div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="export" className="space-y-4">
                                            <ExportCard label="Tailwind Config" value={`'brand': '${colorData.hex}',`} />
                                            <ExportCard label="CSS Variable" value={`--color-primary: ${colorData.hex};`} />
                                            <ExportCard label="SwiftUI Color" value={`Color(hex: "${colorData.hex}")`} />
                                            <Button variant="outline" onClick={() => setImage(null)} className="w-full h-14 rounded-2xl gap-2 mt-4 text-red-500 border-red-100 hover:bg-red-50">
                                                <HugeiconsIcon icon={Delete02Icon} size={18} /> Reset Project
                                            </Button>
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                {/* Quick History History */}
                                <div className="bg-white p-8 rounded-[3rem] border border-slate-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-xs font-black text-slate-400 flex items-center gap-2"><HugeiconsIcon icon={Time02Icon} size={16} /> SESSION HISTORY</span>
                                    </div>
                                    <div className="grid grid-cols-6 gap-3">
                                        {history.map((h, i) => (
                                            <button key={i} onClick={() => {
                                                const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
                                                setColorData(calculateColorDetails(r, g, b));
                                            }} className="aspect-square rounded-xl hover:scale-110 transition-all border border-black/5 shadow-sm" style={{ backgroundColor: h }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function ExportCard({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-accent hover:bg-accent transition-all">
            <div className="overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
                <code className="text-sm font-mono text-slate-600 block truncate">{value}</code>
            </div>
            <button onClick={copy} className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", copied ? "bg-green-500 text-white" : "bg-white text-slate-400 shadow-sm border border-slate-200")}>
                {copied ? <HugeiconsIcon icon={Tick01Icon} size={18} /> : <HugeiconsIcon icon={Copy01Icon} size={18} />}
            </button>
        </div>
    );
}