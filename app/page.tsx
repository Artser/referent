'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

type ActionType = 'summary' | 'theses' | 'telegram' | 'translate' | null

type ParsedArticle = {
  date: string | null
  title: string | null
  content: string | null
}

type ApiError = {
  error: string
  errorType?: string
}

function getFriendlyErrorMessage(errorType: string | undefined, defaultMessage: string): string {
  switch (errorType) {
    case 'fetch_timeout':
    case 'fetch_error':
    case 'fetch_failed':
      return 'Не удалось загрузить статью по этой ссылке.'
    case 'content_extraction':
      return 'Не удалось извлечь содержимое статьи. Возможно, страница не является статьей.'
    case 'validation':
      return defaultMessage
    case 'config_error':
      return 'Сервис временно недоступен. Пожалуйста, обратитесь к администратору.'
    case 'ai_error':
    case 'ai_format_error':
      return 'Не удалось обработать запрос с помощью AI. Попробуйте позже.'
    case 'server_error':
      return 'Произошла ошибка на сервере. Попробуйте позже.'
    default:
      return defaultMessage || 'Произошла неизвестная ошибка. Попробуйте позже.'
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')

  const handleClear = () => {
    setUrl('')
    setResult('')
    setError(null)
    setActiveAction(null)
    setStatusMessage('')
    setLoading(false)
  }

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveAction(action)
    setResult('')
    setError(null)

    try {
      // Для перевода сначала парсим статью, затем переводим
      if (action === 'translate') {
        setStatusMessage('Загружаю статью...')
        // Сначала парсим статью
        const parseResponse = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })

        const parsedData = (await parseResponse.json()) as (ParsedArticle & ApiError)

        if (!parseResponse.ok || parsedData.error) {
          const errorMessage = getFriendlyErrorMessage(parsedData.errorType, parsedData.error || 'Неизвестная ошибка при парсинге')
          throw new Error(errorMessage)
        }

        if (!parsedData.content) {
          throw new Error('Не удалось извлечь содержимое статьи для перевода')
        }

        setStatusMessage('Перевожу статью...')
        // Затем переводим контент
        const translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: parsedData.content }),
        })

        const translateData = (await translateResponse.json()) as ApiError & { translation?: string }

        if (!translateResponse.ok || translateData.error) {
          const errorMessage = getFriendlyErrorMessage(translateData.errorType, translateData.error || 'Ошибка при переводе')
          throw new Error(errorMessage)
        }

        setResult(translateData.translation || 'Перевод не получен')
      } else if (action === 'summary') {
        setStatusMessage('Загружаю статью...')
        // Для резюме статьи используем AI
        const summaryResponse = await fetch('/api/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })

        setStatusMessage('Генерирую резюме...')
        const summaryData = (await summaryResponse.json()) as ApiError & { summary?: string }

        if (!summaryResponse.ok || summaryData.error) {
          const errorMessage = getFriendlyErrorMessage(summaryData.errorType, summaryData.error || 'Ошибка при генерации резюме')
          throw new Error(errorMessage)
        }

        setResult(summaryData.summary || 'Резюме не получено')
      } else if (action === 'theses') {
        setStatusMessage('Загружаю статью...')
        // Для тезисов статьи используем AI
        const thesesResponse = await fetch('/api/theses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })

        setStatusMessage('Генерирую тезисы...')
        const thesesData = (await thesesResponse.json()) as ApiError & { theses?: string }

        if (!thesesResponse.ok || thesesData.error) {
          const errorMessage = getFriendlyErrorMessage(thesesData.errorType, thesesData.error || 'Ошибка при генерации тезисов')
          throw new Error(errorMessage)
        }

        setResult(thesesData.theses || 'Тезисы не получены')
      } else if (action === 'telegram') {
        setStatusMessage('Загружаю статью...')
        // Для поста для Telegram используем AI
        const telegramResponse = await fetch('/api/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })

        setStatusMessage('Генерирую пост для Telegram...')
        const telegramData = (await telegramResponse.json()) as ApiError & { telegramPost?: string }

        if (!telegramResponse.ok || telegramData.error) {
          const errorMessage = getFriendlyErrorMessage(telegramData.errorType, telegramData.error || 'Ошибка при генерации поста для Telegram')
          throw new Error(errorMessage)
        }

        setResult(telegramData.telegramPost || 'Пост не получен')
      } else {
        // Для остальных действий - просто парсинг
        const response = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        })

        const data = (await response.json()) as (ParsedArticle & ApiError)

        if (!response.ok || data.error) {
          const errorMessage = getFriendlyErrorMessage(data.errorType, data.error || 'Неизвестная ошибка при парсинге')
          throw new Error(errorMessage)
        }

        const jsonToShow = {
          date: data.date,
          title: data.title,
          content: data.content,
        }

        setResult(JSON.stringify(jsonToShow, null, 2))
      }
    } catch (e) {
      console.error(e)
      setError(
        e instanceof Error
          ? e.message
          : 'Произошла ошибка при обращении к серверу',
      )
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8 text-center">
          Анализ статей
        </h1>

        {/* Поле ввода URL */}
        <div className="mb-4 sm:mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL англоязычной статьи
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Укажите ссылку на англоязычную статью
          </p>
        </div>

        {/* Кнопка очистки */}
        <div className="mb-4 sm:mb-6 flex justify-end">
          <button
            onClick={handleClear}
            disabled={loading}
            title="Очистить поле URL, результаты и ошибки"
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              loading
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 hover:shadow-md'
            }`}
          >
            Очистить
          </button>
        </div>

        {/* Кнопки действий */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => handleAction('summary')}
            disabled={loading}
            title="Получить краткое резюме статьи с описанием основной темы и ключевых моментов"
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-all ${
              activeAction === 'summary' && !loading
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
          >
            О чем статья?
          </button>
          <button
            onClick={() => handleAction('theses')}
            disabled={loading}
            title="Получить основные тезисы статьи в виде пронумерованного списка"
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-all ${
              activeAction === 'theses' && !loading
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
          >
            Тезисы
          </button>
          <button
            onClick={() => handleAction('telegram')}
            disabled={loading}
            title="Создать готовый пост для публикации в Telegram-канале с эмодзи, хэштегами и ссылкой на источник"
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-all ${
              activeAction === 'telegram' && !loading
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
          >
            Пост для Telegram
          </button>
          <button
            onClick={() => handleAction('translate')}
            disabled={loading}
            title="Перевести статью с английского на русский язык"
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-all ${
              activeAction === 'translate' && !loading
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
          >
            Перевести
          </button>
        </div>

        {/* Блок статуса процесса */}
        {statusMessage && (
          <div className="mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm sm:text-base text-blue-700 dark:text-blue-300 flex items-center">
              <span className="animate-spin mr-2">⏳</span>
              {statusMessage}
            </p>
          </div>
        )}

        {/* Блок результата */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 min-h-[250px] sm:min-h-[300px]">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {activeAction === 'translate' 
              ? 'Перевод статьи' 
              : activeAction === 'summary'
              ? 'О чем статья?'
              : activeAction === 'theses'
              ? 'Тезисы статьи'
              : activeAction === 'telegram'
              ? 'Пост для Telegram'
              : 'Результат (JSON)'}
          </h2>
          <div className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
            activeAction === 'translate' || activeAction === 'summary' || activeAction === 'theses' || activeAction === 'telegram' 
              ? 'text-sm sm:text-base' 
              : 'text-xs sm:text-sm font-mono'
          }`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ошибка</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : result ? (
              result
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                Введите URL статьи, нажмите одну из кнопок — и здесь появится результат.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
