import { useEffect, useRef } from 'react';

export default function ScreenContainer({ pathname, children }) {
  const scrollRef = useRef(null);

  // Reset scroll to top whenever the route changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  // Elevate the topbar with a shadow when content has been scrolled
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const topbar = document.getElementById('topbar');
    const onScroll = () => {
      if (!topbar) return;
      if (el.scrollTop > 4) topbar.classList.add('elevated');
      else topbar.classList.remove('elevated');
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="stack" id="stack">
      <div className="screen" ref={scrollRef}>
        <div className="screen-pad">
          {children}
        </div>
      </div>
    </main>
  );
}
