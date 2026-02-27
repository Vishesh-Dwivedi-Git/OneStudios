"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface TranscriptEntry {
    speaker: string;
    text: string;
    timestamp: number;
}

/**
 * Live transcription hook using the Web Speech API.
 * Captures speech in real time and builds a running transcript.
 * Runs entirely in the browser — zero cost, no API needed.
 */
export function useTranscription() {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [currentText, setCurrentText] = useState(""); // live partial result
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<any>(null);
    const speakerRef = useRef("You");
    const shouldRestartRef = useRef(false);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
        }
    }, []);

    const startTranscription = useCallback((speaker: string = "You") => {
        // If already running, don't restart
        if (recognitionRef.current) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported");
            setIsSupported(false);
            return;
        }

        speakerRef.current = speaker;
        shouldRestartRef.current = true;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    const finalText = result[0].transcript.trim();
                    if (finalText) {
                        setTranscript(prev => [...prev, {
                            speaker: speakerRef.current,
                            text: finalText,
                            timestamp: Date.now(),
                        }]);
                    }
                    setCurrentText("");
                } else {
                    interim += result[0].transcript;
                }
            }
            if (interim) setCurrentText(interim);
        };

        recognition.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
            // These are non-fatal — auto-restart
            if (event.error === "no-speech" || event.error === "aborted" || event.error === "network") {
                // Will restart via onend
            } else if (event.error === "not-allowed") {
                // Microphone permission denied
                setIsSupported(false);
                shouldRestartRef.current = false;
                setIsTranscribing(false);
            }
        };

        recognition.onend = () => {
            // Auto-restart if we should still be transcribing
            if (shouldRestartRef.current) {
                try {
                    setTimeout(() => {
                        if (shouldRestartRef.current) {
                            recognition.start();
                        }
                    }, 300);
                } catch (e) {
                    console.warn("Failed to restart recognition:", e);
                }
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
            setIsTranscribing(true);
            console.log("🎤 Transcription started");
        } catch (e) {
            console.error("Failed to start speech recognition:", e);
        }
    }, []);

    const stopTranscription = useCallback(() => {
        shouldRestartRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
            recognitionRef.current = null;
        }
        setIsTranscribing(false);
        setCurrentText("");
    }, []);

    const getRecentTranscript = useCallback((count: number = 10) => {
        const recent = transcript.slice(-count);
        return recent.map(e => `${e.speaker}: ${e.text}`).join("\n");
    }, [transcript]);

    const getFullTranscript = useCallback(() => {
        return transcript.map(e => `${e.speaker}: ${e.text}`).join("\n");
    }, [transcript]);

    return {
        isTranscribing,
        isSupported,
        transcript,
        currentText,
        startTranscription,
        stopTranscription,
        getRecentTranscript,
        getFullTranscript,
    };
}
