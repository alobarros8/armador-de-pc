/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBuildCardBlob, downloadBlob } from './buildCard'
import type { BuildSnapshot } from './share'

vi.mock('../data/catalog', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    getPart: (id: string) => {
      if (id === 'long-name-part') {
        return { name: 'A Very Long Processor Name That Should Definitely Be Truncated By The Function In Order To Fit In Canvas Width', price: 50000 }
      }
      return actual.getPart(id)
    }
  }
})

describe('buildCard', () => {
  beforeEach(() => {
    // Mock document.fonts
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createBuildCardBlob', () => {
    it('creates a blob successfully with items', async () => {
      // Mock canvas getContext and toBlob
      const mockContext = {
        scale: vi.fn(),
        fillRect: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        }),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 50 }),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      }

      const mockCanvas = document.createElement('canvas')
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

      const dummyBlob = new Blob(['dummy'], { type: 'image/png' })
      mockCanvas.toBlob = vi.fn().mockImplementation((cb) => {
        cb(dummyBlob)
      })

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas
        return originalCreateElement(tag)
      })

      const snapshot: BuildSnapshot = {
        id: 'test-build',
        selections: {
          cpu: ['amd-ryzen-5-5600g'],
        }
      }

      const meta = { total: 1000, watts: 500, link: 'http://test.com' }

      const blob = await createBuildCardBlob(snapshot, meta)
      expect(blob).toBe(dummyBlob)
      expect(mockContext.fillText).toHaveBeenCalled()
    })

    it('creates a blob successfully without items', async () => {
      const mockContext = {
        scale: vi.fn(),
        fillRect: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        }),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 50 }),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      }

      const mockCanvas = document.createElement('canvas')
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

      const dummyBlob = new Blob(['dummy'], { type: 'image/png' })
      mockCanvas.toBlob = vi.fn().mockImplementation((cb) => {
        cb(dummyBlob)
      })

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas
        return originalCreateElement(tag)
      })

      const snapshot: BuildSnapshot = {
        id: 'test-build',
        selections: {}
      }

      const meta = { total: 0, watts: 0 }

      const blob = await createBuildCardBlob(snapshot, meta)
      expect(blob).toBe(dummyBlob)
      expect(mockContext.fillText).toHaveBeenCalled()
    })

    it('rejects if canvas.toBlob returns null', async () => {
      const mockContext = {
        scale: vi.fn(),
        fillRect: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        }),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 50 }),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      }

      const mockCanvas = document.createElement('canvas')
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

      mockCanvas.toBlob = vi.fn().mockImplementation((cb) => {
        cb(null) // Simulate failure
      })

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas
        return originalCreateElement(tag)
      })

      const snapshot: BuildSnapshot = {
        id: 'test-build',
        selections: {}
      }
      const meta = { total: 0, watts: 0 }

      await expect(createBuildCardBlob(snapshot, meta)).rejects.toThrow('No se pudo exportar la imagen.')
    })

    it('throws if document is undefined', async () => {
      // Temporarily hide document
      const originalDocument = globalThis.document
      Object.defineProperty(globalThis, 'document', {
        value: undefined,
        configurable: true
      })

      const snapshot: BuildSnapshot = { id: 't', selections: {} }
      const meta = { total: 0, watts: 0 }

      await expect(createBuildCardBlob(snapshot, meta)).rejects.toThrow('La tarjeta solo se genera en el navegador.')

      // Restore document
      Object.defineProperty(globalThis, 'document', {
        value: originalDocument,
        configurable: true
      })
    })

    it('throws if context is null', async () => {
      const mockCanvas = document.createElement('canvas')
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(null) // Simulate failure

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas
        return originalCreateElement(tag)
      })

      const snapshot: BuildSnapshot = { id: 't', selections: {} }
      const meta = { total: 0, watts: 0 }

      await expect(createBuildCardBlob(snapshot, meta)).rejects.toThrow('No se pudo crear el canvas.')
    })

    it('truncates long text', async () => {
      const mockContext = {
        scale: vi.fn(),
        fillRect: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        }),
        fillText: vi.fn(),
        measureText: vi.fn().mockImplementation((text) => {
          // Simulate that 'Long Name...' is too wide, but 'Long Na...' is okay
          if (text.length > 20) return { width: 1000 }
          return { width: 50 }
        }),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      }

      const mockCanvas = document.createElement('canvas')
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any)

      const dummyBlob = new Blob(['dummy'], { type: 'image/png' })
      mockCanvas.toBlob = vi.fn().mockImplementation((cb) => {
        cb(dummyBlob)
      })

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas
        return originalCreateElement(tag)
      })

      const snapshot: BuildSnapshot = {
        id: 'test-build',
        selections: {
          cpu: ['long-name-part'],
        }
      }

      const meta = { total: 50000, watts: 65, link: 'https://example.com/very/long/url/that/should/also/be/truncated/because/it/is/too/long' }

      const blob = await createBuildCardBlob(snapshot, meta)
      expect(blob).toBe(dummyBlob)
      // Check if text truncation logic executed
      expect(mockContext.measureText).toHaveBeenCalled()
    })
  })

  describe('downloadBlob', () => {
    it('creates an anchor, clicks it, and cleans up', () => {
      const mockUrl = 'blob:http://localhost/test'
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl)
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      } as any

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor
        return originalCreateElement(tag)
      })

      vi.spyOn(document.body, 'appendChild').mockImplementation((() => {}) as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation((() => {}) as any)

      const blob = new Blob(['test'], { type: 'text/plain' })
      downloadBlob(blob, 'test.png')

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(mockAnchor.href).toBe(mockUrl)
      expect(mockAnchor.download).toBe('test.png')
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor)
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)
    })
  })
})
