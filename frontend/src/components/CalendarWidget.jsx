// ═══════════════════════════════════════════════════════════════════════
// CALENDAR WIDGET
// ═══════════════════════════════════════════════════════════════════════
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_SHORT = ["D","S","T","Q","Q","S","S"];

function CalendarWidget({ marks = {} }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());

  function changeMonth(dir) {
    let m = month + dir, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  }
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++) cells.push({ day: d, current: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-display text-[20px] leading-none">{MONTHS[month]}</div>
          <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--muted)' }}>{year}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--ink)' }}>{Icon.chevronLeft}</button>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--ink)' }}>{Icon.chevronRight}</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS_SHORT.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium uppercase tracking-wider py-1.5"
            style={{ color: 'var(--subtle)' }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          const isToday = c.current && c.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSel = c.current && c.day === selected;
          const hasMark = c.current && marks[c.day];
          return (
            <button key={i} onClick={() => c.current && setSelected(c.day)}
              className="aspect-square flex items-center justify-center text-[13px] rounded-xl lift relative"
              style={{
                color: !c.current ? 'var(--subtle)' : isToday ? 'var(--on-ink)' : isSel ? 'var(--on-ink)' : 'var(--ink)',
                background: isToday ? 'var(--ink)' : isSel ? 'var(--muted)' : 'transparent',
                opacity: !c.current ? 0.3 : 1,
                fontWeight: isToday || isSel ? 600 : 400,
                cursor: c.current ? 'pointer' : 'default',
              }}>
              {c.day}
              {hasMark && !isToday && !isSel && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--ink)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
