import { NextResponse } from 'next/server'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

const FETCH_TIMEOUT_MS = 12000
const MAX_BODY_CHARS = 20000
const MIN_BODY_CHARS = 200

function isHttpUrl(u: string): boolean {
  try {
    const p = new URL(u)
    return (p.protocol === 'http:' || p.protocol === 'https:') && !!p.hostname
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { url?: string }
    const url = (body.url || '').trim()
    if (!url || !isHttpUrl(url)) {
      return NextResponse.json({ ok: false, detail: 'invalid url' }, { status: 400 })
    }

    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36 JobMatchBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
      })
    } catch (e: any) {
      clearTimeout(t)
      const name = e?.name
      const msg = name === 'AbortError' ? 'timeout' : 'fetch_failed'
      return NextResponse.json({ ok: false, detail: msg }, { status: 502 })
    }
    clearTimeout(t)
    if (!res.ok) {
      return NextResponse.json({ ok: false, detail: `status_${res.status}` }, { status: 502 })
    }
    const html = await res.text()
    if (!html || html.length < 200) {
      return NextResponse.json({ ok: false, detail: 'empty_html' }, { status: 422 })
    }

    let doc: Document
    try {
      const win = parseHTML(html)
      doc = (win.document as unknown) as Document
    } catch {
      return NextResponse.json({ ok: false, detail: 'parse_failed' }, { status: 422 })
    }

    const parsed = new Readability(doc).parse()
    if (!parsed) {
      return NextResponse.json({ ok: false, detail: 'readability_failed' }, { status: 422 })
    }
    const textContent = (parsed.textContent || '').trim()
    if (textContent.length < MIN_BODY_CHARS) {
      return NextResponse.json({ ok: false, detail: 'content_too_short' }, { status: 422 })
    }
    const bodyText = textContent.length > MAX_BODY_CHARS ? textContent.slice(0, MAX_BODY_CHARS) : textContent
    const title = (parsed.title?.trim() || parsed.siteName?.trim() || '')
    return NextResponse.json({ ok: true, title, text: bodyText, source_url: url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, detail: 'unexpected_error' }, { status: 500 })
  }
}
