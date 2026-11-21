import { useState } from 'react'
import { useCashFlow } from '../../data/cash'
import { currentMonthKey } from '../../data/format'
import { useBalanceSheet } from '../../data/useBalanceSheet'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { BalanceError } from '../balance/parts'
import { MCash } from './MCash'
import { PcCash } from './PcCash'

export function CashPage() {
  const isMobile = useIsMobile()
  const [month, setMonth] = useState(currentMonthKey())
  const [tab, setTab] = useState<'flow' | 'items'>('flow')
  const sheet = useBalanceSheet()
  const cash = useCashFlow(month, sheet)
  if (sheet.error) return <BalanceError message={sheet.error} onRetry={() => void sheet.reload()} />
  if (sheet.loading || cash.loading) return null
  const props = { cash, month, onMonthChange: setMonth, tab, onTab: setTab }
  return isMobile ? <MCash {...props} /> : <PcCash {...props} />
}
