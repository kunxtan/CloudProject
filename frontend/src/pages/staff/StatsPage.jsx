import { BarChart3, CalendarDays, ChevronDown, Clock, Table2, Users, XCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { errorMessage } from '../../api/client.js';
import { staffApi } from '../../api/endpoints.js';
import { Button, Card, ErrorBox, PageHeader, Spinner, cx } from '../../components/ui.jsx';
import { formatShortDate, todayBangkok } from '../../utils/format.js';

// สีกราฟ: series เดียว ใช้สีแบรนด์ (ผ่านการตรวจ contrast ≥ 3:1 บนพื้นสว่างแล้ว)
const SERIES = '#ad5c16'; // brand-500
const GRID = '#e8dfd5'; // cocoa-200
const AXIS_TEXT = '#7b695c'; // cocoa-500

const PRESETS = [
  { days: 7, label: '7 วัน' },
  { days: 14, label: '14 วัน' },
  { days: 30, label: '30 วัน' },
];

export default function StatsPage() {
  const [range, setRange] = useState({ from: todayBangkok(-6), to: todayBangkok() });
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    staffApi
      .stats(range)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
  }, [range]);

  const { data, error, loading } = state;
  const activePreset = PRESETS.find((p) => range.to === todayBangkok() && range.from === todayBangkok(-(p.days - 1)));

  // แสดงเฉพาะช่วงชั่วโมงที่มีข้อมูล (± 1 ชม.) ไม่ต้องโชว์ตี 3
  const hourly = (() => {
    if (!data) return [];
    const withData = data.hourly.filter((h) => h.total > 0).map((h) => h.hour);
    const lo = withData.length ? Math.max(0, Math.min(...withData) - 1) : 9;
    const hi = withData.length ? Math.min(23, Math.max(...withData) + 1) : 22;
    return data.hourly.filter((h) => h.hour >= lo && h.hour <= hi).map((h) => ({ ...h, label: `${String(h.hour).padStart(2, '0')}:00` }));
  })();
  const daily = data?.daily.map((d) => ({ ...d, label: formatShortDate(d.date) })) ?? [];

  return (
    <div>
      <PageHeader
        title="สถิติร้าน"
        description="ใช้วางแผนจำนวนพนักงานและโต๊ะในช่วงเวลาที่คนเยอะ"
        actions={
          // จอ < md: บรรทัดเดียว = ปุ่มช่วงเวลา (กะทัดรัด) + ปุ่มช่วงวันที่ที่กดแล้วเลือกได้ / จอ md ขึ้นไป: ช่องวันที่ 2 ช่องแบบเดิม
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="flex shrink-0 rounded-full border-2 border-cocoa-200 bg-white p-1" role="group" aria-label="ช่วงเวลา">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setRange({ from: todayBangkok(-(p.days - 1)), to: todayBangkok() })}
                  className={cx(
                    'rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap min-[400px]:px-3 min-[400px]:text-sm sm:px-3.5',
                    activePreset?.days === p.days ? 'bg-brand-500 text-white' : 'text-cocoa-600 hover:bg-cocoa-100',
                  )}
                  aria-pressed={activePreset?.days === p.days}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <DateRangePicker range={range} onChange={setRange} className="min-w-0 flex-1 md:hidden" />

            <div className="hidden items-center gap-2 md:flex">
              <DateInput label="ตั้งแต่วันที่" value={range.from} max={range.to} onChange={(from) => setRange({ ...range, from })} />
              <span className="text-cocoa-500">–</span>
              <DateInput label="ถึงวันที่" value={range.to} min={range.from} max={todayBangkok()} onChange={(to) => setRange({ ...range, to })} />
            </div>
          </div>
        }
      />

      {error && <ErrorBox>{errorMessage(error)}</ErrorBox>}
      {loading && !data ? (
        <Spinner />
      ) : (
        data && (
          <div className={cx('space-y-6 transition-opacity', loading && 'opacity-60')}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={Users} label="คิวทั้งหมด" value={data.summary.total.toLocaleString('th-TH')} />
              <Tile icon={CheckCircle2} label="ได้โต๊ะ" value={data.summary.seated.toLocaleString('th-TH')} />
              <Tile icon={Clock} label="เวลารอเฉลี่ย" value={data.summary.avgWaitMinutes ?? '-'} unit="นาที" />
              <Tile icon={XCircle} label="ยกเลิก / ข้ามคิว" value={data.summary.dropRate} unit="%" />
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" icon={showTable ? BarChart3 : Table2} onClick={() => setShowTable((v) => !v)}>
                {showTable ? 'ดูเป็นกราฟ' : 'ดูเป็นตาราง'}
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="จำนวนคิวต่อวัน" subtitle={`${formatShortDate(data.from)} – ${formatShortDate(data.to)}`}>
                {showTable ? (
                  <DataTable
                    columns={['วันที่', 'คิวทั้งหมด', 'ได้โต๊ะ', 'ยกเลิก/ข้าม']}
                    rows={daily.map((d) => [d.label, d.total, d.seated, d.dropped])}
                  />
                ) : (
                  <SimpleBarChart data={daily} xKey="label" tooltipRows={(d) => [['คิวทั้งหมด', d.total], ['ได้โต๊ะ', d.seated], ['ยกเลิก/ข้าม', d.dropped]]} />
                )}
              </ChartCard>

              <ChartCard title="ช่วงเวลาที่ลูกค้าจองคิว" subtitle="รวมทุกวันในช่วงที่เลือก (เวลาไทย)">
                {showTable ? (
                  <DataTable
                    columns={['เวลา', 'คิว', 'รอเฉลี่ย (นาที)']}
                    rows={hourly.map((h) => [h.label, h.total, h.avgWaitMinutes ?? '-'])}
                  />
                ) : (
                  <SimpleBarChart
                    data={hourly}
                    xKey="label"
                    tooltipRows={(h) => [['คิว', h.total], ['รอเฉลี่ย', h.avgWaitMinutes != null ? `${h.avgWaitMinutes} นาที` : '-']]}
                  />
                )}
              </ChartCard>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, unit }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-sm text-cocoa-500">
        <Icon className="size-4" aria-hidden /> {label}
      </p>
      <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-cocoa-500">{unit}</span>}
      </p>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-cocoa-500">{subtitle}</p>
      {children}
    </Card>
  );
}

