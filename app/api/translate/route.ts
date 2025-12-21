import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { content } = (await req.json()) as { content?: string }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Не передан контент для перевода', errorType: 'validation' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Сервис временно недоступен. Пожалуйста, обратитесь к администратору.', errorType: 'config_error' },
        { status: 500 }
      )
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            content: 'Ты профессиональный переводчик. Переведи следующий текст с английского на русский язык. Сохрани структуру и форматирование текста. Переведи точно и естественно.',
          },
          {
            role: 'user',
            content: content,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: 'Не удалось выполнить перевод. Попробуйте позже.', errorType: 'ai_error' },
        { status: 502 }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Не удалось обработать ответ от AI. Попробуйте позже.', errorType: 'ai_format_error' },
        { status: 500 }
      )
    }

    const translatedText = data.choices[0].message.content

    return NextResponse.json({ translation: translatedText })
  } catch (error) {
    console.error('Translate error', error)
    return NextResponse.json(
      { error: 'Произошла ошибка при переводе текста. Попробуйте позже.', errorType: 'server_error' },
      { status: 500 }
    )
  }
}




