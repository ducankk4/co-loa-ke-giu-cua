export interface PreorderPayload {
  name: string; phone: string; email: string; quantity: number; note: string
}
export const PHONE_RE = /^(0|\+84)\d{9}$/

// requestId giữ nguyên khi gửi lại để server không tạo dòng trùng
export async function submitPreorder(p: PreorderPayload, requestId: string): Promise<string> {
  const url = import.meta.env.VITE_PREORDER_URL as string | undefined
  if (!url) throw new Error('Hệ thống đăng ký chưa sẵn sàng, vui lòng thử lại sau.')
  await fetch(url, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...p, requestId }),
  })
  return requestId.slice(0, 8).toUpperCase()
}
