/**
 * Khoá cuộn nền (body) khi có bất kỳ bottom-sheet/modal `.sheetbg` nào đang mở.
 * Trên iOS Safari, `overflow: hidden` không đủ để chặn "scroll chaining" nên dùng
 * `position: fixed` + lưu/khôi phục vị trí cuộn. Chỉ thao tác với style của body, không đụng dữ liệu.
 */
export function installSheetScrollLock() {
  let locked = false
  let savedY = 0

  const lock = () => {
    savedY = window.scrollY
    const b = document.body.style
    b.position = 'fixed'
    b.top = `-${savedY}px`
    b.left = '0'
    b.right = '0'
    b.width = '100%'
    locked = true
  }
  const unlock = () => {
    const b = document.body.style
    b.position = ''
    b.top = ''
    b.left = ''
    b.right = ''
    b.width = ''
    window.scrollTo(0, savedY)
    locked = false
  }

  const sync = () => {
    const open = document.querySelector('.sheetbg') !== null
    if (open && !locked) lock()
    else if (!open && locked) unlock()
  }

  const mo = new MutationObserver(sync)
  mo.observe(document.body, { childList: true, subtree: true })
  sync()
  return () => {
    mo.disconnect()
    if (locked) unlock()
  }
}
