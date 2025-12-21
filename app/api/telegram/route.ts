import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

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
        { error: 'Пожалуйста, укажите URL статьи', errorType: 'validation' },
        { status: 400 }
      )
    }

    // Парсинг статьи
    let response: Response
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 секунд таймаут
      response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      console.error('Fetch error', fetchError)
      if (fetchError instanceof Error && (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError')) {
        return NextResponse.json(
          { error: 'Не удалось загрузить статью по этой ссылке.', errorType: 'fetch_timeout' },
          { status: 408 }
        )
      }
      return NextResponse.json(
        { error: 'Не удалось загрузить статью по этой ссылке.', errorType: 'fetch_error' },
        { status: 502 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Не удалось загрузить статью по этой ссылке.', errorType: 'fetch_failed' },
        { status: 502 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const date = extractDate($)
    const title = extractTitle($)
    const content = extractContent($)

    if (!content) {
      return NextResponse.json(
        { error: 'Не удалось извлечь содержимое статьи. Возможно, страница не является статьей.', errorType: 'content_extraction' },
        { status: 400 }
      )
    }

    // Проверка API-ключа
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Сервис временно недоступен. Пожалуйста, обратитесь к администратору.', errorType: 'config_error' },
        { status: 500 }
      )
    }

    // Подготовка промпта для AI
    let articleText = ''
    if (title) articleText += `Заголовок: ${title}\n\n`
    if (date) articleText += `Дата: ${date}\n\n`
    articleText += `Контент: ${content}\n\n`
    articleText += `URL источника: ${url}`

    // Отправка запроса в OpenRouter
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '',
        'X-Title': 'Referent App',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Ты копирайтер для Telegram-канала. Создай пост на русском языке на основе статьи. Пост должен быть интересным, с эмодзи, хэштегами и призывом к действию. Длина: 2-3 абзаца. Используй разметку Markdown. В конце поста обязательно добавь ссылку на источник статьи в формате Markdown: [Источник](URL).',
          },
          {
            role: 'user',
            content: articleText,
          },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text()
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: 'Не удалось сгенерировать пост для Telegram. Попробуйте позже.', errorType: 'ai_error' },
        { status: 502 }
      )
    }

    const aiData = await aiResponse.json()

    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      return NextResponse.json(
        { error: 'Не удалось обработать ответ от AI. Попробуйте позже.', errorType: 'ai_format_error' },
        { status: 500 }
      )
    }

    const telegramPost = aiData.choices[0].message.content

    return NextResponse.json({ telegramPost })
  } catch (error) {
    console.error('Telegram post error', error)
    return NextResponse.json(
      { error: 'Произошла ошибка при генерации поста для Telegram. Попробуйте позже.', errorType: 'server_error' },
      { status: 500 }
    )
  }
}

