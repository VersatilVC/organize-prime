import React, { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Ensure React is fully available before using hooks
  if (!React || typeof React !== 'object' || !React.useState || !React.useEffect) {
    console.warn('React hooks not available in useIsMobile, React state:', { 
      reactAvailable: !!React, 
      useStateAvailable: !!(React && React.useState),
      useEffectAvailable: !!(React && React.useEffect)
    });
    return false;
  }

  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
