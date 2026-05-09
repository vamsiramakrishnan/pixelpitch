import type { Ref } from 'react';
import type { Dict } from '../i18n/types';
import type { AppConfig } from '../types';
import { Icon } from './Icon';
import { BUILT_IN_PETS, resolveActivePet } from './pet/pets';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export function PetComposerMenu({
  petConfig,
  petOpen,
  petTriggerRef,
  petMenuRef,
  petZIndex,
  onToggleOpen,
  onClose,
  onAdoptPet,
  onTogglePet,
  onOpenPetSettings,
  t,
}: {
  petConfig?: AppConfig['pet'];
  petOpen: boolean;
  petTriggerRef: Ref<HTMLButtonElement>;
  petMenuRef: Ref<HTMLDivElement>;
  petZIndex?: number;
  onToggleOpen: () => void;
  onClose: () => void;
  onAdoptPet?: (petId: string) => void;
  onTogglePet?: () => void;
  onOpenPetSettings?: () => void;
  t: TranslateFn;
}) {
  const activePet = resolveActivePet(petConfig);
  return (
    <div className="composer-pet-wrap">
      <button
        ref={petTriggerRef}
        type="button"
        className={`composer-pet${petConfig?.adopted ? ' adopted' : ''}`}
        onClick={onToggleOpen}
        aria-haspopup="menu"
        aria-expanded={petOpen}
        title={t('pet.composerTitle')}
      >
        <span className="composer-pet-glyph" aria-hidden>
          {activePet?.glyph ?? '🐾'}
        </span>
        <span className="composer-pet-label">
          {petConfig?.adopted
            ? petConfig.enabled
              ? t('pet.tuck')
              : t('pet.wake')
            : t('pet.adopt')}
        </span>
        <Icon name="chevron-down" size={12} />
      </button>
      {petOpen ? (
        <div
          ref={petMenuRef}
          className="composer-pet-menu"
          role="menu"
          style={petZIndex != null ? { zIndex: petZIndex } : undefined}
        >
          <div className="composer-pet-menu-head">
            <strong>{t('pet.composerMenuTitle')}</strong>
            <span>{t('pet.composerMenuHint')}</span>
          </div>
          {petConfig?.adopted ? (
            <button
              type="button"
              role="menuitem"
              className="composer-pet-menu-row toggle"
              onClick={() => {
                onTogglePet?.();
                onClose();
              }}
            >
              <Icon
                name={petConfig.enabled ? 'eye' : 'sparkles'}
                size={12}
              />
              <span>
                {petConfig.enabled
                  ? t('pet.tuck')
                  : t('pet.wake')}
              </span>
            </button>
          ) : null}
          <div className="composer-pet-menu-grid">
            {BUILT_IN_PETS.map((p) => {
              const active =
                petConfig?.adopted && petConfig.petId === p.id;
              return (
                <button
                  type="button"
                  role="menuitem"
                  key={p.id}
                  className={`composer-pet-menu-pet${active ? ' active' : ''}`}
                  onClick={() => {
                    onAdoptPet?.(p.id);
                    onClose();
                  }}
                  style={{ ['--pet-accent' as string]: p.accent }}
                  title={p.flavor}
                >
                  <span aria-hidden>{p.glyph}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            role="menuitem"
            className="composer-pet-menu-row settings"
            onClick={() => {
              onOpenPetSettings?.();
              onClose();
            }}
          >
            <Icon name="settings" size={12} />
            <span>{t('pet.composerOpenSettings')}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
