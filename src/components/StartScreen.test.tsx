// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../data/presets'
import { StartScreen } from './StartScreen'

afterEach(cleanup)

describe('<StartScreen>', () => {
  it('arranca sin piezas y ofrece las dos opciones', () => {
    render(<StartScreen onLoadPreset={vi.fn()} onStartFromScratch={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: /¿Cómo querés armar tu PC?/i }),
    ).toBeTruthy()
    expect(screen.getByText(/Todavía no hay componentes seleccionados/i)).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: /Cargar una build preestablecida/i }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Ver builds preestablecidas/i }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Empezar de cero$/i })).toBeTruthy()
    expect(screen.getByText(`${PRESETS.length} builds`)).toBeTruthy()
  })

  it('dispara la acción de cada opción', async () => {
    const onLoadPreset = vi.fn()
    const onStartFromScratch = vi.fn()
    const user = userEvent.setup()

    render(<StartScreen onLoadPreset={onLoadPreset} onStartFromScratch={onStartFromScratch} />)

    await user.click(screen.getByRole('button', { name: /Ver builds preestablecidas/i }))
    expect(onLoadPreset).toHaveBeenCalledOnce()
    expect(onStartFromScratch).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^Empezar de cero$/i }))
    expect(onStartFromScratch).toHaveBeenCalledOnce()
  })
})
