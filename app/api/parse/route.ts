import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

type ParsedArticle = {
  date: string | null
  title: string | null
  content: string | null
}

function extractDate($: cheerio.CheerioAPI): string | null {
  // <time datetime="...">
  const timeTag = $('time[datetime]').first().attr('datetime')
  if (timeTag) return timeTag.trim()

  // meta tags
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="date"]',
  ]
  for (const sel of metaSelectors) {
    const v = $(sel).attr('content')
    if (v) return v.trim()
  }

  // элементы с классами даты
  const classSelectors = [
    '.post-date',
    '.entry-date',
    '.article-date',
    '.date',
    '[class*="date"]',
  ]
  for (const sel of classSelectors) {
    const text = $(sel).first().text()
    if (text && text.trim().length > 6) return text.trim()
  }

  return null
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const og = $('meta[property="og:title"]').attr('content')
  if (og) return og.trim()

  const tw = $('meta[name="twitter:title"]').attr('content')
  if (tw) return tw.trim()

  const h1 = $('h1').first().text()
  if (h1 && h1.trim().length > 0) return h1.trim()

  const title = $('title').first().text()
  if (title && title.trim().length > 0) return title.trim()

  return null
}

function extractContent($: cheerio.CheerioAPI): string | null {
  const candidates = [
    'article',
    'main article',
    'main',
    '.post',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '[itemprop="articleBody"]',
  ]

  for (const sel of candidates) {
    const el = $(sel).first()
    if (el.length) {
      const text = el
        .clone()
        .find('script, style, nav, footer, header, noscript')
        .remove()
        .end()
        .text()
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      if (text && text.length > 100) return text
    }
  }

  // fallback: основной текст страницы
  const bodyText = $('body')
    .clone()
    .find('script, style, nav, footer, header, noscript')
    .remove()
    .end()
    .text()
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return bodyText || null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string }

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Не передан URL' },
        { status: 400 }
      )
    }

    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json(
        { error: `Не удалось загрузить страницу (status ${response.status})` },
        { status: 502 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const parsed: ParsedArticle = {
      date: extractDate($),
      title: extractTitle($),
      content: extractContent($),
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Parse error', error)
    return NextResponse.json(
      { error: 'Ошибка при парсинге страницы' },
      { status: 500 }
    )
  }
}


