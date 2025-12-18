'use client'

import { useState } from 'react'

type ActionType = 'summary' | 'theses' | 'telegram' | null

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeAction, setActiveAction] = useState<ActionType>(null)

  const handleAction = async (action: ActionType) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveAction(action)
    setResult('')

    // Имитация запроса к API
    setTimeout(() => {
      const mockResults: Record<ActionType, string> = {
        summary: 'Генерация ответа "О чем статья?"...\n\nСтатья будет обработана и здесь появится краткое описание содержания статьи.',
        theses: 'Генерация тезисов...\n\nЗдесь будут отображены основные тезисы статьи в структурированном виде.',
        telegram: 'Генерация поста для Telegram...\n\nЗдесь появится готовый пост для публикации в Telegram-канале.',
      }
      setResult(mockResults[action] || '')
      setLoading(false)
    }, 1500)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Анализ статей
        </h1>

        {/* Поле ввода URL */}
        <div className="mb-6">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL англоязычной статьи
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 outline-none transition-all"
          />
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => handleAction('summary')}
            disabled={loading}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
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
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
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
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              activeAction === 'telegram' && !loading
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
          >
            Пост для Telegram
          </button>
        </div>

        {/* Блок результата */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[300px]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Результат
          </h2>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : result ? (
              result
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                Введите URL статьи и выберите действие для генерации результата
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
