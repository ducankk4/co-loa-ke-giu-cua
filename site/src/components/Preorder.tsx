import { useRef, useState } from 'react'
import { preorder } from '../data/preorder'
import { img } from '../data/assets'
import { PHONE_RE, submitPreorder } from '../lib/submitPreorder'
import { Scene } from './ui'

const vnd = (n: number | null) => (n == null ? 'Sẽ cập nhật' : `${n.toLocaleString('vi-VN')}đ`)
type Status = { kind: 'idle' | 'sending' } | { kind: 'ok'; code: string } | { kind: 'error'; msg: string }

const field = 'mt-1 w-full border-0 border-b border-gold/50 bg-transparent px-0 py-2 text-white outline-none transition-colors focus:border-gold'

export default function Preorder() {
  const requestId = useRef(crypto.randomUUID())
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') ?? '').trim()
    const phone = String(f.get('phone') ?? '').trim()
    if (!name) return setStatus({ kind: 'error', msg: 'Hãy nhập họ tên.' })
    if (!PHONE_RE.test(phone)) return setStatus({ kind: 'error', msg: 'Số điện thoại cần 10 số, bắt đầu bằng 0 hoặc +84.' })
    setStatus({ kind: 'sending' })
    try {
      const code = await submitPreorder({
        name, phone, email: String(f.get('email') ?? '').trim(),
        quantity: Number(f.get('quantity') ?? 1), note: String(f.get('note') ?? '').trim(),
      }, requestId.current)
      setStatus({ kind: 'ok', code })
    } catch (err) {
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Gửi không thành công. Bấm Gửi lại để thử lần nữa.' })
    }
  }

  const rows: [string, string][] = [
    ['Giá bán lẻ dự kiến', vnd(preorder.retailPrice)],
    ['Giá đặt trước', vnd(preorder.preorderPrice)],
    ['Hạn ưu đãi', preorder.deadline ?? 'Sẽ cập nhật'],
    ['Phí vận chuyển', vnd(preorder.shipFee)],
    ['Thời gian giao', preorder.delivery ?? 'Sẽ cập nhật'],
  ]

  return (
    <Scene id="dat-truoc" bg={img.componentsBg} overlay="from-night/85 via-night/75 to-night/85">
      <div className="grid items-start gap-14 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="h2 mb-4">Đăng ký đặt trước</h2>
          <p className="body mb-10">Để lại thông tin, chúng tôi sẽ liên hệ khi mở bán. Bạn chưa phải trả tiền cọc.</p>
          <dl>
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-gold/25 py-3">
                <dt>{k}</dt>
                <dd className={v === 'Sẽ cập nhật' ? 'text-mist/60' : 'font-display text-xl font-bold text-gold'}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="frame bg-night/80 p-7 md:p-10">
          {status.kind === 'ok' ? (
            <div role="status" className="py-10 text-center">
              <p className="font-display text-3xl font-bold text-gold">Đã nhận đăng ký</p>
              <p className="mt-4">Mã đăng ký của bạn: <b className="text-white">{status.code}</b></p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <label className="block text-sm">Họ tên<input name="name" required autoComplete="name" className={field} /></label>
              <label className="block text-sm">Số điện thoại<input name="phone" required inputMode="tel" autoComplete="tel" className={field} /></label>
              <div className="grid gap-6 sm:grid-cols-[1fr_7rem]">
                <label className="block text-sm">Email (không bắt buộc)<input name="email" type="email" autoComplete="email" className={field} /></label>
                <label className="block text-sm">Số bộ<input name="quantity" type="number" min={1} defaultValue={1} className={field} /></label>
              </div>
              <label className="block text-sm">Lời nhắn<textarea name="note" rows={2} className={field} /></label>
              {status.kind === 'error' && <p role="alert" className="text-sm text-red-300">{status.msg}</p>}
              <button disabled={status.kind === 'sending'} className="btn btn-solid w-full disabled:opacity-60">
                {status.kind === 'sending' ? 'Đang gửi…' : status.kind === 'error' ? 'Gửi lại' : 'Gửi đăng ký'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Scene>
  )
}
