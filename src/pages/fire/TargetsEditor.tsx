import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button, Card, TextField } from '../../components/ui'
import { formatNumber, formatShort, parseAmount } from '../../data/format'
import { supabase, toKoreanError } from '../../lib/supabase'
import type { FireTargets } from './fireModel'

/** '수정' 버튼 (제목 줄 오른쪽) */
export function EditTargetsButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" icon={open ? undefined : 'edit'} aria-expanded={open} style={{ padding: '0 12px', fontSize: 14 }} onClick={onClick}>
      {open ? '닫기' : '목표 수정'}
    </Button>
  )
}

/** 지표 A·B 목표 수정 양식 (가구 정보에 저장 → 부부 모두에게 같이 적용) */
export function TargetsEditor({ targets, onDone, m }: { targets: FireTargets; onDone: () => void; m?: boolean }) {
  const { household, refreshHousehold } = useAuth()
  const [asset, setAsset] = useState(formatNumber(targets.asset))
  const [living, setLiving] = useState(formatNumber(targets.living))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const a = parseAmount(asset)
  const l = parseAmount(living)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!household) return
    if (!a || !l) return setError('0보다 큰 금액을 숫자로 입력해 주세요')
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.from('households').update({ fire_target_asset: a, fire_living_cost: l }).eq('id', household.id)
    if (err) {
      setError(toKoreanError(err))
      setBusy(false)
      return
    }
    await refreshHousehold()
    setBusy(false)
    onDone()
  }

  return (
    <Card pad={m ? 'md' : undefined} style={{ marginBottom: m ? 0 : 20 }}>
      <form onSubmit={submit} noValidate style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
        <TextField
          id="fire-target-asset"
          label="지표 A · 목표 자산 (원)"
          value={asset}
          onChange={setAsset}
          help={a ? `= ${formatShort(a)}원 · 4% 법칙으로 월 ${formatShort((a * 0.04) / 12)}원 인출` : '예: 1,200,000,000'}
        />
        <TextField id="fire-living" label="지표 B · 부부 생활비 예산 (월, 원)" value={living} onChange={setLiving} help={l ? `= 월 ${formatShort(l)}원` : '예: 2,400,000'} />
        <div style={{ display: 'flex', gap: 8, paddingBottom: m ? 0 : 22 }}>
          <Button type="button" variant="secondary" onClick={onDone} disabled={busy} block={m}>
            취소
          </Button>
          <Button type="submit" disabled={busy} block={m}>
            {busy ? '저장 중…' : '저장'}
          </Button>
        </div>
        {error && (
          <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13, color: 'var(--bad)', fontWeight: 600 }}>
            {error}
          </p>
        )}
      </form>
      <p className="micro" style={{ marginTop: 10 }}>
        저장하면 배우자 화면에도 같은 목표가 적용되고, 미래 예측의 목표 자산·도달 연도도 새 목표로 다시 계산돼요.
      </p>
    </Card>
  )
}
