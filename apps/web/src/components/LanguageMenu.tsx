import { useRef, useState } from 'react';
import { LOCALE_LABEL, LOCALES, useI18n, type Locale } from '../i18n';
import { usePopoverLayer } from '../layers';
import { Icon } from './Icon';

export function LanguageMenu() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const layer = usePopoverLayer({
    open,
    onDismiss: () => setOpen(false),
    triggerRef: triggerRef as React.RefObject<HTMLElement | null>,
  });

  return (
    <div className="lang-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="foot-pill lang-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={LOCALE_LABEL[locale]}
      >
        <Icon name="languages" size={12} />
        <span>{LOCALE_LABEL[locale]}</span>
        <Icon name="chevron-down" size={11} />
      </button>
      {open ? (
        <div ref={layer.contentRef} className="lang-menu-popover" role="menu" style={{ zIndex: layer.zIndex }}>
          {LOCALES.map((code) => {
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`lang-menu-item${active ? ' active' : ''}`}
                onClick={() => {
                  setLocale(code as Locale);
                  setOpen(false);
                }}
              >
                <span className="lang-menu-label">{LOCALE_LABEL[code]}</span>
                <span className="lang-menu-code">{code}</span>
                {active ? (
                  <span className="lang-menu-check" aria-hidden>
                    <Icon name="check" size={12} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
