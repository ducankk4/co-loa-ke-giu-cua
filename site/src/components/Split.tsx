/**
 * Tách chữ để GSAP chạy từng phần.
 * - mode "chars": mỗi chữ cái nằm trong mặt nạ (.mask > .ch), dùng cho hiện chữ trượt lên.
 * - mode "words": mỗi từ là một .w, dùng cho chữ sáng dần theo cuộn.
 * Luôn bọc theo từ để tiêu đề dài vẫn xuống dòng đúng chỗ.
 */
export default function Split({ text, mode = 'chars' }: { text: string; mode?: 'chars' | 'words' }) {
  const words = text.split(' ')
  return (
    <span aria-label={text}>
      {words.map((word, i) => (
        <span key={i} aria-hidden className={mode === 'words' ? 'w inline-block' : 'inline-block whitespace-nowrap'}>
          {mode === 'words'
            ? word
            : Array.from(word).map((c, k) => (
                <span key={k} className="mask"><span className="ch inline-block">{c}</span></span>
              ))}
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  )
}
