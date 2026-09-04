import { useMemo, useState } from 'react'
import {
  BoxIcon,
  ClockIcon,
  CubeIcon,
  LayersIcon,
  MagicWandIcon,
  MinusIcon,
  MobileIcon,
  PlusIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
} from '@radix-ui/react-icons'

import { formatRoll, type DieType } from './core/dice'
import { assetUrl } from './assetUrl'
import type { EntropySource } from './core/random'
import { useDiceRoller, type DiceWorldFactory } from './hooks/useDiceRoller'
import { BottomSheet, Carousel } from './mobile'
import {
  SKIN_CATALOG,
  type BackgroundSkinId,
  type DiceSkinId,
  type SkinSelection,
  type TowerSkinId,
  type TraySkinId,
} from './scene/skins'

const DIE_TYPES: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
type SkinCategory = keyof SkinSelection

const CATEGORY_LABELS: Record<SkinCategory, string> = {
  background: 'Фон',
  tray: 'Лоток',
  tower: 'Башня',
  dice: 'Кубики',
}

type PrototypeProps = {
  worldFactory?: DiceWorldFactory
  entropy?: EntropySource
}

type SkinOption = {
  id: string
  name: string
  color: string
  image?: string
}

function categoryOptions(category: SkinCategory): SkinOption[] {
  switch (category) {
    case 'background':
      return Object.entries(SKIN_CATALOG.background).map(([id, skin]) => ({
        id,
        name: skin.name,
        color: skin.color,
        image: 'image' in skin ? skin.image : undefined,
      }))
    case 'tray':
      return Object.entries(SKIN_CATALOG.tray).map(([id, skin]) => ({
        id,
        name: skin.name,
        color: skin.inner,
        image: id === 'black-gold' ? assetUrl('assets/references/tray.jpg') : undefined,
      }))
    case 'tower':
      return Object.entries(SKIN_CATALOG.tower).map(([id, skin]) => ({
        id,
        name: skin.name,
        color: skin.panel,
        image: id === 'treewood' ? assetUrl('assets/references/tower.jpg') : undefined,
      }))
    case 'dice':
      return Object.entries(SKIN_CATALOG.dice).map(([id, skin]) => ({
        id,
        name: skin.name,
        color: skin.base,
      }))
  }
}

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

