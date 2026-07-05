"use client";
import { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";

interface Scene {
  id: number;
  time: string;
  text: string;
  startTime?: string;
  endTime?: string;
}

const getWords = (text: string) => {
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      return Array.from(segmenter.segment(text)).map(s => s.segment);
    }
  } catch(e) {}
  return text.split(/(?=\s)|(?<=\s)/); 
};

const PresetColors = ({ onSelect }: { onSelect: (c: string) => void }) => (
  <div className="flex gap-2 ml-auto">
    {["#FF0000", "#FFD700", "#00FF00", "#0000FF", "#FFFFFF", "#000000"].map(c => (
      <button key={c} onClick={() => onSelect(c)} className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-gray-500 hover:scale-110 shadow-sm" style={{ backgroundColor: c }} />
    ))}
  </div>
);

const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
  <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-3">
    <span className="text-sm md:text-base font-bold text-gray-300">{label}</span>
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 md:w-12 md:h-7 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-600'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 md:w-5 md:h-5 rounded-full transition-transform ${checked ? 'transform translate-x-4 md:translate-x-5' : ''}`}></div>
      </div>
    </label>
  </div>
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    let frameId: number;
    const updateTimeSmoothly = () => {
      if (videoRef.current && !videoRef.current.paused) setCurrentTime(videoRef.current.currentTime);
      frameId = requestAnimationFrame(updateTimeSmoothly);
    };
    frameId = requestAnimationFrame(updateTimeSmoothly);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [sourceScenes, setSourceScenes] = useState<Scene[]>([]); 
  const [autoScenes, setAutoScenes] = useState<Scene[]>([]); 
  
  const [statusMessage, setStatusMessage] = useState("รออัปโหลดวิดีโอ...");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const [savedHooks, setSavedHooks] = useState<any[]>([]); 
  const [selectedHookId, setSelectedHookId] = useState<number | null>(null); 
  const [activeMode, setActiveMode] = useState<"hook" | "basic" | "highlight">("hook");
  const [showGreenScreen, setShowGreenScreen] = useState(false);
  const [exportQuality, setExportQuality] = useState("original");

  const [hookStyle, setHookStyle] = useState({
    fontFamily: "'Kanit', sans-serif", fontSize: 60, fontWeight: "900", textColor: "#FFD700", letterSpacing: 0,
    animationType: "popIn", karaokeEffect: "colorWipe",
    hasStroke: true, strokeColor: "#FF0000", strokeWidth: 4,
    hasShadow: false, shadowColor: "#000000", shadowOffset: 4, shadowBlur: 4,
    hasBackground: false, bgColor: "#000000", bgOpacity: 0.8, bgPaddingX: 15, bgPaddingY: 5, bgRadius: 10
  });

  const [basicStyle, setBasicStyle] = useState({
    fontFamily: "'Kanit', sans-serif", fontSize: 50, fontWeight: "900", textColor: "#FFFFFF", letterSpacing: 0,
    animationType: "bounce", karaokeEffect: "colorWipe",
    hasStroke: true, strokeColor: "#000000", strokeWidth: 4,
    hasShadow: false, shadowColor: "#000000", shadowOffset: 3, shadowBlur: 5,
    hasBackground: false, bgColor: "#000000", bgOpacity: 0.8, bgPaddingX: 15, bgPaddingY: 5, bgRadius: 10
  });

  const [highlightStyle, setHighlightStyle] = useState({ 
    ...basicStyle, fontSize: 60, textColor: "#FFD700", hasStroke: true, strokeColor: "#000000", strokeWidth: 5,
    animationType: "none", karaokeEffect: "scaleWord" 
  });
  
  const [globalSubPosition, setGlobalSubPosition] = useState({ x: 0, y: 380 });

  const updateStyle = (key: string, value: any) => {
    if (activeMode === 'hook') {
      setHookStyle(prev => ({ ...prev, [key]: value }));
      if (selectedHookId !== null) setSavedHooks(hooks => hooks.map(h => h.id === selectedHookId ? { ...h, style: { ...h.style, [key]: value } } : h));
    } else if (activeMode === 'basic') {
      setBasicStyle(prev => ({ ...prev, [key]: value }));
    } else if (activeMode === 'highlight') {
      setHighlightStyle(prev => ({ ...prev, [key]: value }));
    }
  };

  const currentStyle = activeMode === 'hook' ? (selectedHookId ? savedHooks.find(h => h.id === selectedHookId)?.style || hookStyle : hookStyle) : activeMode === 'basic' ? basicStyle : highlightStyle;

  const jumpToTime = (startTime?: string) => {
    if (!videoRef.current || !startTime) return;
    const time = Number(startTime);
    if (!isNaN(time)) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const selectHook = (hook: any) => {
    setSelectedHookId(hook.id);
    setHookStyle(hook.style);
    jumpToTime(hook.startTime);
  };

  const parseTime = (timeStr: string) => {
    try {
      const [startStr, endStr] = timeStr.split('-').map(s => s.trim());
      const toSeconds = (t: string) => { const parts = t.split(':'); return parseInt(parts[0]) * 60 + parseFloat(parts[1]); };
      return { start: toSeconds(startStr).toString(), end: toSeconds(endStr).toString() };
    } catch { return { start: "0", end: "3" }; }
  };

  const extractHookFromScene = (scene: any) => {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText) {
      const timeRange = parseTime(scene.time);
      const newHook = { id: Date.now(), text: selectedText, sceneId: scene.id, startTime: timeRange.start, endTime: timeRange.end, position: { x: 20, y: 150 }, style: { ...hookStyle } };
      setSavedHooks([...savedHooks, newHook]);
      window.getSelection()?.removeAllRanges();
      selectHook(newHook);
    } else { alert("กรุณาใช้เมาส์ปาดคลุมข้อความในซีนนี้ก่อนกดเซฟฮุกครับ"); }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setVideoFile(file); setVideoUrl(URL.createObjectURL(file)); setStatusMessage("อัปโหลดสำเร็จ! กดปุ่มเริ่มถอดเสียงได้เลย"); }
  };

  const handleTranscribe = async () => {
    if (!videoFile) return;
    setIsLoading(true); setLoadingText(`🧠 AI กำลังถอดเสียงและสร้างสคริปต์ให้ครบทุกโหมด...`); 
    setSourceScenes([]); setAutoScenes([]);

    try {
      const formData = new FormData(); formData.append("video", videoFile);
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await response.json();
      
      if (response.status === 429) { setLoadingText("⚠️ โควต้าฟรีเต็มชั่วคราว กรุณารอ 1 นาทีแล้วกดใหม่ครับ"); setTimeout(() => setIsLoading(false), 4000); return; }

      if (data.scenes) {
        const formattedScenes = data.scenes.map((s: any) => { const t = parseTime(s.time); return { ...s, startTime: t.start, endTime: t.end }; });
        setSourceScenes(formattedScenes); setAutoScenes(formattedScenes);
        setLoadingText("✅ วิเคราะห์จังหวะและสร้างสคริปต์สำเร็จ!");
        setTimeout(() => setIsLoading(false), 1000);
      } else {
        setLoadingText("❌ เกิดข้อผิดพลาด: " + (data.error || "ถอดเสียงไม่ได้"));
        setTimeout(() => setIsLoading(false), 3000);
      }
    } catch (err: any) { setLoadingText("❌ เชื่อมต่อหลังบ้านขัดข้อง: " + err.message); setTimeout(() => setIsLoading(false), 3000); } 
  };

  const updateAutoSceneText = (id: number, text: string) => setAutoScenes(scenes => scenes.map(s => s.id === id ? { ...s, text } : s));
  const updateAutoSceneTime = (id: number, field: "startTime" | "endTime", value: string) => {
    setAutoScenes(scenes => scenes.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (field === 'startTime' && videoRef.current && !isNaN(parseFloat(value))) videoRef.current.currentTime = parseFloat(value);
  };
  const removeAutoScene = (id: number) => setAutoScenes(scenes => scenes.filter(s => s.id !== id));

  const addNewScene = () => {
    const newId = Date.now();
    const startT = currentTime.toFixed(2);
    const endT = (currentTime + 2).toFixed(2);
    const newScene: Scene = { id: newId, time: `${startT} - ${endT}`, text: "ใส่ข้อความใหม่...", startTime: startT, endTime: endT };
    
    setAutoScenes(prev => [...prev, newScene].sort((a, b) => Number(a.startTime) - Number(b.startTime)));

    setTimeout(() => {
      const el = document.getElementById(`scene-box-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('border-blue-500', 'bg-blue-900/30', 'scale-[1.02]');
        setTimeout(() => { el.classList.remove('border-blue-500', 'bg-blue-900/30', 'scale-[1.02]'); }, 2000);
      }
    }, 150);
  };

  const shiftAllTimes = (amount: number) => {
    setAutoScenes(scenes => scenes.map(s => {
      const shiftVal = (valStr: string) => {
        let num = parseFloat(valStr);
        return isNaN(num) ? valStr : Math.max(0, num + amount).toFixed(2);
      };
      return { ...s, startTime: shiftVal(s.startTime || "0"), endTime: shiftVal(s.endTime || "0") };
    }));
  };

  const handleExportVideo = async () => {
    if (!videoRef.current || (!videoFile && !videoUrl)) return;
    const video = videoRef.current;
    video.pause(); video.currentTime = 0;
    setIsLoading(true); setLoadingText(`🎬 ระบบกำลังเรนเดอร์ความละเอียด: ${exportQuality === 'original' ? 'ต้นฉบับ' : exportQuality+'p'} ...`);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let vidWidth = video.videoWidth || 720; let vidHeight = video.videoHeight || 1280; let targetBitrate = 50000000; 
    if (exportQuality === "1080") {
        const ratio = vidWidth / vidHeight;
        if (vidWidth > vidHeight) { vidWidth = 1920; vidHeight = Math.round(1920 / ratio); } else { vidHeight = 1920; vidWidth = Math.round(1920 * ratio); }
        targetBitrate = 15000000; 
    } else if (exportQuality === "720") {
        const ratio = vidWidth / vidHeight;
        if (vidWidth > vidHeight) { vidWidth = 1280; vidHeight = Math.round(1280 / ratio); } else { vidHeight = 1280; vidWidth = Math.round(1280 * ratio); }
        targetBitrate = 5000000; 
    }

    canvas.width = vidWidth; canvas.height = vidHeight;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

    const scale = vidWidth / 340;
    const canvasStream = canvas.captureStream(60); 
    let audioTracks: MediaStreamTrack[] = [];
    try {
      // @ts-ignore
      const videoStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
      if (videoStream) audioTracks = videoStream.getAudioTracks();
    } catch (e) { console.error("Audio grab failed", e); }

    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
    const recorderOptions = { mimeType: "video/webm;codecs=h264", videoBitsPerSecond: targetBitrate, audioBitsPerSecond: 128000 };
    const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/mp4" });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = downloadUrl; a.download = `subdeud_${exportQuality}_${Date.now()}.mp4`; a.click();
      setIsLoading(false);
    };

    mediaRecorder.start(); video.play();

    const renderFrame = () => {
      if (video.paused || video.ended) { if (video.ended) mediaRecorder.stop(); return; }

      if (showGreenScreen) { ctx.fillStyle = "#00FF00"; ctx.fillRect(0, 0, vidWidth, vidHeight); } 
      else { ctx.drawImage(video, 0, 0, vidWidth, vidHeight); }

      const t = video.currentTime;
      let activeText = ""; let styleToUse = currentStyle;
      let textX = vidWidth / 2; let textY = globalSubPosition.y * scale;
      let karaokeProgress = 0; let sceneStartTime = 0; let sceneEndTime = 0;

      if (activeMode === 'hook') {
        const activeHook = savedHooks.find(h => t >= Number(h.startTime) && t <= Number(h.endTime));
        if (activeHook) {
          activeText = activeHook.text; styleToUse = activeHook.style;
          sceneStartTime = Number(activeHook.startTime); sceneEndTime = Number(activeHook.endTime);
          textX = activeHook.position.x * scale + (vidWidth / 2 - (170 * scale)); 
          textY = activeHook.position.y * scale + (20 * scale);
        }
      } else {
        const activeScene = autoScenes.find(s => t >= Number(s.startTime) && t <= Number(s.endTime));
        if (activeScene) {
          activeText = activeScene.text;
          sceneStartTime = Number(activeScene.startTime); sceneEndTime = Number(activeScene.endTime);
          textX = globalSubPosition.x * scale + (170 * scale); textY = globalSubPosition.y * scale + (25 * scale);
          
          if (activeMode === 'highlight') {
             const adjustedStart = Math.max(0, sceneStartTime - 0.1);
             const adjustedDuration = (sceneEndTime - sceneStartTime) * 0.85; 
             const elapsed = t - adjustedStart;
             karaokeProgress = adjustedDuration > 0 ? Math.max(0, Math.min(1, elapsed / adjustedDuration)) : 0;
          }
        }
      }

      if (activeText) {
        const elapsed = t - sceneStartTime;
        const animDuration = 0.25; 
        const p = Math.min(1, Math.max(0, elapsed / animDuration));

        let animScale = 1; let animAlpha = 1; let animOffsetY = 0;
        if (styleToUse.animationType === "popIn") { animScale = p < 1 ? 0.8 + (Math.sin(p * Math.PI / 2) * 0.2) : 1; animAlpha = p; } 
        else if (styleToUse.animationType === "bounce") { animScale = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.15 : 1; } 
        else if (styleToUse.animationType === "fadeIn") { animAlpha = p; } 
        else if (styleToUse.animationType === "slideUp") { animOffsetY = (1 - p) * 30 * scale; animAlpha = p; }

        ctx.save(); ctx.globalAlpha = animAlpha; textY += animOffsetY;

        const cleanFont = styleToUse.fontFamily.replace(/'/g, "");
        const baseFontSize = styleToUse.fontSize * scale * animScale;
        ctx.font = `${styleToUse.fontWeight} ${baseFontSize}px ${cleanFont}, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";

        const textMetrics = ctx.measureText(activeText);
        const textWidth = textMetrics.width;
        const textHeight = styleToUse.fontSize * scale * animScale;

        const applyShadowAndStroke = () => {
          if (styleToUse.hasShadow) {
            ctx.shadowColor = styleToUse.shadowColor; ctx.shadowBlur = styleToUse.shadowBlur * scale;
            ctx.shadowOffsetX = styleToUse.shadowOffset * scale; ctx.shadowOffsetY = styleToUse.shadowOffset * scale;
          } else { ctx.shadowColor = "transparent"; }
          if (styleToUse.hasStroke && styleToUse.strokeWidth > 0) {
            ctx.strokeStyle = styleToUse.strokeColor; ctx.lineWidth = styleToUse.strokeWidth * scale * 1.5;
            ctx.lineJoin = "round";
          }
        };

        if (activeMode === 'highlight') {
            if (styleToUse.karaokeEffect === 'colorWipe') {
                applyShadowAndStroke(); ctx.strokeText(activeText, textX, textY); ctx.fillStyle = "#FFFFFF"; ctx.fillText(activeText, textX, textY);
                if (karaokeProgress > 0) {
                    ctx.save(); ctx.beginPath();
                    ctx.rect(textX - (textWidth / 2), textY - textHeight, textWidth * karaokeProgress, textHeight * 2);
                    ctx.clip();
                    ctx.shadowColor = "transparent"; applyShadowAndStroke(); ctx.strokeText(activeText, textX, textY); ctx.fillStyle = styleToUse.textColor; ctx.fillText(activeText, textX, textY);
                    ctx.restore();
                }
            } 
            else if (styleToUse.karaokeEffect === 'popWipe') {
                let kScale = 1;
                if (elapsed < 0.25 && elapsed >= 0) { kScale = 1 + Math.sin((elapsed / 0.25) * Math.PI) * 0.15; }
                const kFontSize = baseFontSize * kScale;
                ctx.font = `${styleToUse.fontWeight} ${kFontSize}px ${cleanFont}, sans-serif`;
                
                applyShadowAndStroke(); ctx.strokeText(activeText, textX, textY); ctx.fillStyle = "#FFFFFF"; ctx.fillText(activeText, textX, textY);
                if (karaokeProgress > 0) {
                    ctx.save(); ctx.beginPath();
                    ctx.rect(textX - (textWidth / 2 * kScale), textY - textHeight * kScale, textWidth * karaokeProgress * kScale, textHeight * 2 * kScale);
                    ctx.clip();
                    ctx.shadowColor = "transparent"; applyShadowAndStroke(); ctx.strokeText(activeText, textX, textY); ctx.fillStyle = styleToUse.textColor; ctx.fillText(activeText, textX, textY);
                    ctx.restore();
                }
            }
            else if (styleToUse.karaokeEffect === 'scaleWord') {
                const words = getWords(activeText);
                const totalDur = (sceneEndTime - sceneStartTime) * 0.85;
                const wordDur = totalDur > 0 ? totalDur / words.length : 0.1;
                let currentWordX = textX - (textWidth / 2);
                
                words.forEach((word, index) => {
                    const wStart = sceneStartTime + (index * wordDur);
                    const wEnd = wStart + wordDur;
                    const wordW = ctx.measureText(word).width;
                    let wScale = 1; let wColor = "#FFFFFF"; 

                    if (t >= wStart && t <= wEnd) {
                        const wordP = (t - wStart) / wordDur;
                        wScale = 1 + Math.sin(wordP * Math.PI) * 0.2; 
                        wColor = styleToUse.textColor;
                    } else if (t > wEnd) {
                        wColor = styleToUse.textColor;
                    }

                    ctx.save();
                    ctx.translate(currentWordX + wordW/2, textY);
                    ctx.scale(wScale, wScale);
                    applyShadowAndStroke(); ctx.strokeText(word, 0, 0);
                    ctx.fillStyle = wColor; ctx.fillText(word, 0, 0);
                    ctx.restore();
                    currentWordX += wordW;
                });
            }
            else if (styleToUse.karaokeEffect === 'bgHighlight') {
                if (karaokeProgress > 0) {
                    const pX = styleToUse.hasBackground ? styleToUse.bgPaddingX * scale : 10 * scale;
                    const pY = styleToUse.hasBackground ? styleToUse.bgPaddingY * scale : 10 * scale;
                    ctx.fillStyle = hexToRgba(styleToUse.textColor, 0.9); 
                    ctx.beginPath();
                    ctx.roundRect(textX - textWidth/2 - pX, textY - textHeight/2 - pY, (textWidth + pX*2) * karaokeProgress, textHeight + pY*2, styleToUse.bgRadius * scale);
                    ctx.fill();
                }
                applyShadowAndStroke(); ctx.strokeText(activeText, textX, textY); ctx.fillStyle = "#FFFFFF"; ctx.fillText(activeText, textX, textY);
            }
        } else {
            if (styleToUse.hasBackground) {
              const pX = styleToUse.bgPaddingX * scale * animScale; const pY = styleToUse.bgPaddingY * scale * animScale;
              ctx.fillStyle = hexToRgba(styleToUse.bgColor, styleToUse.bgOpacity);
              ctx.beginPath(); ctx.roundRect(textX - (textWidth/2) - pX, textY - (textHeight/2) - pY, textWidth + (pX*2), textHeight + (pY*2), styleToUse.bgRadius * scale);
              ctx.fill();
            }
            applyShadowAndStroke(); ctx.strokeText(activeText, textX, textY); ctx.fillStyle = styleToUse.textColor; ctx.fillText(activeText, textX, textY);
        }

        ctx.restore();
      }

      setLoadingText(`🎬 กำลังถักทอคลิป (${exportQuality === 'original' ? 'ต้นฉบับ' : exportQuality+'p'}): ${((t / video.duration) * 100).toFixed(0)}%`);
      requestAnimationFrame(renderFrame);
    };

    video.addEventListener("playing", function onPlay() { renderFrame(); video.removeEventListener("playing", onPlay); });
  };

  const generateTextShadow = (styleConfig: any) => {
    let shadowStr = "";
    if (styleConfig.hasStroke && styleConfig.strokeWidth > 0) {
      for (let i = -styleConfig.strokeWidth; i <= styleConfig.strokeWidth; i++) {
        for (let j = -styleConfig.strokeWidth; j <= styleConfig.strokeWidth; j++) {
          if (i !== 0 || j !== 0) shadowStr += `${i}px ${j}px 0 ${styleConfig.strokeColor}, `;
        }
      }
    }
    if (styleConfig.hasShadow && (styleConfig.shadowOffset > 0 || styleConfig.shadowBlur > 0)) {
      const offset = styleConfig.shadowOffset + (styleConfig.hasStroke && styleConfig.strokeWidth > 0 ? styleConfig.strokeWidth : 0);
      shadowStr += `${offset}px ${offset}px ${styleConfig.shadowBlur}px ${styleConfig.shadowColor}, `;
    }
    return shadowStr ? shadowStr.slice(0, -2) : "none";
  };
  
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16) || 0; const g = parseInt(hex.slice(3, 5), 16) || 0; const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const activeHookForPreview = savedHooks.find(h => currentTime >= Number(h.startTime) && currentTime <= Number(h.endTime));
  const activeSceneForPreview = autoScenes.find(s => currentTime >= Number(s.startTime) && currentTime <= Number(s.endTime));

  let previewKaraokeProgress = 0;
  let previewScalePop = 1;
  if (activeMode === 'highlight' && activeSceneForPreview) {
      const rawStart = Number(activeSceneForPreview.startTime);
      const rawEnd = Number(activeSceneForPreview.endTime);
      const adjustedStart = Math.max(0, rawStart - 0.1);
      const duration = (rawEnd - rawStart) * 0.85; 
      const elapsed = currentTime - adjustedStart;
      previewKaraokeProgress = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0;

      const realElapsed = currentTime - rawStart;
      if (currentStyle.karaokeEffect === 'popWipe' && realElapsed < 0.25 && realElapsed >= 0) {
          previewScalePop = 1 + Math.sin((realElapsed / 0.25) * Math.PI) * 0.15;
      }
  }

  if (!isMounted) {
    return (
      <div className="h-screen w-full bg-[#0f172a] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-yellow-400 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold">กำลังเตรียมเครื่องยนต์วิดีโอ 60FPS...</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Chonburi&family=Kanit:wght@400;600;700;900&family=Mitr:wght@400;700&family=Prompt:wght@400;600;700;900&display=swap');
        .preview-container * { font-family: 'Kanit', sans-serif; }
        .dynamic-hook-text { text-align: center; line-height: 1.2; box-sizing: border-box; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 6px; }
        
        .anim-popIn { animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .anim-bounce { animation: bounceIn 0.3s ease-out forwards; }
        .anim-fadeIn { animation: fadeIn 0.3s ease-in forwards; }
        .anim-slideUp { animation: slideUp 0.3s ease-out forwards; }
        .anim-none { animation: none; }
        
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0.9); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      `}} />

      {isLoading && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-yellow-400 rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-white text-center px-4 leading-relaxed max-w-xl">{loadingText}</h2>
        </div>
      )}

      {/* 📱 Wrapper หลัก: คืนความสวยงามอลังการให้จอคอม แต่ยังเลื่อนพับได้บนมือถือ */}
      <div className="min-h-screen md:h-screen w-full bg-[#0f172a] text-white p-2 md:p-4 flex flex-col md:overflow-hidden preview-container">
        
        <div className="shrink-0 mb-4 pb-2 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          {/* คืน Title เต็มๆ บนจอคอม */}
          <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🚀 SubDeud Studio - 60FPS Engine</h2>
          <div className="flex gap-2 md:gap-4 items-center w-full sm:w-auto justify-between sm:justify-end">
            <label className="flex items-center gap-2 cursor-pointer bg-green-900/30 text-green-400 py-1 px-3 rounded-full border border-green-700 hover:bg-green-800/40 transition">
              <span className="text-xs md:text-sm font-bold">🟢 เปิดพื้นหลังเขียว (Chroma Key)</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={showGreenScreen} onChange={(e) => setShowGreenScreen(e.target.checked)} />
                <div className={`block w-8 h-4 rounded-full transition-colors ${showGreenScreen ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${showGreenScreen ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
            <span className="text-gray-400 text-xs md:text-sm bg-gray-800 py-1 px-3 rounded-full font-bold">Status: พร้อมใช้งาน</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 md:min-h-0">
          
          <div className="md:col-span-4 lg:col-span-3 flex flex-col shrink-0 mx-auto w-full max-w-[340px] md:max-w-full md:h-full md:min-h-0 md:pr-4">
            <div className="flex justify-between w-full max-w-[340px] mb-2 mx-auto">
              <span className="text-gray-400 font-bold text-[10px] md:text-xs bg-gray-900 px-2 py-1 md:px-3 rounded-lg">📱 MODE: {activeMode.toUpperCase()}</span>
              <span className="text-blue-400 font-mono text-[10px] md:text-sm font-bold bg-blue-900/30 px-2 py-1 md:px-3 rounded-lg">⏱️ {currentTime.toFixed(1)} s</span>
            </div>
            
            <div className={`w-full max-w-[340px] aspect-[9/16] border-2 border-gray-700 rounded-xl relative overflow-hidden shadow-2xl mx-auto shrink-0 ${showGreenScreen ? 'bg-[#00FF00]' : 'bg-black'}`}>
              {!showGreenScreen && (
                videoUrl ? (
                  <video 
                    ref={videoRef} src={videoUrl} 
                    onTimeUpdate={() => { if (videoRef.current?.paused) setCurrentTime(videoRef.current.currentTime); }} 
                    className="absolute inset-0 w-full h-full object-cover" controls playsInline 
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center text-gray-600"><span className="text-sm md:text-base">รออัปโหลดคลิป...</span></div>
                )
              )}

              {activeMode === 'hook' && activeHookForPreview && (
                <Rnd
                  key={`hook-${activeHookForPreview.id}`} enableResizing={false} position={activeHookForPreview.position}
                  onDragStop={(e, d) => { setSavedHooks(hooks => hooks.map(h => h.id === activeHookForPreview.id ? { ...h, position: {x: d.x, y: d.y} } : h)) }}
                  bounds="parent" className="z-20 cursor-move pointer-events-auto"
                >
                  <div className={`dynamic-hook-text whitespace-nowrap anim-${hookStyle.animationType}`}
                    style={{
                      fontFamily: activeHookForPreview.style.fontFamily, fontSize: `${activeHookForPreview.style.fontSize}px`, fontWeight: activeHookForPreview.style.fontWeight, color: activeHookForPreview.style.textColor,
                      textShadow: generateTextShadow(activeHookForPreview.style),
                      backgroundColor: activeHookForPreview.style.hasBackground ? hexToRgba(activeHookForPreview.style.bgColor, activeHookForPreview.style.bgOpacity) : 'transparent',
                      padding: activeHookForPreview.style.hasBackground ? `${activeHookForPreview.style.bgPaddingY}px ${activeHookForPreview.style.bgPaddingX}px` : '0px', borderRadius: activeHookForPreview.style.hasBackground ? `${activeHookForPreview.style.bgRadius}px` : '0px'
                    }}
                  >
                    {activeHookForPreview.text}
                  </div>
                </Rnd>
              )}

              {(activeMode === 'basic' || activeMode === 'highlight') && activeSceneForPreview && (
                 <Rnd
                 key={`scene-${activeSceneForPreview.id}`} 
                 enableResizing={false} position={globalSubPosition}
                 onDragStop={(e, d) => setGlobalSubPosition({ x: d.x, y: d.y })} 
                 bounds="parent" className="z-20 cursor-move pointer-events-auto"
               >
                 <div className="w-[340px] flex justify-center items-center">
                   <div className={`dynamic-hook-text anim-${currentStyle.animationType}`} 
                     style={{
                       fontFamily: currentStyle.fontFamily, fontSize: `${currentStyle.fontSize}px`, fontWeight: currentStyle.fontWeight,
                       backgroundColor: currentStyle.hasBackground && currentStyle.karaokeEffect !== 'bgHighlight' ? hexToRgba(currentStyle.bgColor, currentStyle.bgOpacity) : 'transparent',
                       padding: currentStyle.hasBackground && currentStyle.karaokeEffect !== 'bgHighlight' ? `${currentStyle.bgPaddingY}px ${currentStyle.bgPaddingX}px` : '0px', 
                       borderRadius: currentStyle.hasBackground && currentStyle.karaokeEffect !== 'bgHighlight' ? `${currentStyle.bgRadius}px` : '0px',
                       transform: activeMode === 'highlight' && currentStyle.karaokeEffect === 'popWipe' ? `scale(${previewScalePop})` : 'none',
                       transformOrigin: 'center center'
                     }}
                   >
                     {activeMode === 'highlight' && currentStyle.karaokeEffect === 'bgHighlight' && (
                       <div style={{ position: 'relative', display: 'inline-block', padding: '5px 15px' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: hexToRgba(currentStyle.textColor, 0.9), width: `${previewKaraokeProgress * 100}%`, borderRadius: `${currentStyle.bgRadius}px`, zIndex: -1 }} />
                          <span style={{ color: '#FFFFFF', textShadow: generateTextShadow(currentStyle), position: 'relative', zIndex: 1 }}>{activeSceneForPreview.text}</span>
                       </div>
                     )}

                     {activeMode === 'highlight' && (currentStyle.karaokeEffect === 'colorWipe' || currentStyle.karaokeEffect === 'popWipe') && (
                       <div style={{ position: 'relative', display: 'inline-block' }}>
                          <span style={{ color: '#FFFFFF', textShadow: generateTextShadow(currentStyle) }}>{activeSceneForPreview.text}</span>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, color: currentStyle.textColor, width: `${previewKaraokeProgress * 100}%`, overflow: 'hidden', whiteSpace: 'nowrap', textShadow: generateTextShadow(currentStyle), zIndex: 2 }}>
                            {activeSceneForPreview.text}
                          </div>
                       </div>
                     )}

                     {activeMode === 'highlight' && currentStyle.karaokeEffect === 'scaleWord' && (
                       <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '2px' }}>
                          {getWords(activeSceneForPreview.text).map((word, i) => {
                             const totalDur = (Number(activeSceneForPreview.endTime) - Number(activeSceneForPreview.startTime)) * 0.85;
                             const wordDur = totalDur > 0 ? totalDur / getWords(activeSceneForPreview.text).length : 0.1;
                             const wStart = Number(activeSceneForPreview.startTime) + (i * wordDur);
                             const wEnd = wStart + wordDur;
                             let wScale = 1; let wColor = "#FFFFFF"; 
                             if (currentTime >= wStart && currentTime <= wEnd && wordDur > 0) {
                                wScale = 1 + Math.sin(((currentTime - wStart) / wordDur) * Math.PI) * 0.2; 
                                wColor = currentStyle.textColor;
                             } else if (currentTime > wEnd) { wColor = currentStyle.textColor; }
                             return (<span key={i} style={{ display: 'inline-block', transform: `scale(${wScale})`, transformOrigin: 'bottom center', color: wColor, textShadow: generateTextShadow(currentStyle), whiteSpace: 'pre' }}>{word}</span>);
                          })}
                       </div>
                     )}

                     {activeMode === 'basic' && (<span style={{ color: currentStyle.textColor, textShadow: generateTextShadow(currentStyle) }}>{activeSceneForPreview.text}</span>)}
                   </div>
                 </div>
               </Rnd>
              )}
            </div>
          </div>

          <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-4 md:gap-5 md:h-full md:min-h-0">
            
            <div className="shrink-0 flex flex-col xl:flex-row gap-4 bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-700 shadow-md">
              <div className="grid grid-cols-3 gap-2 w-full xl:w-auto xl:flex">
                <button onClick={() => setActiveMode('hook')} className={`py-2 md:py-3 px-1 md:px-4 rounded-lg font-bold text-[10px] md:text-sm transition-all ${activeMode === 'hook' ? 'bg-blue-600 shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-700'}`}>🎯 โหมด 1: ฮุกอิสระ</button>
                <button onClick={() => setActiveMode('basic')} className={`py-2 md:py-3 px-1 md:px-4 rounded-lg font-bold text-[10px] md:text-sm transition-all ${activeMode === 'basic' ? 'bg-indigo-600 shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-700'}`}>📝 โหมด 2: ซับ Auto</button>
                <button onClick={() => setActiveMode('highlight')} className={`py-2 md:py-3 px-1 md:px-4 rounded-lg font-bold text-[10px] md:text-sm transition-all ${activeMode === 'highlight' ? 'bg-purple-600 shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-700'}`}>🎤 โหมด 3: ไฮไลต์</button>
              </div>

              {/* คืนข้อความปุ่มเต็มๆ ให้จอคอม */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 w-full flex-1">
                <div className="relative w-full h-full group">
                  <input type="file" accept="video/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                  <div className="w-full h-full py-2 md:py-0 bg-gray-700 group-hover:bg-blue-500 text-white font-bold text-[10px] md:text-sm rounded-lg shadow-md transition-all flex items-center justify-center border-2 border-dashed border-gray-400 group-hover:border-white text-center">
                    <span className="hidden md:inline">📁 1. อัปโหลดคลิป</span>
                    <span className="md:hidden">📁 1. อัปโหลด</span>
                  </div>
                </div>
                <button onClick={handleTranscribe} disabled={!videoFile} className="w-full py-2 md:py-0 bg-blue-700 hover:bg-blue-600 text-white font-bold text-[10px] md:text-sm rounded-lg shadow-md transition-all disabled:opacity-50 border border-blue-500 text-center">
                    <span className="hidden md:inline">✨ 2. ถอดเสียง AI</span>
                    <span className="md:hidden">✨ 2. ถอดเสียง</span>
                </button>
                <div className="relative w-full h-full">
                  <select value={exportQuality} onChange={(e) => setExportQuality(e.target.value)} className="w-full h-full py-2 md:py-0 bg-gray-900 border border-gray-600 rounded-lg text-[10px] md:text-sm px-1 md:px-2 text-yellow-400 font-bold outline-none cursor-pointer appearance-none shadow-inner text-center hover:bg-gray-800 transition">
                    <option value="original">💎 ความชัด: ต้นฉบับ</option>
                    <option value="1080">📺 ความชัด: 1080p</option>
                    <option value="720">📱 ความชัด: 720p</option>
                  </select>
                  <div className="absolute inset-y-0 right-1 md:right-3 flex items-center pointer-events-none text-gray-400 text-[10px] md:text-xs">▼</div>
                </div>
                <button onClick={handleExportVideo} disabled={!videoUrl} className="w-full py-2 md:py-0 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-[10px] md:text-sm rounded-lg shadow-md transition-all disabled:opacity-50 animate-pulse border border-green-400 text-center">
                    <span className="hidden md:inline">🎬 3. Export ออก</span>
                    <span className="md:hidden">🎬 3. Export</span>
                </button>
              </div>
            </div>

            <div className={`flex-1 flex flex-col md:grid gap-4 md:gap-6 md:min-h-0 ${activeMode === 'hook' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
              
              {/* กล่อง 1: สคริปต์ */}
              <div className="bg-gray-900 rounded-xl border border-gray-700 flex flex-col h-[400px] md:h-auto md:min-h-0 p-4 shadow-inner">
                <div className="shrink-0 flex flex-wrap justify-between items-center gap-y-2 mb-3 border-b border-gray-700 pb-2 md:pb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm md:text-base font-bold text-yellow-400 whitespace-nowrap">
                      {activeMode === 'hook' ? '📝 สคริปต์ฮุก (ปาดแล้วเซฟ)' : '✏️ สคริปต์ซับไตเติล'}
                    </h4>
                    {activeMode !== 'hook' && (<span className="hidden lg:inline text-[9px] md:text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700 whitespace-nowrap">🔗 ใช้ร่วมกัน (โหมด 2 และ 3)</span>)}
                  </div>
                  {activeMode !== 'hook' && (
                    <div className="flex items-center gap-2 ml-auto">
                       <div className="flex items-center bg-gray-950 rounded-lg border border-gray-700 overflow-hidden">
                          <button onClick={() => shiftAllTimes(-0.2)} className="text-[10px] md:text-xs font-mono font-bold text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 md:py-1.5 transition">-0.2s</button>
                          <div className="w-px h-3 md:h-4 bg-gray-700"></div>
                          <span className="text-[10px] md:text-xs text-gray-400 px-1.5 md:px-2 cursor-help" title="ซิงค์เวลาทั้งคลิป">⏱️</span>
                          <div className="w-px h-3 md:h-4 bg-gray-700"></div>
                          <button onClick={() => shiftAllTimes(0.2)} className="text-[10px] md:text-xs font-mono font-bold text-green-400 hover:bg-green-500 hover:text-white px-2 py-1 md:py-1.5 transition">+0.2s</button>
                       </div>
                       <button onClick={addNewScene} className="bg-blue-600 hover:bg-blue-500 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition shadow whitespace-nowrap">➕ แทรกซีน</button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  {activeMode === 'hook' && sourceScenes.map((scene) => (
                    <div key={scene.id} className="bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-700 cursor-pointer hover:border-blue-400 transition" onClick={() => jumpToTime(scene.startTime)}>
                      <div className="flex justify-between items-center mb-2 md:mb-3">
                        <span className="text-[10px] md:text-xs bg-blue-900/50 text-blue-300 py-1 px-2 md:px-3 rounded-lg font-mono font-bold">⏱️ ซีน {scene.id}</span>
                        <button onClick={(e) => { e.stopPropagation(); extractHookFromScene(scene); }} className="text-[10px] md:text-xs bg-red-600 hover:bg-red-500 text-white py-1 md:py-1.5 px-2 md:px-3 rounded-lg font-bold shadow-md">⚡ เซฟฮุก</button>
                      </div>
                      <textarea value={scene.text} onChange={(e) => updateAutoSceneText(scene.id, e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full bg-gray-950 text-gray-100 text-sm md:text-base p-2 md:p-3 rounded-lg border border-gray-600 focus:border-indigo-500 outline-none resize-none leading-relaxed font-medium" rows={2} />
                    </div>
                  ))}

                  {activeMode !== 'hook' && autoScenes.map((scene) => (
                    <div key={scene.id} id={`scene-box-${scene.id}`} className="bg-gray-800 p-3 md:p-4 rounded-xl border border-gray-700 hover:border-blue-400 transition cursor-pointer" onClick={() => jumpToTime(scene.startTime)}>
                      <div className="flex flex-wrap justify-between items-center gap-y-2 mb-2 md:mb-3">
                         <div className="flex gap-1 md:gap-2 text-[10px] md:text-xs font-mono">
                           <div className="flex items-center gap-1 bg-gray-950 p-1 md:p-1.5 rounded border border-gray-600 focus-within:border-blue-400">
                              <span className="text-gray-500">เริ่ม:</span><input type="text" value={scene.startTime} onChange={(e) => updateAutoSceneTime(scene.id, 'startTime', e.target.value)} onClick={(e) => e.stopPropagation()} className="w-8 md:w-12 bg-transparent text-white outline-none text-right"/>s
                           </div>
                           <div className="flex items-center gap-1 bg-gray-950 p-1 md:p-1.5 rounded border border-gray-600 focus-within:border-blue-400">
                              <span className="text-gray-500">จบ:</span><input type="text" value={scene.endTime} onChange={(e) => updateAutoSceneTime(scene.id, 'endTime', e.target.value)} onClick={(e) => e.stopPropagation()} className="w-8 md:w-12 bg-transparent text-white outline-none text-right"/>s
                           </div>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); removeAutoScene(scene.id); }} className="text-[10px] md:text-xs font-bold text-red-400 bg-red-900/30 hover:bg-red-500 hover:text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition">ลบ</button>
                      </div>
                      <textarea value={scene.text} onChange={(e) => updateAutoSceneText(scene.id, e.target.value)} onClick={(e) => { e.stopPropagation(); jumpToTime(scene.startTime); }} className="w-full bg-gray-950 text-gray-100 text-sm md:text-base p-2 md:p-3 rounded-lg border border-gray-600 focus:border-indigo-500 outline-none resize-none leading-relaxed font-medium" rows={2} />
                    </div>
                  ))}
                  {(activeMode === 'hook' ? sourceScenes : autoScenes).length === 0 && <p className="text-[10px] md:text-sm text-gray-500 text-center mt-6">ยังไม่มีข้อมูลสคริปต์ ลองกดแทรกซีนดูสิครับ</p>}
                </div>
              </div>

              {/* กล่อง 2: ฮุกที่บันทึก (เฉพาะโหมด 1) */}
              {activeMode === 'hook' && (
                <div className="bg-gray-900 rounded-xl border border-gray-700 flex flex-col h-[400px] md:h-auto md:min-h-0 p-4 shadow-inner">
                  <h4 className="shrink-0 text-sm md:text-base font-bold text-blue-400 mb-3 border-b border-gray-700 pb-2 md:pb-3">📌 ฮุกที่บันทึกไว้</h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {savedHooks.length === 0 ? <p className="text-[10px] md:text-sm text-gray-500 text-center mt-6">ยังไม่มีฮุกที่บันทึก</p> : 
                      savedHooks.map(hook => (
                        <div key={hook.id} onClick={() => selectHook(hook)} className={`p-3 md:p-4 rounded-xl border cursor-pointer transition ${selectedHookId === hook.id ? 'bg-blue-900/40 border-blue-500 shadow-md' : 'bg-gray-800 border-gray-700 hover:border-blue-400'}`}>
                          <div className="flex justify-between items-center mb-2 md:mb-3">
                            <input type="text" value={hook.text} onChange={(e) => { setSavedHooks(hooks => hooks.map(h => h.id === hook.id ? { ...h, text: e.target.value } : h)) }} onClick={(e) => e.stopPropagation()} className="w-3/4 bg-transparent text-yellow-400 font-black text-sm md:text-base border-b border-gray-600 outline-none pb-1"/>
                            <button onClick={(e) => { e.stopPropagation(); setSavedHooks(hooks => hooks.filter(h => h.id !== hook.id)); if(selectedHookId === hook.id) setSelectedHookId(null); }} className="text-[10px] md:text-xs font-bold text-red-400 bg-red-900/30 px-2 md:px-3 py-1 md:py-1.5 rounded-lg">ลบ</button>
                          </div>
                          <div className="flex gap-2 md:gap-4 text-[10px] md:text-sm font-mono">
                            <div className="flex items-center gap-1 md:gap-2 bg-gray-950 p-1 md:p-2 rounded-lg border border-gray-700 w-1/2"><span className="text-gray-500">เริ่ม:</span><input type="text" value={hook.startTime} onChange={(e) => { setSavedHooks(hooks => hooks.map(h => h.id === hook.id ? { ...h, startTime: e.target.value } : h)); }} onClick={(e) => e.stopPropagation()} className="w-full bg-transparent text-white outline-none"/></div>
                            <div className="flex items-center gap-1 md:gap-2 bg-gray-950 p-1 md:p-2 rounded-lg border border-gray-700 w-1/2"><span className="text-gray-500">จบ:</span><input type="text" value={hook.endTime} onChange={(e) => { setSavedHooks(hooks => hooks.map(h => h.id === hook.id ? { ...h, endTime: e.target.value } : h)); }} onClick={(e) => e.stopPropagation()} className="w-full bg-transparent text-white outline-none"/></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* กล่อง 3: ดีไซน์สไตล์ */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-[500px] md:h-auto md:min-h-0 p-4 shadow-lg">
                <h4 className="shrink-0 text-sm md:text-base font-bold text-green-400 mb-3 border-b border-gray-700 pb-2 md:pb-3 flex justify-between items-center">
                  <span>🎨 แผงควบคุมดีไซน์ {activeMode !== 'hook' ? '(Global)' : (selectedHookId ? '- กำลังแก้ฮุก' : '- ฮุกเริ่มต้น')}</span>
                </h4>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 space-y-4 md:space-y-6 pb-6">
                  
                  <div className="bg-gray-900 p-3 md:p-4 rounded-xl border border-indigo-700 shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                     <h5 className="text-xs md:text-sm font-bold text-indigo-300 mb-2 md:mb-3 border-b border-gray-700 pb-1 md:pb-2">✨ เอฟเฟกต์แอนิเมชัน (ขาเข้า)</h5>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                       {[ { id: 'none', name: '🚫 ไม่มี (ขึ้นเฉยๆ)' }, { id: 'popIn', name: '💥 เด้งกระแทก (Pop)' }, { id: 'bounce', name: '🏀 ดึ๋งๆ (Bounce)' }, { id: 'fadeIn', name: '🌫️ ค่อยๆ ชัด (Fade)' }, { id: 'slideUp', name: '⬆️ เลื่อนขึ้น (Slide)' } ].map(anim => (
                         <button key={anim.id} onClick={() => updateStyle('animationType', anim.id)} className={`py-1.5 md:py-2 px-1 text-[10px] md:text-xs font-bold rounded-lg transition-all ${currentStyle.animationType === anim.id ? 'bg-indigo-600 text-white shadow-md border border-indigo-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>{anim.name}</button>
                       ))}
                     </div>
                  </div>

                  {activeMode === 'highlight' && (
                    <div className="bg-gray-900 p-3 md:p-4 rounded-xl border border-pink-700 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                       <h5 className="text-xs md:text-sm font-bold text-pink-300 mb-2 md:mb-3 border-b border-gray-700 pb-1 md:pb-2">🎤 รูปแบบคาราโอเกะ (โหมด 3)</h5>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                         {[ { id: 'colorWipe', name: '🖌️ สีวิ่งทับ' }, { id: 'scaleWord', name: '💥 เด้งทีละคำ' }, { id: 'bgHighlight', name: '🔲 พื้นหลังวิ่ง' } ].map(fx => (
                           <button key={fx.id} onClick={() => updateStyle('karaokeEffect', fx.id)} className={`py-1.5 md:py-2 px-1 text-[10px] md:text-xs font-bold rounded-lg transition-all ${currentStyle.karaokeEffect === fx.id ? 'bg-pink-600 text-white shadow-md border border-pink-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>{fx.name}</button>
                         ))}
                       </div>
                    </div>
                  )}

                  <div className="bg-gray-900 p-3 md:p-4 rounded-xl border border-gray-700 space-y-3 md:space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                      <select value={currentStyle.fontFamily} onChange={(e) => updateStyle('fontFamily', e.target.value)} className="w-full sm:w-1/2 bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs md:text-sm text-white font-bold outline-none hover:bg-gray-700 transition">
                        <option value="'Kanit', sans-serif">Kanit (สไตล์ CapCut)</option><option value="'Prompt', sans-serif">Prompt (โมเดิร์น)</option><option value="'Chonburi', cursive">Chonburi (ตัวหนาพิเศษ)</option><option value="'Mitr', sans-serif">Mitr (กลมมน)</option>
                      </select>
                      <div className="w-full sm:w-1/2 flex gap-1 bg-gray-800 p-1 rounded-lg border border-gray-600">
                        {["400", "600", "700", "900"].map((w) => (<button key={w} onClick={() => updateStyle('fontWeight', w)} className={`flex-1 text-[10px] md:text-xs rounded-md font-bold py-1 md:py-1.5 transition ${currentStyle.fontWeight === w ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}>{w==="600"?"SB":w}</button>))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] md:text-sm font-bold text-gray-400 mb-1 md:mb-2"><span>🔍 ขนาดอักษร</span><span className="text-yellow-400">{currentStyle.fontSize}px</span></div>
                      <input type="range" min="20" max="120" value={currentStyle.fontSize} onChange={(e) => updateStyle('fontSize', Number(e.target.value))} className="w-full accent-yellow-500 h-1.5 md:h-2"/>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-sm font-bold text-gray-400">🎨 สีหลัก:</span>
                      <div className="flex items-center gap-2 md:gap-3">
                        <input type="color" value={currentStyle.textColor} onChange={(e) => updateStyle('textColor', e.target.value)} className="w-6 h-6 md:w-8 md:h-8 border-0 p-0 rounded cursor-pointer bg-transparent"/>
                        <PresetColors onSelect={(c) => updateStyle('textColor', c)} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 md:p-4 rounded-xl border border-gray-700">
                    <ToggleSwitch checked={currentStyle.hasStroke} onChange={(v) => updateStyle('hasStroke', v)} label="💥 เปิดขอบอักษร" />
                    <div className={`space-y-3 md:space-y-4 transition-all ${!currentStyle.hasStroke ? 'opacity-20 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-sm font-bold text-gray-400">🖼️ สีขอบ:</span>
                        <div className="flex items-center gap-2 md:gap-3">
                          <input type="color" value={currentStyle.strokeColor} onChange={(e) => updateStyle('strokeColor', e.target.value)} className="w-6 h-6 md:w-8 md:h-8 border-0 p-0 cursor-pointer bg-transparent"/>
                          <PresetColors onSelect={(c) => updateStyle('strokeColor', c)} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] md:text-sm font-bold text-gray-400 mb-1 md:mb-2"><span>💥 ความหนา</span><span className="text-red-400">{currentStyle.strokeWidth}px</span></div>
                        <input type="range" min="1" max="8" value={currentStyle.strokeWidth} onChange={(e) => updateStyle('strokeWidth', Number(e.target.value))} className="w-full accent-red-500 h-1.5 md:h-2"/>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 md:p-4 rounded-xl border border-gray-700">
                    <ToggleSwitch checked={currentStyle.hasShadow} onChange={(v) => updateStyle('hasShadow', v)} label="🌫️ เปิดเงาอายแชโดว์" />
                    <div className={`space-y-3 md:space-y-4 transition-all ${!currentStyle.hasShadow ? 'opacity-20 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-sm font-bold text-gray-400">👁️ สีเงา:</span>
                        <div className="flex items-center gap-2 md:gap-3">
                          <input type="color" value={currentStyle.shadowColor} onChange={(e) => updateStyle('shadowColor', e.target.value)} className="w-6 h-6 md:w-8 md:h-8 border-0 p-0 cursor-pointer bg-transparent"/>
                          <PresetColors onSelect={(c) => updateStyle('shadowColor', c)} />
                        </div>
                      </div>
                      <div className="flex gap-4 md:gap-6">
                        <div className="flex-1">
                          <div className="flex justify-between text-[9px] md:text-xs font-bold text-gray-400 mb-1 md:mb-2"><span>ทิศทาง</span><span>{currentStyle.shadowOffset}px</span></div>
                          <input type="range" min="0" max="15" value={currentStyle.shadowOffset} onChange={(e) => updateStyle('shadowOffset', Number(e.target.value))} className="w-full accent-purple-500 h-1.5 md:h-2"/>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-[9px] md:text-xs font-bold text-gray-400 mb-1 md:mb-2"><span>เบลอ</span><span>{currentStyle.shadowBlur}px</span></div>
                          <input type="range" min="0" max="20" value={currentStyle.shadowBlur} onChange={(e) => updateStyle('shadowBlur', Number(e.target.value))} className="w-full accent-indigo-500 h-1.5 md:h-2"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 md:p-4 rounded-xl border border-gray-700">
                    <ToggleSwitch checked={currentStyle.hasBackground} onChange={(v) => updateStyle('hasBackground', v)} label="🔲 เปิดพื้นหลังอักษร" />
                    <div className={`space-y-4 md:space-y-5 transition-all ${!currentStyle.hasBackground ? 'opacity-20 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-sm font-bold text-gray-400">⬛ สีพื้นหลัง:</span>
                        <div className="flex items-center gap-2 md:gap-3">
                          <input type="color" value={currentStyle.bgColor} onChange={(e) => updateStyle('bgColor', e.target.value)} className="w-6 h-6 md:w-8 md:h-8 border-0 p-0 bg-transparent cursor-pointer"/>
                          <PresetColors onSelect={(c) => updateStyle('bgColor', c)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                         <div>
                           <div className="flex justify-between text-[9px] md:text-xs font-bold text-gray-400 mb-1 md:mb-2"><span>ความโปร่งทึบ</span><span>{currentStyle.bgOpacity}</span></div>
                           <input type="range" min="0.1" max="1" step="0.1" value={currentStyle.bgOpacity} onChange={(e) => updateStyle('bgOpacity', Number(e.target.value))} className="w-full accent-blue-500 h-1.5 md:h-2"/>
                         </div>
                         <div>
                           <div className="flex justify-between text-[9px] md:text-xs font-bold text-gray-400 mb-1 md:mb-2"><span>ขอบมน</span><span>{currentStyle.bgRadius}px</span></div>
                           <input type="range" min="0" max="30" value={currentStyle.bgRadius} onChange={(e) => updateStyle('bgRadius', Number(e.target.value))} className="w-full accent-orange-500 h-1.5 md:h-2"/>
                         </div>
                         <div>
                           <div className="flex justify-between text-[9px] md:text-xs font-bold text-gray-400 mb-1 md:mb-2"><span>กว้าง</span><span>{currentStyle.bgPaddingX}px</span></div>
                           <input type="range" min="0" max="40" value={currentStyle.bgPaddingX} onChange={(e) => updateStyle('bgPaddingX', Number(e.target.value))} className="w-full accent-green-500 h-1.5 md:h-2"/>
                         </div>
                         <div>
                           <div className="flex justify-between text-[9px] md:text-xs font-bold text-gray-400 mb-1 md:mb-2"><span>สูง</span><span>{currentStyle.bgPaddingY}px</span></div>
                           <input type="range" min="0" max="40" value={currentStyle.bgPaddingY} onChange={(e) => updateStyle('bgPaddingY', Number(e.target.value))} className="w-full accent-green-500 h-1.5 md:h-2"/>
                         </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}