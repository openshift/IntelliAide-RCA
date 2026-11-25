import PersistentAINoticeBanner from './PersistentAINoticeBanner';

/** App-wide banners shown on every authenticated route (below AuthGate). */
export default function GlobalAppBanners() {
  return <PersistentAINoticeBanner />;
}
