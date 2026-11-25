import { useEffect, useRef } from 'react'
import type { InspectStage } from './machine.ts'

const WORDS: Partial<Record<InspectStage, string>> = {
  8: 'Eight seconds',
  12: 'Twelve seconds',
}

/** Speaks the 8 and 12 second inspection warnings, where the browser can (FR-4.3). */
export function useInspectionVoice(stage: InspectStage) {
  const last = useRef<InspectStage>(0)
  useEffect(() => {
    const said = last.current
    last.current = stage
    const words = WORDS[stage]
    if (!words || stage === said || !('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    speechSynthesis.speak(new SpeechSynthesisUtterance(words))
  }, [stage])
}
