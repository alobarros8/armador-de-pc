// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './ui'
import { CompareView } from './CompareView'
import { SavedDialog } from './SavedDialog'
import { Summary } from './Summary'
import type { SavedBuild } from '../lib/history'
import { analyze } from '../lib/compat'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('<Modal>', () => {
  it('renderiza título, subtítulo y contenido cuando está abierto', () => {
    render(
      <Modal open onClose={vi.fn()} title="Título de prueba" subtitle="Subtítulo">
        <p>Contenido interno</p>
      </Modal>,
    )
    expect(screen.getByText('Título de prueba')).toBeTruthy()
    expect(screen.getByText('Subtítulo')).toBeTruthy()
    expect(screen.getByText('Contenido interno')).toBeTruthy()
  })

  it('no renderiza nada cuando está cerrado', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="X">
        <p>oculto</p>
      </Modal>,
    )
    expect(container.textContent).toBe('')
  })

  it('cierra con Escape y al desmontar devuelve el foco y restablece el scroll del body', async () => {
    const onClose = vi.fn()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <Modal open onClose={onClose} title="Escape test">
        <button type="button">acción</button>
      </Modal>,
    )
    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('el focus trap cicla con Tab dentro del modal', async () => {
    render(
      <Modal open onClose={vi.fn()} title="Trap test">
        <button type="button">uno</button>
        <button type="button">dos</button>
      </Modal>,
    )
    // Primer focusable = botón cerrar (X); el ciclo Tab va X → uno → dos → X.
    const cerrar = screen.getByLabelText('Cerrar')
    const dos = screen.getByText('dos')
    dos.focus()
    await userEvent.tab()
    expect(document.activeElement).toBe(cerrar)
  })
})

describe('<Summary> cotización por WhatsApp', () => {
  const summaryProps = {
    analysis: analyze({}),
    budget: null,
    onBudget: vi.fn(),
    onSelectCategory: vi.fn(),
    onOpenOptimizer: vi.fn(),
    onOptimizeCurrent: vi.fn(),
    onOpenShare: vi.fn(),
    onExport: vi.fn(),
    onCopyList: vi.fn(),
    whatsappUrl: 'https://wa.me/5491170637971?text=test',
  }

  it('muestra la consulta por WhatsApp solo al completar una build compatible', () => {
    render(
      <Summary
        {...summaryProps}
        analysis={{ ...summaryProps.analysis, isComplete: true }}
      />,
    )

    const link = screen.getByRole('link', { name: /Consultar mejor precio por WhatsApp/ })
    expect(link.getAttribute('href')).toBe(summaryProps.whatsappUrl)
    expect(screen.getByText(/lista completa de componentes/)).toBeTruthy()
  })

  it('oculta la consulta por WhatsApp si la build no está completa', () => {
    render(<Summary {...summaryProps} />)

    expect(screen.queryByRole('link', { name: /Consultar mejor precio por WhatsApp/ })).toBeNull()
  })
})

const buildA: SavedBuild = {
  id: 'a1',
  name: 'Build barata',
  createdAt: Date.parse('2026-10-25T10:00:00'),
  snapshot: {
    version: 1,
    budget: 1_200_000,
    selections: { cpu: ['amd-r5-5500'], case: ['antec-vx310'] },
  },
}

const buildB: SavedBuild = {
  id: 'b2',
  name: 'Build con GPU',
  createdAt: Date.parse('2026-10-26T12:00:00'),
  snapshot: {
    version: 1,
    budget: 1_800_000,
    selections: { cpu: ['intel-i5-12400f'], gpu: ['rx-7600'], case: ['xyz-airone-70'] },
  },
}

describe('<CompareView>', () => {
  it('muestra las dos builds, precio y las categorías que cambiaron', () => {
    render(<CompareView a={buildA} b={buildB} onBack={vi.fn()} />)
    expect(screen.getByText('Build barata')).toBeTruthy()
    expect(screen.getByText('Build con GPU')).toBeTruthy()
    expect(screen.getAllByText('Cambió').length).toBeGreaterThan(0)
    // El total de cada lado aparece como texto de precio.
    expect(screen.getByText(/más económica que/)).toBeTruthy()
  })

  it('muestra el estado idéntico cuando son iguales', () => {
    const clone = { ...buildB, name: 'Copia' }
    render(<CompareView a={buildB} b={clone} onBack={vi.fn()} />)
    expect(screen.getByText(/exactamente los mismos componentes/)).toBeTruthy()
    expect(screen.queryByText('Cambió')).toBeNull()
  })

  it('vuelve con el botón de retorno', async () => {
    const onBack = vi.fn()
    render(<CompareView a={buildA} b={buildB} onBack={onBack} />)
    await userEvent.click(screen.getByText('Volver a guardadas'))
    expect(onBack).toHaveBeenCalledOnce()
  })
})

function seedStorage(items: SavedBuild[]) {
  window.localStorage.setItem('armador-pc:saved:v1', JSON.stringify(items))
}

describe('<SavedDialog> comparador integrado', () => {
  it('permite elegir 2 builds y abrir la comparación', async () => {
    seedStorage([buildA, buildB])
    const user = userEvent.setup()
    render(
      <SavedDialog
        open
        onClose={vi.fn()}
        snapshot={{ version: 1, budget: null, selections: {} }}
        hasParts={false}
        onApply={vi.fn()}
        notify={vi.fn()}
      />,
    )

    await user.click(screen.getByLabelText('Sumar Build barata a la comparación'))
    await user.click(screen.getByLabelText('Sumar Build con GPU a la comparación'))
    await user.click(screen.getByText('Comparar seleccionadas (2/2)'))

    expect(screen.getByText('Comparando 2 builds')).toBeTruthy()
    // Al volver, seguimos en el diálogo y la CTA vuelve a quedar deshabilitada.
    await user.click(screen.getByText('Volver a guardadas'))
    expect(screen.getByText('Guardar la build actual')).toBeTruthy()
    expect(screen.getByText('Comparar seleccionadas (2/2)')).toBeTruthy()
  })

  it('la CTA de comparar queda deshabilitada con menos de 2 picks', async () => {
    seedStorage([buildA, buildB])
    const user = userEvent.setup()
    render(
      <SavedDialog
        open
        onClose={vi.fn()}
        snapshot={{ version: 1, budget: null, selections: {} }}
        hasParts={false}
        onApply={vi.fn()}
        notify={vi.fn()}
      />,
    )
    const cta = screen.getByText('Comparar seleccionadas (0/2)')
    expect((cta as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByLabelText('Sumar Build barata a la comparación'))
    expect(screen.getByText('Comparar seleccionadas (1/2)')).toBeTruthy()
  })
})
