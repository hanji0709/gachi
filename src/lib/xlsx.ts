import { unzipSync, strFromU8 } from 'fflate'

/** 셀 값: 숫자 · 글자 · 빈칸 */
export type Cell = number | string | null

/**
 * .xlsx 파일에서 시트 하나를 2차원 배열로 읽는다 (브라우저 안에서만, 서버로 보내지 않음).
 * 수식 칸은 엑셀이 저장해 둔 마지막 계산 값을 읽는다.
 */
export async function readSheet(file: File, sheetName: string): Promise<Cell[][]> {
  let zip: Record<string, Uint8Array>
  try {
    zip = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error('엑셀(.xlsx) 파일을 열 수 없어요. 파일 형식을 확인해 주세요.')
  }
  const xml = (path: string) => {
    const bytes = zip[path]
    return bytes ? new DOMParser().parseFromString(strFromU8(bytes), 'application/xml') : null
  }

  const workbook = xml('xl/workbook.xml')
  const rels = xml('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error('엑셀(.xlsx) 파일을 열 수 없어요. 파일 형식을 확인해 주세요.')

  const sheet = Array.from(workbook.getElementsByTagName('sheet')).find((s) => s.getAttribute('name')?.trim() === sheetName)
  if (!sheet) throw new Error(`'${sheetName}' 시트를 찾지 못했어요. 백데이터 엑셀 양식이 맞는지 확인해 주세요.`)
  const rid = sheet.getAttribute('r:id') ?? sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
  const rel = Array.from(rels.getElementsByTagName('Relationship')).find((r) => r.getAttribute('Id') === rid)
  const target = rel?.getAttribute('Target') ?? ''
  const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
  const doc = xml(sheetPath)
  if (!doc) throw new Error(`'${sheetName}' 시트를 읽지 못했어요.`)

  // 공유 문자열 (서식이 섞인 글자는 여러 <t>로 나뉘어 있음)
  // 윗주(<rPh>) 안의 글자는 제외
  const sst = xml('xl/sharedStrings.xml')
  const shared = (sst ? Array.from(sst.getElementsByTagName('si')) : []).map((si) =>
    Array.from(si.getElementsByTagName('t'))
      .filter((t) => (t.parentNode as Element | null)?.localName !== 'rPh')
      .map((t) => t.textContent ?? '')
      .join(''),
  )

  const rows: Cell[][] = []
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const r = Number(row.getAttribute('r')) - 1
    const out: Cell[] = []
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const col = colIndex(c.getAttribute('r') ?? '')
      const type = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent ?? null
      let value: Cell = null
      if (type === 's') value = v === null ? null : (shared[Number(v)] ?? null)
      else if (type === 'inlineStr') value = Array.from(c.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('')
      else if (type === 'str' || type === 'e') value = v
      else if (type === 'b') value = v === null ? null : Number(v)
      else value = v === null || v === '' ? null : Number(v)
      out[col] = value
    }
    rows[r] = out
  }
  return rows
}

/** "AB12" → 27 (0부터) */
function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}