function SimpleBarChart({ data, xKey, tooltipRows }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} width={40} />
          <Tooltip cursor={{ fill: '#f4eee7' }} content={<ChartTooltip rows={tooltipRows} xKey={xKey} />} />
          <Bar dataKey="total" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, rows, xKey }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-2xl border-2 border-cocoa-100 bg-white px-4 py-2.5 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-cocoa-900">{d[xKey]}</p>
      {rows(d).map(([k, v]) => (
        <p key={k} className="flex justify-between gap-6 text-cocoa-600">
          <span>{k}</span>
          <span className="font-medium text-cocoa-900 tabular-nums">{v}</span>
        </p>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="max-h-64 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-cocoa-200 text-left text-cocoa-500">
            {columns.map((c, i) => (
              <th key={c} className={cx('py-2 font-medium', i > 0 && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-cocoa-100">
              {r.map((cell, i) => (
                <td key={i} className={cx('py-1.5', i > 0 && 'text-right tabular-nums')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DateInput({ label, value, min, max, onChange, className }) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className={cx('h-10 rounded-full border-2 border-cocoa-200 bg-white px-3 text-sm', className)}
      aria-label={label}
    />
  );
}

/** มือถือ: ปุ่มเดียวแสดงช่วงวันที่ → กดแล้วมีการ์ดเลือก "ตั้งแต่" / "ถึง" */
function DateRangePicker({ range, onChange, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`ช่วงวันที่ ${formatShortDate(range.from)} ถึง ${formatShortDate(range.to)} — กดเพื่อเปลี่ยน`}
        className={cx(
          'flex h-10 w-full items-center gap-1.5 rounded-full border-2 bg-white px-3 text-xs font-semibold transition-colors min-[400px]:text-sm',
          open ? 'border-brand-300 text-brand-700' : 'border-cocoa-200 text-cocoa-700',
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-brand-500" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">
          {formatShortDate(range.from)} – {formatShortDate(range.to)}
        </span>
        <ChevronDown className={cx('size-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกช่วงวันที่"
          className="animate-pop-in absolute top-full right-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right space-y-3 rounded-3xl border-2 border-cocoa-100 bg-white p-4 shadow-xl"
        >
          <label className="block">
            <span className="mb-1 block pl-2 text-xs font-semibold text-cocoa-600">ตั้งแต่</span>
            <DateInput label="ตั้งแต่วันที่" value={range.from} max={range.to} onChange={(from) => onChange({ ...range, from })} className="w-full" />
          </label>
          <label className="block">
            <span className="mb-1 block pl-2 text-xs font-semibold text-cocoa-600">ถึง</span>
            <DateInput label="ถึงวันที่" value={range.to} min={range.from} max={todayBangkok()} onChange={(to) => onChange({ ...range, to })} className="w-full" />
          </label>
          <Button size="sm" className="w-full" onClick={() => setOpen(false)}>
            ตกลง
          </Button>
        </div>
      )}
    </div>
  );
}
