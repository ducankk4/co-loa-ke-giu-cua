// Mọi ảnh đi qua đây. Đổi ảnh placeholder -> ảnh thật chỉ cần sửa file này.
import heroBg from '../assets/hero-bg.webp'
import logo from '../assets/logo.webp'
import btnFrame from '../assets/btn-frame.webp'
import iconPlayers from '../assets/icon-players.webp'
import iconTime from '../assets/icon-time.webp'
import iconAge from '../assets/icon-age.webp'
import exploreBg from '../assets/explore-bg.webp'
import rulesBg from '../assets/rules-bg.webp'
import componentsBg from '../assets/components-bg.webp'
import ornament from '../assets/ornament.webp'
import anDuongVuong from '../assets/an-duong-vuong.webp'
import trongThuy from '../assets/trong-thuy.webp'
import trieuDaFull from '../assets/trieu-da-full.webp'
import cardAdvImg from '../assets/game/characters/an-duong-vuong.webp'
import cardTrieuDaImg from '../assets/game/characters/trieu-da.webp'
import cardTrongThuyImg from '../assets/game/characters/trong-thuy-3.webp'
import cardBlueImg from '../assets/game/soldiers-blue/1.webp'
import cardRedImg from '../assets/game/soldiers-red/4.webp'
import secretImg from '../assets/game/secret/1a.webp'
import guideFront from '../assets/game/guide/front.webp'
import mapFull from '../assets/game/map/map.webp'
import theMatSau from '../assets/the-mat-sau.webp'
import linhXanh from '../assets/linh-xanh.webp'
import linhDo from '../assets/linh-do.webp'

export const img = {
  heroBg, logo, btnFrame, iconPlayers, iconTime, iconAge, exploreBg, rulesBg, componentsBg, ornament,
  // Tượng toàn thân (dùng ở phần Nhân vật/giới thiệu). TODO(asset): chưa có ảnh mới thay
  statueAdv: anDuongVuong,
  statueTrongThuy: trongThuy,
  statueTrieuDa: trieuDaFull,
  // Lá bài thật (src/assets/game/)
  cardAdv: cardAdvImg, cardTrieuDa: cardTrieuDaImg, cardTrieuDaFace: cardTrieuDaImg,
  cardTrongThuy: cardTrongThuyImg, // lá "xem trộm"
  cardBlue: cardBlueImg, cardRed: cardRedImg, secret: secretImg,
  guidePage: guideFront, mapImage: mapFull,
  cardBack: theMatSau, soldierBlue: linhXanh, soldierRed: linhDo,
}
