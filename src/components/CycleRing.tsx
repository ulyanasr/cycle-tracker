// Кольцо цикла на приветствии: коралл — месячные, светлый индиго —
// фертильное окно, лайм — овуляция. Цикл 28 дней, отсчёт сверху по часовой.
const DAYS = 28;
const R = 84;
const STROKE = 20;
const C = 2 * Math.PI * R;

/** Дуга от дня from до дня to (включительно), 1-й день — сверху */
function arc(from: number, to: number) {
  const len = ((to - from + 1) / DAYS) * C;
  const offset = -((from - 1) / DAYS) * C;
  return { strokeDasharray: `${len} ${C}`, strokeDashoffset: offset };
}

export function CycleRing() {
  // Месячные 1–5, окно 9–15, овуляция 14 (пример для 28 дней)
  const ovulationAngle = ((14 - 0.5) / DAYS) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="28 дней цикла">
      <g transform="rotate(-90 100 100)" fill="none" strokeWidth={STROKE} strokeLinecap="round">
        <circle cx="100" cy="100" r={R} stroke="rgba(255,255,255,0.18)" strokeLinecap="butt" />
        <circle cx="100" cy="100" r={R} stroke="#F2463A" {...arc(1, 5)} />
        <circle cx="100" cy="100" r={R} stroke="#C9D0FA" {...arc(9, 15)} />
      </g>
      <circle
        cx={100 + R * Math.cos(ovulationAngle)}
        cy={100 + R * Math.sin(ovulationAngle)}
        r={STROKE / 2}
        fill="#DDF247"
      />
      <text x="100" y="104" textAnchor="middle" fill="#fff" fontSize="48" fontWeight="800">28</text>
      <text x="100" y="134" textAnchor="middle" fill="#E3E4FF" fontSize="15" fontWeight="600">дней цикла</text>
    </svg>
  );
}
