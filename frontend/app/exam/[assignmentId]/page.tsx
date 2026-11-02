'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExamDialog, ExamHeader, Timer, useExamSettings } from '@/components/exam/Chrome';
import { QuestionModule, WritingModule } from '@/components/exam/Modules';
import { SpeakingModule } from '@/components/exam/SpeakingModule';
import { Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import {
  assetUrl,
  type Answers,
  type AttemptState,
  type ListeningContent,
  type Module,
  type ReadingContent,
  type SpeakingContent,
  type WritingContent,
} from '@/lib/exam-types';
import type { StudentAssignment } from '@/lib/types';

const HELP = (
  <>
    <p>
      <strong>Answering:</strong> type in the numbered boxes, choose an option, or drag an option into a gap (you can also click the option and then the gap).
    </p>
    <p>
      <strong>Navigation:</strong> use the question numbers at the bottom or the arrows. An underlined number is answered. Tick <em>Review</em> to mark a question to check later.
    </p>
    <p>
      <strong>Reading:</strong> select words in the passage to highlight them or add notes. Drag the bar between the passage and the questions to resize.
    </p>
    <p>
      <strong>Timer:</strong> it keeps running if you close the page. When it reaches zero your answers are submitted automatically.
    </p>
  </>
);

const INTRO: Record<Exclude<Module, 'speaking'>, { title: string; time: string; lines: string[] }> = {
  listening: {
    title: 'IELTS Listening',
    time: 'Approximately 30 minutes',
    lines: [
      'Answer all the questions. You can change your answers at any time during the test.',
      'There are 40 questions in this test. Each question carries one mark. There are four parts to the test.',
      'You will hear each part once only. The recording starts as soon as you begin.',
      'At the end you will have 2 minutes to check your answers.',
    ],
  },
  reading: {
    title: 'IELTS Reading',
    time: '1 hour',
    lines: [
      'Answer all the questions. You can change your answers at any time during the test.',
      'There are 40 questions in this test. Each question carries one mark. There are three parts to the test.',
      'The test clock will show you when there are 5 minutes and 1 minute remaining.',
    ],
  },
  writing: {
    title: 'IELTS Writing',
    time: '1 hour',
    lines: [
      'Answer both parts. You can change your answers at any time during the test.',
      'There are two parts in this test. Part 2 contributes twice as much as Part 1 to the Writing score.',
      'The test clock will show you when there are 5 minutes and 1 minute remaining.',
    ],
  },
};

function ModuleIntro({ module, onStart, starting }: { module: Exclude<Module, 'speaking'>; onStart(): void; starting?: boolean }) {
  const intro = INTRO[module];
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <h1 className="text-[1.5em] font-bold">{intro.title}</h1>
      <p>
        <strong>Time:</strong> {intro.time}
      </p>
      <div className="ex-part-banner space-y-1">
        <p className="font-bold">Instructions to candidates</p>
        {intro.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <button className="rounded bg-[var(--ex-accent)] px-6 py-2 font-bold text-[var(--ex-bg)] disabled:opacity-50" onClick={onStart} disabled={starting}>
        {module === 'listening' ? 'Start test' : 'Start'}
      </button>
    </div>
  );
}

/**
 * Headphone check before Listening, like the real test: a test tone that does
 * not use the recording, so the candidate can set the volume first.
 */
function SoundCheck() {
  const [volume, setVolume] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const play = () => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    gain.gain.value = volume * 0.3;
    osc.connect(gain).connect(ctx.destination);
    setPlaying(true);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
    osc.onended = () => {
      setPlaying(false);
      void ctx.close();
    };
  };
  return (
    <div className="ex-part-banner space-y-2">
      <p className="font-bold">Sound check</p>
      <p>Put on your headphones and play the test sound. If you can not hear it, tell your teacher before you start.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="ex-border rounded border px-4 py-1 font-bold disabled:opacity-50" onClick={play} disabled={playing}>
          {playing ? 'Playing…' : '▶ Play sound'}
        </button>
        <label className="flex items-center gap-2">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Test sound volume" />
        </label>
      </div>
    </div>
  );
}

