// Cầu nối để nơi khác trên trang nhảy tới đúng một nhân vật trong đoạn ghim "Nhân vật" (Characters.tsx đăng ký).
// Trả về true nếu đã tự cuộn (khi đó nơi gọi chặn cuộn mặc định tới #nhan-vat).
let handler: ((id: string) => boolean) | null = null
export const setCharacterNav = (fn: typeof handler) => { handler = fn }
export const goToCharacter = (id: string) => handler?.(id) ?? false
