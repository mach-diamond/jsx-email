import { useLayoutEffect, useMemo, useRef } from 'react';

import {
  canvasOrigin,
  getWorkspaceCenter,
  initialCardOffset
} from '../../helpers/canvas-positioning';
import { usePreviewStore } from '../../stores/preview-store';
import { EmptyCard } from './empty-card';
import { TemplateCard } from './template-card';
import { useCanvasZoom } from './use-canvas-zoom';

export function Canvas() {
  const cards = usePreviewStore((state) => state.cards);
  const focusRequest = usePreviewStore((state) => state.focusRequest);
  const selectedId = usePreviewStore((state) => state.selectedId);
  const templates = usePreviewStore((state) => state.templates);
  const zoom = usePreviewStore((state) => state.zoom);
  const setZoom = usePreviewStore((state) => state.setZoom);
  const canvasRef = useRef<HTMLElement | null>(null);
  const cardNodes = useRef(new Map<string, HTMLDivElement>());
  const initialized = useRef(false);
  const previousSelectedId = useRef<string | null>(null);
  const { isAltDown, isZoomKeyDown, setIsAltDown } = useCanvasZoom({ canvasRef, setZoom, zoom });

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || initialized.current) return;
      canvas.scrollLeft = canvasOrigin;
      canvas.scrollTop = canvasOrigin;
      initialized.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (!focusRequest) return;

    const scrollToCard = () => {
      const canvas = canvasRef.current;
      // Prefer a DOM lookup over the cardNodes ref map: the map is rewritten on
      // every render (the ref callback is recreated each time), so it can be
      // transiently empty for the freshly-opened card when this fires.
      const card =
        (canvas?.querySelector(
          `[data-card-id="${CSS.escape(focusRequest.id)}"]`
        ) as HTMLElement | null) ?? cardNodes.current.get(focusRequest.id);
      if (!canvas || !card) return;
      const canvasRect = canvas.getBoundingClientRect();
      const workspaceCenter = getWorkspaceCenter(canvasRect);
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;

      // Vertical centering, now that folders stack cards into multiple rows.
      // The canvas clears the fixed header with top padding, so measure it to
      // find the usable area. Cards that fit get centered; taller ones (e.g.
      // the All-Sizes collage) align their top just under the header instead of
      // centering their midpoint offscreen.
      const topInset = parseFloat(getComputedStyle(canvas).paddingTop) || 0;
      const visibleTop = canvasRect.top + topInset;
      const visibleHeight = canvasRect.height - topInset;
      const verticalDelta =
        cardRect.height <= visibleHeight
          ? cardRect.top + cardRect.height / 2 - (visibleTop + visibleHeight / 2)
          : cardRect.top - visibleTop;

      canvas.scrollTo({
        behavior: previousSelectedId.current ? 'smooth' : 'auto',
        left: canvas.scrollLeft + cardCenter - workspaceCenter,
        top: canvas.scrollTop + verticalDelta
      });
      previousSelectedId.current = focusRequest.id;
    };

    // Double rAF: a freshly-opened card needs one frame to mount and lay out
    // before its rect is meaningful.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(scrollToCard);
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [focusRequest]);

  function setCardNode(id: string, node: HTMLDivElement | null) {
    if (node) cardNodes.current.set(id, node);
    else cardNodes.current.delete(id);
  }

  // Group open cards by their category folder so each folder is its own row.
  const folderGroups = useMemo(() => {
    const groups: Array<{ cards: typeof cards; folder: string }> = [];
    for (const card of cards) {
      const template = templates.find((item) => item.id === card.templateId);
      if (template) {
        const folder = template.path.includes('/') ? template.path.split('/')[0] : 'Templates';
        let group = groups.find((item) => item.folder === folder);
        if (!group) {
          group = { cards: [], folder };
          groups.push(group);
        }
        group.cards.push(card);
      }
    }
    return groups;
  }, [cards, templates]);

  return (
    <>
      {isZoomKeyDown && (
        <div
          aria-hidden
          className="fixed inset-0 z-[35]"
          style={{ cursor: isAltDown ? 'zoom-out' : 'zoom-in' }}
        />
      )}
      <main
        className="canvas-grid h-screen cursor-[var(--canvas-cursor)] overflow-auto px-8 pb-16 pt-[88px] [--canvas-cursor:auto]"
        onMouseLeave={(event) => {
          event.currentTarget.style.setProperty('--grid-x', '-999px');
          event.currentTarget.style.setProperty('--grid-y', '-999px');
          event.currentTarget.style.setProperty('--canvas-cursor', 'auto');
        }}
        onMouseMove={(event) => {
          if (isZoomKeyDown && event.altKey !== isAltDown) setIsAltDown(event.altKey);
          event.currentTarget.style.setProperty(
            '--canvas-cursor',
            isZoomKeyDown ? (event.altKey || isAltDown ? 'zoom-out' : 'zoom-in') : 'auto'
          );
          event.currentTarget.style.setProperty('--grid-x', `${event.clientX}px`);
          event.currentTarget.style.setProperty('--grid-y', `${event.clientY}px`);
        }}
        ref={canvasRef}
      >
        <div
          className="mr-16 origin-top-left"
          style={{
            marginLeft: `${canvasOrigin + initialCardOffset}px`,
            marginTop: `${canvasOrigin}px`,
            minHeight: `${canvasOrigin * 2 + 2400}px`,
            transform: `scale(${zoom / 100})`,
            width: `${canvasOrigin * 2}px`
          }}
        >
          {cards.length === 0 ? (
            <EmptyCard />
          ) : (
            <div className="flex flex-col gap-12 pr-[340vw]">
              {folderGroups.map((group) => (
                <section key={group.folder}>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {group.folder}
                  </div>
                  <div className="inline-flex flex-nowrap items-start gap-6">
                    {group.cards.map((card) => {
                      const template = templates.find((item) => item.id === card.templateId);
                      if (!template) return null;
                      return (
                        <TemplateCard
                          card={card}
                          key={card.id}
                          selected={selectedId === card.id}
                          setCardNode={setCardNode}
                          template={template}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
