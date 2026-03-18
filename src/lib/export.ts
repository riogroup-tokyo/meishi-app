import type { BusinessCard } from '@/types/database'

function escapeCSVField(field: string | null): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

/** Export cards as CSV (with BOM for Japanese Excel compatibility) */
export function exportAsCSV(cards: BusinessCard[], filename?: string): void {
  const headers = [
    '氏名',
    'フリガナ',
    '会社名',
    '部署',
    '役職',
    'メール',
    '電話',
    '携帯',
    '郵便番号',
    '住所',
    'ウェブサイト',
    'メモ',
    '登録日',
  ]

  const rows = cards.map((card) =>
    [
      card.person_name,
      card.person_name_kana,
      card.company_name,
      card.department,
      card.position,
      card.email,
      card.phone,
      card.mobile_phone,
      card.postal_code,
      card.address,
      card.website,
      card.memo,
      formatDate(card.created_at),
    ]
      .map(escapeCSVField)
      .join(',')
  )

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')

  const now = new Date()
  const defaultFilename = `meishi_export_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`

  downloadFile(csvContent, filename || defaultFilename, 'text/csv')
}

/** Export cards as vCard (.vcf) format */
export function exportAsVCard(cards: BusinessCard[], filename?: string): void {
  const vcards = cards.map((card) => {
    const lines: string[] = []
    lines.push('BEGIN:VCARD')
    lines.push('VERSION:3.0')
    lines.push(`FN:${card.person_name}`)

    // N field: family;given;middle;prefix;suffix
    // For Japanese names, put the full name as family name
    lines.push(`N:${card.person_name};;;;`)

    if (card.company_name) {
      const org = card.department
        ? `${card.company_name};${card.department}`
        : card.company_name
      lines.push(`ORG:${org}`)
    }

    if (card.position) {
      lines.push(`TITLE:${card.position}`)
    }

    if (card.phone) {
      lines.push(`TEL;TYPE=WORK,VOICE:${card.phone}`)
    }

    if (card.mobile_phone) {
      lines.push(`TEL;TYPE=CELL,VOICE:${card.mobile_phone}`)
    }

    if (card.email) {
      lines.push(`EMAIL;TYPE=WORK:${card.email}`)
    }

    if (card.address || card.postal_code) {
      // ADR: PO Box;Extended;Street;City;Region;Postal Code;Country
      const postalCode = card.postal_code || ''
      const address = card.address || ''
      lines.push(`ADR;TYPE=WORK:;;${address};;;${postalCode};`)
    }

    if (card.website) {
      lines.push(`URL:${card.website}`)
    }

    if (card.person_name_kana) {
      lines.push(`X-PHONETIC-LAST-NAME:${card.person_name_kana}`)
      lines.push(`SORT-STRING:${card.person_name_kana}`)
    }

    if (card.memo) {
      lines.push(`NOTE:${card.memo.replace(/\n/g, '\\n')}`)
    }

    lines.push('END:VCARD')
    return lines.join('\r\n')
  })

  const vcfContent = vcards.join('\r\n')

  let defaultFilename: string
  if (cards.length === 1) {
    defaultFilename = `${cards[0].person_name}.vcf`
  } else {
    defaultFilename = 'meishi_export.vcf'
  }

  downloadFile(vcfContent, filename || defaultFilename, 'text/vcard')
}

/** Export single card as vCard */
export function exportSingleAsVCard(card: BusinessCard): void {
  exportAsVCard([card], `${card.person_name}.vcf`)
}

/** Helper to trigger file download in browser */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
