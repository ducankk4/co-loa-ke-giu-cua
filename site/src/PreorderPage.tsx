import Header from './components/Header'
import Preorder from './components/Preorder'
import Footer from './components/Footer'

/** Trang đặt trước riêng (dat-truoc.html): không có đoạn ghim hay chuyển cảnh theo cuộn */
export default function PreorderPage() {
  return (
    <>
      <Header page="preorder" />
      <main>
        <Preorder />
      </main>
      <Footer />
    </>
  )
}