export default function ExamPage() {
  const { me } = useRequireAuth();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [settings, setSettings] = useExamSettings();
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [state, setState] = useState<AttemptState | null>(null);
  const [skew, setSkew] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<Module | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [timeUp, setTimeUp] = useState(false);

  // ---- load
  const applyState = useCallback((s: AttemptState) => {
    setSkew(new Date(s.attempt.serverNow).getTime() - Date.now());
    setState(s);
  }, []);

  const loadState = useCallback(
    async (attemptId: string) => {
      try {
        applyState(await api<AttemptState>(`/attempts/${attemptId}/state`));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load the test.');
      }
    },
    [applyState],
  );

  useEffect(() => {
    if (!me) return;
    api<StudentAssignment[]>('/assignments/mine')
      .then((list) => {
        const a = list.find((x) => x.id === assignmentId) ?? null;
        setAssignment(a);
        if (!a) setError('This test is not assigned to you.');
        else if (a.attempt) void loadState(a.attempt.id);
      })
      .catch(() => setError('Could not load the test.'));
  }, [me, assignmentId, loadState]);

  // ---- autosave (full answer sheet, debounced)
  const pending = useRef<{ url: string; body: unknown } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptId = state?.attempt.id;
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  // One save at a time: a slow request can never land after a newer answer sheet.
  const inFlight = useRef<Promise<void> | null>(null);
  const flush = useCallback(async (): Promise<void> => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (inFlight.current) {
      await inFlight.current;
      return flushRef.current();
    }
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    setSaveStatus('saving');
    const run = (async () => {
      try {
        await api(job.url, { method: 'PUT', body: job.body });
        setSaveStatus('saved');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'MODULE_CLOSED') {
          if (attemptId) await loadState(attemptId);
          return;
        }
        pending.current ??= job;
        setSaveStatus('error');
        saveTimer.current = setTimeout(() => void flushRef.current(), 5000);
      }
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, [attemptId, loadState]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queue = useCallback(
    (url: string, body: unknown) => {
      pending.current = { url, body };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void flush(), 1200);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      const job = pending.current;
      if (!job) return;
      void fetch(`/api${job.url}`, {
        method: 'PUT',
        keepalive: true,
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-eduielts-request': '1' },
        body: JSON.stringify(job.body),
      });
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  // ---- listening audio: each part plays ONCE; after a reload it resumes where the clock is
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [playingPart, setPlayingPart] = useState<number | null>(null);
  const [audioDone, setAudioDone] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const playPartRef = useRef<(parts: ListeningContent['parts'], i: number, offset: number) => void>(() => undefined);

  useEffect(() => {
    if (audioEl.current) audioEl.current.volume = volume;
  }, [volume]);

  const playPart = useCallback(
    (parts: ListeningContent['parts'], i: number, offset: number) => {
      const a = audioEl.current;
      if (!a || !state) return;
      if (i >= parts.length) {
        setPlayingPart(null);
        setAudioDone(true);
        return;
      }
      setPlayingPart(i);
      a.onended = () => playPartRef.current(parts, i + 1, 0);
      a.onloadedmetadata = () => {
        if (offset > 0) a.currentTime = Math.min(offset, Math.max(0, a.duration - 0.2));
        a.play().then(
          () => setNeedsGesture(false),
          () => setNeedsGesture(true),
        );
      };
      a.src = assetUrl(state.test.id, parts[i].audio);
      a.volume = volume;
      a.load();
    },
    [state, volume],
  );
  useEffect(() => {
    playPartRef.current = playPart;
  }, [playPart]);

  const startAudio = useCallback(() => {
    if (!state || state.attempt.currentModule !== 'listening' || !state.attempt.moduleStartedAt) return;
    const parts = (state.content as ListeningContent).parts;
    let t = (Date.now() + skew - new Date(state.attempt.moduleStartedAt).getTime()) / 1000;
    let i = 0;
    while (i < parts.length && t >= parts[i].audioSeconds) {
      t -= parts[i].audioSeconds;
      i++;
    }
    playPart(parts, i, Math.max(0, t));
  }, [state, skew, playPart]);

  const listeningActive = state?.attempt.currentModule === 'listening';
  useEffect(() => {
    if (!listeningActive && audioEl.current) {
      audioEl.current.pause();
      audioEl.current.onended = null;
    }
    if (listeningActive && started === 'listening' && playingPart === null && !audioDone) {
      const t = setTimeout(startAudio, 0);
      return () => clearTimeout(t);
    }
  }, [listeningActive, started, playingPart, audioDone, startAudio]);

  // ---- module transitions
  const mod = state?.attempt.currentModule ?? null;
  const finishModule = useCallback(
    async (m: Module) => {
      if (!attemptId) return;
      setBusy(true);
      await flush();
      try {
        applyState(await api<AttemptState>(`/attempts/${attemptId}/finish-module`, { body: { module: m } }));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not submit. Check your connection and try again.');
      } finally {
        setBusy(false);
      }
    },
    [attemptId, flush, applyState],
  );

  const onExpire = useCallback(() => {
    if (!mod) return;
    setTimeUp(true);
    void finishModule(mod);
  }, [mod, finishModule]);

  const beginTest = async () => {
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>(`/assignments/${assignmentId}/start`, { method: 'POST' });
      await loadState(id);
      setStarted('listening');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the test.');
    } finally {
      setBusy(false);
    }
  };

  // ---- render
  const rootProps = { className: 'ielts flex h-dvh flex-col overflow-hidden', 'data-contrast': settings.contrast, 'data-size': settings.size };

  if (error)
    return (
      <div {...rootProps}>
        <div className="m-auto max-w-md space-y-3 p-6 text-center">
          <p className="font-bold">{error}</p>
          <Link className="underline" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>
    );

  if (!me || !assignment || (assignment.attempt && !state))
    return (
      <div {...rootProps}>
        <div className="m-auto">
          <Spinner />
        </div>
      </div>
    );

  const candidate = state?.candidate ?? { name: `${me.user.firstName} ${me.user.lastName}`, number: '—' };
  const header = (
    <ExamHeader
      candidate={candidate}
      settings={settings}
      onSettings={setSettings}
      help={HELP}
      timer={state && mod ? <Timer deadline={state.attempt.moduleDeadline} skewMs={skew} onExpire={onExpire} /> : null}
      status={
        mod === 'listening' && started === 'listening' ? (
          <span className="ex-muted text-[0.85em]">
            {playingPart !== null ? `Playing Part ${playingPart + 1}` : audioDone ? 'Recording finished – check your answers' : ''}
          </span>
        ) : saveStatus === 'error' ? (
          <span className="text-[0.85em] font-bold text-[#d00000]">Not saved – retrying…</span>
        ) : null
      }
      volume={mod === 'listening' ? volume : undefined}
      onVolume={mod === 'listening' ? setVolume : undefined}
    />
  );

  // Not started yet: confirm details (like the real test).
  if (!state)
    return (
      <div {...rootProps}>
        {header}
        <div className="mx-auto w-full max-w-2xl space-y-4 overflow-y-auto p-6">
          <h1 className="text-[1.5em] font-bold">Confirm your details</h1>
          <div className="ex-part-banner space-y-1">
            <p>
              <strong>Name:</strong> {candidate.name}
            </p>
            <p>
              <strong>Test:</strong> {assignment.title} ({assignment.test.testType === 'ACADEMIC' ? 'Academic' : 'General Training'})
            </p>
          </div>
          <p>If your details are not correct, tell your teacher.</p>
          <SoundCheck />
          <p>When you start, the Listening recording begins and the timer starts. You will hear each recording ONCE only.</p>
          <ModuleIntro module="listening" onStart={() => void beginTest()} starting={busy} />
        </div>
      </div>
    );

  if (!mod)
    return (
      <div {...rootProps}>
        {header}
        <div className="m-auto max-w-lg space-y-3 p-6 text-center">
          <h1 className="text-[1.5em] font-bold">You have finished the test</h1>
          {state.assignment.speakingMode === 'FACE_TO_FACE' ? (
            <p>
              Your Listening, Reading and Writing answers have been submitted. Your Speaking test is face to face with your teacher. Your
              teacher will release your results after marking.
            </p>
          ) : (
            <p>Your answers have been submitted. Your teacher will mark Writing and Speaking and release your results.</p>
          )}
          <Link className="inline-block rounded bg-[var(--ex-accent)] px-5 py-2 font-bold text-[var(--ex-bg)]" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>
    );

  const storageKey = `eduielts:${state.attempt.id}:${mod}`;
  let body: React.ReactNode;
  if (mod !== 'speaking' && started !== mod) {
    body = <ModuleIntro module={mod} onStart={() => setStarted(mod)} />;
  } else if (mod === 'listening' || mod === 'reading') {
    body = (
      <QuestionModule
        key={mod}
        kind={mod}
        testId={state.test.id}
        content={state.content as ListeningContent | ReadingContent}
        initialAnswers={((state.saved as { answers: Answers } | null)?.answers ?? {}) as Answers}
        storageKey={storageKey}
        onAnswers={(answers) => queue(`/attempts/${state.attempt.id}/answers`, { module: mod, answers })}
        onSubmit={() => void finishModule(mod)}
        followPart={mod === 'listening' ? playingPart : null}
      />
    );
  } else if (mod === 'writing') {
    const saved = state.saved as { task1: string; task2: string };
    body = (
      <WritingModule
        content={state.content as WritingContent}
        testId={state.test.id}
        initial={[saved.task1, saved.task2]}
        onTexts={([task1, task2]) => queue(`/attempts/${state.attempt.id}/writing`, { task1, task2 })}
        onSubmit={() => void finishModule('writing')}
      />
    );
  } else {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SpeakingModule
          content={state.content as SpeakingContent}
          testId={state.test.id}
          attemptId={state.attempt.id}
          done={(state.saved as { recordings: { part: number; index: number }[] }).recordings}
          onFinish={() => void finishModule('speaking')}
        />
      </div>
    );
  }

  return (
    <div {...rootProps}>
      {header}
      <audio ref={audioEl} preload="auto" className="hidden" />
      {body}
      {mod === 'listening' && started === 'listening' && needsGesture && (
        <ExamDialog open title="Continue Listening" confirmLabel="Continue" onConfirm={startAudio}>
          <p>The recording continues from where the test clock is now.</p>
        </ExamDialog>
      )}
      <ExamDialog open={timeUp && !busy} title="Time is up" confirmLabel="OK" onConfirm={() => setTimeUp(false)}>
        <p>Your answers for this section have been submitted.</p>
      </ExamDialog>
      {busy && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/20">
          <Spinner />
        </div>
      )}
    </div>
  );
}
