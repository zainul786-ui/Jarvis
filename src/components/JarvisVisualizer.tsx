
import React, { useRef, useEffect } from 'react';
import { AssistantStatus } from '../types';

interface VoiceVisualizerProps {
  analyserNode: AnalyserNode | null;
  status: AssistantStatus;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ analyserNode, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Adjust for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let rotation = 0;

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      rotation += 0.0005; // Slow constant rotation

      analyserNode.getByteTimeDomainData(dataArray);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvasCtx.clearRect(0, 0, width, height);
      
      const isSpeaking = status === AssistantStatus.SPEAKING;
      const isListening = status === AssistantStatus.LISTENING || status === AssistantStatus.THINKING;
      const isConnecting = status === AssistantStatus.CONNECTING;

      const primaryColor = 'rgba(0, 229, 255, 0.7)';
      const speakingColor = 'rgba(255, 255, 255, 0.8)';
      const idleColor = 'rgba(0, 229, 255, 0.2)';

      let lineWidth = 2;
      let radius = Math.min(width, height) / 3.5;
      
      if (isSpeaking) {
          lineWidth = 3;
          radius *= 1.05 + Math.sin(Date.now() / 100) * 0.05; // Pulse out when speaking
      } else if (!isListening && !isConnecting) {
          lineWidth = 1;
      }
      
      canvasCtx.lineWidth = lineWidth;
      
      // Outer static ring
      canvasCtx.beginPath();
      canvasCtx.arc(width / 2, height / 2, radius * 1.2, 0, 2 * Math.PI);
      canvasCtx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
      canvasCtx.stroke();
      
      // Main waveform
      canvasCtx.beginPath();

      const sliceAngle = (Math.PI * 2) / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalize to 0-2 range
        const amplitude = isListening ? (v - 1.0) * (radius * 0.4) : (Math.sin(Date.now() / 200 + i / 10) * (radius * (isSpeaking ? 0.1 : 0.05)));
        
        const r = radius + amplitude;
        const angle = sliceAngle * i - Math.PI / 2 + rotation;
        
        const x = width / 2 + r * Math.cos(angle);
        const y = height / 2 + r * Math.sin(angle);
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
      }
      
      canvasCtx.closePath();
      
      const grad = canvasCtx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, isSpeaking ? speakingColor : primaryColor);
      grad.addColorStop(1, isSpeaking ? speakingColor : 'rgba(0, 194, 255, 0.5)');

      canvasCtx.strokeStyle = isListening || isSpeaking ? grad : idleColor;
      canvasCtx.stroke();
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyserNode, status]);

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full max-w-[600px] max-h-[600px] transition-opacity duration-500" style={{ opacity: status === AssistantStatus.IDLE ? 0.5 : 1 }}/>
    </div>
  );
};
