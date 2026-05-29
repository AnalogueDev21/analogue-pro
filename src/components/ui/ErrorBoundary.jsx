// src/components/ui/ErrorBoundary.jsx
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl mb-4">⚠️</div>
          <p className="font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</p>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2.5 bg-primary-700 text-white rounded-xl text-sm font-semibold hover:bg-primary-800 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
