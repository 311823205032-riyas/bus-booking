import { useState } from 'react';

const views = {
  exterior: {
    source: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1800&q=88',
    alt: 'A real intercity coach parked on a mountain road at dusk',
    caption: 'Coach exterior',
  },
  interior: {
    source: 'https://images.unsplash.com/photo-1719316663972-0696da2b47a3?auto=format&fit=crop&w=1600&q=88',
    alt: 'Real bus cabin with rows of seats and a central aisle',
    caption: 'Bus interior',
  },
};

export default function CoachPhotoGallery() {
  const [view, setView] = useState('exterior');
  const photo = views[view];

  return <section className="coach-showcase" aria-labelledby="coach-showcase-title">
    <div className="coach-showcase-heading">
      <div>
        <p className="eyebrow">Wayline coach</p>
        <h2 id="coach-showcase-title">Take a closer look</h2>
      </div>
      <div className="coach-view-toggle" role="tablist" aria-label="Coach view">
        <button type="button" role="tab" aria-selected={view === 'exterior'} className={view === 'exterior' ? 'selected' : ''} onClick={() => setView('exterior')}>Exterior</button>
        <button type="button" role="tab" aria-selected={view === 'interior'} className={view === 'interior' ? 'selected' : ''} onClick={() => setView('interior')}>Interior</button>
      </div>
    </div>
    <div className="coach-canvas">
      <img key={photo.source} src={photo.source} alt={photo.alt} loading="lazy" decoding="async" />
    </div>
    <p className="coach-view-caption" aria-live="polite">{photo.caption}</p>
  </section>;
}