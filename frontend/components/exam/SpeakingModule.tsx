'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { assetUrl, type SpeakingContent } from '@/lib/exam-types';
import { inline } from './RichText';

type Step =
  | { kind: 'question'; part: 1 | 2 | 3; index: number; text: string; audio?: string; seconds: number; heading: string; minSeconds: number }
  | { kind: 'cue'; seconds: number };

/** The recorded Speaking test, in order: Part 1 questions, Part 2 cue card + long turn, Part 3 discussion. */
export function buildSteps(c: SpeakingContent): Step[] {
  const steps: Step[] = [];
  let i = 0;
  const p1 = c.part1.topics.flatMap((t) => t.questions.map((q) => ({ ...q, topic: t.topic })));
  p1.forEach((q, k) =>
    steps.push({ kind: 'question', part: 1, index: i++, text: q.text, audio: q.audio, seconds: c.part1.answerSeconds, minSeconds: 3, heading: `Part 1 · ${q.topic} · Question ${k + 1} of ${p1.length}` }),
  );
  steps.push({ kind: 'cue', seconds: c.part2.prepSeconds });
  steps.push({ kind: 'question', part: 2, index: 0, text: c.part2.topic, audio: c.part2.introAudio, seconds: c.part2.talkSeconds, minSeconds: 30, heading: 'Part 2 · Long turn' });
  c.part2.roundingOff.forEach((q, k) =>
    steps.push({ kind: 'question', part: 2, index: k + 1, text: q.text, audio: q.audio, seconds: c.part2.roundingOffSeconds, minSeconds: 3, heading: 'Part 2 · Rounding-off question' }),
  );
  i = 0;
  const p3 = c.part3.themes.flatMap((t) => t.questions.map((q) => ({ ...q, theme: t.theme })));
  p3.forEach((q, k) =>
    steps.push({ kind: 'question', part: 3, index: i++, text: q.text, audio: q.audio, seconds: c.part3.answerSeconds, minSeconds: 3, heading: `Part 3 · ${q.theme} · Question ${k + 1} of ${p3.length}` }),
  );
  return steps;
}

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

function LevelMeter({ stream }: { stream: MediaStream | null }) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream) return;
    const ac = new AudioContext();
    const analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    ac.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(peak / 128);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      void ac.close();
    };
  }, [stream]);
  return (
    <div className="ex-border h-3 w-48 overflow-hidden rounded border" aria-label="Microphone level">
      <div className="h-full bg-[var(--ex-accent)] transition-[width]" style={{ width: `${Math.min(100, level * 180)}%` }} />
    </div>
  );
}

function Countdown({ seconds, startedAt }: { seconds: number; startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil(seconds - (now - startedAt) / 1000));
  return (
    <span className="text-[1.6em] font-bold tabular-nums">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </span>
  );
}