export default function Prototype({ worldFactory, entropy }: PrototypeProps) {
  const roller = useDiceRoller({ worldFactory, entropy })
  const [skinsOpen, setSkinsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [skinCategory, setSkinCategory] = useState<SkinCategory>('dice')
  const formatted = useMemo(() => (roller.result ? formatRoll(roller.result) : null), [roller.result])
  const skinOptions = useMemo(() => categoryOptions(skinCategory), [skinCategory])
  const backgroundSkin = SKIN_CATALOG.background[roller.skins.background]

  const selectSkin = (category: SkinCategory, id: string): void => {
    if (category === 'background') roller.updateSkin('background', id as BackgroundSkinId)
    if (category === 'tray') roller.updateSkin('tray', id as TraySkinId)
    if (category === 'tower') roller.updateSkin('tower', id as TowerSkinId)
    if (category === 'dice') roller.updateSkin('dice', id as DiceSkinId)
  }

  return (
    <main
      className="dice-app"
      style={{
        backgroundImage: 'image' in backgroundSkin ? `url("${backgroundSkin.image}")` : 'none',
      }}
      data-background={roller.skins.background}
      data-profile="adel-dice-webgl-v1"
      data-status={roller.unsupportedReason ? 'unsupported' : 'ready'}
      data-fallback="false"
      data-phase={roller.phase}
      aria-label="Бросатель кубиков"
    >
      <div className="scene-layer" ref={roller.sceneRef} data-testid="dice-scene" />

      <header className="dice-hud">
        <div className="brand-lockup" aria-label="Adel Dice">
          <span className="brand-mark">Ø</span>
          <span className="brand-name">DICE</span>
          <span className="webgl-badge">WEBGL2</span>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={roller.soundEnabled ? 'Выключить звук' : 'Включить звук'}
            aria-pressed={roller.soundEnabled}
            onClick={() => roller.setSoundEnabled(!roller.soundEnabled)}
          >
            {roller.soundEnabled ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={roller.hapticsEnabled ? 'Выключить вибрацию' : 'Включить вибрацию'}
            aria-pressed={roller.hapticsEnabled}
            onClick={() => roller.setHapticsEnabled(!roller.hapticsEnabled)}
          >
            <MobileIcon />
          </button>
          <button type="button" className="icon-button" aria-label="История" onClick={() => setHistoryOpen(true)}>
            <ClockIcon />
          </button>
          <button type="button" className="icon-button" aria-label="Скины" onClick={() => setSkinsOpen(true)}>
            <MagicWandIcon />
          </button>
        </div>
      </header>

      <section className="result-panel" aria-live="polite">
        <span className="result-kicker">
          {roller.phase === 'rolling' ? 'КОСТИ В ДВИЖЕНИИ' : formatted?.notation ?? 'ГОТОВО К БРОСКУ'}
        </span>
        <strong className="result-total">
          {roller.phase === 'rolling' ? '···' : formatted?.total ?? '—'}
        </strong>
        <span className="result-detail">
          {roller.phase === 'rolling'
            ? roller.throwMode === 'tower'
              ? 'Падение через башню'
              : 'Бросок в лоток'
            : formatted?.detail ?? `${roller.quantity}${roller.selectedDie}`}
        </span>
      </section>

      {roller.unsupportedReason ? (
        <section className="unsupported-panel" role="alert">
          <CubeIcon />
          <strong>3D нужен WebGL2</strong>
          <span>{roller.unsupportedReason}. Числовой бросок остаётся доступен.</span>
        </section>
      ) : null}

      <section className="control-dock" aria-label="Настройки броска">
        <Carousel className="die-carousel" contentClassName="die-carousel-content" ariaLabel="Тип кости">
          {DIE_TYPES.map((die) => (
            <button
              key={die}
              type="button"
              className="die-chip"
              aria-label={die}
              aria-pressed={roller.selectedDie === die}
              disabled={roller.phase === 'rolling'}
              onClick={() => roller.setSelectedDie(die)}
            >
              {die}
            </button>
          ))}
        </Carousel>

        <div className="roll-settings-row">
          <div className="quantity-control" aria-label="Количество кубиков">
            <button
              type="button"
              aria-label="Уменьшить количество"
              disabled={roller.phase === 'rolling' || roller.quantity === 1}
              onClick={() => roller.setQuantity(roller.quantity - 1)}
            >
              <MinusIcon />
            </button>
            <span>
              <small>КУБИКОВ</small>
              <strong>{roller.quantity}</strong>
            </span>
            <button
              type="button"
              aria-label="Увеличить количество"
              disabled={roller.phase === 'rolling' || roller.quantity === 6}
              onClick={() => roller.setQuantity(roller.quantity + 1)}
            >
              <PlusIcon />
            </button>
          </div>

          <div className="mode-control" aria-label="Способ броска">
            <button
              type="button"
              aria-label="Прямой бросок"
              aria-pressed={roller.throwMode === 'direct'}
              disabled={roller.phase === 'rolling'}
              onClick={() => roller.setThrowMode('direct')}
            >
              <BoxIcon />
              Лоток
            </button>
            <button
              type="button"
              aria-label="Через башню"
              aria-pressed={roller.throwMode === 'tower'}
              disabled={roller.phase === 'rolling'}
              onClick={() => roller.setThrowMode('tower')}
            >
              <LayersIcon />
              Башня
            </button>
          </div>
        </div>

        <button
          type="button"
          className="roll-button"
          disabled={roller.phase === 'rolling'}
          onClick={roller.rollNow}
        >
          <CubeIcon />
          {roller.phase === 'rolling' ? 'БРОСАЕМ…' : `БРОСИТЬ ${roller.quantity}${roller.selectedDie.toUpperCase()}`}
        </button>
      </section>

      <BottomSheet
        open={skinsOpen}
        onOpenChange={setSkinsOpen}
        title="Скины сцены"
        description="Фон, лоток, башня и кубики меняются независимо"
        snap={0.76}
      >
        <div className="skin-tabs" role="tablist" aria-label="Категория скинов">
          {(Object.keys(CATEGORY_LABELS) as SkinCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={skinCategory === category}
              onClick={() => setSkinCategory(category)}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        {skinCategory === 'dice' ? (
          <img
            className="material-reference"
            src={assetUrl('assets/references/dice-materials.jpg')}
            alt="Референс материалов кубиков: камень, стекло и минералы"
            draggable={false}
          />
        ) : null}

        <div className="skin-grid" role="tabpanel" aria-label={CATEGORY_LABELS[skinCategory]}>
          {skinOptions.map((option) => {
            const selected = roller.skins[skinCategory] === option.id
            return (
              <button
                key={option.id}
                type="button"
                className="skin-card"
                aria-label={option.name}
                aria-pressed={selected}
                onClick={() => selectSkin(skinCategory, option.id)}
              >
                {option.image ? (
                  <img src={option.image} alt="" draggable={false} />
                ) : (
                  <span className="skin-swatch" style={{ backgroundColor: option.color }} />
                )}
                <span>
                  <strong>{option.name}</strong>
                  <small>{selected ? 'Выбрано' : 'Применить'}</small>
                </span>
              </button>
            )
          })}
        </div>
      </BottomSheet>

      <BottomSheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="История сессии"
        description="Последние броски на этом устройстве"
        snap={0.64}
      >
        <div className="history-toolbar">
          <span>{roller.history.length} бросков</span>
          <button type="button" onClick={roller.clearHistory} disabled={roller.history.length === 0}>
            Очистить
          </button>
        </div>
        <div className="history-list">
          {roller.history.length === 0 ? (
            <div className="history-empty">
              <ClockIcon />
              <span>Здесь появятся результаты</span>
            </div>
          ) : (
            roller.history.map((entry) => {
              const item = formatRoll(entry.result)
              return (
                <article key={entry.id} className="history-item">
                  <span className="history-icon"><CubeIcon /></span>
                  <span>
                    <strong>{item.notation}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <b>{item.total}</b>
                  <time>{timeLabel(entry.createdAt)}</time>
                </article>
              )
            })
          )}
        </div>
      </BottomSheet>
    </main>
  )
}
