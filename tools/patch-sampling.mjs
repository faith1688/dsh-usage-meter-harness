import fs from 'node:fs';
const f = 'z:/deepseek/dsh-usage-meter/src/client.tsx';
let s = fs.readFileSync(f, 'utf8');
const old = [
  '  useEffect(() => {',
  '    usageRef.current = usage;',
  '    if (usage === undefined) {',
  '      rateSamplesRef.current = [];',
  '      return;',
  '    }',
  '    const samples = rateSamplesRef.current;',
  '    const last = samples[samples.length - 1];',
  '    // A replay/session reset can move the cumulative estimate backwards.',
  '    if (last !== undefined && usage.realtimeOutputTokens < last.total) samples.length = 0;',
  '    if (usage.realtimeUpdatedAt > 0) {',
  '      const current = samples[samples.length - 1];',
  '      if (current?.at !== usage.realtimeUpdatedAt || current.total !== usage.realtimeOutputTokens) {',
  '        samples.push({ at: usage.realtimeUpdatedAt, total: usage.realtimeOutputTokens });',
  '      }',
  '    }',
  '  }, [usage]);',
].join('\r\n');
const count = s.split(old).length - 1;
if (count !== 1) { console.error('matches: ' + count); process.exit(1); }
const neu = [
  '  useEffect(() => {',
  '    usageRef.current = usage;',
  '  }, [usage]);',
  '',
  '  // Live rate sampling: fold the streaming partial\'s visible text (text +',
  '  // reasoning blocks) into a cumulative token estimate (chars/4 — the same',
  '  // heuristic as the server\'s realtime projection). A new turn:step starts',
  '  // a fresh LLM call, so it resets the sample window.',
  '  const liveStepRef = useRef<string | null>(null);',
  '  useEffect(() => {',
  '    const samples = rateSamplesRef.current;',
  '    if (livePartial === null) {',
  '      liveStepRef.current = null;',
  '      return;',
  '    }',
  '    let chars = 0;',
  '    for (const block of livePartial.blocks) {',
  "      if ((block.kind === 'text' || block.kind === 'reasoning') && typeof block.text === 'string') chars += block.text.length;",
  '    }',
  '    const key = livePartial.turn + \':\' + livePartial.step;',
  '    if (liveStepRef.current !== key) {',
  '      liveStepRef.current = key;',
  '      samples.length = 0;',
  '    }',
  '    const last = samples[samples.length - 1];',
  '    // A replay/session reset can move the cumulative estimate backwards.',
  '    if (last !== undefined && chars / 4 < last.total) samples.length = 0;',
  '    const total = Math.ceil(chars / 4);',
  '    if (last === undefined || last.total !== total) samples.push({ at: Date.now(), total });',
  '  }, [livePartial]);',
].join('\r\n');
s = s.replace(old, neu);
fs.writeFileSync(f, s);
console.log('replaced OK');