export function SpeakingModule({
  content,
  testId,
  attemptId,
  done,
  onFinish,
}: {
  content: SpeakingContent;
  testId: string;
  attemptId: string;
  /** slots already recorded (resume after reload) */
  done: { part: number; index: number }[];
  onFinish(): void;
}) {
  const steps = useMemo(() => buildSteps(content), [content]);
  const firstTodo = useMemo(() => {
    const isDone = (s: Step) => s.kind === 'question' && done.some((d) => d.part === s.part && d.index === s.index);
    const i = steps.findIndex((s, k) => (s.kind === 'cue' ? !isDone(steps[k + 1]) : !isDone(s)));
    return i < 0 ? steps.length : i;
  }, [steps, done]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [stepIdx, setStepIdx] = useState(firstTodo);
  const [phase, setPhase] = useState<'prompt' | 'recording' | 'uploading' | 'error'>('prompt');
  const [phaseStart, setPhaseStart] = useState(0);
  const [notes, setNotes] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBlob = useRef<{ blob: Blob; ms: number } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const step = steps[stepIdx];

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const askMic = async () => {
    setMicError(null);
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }));
    } catch {
      setMicError('The microphone is not available. Allow microphone access in your browser and try again.');
    }
  };

  const next = useCallback(() => {
    setPhase('prompt');
    setPhaseStart(Date.now());
    setStepIdx((i) => i + 1);
  }, []);

  const upload = useCallback(
    async (s: Extract<Step, { kind: 'question' }>, blob: Blob, ms: number) => {
      setPhase('uploading');
      const fd = new FormData();
      fd.append('audio', blob, `answer.${blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
      try {
        await api(`/attempts/${attemptId}/recordings?part=${s.part}&index=${s.index}&durationMs=${Math.round(ms)}`, { method: 'POST', raw: fd });
        lastBlob.current = null;
        next();
      } catch {
        lastBlob.current = { blob, ms };
        setPhase('error');
      }
    },
    [attemptId, next],
  );

  const startRecording = useCallback(
    (s: Extract<Step, { kind: 'question' }>) => {
      if (!stream) return;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      const begin = Date.now();
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = () => void upload(s, new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' }), Date.now() - begin);
      rec.start(1000);
      recorder.current = rec;
      setPhase('recording');
      setPhaseStart(begin);
      stopTimer.current = setTimeout(() => rec.state !== 'inactive' && rec.stop(), s.seconds * 1000);
    },
    [stream, upload],
  );

  const stopRecording = () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (recorder.current?.state !== 'inactive') recorder.current?.stop();
  };

  // Each question: play the examiner (if any), then record automatically.
  useEffect(() => {
    if (!started || !step || phase !== 'prompt') return;
    if (step.kind === 'cue') {
      const t = setTimeout(next, step.seconds * 1000);
      return () => clearTimeout(t);
    }
    if (step.audio) {
      const a = new Audio(assetUrl(testId, step.audio));
      audio.current = a;
      a.onended = () => startRecording(step);
      a.onerror = () => startRecording(step);
      void a.play().catch(() => startRecording(step));
      return () => {
        a.onended = null;
        a.onerror = null;
        a.pause();
      };
    }
    const t = setTimeout(() => startRecording(step), 2500);
    return () => clearTimeout(t);
  }, [started, step, phase, testId, next, startRecording]);

  useEffect(() => {
    if (started && stepIdx >= steps.length) onFinish();
  }, [started, stepIdx, steps.length, onFinish]);

  const cue = (
    <div className="ex-border mx-auto max-w-lg rounded border p-5 text-left">
      <p className="mb-2 font-bold">{content.part2.topic}</p>
      <p>You should say:</p>
      <ul className="mb-2 list-disc pl-6">
        {content.part2.bulletPoints.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p>{content.part2.finalPrompt}</p>
    </div>
  );

  if (!started)
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-[1.4em] font-bold">IELTS Speaking</h1>
        <p className="ex-part-banner">
          <strong>Speaking simulation.</strong> In the real IELTS test, Speaking is a face-to-face interview with an examiner. In this
          practice version the questions are pre-recorded and your answers are recorded for your teacher to mark.
        </p>
        <p>
          This is a recorded Speaking test in three parts. You will hear or read each question, and your answer is recorded straight away. Speak clearly and answer as fully as you can.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Part 1: questions about yourself – about {content.part1.answerSeconds} seconds per answer.</li>
          <li>
            Part 2: a task card. You have {content.part2.prepSeconds / 60} minute to prepare and make notes, then talk for up to {content.part2.talkSeconds / 60} minutes.
          </li>
          <li>Part 3: discussion questions – about {content.part3.answerSeconds} seconds per answer.</li>
        </ul>
        {!stream ? (
          <div className="space-y-2">
            <button className="rounded bg-[var(--ex-accent)] px-5 py-2 font-bold text-[var(--ex-bg)]" onClick={() => void askMic()}>
              Check microphone
            </button>
            {micError && <p className="font-bold text-[#d00000]">{micError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span>Say something:</span> <LevelMeter stream={stream} />
            </div>
            <button
              className="rounded bg-[var(--ex-accent)] px-5 py-2 font-bold text-[var(--ex-bg)]"
              onClick={() => {
                setPhaseStart(Date.now());
                setStarted(true);
              }}
            >
              {firstTodo > 0 ? 'Continue the Speaking test' : 'Start the Speaking test'}
            </button>
          </div>
        )}
      </div>
    );

  if (!step)
    return (
      <div className="grid flex-1 place-items-center p-6">
        <p className="font-bold">Saving…</p>
      </div>
    );

  if (step.kind === 'cue')
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6 text-center">
        <p className="font-bold">Part 2 · Preparation</p>
        <p>You have one minute to think about what you are going to say. You can make some notes.</p>
        <Countdown seconds={step.seconds} startedAt={phaseStart} />
        {cue}
        <textarea
          className="ex-writing mx-auto block h-32 w-full max-w-lg rounded p-2"
          placeholder="Notes"
          aria-label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="ex-border rounded border px-4 py-1.5 font-bold" onClick={next}>
          I am ready to speak
        </button>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-6 text-center">
      <p className="ex-muted font-bold">{step.heading}</p>
      {step.part === 2 && step.index === 0 ? (
        <>
          {cue}
          {notes && <p className="ex-muted whitespace-pre-wrap text-left">{notes}</p>}
        </>
      ) : (
        <p className="text-[1.35em] font-bold">{step.audio && phase === 'prompt' ? 'Listen to the examiner…' : inline(step.text)}</p>
      )}
      {phase === 'prompt' && !step.audio && <p className="ex-muted">Recording starts in a moment…</p>}
      {phase === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          <p className="flex items-center gap-2 font-bold text-[#d00000]">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#d00000]" /> Recording
          </p>
          <Countdown seconds={step.seconds} startedAt={phaseStart} />
          <LevelMeter stream={stream} />
          <FinishButton minSeconds={step.minSeconds} startedAt={phaseStart} onClick={stopRecording} />
        </div>
      )}
      {phase === 'uploading' && <p className="font-bold">Saving your answer…</p>}
      {phase === 'error' && (
        <div className="space-y-2">
          <p className="font-bold text-[#d00000]">Your answer could not be saved. Check your connection.</p>
          <button
            className="rounded bg-[var(--ex-accent)] px-4 py-1.5 font-bold text-[var(--ex-bg)]"
            onClick={() => lastBlob.current && step.kind === 'question' && void upload(step, lastBlob.current.blob, lastBlob.current.ms)}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function FinishButton({ minSeconds, startedAt, onClick }: { minSeconds: number; startedAt: number; onClick(): void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), Math.max(0, minSeconds * 1000 - (Date.now() - startedAt)));
    return () => clearTimeout(t);
  }, [minSeconds, startedAt]);
  return (
    <button className="ex-border rounded border px-4 py-1.5 font-bold disabled:opacity-40" disabled={!ready} onClick={onClick}>
      Finish answer
    </button>
  );
}
