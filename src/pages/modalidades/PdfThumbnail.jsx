import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

export default function PdfThumbnail({ modalidadId, document, active, cache }) {
  const { id, updated_at, nombre } = document
  const container = useRef(null)
  const [image, setImage] = useState(null)
  useEffect(() => {
    setImage(null)
    if (!active) return undefined
    let disposed = false
    let subscription
    const load = () => {
      if (subscription || disposed) return
      subscription = cache.acquire(modalidadId, { id, updated_at, nombre })
      subscription.promise.then((value) => { if (!disposed) setImage(value) })
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { load(); observer.disconnect() }
    })
    if (observer) observer.observe(container.current)
    else load()
    return () => { disposed = true; observer?.disconnect(); subscription?.release() }
  }, [active, cache, modalidadId, id, updated_at, nombre])

  return <div ref={container} className="flex h-[76px] w-14 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm" aria-hidden="true">
    {image ? <img src={image} alt="" className="h-full w-full object-contain" onError={() => setImage(null)} /> : <><FileText className="h-5 w-5" /><span className="text-[9px] font-bold tracking-wide">PDF</span></>}
  </div>
}
